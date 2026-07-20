// oz-next-app/src/server/auth/session-cookie-chunks.ts
export type CookieValue = Readonly<{ name: string; value: string }>;

export type CookieReadResult =
  | Readonly<{ status: "missing"; invalidObserved: boolean }>
  | Readonly<{
      status: "found";
      value: string;
      invalidObserved: boolean;
    }>;

export const ACCESS_TOKEN_COOKIE_CHUNK_CHARS = 3_000;
export const MAX_ACCESS_TOKEN_CHUNKS = 12;
export const MAX_CHUNKED_TOKEN_CHARS =
  ACCESS_TOKEN_COOKIE_CHUNK_CHARS * MAX_ACCESS_TOKEN_CHUNKS;

const COOKIE_CHUNK_NAME_SUFFIX_PATTERN = /^(0|[1-9]\d*)$/u;
const COOKIE_CHUNK_VALUE_PATTERN = /^[A-Za-z0-9._-]+$/u;

export function chunkCookieName(baseCookieName: string, index: number): string {
  return `${baseCookieName}.${String(index)}`;
}

function parseChunkCookieIndex(
  cookieName: string,
  baseCookieName: string,
): number | null {
  const prefix = `${baseCookieName}.`;

  if (!cookieName.startsWith(prefix)) {
    return null;
  }

  const suffix = cookieName.slice(prefix.length);

  if (!COOKIE_CHUNK_NAME_SUFFIX_PATTERN.test(suffix)) {
    return null;
  }

  const index = Number.parseInt(suffix, 10);

  return Number.isSafeInteger(index) && index >= 0 ? index : null;
}

function isAccessCookieFamilyMember(
  cookieName: string,
  baseCookieName: string,
): boolean {
  return (
    cookieName === baseCookieName || cookieName.startsWith(`${baseCookieName}.`)
  );
}

export function listAccessTokenCookieNamesToClear(
  cookies: readonly CookieValue[],
  baseCookieName: string,
): readonly string[] {
  const names = new Set<string>([baseCookieName]);

  for (let index = 0; index < MAX_ACCESS_TOKEN_CHUNKS; index += 1) {
    names.add(chunkCookieName(baseCookieName, index));
  }

  for (const cookie of cookies) {
    if (isAccessCookieFamilyMember(cookie.name, baseCookieName)) {
      names.add(cookie.name);
    }
  }

  return [...names];
}

export function listAuthCookieNamesToClear(
  cookies: readonly CookieValue[],
  input: Readonly<{
    accessCookieNames: readonly string[];
    refreshCookieNames: readonly string[];
    refreshAttemptCookieName: string;
    deviceFingerprintCookieName: string;
  }>,
): readonly string[] {
  const names = new Set<string>();

  for (const cookieName of input.accessCookieNames) {
    for (const familyName of listAccessTokenCookieNamesToClear(
      cookies,
      cookieName,
    )) {
      names.add(familyName);
    }
  }

  for (const cookieName of input.refreshCookieNames) {
    names.add(cookieName);
  }

  names.add(input.refreshAttemptCookieName);
  names.add(input.deviceFingerprintCookieName);

  return [...names];
}

export function splitTokenForCookies(token: string): readonly string[] {
  const chunks: string[] = [];

  for (
    let offset = 0;
    offset < token.length;
    offset += ACCESS_TOKEN_COOKIE_CHUNK_CHARS
  ) {
    chunks.push(token.slice(offset, offset + ACCESS_TOKEN_COOKIE_CHUNK_CHARS));
  }

  return chunks;
}

export function buildAccessTokenCookieValues(
  token: string,
  baseCookieName: string,
): readonly CookieValue[] {
  if (token.length <= ACCESS_TOKEN_COOKIE_CHUNK_CHARS) {
    return [{ name: baseCookieName, value: token }];
  }

  const chunks = splitTokenForCookies(token);

  if (chunks.length === 0 || chunks.length > MAX_ACCESS_TOKEN_CHUNKS) {
    throw new Error("auth_access_token_cookie_too_large");
  }

  return chunks.map((value, index) => ({
    name: chunkCookieName(baseCookieName, index),
    value,
  }));
}

export function readChunkedCookieValue(
  cookies: readonly CookieValue[],
  baseCookieName: string,
): CookieReadResult {
  const chunksByIndex = new Map<number, string>();
  let invalidObserved = false;
  let sawChunkFamilyCookie = false;

  for (const cookie of cookies) {
    if (!cookie.name.startsWith(`${baseCookieName}.`)) {
      continue;
    }

    sawChunkFamilyCookie = true;

    const index = parseChunkCookieIndex(cookie.name, baseCookieName);

    if (
      index === null ||
      index >= MAX_ACCESS_TOKEN_CHUNKS ||
      chunksByIndex.has(index)
    ) {
      invalidObserved = true;
      continue;
    }

    if (
      cookie.value.length === 0 ||
      cookie.value.length > ACCESS_TOKEN_COOKIE_CHUNK_CHARS ||
      !COOKIE_CHUNK_VALUE_PATTERN.test(cookie.value)
    ) {
      invalidObserved = true;
      continue;
    }

    chunksByIndex.set(index, cookie.value);
  }

  if (chunksByIndex.size === 0) {
    return {
      status: "missing",
      invalidObserved: sawChunkFamilyCookie || invalidObserved,
    };
  }

  const chunks: string[] = [];

  for (let index = 0; index < chunksByIndex.size; index += 1) {
    const chunk = chunksByIndex.get(index);

    if (chunk === undefined) {
      return { status: "missing", invalidObserved: true };
    }

    chunks.push(chunk);
  }

  const value = chunks.join("");

  if (value.length === 0 || value.length > MAX_CHUNKED_TOKEN_CHARS) {
    return { status: "missing", invalidObserved: true };
  }

  return { status: "found", value, invalidObserved };
}

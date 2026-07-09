// oz-next-app/src/server/auth/session.ts
import "server-only";

import { cookies } from "next/headers";

import {
  authTokenResponseSchema,
  jwtTokenSchema,
  type AuthTokenResponse,
} from "@/lib/api/schemas";
import {
  ACCESS_SESSION_COOKIE,
  clampAccessMaxAge,
  LEGACY_ACCESS_SESSION_COOKIE,
  LEGACY_OZO_ACCESS_SESSION_COOKIE,
  LEGACY_OZO_REFRESH_SESSION_COOKIE,
  LEGACY_REFRESH_SESSION_COOKIE,
  REFRESH_SESSION_COOKIE,
  refreshMaxAgeFromExpiresAt,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session-cookies";
import {
  hasSessionTokenType,
  type SessionTokenType,
} from "@/server/auth/jwt-metadata";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

type CookieReadResult =
  | Readonly<{ status: "missing"; invalidObserved: boolean }>
  | Readonly<{ status: "found"; value: string; invalidObserved: boolean }>;

const ACCESS_TOKEN_COOKIE_CHUNK_CHARS = 3_000;
const MAX_ACCESS_TOKEN_CHUNKS = 12;
const MAX_CHUNKED_TOKEN_CHARS =
  ACCESS_TOKEN_COOKIE_CHUNK_CHARS * MAX_ACCESS_TOKEN_CHUNKS;

const COOKIE_CHUNK_NAME_SUFFIX_PATTERN = /^(0|[1-9]\d*)$/u;
const COOKIE_CHUNK_VALUE_PATTERN = /^[A-Za-z0-9._-]+$/u;

const CLEAR_COOKIE_OPTIONS = {
  ...SESSION_COOKIE_OPTIONS,
  maxAge: 0,
  expires: new Date(0),
} as const;

function uniqueCookieNames(names: readonly string[]): readonly string[] {
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
}

function accessCookieNames(): readonly string[] {
  return uniqueCookieNames([
    ACCESS_SESSION_COOKIE,
    LEGACY_ACCESS_SESSION_COOKIE,
    LEGACY_OZO_ACCESS_SESSION_COOKIE,
  ]);
}

function refreshCookieNames(): readonly string[] {
  return uniqueCookieNames([
    REFRESH_SESSION_COOKIE,
    LEGACY_REFRESH_SESSION_COOKIE,
    LEGACY_OZO_REFRESH_SESSION_COOKIE,
  ]);
}

function chunkCookieName(baseCookieName: string, index: number): string {
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

function clearCookie(cookieStore: CookieStore, cookieName: string): void {
  cookieStore.set(cookieName, "", CLEAR_COOKIE_OPTIONS);
}

function clearKnownAccessTokenChunks(
  cookieStore: CookieStore,
  baseCookieName: string,
): void {
  for (let index = 0; index < MAX_ACCESS_TOKEN_CHUNKS; index += 1) {
    clearCookie(cookieStore, chunkCookieName(baseCookieName, index));
  }
}

function clearObservedAccessCookieFamily(
  cookieStore: CookieStore,
  baseCookieName: string,
): void {
  for (const cookie of cookieStore.getAll()) {
    if (isAccessCookieFamilyMember(cookie.name, baseCookieName)) {
      clearCookie(cookieStore, cookie.name);
    }
  }

  clearCookie(cookieStore, baseCookieName);
  clearKnownAccessTokenChunks(cookieStore, baseCookieName);
}

function splitTokenForCookies(token: string): readonly string[] {
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

function readChunkedCookieValue(
  cookieStore: CookieStore,
  baseCookieName: string,
): CookieReadResult {
  const chunksByIndex = new Map<number, string>();
  let invalidObserved = false;
  let sawChunkFamilyCookie = false;

  for (const cookie of cookieStore.getAll()) {
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
      return {
        status: "missing",
        invalidObserved: true,
      };
    }

    chunks.push(chunk);
  }

  const value = chunks.join("");

  if (value.length === 0 || value.length > MAX_CHUNKED_TOKEN_CHARS) {
    return {
      status: "missing",
      invalidObserved: true,
    };
  }

  return {
    status: "found",
    value,
    invalidObserved,
  };
}

function readCookieValue(
  cookieStore: CookieStore,
  cookieName: string,
  options: Readonly<{ allowChunks: boolean }>,
): CookieReadResult {
  let invalidObserved = false;

  if (options.allowChunks) {
    const chunked = readChunkedCookieValue(cookieStore, cookieName);

    invalidObserved = chunked.invalidObserved;

    if (chunked.status === "found") {
      return chunked;
    }
  }

  const directValue = cookieStore.get(cookieName)?.value;

  if (directValue === undefined || directValue.length === 0) {
    return {
      status: "missing",
      invalidObserved,
    };
  }

  return {
    status: "found",
    value: directValue,
    invalidObserved,
  };
}

async function clearServerAuthCookiesBestEffort(): Promise<void> {
  try {
    await clearServerAuthCookies();
  } catch {
    // Cookie mutation is unavailable in read-only Server Component render contexts.
  }
}

async function readTypedServerToken(
  cookieNames: readonly string[],
  expectedType: SessionTokenType,
  options: Readonly<{ allowChunks: boolean }>,
): Promise<string | null> {
  const cookieStore = await cookies();
  let sawInvalidToken = false;

  for (const cookieName of cookieNames) {
    const readResult = readCookieValue(cookieStore, cookieName, options);

    if (readResult.invalidObserved) {
      sawInvalidToken = true;
    }

    if (readResult.status === "missing") {
      continue;
    }

    const parsed = jwtTokenSchema.safeParse(readResult.value);

    if (!parsed.success || !hasSessionTokenType(parsed.data, expectedType)) {
      sawInvalidToken = true;
      continue;
    }

    return parsed.data;
  }

  if (sawInvalidToken) {
    await clearServerAuthCookiesBestEffort();
  }

  return null;
}

function assertAuthTokenTypes(tokens: AuthTokenResponse): void {
  if (!hasSessionTokenType(tokens.access_token, "access")) {
    throw new Error("auth_access_token_type_invalid");
  }

  if (!hasSessionTokenType(tokens.refresh_token, "refresh")) {
    throw new Error("auth_refresh_token_type_invalid");
  }
}

function setAccessTokenCookies(
  cookieStore: CookieStore,
  token: string,
  maxAge: number,
): void {
  clearObservedAccessCookieFamily(cookieStore, ACCESS_SESSION_COOKIE);

  if (token.length <= ACCESS_TOKEN_COOKIE_CHUNK_CHARS) {
    cookieStore.set(ACCESS_SESSION_COOKIE, token, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge,
    });

    clearKnownAccessTokenChunks(cookieStore, ACCESS_SESSION_COOKIE);
    return;
  }

  const chunks = splitTokenForCookies(token);

  if (chunks.length === 0 || chunks.length > MAX_ACCESS_TOKEN_CHUNKS) {
    throw new Error("auth_access_token_cookie_too_large");
  }

  clearCookie(cookieStore, ACCESS_SESSION_COOKIE);

  chunks.forEach((chunk, index) => {
    cookieStore.set(chunkCookieName(ACCESS_SESSION_COOKIE, index), chunk, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge,
    });
  });

  for (let index = chunks.length; index < MAX_ACCESS_TOKEN_CHUNKS; index += 1) {
    clearCookie(cookieStore, chunkCookieName(ACCESS_SESSION_COOKIE, index));
  }
}

function setRefreshTokenCookie(
  cookieStore: CookieStore,
  token: string,
  maxAge: number,
): void {
  cookieStore.set(REFRESH_SESSION_COOKIE, token, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge,
  });
}

function clearLegacyAuthCookies(cookieStore: CookieStore): void {
  for (const staleCookieName of uniqueCookieNames([
    LEGACY_ACCESS_SESSION_COOKIE,
    LEGACY_OZO_ACCESS_SESSION_COOKIE,
  ])) {
    if (staleCookieName !== ACCESS_SESSION_COOKIE) {
      clearObservedAccessCookieFamily(cookieStore, staleCookieName);
    }
  }

  for (const staleCookieName of uniqueCookieNames([
    LEGACY_REFRESH_SESSION_COOKIE,
    LEGACY_OZO_REFRESH_SESSION_COOKIE,
  ])) {
    if (staleCookieName !== REFRESH_SESSION_COOKIE) {
      clearCookie(cookieStore, staleCookieName);
    }
  }
}

export async function getServerAccessToken(): Promise<string | null> {
  return await readTypedServerToken(accessCookieNames(), "access", {
    allowChunks: true,
  });
}

export async function getServerRefreshToken(): Promise<string | null> {
  return await readTypedServerToken(refreshCookieNames(), "refresh", {
    allowChunks: false,
  });
}

export async function setServerAuthTokens(
  input: AuthTokenResponse,
): Promise<void> {
  const tokens = authTokenResponseSchema.parse(input);

  assertAuthTokenTypes(tokens);

  const cookieStore = await cookies();

  setAccessTokenCookies(
    cookieStore,
    tokens.access_token,
    clampAccessMaxAge(tokens.expires_in),
  );

  setRefreshTokenCookie(
    cookieStore,
    tokens.refresh_token,
    refreshMaxAgeFromExpiresAt(tokens.refresh_expires_at),
  );

  clearLegacyAuthCookies(cookieStore);
}

export async function clearServerAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  for (const cookieName of accessCookieNames()) {
    clearObservedAccessCookieFamily(cookieStore, cookieName);
  }

  for (const cookieName of refreshCookieNames()) {
    clearCookie(cookieStore, cookieName);
  }
}

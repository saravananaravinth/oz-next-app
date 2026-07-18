// oz-next-app/src/server/auth/session.ts
import "server-only";

import { cookies } from "next/headers";

import {
  authBodyTokenResponseSchema,
  deviceFingerprintSchema,
  jwtTokenSchema,
  type AuthBodyTokenResponse,
} from "@/lib/api/schemas";
import {
  ACCESS_SESSION_COOKIE,
  clampAccessMaxAge,
  DEVICE_FINGERPRINT_SESSION_COOKIE,
  LEGACY_ACCESS_SESSION_COOKIE,
  LEGACY_OZO_ACCESS_SESSION_COOKIE,
  LEGACY_OZO_REFRESH_SESSION_COOKIE,
  LEGACY_REFRESH_SESSION_COOKIE,
  REFRESH_ATTEMPT_COOKIE,
  REFRESH_SESSION_COOKIE,
  refreshMaxAgeFromExpiresAt,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session-cookies";
import {
  hasSessionTokenType,
  type SessionTokenType,
} from "@/server/auth/jwt-metadata";
import {
  ACCESS_TOKEN_COOKIE_CHUNK_CHARS,
  buildAccessTokenCookieValues,
  chunkCookieName,
  listAccessTokenCookieNamesToClear,
  listAuthCookieNamesToClear,
  MAX_ACCESS_TOKEN_CHUNKS,
  readChunkedCookieValue,
  type CookieReadResult,
} from "@/server/auth/session-cookie-chunks";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

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
  for (const cookieName of listAccessTokenCookieNamesToClear(
    cookieStore.getAll(),
    baseCookieName,
  )) {
    clearCookie(cookieStore, cookieName);
  }
}

function readCookieValue(
  cookieStore: CookieStore,
  cookieName: string,
  options: Readonly<{ allowChunks: boolean }>,
): CookieReadResult {
  let invalidObserved = false;

  if (options.allowChunks) {
    const chunked = readChunkedCookieValue(cookieStore.getAll(), cookieName);

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

function assertAuthTokenTypes(tokens: AuthBodyTokenResponse): void {
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
  const cookieValues = buildAccessTokenCookieValues(
    token,
    ACCESS_SESSION_COOKIE,
  );

  if (token.length <= ACCESS_TOKEN_COOKIE_CHUNK_CHARS) {
    const directCookie = cookieValues[0];

    if (directCookie === undefined) {
      throw new Error("auth_access_token_cookie_missing");
    }

    cookieStore.set(directCookie.name, directCookie.value, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge,
    });

    clearKnownAccessTokenChunks(cookieStore, ACCESS_SESSION_COOKIE);
    return;
  }

  clearCookie(cookieStore, ACCESS_SESSION_COOKIE);

  cookieValues.forEach((cookie) => {
    cookieStore.set(cookie.name, cookie.value, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge,
    });
  });

  for (
    let index = cookieValues.length;
    index < MAX_ACCESS_TOKEN_CHUNKS;
    index += 1
  ) {
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

function setDeviceFingerprintCookie(
  cookieStore: CookieStore,
  deviceFingerprint: string | null,
  maxAge: number,
): void {
  if (deviceFingerprint === null) {
    clearCookie(cookieStore, DEVICE_FINGERPRINT_SESSION_COOKIE);
    return;
  }

  cookieStore.set(
    DEVICE_FINGERPRINT_SESSION_COOKIE,
    deviceFingerprintSchema.parse(deviceFingerprint),
    {
      ...SESSION_COOKIE_OPTIONS,
      maxAge,
    },
  );
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

export async function getServerDeviceFingerprint(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(DEVICE_FINGERPRINT_SESSION_COOKIE)?.value;

  if (value === undefined || value.length === 0) {
    return null;
  }

  const parsed = deviceFingerprintSchema.safeParse(value);

  if (!parsed.success) {
    await clearServerAuthCookiesBestEffort();
    return null;
  }

  return parsed.data;
}

export async function setServerAuthTokens(
  input: AuthBodyTokenResponse,
  options: Readonly<{ deviceFingerprint: string | null }>,
): Promise<void> {
  const tokens = authBodyTokenResponseSchema.parse(input);

  assertAuthTokenTypes(tokens);

  const cookieStore = await cookies();

  setAccessTokenCookies(
    cookieStore,
    tokens.access_token,
    clampAccessMaxAge(tokens.expires_in),
  );

  const refreshMaxAge = refreshMaxAgeFromExpiresAt(tokens.refresh_expires_at);

  setRefreshTokenCookie(cookieStore, tokens.refresh_token, refreshMaxAge);
  setDeviceFingerprintCookie(
    cookieStore,
    options.deviceFingerprint,
    refreshMaxAge,
  );

  clearLegacyAuthCookies(cookieStore);
  clearCookie(cookieStore, REFRESH_ATTEMPT_COOKIE);
}

export async function clearServerAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  for (const cookieName of listAuthCookieNamesToClear(cookieStore.getAll(), {
    accessCookieNames: accessCookieNames(),
    refreshCookieNames: refreshCookieNames(),
    refreshAttemptCookieName: REFRESH_ATTEMPT_COOKIE,
    deviceFingerprintCookieName: DEVICE_FINGERPRINT_SESSION_COOKIE,
  })) {
    clearCookie(cookieStore, cookieName);
  }
}

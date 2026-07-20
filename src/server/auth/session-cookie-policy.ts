// oz-next-app/src/server/auth/session-cookie-policy.ts
import "server-only";

import { AUTH_COOKIE } from "@/lib/api/http-contract";
import { isProduction } from "@/lib/env/public-env";

const ACCESS_MAX_AGE_FALLBACK_SECONDS = 15 * 60;
const ACCESS_MAX_AGE_MIN_SECONDS = 60;
const ACCESS_MAX_AGE_MAX_SECONDS = 24 * 60 * 60;
const REFRESH_MAX_AGE_FALLBACK_SECONDS = 30 * 24 * 60 * 60;
const REFRESH_MAX_AGE_MIN_SECONDS = 60;
const REFRESH_MAX_AGE_MAX_SECONDS = 366 * 24 * 60 * 60;

export const ACCESS_SESSION_COOKIE = isProduction
  ? AUTH_COOKIE.HOST_ACCESS_TOKEN
  : AUTH_COOKIE.ACCESS_TOKEN;
export const REFRESH_SESSION_COOKIE = isProduction
  ? AUTH_COOKIE.HOST_REFRESH_TOKEN
  : AUTH_COOKIE.REFRESH_TOKEN;
export const DEVICE_FINGERPRINT_SESSION_COOKIE = isProduction
  ? AUTH_COOKIE.HOST_DEVICE_FINGERPRINT
  : AUTH_COOKIE.DEVICE_FINGERPRINT;
export const SESSION_COOKIE = isProduction
  ? AUTH_COOKIE.HOST_SESSION
  : AUTH_COOKIE.SESSION;
export const LEGACY_ACCESS_SESSION_COOKIE = AUTH_COOKIE.ACCESS;
export const LEGACY_REFRESH_SESSION_COOKIE = AUTH_COOKIE.REFRESH;
export const LEGACY_OZO_ACCESS_SESSION_COOKIE = "ozo_access";
export const LEGACY_OZO_REFRESH_SESSION_COOKIE = "ozo_refresh";
export const REFRESH_ATTEMPT_COOKIE = isProduction
  ? "__Host-oz_refresh_attempt"
  : "oz_refresh_attempt";
export const REFRESH_ATTEMPT_COOKIE_VALUE = "1" as const;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
  path: "/",
} as const;

export const REFRESH_ATTEMPT_COOKIE_OPTIONS = {
  ...SESSION_COOKIE_OPTIONS,
  maxAge: 60,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(Math.trunc(value), max));
}

export function clampAccessMaxAge(seconds: number | undefined): number {
  if (typeof seconds !== "number" || !Number.isFinite(seconds))
    return ACCESS_MAX_AGE_FALLBACK_SECONDS;
  return clamp(seconds, ACCESS_MAX_AGE_MIN_SECONDS, ACCESS_MAX_AGE_MAX_SECONDS);
}

export function refreshMaxAgeFromExpiresAt(
  expiresAt: string | undefined,
): number {
  if (expiresAt === undefined) return REFRESH_MAX_AGE_FALLBACK_SECONDS;
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs)) return REFRESH_MAX_AGE_FALLBACK_SECONDS;
  return clamp(
    Math.floor((expiresAtMs - Date.now()) / 1_000),
    REFRESH_MAX_AGE_MIN_SECONDS,
    REFRESH_MAX_AGE_MAX_SECONDS,
  );
}

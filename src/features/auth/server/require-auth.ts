// oz-next-app/src/features/auth/server/require-auth.ts
import "server-only";

import type { Route } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_ENDPOINTS } from "@/lib/api/endpoints";
import { isApiHttpError } from "@/lib/api/problem";
import { meResponseSchema, type MeResponse } from "@/lib/api/contracts";
import {
  REFRESH_ATTEMPT_COOKIE,
  REFRESH_ATTEMPT_COOKIE_VALUE,
} from "@/server/auth/session-cookie-policy";
import { HTTP_STATUS } from "@/lib/api/http-contract";
import { logger } from "@/lib/observability/logger";
import { isSessionTokenExpired } from "@/server/auth/jwt-metadata";
import {
  clearServerAuthCookies,
  getServerAccessToken,
  getServerRefreshToken,
} from "@/server/auth/session";
import { serverFetch } from "@/server/api/edge-fetch";

import { schemaIssueDiagnosticsFromError } from "@/features/auth/server/auth-error-diagnostics";

const LOGIN_PATH = "/login" satisfies Route;
const REFRESH_PATH = "/api/auth/refresh" satisfies Route;
const DASHBOARD_PATH = "/dashboard" satisfies Route;
const REQUEST_ID_HEADER = "x-request-id";
const CURRENT_PATH_HEADER = "x-oz-current-path";
const MAX_NEXT_PATH_LENGTH = 1_500;
const ACCESS_TOKEN_EXPIRY_SKEW_SECONDS = 30;
const SESSION_EXPIRED_STATUS = 419;
const DELETE_CONTROL_CHARACTER_CODE = 127;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/u;

const UNSAFE_ENCODED_PATH_MARKERS = ["%00", "%2e", "%2f", "%5c"] as const;

type LoginReason = "unauthorized" | "session-expired";

type AuthGateContext = Readonly<{
  requestId: string | null;
  nextPath: string;
  refreshAttempted: boolean;
}>;

type TokenState = Readonly<{
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpired: boolean;
}>;

type AuthGateFailureOutcome =
  "refresh_redirect" | "login_redirect" | "session_expired_redirect" | "throw";

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code <= 31 || code === DELETE_CONTROL_CHARACTER_CODE) {
      return true;
    }
  }

  return false;
}

function pathWithoutQuery(value: string): string {
  return value.split(/[?#]/u, 1)[0] ?? value;
}

function hasPathTraversalSegment(pathname: string): boolean {
  return pathname.split("/").includes("..");
}

function hasUnsafeEncoding(value: string): boolean {
  const normalized = value.toLowerCase();

  return UNSAFE_ENCODED_PATH_MARKERS.some((marker) =>
    normalized.includes(marker),
  );
}

function normalizeRequestId(value: string | null): string | null {
  const normalized = value?.trim() ?? "";

  return SAFE_REQUEST_ID_PATTERN.test(normalized) ? normalized : null;
}

function isSafeNextPath(value: string): boolean {
  const pathname = pathWithoutQuery(value);

  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !hasControlCharacter(value) &&
    !hasUnsafeEncoding(value) &&
    !hasPathTraversalSegment(pathname) &&
    !pathname.startsWith(REFRESH_PATH) &&
    !pathname.startsWith(LOGIN_PATH)
  );
}

function safeNextPath(value: string | null): string {
  const normalized = value?.trim() ?? "";

  if (
    normalized.length > 0 &&
    normalized.length <= MAX_NEXT_PATH_LENGTH &&
    isSafeNextPath(normalized)
  ) {
    return normalized;
  }

  return DASHBOARD_PATH;
}

function loginRedirectPath(reason: LoginReason, nextPath: string): Route {
  const params = new URLSearchParams({
    reason,
    next: nextPath,
  });

  return `${LOGIN_PATH}?${params.toString()}` as Route;
}

function refreshRedirectPath(nextPath: string): Route {
  const params = new URLSearchParams({ next: nextPath });

  return `${REFRESH_PATH}?${params.toString()}` as Route;
}

async function authGateContext(): Promise<AuthGateContext> {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);

  return {
    requestId: normalizeRequestId(headerStore.get(REQUEST_ID_HEADER)),
    nextPath: safeNextPath(headerStore.get(CURRENT_PATH_HEADER)),
    refreshAttempted:
      cookieStore.get(REFRESH_ATTEMPT_COOKIE)?.value ===
      REFRESH_ATTEMPT_COOKIE_VALUE,
  };
}

async function clearAuthCookiesBestEffort(): Promise<void> {
  try {
    await clearServerAuthCookies();
  } catch {
    // Cookie mutation is unavailable in read-only Server Component render contexts.
  }
}

function isUnauthorizedError(error: unknown): boolean {
  return isApiHttpError(error) && error.status === HTTP_STATUS.UNAUTHORIZED;
}

function isSessionExpiredError(error: unknown): boolean {
  return isApiHttpError(error) && error.status === SESSION_EXPIRED_STATUS;
}

function statusFromError(error: unknown): number | null {
  return isApiHttpError(error) ? error.status : null;
}

function codeFromError(error: unknown): string {
  return isApiHttpError(error) ? error.code : "unknown";
}

function requestIdFromError(error: unknown): string | null {
  if (!isApiHttpError(error)) {
    return null;
  }

  return normalizeRequestId(error.requestId ?? null);
}

function logAuthGateFailure(
  input: Readonly<{
    context: AuthGateContext;
    error: unknown;
    accessCookiePresent: boolean;
    accessTokenExpired: boolean;
    refreshCookiePresent: boolean;
    outcome: AuthGateFailureOutcome;
  }>,
): void {
  const upstreamRequestId = requestIdFromError(input.error);
  const schemaDiagnostics = schemaIssueDiagnosticsFromError(input.error);

  logger.warn("auth.require_authenticated_me.failed", {
    requestId: upstreamRequestId ?? input.context.requestId,
    phase: "require_authenticated_me",
    status: statusFromError(input.error),
    code: codeFromError(input.error),
    accessCookiePresent: input.accessCookiePresent,
    accessTokenExpired: input.accessTokenExpired,
    refreshCookiePresent: input.refreshCookiePresent,
    outcome: input.outcome,
    schemaIssuePaths: schemaDiagnostics?.paths,
    schemaIssueCodes: schemaDiagnostics?.codes,
  });
}

async function redirectToLogin(
  reason: LoginReason,
  nextPath: string,
): Promise<never> {
  await clearAuthCookiesBestEffort();
  redirect(loginRedirectPath(reason, nextPath));
}

function redirectToRefreshBoundary(nextPath: string): never {
  redirect(refreshRedirectPath(nextPath));
}

function throwIfRedirectReturned(): never {
  throw new Error("Authentication redirect did not terminate rendering.");
}

async function resolveTokenState(): Promise<TokenState> {
  const [accessToken, refreshToken] = await Promise.all([
    getServerAccessToken(),
    getServerRefreshToken(),
  ]);

  return {
    accessToken,
    refreshToken,
    accessTokenExpired:
      accessToken === null
        ? false
        : isSessionTokenExpired(accessToken, ACCESS_TOKEN_EXPIRY_SKEW_SECONDS),
  };
}

export async function getAuthenticatedMe(): Promise<MeResponse | null> {
  const tokenState = await resolveTokenState();
  const accessToken = tokenState.accessToken;

  if (accessToken === null || tokenState.accessTokenExpired) {
    return null;
  }

  try {
    return await serverFetch(AUTH_ENDPOINTS.me, {
      method: "GET",
      auth: true,
      refreshOnUnauthorized: false,
      cache: "no-store",
      schema: meResponseSchema,
      accessToken,
    });
  } catch (error) {
    if (isUnauthorizedError(error) || isSessionExpiredError(error)) {
      return null;
    }

    throw error;
  }
}

export async function requireAuthenticatedMe(): Promise<MeResponse> {
  const context = await authGateContext();
  const tokenState = await resolveTokenState();
  const refreshRequired =
    tokenState.accessToken === null || tokenState.accessTokenExpired;

  if (tokenState.refreshToken !== null && refreshRequired) {
    if (context.refreshAttempted) {
      await redirectToLogin("session-expired", context.nextPath);
      throwIfRedirectReturned();
    }

    redirectToRefreshBoundary(context.nextPath);
  }

  const accessToken = tokenState.accessToken;

  if (accessToken === null) {
    await redirectToLogin("unauthorized", context.nextPath);
    throwIfRedirectReturned();
  }

  let me: MeResponse;

  try {
    me = await serverFetch(AUTH_ENDPOINTS.me, {
      method: "GET",
      auth: true,
      refreshOnUnauthorized: false,
      cache: "no-store",
      schema: meResponseSchema,
      accessToken,
    });
  } catch (error) {
    const refreshCookiePresent = tokenState.refreshToken !== null;
    const accessCookiePresent = tokenState.accessToken !== null;

    if (
      refreshCookiePresent &&
      isUnauthorizedError(error) &&
      !context.refreshAttempted
    ) {
      logAuthGateFailure({
        context,
        error,
        accessCookiePresent,
        accessTokenExpired: tokenState.accessTokenExpired,
        refreshCookiePresent,
        outcome: "refresh_redirect",
      });

      redirectToRefreshBoundary(context.nextPath);
    }

    if (isSessionExpiredError(error)) {
      logAuthGateFailure({
        context,
        error,
        accessCookiePresent,
        accessTokenExpired: tokenState.accessTokenExpired,
        refreshCookiePresent,
        outcome: "session_expired_redirect",
      });

      await redirectToLogin("session-expired", context.nextPath);
      throwIfRedirectReturned();
    }

    if (isUnauthorizedError(error)) {
      logAuthGateFailure({
        context,
        error,
        accessCookiePresent,
        accessTokenExpired: tokenState.accessTokenExpired,
        refreshCookiePresent,
        outcome: "login_redirect",
      });

      await redirectToLogin("unauthorized", context.nextPath);
      throwIfRedirectReturned();
    }

    logAuthGateFailure({
      context,
      error,
      accessCookiePresent,
      accessTokenExpired: tokenState.accessTokenExpired,
      refreshCookiePresent,
      outcome: "throw",
    });

    throw error;
  }

  return me;
}

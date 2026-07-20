// oz-next-app/src/app/api/auth/refresh/route.ts
import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { isApiHttpError } from "@/lib/api/problem";
import {
  REFRESH_ATTEMPT_COOKIE,
  REFRESH_ATTEMPT_COOKIE_OPTIONS,
  REFRESH_ATTEMPT_COOKIE_VALUE,
} from "@/server/auth/session-cookie-policy";
import { CACHE_CONTROL, CT, HDR, HTTP_STATUS } from "@/lib/api/http-contract";
import { logger } from "@/lib/observability/logger";
import { refreshServerAuthTokensForMutableBoundary } from "@/server/api/edge-api-client";
import {
  clearServerAuthCookies,
  getServerAccessToken,
  getServerRefreshToken,
} from "@/server/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const LOGIN_EXPIRED_PATH = "/login?reason=session-expired" as const;
const DEFAULT_NEXT_PATH = "/dashboard" as const;
const REFRESH_PATH = "/api/auth/refresh" as const;

const MAX_NEXT_PATH_LENGTH = 1_500;
const ASCII_CONTROL_MAX_CODE_POINT = 0x1f;
const ASCII_DELETE_CODE_POINT = 0x7f;

const UNSAFE_ENCODED_PATH_PATTERN = /%(?:00|0a|0d|2e|2f|5c)/iu;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/u;

const PUBLIC_OR_UNSAFE_EXACT_PATHS = new Set<string>(["/", "/login", "/api"]);

const PUBLIC_OR_UNSAFE_PREFIXES = [
  "/api/",
  "/_next/",
  "/images/",
  "/icons/",
  "/fonts/",
  "/tasks/",
  "/internal/",
  "/.well-known/",
] as const;

const SAME_ORIGIN_FETCH_SITES = new Set(["same-origin", "none"] as const);

type SameOriginFetchSite = "same-origin" | "none";

type RefreshOutcome =
  | "missing_refresh_cookie"
  | "refresh_ok"
  | "refresh_failed"
  | "refresh_rate_limited"
  | "refresh_unavailable"
  | "blocked_cross_origin";

type RefreshProblemCode =
  | "missing_refresh_cookie"
  | "refresh_failed"
  | "refresh_rate_limited"
  | "refresh_unavailable"
  | "cross_origin_refresh_blocked";

type RefreshBoundaryResult =
  | Readonly<{
      ok: true;
      expiresInSeconds: number;
    }>
  | Readonly<{
      ok: false;
      status:
        | typeof HTTP_STATUS.UNAUTHORIZED
        | typeof HTTP_STATUS.FORBIDDEN
        | typeof HTTP_STATUS.TOO_MANY_REQUESTS
        | typeof HTTP_STATUS.SERVICE_UNAVAILABLE;
      code: RefreshProblemCode;
      message: string;
      retryAfterSeconds?: number | undefined;
    }>;

type RefreshBoundaryFailureResult = Extract<
  RefreshBoundaryResult,
  { ok: false }
>;

type RefreshSuccessJsonBody = Readonly<{
  status: "success";
  refreshed: true;
  expires_in: number;
}>;

type RefreshProblemJsonBody = Readonly<{
  type: string;
  title: string;
  status:
    | typeof HTTP_STATUS.UNAUTHORIZED
    | typeof HTTP_STATUS.FORBIDDEN
    | typeof HTTP_STATUS.TOO_MANY_REQUESTS
    | typeof HTTP_STATUS.SERVICE_UNAVAILABLE;
  detail: string;
  code: RefreshProblemCode;
  request_id: string;
  timestamp: string;
}>;

type RefreshJsonBody = RefreshSuccessJsonBody | RefreshProblemJsonBody;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);

    if (
      codePoint <= ASCII_CONTROL_MAX_CODE_POINT ||
      codePoint === ASCII_DELETE_CODE_POINT
    ) {
      return true;
    }
  }

  return false;
}

function pathWithoutSearchOrHash(value: string): string {
  return value.split(/[?#]/u, 1)[0] ?? value;
}

function hasBlockedNextPathPrefix(pathname: string): boolean {
  return PUBLIC_OR_UNSAFE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
}

function isSafeRelativeNextPath(value: string): boolean {
  const pathname = pathWithoutSearchOrHash(value);

  return (
    value.length > 0 &&
    value.length <= MAX_NEXT_PATH_LENGTH &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !hasControlCharacter(value) &&
    !UNSAFE_ENCODED_PATH_PATTERN.test(value) &&
    !pathname.split("/").includes("..") &&
    !PUBLIC_OR_UNSAFE_EXACT_PATHS.has(pathname) &&
    !hasBlockedNextPathPrefix(pathname) &&
    pathname !== REFRESH_PATH &&
    !pathname.startsWith(`${REFRESH_PATH}/`)
  );
}

function safeNextPath(value: string | null): string {
  const normalized = value?.trim() ?? "";

  return isSafeRelativeNextPath(normalized) ? normalized : DEFAULT_NEXT_PATH;
}

function loginUnavailablePath(nextPath: string): string {
  const params = new URLSearchParams({
    reason: "backend-unavailable",
    next: nextPath,
  });

  return `/login?${params.toString()}`;
}

function markSuccessfulRefresh(response: NextResponse): NextResponse {
  response.cookies.set(
    REFRESH_ATTEMPT_COOKIE,
    REFRESH_ATTEMPT_COOKIE_VALUE,
    REFRESH_ATTEMPT_COOKIE_OPTIONS,
  );

  return response;
}

function safeRequestId(request: NextRequest): string {
  const value = request.headers.get(HDR.REQUEST_ID)?.trim() ?? "";

  return SAFE_REQUEST_ID_PATTERN.test(value) ? value : crypto.randomUUID();
}

function isSameOriginFetchSite(value: string): value is SameOriginFetchSite {
  return SAME_ORIGIN_FETCH_SITES.has(value as SameOriginFetchSite);
}

function isSameOriginRefreshRequest(request: NextRequest): boolean {
  const origin = request.headers.get(HDR.ORIGIN)?.trim() ?? "";
  const requiresOrigin = request.method !== "GET";

  if (origin.length === 0) {
    if (requiresOrigin) {
      return false;
    }
  } else {
    try {
      if (new URL(origin).origin !== request.nextUrl.origin) {
        return false;
      }
    } catch {
      return false;
    }
  }

  const fetchSite =
    request.headers.get("sec-fetch-site")?.trim().toLowerCase() ?? "";

  if (fetchSite.length === 0) {
    return !requiresOrigin || origin.length > 0;
  }

  return isSameOriginFetchSite(fetchSite);
}

function appendVary(headers: Headers, value: string): void {
  const current = headers.get("vary");

  if (current === null || current.trim().length === 0) {
    headers.set("vary", value);
    return;
  }

  const existing = new Set(
    current
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0),
  );

  if (!existing.has(value.toLowerCase())) {
    headers.set("vary", `${current}, ${value}`);
  }
}

function finalizeBoundaryResponse(response: NextResponse): NextResponse {
  response.headers.set(HDR.CACHE_CONTROL, CACHE_CONTROL.PRIVATE_NO_STORE);
  response.headers.set("pragma", "no-cache");
  appendVary(response.headers, "Cookie");
  appendVary(response.headers, "Accept");
  appendVary(response.headers, "Origin");

  return response;
}

function jsonResponse(body: RefreshJsonBody, status: number): NextResponse {
  const response = NextResponse.json(body, { status });

  response.headers.set(
    HDR.CONTENT_TYPE,
    status >= HTTP_STATUS.BAD_REQUEST ? CT.PROBLEM_JSON : CT.JSON,
  );

  return finalizeBoundaryResponse(response);
}

function redirectResponse(request: NextRequest, path: string): NextResponse {
  return finalizeBoundaryResponse(
    NextResponse.redirect(new URL(path, request.url)),
  );
}

function logRefreshOutcome(
  input: Readonly<{
    request: NextRequest;
    accessCookiePresent: boolean;
    refreshCookiePresent: boolean;
    outcome: RefreshOutcome;
  }>,
): void {
  logger.warn("auth.refresh_boundary", {
    requestId: safeRequestId(input.request),
    phase: "refresh_boundary",
    accessCookiePresent: input.accessCookiePresent,
    refreshCookiePresent: input.refreshCookiePresent,
    outcome: input.outcome,
  });
}

async function clearAuthCookiesBestEffort(): Promise<void> {
  try {
    await clearServerAuthCookies();
  } catch {
    // Fail closed without leaking implementation details.
  }
}

async function readCookiePresence(): Promise<
  Readonly<{
    accessCookiePresent: boolean;
    refreshCookiePresent: boolean;
  }>
> {
  const [accessToken, refreshToken] = await Promise.all([
    getServerAccessToken(),
    getServerRefreshToken(),
  ]);

  return {
    accessCookiePresent: accessToken !== null,
    refreshCookiePresent: refreshToken !== null,
  };
}

async function executeRefreshBoundary(
  request: NextRequest,
): Promise<RefreshBoundaryResult> {
  const { accessCookiePresent, refreshCookiePresent } =
    await readCookiePresence();

  if (!refreshCookiePresent) {
    await clearAuthCookiesBestEffort();

    logRefreshOutcome({
      request,
      accessCookiePresent,
      refreshCookiePresent,
      outcome: "missing_refresh_cookie",
    });

    return {
      ok: false,
      status: HTTP_STATUS.UNAUTHORIZED,
      code: "missing_refresh_cookie",
      message: "Session refresh is unavailable.",
    };
  }

  let refreshed: Awaited<
    ReturnType<typeof refreshServerAuthTokensForMutableBoundary>
  >;

  try {
    refreshed = await refreshServerAuthTokensForMutableBoundary();
  } catch (error) {
    if (
      isApiHttpError(error) &&
      error.status === HTTP_STATUS.TOO_MANY_REQUESTS
    ) {
      logRefreshOutcome({
        request,
        accessCookiePresent,
        refreshCookiePresent,
        outcome: "refresh_rate_limited",
      });

      return {
        ok: false,
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        code: "refresh_rate_limited",
        message: "Session refresh is temporarily rate limited.",
        retryAfterSeconds: error.retryAfterSeconds,
      };
    }

    logRefreshOutcome({
      request,
      accessCookiePresent,
      refreshCookiePresent,
      outcome: "refresh_unavailable",
    });

    return {
      ok: false,
      status: HTTP_STATUS.SERVICE_UNAVAILABLE,
      code: "refresh_unavailable",
      message: "Session refresh is temporarily unavailable.",
    };
  }

  if (refreshed === null) {
    await clearAuthCookiesBestEffort();

    logRefreshOutcome({
      request,
      accessCookiePresent,
      refreshCookiePresent,
      outcome: "refresh_failed",
    });

    return {
      ok: false,
      status: HTTP_STATUS.UNAUTHORIZED,
      code: "refresh_failed",
      message: "Session refresh failed.",
    };
  }

  logRefreshOutcome({
    request,
    accessCookiePresent,
    refreshCookiePresent,
    outcome: "refresh_ok",
  });

  return {
    ok: true,
    expiresInSeconds: refreshed.expires_in,
  };
}

function successBody(expiresInSeconds: number): RefreshSuccessJsonBody {
  return {
    status: "success",
    refreshed: true,
    expires_in: expiresInSeconds,
  };
}

function problemBody(
  request: NextRequest,
  result: RefreshBoundaryFailureResult,
): RefreshProblemJsonBody {
  return {
    type: `urn:oz-next-app:problem:${result.code}`,
    title:
      result.status === HTTP_STATUS.FORBIDDEN
        ? "Forbidden"
        : result.status === HTTP_STATUS.TOO_MANY_REQUESTS
          ? "Too Many Requests"
          : result.status === HTTP_STATUS.SERVICE_UNAVAILABLE
            ? "Service Unavailable"
            : "Unauthorized",
    status: result.status,
    detail: result.message,
    code: result.code,
    request_id: safeRequestId(request),
    timestamp: new Date().toISOString(),
  };
}

async function blockedCrossOriginResult(
  request: NextRequest,
): Promise<RefreshBoundaryFailureResult> {
  const { accessCookiePresent, refreshCookiePresent } =
    await readCookiePresence();

  logRefreshOutcome({
    request,
    accessCookiePresent,
    refreshCookiePresent,
    outcome: "blocked_cross_origin",
  });

  return {
    ok: false,
    status: HTTP_STATUS.FORBIDDEN,
    code: "cross_origin_refresh_blocked",
    message: "Session refresh is only allowed from the application origin.",
  };
}

function withRetryAfter(
  response: NextResponse,
  result: RefreshBoundaryFailureResult,
): NextResponse {
  if (result.retryAfterSeconds !== undefined) {
    response.headers.set(HDR.RETRY_AFTER, String(result.retryAfterSeconds));
  }

  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));

  if (!isSameOriginRefreshRequest(request)) {
    await blockedCrossOriginResult(request);
    return redirectResponse(request, LOGIN_EXPIRED_PATH);
  }

  const result = await executeRefreshBoundary(request);

  if (result.ok) {
    return markSuccessfulRefresh(redirectResponse(request, nextPath));
  }

  return withRetryAfter(
    redirectResponse(
      request,
      result.status === HTTP_STATUS.SERVICE_UNAVAILABLE ||
        result.status === HTTP_STATUS.TOO_MANY_REQUESTS
        ? loginUnavailablePath(nextPath)
        : LOGIN_EXPIRED_PATH,
    ),
    result,
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRefreshRequest(request)) {
    const result = await blockedCrossOriginResult(request);

    return jsonResponse(problemBody(request, result), result.status);
  }

  const result = await executeRefreshBoundary(request);

  if (!result.ok) {
    return withRetryAfter(
      jsonResponse(problemBody(request, result), result.status),
      result,
    );
  }

  return markSuccessfulRefresh(
    jsonResponse(successBody(result.expiresInSeconds), HTTP_STATUS.OK),
  );
}

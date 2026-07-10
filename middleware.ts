// oz-next-app/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const HDR = {
  REQUEST_ID: "x-request-id",
  CORRELATION_ID: "x-correlation-id",
  CURRENT_PATH: "x-oz-current-path",
  AUTHORIZATION: "authorization",
  CACHE_CONTROL: "cache-control",
  ORIGIN: "origin",
  CONTENT_TYPE: "content-type",
} as const;

const CT = {
  PROBLEM_JSON: "application/problem+json",
} as const;

const CACHE_CONTROL = {
  PRIVATE_NO_STORE: "private, no-store, no-cache, must-revalidate",
} as const;

const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
} as const;

const LOGIN_PATH = "/login";
const DEFAULT_AUTH_SUCCESS_PATH = "/dashboard";

const MAX_HEADER_ID_LENGTH = 128;
const MAX_PATH_LENGTH = 2_048;
const MAX_REDIRECT_PATH_LENGTH = 1_500;
const MAX_QUERY_KEY_LENGTH = 128;
const MAX_QUERY_VALUE_LENGTH = 1_000;
const MIN_SESSION_COOKIE_LENGTH = 16;
const MAX_SESSION_COOKIE_LENGTH = 8_192;

const ASCII_CONTROL_MAX_CODE_POINT = 0x1f;
const ASCII_DELETE_CODE_POINT = 0x7f;
const NUL_CHARACTER = "\u0000";
const CARRIAGE_RETURN = "\r";
const LINE_FEED = "\n";

type PublicRouteDefinition = Readonly<{
  exactPath: `/${string}`;
  prefix: `/${string}/`;
  privateCache: boolean;
  varyCookie: boolean;
}>;

const PUBLIC_TOKEN_ROUTES = [
  {
    exactPath: "/public/location",
    prefix: "/public/location/",
    privateCache: true,
    varyCookie: false,
  },
  {
    exactPath: "/erp/public/location",
    prefix: "/erp/public/location/",
    privateCache: true,
    varyCookie: false,
  },
  {
    exactPath: "/public/dealer-leads",
    prefix: "/public/dealer-leads/",
    privateCache: true,
    varyCookie: false,
  },
  {
    exactPath: "/erp/public/dealer-leads",
    prefix: "/erp/public/dealer-leads/",
    privateCache: true,
    varyCookie: false,
  },
  {
    exactPath: "/public/dealership",
    prefix: "/public/dealership/",
    privateCache: true,
    varyCookie: false,
  },
  {
    exactPath: "/erp/public/dealership",
    prefix: "/erp/public/dealership/",
    privateCache: true,
    varyCookie: false,
  },
  {
    exactPath: "/erp/public/forms/dealership",
    prefix: "/erp/public/forms/dealership/",
    privateCache: true,
    varyCookie: false,
  },
  {
    exactPath: "/public/service-feedback",
    prefix: "/public/service-feedback/",
    privateCache: true,
    varyCookie: false,
  },
  {
    exactPath: "/erp/public/service-feedback",
    prefix: "/erp/public/service-feedback/",
    privateCache: true,
    varyCookie: false,
  },
  {
    exactPath: "/erp/public/forms/service-feedback",
    prefix: "/erp/public/forms/service-feedback/",
    privateCache: true,
    varyCookie: false,
  },
  {
    exactPath: "/public/warranty",
    prefix: "/public/warranty/",
    privateCache: true,
    varyCookie: false,
  },
  {
    exactPath: "/erp/public/warranty",
    prefix: "/erp/public/warranty/",
    privateCache: true,
    varyCookie: false,
  },
  {
    exactPath: "/erp/public/forms/warranty",
    prefix: "/erp/public/forms/warranty/",
    privateCache: true,
    varyCookie: false,
  },
] as const satisfies readonly PublicRouteDefinition[];

const PUBLIC_EXACT_PATHS = new Set<string>([
  "/",
  LOGIN_PATH,
  "/forgot-password",
  "/reset-password",
]);

const PUBLIC_PREFIXES = [
  "/_next/",
  "/images/",
  "/icons/",
  "/fonts/",
  "/.well-known/",
] as const;

const PUBLIC_API_EXACT_PATHS = new Set<string>(["/api/auth"]);
const PUBLIC_API_PREFIXES = ["/api/auth/"] as const;

const BLOCKED_EXACT_PATHS = new Set<string>([
  "/erp",
  "/tasks",
  "/metrics",
  "/readyz",
  "/healthz",
  "/livez",
  "/version",
  "/internal",
  "/admin/internal",
  "/_ah/health",
  "/_health",
  "/_ready",
]);

const BLOCKED_PREFIXES = [
  "/erp/",
  "/tasks/",
  "/metrics/",
  "/internal/",
  "/admin/internal/",
] as const;

const AUTH_SESSION_COOKIE_NAMES = [
  "__Host-oz_access_token",
  "__Host-oz_refresh_token",
  "__Secure-oz_access_token",
  "__Secure-oz_refresh_token",
  "oz_access_token",
  "oz_refresh_token",
  "__Host-oz_session",
  "__Secure-oz_session",
  "oz_session",
  "oz_access",
  "oz_refresh",
] as const;

const ALLOWED_METHODS: ReadonlySet<string> = new Set([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
]);

const MUTATION_METHODS: ReadonlySet<string> = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

const STRIPPED_INBOUND_HEADERS = [
  HDR.AUTHORIZATION,
  "x-tenant-id",
  "x-org-unit-id",
  "x-dealer-org-unit-id",
  "x-financier-id",
  "x-customer-id",
  "x-serverless-authorization",
  "x-oz-task-secret",
  "x-cloudtasks-queuename",
  "x-cloudtasks-taskname",
  "x-cloudtasks-taskretrycount",
  "x-cloudtasks-taskexecutioncount",
] as const;

const SENSITIVE_QUERY_PARAM_NAMES = new Set([
  "access_token",
  "refresh_token",
  "id_token",
  "token",
  "jwt",
  "otp",
  "code",
  "password",
  "secret",
  "signature",
  "email",
  "phone",
  "mobile",
]);

const PUBLIC_ROOT_FILE_PATTERN =
  /^\/[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:avif|bmp|css|csv|gif|ico|jpg|jpeg|js|json|map|png|svg|txt|webmanifest|webp|woff|woff2)$/iu;

const SAFE_HEADER_ID_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/u;
const UNSAFE_ENCODED_PATH_PATTERN = /%(?:00|0a|0d|2e|2f|5c)/iu;

type ProblemStatus =
  | typeof HTTP_STATUS.BAD_REQUEST
  | typeof HTTP_STATUS.UNAUTHORIZED
  | typeof HTTP_STATUS.FORBIDDEN
  | typeof HTTP_STATUS.NOT_FOUND
  | typeof HTTP_STATUS.METHOD_NOT_ALLOWED;

type RequestContext = Readonly<{
  requestId: string;
  correlationId: string;
  currentPath: string;
}>;

type FinalizeOptions = Readonly<{
  request: NextRequest;
  context: RequestContext;
  privateCache?: boolean;
  varyCookie?: boolean;
}>;

type ProblemInput = Readonly<{
  request: NextRequest;
  context: RequestContext;
  status: ProblemStatus;
  code: string;
  detail: string;
}>;

function createRequestId(): string {
  return `mw_${crypto.randomUUID()}`;
}

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

function hasSessionCookieControlCharacter(value: string): boolean {
  return (
    value.includes(CARRIAGE_RETURN) ||
    value.includes(LINE_FEED) ||
    value.includes(NUL_CHARACTER)
  );
}

function normalizeHeaderId(value: string | null, fallback: string): string {
  const normalized = value?.trim() ?? "";

  if (
    normalized.length > 0 &&
    normalized.length <= MAX_HEADER_ID_LENGTH &&
    SAFE_HEADER_ID_PATTERN.test(normalized)
  ) {
    return normalized;
  }

  return fallback;
}

function pathWithoutQuery(value: string): string {
  return value.split(/[?#]/u, 1)[0] ?? value;
}

function matchesPublicTokenRoute(pathname: string): boolean {
  return PUBLIC_TOKEN_ROUTES.some(
    (route) =>
      pathname === route.exactPath || pathname.startsWith(route.prefix),
  );
}

function publicTokenRouteForPath(
  pathname: string,
): PublicRouteDefinition | null {
  return (
    PUBLIC_TOKEN_ROUTES.find(
      (route) =>
        pathname === route.exactPath || pathname.startsWith(route.prefix),
    ) ?? null
  );
}

function isGeolocationAllowedRequestPath(pathname: string): boolean {
  return (
    pathname === "/public/location" ||
    pathname.startsWith("/public/location/") ||
    pathname === "/erp/public/location" ||
    pathname.startsWith("/erp/public/location/") ||
    pathname === "/public/dealership" ||
    pathname.startsWith("/public/dealership/") ||
    pathname === "/erp/public/dealership" ||
    pathname.startsWith("/erp/public/dealership/") ||
    pathname === "/erp/public/forms/dealership" ||
    pathname.startsWith("/erp/public/forms/dealership/") ||
    pathname === "/public/service-feedback" ||
    pathname.startsWith("/public/service-feedback/") ||
    pathname === "/erp/public/service-feedback" ||
    pathname.startsWith("/erp/public/service-feedback/") ||
    pathname === "/erp/public/forms/service-feedback" ||
    pathname.startsWith("/erp/public/forms/service-feedback/")
  );
}

function hasBlockedPrefix(pathname: string): boolean {
  const normalized = pathname.toLowerCase();

  return BLOCKED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isBlockedPath(pathname: string): boolean {
  if (matchesPublicTokenRoute(pathname)) {
    return false;
  }

  const normalized = pathname.toLowerCase();

  return BLOCKED_EXACT_PATHS.has(normalized) || hasBlockedPrefix(normalized);
}

function hasUnsafePath(pathname: string): boolean {
  const normalized = pathname.trim();
  const lower = normalized.toLowerCase();

  return (
    normalized.length === 0 ||
    normalized.length > MAX_PATH_LENGTH ||
    !normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    normalized.includes("\\") ||
    hasControlCharacter(normalized) ||
    UNSAFE_ENCODED_PATH_PATTERN.test(lower) ||
    pathWithoutQuery(normalized).split("/").includes("..")
  );
}

function isStaticAssetPath(pathname: string): boolean {
  return (
    PUBLIC_ROOT_FILE_PATTERN.test(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function isPublicApiPath(pathname: string): boolean {
  return (
    PUBLIC_API_EXACT_PATHS.has(pathname) ||
    PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_EXACT_PATHS.has(pathname) ||
    matchesPublicTokenRoute(pathname) ||
    isPublicApiPath(pathname) ||
    isStaticAssetPath(pathname)
  );
}

function isAllowedMethod(method: string): boolean {
  return ALLOWED_METHODS.has(method.toUpperCase());
}

function hasSessionCookie(request: NextRequest): boolean {
  return AUTH_SESSION_COOKIE_NAMES.some((name) => {
    const cookie = request.cookies.get(name);
    const value = cookie?.value.trim();

    return (
      value !== undefined &&
      value.length >= MIN_SESSION_COOKIE_LENGTH &&
      value.length <= MAX_SESSION_COOKIE_LENGTH &&
      !hasSessionCookieControlCharacter(value)
    );
  });
}

function isSensitiveQueryKey(key: string): boolean {
  return SENSITIVE_QUERY_PARAM_NAMES.has(key.trim().toLowerCase());
}

function sanitizedSearchParams(searchParams: URLSearchParams): string {
  const output = new URLSearchParams();

  for (const [key, value] of searchParams.entries()) {
    if (
      key.length === 0 ||
      key.length > MAX_QUERY_KEY_LENGTH ||
      value.length > MAX_QUERY_VALUE_LENGTH ||
      hasControlCharacter(key) ||
      hasControlCharacter(value) ||
      isSensitiveQueryKey(key)
    ) {
      continue;
    }

    output.append(key, value);
  }

  const serialized = output.toString();

  return serialized.length > 0 ? `?${serialized}` : "";
}

function safeCurrentPath(request: NextRequest): string {
  const pathname = request.nextUrl.pathname;

  if (hasUnsafePath(pathname)) {
    return DEFAULT_AUTH_SUCCESS_PATH;
  }

  const currentPath = `${pathname}${sanitizedSearchParams(request.nextUrl.searchParams)}`;

  if (
    currentPath.length > 0 &&
    currentPath.length <= MAX_REDIRECT_PATH_LENGTH &&
    currentPath.startsWith("/") &&
    !currentPath.startsWith("//") &&
    !hasControlCharacter(currentPath) &&
    !UNSAFE_ENCODED_PATH_PATTERN.test(currentPath.toLowerCase()) &&
    !pathWithoutQuery(currentPath).split("/").includes("..")
  ) {
    return currentPath;
  }

  return pathname.length <= MAX_REDIRECT_PATH_LENGTH
    ? pathname
    : DEFAULT_AUTH_SUCCESS_PATH;
}

function createRequestContext(request: NextRequest): RequestContext {
  const requestId = normalizeHeaderId(
    request.headers.get(HDR.REQUEST_ID),
    createRequestId(),
  );
  const correlationId = normalizeHeaderId(
    request.headers.get(HDR.CORRELATION_ID),
    requestId,
  );

  return {
    requestId,
    correlationId,
    currentPath: safeCurrentPath(request),
  };
}

function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get(HDR.ORIGIN)?.trim() ?? "";

  if (origin.length > 0) {
    try {
      return new URL(origin).origin === request.nextUrl.origin;
    } catch {
      return false;
    }
  }

  const fetchSite =
    request.headers.get("sec-fetch-site")?.trim().toLowerCase() ?? "";

  return fetchSite === "same-origin" || fetchSite === "none";
}

function requiresSameOrigin(request: NextRequest): boolean {
  return MUTATION_METHODS.has(request.method.toUpperCase());
}

function buildForwardedRequestHeaders(
  request: NextRequest,
  context: RequestContext,
): Headers {
  const headers = new Headers(request.headers);

  for (const header of STRIPPED_INBOUND_HEADERS) {
    headers.delete(header);
  }

  headers.set(HDR.REQUEST_ID, context.requestId);
  headers.set(HDR.CORRELATION_ID, context.correlationId);
  headers.set(HDR.CURRENT_PATH, context.currentPath);

  return headers;
}

function appendVary(headers: Headers, value: string): void {
  const existing = headers.get("vary");

  if (existing === null || existing.trim().length === 0) {
    headers.set("vary", value);
    return;
  }

  const values = existing
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const alreadyPresent = values.some(
    (item) => item.toLowerCase() === value.toLowerCase(),
  );

  if (!alreadyPresent) {
    values.push(value);
  }

  headers.set("vary", values.join(", "));
}

function buildPermissionsPolicy(pathname: string): string {
  return [
    "accelerometer=()",
    "ambient-light-sensor=()",
    "autoplay=()",
    "bluetooth=()",
    "browsing-topics=()",
    "camera=()",
    "display-capture=()",
    "encrypted-media=()",
    "fullscreen=(self)",
    isGeolocationAllowedRequestPath(pathname)
      ? "geolocation=(self)"
      : "geolocation=()",
    "gyroscope=()",
    "magnetometer=()",
    "microphone=()",
    "midi=()",
    "payment=()",
    "picture-in-picture=()",
    "publickey-credentials-get=(self)",
    "screen-wake-lock=()",
    "serial=()",
    "usb=()",
    "web-share=(self)",
    "xr-spatial-tracking=()",
  ].join(", ");
}

function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
): void {
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("x-dns-prefetch-control", "off");
  response.headers.set("x-download-options", "noopen");
  response.headers.set("x-permitted-cross-domain-policies", "none");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("cross-origin-opener-policy", "same-origin");
  response.headers.set("cross-origin-resource-policy", "same-site");
  response.headers.set("origin-agent-cluster", "?1");
  response.headers.set(
    "permissions-policy",
    buildPermissionsPolicy(request.nextUrl.pathname),
  );

  if (request.nextUrl.protocol === "https:") {
    response.headers.set(
      "strict-transport-security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }
}

function finalizeResponse(
  response: NextResponse,
  options: FinalizeOptions,
): NextResponse {
  response.headers.set(HDR.REQUEST_ID, options.context.requestId);
  response.headers.set(HDR.CORRELATION_ID, options.context.correlationId);

  applySecurityHeaders(response, options.request);

  if (publicTokenRouteForPath(options.request.nextUrl.pathname) !== null) {
    response.headers.set(
      "x-robots-tag",
      "noindex, nofollow, noarchive, nosnippet",
    );
  }

  if (options.privateCache === true) {
    response.headers.set(HDR.CACHE_CONTROL, CACHE_CONTROL.PRIVATE_NO_STORE);
  }

  if (options.varyCookie === true) {
    appendVary(response.headers, "Cookie");
  }

  return response;
}

function nextResponse(
  request: NextRequest,
  context: RequestContext,
  options: Readonly<{
    privateCache: boolean;
    varyCookie: boolean;
  }>,
): NextResponse {
  return finalizeResponse(
    NextResponse.next({
      request: {
        headers: buildForwardedRequestHeaders(request, context),
      },
    }),
    {
      request,
      context,
      privateCache: options.privateCache,
      varyCookie: options.varyCookie,
    },
  );
}

function problemTitle(status: ProblemStatus): string {
  switch (status) {
    case HTTP_STATUS.BAD_REQUEST:
      return "Bad Request";
    case HTTP_STATUS.UNAUTHORIZED:
      return "Unauthorized";
    case HTTP_STATUS.FORBIDDEN:
      return "Forbidden";
    case HTTP_STATUS.NOT_FOUND:
      return "Not Found";
    case HTTP_STATUS.METHOD_NOT_ALLOWED:
      return "Method Not Allowed";
  }
}

function problemResponse(input: ProblemInput): NextResponse {
  const response = NextResponse.json(
    {
      type: `urn:oz-next-app:middleware:${input.code}`,
      title: problemTitle(input.status),
      status: input.status,
      detail: input.detail,
      code: input.code,
      request_id: input.context.requestId,
      timestamp: new Date().toISOString(),
      instance: input.request.nextUrl.pathname,
    },
    {
      status: input.status,
    },
  );

  response.headers.set(HDR.CONTENT_TYPE, CT.PROBLEM_JSON);

  return finalizeResponse(response, {
    request: input.request,
    context: input.context,
    privateCache: true,
    varyCookie: true,
  });
}

function loginRedirect(
  request: NextRequest,
  context: RequestContext,
): NextResponse {
  const url = request.nextUrl.clone();

  url.pathname = LOGIN_PATH;
  url.search = "";

  if (context.currentPath !== "/" && context.currentPath !== LOGIN_PATH) {
    url.searchParams.set("next", context.currentPath);
  }

  url.searchParams.set("reason", "unauthorized");

  return finalizeResponse(NextResponse.redirect(url, 303), {
    request,
    context,
    privateCache: true,
    varyCookie: true,
  });
}

function shouldUsePrivateCache(pathname: string, publicPath: boolean): boolean {
  if (isStaticAssetPath(pathname)) {
    return false;
  }

  const publicTokenRoute = publicTokenRouteForPath(pathname);

  if (publicTokenRoute !== null) {
    return publicTokenRoute.privateCache;
  }

  return (
    !publicPath ||
    pathname === "/" ||
    pathname === LOGIN_PATH ||
    isPublicApiPath(pathname)
  );
}

function shouldVaryOnCookie(pathname: string, publicPath: boolean): boolean {
  if (isStaticAssetPath(pathname)) {
    return false;
  }

  const publicTokenRoute = publicTokenRouteForPath(pathname);

  if (publicTokenRoute !== null) {
    return publicTokenRoute.varyCookie;
  }

  return !publicPath || pathname === "/" || isPublicApiPath(pathname);
}

export function middleware(request: NextRequest): NextResponse {
  const context = createRequestContext(request);
  const pathname = request.nextUrl.pathname;
  const publicPath = isPublicPath(pathname);

  if (!isAllowedMethod(request.method)) {
    return problemResponse({
      request,
      context,
      status: HTTP_STATUS.METHOD_NOT_ALLOWED,
      code: "method_not_allowed",
      detail: "This HTTP method is not supported by the application boundary.",
    });
  }

  if (hasUnsafePath(pathname)) {
    return problemResponse({
      request,
      context,
      status: HTTP_STATUS.BAD_REQUEST,
      code: "invalid_path",
      detail: "The request path is invalid or unsafe.",
    });
  }

  if (isBlockedPath(pathname)) {
    return problemResponse({
      request,
      context,
      status: HTTP_STATUS.NOT_FOUND,
      code: "route_not_found",
      detail: "This route is not exposed by the frontend application.",
    });
  }

  if (requiresSameOrigin(request) && !isSameOriginRequest(request)) {
    return problemResponse({
      request,
      context,
      status: HTTP_STATUS.FORBIDDEN,
      code: "cross_origin_mutation_blocked",
      detail:
        "Cookie-authenticated mutations must originate from the application origin.",
    });
  }

  if (!publicPath && !hasSessionCookie(request)) {
    if (isApiPath(pathname)) {
      return problemResponse({
        request,
        context,
        status: HTTP_STATUS.UNAUTHORIZED,
        code: "authentication_required",
        detail: "Authentication is required for this API route.",
      });
    }

    return loginRedirect(request, context);
  }

  return nextResponse(request, context, {
    privateCache: shouldUsePrivateCache(pathname, publicPath),
    varyCookie: shouldVaryOnCookie(pathname, publicPath),
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-light.svg|icon-dark.svg|logo-light.svg|logo-dark.svg|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:avif|bmp|css|csv|gif|ico|jpg|jpeg|js|json|map|png|svg|txt|webmanifest|webp|woff|woff2)$).*)",
  ],
};

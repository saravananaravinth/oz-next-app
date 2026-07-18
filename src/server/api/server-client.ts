// oz-next-app/src/server/api/server-client.ts
import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z, type ZodType } from "zod";

import { AUTH_ENDPOINTS } from "@/lib/api/endpoints";
import {
  readJsonPayload,
  throwForHttpError,
  unwrapApiEnvelope,
  unwrapApiPayload,
  type ApiEnvelopeResult,
} from "@/lib/api/envelope";
import { ApiHttpError } from "@/lib/api/problem";
import {
  authBodyTokenResponseSchema,
  jwtTokenSchema,
  refreshTokenRequestSchema,
  type AuthBodyTokenResponse,
} from "@/lib/api/schemas";
import {
  API_CONFIG,
  BLOCKED_PUBLIC_BACKEND_PATHS,
  CACHE_CONTROL,
  HDR,
  HTTP_METHODS,
  HTTP_STATUS,
  SERVER_API_ALLOWED_PREFIXES,
  type HttpMethod,
} from "@/lib/constants";
import { logger } from "@/lib/logger";
import {
  serverRequestContextHeaders,
  type ServerActorContextHeaders,
} from "@/server/api/request-context";
import {
  hasSessionTokenType,
  isSessionTokenExpired,
} from "@/server/auth/jwt-metadata";
import {
  clearServerAuthCookies,
  getServerAccessToken,
  getServerDeviceFingerprint,
  getServerRefreshToken,
  setServerAuthTokens,
} from "@/server/auth/session";

type NextFetchConfig = NextFetchRequestConfig;
type ServerRequestInit = RequestInit &
  Readonly<{
    next?: NextFetchConfig | undefined;
  }>;

type NormalizedRequestOptions = Readonly<{
  method: HttpMethod;
  auth: boolean;
  timeoutMs: number;
  cache: RequestCache;
  idempotencyKey?: string | undefined;
  next?: NextFetchConfig | undefined;
}>;

type CloudflareFetchServiceBinding = Readonly<{
  fetch: (request: Request) => Promise<Response>;
}>;

type CloudflareRuntimeEnv = Readonly<{
  ERP_EDGE?: unknown;
}>;

type ErpEdgeBindingStatus =
  "available" | "context_unavailable" | "missing" | "invalid";

type ErpEdgeBindingResolution = Readonly<{
  binding: CloudflareFetchServiceBinding | null;
  status: ErpEdgeBindingStatus;
  contextErrorName?: string | undefined;
  contextErrorMessage?: string | undefined;
}>;

export type ServerApiOptions<TData> = Readonly<{
  method?: HttpMethod | undefined;
  body?: unknown;
  schema: ZodType<TData>;
  auth?: boolean | undefined;
  timeoutMs?: number | undefined;
  cache?: RequestCache | undefined;
  next?: NextFetchConfig | undefined;
  idempotencyKey?: string | undefined;
  accessToken?: string | undefined;
  refreshOnUnauthorized?: boolean | undefined;
  signal?: AbortSignal | undefined;
  requestId?: string | undefined;
  correlationId?: string | undefined;
  actorContext?: ServerActorContextHeaders | undefined;
}>;

export type ServerApiEnvelopeOptions<TData, TMeta> = ServerApiOptions<TData> &
  Readonly<{
    metaSchema: ZodType<TMeta>;
  }>;

const HTTP_METHOD_VALUES = [
  HTTP_METHODS.GET,
  HTTP_METHODS.POST,
  HTTP_METHODS.PUT,
  HTTP_METHODS.PATCH,
  HTTP_METHODS.DELETE,
  HTTP_METHODS.HEAD,
] as const;

const IDEMPOTENT_METHODS = new Set<HttpMethod>([
  HTTP_METHODS.GET,
  HTTP_METHODS.HEAD,
]);

const BODYLESS_METHODS = new Set<HttpMethod>([
  HTTP_METHODS.GET,
  HTTP_METHODS.HEAD,
]);

const REQUEST_CACHE_NO_STORE = CACHE_CONTROL.NO_STORE;
const EDGE_REDIRECT_MODE = "manual" satisfies RequestRedirect;
const MAX_JSON_BODY_BYTES = 1 * 1024 * 1024;
const ACCESS_TOKEN_EXPIRY_SKEW_SECONDS = 30;
const MAX_API_PATH_LENGTH = 2_048;
const CONTROL_CHARACTER_MAX_CODE = 0x1f;
const DELETE_CHARACTER_CODE = 0x7f;
const MAX_DIAGNOSTIC_TEXT_LENGTH = 512;
const MAX_REFRESH_SINGLE_FLIGHTS = 128;
const REQUIRE_ERP_EDGE_SERVICE_BINDING =
  API_CONFIG.appEnv === "production" || API_CONFIG.appEnv === "staging";

const UNSAFE_ENCODED_PATH_PATTERN = /%(?:00|2e|2f|5c)/iu;

const httpMethodSchema = z.enum(HTTP_METHOD_VALUES);
const timeoutMsSchema = z.number().int().min(1_000).max(120_000);
const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9:_./@-]+$/u);

const apiBaseUrlSchema = z.string().trim().min(1).max(2_048).pipe(z.url());

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCloudflareFetchServiceBinding(
  value: unknown,
): value is CloudflareFetchServiceBinding {
  return (
    typeof value === "object" &&
    value !== null &&
    "fetch" in value &&
    typeof value.fetch === "function"
  );
}

function replaceControlCharacters(value: string): string {
  let output = "";
  let changed = false;

  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);

    if (
      codePoint <= CONTROL_CHARACTER_MAX_CODE ||
      codePoint === DELETE_CHARACTER_CODE
    ) {
      output += " ";
      changed = true;
      continue;
    }

    output += value.charAt(index);
  }

  return changed ? output : value;
}

function normalizeDiagnosticText(value: string, fallback: string): string {
  const normalized = replaceControlCharacters(value)
    .replace(/\s+/gu, " ")
    .trim();
  const safeValue = normalized.length > 0 ? normalized : fallback;

  return safeValue.length <= MAX_DIAGNOSTIC_TEXT_LENGTH
    ? safeValue
    : `${safeValue.slice(0, MAX_DIAGNOSTIC_TEXT_LENGTH - 1).trimEnd()}…`;
}

function diagnosticErrorName(error: unknown): string {
  if (error instanceof Error) {
    return normalizeDiagnosticText(error.name, "Error");
  }

  if (isRecord(error) && typeof error["name"] === "string") {
    return normalizeDiagnosticText(error["name"], "Error");
  }

  return "UnknownError";
}

function diagnosticErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return normalizeDiagnosticText(error.message, "No error message.");
  }

  if (isRecord(error) && typeof error["message"] === "string") {
    return normalizeDiagnosticText(error["message"], "No error message.");
  }

  return "No error message.";
}

function readDiagnosticHeader(
  init: ServerRequestInit,
  name: string,
): string | null {
  try {
    return new Headers(init.headers).get(name);
  } catch {
    return null;
  }
}

function readDiagnosticUrlParts(
  url: string,
): Readonly<{ origin: string; pathname: string }> {
  try {
    const parsed = new URL(url);

    return {
      origin: parsed.origin,
      pathname: parsed.pathname,
    };
  } catch {
    return {
      origin: "invalid",
      pathname: "invalid",
    };
  }
}

function resolveErpEdgeServiceBinding(): ErpEdgeBindingResolution {
  try {
    const context = getCloudflareContext();
    const env = context.env as CloudflareRuntimeEnv;
    const binding = env.ERP_EDGE;

    if (binding === undefined) {
      return {
        binding: null,
        status: "missing",
      };
    }

    if (!isCloudflareFetchServiceBinding(binding)) {
      return {
        binding: null,
        status: "invalid",
      };
    }

    return {
      binding,
      status: "available",
    };
  } catch (error: unknown) {
    return {
      binding: null,
      status: "context_unavailable",
      contextErrorName: diagnosticErrorName(error),
      contextErrorMessage: diagnosticErrorMessage(error),
    };
  }
}

function toCloudflareRedirectMode(
  value: RequestRedirect | undefined,
): RequestRedirect | undefined {
  return value === "error" ? EDGE_REDIRECT_MODE : value;
}

function toServiceBindingRequest(
  url: string,
  init: ServerRequestInit,
): Request {
  const requestInit: RequestInit = {
    headers: new Headers(init.headers),
  };

  if (init.method !== undefined) {
    requestInit.method = init.method;
  }

  if (init.body !== undefined && init.body !== null) {
    requestInit.body = init.body;
  }

  const redirect = toCloudflareRedirectMode(init.redirect);

  if (redirect !== undefined) {
    requestInit.redirect = redirect;
  }

  if (init.signal !== undefined) {
    requestInit.signal = init.signal;
  }

  return new Request(url, requestInit);
}

function toCloudflareFetchInit(init: ServerRequestInit): ServerRequestInit {
  const redirect = toCloudflareRedirectMode(init.redirect);

  return {
    ...init,
    ...(redirect !== undefined ? { redirect } : {}),
  };
}

async function dispatchEdgeRequest(
  url: string,
  init: ServerRequestInit,
): Promise<Response> {
  const target = readDiagnosticUrlParts(url);
  const requestId = readDiagnosticHeader(init, HDR.REQUEST_ID);
  const correlationId = readDiagnosticHeader(init, HDR.CORRELATION_ID);
  const method = init.method ?? HTTP_METHODS.GET;

  const requestLogFields = {
    operation: "erp_edge_dispatch",
    method,
    requestId,
    correlationId,
    targetOrigin: target.origin,
    targetPathname: target.pathname,
    appEnvironment: API_CONFIG.appEnv,
  };

  if (!REQUIRE_ERP_EDGE_SERVICE_BINDING) {
    logger.debug("erp_edge_public_fetch_selected", {
      ...requestLogFields,
      bindingStatus: "ignored_for_environment",
      dispatchTarget: "public_fetch",
    });

    try {
      return await fetch(url, toCloudflareFetchInit(init));
    } catch (error: unknown) {
      logger.error("erp_edge_public_fetch_dispatch_failed", {
        ...requestLogFields,
        bindingStatus: "ignored_for_environment",
        dispatchTarget: "public_fetch",
        errorName: diagnosticErrorName(error),
        errorMessage: diagnosticErrorMessage(error),
      });

      throw error;
    }
  }

  const resolution = resolveErpEdgeServiceBinding();
  const bindingLogFields = {
    ...requestLogFields,
    bindingStatus: resolution.status,
    contextErrorName: resolution.contextErrorName,
    contextErrorMessage: resolution.contextErrorMessage,
  };

  if (resolution.binding === null) {
    logger.error("erp_edge_service_binding_required", {
      ...bindingLogFields,
      dispatchTarget: "none",
    });

    throw new ApiHttpError({
      message: "ERP edge service binding is unavailable.",
      status: HTTP_STATUS.SERVICE_UNAVAILABLE,
      code: "erp_edge_binding_unavailable",
    });
  }

  try {
    return await resolution.binding.fetch(toServiceBindingRequest(url, init));
  } catch (error: unknown) {
    logger.error("erp_edge_service_binding_dispatch_failed", {
      ...bindingLogFields,
      dispatchTarget: "service_binding",
      errorName: diagnosticErrorName(error),
      errorMessage: diagnosticErrorMessage(error),
    });

    throw error;
  }
}

const nextFetchTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .regex(/^[A-Za-z0-9_.:/@-]+$/u);

const nextFetchConfigSchema = z
  .object({
    revalidate: z
      .union([z.number().int().min(0).max(86_400), z.literal(false)])
      .optional(),
    tags: z.array(nextFetchTagSchema).max(32).optional(),
  })
  .strict();

function containsPathControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);

    if (
      codePoint <= CONTROL_CHARACTER_MAX_CODE ||
      codePoint === DELETE_CHARACTER_CODE
    ) {
      return true;
    }
  }

  return false;
}

function pathWithoutQuery(value: string): string {
  return value.split(/[?#]/u, 1)[0] ?? value;
}

function parseApiPath(path: string): string {
  const value = path.trim();
  const pathname = pathWithoutQuery(value);

  const valid =
    value.length > 0 &&
    value.length <= MAX_API_PATH_LENGTH &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !containsPathControlCharacter(value) &&
    !UNSAFE_ENCODED_PATH_PATTERN.test(value) &&
    !pathname.split("/").includes("..") &&
    SERVER_API_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) &&
    !BLOCKED_PUBLIC_BACKEND_PATHS.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

  if (!valid) {
    throw new ApiHttpError({
      message: "Invalid API path.",
      status: HTTP_STATUS.BAD_REQUEST,
      code: "invalid_api_path",
    });
  }

  return value;
}

export function buildServerEdgeUrl(path: string): string {
  const parsedBaseUrl = apiBaseUrlSchema.parse(API_CONFIG.baseUrl);
  const parsedBaseOrigin = new URL(parsedBaseUrl).origin;
  const url = new URL(parseApiPath(path), parsedBaseUrl);

  if (url.origin !== parsedBaseOrigin) {
    throw new ApiHttpError({
      message: "Invalid API URL.",
      status: HTTP_STATUS.BAD_REQUEST,
      code: "invalid_api_url",
    });
  }

  return url.toString();
}

function parseMethod(method: HttpMethod | undefined): HttpMethod {
  return httpMethodSchema.parse(method ?? HTTP_METHODS.GET);
}

function normalizeNextFetchConfig(
  value: NextFetchConfig | undefined,
): NextFetchConfig | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = nextFetchConfigSchema.parse(value);
  const normalized: NextFetchConfig = {};

  if (parsed.revalidate !== undefined) {
    normalized.revalidate = parsed.revalidate;
  }

  if (parsed.tags !== undefined) {
    normalized.tags = parsed.tags;
  }

  return normalized;
}

function normalizeRequestIdempotencyKey(
  method: HttpMethod,
  value: string | undefined,
): string | undefined {
  if (IDEMPOTENT_METHODS.has(method)) {
    return undefined;
  }

  return idempotencyKeySchema.parse(value ?? crypto.randomUUID());
}

function normalizeOptions<TData>(
  options: ServerApiOptions<TData>,
): NormalizedRequestOptions {
  const method = parseMethod(options.method);
  const next = normalizeNextFetchConfig(options.next);
  const idempotencyKey = normalizeRequestIdempotencyKey(
    method,
    options.idempotencyKey,
  );

  return {
    method,
    auth: options.auth ?? true,
    timeoutMs: timeoutMsSchema.parse(options.timeoutMs ?? API_CONFIG.timeoutMs),
    cache: options.cache ?? REQUEST_CACHE_NO_STORE,
    ...(idempotencyKey !== undefined ? { idempotencyKey } : {}),
    ...(next !== undefined ? { next } : {}),
  };
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function serializeBody(method: HttpMethod, body: unknown): string | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (BODYLESS_METHODS.has(method)) {
    throw new ApiHttpError({
      message: "Request body is not allowed for this HTTP method.",
      status: HTTP_STATUS.BAD_REQUEST,
      code: "request_body_not_allowed",
    });
  }

  const serializedBody: unknown = JSON.stringify(body);

  if (typeof serializedBody !== "string") {
    throw new ApiHttpError({
      message: "Request body is not JSON serializable.",
      status: HTTP_STATUS.BAD_REQUEST,
      code: "invalid_request_body",
    });
  }

  if (byteLength(serializedBody) > MAX_JSON_BODY_BYTES) {
    throw new ApiHttpError({
      message: "Request body exceeds maximum allowed size.",
      status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
      code: "payload_too_large",
    });
  }

  return serializedBody;
}

async function attachAuthHeader(
  outboundHeaders: Headers,
  options: Readonly<{
    auth: boolean;
    accessToken?: string | undefined;
    refreshOnUnauthorized?: boolean | undefined;
  }>,
): Promise<boolean> {
  if (!options.auth) {
    return false;
  }

  const explicitToken = options.accessToken;

  if (explicitToken !== undefined) {
    const token = jwtTokenSchema.parse(explicitToken);
    outboundHeaders.set(HDR.AUTHORIZATION, `Bearer ${token}`);
    return false;
  }

  const accessToken = await getServerAccessToken();

  if (
    accessToken !== null &&
    !isSessionTokenExpired(accessToken, ACCESS_TOKEN_EXPIRY_SKEW_SECONDS)
  ) {
    outboundHeaders.set(HDR.AUTHORIZATION, `Bearer ${accessToken}`);
    return false;
  }

  if (options.refreshOnUnauthorized === true) {
    const refreshed = await refreshServerAuthTokens();

    if (refreshed !== null) {
      outboundHeaders.set(
        HDR.AUTHORIZATION,
        `Bearer ${refreshed.access_token}`,
      );
      return true;
    }
  }

  return false;
}

const refreshSingleFlights = new Map<
  string,
  Promise<AuthBodyTokenResponse | null>
>();

async function refreshSingleFlightKey(
  refreshToken: string,
  deviceFingerprint: string | null,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      `${String(refreshToken.length)}:${refreshToken}:${deviceFingerprint ?? ""}`,
    ),
  );

  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

async function performServerAuthTokenRefresh(
  refreshToken: string,
  deviceFingerprint: string | null,
): Promise<AuthBodyTokenResponse | null> {
  const body = refreshTokenRequestSchema.parse({
    clientId: API_CONFIG.clientId,
    refreshToken,
    ...(deviceFingerprint === null ? {} : { deviceFingerprint }),
  });
  const timeout = withTimeoutSignal(undefined, API_CONFIG.timeoutMs);

  try {
    const response = await dispatchEdgeRequest(
      buildServerEdgeUrl(AUTH_ENDPOINTS.refresh),
      {
        method: HTTP_METHODS.POST,
        headers: await serverRequestContextHeaders({
          includeJsonContentType: true,
        }),
        body: JSON.stringify(body),
        cache: "no-store",
        redirect: EDGE_REDIRECT_MODE,
        signal: timeout.signal,
      },
    );
    const payload = await readJsonPayload(response);

    if (!response.ok) {
      if (
        response.status === HTTP_STATUS.UNAUTHORIZED ||
        response.status === HTTP_STATUS.FORBIDDEN
      ) {
        return null;
      }

      throwForHttpError(response, payload);
    }

    return unwrapApiPayload(payload, authBodyTokenResponseSchema);
  } finally {
    timeout.cleanup();
  }
}

async function refreshServerAuthTokens(): Promise<AuthBodyTokenResponse | null> {
  const [refreshToken, deviceFingerprint] = await Promise.all([
    getServerRefreshToken(),
    getServerDeviceFingerprint(),
  ]);

  if (refreshToken === null || !hasSessionTokenType(refreshToken, "refresh")) {
    return null;
  }

  const singleFlightKey = await refreshSingleFlightKey(
    refreshToken,
    deviceFingerprint,
  );
  const existingFlight = refreshSingleFlights.get(singleFlightKey);

  let tokens: AuthBodyTokenResponse | null;

  if (existingFlight !== undefined) {
    tokens = await existingFlight;
  } else {
    const refreshOperation = performServerAuthTokenRefresh(
      refreshToken,
      deviceFingerprint,
    );

    if (refreshSingleFlights.size >= MAX_REFRESH_SINGLE_FLIGHTS) {
      tokens = await refreshOperation;
    } else {
      refreshSingleFlights.set(singleFlightKey, refreshOperation);

      try {
        tokens = await refreshOperation;
      } finally {
        if (refreshSingleFlights.get(singleFlightKey) === refreshOperation) {
          refreshSingleFlights.delete(singleFlightKey);
        }
      }
    }
  }

  if (tokens !== null) {
    await setServerAuthTokens(tokens, { deviceFingerprint });
  }

  return tokens;
}

export const refreshServerAuthTokensForMutableBoundary =
  refreshServerAuthTokens;

function withTimeoutSignal(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): { readonly signal: AbortSignal; readonly cleanup: () => void } {
  const controller = new AbortController();

  const timeout = setTimeout((): void => {
    controller.abort(new DOMException("Timeout", "AbortError"));
  }, timeoutMs);

  if (signal !== undefined) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener(
        "abort",
        (): void => {
          controller.abort(signal.reason);
        },
        { once: true },
      );
    }
  }

  return {
    signal: controller.signal,
    cleanup: (): void => {
      clearTimeout(timeout);
    },
  };
}

async function fetchOnceEnvelope<TData, TMeta = undefined>(
  path: string,
  options: ServerApiOptions<TData>,
  normalized: NormalizedRequestOptions,
  metaSchema?: ZodType<TMeta>,
): Promise<ApiEnvelopeResult<TData, TMeta>> {
  const body = serializeBody(normalized.method, options.body);

  const outboundHeaders = await serverRequestContextHeaders({
    includeJsonContentType: body !== undefined,
    requestId: options.requestId,
    correlationId: options.correlationId,
    actorContext: options.actorContext,
  });

  if (normalized.idempotencyKey !== undefined) {
    outboundHeaders.set(HDR.IDEMPOTENCY_KEY, normalized.idempotencyKey);
  }

  const refreshedBeforeRequest = await attachAuthHeader(outboundHeaders, {
    auth: normalized.auth,
    accessToken: options.accessToken,
    refreshOnUnauthorized: options.refreshOnUnauthorized,
  });

  const timeout = withTimeoutSignal(options.signal, normalized.timeoutMs);

  const requestInit: ServerRequestInit = {
    method: normalized.method,
    headers: outboundHeaders,
    ...(body !== undefined ? { body } : {}),
    cache: normalized.cache,
    redirect: EDGE_REDIRECT_MODE,
    signal: timeout.signal,
    ...(normalized.next !== undefined ? { next: normalized.next } : {}),
  };

  try {
    const response = await dispatchEdgeRequest(
      buildServerEdgeUrl(path),
      requestInit,
    );
    const payload = await readJsonPayload(response);

    if (!response.ok) {
      if (
        response.status === HTTP_STATUS.UNAUTHORIZED &&
        normalized.auth &&
        options.refreshOnUnauthorized === true &&
        options.accessToken === undefined &&
        !refreshedBeforeRequest
      ) {
        const refreshed = await refreshServerAuthTokens();

        if (refreshed !== null) {
          return await fetchOnceEnvelope(
            path,
            {
              ...options,
              accessToken: refreshed.access_token,
              refreshOnUnauthorized: false,
            },
            normalized,
            metaSchema,
          );
        }

        await clearServerAuthCookies();
      }

      if (
        response.status === HTTP_STATUS.UNAUTHORIZED &&
        normalized.auth &&
        refreshedBeforeRequest
      ) {
        await clearServerAuthCookies();
      }

      throwForHttpError(response, payload);
    }

    return unwrapApiEnvelope(payload, options.schema, metaSchema);
  } finally {
    timeout.cleanup();
  }
}

export async function serverEdgeFetchEnvelope<TData, TMeta>(
  path: string,
  options: ServerApiEnvelopeOptions<TData, TMeta>,
): Promise<ApiEnvelopeResult<TData, TMeta>> {
  return await fetchOnceEnvelope(
    path,
    options,
    normalizeOptions(options),
    options.metaSchema,
  );
}

export async function serverEdgeFetch<TData>(
  path: string,
  options: ServerApiOptions<TData>,
): Promise<TData> {
  return (await fetchOnceEnvelope(path, options, normalizeOptions(options)))
    .data;
}

export const serverApiClient = {
  request: serverEdgeFetch,

  get: <TData>(
    path: string,
    schema: ZodType<TData>,
    options?: Omit<ServerApiOptions<TData>, "method" | "schema">,
  ) =>
    serverEdgeFetch(path, {
      ...(options ?? {}),
      method: HTTP_METHODS.GET,
      schema,
    }),

  post: <TData>(
    path: string,
    body: unknown,
    schema: ZodType<TData>,
    options?: Omit<ServerApiOptions<TData>, "method" | "body" | "schema">,
  ) =>
    serverEdgeFetch(path, {
      ...(options ?? {}),
      method: HTTP_METHODS.POST,
      body,
      schema,
    }),

  put: <TData>(
    path: string,
    body: unknown,
    schema: ZodType<TData>,
    options?: Omit<ServerApiOptions<TData>, "method" | "body" | "schema">,
  ) =>
    serverEdgeFetch(path, {
      ...(options ?? {}),
      method: HTTP_METHODS.PUT,
      body,
      schema,
    }),

  patch: <TData>(
    path: string,
    body: unknown,
    schema: ZodType<TData>,
    options?: Omit<ServerApiOptions<TData>, "method" | "body" | "schema">,
  ) =>
    serverEdgeFetch(path, {
      ...(options ?? {}),
      method: HTTP_METHODS.PATCH,
      body,
      schema,
    }),

  delete: <TData>(
    path: string,
    schema: ZodType<TData>,
    options?: Omit<ServerApiOptions<TData>, "method" | "schema">,
  ) =>
    serverEdgeFetch(path, {
      ...(options ?? {}),
      method: HTTP_METHODS.DELETE,
      schema,
    }),
} as const;

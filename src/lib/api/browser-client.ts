// oz-next-app/src/lib/api/browser-client.ts
"use client";

import { z, type ZodType } from "zod";

import {
  readJsonPayload,
  throwForHttpError,
  unwrapApiEnvelope,
  type ApiEnvelopeResult,
} from "@/lib/api/envelope";
import { ApiHttpError } from "@/lib/api/problem";
import {
  API_CONFIG,
  BLOCKED_PUBLIC_BACKEND_PATHS,
  BROWSER_API_ALLOWED_EXACT_PATHS,
  BROWSER_API_ALLOWED_PREFIXES,
  CT,
  HDR,
  HTTP_METHODS,
  HTTP_STATUS,
  SAFE_HTTP_METHODS,
  type HttpMethod,
} from "@/lib/api/http-contract";
import { NetworkError } from "@/lib/api/network-error";
import { logger } from "@/lib/observability/logger";
import { correlationId, requestId } from "@/lib/security/request-identifiers";

export type BrowserApiOptions<T> = Readonly<{
  method?: HttpMethod;
  body?: unknown;
  schema: ZodType<T>;
  auth?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
  idempotencyKey?: string;
  retry?: number;
  retryOnUnauthorized?: boolean;
}>;

type RefreshHandler = () => Promise<boolean>;

const IDEMPOTENT_METHODS = new Set<HttpMethod>(SAFE_HTTP_METHODS);
const BODYLESS_METHODS = new Set<HttpMethod>([
  HTTP_METHODS.GET,
  HTTP_METHODS.HEAD,
]);
const MAX_RETRY_ATTEMPTS = 2;
const BASE_RETRY_DELAY_MS = 120;
const MAX_JSON_BODY_BYTES = 1 * 1024 * 1024;
const MAX_API_PATH_LENGTH = 2_048;
const MAX_RETRY_AFTER_SECONDS = 30;
const RETRY_JITTER_MS = 40;
const UNSAFE_ENCODED_PATH_PATTERN = /%(?:00|2e|2f|5c)/iu;
const SAFE_IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9:_./@-]{16,128}$/u;
const httpMethodSchema = z.enum([
  HTTP_METHODS.GET,
  HTTP_METHODS.POST,
  HTTP_METHODS.PUT,
  HTTP_METHODS.PATCH,
  HTTP_METHODS.DELETE,
  HTTP_METHODS.HEAD,
]);

let refreshHandler: RefreshHandler | null = null;

export function registerUnauthorizedRefreshHandler(
  handler: RefreshHandler,
): () => void {
  refreshHandler = handler;

  return (): void => {
    if (refreshHandler === handler) {
      refreshHandler = null;
    }
  };
}

function pathWithoutQuery(value: string): string {
  const separatorIndex = value.search(/[?#]/u);

  return separatorIndex === -1 ? value : value.slice(0, separatorIndex);
}

function hasUnsafeControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code === 0 || code === 10 || code === 13) {
      return true;
    }
  }

  return false;
}

function parseHttpMethod(method: HttpMethod | undefined): HttpMethod {
  return httpMethodSchema.parse(method ?? HTTP_METHODS.GET);
}

function isAllowedBrowserApiPath(pathname: string): boolean {
  if (BROWSER_API_ALLOWED_EXACT_PATHS.some((path) => pathname === path)) {
    return true;
  }

  return BROWSER_API_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isBlockedPublicBackendPath(pathname: string): boolean {
  return BLOCKED_PUBLIC_BACKEND_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function parseApiPath(path: string): string {
  const value = path.trim();
  const pathname = pathWithoutQuery(value);
  const isValid =
    value.length > 0 &&
    value.length <= MAX_API_PATH_LENGTH &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !hasUnsafeControlCharacter(value) &&
    !UNSAFE_ENCODED_PATH_PATTERN.test(value) &&
    !pathname.split("/").includes("..") &&
    isAllowedBrowserApiPath(pathname) &&
    !isBlockedPublicBackendPath(pathname);

  if (!isValid) {
    throw new ApiHttpError({
      message: "Invalid API path.",
      status: HTTP_STATUS.BAD_REQUEST,
      code: "invalid_api_path",
    });
  }

  return value;
}

export function buildEdgeUrl(path: string): string {
  const parsedPath = parseApiPath(path);
  const baseUrl = new URL(API_CONFIG.baseUrl);
  const url = new URL(parsedPath, baseUrl);

  if (url.origin !== baseUrl.origin) {
    throw new ApiHttpError({
      message: "Invalid API URL.",
      status: HTTP_STATUS.BAD_REQUEST,
      code: "invalid_api_url",
    });
  }

  return url.toString();
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

  const json = JSON.stringify(body);

  if (typeof json !== "string") {
    throw new ApiHttpError({
      message: "Request body is not JSON serializable.",
      status: HTTP_STATUS.BAD_REQUEST,
      code: "invalid_request_body",
    });
  }

  if (byteLength(json) > MAX_JSON_BODY_BYTES) {
    throw new ApiHttpError({
      message: "Request body exceeds maximum allowed size.",
      status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
      code: "payload_too_large",
    });
  }

  return json;
}

function normalizeIdempotencyKey(value: string | undefined): string {
  if (value === undefined) {
    return requestId("idem");
  }

  const normalized = value.trim();

  if (!SAFE_IDEMPOTENCY_KEY_PATTERN.test(normalized)) {
    throw new ApiHttpError({
      message: "Invalid idempotency key.",
      status: HTTP_STATUS.BAD_REQUEST,
      code: "invalid_idempotency_key",
    });
  }

  return normalized;
}

function buildHeaders(
  input: Readonly<{
    method: HttpMethod;
    hasBody: boolean;
    idempotencyKey?: string | undefined;
  }>,
): Headers {
  const headers = new Headers();

  headers.set(HDR.ACCEPT, CT.JSON);
  headers.set(HDR.REQUEST_ID, requestId("web"));
  headers.set(HDR.CORRELATION_ID, correlationId("corr"));

  if (input.hasBody) {
    headers.set(HDR.CONTENT_TYPE, CT.JSON);
  }

  if (!IDEMPOTENT_METHODS.has(input.method)) {
    headers.set(
      HDR.IDEMPOTENCY_KEY,
      normalizeIdempotencyKey(input.idempotencyKey),
    );
  }

  return headers;
}

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

function isTransientStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 425 ||
    status === HTTP_STATUS.TOO_MANY_REQUESTS ||
    status >= 500
  );
}

function retryDelay(attempt: number, retryAfterSeconds?: number): number {
  if (retryAfterSeconds !== undefined) {
    return (
      Math.min(Math.max(retryAfterSeconds, 0), MAX_RETRY_AFTER_SECONDS) * 1_000
    );
  }

  return (
    BASE_RETRY_DELAY_MS * 2 ** attempt +
    Math.floor(Math.random() * RETRY_JITTER_MS)
  );
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);

    signal?.addEventListener(
      "abort",
      (): void => {
        clearTimeout(timeout);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

async function execute<T>(
  path: string,
  options: BrowserApiOptions<T>,
  retryingAfterRefresh: boolean,
): Promise<ApiEnvelopeResult<T>> {
  const method = parseHttpMethod(options.method);
  const auth = options.auth ?? false;
  const timeout = withTimeoutSignal(
    options.signal,
    options.timeoutMs ?? API_CONFIG.timeoutMs,
  );
  const body = serializeBody(method, options.body);

  try {
    const response = await fetch(buildEdgeUrl(path), {
      method,
      headers: buildHeaders({
        method,
        hasBody: body !== undefined,
        idempotencyKey: options.idempotencyKey,
      }),
      ...(body !== undefined ? { body } : {}),
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: timeout.signal,
    });
    const payload = await readJsonPayload(response);

    if (!response.ok) {
      if (
        response.status === HTTP_STATUS.UNAUTHORIZED &&
        auth &&
        !retryingAfterRefresh &&
        options.retryOnUnauthorized !== false &&
        refreshHandler !== null
      ) {
        const refreshed = await refreshHandler();

        if (refreshed) {
          return await execute(path, options, true);
        }
      }

      throwForHttpError(response, payload);
    }

    return unwrapApiEnvelope(payload, options.schema);
  } catch (error) {
    if (error instanceof ApiHttpError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiHttpError({
        message: "API request timed out or was aborted.",
        status: HTTP_STATUS.GATEWAY_TIMEOUT,
        code: "request_timeout",
        cause: error,
      });
    }

    throw new NetworkError("API request failed.", "network_error", error);
  } finally {
    timeout.cleanup();
  }
}

export async function edgeFetchEnvelope<T>(
  path: string,
  options: BrowserApiOptions<T>,
): Promise<ApiEnvelopeResult<T>> {
  const method = parseHttpMethod(options.method);
  const normalizedOptions: BrowserApiOptions<T> = IDEMPOTENT_METHODS.has(method)
    ? { ...options, method }
    : {
        ...options,
        method,
        idempotencyKey: normalizeIdempotencyKey(options.idempotencyKey),
      };
  const maxAttempts = IDEMPOTENT_METHODS.has(method)
    ? Math.min(Math.max(options.retry ?? 0, 0), MAX_RETRY_ATTEMPTS)
    : 0;
  let attempt = 0;

  for (;;) {
    try {
      return await execute(path, normalizedOptions, false);
    } catch (error) {
      if (
        !(error instanceof ApiHttpError) ||
        !isTransientStatus(error.status) ||
        attempt >= maxAttempts ||
        options.signal?.aborted === true
      ) {
        throw error;
      }

      logger.warn("api.client.retry", {
        path: pathWithoutQuery(path),
        status: error.status,
        code: error.code,
        requestId: error.requestId ?? null,
        attempt,
      });
      await sleep(retryDelay(attempt, error.retryAfterSeconds), options.signal);
      attempt += 1;
    }
  }
}

export async function edgeFetch<T>(
  path: string,
  options: BrowserApiOptions<T>,
): Promise<T> {
  return (await edgeFetchEnvelope(path, options)).data;
}

export const apiClient = {
  request: edgeFetch,
  get: <T>(
    path: string,
    schema: ZodType<T>,
    options?: Omit<BrowserApiOptions<T>, "method" | "schema">,
  ): Promise<T> =>
    edgeFetch(path, { ...(options ?? {}), method: HTTP_METHODS.GET, schema }),
  post: <T>(
    path: string,
    body: unknown,
    schema: ZodType<T>,
    options?: Omit<BrowserApiOptions<T>, "method" | "body" | "schema">,
  ): Promise<T> =>
    edgeFetch(path, {
      ...(options ?? {}),
      method: HTTP_METHODS.POST,
      body,
      schema,
    }),
  put: <T>(
    path: string,
    body: unknown,
    schema: ZodType<T>,
    options?: Omit<BrowserApiOptions<T>, "method" | "body" | "schema">,
  ): Promise<T> =>
    edgeFetch(path, {
      ...(options ?? {}),
      method: HTTP_METHODS.PUT,
      body,
      schema,
    }),
  patch: <T>(
    path: string,
    body: unknown,
    schema: ZodType<T>,
    options?: Omit<BrowserApiOptions<T>, "method" | "body" | "schema">,
  ): Promise<T> =>
    edgeFetch(path, {
      ...(options ?? {}),
      method: HTTP_METHODS.PATCH,
      body,
      schema,
    }),
  delete: <T>(
    path: string,
    body: unknown,
    schema: ZodType<T>,
    options?: Omit<BrowserApiOptions<T>, "method" | "body" | "schema">,
  ): Promise<T> =>
    edgeFetch(path, {
      ...(options ?? {}),
      method: HTTP_METHODS.DELETE,
      body,
      schema,
    }),
} as const;

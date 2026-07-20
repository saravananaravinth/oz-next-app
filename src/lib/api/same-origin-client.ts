// oz-next-app/src/lib/api/same-origin-client.ts
"use client";

import { z, type ZodType } from "zod";

import {
  readJsonPayload,
  throwForHttpError,
  validateApiPayload,
} from "@/lib/api/envelope";
import {
  BROWSER_SAME_ORIGIN_ALLOWED_EXACT_PATHS,
  CT,
  HDR,
  HTTP_METHODS,
  HTTP_STATUS,
  type HttpMethod,
} from "@/lib/api/http-contract";
import { ApiHttpError } from "@/lib/api/problem";
import { NetworkError } from "@/lib/api/network-error";

export type SameOriginApiOptions<T> = Readonly<{
  method?: HttpMethod;
  body?: unknown;
  schema: ZodType<T>;
  timeoutMs?: number;
  signal?: AbortSignal;
}>;

const MAX_SAME_ORIGIN_PATH_LENGTH = 2_048;
const MAX_REQUEST_BODY_BYTES = 1 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;
const UNSAFE_ENCODED_PATH_PATTERN = /%(?:00|2e|2f|5c)/iu;
const httpMethodSchema = z.enum([
  HTTP_METHODS.GET,
  HTTP_METHODS.POST,
  HTTP_METHODS.PUT,
  HTTP_METHODS.PATCH,
  HTTP_METHODS.DELETE,
  HTTP_METHODS.HEAD,
]);

function hasUnsafeControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code === 0 || code === 10 || code === 13) {
      return true;
    }
  }

  return false;
}

function parseSameOriginPath(path: string): string {
  const value = path.trim();
  const rawPathname = value.split(/[?#]/u, 1)[0] ?? value;
  const rawPathSegments = rawPathname.split("/");
  const isBasicShapeValid =
    value.length > 0 &&
    value.length <= MAX_SAME_ORIGIN_PATH_LENGTH &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.includes("#") &&
    !hasUnsafeControlCharacter(value) &&
    !UNSAFE_ENCODED_PATH_PATTERN.test(value) &&
    !rawPathSegments.includes(".") &&
    !rawPathSegments.includes("..");

  if (!isBasicShapeValid) {
    throw new ApiHttpError({
      message: "Invalid same-origin API path.",
      status: HTTP_STATUS.BAD_REQUEST,
      code: "invalid_same_origin_api_path",
    });
  }

  const url = new URL(value, "https://same-origin.invalid");
  const pathname = url.pathname;
  const isAllowed =
    !pathname.split("/").includes("..") &&
    BROWSER_SAME_ORIGIN_ALLOWED_EXACT_PATHS.some(
      (allowedPath) => allowedPath === pathname,
    );

  if (!isAllowed) {
    throw new ApiHttpError({
      message: "Same-origin API path is not allowed.",
      status: HTTP_STATUS.FORBIDDEN,
      code: "same_origin_api_path_not_allowed",
    });
  }

  return `${pathname}${url.search}`;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function serializeBody(method: HttpMethod, body: unknown): string | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (method === HTTP_METHODS.GET || method === HTTP_METHODS.HEAD) {
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

  if (byteLength(json) > MAX_REQUEST_BODY_BYTES) {
    throw new ApiHttpError({
      message: "Request body exceeds maximum allowed size.",
      status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
      code: "payload_too_large",
    });
  }

  return json;
}

function withTimeoutSignal(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Readonly<{ signal: AbortSignal; cleanup: () => void }> {
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

export async function sameOriginFetch<T>(
  path: string,
  options: SameOriginApiOptions<T>,
): Promise<T> {
  const parsedPath = parseSameOriginPath(path);
  const method = httpMethodSchema.parse(options.method ?? HTTP_METHODS.GET);
  const body = serializeBody(method, options.body);
  const timeout = withTimeoutSignal(
    options.signal,
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  const headers = new Headers({ [HDR.ACCEPT]: CT.JSON });

  if (body !== undefined) {
    headers.set(HDR.CONTENT_TYPE, CT.JSON);
  }

  try {
    const response = await fetch(parsedPath, {
      method,
      headers,
      ...(body !== undefined ? { body } : {}),
      cache: "no-store",
      credentials: "include",
      redirect: "error",
      signal: timeout.signal,
    });
    const payload = await readJsonPayload(response);

    if (!response.ok) {
      throwForHttpError(response, payload);
    }

    return validateApiPayload(payload, options.schema);
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

    throw new NetworkError(
      "Same-origin API request failed.",
      "network_error",
      error,
    );
  } finally {
    timeout.cleanup();
  }
}

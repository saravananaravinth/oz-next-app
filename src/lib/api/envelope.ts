// oz-next-app/src/lib/api/envelope.ts
import { z, type ZodType } from "zod";

import {
  ApiHttpError,
  problemDetailsSchema,
  type ProblemDetails,
  type RateLimitMetadata,
} from "@/lib/api/problem";
import { HDR, HTTP_STATUS } from "@/lib/api/http-contract";

const MAX_RESPONSE_BODY_BYTES = 10 * 1024 * 1024;
const MAX_VALIDATION_ISSUES = 8;
const MAX_RETRY_AFTER_SECONDS = 86_400;
const MAX_RATE_LIMIT_VALUE = 1_000_000_000;

const canonicalSuccessEnvelopeSchema = z
  .object({
    success: z.literal(true),
    data: z.unknown().optional(),
    request_id: z.string().trim().min(1).max(128),
    timestamp: z.string().trim().min(1).max(128),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const legacySuccessEnvelopeSchema = z
  .object({
    status: z.literal("success"),
    data: z.unknown().nullable().optional(),
    message: z.string().trim().optional(),
    request_id: z.string().trim().nullable().optional(),
    timestamp: z.string().trim().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .loose();

export type ApiEnvelopeResult<TData, TMeta = undefined> = Readonly<{
  data: TData;
  meta: TMeta;
  requestId: string | null;
  timestamp: string | null;
}>;

export async function readJsonPayload(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.trim().length === 0) {
    return null;
  }

  if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BODY_BYTES) {
    throw new ApiHttpError({
      message: "API response body is too large.",
      status: HTTP_STATUS.BAD_GATEWAY,
      code: "api_response_too_large",
    });
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new ApiHttpError({
      message: "API response is not valid JSON.",
      status: HTTP_STATUS.BAD_GATEWAY,
      code: "api_response_invalid_json",
      cause,
    });
  }
}

function validationDetails(
  error: z.ZodError,
): ReadonlyArray<{ readonly path: string; readonly message: string }> {
  return error.issues.slice(0, MAX_VALIDATION_ISSUES).map((issue) => ({
    path: issue.path.length === 0 ? "$" : issue.path.map(String).join("."),
    message: issue.message,
  }));
}

function parseWithSchema<T>(
  value: unknown,
  schema: ZodType<T>,
  code: string,
): T {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new ApiHttpError({
      message: "API response validation failed.",
      status: HTTP_STATUS.BAD_GATEWAY,
      code,
      details: validationDetails(parsed.error),
      cause: parsed.error,
    });
  }

  return parsed.data;
}

export function unwrapApiEnvelope<TData, TMeta = undefined>(
  payload: unknown,
  dataSchema: ZodType<TData>,
  metaSchema?: ZodType<TMeta>,
): ApiEnvelopeResult<TData, TMeta> {
  const canonical = canonicalSuccessEnvelopeSchema.safeParse(payload);

  if (canonical.success) {
    const data = parseWithSchema(
      canonical.data.data,
      dataSchema,
      "api_response_validation_failed",
    );
    const meta =
      metaSchema === undefined
        ? (undefined as TMeta)
        : parseWithSchema(
            canonical.data.meta,
            metaSchema,
            "api_response_metadata_validation_failed",
          );

    return {
      data,
      meta,
      requestId: canonical.data.request_id,
      timestamp: canonical.data.timestamp,
    };
  }

  const legacy = legacySuccessEnvelopeSchema.safeParse(payload);

  if (legacy.success) {
    const data = parseWithSchema(
      legacy.data.data,
      dataSchema,
      "api_response_validation_failed",
    );
    const meta =
      metaSchema === undefined
        ? (undefined as TMeta)
        : parseWithSchema(
            legacy.data.metadata,
            metaSchema,
            "api_response_metadata_validation_failed",
          );

    return {
      data,
      meta,
      requestId: legacy.data.request_id ?? null,
      timestamp: legacy.data.timestamp ?? null,
    };
  }

  return {
    data: parseWithSchema(
      payload,
      dataSchema,
      "api_response_validation_failed",
    ),
    meta:
      metaSchema === undefined
        ? (undefined as TMeta)
        : parseWithSchema(
            undefined,
            metaSchema,
            "api_response_metadata_validation_failed",
          ),
    requestId: null,
    timestamp: null,
  };
}

export function unwrapApiPayload<T>(payload: unknown, schema: ZodType<T>): T {
  return unwrapApiEnvelope(payload, schema).data;
}

export function validateApiPayload<T>(payload: unknown, schema: ZodType<T>): T {
  return parseWithSchema(payload, schema, "api_response_validation_failed");
}

function finiteHeaderInteger(value: string | null): number | undefined {
  if (value === null || !/^\d+$/u.test(value.trim())) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) &&
    parsed >= 0 &&
    parsed <= MAX_RATE_LIMIT_VALUE
    ? parsed
    : undefined;
}

function parseRetryAfterSeconds(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const normalized = value.trim();
  const deltaSeconds = finiteHeaderInteger(normalized);

  if (deltaSeconds !== undefined) {
    return Math.min(deltaSeconds, MAX_RETRY_AFTER_SECONDS);
  }

  const retryAtMs = Date.parse(normalized);

  if (!Number.isFinite(retryAtMs)) {
    return undefined;
  }

  return Math.min(
    Math.max(0, Math.ceil((retryAtMs - Date.now()) / 1_000)),
    MAX_RETRY_AFTER_SECONDS,
  );
}

function readRateLimitMetadata(
  response: Response,
): RateLimitMetadata | undefined {
  const scope = response.headers.get(HDR.RATE_LIMIT_SCOPE)?.trim();
  const limit = finiteHeaderInteger(response.headers.get(HDR.RATE_LIMIT_LIMIT));
  const remaining = finiteHeaderInteger(
    response.headers.get(HDR.RATE_LIMIT_REMAINING),
  );

  if (
    (scope === undefined || scope.length === 0) &&
    limit === undefined &&
    remaining === undefined
  ) {
    return undefined;
  }

  return {
    ...(scope !== undefined && scope.length > 0 ? { scope } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(remaining !== undefined ? { remaining } : {}),
  };
}

export function throwForHttpError(response: Response, payload: unknown): never {
  const retryAfterSeconds =
    parseRetryAfterSeconds(response.headers.get(HDR.RETRY_AFTER)) ??
    (() => {
      const parsed = problemDetailsSchema.safeParse(payload);
      return parsed.success ? parsed.data.retry_after : undefined;
    })();
  const rateLimit = readRateLimitMetadata(response);
  const parsed = problemDetailsSchema.safeParse(payload);

  if (parsed.success) {
    const problem = parsed.data;

    throw new ApiHttpError({
      message: problem.detail || problem.title,
      status: problem.status,
      code: String(problem.code).toLowerCase(),
      requestId: problem.request_id,
      problem,
      details: problem.invalid_params ?? problem.errors ?? problem.details,
      ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
      ...(rateLimit !== undefined ? { rateLimit } : {}),
    });
  }

  throw new ApiHttpError({
    message: response.statusText || "API request failed.",
    status: response.status,
    code: `http_${String(response.status)}`,
    ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
    ...(rateLimit !== undefined ? { rateLimit } : {}),
  });
}

function normalizedFailureCode(payload: unknown): string {
  const problem = problemDetailsSchema.safeParse(payload);

  if (problem.success) {
    return String(problem.data.code).toLowerCase();
  }

  if (typeof payload === "object" && payload !== null && "code" in payload) {
    return String(payload.code).toLowerCase();
  }

  return "";
}

function normalizedFailureText(payload: unknown): string {
  if (typeof payload === "string") {
    return payload.toLowerCase();
  }

  if (typeof payload === "object" && payload !== null) {
    try {
      return JSON.stringify(payload).toLowerCase();
    } catch {
      return "";
    }
  }

  return "";
}

export function isInvalidTokenFailure(payload: unknown): boolean {
  const code = normalizedFailureCode(payload);
  const text = normalizedFailureText(payload);

  return (
    code.includes("expired") ||
    code.includes("invalid_token") ||
    text.includes("jwt has expired")
  );
}

export function isMalformedAuthFailure(payload: unknown): boolean {
  const code = normalizedFailureCode(payload);
  const text = normalizedFailureText(payload);

  return (
    code.includes("malformed") ||
    code.includes("authorization") ||
    text.includes("bearer token is required")
  );
}

export type { ProblemDetails };

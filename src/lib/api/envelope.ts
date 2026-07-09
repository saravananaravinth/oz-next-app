// oz-next-app/src/lib/api/envelope.ts
import { z, type ZodType } from "zod";

import {
  ApiHttpError,
  problemDetailsSchema,
  type ProblemDetails,
} from "@/lib/api/problem";

const MAX_RESPONSE_BODY_BYTES = 10 * 1024 * 1024;
const MAX_VALIDATION_ISSUES = 8;

const canonicalSuccessEnvelopeSchema = z
  .object({
    success: z.literal(true),
    data: z.unknown().optional(),
    request_id: z.string().trim().min(1).max(128),
    timestamp: z.string().trim().min(1).max(128),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

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

export async function readJsonPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim().length === 0) return null;
  if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BODY_BYTES) {
    throw new ApiHttpError({
      message: "API response body is too large.",
      status: 502,
      code: "api_response_too_large",
    });
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new ApiHttpError({
      message: "API response is not valid JSON.",
      status: 502,
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

export function unwrapApiPayload<T>(payload: unknown, schema: ZodType<T>): T {
  const data = (() => {
    if (payload === null) {
      return undefined;
    }

    const canonical = canonicalSuccessEnvelopeSchema.safeParse(payload);
    if (canonical.success) {
      return canonical.data.data;
    }

    const legacy = legacySuccessEnvelopeSchema.safeParse(payload);
    if (legacy.success) {
      return legacy.data.data;
    }

    return payload;
  })();

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiHttpError({
      message: "API response validation failed.",
      status: 502,
      code: "api_response_validation_failed",
      details: validationDetails(parsed.error),
      cause: parsed.error,
    });
  }

  return parsed.data;
}

export function throwForHttpError(response: Response, payload: unknown): never {
  const parsed = problemDetailsSchema.safeParse(payload);
  if (parsed.success) {
    const problem = parsed.data;
    throw new ApiHttpError({
      message: problem.detail || problem.title,
      status: problem.status,
      code: String(problem.code).toLowerCase(),
      requestId: problem.request_id,
      problem,
      details: problem.errors ?? problem.details ?? problem.invalid_params,
      retryAfterSeconds: problem.retry_after,
    });
  }

  throw new ApiHttpError({
    message: response.statusText || "API request failed.",
    status: response.status,
    code: `http_${String(response.status)}`,
  });
}

function normalizedFailureCode(payload: unknown): string {
  const problem = problemDetailsSchema.safeParse(payload);
  if (problem.success) return String(problem.data.code).toLowerCase();
  if (typeof payload === "object" && payload !== null && "code" in payload)
    return String(payload.code).toLowerCase();
  return "";
}

function normalizedFailureText(payload: unknown): string {
  if (typeof payload === "string") return payload.toLowerCase();
  if (typeof payload === "object" && payload !== null)
    return JSON.stringify(payload).toLowerCase();
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

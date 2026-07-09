// oz-next-app/src/lib/api/problem.ts
import { z } from "zod";

const httpStatusSchema = z.number().int().min(100).max(599);
const problemCodeSchema = z.union([
  z.string().trim().min(1).max(160),
  z.number().int(),
]);
const safeProblemTextSchema = z.string().trim().max(4_096);
const safeReferenceSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_.:/@-]+$/u);

export const problemFieldErrorSchema = z
  .object({
    path: z.string().trim().min(1).max(512),
    message: z.string().trim().min(1).max(1_024),
  })
  .strict();

export const problemDetailsSchema = z
  .object({
    type: z.string().trim().min(1).max(2_048),
    title: z.string().trim().min(1).max(256),
    status: httpStatusSchema,
    detail: safeProblemTextSchema,
    code: problemCodeSchema,
    request_id: safeReferenceSchema,
    timestamp: z.string().trim().min(1).max(128),
    invalid_params: z.array(problemFieldErrorSchema).optional(),
    errors: z.unknown().optional(),
    details: z.unknown().optional(),
    instance: z.string().trim().max(2_048).optional(),
    trace: z.string().trim().min(1).max(256).optional(),
    trace_id: z.string().trim().min(1).max(256).optional(),
    retry_after: z.number().int().nonnegative().max(86_400).optional(),
  })
  .catchall(z.unknown());

export type ProblemFieldError = z.infer<typeof problemFieldErrorSchema>;
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

export type ApiHttpErrorInput = Readonly<{
  message: string;
  status: number;
  code: string;
  requestId?: string | undefined;
  problem?: ProblemDetails | undefined;
  details?: unknown;
  retryAfterSeconds?: number | undefined;
  cause?: unknown;
}>;

export class ApiHttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId: string | undefined;
  public readonly problem: ProblemDetails | undefined;
  public readonly details: unknown;
  public readonly retryAfterSeconds: number | undefined;

  public constructor(input: ApiHttpErrorInput) {
    super(
      input.message,
      input.cause === undefined ? undefined : { cause: input.cause },
    );
    this.name = "ApiHttpError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.problem = input.problem;
    this.details = input.details;
    this.retryAfterSeconds = input.retryAfterSeconds;
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpStatus(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 100 &&
    value <= 599
  );
}

function isProblemCode(value: unknown): value is string | number {
  if (typeof value === "number") {
    return Number.isInteger(value);
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim();

  return normalized.length > 0 && normalized.length <= 160;
}

export function isApiHttpError(error: unknown): error is ApiHttpError {
  if (error instanceof ApiHttpError) {
    return true;
  }

  if (!isRecord(error)) {
    return false;
  }

  return (
    error["name"] === "ApiHttpError" &&
    typeof error["message"] === "string" &&
    isHttpStatus(error["status"]) &&
    isProblemCode(error["code"])
  );
}

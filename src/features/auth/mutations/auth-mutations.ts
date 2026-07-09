// oz-next-app/src/features/auth/mutations/auth-mutations.ts
"use client";

import { z } from "zod";

import { ApiHttpError, isApiHttpError } from "@/lib/api/problem";
import type { LogoutResponse, MeResponse } from "@/lib/api/schemas";
import { authPublicClient } from "@/lib/auth/auth-public.client";
import { getDeviceFingerprint } from "@/lib/auth/device-fingerprint.client";
import {
  clearSessionTokens,
  markClientSession,
} from "@/lib/auth/session.client";
import { API_CONFIG, HTTP_STATUS } from "@/lib/constants";

import {
  loginChallengeIdSchema,
  loginIdentifierSchema,
  loginStartResponseSchema,
  otpFormCodeSchema,
  type LoginStartResult,
} from "../schemas/auth-form-schemas";
import {
  loginVerifyAction,
  logoutAction,
  meAction,
} from "../server/auth-actions";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:/@-]+$/u;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9:_./@-]{16,128}$/u;
const MAX_REQUEST_ID_LENGTH = 128;
const OFFLINE_TITLE = "You appear to be offline";
const OFFLINE_DESCRIPTION = "Check your connection and try again.";
const MAX_ATTEMPTS_REMAINING = 50;

const LOGIN_START_MUTATION_INPUT_SCHEMA = z
  .object({
    identifier: loginIdentifierSchema,
    idempotencyKey: z.string().trim().regex(IDEMPOTENCY_KEY_PATTERN).optional(),
  })
  .strict()
  .readonly();

const LOGIN_VERIFY_MUTATION_INPUT_SCHEMA = z
  .object({
    identifier: loginIdentifierSchema,
    challengeId: loginChallengeIdSchema,
    code: otpFormCodeSchema,
  })
  .strict()
  .readonly();

export type LoginStartMutationInput = z.infer<
  typeof LOGIN_START_MUTATION_INPUT_SCHEMA
>;
export type LoginVerifyMutationInput = z.infer<
  typeof LOGIN_VERIFY_MUTATION_INPUT_SCHEMA
>;

export type UserFacingAuthError = Readonly<{
  title: string;
  description: string;
  requestId: string | null;
}>;

export type LoginVerifyFailureKind =
  | "invalid_code"
  | "expired"
  | "attempts_exhausted"
  | "rate_limited"
  | "unavailable"
  | "request_invalid"
  | "account_unavailable"
  | "unknown";

export type LoginVerifyFailure = Readonly<{
  kind: LoginVerifyFailureKind;
  attemptsRemaining: number | null;
}>;

type AuthErrorMessage = Readonly<{
  title: string;
  description: string;
}>;

const OTP_INVALID_CODE_CODES = new Set<string>([
  "auth_login_invalid",
  "auth_invalid_login",
  "auth_otp_invalid",
  "login_invalid",
  "login_otp_invalid",
  "otp_invalid",
  "invalid_otp",
  "otp_invalid_or_expired",
]);

const OTP_EXPIRED_CODES = new Set<string>([
  "otp_challenge_expired",
  "otp_challenge_not_found",
  "otp_not_found",
  "otp_already_consumed",
]);

const OTP_ATTEMPTS_EXHAUSTED_CODES = new Set<string>([
  "otp_attempts_exhausted",
]);

const RATE_LIMIT_CODES = new Set<string>([
  "auth_rate_limited",
  "otp_verify_rate_limited",
  "rate_limited",
  "too_many_requests",
]);

const ACCOUNT_UNAVAILABLE_CODES = new Set<string>([
  "account_deleted",
  "account_suspended",
  "auth_forbidden",
  "customer_phone_ambiguous",
  "role_required",
  "tenant_required",
  "user_not_allowed",
]);

const REQUEST_INVALID_CODES = new Set<string>([
  "auth_validation_failed",
  "bad_request",
  "body_not_allowed",
  "challenge_id_or_email_required",
  "challenge_id_required",
  "identifier_required",
  "invalid_api_path",
  "invalid_http_method",
  "invalid_json_body",
  "invalid_phone_identifier",
  "invalid_request_body",
  "request_body_not_json_serializable",
  "unknown_client",
  "validation_failed",
  "validation_error",
]);

const TRANSPORT_OR_CONFIG_CODES = new Set<string>([
  "api_base_url_invalid",
  "api_invalid_json_response",
  "api_non_json_response",
  "api_response_invalid",
  "api_response_invalid_json",
  "api_response_too_large",
  "api_response_validation_failed",
  "bad_gateway",
  "forbidden",
  "login_access_token_invalid",
  "login_backend_timeout",
  "login_backend_unavailable",
  "login_refresh_token_invalid",
  "login_token_response_invalid",
  "login_verification_failed",
  "missing_access_token",
  "network_error",
  "origin_not_allowed",
  "origin_required",
  "request_aborted",
  "request_timeout",
  "service_unavailable",
  "unauthorized",
]);

function normalizeRequestId(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";

  if (
    normalized.length > 0 &&
    normalized.length <= MAX_REQUEST_ID_LENGTH &&
    REQUEST_ID_PATTERN.test(normalized)
  ) {
    return normalized;
  }

  return null;
}

function authError(
  message: AuthErrorMessage,
  requestId?: string | null,
): UserFacingAuthError {
  return {
    title: message.title,
    description: message.description,
    requestId: normalizeRequestId(requestId),
  };
}

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }

  return null;
}

function readAttemptsRemaining(value: unknown): number | null {
  if (!isRecord(value)) {
    return null;
  }

  return (
    finiteInteger(value["attempts_remaining"]) ??
    finiteInteger(value["attemptsRemaining"]) ??
    finiteInteger(value["attempts_left"]) ??
    finiteInteger(value["attemptsLeft"])
  );
}

function normalizeAttemptsRemaining(value: unknown): number | null {
  const normalized = readAttemptsRemaining(value);

  return normalized !== null &&
    normalized >= 0 &&
    normalized <= MAX_ATTEMPTS_REMAINING
    ? normalized
    : null;
}

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

function isValidationError(error: unknown): boolean {
  return error instanceof z.ZodError;
}

function createAuthIdempotencyKey(operation: string): string {
  const normalizedOperation = operation
    .trim()
    .replace(/[^A-Za-z0-9._:-]/gu, "-")
    .replace(/-+/gu, "-")
    .slice(0, 48);

  return `${normalizedOperation || "auth"}:${crypto.randomUUID()}`;
}

function classifyApiHttpError(error: ApiHttpError): LoginVerifyFailure {
  const code = normalizeCode(error.code);
  const attemptsRemaining = normalizeAttemptsRemaining(
    error.details ?? error.problem?.details ?? error.problem?.errors,
  );

  if (OTP_INVALID_CODE_CODES.has(code)) {
    return { kind: "invalid_code", attemptsRemaining };
  }

  if (OTP_EXPIRED_CODES.has(code)) {
    return { kind: "expired", attemptsRemaining };
  }

  if (OTP_ATTEMPTS_EXHAUSTED_CODES.has(code)) {
    return { kind: "attempts_exhausted", attemptsRemaining };
  }

  if (
    RATE_LIMIT_CODES.has(code) ||
    error.status === HTTP_STATUS.TOO_MANY_REQUESTS
  ) {
    return { kind: "rate_limited", attemptsRemaining };
  }

  if (
    ACCOUNT_UNAVAILABLE_CODES.has(code) ||
    error.status === HTTP_STATUS.FORBIDDEN
  ) {
    return { kind: "account_unavailable", attemptsRemaining };
  }

  if (
    REQUEST_INVALID_CODES.has(code) ||
    error.status === HTTP_STATUS.BAD_REQUEST ||
    error.status === HTTP_STATUS.UNPROCESSABLE_ENTITY
  ) {
    return { kind: "request_invalid", attemptsRemaining };
  }

  if (TRANSPORT_OR_CONFIG_CODES.has(code) || error.status >= 500) {
    return { kind: "unavailable", attemptsRemaining };
  }

  return { kind: "unknown", attemptsRemaining };
}

function toApiHttpAuthMessage(error: ApiHttpError): AuthErrorMessage {
  const failure = classifyApiHttpError(error);

  if (failure.kind === "invalid_code") {
    return {
      title: "Code could not be verified",
      description: "Check the latest code and try again.",
    };
  }

  if (failure.kind === "expired") {
    return {
      title: "Code expired",
      description: "Request a new verification code to continue.",
    };
  }

  if (
    failure.kind === "attempts_exhausted" ||
    failure.kind === "rate_limited"
  ) {
    return {
      title: "Too many attempts",
      description: "Wait a moment, then request a new verification code.",
    };
  }

  if (failure.kind === "account_unavailable") {
    return {
      title: "Workspace access is unavailable",
      description:
        "Contact your administrator if you should have access to this ERP workspace.",
    };
  }

  if (failure.kind === "unavailable") {
    return {
      title: "Sign-in is temporarily unavailable",
      description: "Try again shortly. Contact support if the issue continues.",
    };
  }

  if (failure.kind === "request_invalid") {
    return {
      title: "Sign-in details are invalid",
      description: "Review the details and try again.",
    };
  }

  if (error.status === HTTP_STATUS.NOT_FOUND) {
    return {
      title: "Account was not found",
      description:
        "Use the email or mobile number registered for your ERP workspace.",
    };
  }

  return {
    title: "Sign-in request failed",
    description: "Review the details and try again.",
  };
}

export function toLoginVerifyFailure(error: unknown): LoginVerifyFailure {
  if (isApiHttpError(error)) {
    return classifyApiHttpError(error);
  }

  if (isValidationError(error)) {
    return { kind: "request_invalid", attemptsRemaining: null };
  }

  if (isAbortError(error) || isNetworkError(error)) {
    return { kind: "unavailable", attemptsRemaining: null };
  }

  return { kind: "unknown", attemptsRemaining: null };
}

export async function loginStartMutation(
  input: LoginStartMutationInput,
): Promise<LoginStartResult> {
  const parsedInput = LOGIN_START_MUTATION_INPUT_SCHEMA.parse(input);
  const response = await authPublicClient.loginStart({
    identifier: parsedInput.identifier,
    idempotencyKey:
      parsedInput.idempotencyKey ??
      createAuthIdempotencyKey("auth-login-start"),
  });

  return loginStartResponseSchema.parse(response);
}

export async function loginVerifyMutation(
  input: LoginVerifyMutationInput,
): Promise<void> {
  const parsedInput = LOGIN_VERIFY_MUTATION_INPUT_SCHEMA.parse(input);
  const result = await loginVerifyAction({
    clientId: API_CONFIG.clientId,
    challengeId: parsedInput.challengeId,
    otp: parsedInput.code,
    deviceFingerprint: getDeviceFingerprint(),
  });

  if (!result.ok) {
    const requestId = normalizeRequestId(result.error.requestId);

    throw new ApiHttpError({
      message: result.error.message,
      status: result.error.status,
      code: result.error.code,
      ...(requestId !== null ? { requestId } : {}),
      ...(result.error.retryAfter !== null
        ? { retryAfterSeconds: result.error.retryAfter }
        : {}),
      ...(result.error.attemptsRemaining !== null
        ? { details: { attemptsRemaining: result.error.attemptsRemaining } }
        : {}),
    });
  }

  markClientSession({ expiresInSeconds: result.expiresInSeconds });
}

export async function logoutMutation(): Promise<LogoutResponse | null> {
  try {
    return await logoutAction();
  } finally {
    clearSessionTokens();
  }
}

export async function meQuery(): Promise<MeResponse> {
  const response = await meAction();

  markClientSession();
  return response;
}

export function toUserFacingAuthError(error: unknown): UserFacingAuthError {
  if (isBrowserOffline()) {
    return authError({
      title: OFFLINE_TITLE,
      description: OFFLINE_DESCRIPTION,
    });
  }

  if (isApiHttpError(error)) {
    return authError(toApiHttpAuthMessage(error), error.requestId);
  }

  if (isValidationError(error)) {
    return authError({
      title: "Sign-in details are invalid",
      description: "Review the details and try again.",
    });
  }

  if (isAbortError(error)) {
    return authError({
      title: "Request timed out",
      description: "Check your connection and try again.",
    });
  }

  if (isNetworkError(error)) {
    return authError({
      title: "Network request failed",
      description: "Check your connection and try again.",
    });
  }

  return authError({
    title: "Unable to continue sign-in",
    description: "Try again. Contact support if the issue continues.",
  });
}

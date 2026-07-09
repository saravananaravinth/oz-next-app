// oz-next-app/src/features/auth/server/auth-actions.ts
"use server";

import "server-only";

import { z } from "zod";

import { AUTH_ENDPOINTS } from "@/lib/api/endpoints";
import { ApiHttpError, isApiHttpError } from "@/lib/api/problem";
import {
  loginVerifyRequestSchema,
  logoutResponseSchema,
  meResponseSchema,
  type LoginVerifyRequest,
  type LogoutResponse,
  type MeResponse,
} from "@/lib/api/schemas";
import { HTTP_METHODS, HTTP_STATUS } from "@/lib/constants";
import { hasSessionTokenType } from "@/server/auth/jwt-metadata";
import {
  clearServerAuthCookies,
  setServerAuthTokens,
} from "@/server/auth/session";
import { serverFetch } from "@/server/fetch";

export type LoginVerifyActionError = Readonly<{
  message: string;
  status: number;
  code: string;
  requestId: string | null;
  retryAfter: number | null;
  attemptsRemaining: number | null;
}>;

export type LoginVerifyActionSuccess = Readonly<{
  ok: true;
  expiresInSeconds: number;
}>;

export type LoginVerifyActionResult = Readonly<
  | LoginVerifyActionSuccess
  | {
      ok: false;
      error: LoginVerifyActionError;
    }
>;

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:/@-]+$/u;
const ERROR_CODE_PATTERN = /^[A-Za-z0-9_.:-]{1,160}$/u;
const MAX_REQUEST_ID_LENGTH = 128;
const DEFAULT_LOGIN_VERIFY_ERROR_CODE = "login_verification_failed";
const MAX_RETRY_AFTER_SECONDS = 86_400;
const MAX_ATTEMPTS_REMAINING = 50;

const backendLoginTokenPairSchema = z
  .looseObject({
    tokenType: z.literal("Bearer"),
    accessToken: z.string().trim().min(32).max(8_192),
    expiresInSeconds: z.number().int().min(1).max(86_400),
    refreshToken: z.string().trim().min(32).max(8_192),
    refreshExpiresInSeconds: z
      .number()
      .int()
      .min(1)
      .max(60 * 24 * 60 * 60),
  })
  .transform((value) => {
    const refreshExpiresAt = new Date(
      Date.now() + value.refreshExpiresInSeconds * 1_000,
    ).toISOString();

    return {
      access_token: value.accessToken,
      refresh_token: value.refreshToken,
      token_type: value.tokenType,
      expires_in: value.expiresInSeconds,
      refresh_expires_at: refreshExpiresAt,
      permissions: [] as readonly string[],
    };
  });

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

function normalizeErrorCode(value: string | number | null | undefined): string {
  const normalized = String(value ?? "").trim();

  return ERROR_CODE_PATTERN.test(normalized)
    ? normalized
    : DEFAULT_LOGIN_VERIFY_ERROR_CODE;
}

function normalizeHttpStatus(value: number): number {
  return Number.isInteger(value) && value >= 400 && value <= 599
    ? value
    : HTTP_STATUS.UNAUTHORIZED;
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

function normalizeRetryAfter(value: unknown): number | null {
  const parsed = finiteInteger(value);

  return parsed !== null && parsed >= 0 && parsed <= MAX_RETRY_AFTER_SECONDS
    ? parsed
    : null;
}

function readAttemptHint(value: unknown): number | null {
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
  const parsed = readAttemptHint(value);

  return parsed !== null && parsed >= 0 && parsed <= MAX_ATTEMPTS_REMAINING
    ? parsed
    : null;
}

function toLoginVerifyActionError(error: unknown): LoginVerifyActionError {
  if (isApiHttpError(error)) {
    const code = normalizeErrorCode(error.code);

    return {
      message: code,
      status: normalizeHttpStatus(error.status),
      code,
      requestId: normalizeRequestId(error.requestId),
      retryAfter: normalizeRetryAfter(
        error.retryAfterSeconds ?? error.problem?.retry_after,
      ),
      attemptsRemaining: normalizeAttemptsRemaining(
        error.details ?? error.problem?.details ?? error.problem?.errors,
      ),
    };
  }

  return {
    message: DEFAULT_LOGIN_VERIFY_ERROR_CODE,
    status: HTTP_STATUS.UNAUTHORIZED,
    code: DEFAULT_LOGIN_VERIFY_ERROR_CODE,
    requestId: null,
    retryAfter: null,
    attemptsRemaining: null,
  };
}

function assertSessionTokenType(
  token: string,
  expectedType: "access" | "refresh",
  code: string,
): void {
  const normalized = token.trim();

  if (!hasSessionTokenType(normalized, expectedType)) {
    throw new ApiHttpError({
      message: code,
      status: HTTP_STATUS.UNAUTHORIZED,
      code,
    });
  }
}

function normalizeExpiresInSeconds(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export async function loginVerifyAction(
  input: LoginVerifyRequest,
): Promise<LoginVerifyActionResult> {
  const body = loginVerifyRequestSchema.parse(input);

  await clearServerAuthCookies();

  try {
    const tokens = await serverFetch(AUTH_ENDPOINTS.loginOtpVerify, {
      method: HTTP_METHODS.POST,
      auth: false,
      body,
      cache: "no-store",
      schema: backendLoginTokenPairSchema,
    });

    assertSessionTokenType(
      tokens.access_token,
      "access",
      "login_access_token_invalid",
    );
    assertSessionTokenType(
      tokens.refresh_token,
      "refresh",
      "login_refresh_token_invalid",
    );

    await setServerAuthTokens(tokens);

    return {
      ok: true,
      expiresInSeconds: normalizeExpiresInSeconds(tokens.expires_in),
    };
  } catch (error) {
    await clearServerAuthCookies();

    return { ok: false, error: toLoginVerifyActionError(error) };
  }
}

export async function meAction(): Promise<MeResponse> {
  return await serverFetch(AUTH_ENDPOINTS.me, {
    method: HTTP_METHODS.GET,
    auth: true,
    refreshOnUnauthorized: true,
    cache: "no-store",
    schema: meResponseSchema,
  });
}

export async function logoutAction(): Promise<LogoutResponse | null> {
  try {
    return await serverFetch(AUTH_ENDPOINTS.revokeCurrentSession, {
      method: HTTP_METHODS.DELETE,
      auth: true,
      refreshOnUnauthorized: false,
      cache: "no-store",
      schema: logoutResponseSchema,
    });
  } catch (error) {
    if (isApiHttpError(error) && error.status === HTTP_STATUS.UNAUTHORIZED) {
      return null;
    }

    if (error instanceof z.ZodError) {
      throw new ApiHttpError({
        message: "Logout response validation failed.",
        status: HTTP_STATUS.BAD_GATEWAY,
        code: "logout_response_invalid",
        cause: error,
      });
    }

    throw error;
  } finally {
    await clearServerAuthCookies();
  }
}

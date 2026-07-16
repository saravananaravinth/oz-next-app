// oz-next-app/src/features/auth/server/auth-actions.ts
"use server";

import "server-only";

import { z } from "zod";

import { AUTH_ENDPOINTS } from "@/lib/api/endpoints";
import { ApiHttpError, isApiHttpError } from "@/lib/api/problem";
import {
  authListSessionsQuerySchema,
  authSessionSummarySchema,
  authSessionsMetaSchema,
  authTokenResponseSchema,
  loginVerifyRequestSchema,
  logoutResponseSchema,
  meResponseSchema,
  type AuthListSessionsQuery,
  type AuthPagination,
  type AuthSessionSummary,
  type LoginVerifyRequest,
  type LogoutResponse,
  type MeResponse,
} from "@/lib/api/schemas";
import { API_CONFIG, HTTP_METHODS, HTTP_STATUS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { hasSessionTokenType } from "@/server/auth/jwt-metadata";
import {
  clearServerAuthCookies,
  setServerAuthTokens,
} from "@/server/auth/session";
import { serverEnvelopeFetch, serverFetch } from "@/server/fetch";
import { assertSameOriginMutation } from "@/server/security/origin";

import { schemaIssueDiagnostics } from "./auth-error-diagnostics";

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

export type AuthSessionsPageData = Readonly<{
  sessions: readonly AuthSessionSummary[];
  pagination: AuthPagination;
  requestId: string | null;
}>;

export type RevokeAuthSessionActionResult =
  | Readonly<{ ok: true }>
  | Readonly<{
      ok: false;
      code: string;
      message: string;
      requestId: string | null;
    }>;

const authSessionIdSchema = z.uuid();
const authSessionListSchema = z
  .array(authSessionSummarySchema)
  .max(100)
  .readonly();

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:/@-]+$/u;
const ERROR_CODE_PATTERN = /^[A-Za-z0-9_.:-]{1,160}$/u;
const MAX_REQUEST_ID_LENGTH = 128;
const DEFAULT_LOGIN_VERIFY_ERROR_CODE = "login_verification_failed";
const LOGIN_BACKEND_UNAVAILABLE_CODE = "login_backend_unavailable";
const LOGIN_BACKEND_TIMEOUT_CODE = "login_backend_timeout";
const LOGIN_TOKEN_RESPONSE_INVALID_CODE = "login_token_response_invalid";
const MAX_RETRY_AFTER_SECONDS = 86_400;
const MAX_ATTEMPTS_REMAINING = 50;

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

function loginVerifyActionError(
  input: Readonly<{
    status: number;
    code: string;
    requestId?: string | null;
    retryAfter?: number | null;
    attemptsRemaining?: number | null;
  }>,
): LoginVerifyActionError {
  const code = normalizeErrorCode(input.code);

  return {
    message: code,
    status: normalizeHttpStatus(input.status),
    code,
    requestId: normalizeRequestId(input.requestId),
    retryAfter: input.retryAfter ?? null,
    attemptsRemaining: input.attemptsRemaining ?? null,
  };
}

function errorName(error: unknown): string {
  return isRecord(error) && typeof error["name"] === "string"
    ? error["name"]
    : "";
}

function isAbortLikeError(error: unknown): boolean {
  const name = errorName(error);

  return name === "AbortError" || name === "TimeoutError";
}

function isTransportLikeError(error: unknown): boolean {
  return error instanceof TypeError || errorName(error) === "TypeError";
}

function toLoginVerifyActionError(error: unknown): LoginVerifyActionError {
  if (isApiHttpError(error)) {
    return loginVerifyActionError({
      status: error.status,
      code: normalizeErrorCode(error.code),
      requestId: normalizeRequestId(error.requestId),
      retryAfter: normalizeRetryAfter(
        error.retryAfterSeconds ?? error.problem?.retry_after,
      ),
      attemptsRemaining: normalizeAttemptsRemaining(
        error.details ?? error.problem?.details ?? error.problem?.errors,
      ),
    });
  }

  if (error instanceof z.ZodError) {
    return loginVerifyActionError({
      status: HTTP_STATUS.BAD_GATEWAY,
      code: LOGIN_TOKEN_RESPONSE_INVALID_CODE,
    });
  }

  if (isAbortLikeError(error)) {
    return loginVerifyActionError({
      status: HTTP_STATUS.GATEWAY_TIMEOUT,
      code: LOGIN_BACKEND_TIMEOUT_CODE,
    });
  }

  if (isTransportLikeError(error)) {
    return loginVerifyActionError({
      status: HTTP_STATUS.SERVICE_UNAVAILABLE,
      code: LOGIN_BACKEND_UNAVAILABLE_CODE,
    });
  }

  return loginVerifyActionError({
    status: HTTP_STATUS.SERVICE_UNAVAILABLE,
    code: DEFAULT_LOGIN_VERIFY_ERROR_CODE,
  });
}

function logLoginVerifyFailure(
  error: unknown,
  actionError: LoginVerifyActionError,
): void {
  const schemaDiagnostics =
    error instanceof z.ZodError ? schemaIssueDiagnostics(error) : null;
  const fields = {
    status: actionError.status,
    code: actionError.code,
    requestId: actionError.requestId,
    schemaIssuePaths: schemaDiagnostics?.paths,
    schemaIssueCodes: schemaDiagnostics?.codes,
  } as const;

  if (actionError.status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    logger.error("auth.login.verify_failed", fields);
    return;
  }

  logger.warn("auth.login.verify_failed", fields);
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
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  const body = loginVerifyRequestSchema.parse(input);

  await clearServerAuthCookies();

  try {
    const tokens = await serverFetch(AUTH_ENDPOINTS.loginOtpVerify, {
      method: HTTP_METHODS.POST,
      auth: false,
      body,
      cache: "no-store",
      schema: authTokenResponseSchema,
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

    const actionError = toLoginVerifyActionError(error);

    logLoginVerifyFailure(error, actionError);

    return { ok: false, error: actionError };
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
  await assertSameOriginMutation(API_CONFIG.appOrigin);

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

export async function listAuthSessionsAction(
  input: Partial<AuthListSessionsQuery> = {},
): Promise<AuthSessionsPageData> {
  const query = authListSessionsQuerySchema.parse(input);
  const search = new URLSearchParams({ limit: String(query.limit) });

  if (query.cursor !== undefined) {
    search.set("cursor", query.cursor);
  }

  const result = await serverEnvelopeFetch(
    `${AUTH_ENDPOINTS.sessions}?${search.toString()}`,
    {
      method: HTTP_METHODS.GET,
      auth: true,
      refreshOnUnauthorized: true,
      cache: "no-store",
      schema: authSessionListSchema,
      metaSchema: authSessionsMetaSchema,
    },
  );

  return {
    sessions: result.data,
    pagination: result.meta.pagination,
    requestId: result.requestId,
  };
}

export async function revokeAuthSessionAction(
  sessionIdInput: string,
): Promise<RevokeAuthSessionActionResult> {
  try {
    await assertSameOriginMutation(API_CONFIG.appOrigin);

    const sessionId = authSessionIdSchema.parse(sessionIdInput);

    await serverFetch(AUTH_ENDPOINTS.session(sessionId), {
      method: HTTP_METHODS.DELETE,
      auth: true,
      refreshOnUnauthorized: false,
      cache: "no-store",
      schema: logoutResponseSchema,
    });

    return { ok: true };
  } catch (error: unknown) {
    if (isApiHttpError(error)) {
      return {
        ok: false,
        code: error.code,
        message:
          error.status === HTTP_STATUS.NOT_FOUND
            ? "The session no longer exists."
            : error.status === HTTP_STATUS.FORBIDDEN
              ? "You are not authorized to revoke this session."
              : "The session could not be revoked safely.",
        requestId: normalizeRequestId(error.requestId),
      };
    }

    if (error instanceof z.ZodError) {
      return {
        ok: false,
        code: "auth_session_id_invalid",
        message: "The selected session identifier is invalid.",
        requestId: null,
      };
    }

    return {
      ok: false,
      code: "auth_session_revoke_failed",
      message: "The session could not be revoked safely.",
      requestId: null,
    };
  }
}

// oz-next-app/src/lib/auth/auth.client.ts
"use client";

import { z } from "zod";

import { edgeFetch, registerUnauthorizedRefreshHandler } from "../api/client";
import { AUTH_ENDPOINTS } from "@/lib/api/endpoints";
import { ApiHttpError } from "@/lib/api/problem";
import {
  loginStartRequestSchema,
  loginStartResponseSchema,
  type AuthSessionResponse,
  type LoginStartResponse,
  type LoginVerifyRequest,
  type LogoutResponse,
  type MeResponse,
} from "@/lib/api/schemas";
import { getDeviceFingerprint } from "./device-fingerprint.client";
import { clearSessionTokens, markClientSession } from "./session.client";
import { API_CONFIG, HTTP_METHODS, HTTP_STATUS } from "@/lib/constants";

const localRefreshResponseSchema = z
  .object({
    success: z.literal(true).optional(),
    data: z
      .object({
        refreshed: z.literal(true),
        expires_in: z.number().int().positive().optional(),
      })
      .optional(),
    status: z.literal("success").optional(),
    refreshed: z.literal(true).optional(),
    expires_in: z.number().int().positive().optional(),
  })
  .loose();

const LOCAL_REFRESH_ENDPOINT = "/api/auth/refresh" as const;
const SERVER_AUTH_REQUIRED_MESSAGE =
  "This auth operation must run through a Next.js server action or route handler so tokens remain HttpOnly.";

let refreshInFlight: Promise<boolean> | null = null;

type LoginStartClientInput = Omit<
  z.input<typeof loginStartRequestSchema>,
  "clientId" | "project" | "device_fp"
>;

type BrowserAuthDefaults = Readonly<{
  clientId: string;
  project: typeof API_CONFIG.project;
  device_fp: string;
}>;

function withAuthDefaults<TInput extends Record<string, unknown>>(
  input: TInput,
): TInput & BrowserAuthDefaults {
  return {
    ...input,
    clientId:
      typeof input["clientId"] === "string"
        ? input["clientId"]
        : API_CONFIG.clientId,
    project: API_CONFIG.project,
    device_fp:
      typeof input["device_fp"] === "string"
        ? input["device_fp"]
        : getDeviceFingerprint(),
  };
}

function serverAuthBoundaryError(code: string): ApiHttpError {
  return new ApiHttpError({
    message: SERVER_AUTH_REQUIRED_MESSAGE,
    status: HTTP_STATUS.FORBIDDEN,
    code,
  });
}

async function refreshOnce(): Promise<boolean> {
  try {
    const response = await fetch(LOCAL_REFRESH_ENDPOINT, {
      method: HTTP_METHODS.POST,
      headers: { accept: "application/json" },
      cache: "no-store",
      credentials: "include",
      redirect: "error",
    });

    if (!response.ok) {
      clearSessionTokens();
      return false;
    }

    const payload = (await response.json()) as unknown;
    const parsed = localRefreshResponseSchema.safeParse(payload);

    if (!parsed.success) {
      clearSessionTokens();
      return false;
    }

    const expiresInSeconds =
      parsed.data.data?.expires_in ?? parsed.data.expires_in;

    markClientSession({ expiresInSeconds });
    return true;
  } catch {
    clearSessionTokens();
    return false;
  }
}

async function refreshShared(): Promise<boolean> {
  refreshInFlight ??= refreshOnce().finally((): void => {
    refreshInFlight = null;
  });

  return await refreshInFlight;
}

export const authClient = {
  async loginStart(input: LoginStartClientInput): Promise<LoginStartResponse> {
    const body = loginStartRequestSchema.parse(withAuthDefaults(input));

    return await edgeFetch(AUTH_ENDPOINTS.loginStart, {
      method: HTTP_METHODS.POST,
      auth: false,
      body,
      schema: loginStartResponseSchema,
    });
  },

  loginVerify(input: LoginVerifyRequest): Promise<AuthSessionResponse> {
    void input;

    return Promise.reject(
      serverAuthBoundaryError("auth_verify_server_boundary_required"),
    );
  },

  me(): Promise<MeResponse> {
    return Promise.reject(
      serverAuthBoundaryError("auth_me_server_boundary_required"),
    );
  },

  logout(): Promise<LogoutResponse> {
    clearSessionTokens();

    return Promise.reject(
      serverAuthBoundaryError("auth_logout_server_boundary_required"),
    );
  },
} as const;

registerUnauthorizedRefreshHandler(refreshShared);

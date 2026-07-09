// oz-next-app/src/lib/auth/auth-public.client.ts
"use client";

import type { z } from "zod";

import { edgeFetch } from "../api/client";
import { AUTH_ENDPOINTS } from "@/lib/api/endpoints";
import {
  loginStartRequestSchema,
  loginStartResponseSchema,
  type LoginStartResponse,
} from "@/lib/api/schemas";
import { getDeviceFingerprint } from "./device-fingerprint.client";
import { API_CONFIG, HTTP_METHODS } from "@/lib/constants";

type LoginStartClientInput = Omit<
  z.input<typeof loginStartRequestSchema>,
  "clientId" | "project" | "device_fp"
>;

type PublicAuthDefaults = Readonly<{
  clientId: string;
  project: typeof API_CONFIG.project;
  device_fp: string;
}>;

function withPublicAuthDefaults<TInput extends Record<string, unknown>>(
  input: TInput,
): TInput & PublicAuthDefaults {
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

export const authPublicClient = {
  async loginStart(input: LoginStartClientInput): Promise<LoginStartResponse> {
    const body = loginStartRequestSchema.parse(withPublicAuthDefaults(input));

    return await edgeFetch(AUTH_ENDPOINTS.loginStart, {
      method: HTTP_METHODS.POST,
      auth: false,
      body,
      schema: loginStartResponseSchema,
    });
  },
} as const;

export type { LoginStartResponse };

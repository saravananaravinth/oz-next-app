// oz-next-app/src/features/engagement/location-requests/api/location-request.client.ts
"use client";

import { apiClient } from "@/lib/api/browser-client";
import { HTTP_METHODS } from "@/lib/api/http-contract";

import {
  buildPublicLocationSubmitPath,
  publicLocationSubmitRequestSchema,
  publicLocationSubmitResponseSchema,
  type PublicLocationSubmitRequest,
  type PublicLocationSubmitResponse,
} from "@/features/engagement/location-requests/contracts/location-request.schema";

export type SubmitPublicLocationInput = Readonly<{
  token: string;
  location: PublicLocationSubmitRequest;
  idempotencyKey: string;
  signal?: AbortSignal;
}>;

export function submitPublicLocation(
  input: SubmitPublicLocationInput,
): Promise<PublicLocationSubmitResponse> {
  const body = publicLocationSubmitRequestSchema.parse(input.location);

  return apiClient.request(buildPublicLocationSubmitPath(input.token), {
    method: HTTP_METHODS.POST,
    auth: false,
    retry: 0,
    retryOnUnauthorized: false,
    timeoutMs: 20_000,
    idempotencyKey: input.idempotencyKey,
    body,
    schema: publicLocationSubmitResponseSchema,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
}

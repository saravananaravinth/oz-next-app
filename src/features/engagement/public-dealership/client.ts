// oz-next-app/src/features/engagement/public-dealership/client.ts
"use client";

import { apiClient } from "@/lib/api/client";
import { HTTP_METHODS } from "@/lib/constants";

import {
  buildPublicDealershipApplicationSubmitPath,
  dealershipApplicationSubmitRequestSchema,
  dealershipApplicationSubmitResponseSchema,
  dealershipSubmissionIdempotencyKeySchema,
  type DealershipApplicationSubmitRequest,
  type DealershipApplicationSubmitResponse,
} from "./schemas";

export type SubmitPublicDealershipApplicationInput = Readonly<{
  token: string;
  application: DealershipApplicationSubmitRequest;
  idempotencyKey: string;
  signal?: AbortSignal;
}>;

export async function submitPublicDealershipApplication(
  input: SubmitPublicDealershipApplicationInput,
): Promise<DealershipApplicationSubmitResponse> {
  const body = dealershipApplicationSubmitRequestSchema.parse(
    input.application,
  );
  const idempotencyKey = dealershipSubmissionIdempotencyKeySchema.parse(
    input.idempotencyKey,
  );

  return await apiClient.request(
    buildPublicDealershipApplicationSubmitPath(input.token),
    {
      method: HTTP_METHODS.POST,
      auth: false,
      retry: 0,
      retryOnUnauthorized: false,
      timeoutMs: 30_000,
      idempotencyKey,
      body,
      schema: dealershipApplicationSubmitResponseSchema,
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    },
  );
}

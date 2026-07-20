// oz-next-app/src/features/engagement/dealership-applications/api/dealership-application.client.ts
"use client";

import { apiClient } from "@/lib/api/browser-client";
import { HTTP_METHODS } from "@/lib/api/http-contract";

import {
  buildPublicDealershipApplicationSubmitPath,
  dealershipApplicationSubmitRequestSchema,
  dealershipApplicationSubmitResponseSchema,
  dealershipSubmissionIdempotencyKeySchema,
  type DealershipApplicationSubmitRequest,
  type DealershipApplicationSubmitResponse,
} from "@/features/engagement/dealership-applications/contracts/dealership-application.schema";

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

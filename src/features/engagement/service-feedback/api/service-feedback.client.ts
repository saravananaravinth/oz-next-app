// oz-next-app/src/features/engagement/service-feedback/api/service-feedback.client.ts
"use client";

import { apiClient } from "@/lib/api/browser-client";
import { HTTP_METHODS } from "@/lib/api/http-contract";

import {
  buildPublicServiceFeedbackSubmitPath,
  serviceFeedbackSubmitRequestSchema,
  serviceFeedbackSubmitResponseSchema,
  type ServiceFeedbackSubmitRequest,
  type ServiceFeedbackSubmitResponse,
} from "@/features/engagement/service-feedback/contracts/service-feedback.schema";

export type SubmitPublicServiceFeedbackInput = Readonly<{
  token: string;
  feedback: ServiceFeedbackSubmitRequest;
  idempotencyKey: string;
  signal?: AbortSignal;
}>;

export async function submitPublicServiceFeedback(
  input: SubmitPublicServiceFeedbackInput,
): Promise<ServiceFeedbackSubmitResponse> {
  const body = serviceFeedbackSubmitRequestSchema.parse(input.feedback);

  return await apiClient.request(
    buildPublicServiceFeedbackSubmitPath(input.token),
    {
      method: HTTP_METHODS.POST,
      auth: false,
      retry: 0,
      retryOnUnauthorized: false,
      timeoutMs: 20_000,
      idempotencyKey: input.idempotencyKey,
      body,
      schema: serviceFeedbackSubmitResponseSchema,
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    },
  );
}

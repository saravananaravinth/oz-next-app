// oz-next-app/src/features/engagement/public-service-feedback/client.ts
"use client";

import { apiClient } from "@/lib/api/client";
import { HTTP_METHODS } from "@/lib/constants";

import {
  buildPublicServiceFeedbackSubmitPath,
  serviceFeedbackSubmitRequestSchema,
  serviceFeedbackSubmitResponseSchema,
  type ServiceFeedbackSubmitRequest,
  type ServiceFeedbackSubmitResponse,
} from "./schemas";

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

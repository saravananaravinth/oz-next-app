// oz-next-app/src/features/engagement/public-dealer-leads/client.ts
"use client";

import { apiClient } from "@/lib/api/client";
import { HTTP_METHODS } from "@/lib/constants";

import {
  buildPublicDealerLeadForwardPath,
  buildPublicDealerLeadUpdatePath,
  dealerLeadForwardRequestSchema,
  dealerLeadMutationResponseSchema,
  dealerLeadUpdateRequestSchema,
  type DealerLeadForwardRequest,
  type DealerLeadMutationResponse,
  type DealerLeadUpdateRequest,
} from "./schemas";

const DEALER_LEAD_MUTATION_TIMEOUT_MS = 20_000;

export type UpdatePublicDealerLeadInput = Readonly<{
  token: string;
  update: DealerLeadUpdateRequest;
  idempotencyKey: string;
  signal?: AbortSignal;
}>;

export type ForwardPublicDealerLeadInput = Readonly<{
  token: string;
  forward: DealerLeadForwardRequest;
  idempotencyKey: string;
  signal?: AbortSignal;
}>;

export async function updatePublicDealerLead(
  input: UpdatePublicDealerLeadInput,
): Promise<DealerLeadMutationResponse> {
  const body = dealerLeadUpdateRequestSchema.parse(input.update);

  return await apiClient.request(buildPublicDealerLeadUpdatePath(input.token), {
    method: HTTP_METHODS.POST,
    auth: false,
    retry: 0,
    retryOnUnauthorized: false,
    timeoutMs: DEALER_LEAD_MUTATION_TIMEOUT_MS,
    idempotencyKey: input.idempotencyKey,
    body,
    schema: dealerLeadMutationResponseSchema,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
}

export async function forwardPublicDealerLead(
  input: ForwardPublicDealerLeadInput,
): Promise<DealerLeadMutationResponse> {
  const body = dealerLeadForwardRequestSchema.parse(input.forward);

  return await apiClient.request(
    buildPublicDealerLeadForwardPath(input.token),
    {
      method: HTTP_METHODS.POST,
      auth: false,
      retry: 0,
      retryOnUnauthorized: false,
      timeoutMs: DEALER_LEAD_MUTATION_TIMEOUT_MS,
      idempotencyKey: input.idempotencyKey,
      body,
      schema: dealerLeadMutationResponseSchema,
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    },
  );
}

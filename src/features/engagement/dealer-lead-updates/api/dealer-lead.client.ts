// oz-next-app/src/features/engagement/dealer-lead-updates/api/dealer-lead.client.ts
"use client";

import { apiClient } from "@/lib/api/browser-client";
import { HTTP_METHODS } from "@/lib/api/http-contract";

import {
  buildPublicDealerLeadForwardPath,
  buildPublicDealerLeadUpdatePath,
  buildPublicDealerLeadViewPath,
  dealerLeadForwardRequestSchema,
  dealerLeadMutationResponseSchema,
  dealerLeadPublicViewSchema,
  dealerLeadUpdateRequestSchema,
  type DealerLeadForwardRequest,
  type DealerLeadMutationResponse,
  type DealerLeadPublicView,
  type DealerLeadUpdateRequest,
} from "@/features/engagement/dealer-lead-updates/contracts/dealer-lead.schema";

const DEALER_LEAD_READ_TIMEOUT_MS = 10_000;
const DEALER_LEAD_MUTATION_TIMEOUT_MS = 20_000;

export type GetPublicDealerLeadInput = Readonly<{
  token: string;
  signal?: AbortSignal;
}>;

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

export async function getPublicDealerLead(
  input: GetPublicDealerLeadInput,
): Promise<DealerLeadPublicView> {
  return await apiClient.request(buildPublicDealerLeadViewPath(input.token), {
    method: HTTP_METHODS.GET,
    auth: false,
    retry: 1,
    retryOnUnauthorized: false,
    timeoutMs: DEALER_LEAD_READ_TIMEOUT_MS,
    schema: dealerLeadPublicViewSchema,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });
}

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

// oz-next-app/src/features/extended-warranty/api/purchase.client.ts
"use client";

import { apiClient } from "@/lib/api/browser-client";
import {
  buildExtendedWarrantyCheckoutPath,
  buildExtendedWarrantyPaymentStatusPath,
  buildExtendedWarrantyPurchaseDetailsPath,
  extendedWarrantyCheckoutSchema,
  extendedWarrantyPaymentStatusSchema,
  extendedWarrantyPurchaseSchema,
  type ExtendedWarrantyCheckout,
  type ExtendedWarrantyPaymentStatus,
  type ExtendedWarrantyPurchase,
} from "@/features/extended-warranty/contracts/purchase.schema";

export async function getExtendedWarrantyPurchase(
  token: string,
  signal?: AbortSignal,
): Promise<ExtendedWarrantyPurchase> {
  return await apiClient.get(
    buildExtendedWarrantyPurchaseDetailsPath(token),
    extendedWarrantyPurchaseSchema,
    {
      auth: false,
      ...(signal === undefined ? {} : { signal }),
    },
  );
}

export async function createExtendedWarrantyCheckout(
  input: Readonly<{
    token: string;
    offerOptionId: string;
    idempotencyKey: string;
    signal?: AbortSignal;
  }>,
): Promise<ExtendedWarrantyCheckout> {
  return await apiClient.post(
    buildExtendedWarrantyCheckoutPath(input.token),
    { offerOptionId: input.offerOptionId },
    extendedWarrantyCheckoutSchema,
    {
      auth: false,
      idempotencyKey: input.idempotencyKey,
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    },
  );
}

export async function getExtendedWarrantyPaymentStatus(
  token: string,
  signal?: AbortSignal,
): Promise<ExtendedWarrantyPaymentStatus> {
  return await apiClient.get(
    buildExtendedWarrantyPaymentStatusPath(token),
    extendedWarrantyPaymentStatusSchema,
    { auth: false, ...(signal === undefined ? {} : { signal }) },
  );
}

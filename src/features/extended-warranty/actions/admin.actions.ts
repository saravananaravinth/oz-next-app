// oz-next-app/src/features/extended-warranty/actions/admin.actions.ts
"use server";

import * as admin from "../api/admin.server";
import {
  extendedWarrantyActionFailure,
  type ExtendedWarrantyActionResult,
} from "@/features/extended-warranty/actions/action-failure";
import { API_CONFIG } from "@/lib/api/http-contract";
import { assertSameOriginMutation } from "@/server/security/origin";

export async function syncExtendedWarrantyStockAction(
  input: Readonly<{ tenantId: string }>,
) {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  return await admin.syncExtendedWarrantyStockAction(input);
}

export async function prepareExtendedWarrantyPurchaseLinkAction(
  input: Readonly<{ tenantId: string; unitId: string }>,
) {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  return await admin.prepareExtendedWarrantyPurchaseLinkAction(input);
}

export async function sendExtendedWarrantyPurchaseLinkAction(form: FormData) {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  return await admin.sendExtendedWarrantyPurchaseLinkAction(form);
}

export async function downloadExtendedWarrantyCertificateAction(
  input: Readonly<{ tenantId: string; unitId: string }>,
) {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  return await admin.downloadExtendedWarrantyCertificateAction(input);
}

export async function reconcileExtendedWarrantyPaymentAction(
  input: Readonly<{
    tenantId: string;
    unitId: string;
    idempotencyKey: string;
  }>,
): Promise<ExtendedWarrantyActionResult<Readonly<{ requested: true }>>> {
  try {
    await assertSameOriginMutation(API_CONFIG.appOrigin);
    await admin.reconcileExtendedWarrantyPaymentAction(input);
    return { ok: true, data: { requested: true } };
  } catch (error: unknown) {
    return extendedWarrantyActionFailure(error, "PAYMENT_RECONCILIATION");
  }
}

export async function reconcileExtendedWarrantyFulfillmentAction(
  input: Readonly<{ tenantId: string; unitId: string; idempotencyKey: string }>,
): Promise<
  ExtendedWarrantyActionResult<
    Readonly<{
      outcome: "queued" | "deduplicated";
      jobId: string;
      taskId: string | null;
    }>
  >
> {
  try {
    await assertSameOriginMutation(API_CONFIG.appOrigin);
    const data = await admin.reconcileExtendedWarrantyFulfillmentAction(input);
    return { ok: true, data };
  } catch (error: unknown) {
    return extendedWarrantyActionFailure(error, "FULFILLMENT_RECONCILIATION");
  }
}

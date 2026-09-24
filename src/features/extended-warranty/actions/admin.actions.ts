// oz-next-app/src/features/extended-warranty/actions/admin.actions.ts
"use server";

import * as admin from "../api/admin.server";
import { API_CONFIG } from "@/lib/api/http-contract";
import { assertSameOriginMutation } from "@/server/security/origin";

export async function syncExtendedWarrantyStockAction(
  input: Readonly<{ tenantId: string }>,
) {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  return await admin.syncExtendedWarrantyStockAction(input);
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
  input: Readonly<{ tenantId: string; unitId: string }>,
) {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  await admin.reconcileExtendedWarrantyPaymentAction(input);
}

// oz-next-app/src/features/extended-warranty/api/admin.server.ts
import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  resolveTenantAccess,
  type ResolvedTenantAccess,
} from "@/features/tenant-context";
import { HTTP_METHODS } from "@/lib/api/http-contract";
import { requestId } from "@/lib/security/request-identifiers";
import { serverFetch } from "@/server/api/edge-fetch";
import {
  extendedWarrantyPrepareLinkResultSchema,
  extendedWarrantySendPurchaseLinkResultSchema,
  extendedWarrantyStockSyncResultSchema,
  extendedWarrantyWorkspaceDetailSchema,
  extendedWarrantyWorkspaceQuerySchema,
  extendedWarrantyWorkspaceSchema,
  paymentProviderAccountsSchema,
  type ExtendedWarrantyPrepareLinkResult,
  type ExtendedWarrantySendPurchaseLinkResult,
  type ExtendedWarrantyStockSyncResult,
  type ExtendedWarrantyWorkspace,
  type ExtendedWarrantyWorkspaceDetail,
  type ExtendedWarrantyWorkspaceQuery,
  type PaymentProviderAccount,
} from "@/features/extended-warranty/contracts/admin.schema";

type AdminAccess = Pick<ResolvedTenantAccess, "tenantId" | "actorContext">;

const contextOptions = (access: AdminAccess) =>
  access.actorContext === undefined
    ? {}
    : { actorContext: access.actorContext };

function buildWorkspaceQuery(query: ExtendedWarrantyWorkspaceQuery): string {
  const search = new URLSearchParams();
  if (query.q.length > 0) {
    search.set("q", query.q);
  }
  search.set("status", query.status);
  search.set("reconciliation", query.reconciliation);
  search.set("limit", String(query.limit));
  if (query.cursor !== undefined) {
    search.set("cursor", query.cursor);
  }
  return search.toString();
}

export async function loadExtendedWarrantyWorkspace(
  access: AdminAccess,
  query: ExtendedWarrantyWorkspaceQuery,
): Promise<ExtendedWarrantyWorkspace> {
  const parsed = extendedWarrantyWorkspaceQuerySchema.parse(query);
  return await serverFetch(
    `/erp/extended-warranty/workspace?${buildWorkspaceQuery(parsed)}`,
    {
      method: HTTP_METHODS.GET,
      schema: extendedWarrantyWorkspaceSchema,
      cache: "no-store",
      ...contextOptions(access),
    },
  );
}

export async function loadExtendedWarrantyVehicleDetail(
  access: AdminAccess,
  unitId: string,
): Promise<ExtendedWarrantyWorkspaceDetail> {
  return await serverFetch(
    `/erp/extended-warranty/workspace/${encodeURIComponent(z.uuid().parse(unitId))}`,
    {
      method: HTTP_METHODS.GET,
      schema: extendedWarrantyWorkspaceDetailSchema,
      cache: "no-store",
      ...contextOptions(access),
    },
  );
}

export async function loadPaymentProviderAccounts(
  access: AdminAccess,
): Promise<readonly PaymentProviderAccount[]> {
  return await serverFetch("/erp/payments/provider-accounts", {
    method: HTTP_METHODS.GET,
    schema: paymentProviderAccountsSchema,
    cache: "no-store",
    ...contextOptions(access),
  });
}

async function requireActionAccess(
  tenantId: string,
  requiredPermissions: readonly string[],
): Promise<AdminAccess> {
  const me = await requireAuthenticatedMe();
  if (
    requiredPermissions.length === 0 ||
    !requiredPermissions.every((permission) =>
      me.permissions.includes(permission),
    )
  ) {
    throw new Error("forbidden");
  }

  const access = resolveTenantAccess(me);
  if (access.kind !== "resolved" || access.tenantId !== tenantId) {
    throw new Error("invalid_tenant_context");
  }

  return access;
}

const sendPurchaseLinkActionSchema = z
  .object({
    tenantId: z.uuid(),
    unitId: z.uuid(),
  })
  .strict();

export async function syncExtendedWarrantyStockAction(
  input: Readonly<{ tenantId: string }>,
): Promise<ExtendedWarrantyStockSyncResult> {
  const parsed = z.object({ tenantId: z.uuid() }).strict().parse(input);
  const access = await requireActionAccess(parsed.tenantId, [
    "extended-warranty:order:update",
  ]);
  const result = await serverFetch(
    "/erp/extended-warranty/workspace/sync-stock",
    {
      method: HTTP_METHODS.POST,
      schema: extendedWarrantyStockSyncResultSchema,
      idempotencyKey: requestId("ew-stock-sync"),
      timeoutMs: 45_000,
      cache: "no-store",
      ...contextOptions(access),
    },
  );
  revalidatePath("/extended-warranty");
  return result;
}

export async function prepareExtendedWarrantyPurchaseLinkAction(
  input: Readonly<{ tenantId: string; unitId: string }>,
): Promise<ExtendedWarrantyPrepareLinkResult> {
  const parsed = sendPurchaseLinkActionSchema.parse(input);
  const access = await requireActionAccess(parsed.tenantId, [
    "extended-warranty:order:update",
  ]);
  const result = await serverFetch(
    `/erp/extended-warranty/workspace/${encodeURIComponent(parsed.unitId)}/prepare-link`,
    {
      method: HTTP_METHODS.POST,
      schema: extendedWarrantyPrepareLinkResultSchema,
      idempotencyKey: requestId("ew-prepare-link"),
      timeoutMs: 45_000,
      cache: "no-store",
      ...contextOptions(access),
    },
  );
  revalidatePath("/extended-warranty");
  return result;
}

export async function sendExtendedWarrantyPurchaseLinkAction(
  formData: FormData,
): Promise<ExtendedWarrantySendPurchaseLinkResult> {
  const input = sendPurchaseLinkActionSchema.parse(
    Object.fromEntries(formData.entries()),
  );

  const access = await requireActionAccess(input.tenantId, [
    "extended-warranty:order:update",
  ]);

  const result = await serverFetch(
    `/erp/extended-warranty/workspace/${encodeURIComponent(input.unitId)}/send-link`,
    {
      method: HTTP_METHODS.POST,
      schema: extendedWarrantySendPurchaseLinkResultSchema,
      idempotencyKey: requestId("ew-send-link"),
      cache: "no-store",
      ...contextOptions(access),
    },
  );

  revalidatePath("/extended-warranty");

  return result;
}
export async function downloadExtendedWarrantyCertificateAction(
  input: Readonly<{ tenantId: string; unitId: string }>,
): Promise<{ url: string }> {
  const parsed = sendPurchaseLinkActionSchema.parse(input);
  const access = await requireActionAccess(parsed.tenantId, [
    "extended-warranty:order:read",
  ]);
  return await serverFetch(
    `/erp/extended-warranty/workspace/${encodeURIComponent(parsed.unitId)}/certificate`,
    {
      method: HTTP_METHODS.GET,
      schema: z.object({ url: z.url() }),
      cache: "no-store",
      ...contextOptions(access),
    },
  );
}

export async function loadExtendedWarrantyOrderVehicle(
  access: AdminAccess,
  orderId: string,
): Promise<{ unitId: string | null }> {
  return await serverFetch(
    `/erp/extended-warranty/orders/${encodeURIComponent(z.uuid().parse(orderId))}/vehicle`,
    {
      method: HTTP_METHODS.GET,
      schema: z.object({ unitId: z.uuid().nullable() }).strict(),
      cache: "no-store",
      ...contextOptions(access),
    },
  );
}

export async function reconcileExtendedWarrantyPaymentAction(
  input: Readonly<{ tenantId: string; unitId: string }>,
): Promise<void> {
  const parsed = sendPurchaseLinkActionSchema.parse(input);
  const access = await requireActionAccess(parsed.tenantId, [
    "extended-warranty:order:read",
    "payment:reconcile",
  ]);
  const vehicle = await loadExtendedWarrantyVehicleDetail(
    access,
    parsed.unitId,
  );
  if (vehicle.paymentIntentId === null)
    throw new Error("No payment to reconcile");
  await serverFetch(
    `/erp/payments/intents/${vehicle.paymentIntentId}/reconcile`,
    {
      method: HTTP_METHODS.POST,
      schema: z.unknown(),
      idempotencyKey: requestId("ew-reconcile"),
      cache: "no-store",
      ...contextOptions(access),
    },
  );
  revalidatePath("/extended-warranty");
}

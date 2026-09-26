// oz-next-app/src/features/payments/server/payments.server.ts
import "server-only";

import { notFound } from "next/navigation";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  resolveTenantAccess,
  type ResolvedTenantAccess,
} from "@/features/tenant-context";
import { HTTP_METHODS } from "@/lib/api/http-contract";
import { serverFetch } from "@/server/api/edge-fetch";

import {
  paymentOverviewSchema,
  paymentProviderAccountSchema,
  paymentProviderAccountsSchema,
  paymentProviderHealthSchema,
  paymentRefundCommandResultSchema,
  paymentTransactionDetailSchema,
  paymentTransactionPageSchema,
  paymentWebhookReceiptPageSchema,
  paymentWebhookReceiptSchema,
  type PaymentProviderAccount,
  type PaymentsWorkspaceQuery,
} from "@/features/payments/contracts/payments.schema";

const PAYMENT_PERMISSION = {
  read: "payment:read",
  configure: "payment:configure",
  refund: "payment:refund",
  reconcile: "payment:reconcile",
} as const;

export type PaymentsCapabilities = Readonly<{
  canConfigure: boolean;
  canRefund: boolean;
  canReconcile: boolean;
}>;

export type PaymentsAccess = ResolvedTenantAccess &
  Readonly<{ capabilities: PaymentsCapabilities }>;

function contextOptions(access: PaymentsAccess) {
  return access.actorContext === undefined
    ? {}
    : { actorContext: access.actorContext };
}

export async function requirePaymentsAccess(): Promise<
  | PaymentsAccess
  | Readonly<{ kind: "context_required" | "forbidden"; reason: string }>
> {
  const me = await requireAuthenticatedMe();
  if (!me.permissions.includes(PAYMENT_PERMISSION.read)) notFound();

  const access = resolveTenantAccess(me);
  if (access.kind !== "resolved") return access;

  return {
    ...access,
    capabilities: {
      canConfigure: me.permissions.includes(PAYMENT_PERMISSION.configure),
      canRefund: me.permissions.includes(PAYMENT_PERMISSION.refund),
      canReconcile: me.permissions.includes(PAYMENT_PERMISSION.reconcile),
    },
  };
}

export async function loadPaymentProviderAccounts(
  access: PaymentsAccess,
): Promise<readonly PaymentProviderAccount[]> {
  return await serverFetch("/erp/payments/provider-accounts", {
    method: HTTP_METHODS.GET,
    schema: paymentProviderAccountsSchema,
    cache: "no-store",
    ...contextOptions(access),
  });
}

export async function loadPaymentOverview(
  access: PaymentsAccess,
  providerAccountId: string | undefined,
) {
  const search = new URLSearchParams({ windowDays: "30" });
  if (providerAccountId !== undefined)
    search.set("providerAccountId", providerAccountId);
  return await serverFetch(`/erp/payments/overview?${search.toString()}`, {
    method: HTTP_METHODS.GET,
    schema: paymentOverviewSchema,
    cache: "no-store",
    ...contextOptions(access),
  });
}

export async function loadPaymentProviderHealth(
  access: PaymentsAccess,
  providerAccountId: string,
) {
  return await serverFetch(
    `/erp/payments/provider-accounts/${encodeURIComponent(providerAccountId)}/health`,
    {
      method: HTTP_METHODS.GET,
      schema: paymentProviderHealthSchema.nullable(),
      cache: "no-store",
      ...contextOptions(access),
    },
  );
}

export async function loadPaymentTransactions(
  access: PaymentsAccess,
  query: PaymentsWorkspaceQuery,
) {
  const search = new URLSearchParams({ limit: "10" });
  if (query.account !== undefined)
    search.set("providerAccountId", query.account);
  if (query.cursor !== undefined) search.set("cursor", query.cursor);
  if (query.status !== undefined) search.set("status", query.status);
  if (query.method !== undefined) search.set("method", query.method);
  if (query.q !== undefined) search.set("q", query.q);
  if (query.fromDate !== undefined)
    search.set("from", `${query.fromDate}T00:00:00+05:30`);
  if (query.toDate !== undefined)
    search.set("to", `${query.toDate}T23:59:59+05:30`);
  return await serverFetch(`/erp/payments/transactions?${search.toString()}`, {
    method: HTTP_METHODS.GET,
    schema: paymentTransactionPageSchema,
    cache: "no-store",
    ...contextOptions(access),
  });
}

export async function loadPaymentTransaction(
  access: PaymentsAccess,
  chargeId: string,
) {
  return await serverFetch(
    `/erp/payments/transactions/${encodeURIComponent(chargeId)}`,
    {
      method: HTTP_METHODS.GET,
      schema: paymentTransactionDetailSchema,
      cache: "no-store",
      ...contextOptions(access),
    },
  );
}

export async function loadPaymentWebhookReceipts(
  access: PaymentsAccess,
  query: PaymentsWorkspaceQuery,
) {
  const search = new URLSearchParams({ limit: "10" });
  if (query.account !== undefined)
    search.set("providerAccountId", query.account);
  if (query.webhookCursor !== undefined)
    search.set("cursor", query.webhookCursor);
  if (query.webhookStatus !== undefined)
    search.set("status", query.webhookStatus);
  if (query.webhookEventType !== undefined)
    search.set("eventType", query.webhookEventType);
  if (query.webhookQ !== undefined) search.set("q", query.webhookQ);
  return await serverFetch(
    `/erp/payments/webhook-receipts?${search.toString()}`,
    {
      method: HTTP_METHODS.GET,
      schema: paymentWebhookReceiptPageSchema,
      cache: "no-store",
      ...contextOptions(access),
    },
  );
}

export async function loadPaymentWebhookReceipt(
  access: PaymentsAccess,
  webhookReceiptId: string,
) {
  return await serverFetch(
    `/erp/payments/webhook-receipts/${encodeURIComponent(webhookReceiptId)}`,
    {
      method: HTTP_METHODS.GET,
      schema: paymentWebhookReceiptSchema,
      cache: "no-store",
      ...contextOptions(access),
    },
  );
}

export async function configurePaymentAccount(
  access: PaymentsAccess,
  body: unknown,
) {
  return await serverFetch("/erp/payments/provider-accounts", {
    method: HTTP_METHODS.POST,
    body,
    schema: paymentProviderAccountSchema,
    cache: "no-store",
    ...contextOptions(access),
  });
}

export async function updatePaymentAccount(
  access: PaymentsAccess,
  providerAccountId: string,
  body: unknown,
) {
  return await serverFetch(
    `/erp/payments/provider-accounts/${encodeURIComponent(providerAccountId)}`,
    {
      method: HTTP_METHODS.PATCH,
      body,
      schema: paymentProviderAccountSchema,
      cache: "no-store",
      ...contextOptions(access),
    },
  );
}

export async function rotatePaymentCredentials(
  access: PaymentsAccess,
  providerAccountId: string,
  body: unknown,
) {
  return await serverFetch(
    `/erp/payments/provider-accounts/${encodeURIComponent(providerAccountId)}/credentials/rotate`,
    {
      method: HTTP_METHODS.POST,
      body,
      schema: paymentProviderAccountSchema,
      cache: "no-store",
      ...contextOptions(access),
    },
  );
}

export async function issuePaymentRefund(
  access: PaymentsAccess,
  input: Readonly<{
    chargeId: string;
    amountMinor: string;
    reasonCode: string | null;
    idempotencyKey: string;
  }>,
) {
  return await serverFetch(
    `/erp/payments/charges/${encodeURIComponent(input.chargeId)}/refunds`,
    {
      method: HTTP_METHODS.POST,
      body: { amountMinor: input.amountMinor, reasonCode: input.reasonCode },
      schema: paymentRefundCommandResultSchema,
      cache: "no-store",
      idempotencyKey: input.idempotencyKey,
      ...contextOptions(access),
    },
  );
}

export async function refreshPaymentTransaction(
  access: PaymentsAccess,
  chargeId: string,
) {
  return await serverFetch(
    `/erp/payments/transactions/${encodeURIComponent(chargeId)}/refresh`,
    {
      method: HTTP_METHODS.POST,
      body: {},
      schema: paymentTransactionDetailSchema,
      cache: "no-store",
      ...contextOptions(access),
    },
  );
}

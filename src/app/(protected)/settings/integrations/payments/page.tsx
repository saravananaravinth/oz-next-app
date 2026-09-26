// oz-next-app/src/app/(protected)/settings/integrations/payments/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { ContentRoot, ContentStatus } from "@/components/common/content-shell";
import {
  PaymentsPage,
  paymentsWorkspaceQuerySchema,
  type PaymentsWorkspaceQuery,
} from "@/features/payments";
import {
  loadPaymentOverview,
  loadPaymentProviderAccounts,
  loadPaymentProviderHealth,
  loadPaymentTransaction,
  loadPaymentTransactions,
  loadPaymentWebhookReceipt,
  loadPaymentWebhookReceipts,
  requirePaymentsAccess,
} from "@/features/payments/server/payments.server";

export const metadata: Metadata = {
  title: "Payments | Ozotec ERP",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export type PaymentsSettingsPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseWorkspaceQuery(
  params: Record<string, string | string[] | undefined>,
): PaymentsWorkspaceQuery {
  const parsed = paymentsWorkspaceQuerySchema.safeParse({
    tab: firstValue(params["tab"]),
    account: firstValue(params["account"]),
    cursor: firstValue(params["cursor"]),
    status: firstValue(params["status"]),
    method: firstValue(params["method"]),
    q: firstValue(params["q"]),
    fromDate: firstValue(params["fromDate"]),
    toDate: firstValue(params["toDate"]),
    transaction: firstValue(params["transaction"]),
    webhook: firstValue(params["webhook"]),
    webhookCursor: firstValue(params["webhookCursor"]),
    webhookStatus: firstValue(params["webhookStatus"]),
    webhookEventType: firstValue(params["webhookEventType"]),
    webhookQ: firstValue(params["webhookQ"]),
  });

  if (!parsed.success) {
    return paymentsWorkspaceQuerySchema.parse({ tab: "overview" });
  }

  return parsed.data;
}

export default async function Page({
  searchParams,
}: PaymentsSettingsPageProps): Promise<ReactElement> {
  const access = await requirePaymentsAccess();
  if (access.kind !== "resolved") {
    return (
      <ContentRoot width="wide">
        <ContentStatus
          title="Payment workspace is unavailable"
          description={access.reason}
        />
      </ContentRoot>
    );
  }

  const query = parseWorkspaceQuery(await searchParams);
  const accounts = await loadPaymentProviderAccounts(access);
  const selectedAccount =
    query.account === undefined
      ? accounts.length === 1
        ? (accounts[0] ?? null)
        : null
      : (accounts.find(
          (account) => account.providerAccountId === query.account,
        ) ?? null);

  const [overview, health] = await Promise.all([
    loadPaymentOverview(access, query.account),
    selectedAccount === null
      ? Promise.resolve(null)
      : loadPaymentProviderHealth(access, selectedAccount.providerAccountId),
  ]);

  const transactions =
    query.tab === "transactions" || query.transaction !== undefined
      ? await loadPaymentTransactions(access, query)
      : null;
  const webhookReceipts =
    query.tab === "webhooks" || query.webhook !== undefined
      ? await loadPaymentWebhookReceipts(access, query)
      : null;
  const transactionDetail =
    query.transaction === undefined
      ? null
      : await loadPaymentTransaction(access, query.transaction);
  const webhookDetail =
    query.webhook === undefined
      ? null
      : await loadPaymentWebhookReceipt(access, query.webhook);

  return (
    <PaymentsPage
      accounts={accounts}
      selectedAccount={selectedAccount}
      health={health}
      overview={overview}
      transactions={transactions}
      webhookReceipts={webhookReceipts}
      transactionDetail={transactionDetail}
      webhookDetail={webhookDetail}
      query={query}
      capabilities={access.capabilities}
    />
  );
}

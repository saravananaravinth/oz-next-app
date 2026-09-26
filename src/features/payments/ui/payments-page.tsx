// oz-next-app/src/features/payments/ui/payments-page.tsx
import type { Route } from "next";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  KeyRound,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  Webhook,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentEmptyState,
  ContentGrid,
  ContentHeader,
  ContentMetricCard,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_CONFIG } from "@/lib/api/http-contract";

import type {
  PaymentOverview,
  PaymentProviderAccount,
  PaymentProviderHealth,
  PaymentTransactionDetail,
  PaymentTransactionPage,
  PaymentWebhookReceipt,
  PaymentWebhookReceiptPage,
  PaymentsWorkspaceQuery,
  PaymentsWorkspaceTab,
} from "@/features/payments/contracts/payments.schema";
import { PaymentAccountActions } from "@/features/payments/ui/payment-account-actions";
import { PaymentAccountDialog } from "@/features/payments/ui/payment-account-dialog";
import { PaymentTransactionSheet } from "@/features/payments/ui/payment-transaction-sheet";
import { PaymentWebhookSheet } from "@/features/payments/ui/payment-webhook-sheet";
import {
  formatPaymentDateTime,
  formatPaymentLabel,
  formatPaymentMoney,
  maskPaymentKey,
} from "@/features/payments/utils/payment-format";

type PaymentsCapabilities = Readonly<{
  canConfigure: boolean;
  canRefund: boolean;
  canReconcile: boolean;
}>;

const PAYMENTS_PATH = "/settings/integrations/payments" satisfies Route;

type PaymentsHref = typeof PAYMENTS_PATH | `${typeof PAYMENTS_PATH}?${string}`;
const TRANSACTION_STATUSES = [
  "CREATED",
  "AUTHORIZED",
  "CAPTURED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
  "FAILED",
] as const;
const WEBHOOK_STATUSES = [
  "PROCESSED",
  "RETRYABLE_FAILURE",
  "TERMINAL_FAILURE",
  "IGNORED",
] as const;

function serializeQuery(query: PaymentsWorkspaceQuery): string {
  const search = new URLSearchParams();
  search.set("tab", query.tab);
  if (query.account !== undefined) search.set("account", query.account);
  if (query.cursor !== undefined) search.set("cursor", query.cursor);
  if (query.status !== undefined) search.set("status", query.status);
  if (query.method !== undefined) search.set("method", query.method);
  if (query.q !== undefined) search.set("q", query.q);
  if (query.fromDate !== undefined) search.set("fromDate", query.fromDate);
  if (query.toDate !== undefined) search.set("toDate", query.toDate);
  if (query.transaction !== undefined)
    search.set("transaction", query.transaction);
  if (query.webhook !== undefined) search.set("webhook", query.webhook);
  if (query.webhookCursor !== undefined)
    search.set("webhookCursor", query.webhookCursor);
  if (query.webhookStatus !== undefined)
    search.set("webhookStatus", query.webhookStatus);
  if (query.webhookEventType !== undefined)
    search.set("webhookEventType", query.webhookEventType);
  if (query.webhookQ !== undefined) search.set("webhookQ", query.webhookQ);
  return search.toString();
}

function paymentHref(
  query: PaymentsWorkspaceQuery,
  patch: Partial<PaymentsWorkspaceQuery>,
): PaymentsHref {
  const next: PaymentsWorkspaceQuery = {
    ...query,
    ...patch,
    tab: patch.tab ?? query.tab,
  };
  const serialized = serializeQuery(next);
  return serialized.length === 0
    ? PAYMENTS_PATH
    : `${PAYMENTS_PATH}?${serialized}`;
}

function transactionStatusVariant(
  status: string,
): React.ComponentProps<typeof Badge>["variant"] {
  if (
    ["CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED", "PROCESSED"].includes(status)
  ) {
    return "success";
  }
  if (["FAILED", "TERMINAL_FAILURE"].includes(status)) return "destructive";
  if (["AUTHORIZED", "RETRYABLE_FAILURE"].includes(status)) return "warning";
  return "secondary";
}

function TabLink({
  query,
  tab,
  children,
}: Readonly<{
  query: PaymentsWorkspaceQuery;
  tab: PaymentsWorkspaceTab;
  children: ReactNode;
}>): ReactElement {
  const active = query.tab === tab;
  return (
    <Button
      asChild
      size="sm"
      variant={active ? "default" : "ghost"}
      className="shrink-0 rounded-lg px-4"
    >
      <Link
        aria-current={active ? "page" : undefined}
        href={paymentHref(query, {
          tab,
          cursor: undefined,
          webhookCursor: undefined,
          transaction: undefined,
          webhook: undefined,
        })}
        scroll={false}
      >
        {children}
      </Link>
    </Button>
  );
}

function AccountSelector({
  accounts,
  query,
}: Readonly<{
  accounts: readonly PaymentProviderAccount[];
  query: PaymentsWorkspaceQuery;
}>): ReactElement | null {
  if (accounts.length <= 1) return null;
  return (
    <form
      method="get"
      action={PAYMENTS_PATH}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="tab" value={query.tab} />
      <select
        name="account"
        defaultValue={query.account ?? ""}
        aria-label="Payment provider account"
        className="h-9 min-w-56 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">All payment accounts</option>
        {accounts.map((account) => (
          <option
            key={account.providerAccountId}
            value={account.providerAccountId}
          >
            {account.accountReference ?? "Razorpay"} · {account.environment}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="outline">
        Apply
      </Button>
    </form>
  );
}

function PaymentWorkspaceNav({
  query,
}: Readonly<{ query: PaymentsWorkspaceQuery }>): ReactElement {
  return (
    <nav aria-label="Payment workspace views" className="min-w-0">
      <div className="max-w-full overflow-x-auto overscroll-x-contain">
        <div className="inline-flex min-w-max items-center gap-1 rounded-xl border border-border/70 bg-muted/30 p-1">
          <TabLink query={query} tab="overview">
            Overview
          </TabLink>
          <TabLink query={query} tab="transactions">
            Transactions
          </TabLink>
          <TabLink query={query} tab="webhooks">
            Webhooks
          </TabLink>
          <TabLink query={query} tab="configuration">
            Configuration
          </TabLink>
        </div>
      </div>
    </nav>
  );
}

function OverviewSection({
  overview,
  health,
  selectedAccount,
}: Readonly<{
  overview: PaymentOverview;
  health: PaymentProviderHealth | null;
  selectedAccount: PaymentProviderAccount | null;
}>): ReactElement {
  const currency = "INR";
  return (
    <div className="grid gap-5">
      <ContentGrid variant="metrics">
        <ContentMetricCard
          presentation="dashboard"
          tone="success"
          label="Captured"
          value={formatPaymentMoney(currency, overview.capturedAmountMinor)}
          description={`${overview.capturedCount.toLocaleString("en-IN")} payments · last ${String(overview.windowDays)} days`}
          icon={<CircleDollarSign aria-hidden="true" />}
        />
        <ContentMetricCard
          presentation="dashboard"
          tone="info"
          label="Refunded"
          value={formatPaymentMoney(currency, overview.refundedAmountMinor)}
          description={`${overview.refundedCount.toLocaleString("en-IN")} payments · last ${String(overview.windowDays)} days`}
          icon={<RotateCcw aria-hidden="true" />}
        />
        <ContentMetricCard
          presentation="dashboard"
          tone={overview.failedCount > 0 ? "warning" : "default"}
          label="Failed"
          value={overview.failedCount.toLocaleString("en-IN")}
          description={`Payment failures · last ${String(overview.windowDays)} days`}
          icon={<TriangleAlert aria-hidden="true" />}
        />
        <ContentMetricCard
          presentation="dashboard"
          tone={overview.reconciliationBacklog > 0 ? "warning" : "success"}
          label="Reconciling"
          value={overview.reconciliationBacklog.toLocaleString("en-IN")}
          description="Pending or running reconciliation jobs"
          icon={<RefreshCw aria-hidden="true" />}
        />
      </ContentGrid>

      <ContentDataSurface
        title="Gateway health"
        description="Credential, webhook and reconciliation health for the selected payment account."
        padded
      >
        {selectedAccount === null || health === null ? (
          <ContentEmptyState
            icon={<Activity aria-hidden="true" />}
            title="Select a payment account"
            description="Gateway health is available after a tenant payment account is configured or selected."
          />
        ) : (
          <ContentDescriptionList columns="two">
            <ContentDescriptionItem term="Provider">
              {selectedAccount.accountReference ??
                formatPaymentLabel(selectedAccount.providerCode)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Environment">
              {selectedAccount.environment}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Account status">
              <Badge
                variant={
                  selectedAccount.status === "ACTIVE"
                    ? "success"
                    : selectedAccount.status === "DEGRADED"
                      ? "warning"
                      : "secondary"
                }
              >
                {formatPaymentLabel(selectedAccount.status)}
              </Badge>
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Credentials">
              {health.credentialsConfigured
                ? `Configured · version ${
                    health.credentialVersion === null
                      ? "—"
                      : String(health.credentialVersion)
                  }`
                : "Not configured"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Last successful webhook">
              {formatPaymentDateTime(health.lastSuccessfulWebhookAt)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Webhook events (30 days)">
              {overview.webhookProcessedCount.toLocaleString("en-IN")} processed
              · {overview.webhookFailedCount.toLocaleString("en-IN")} failed
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Reconciliation backlog">
              {health.reconciliationBacklog.toLocaleString("en-IN")}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Failed charges">
              {health.failedCharges.toLocaleString("en-IN")}
            </ContentDescriptionItem>
          </ContentDescriptionList>
        )}
      </ContentDataSurface>
    </div>
  );
}

function TransactionFilters({
  query,
}: Readonly<{ query: PaymentsWorkspaceQuery }>): ReactElement {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1">
        <Button
          asChild
          size="sm"
          variant={query.status === undefined ? "secondary" : "ghost"}
        >
          <Link
            href={paymentHref(query, {
              status: undefined,
              cursor: undefined,
              transaction: undefined,
            })}
            scroll={false}
          >
            All
          </Link>
        </Button>
        {TRANSACTION_STATUSES.map((status) => (
          <Button
            key={status}
            asChild
            size="sm"
            variant={query.status === status ? "secondary" : "ghost"}
          >
            <Link
              href={paymentHref(query, {
                status,
                cursor: undefined,
                transaction: undefined,
              })}
              scroll={false}
            >
              {formatPaymentLabel(status)}
            </Link>
          </Button>
        ))}
      </div>
      <form
        method="get"
        action={PAYMENTS_PATH}
        className="grid gap-2 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
      >
        <input type="hidden" name="tab" value="transactions" />
        {query.account === undefined ? null : (
          <input type="hidden" name="account" value={query.account} />
        )}
        <Input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Payment, order, intent or business ref"
          maxLength={160}
        />
        <select
          name="method"
          defaultValue={query.method ?? ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All methods</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="netbanking">Net banking</option>
          <option value="wallet">Wallet</option>
        </select>
        <Input
          type="date"
          name="fromDate"
          defaultValue={query.fromDate ?? ""}
          aria-label="From date"
        />
        <Input
          type="date"
          name="toDate"
          defaultValue={query.toDate ?? ""}
          aria-label="To date"
        />
        <div className="flex gap-2">
          <Button type="submit" variant="outline">
            Filter
          </Button>
          <Button asChild type="button" variant="ghost">
            <Link
              href={paymentHref(query, {
                q: undefined,
                method: undefined,
                fromDate: undefined,
                toDate: undefined,
                cursor: undefined,
              })}
            >
              Reset
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

function TransactionPagination({
  page,
  query,
}: Readonly<{
  page: PaymentTransactionPage["page"];
  query: PaymentsWorkspaceQuery;
}>): ReactElement {
  const start = page.total === 0 ? 0 : page.offset + 1;
  const end = Math.min(page.total, page.offset + page.limit);
  const previousHref = paymentHref(query, {
    cursor: page.previousCursor ?? undefined,
    transaction: undefined,
  });
  const nextHref = paymentHref(query, {
    cursor: page.nextCursor ?? undefined,
    transaction: undefined,
  });
  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {start.toLocaleString("en-IN")}–{end.toLocaleString("en-IN")} of{" "}
        {page.total.toLocaleString("en-IN")} transactions · 10 rows per page
      </p>
      <div className="flex gap-2">
        <Button
          asChild
          size="sm"
          variant="outline"
          disabled={!page.hasPreviousPage}
        >
          <Link
            aria-disabled={!page.hasPreviousPage}
            href={previousHref}
            scroll={false}
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> Previous
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          disabled={!page.hasNextPage}
        >
          <Link
            aria-disabled={!page.hasNextPage}
            href={nextHref}
            scroll={false}
          >
            Next <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function TransactionsSection({
  transactions,
  query,
}: Readonly<{
  transactions: PaymentTransactionPage;
  query: PaymentsWorkspaceQuery;
}>): ReactElement {
  return (
    <ContentDataSurface
      title="Transactions"
      description="Provider-neutral ERP payment records. Open a transaction for provider verification, refunds and lifecycle history."
      toolbar={<TransactionFilters query={query} />}
      padded={false}
      footer={<TransactionPagination page={transactions.page} query={query} />}
    >
      {transactions.items.length === 0 ? (
        <div className="p-5">
          <ContentEmptyState
            icon={<ReceiptText aria-hidden="true" />}
            title="No transactions match these filters"
            description="Adjust the status, method, date range or search criteria."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">
                  <span className="sr-only">Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.items.map((transaction) => (
                <TableRow key={transaction.chargeId}>
                  <TableCell className="font-medium">
                    {transaction.providerPaymentId}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-48">
                      <p className="truncate text-sm">
                        {formatPaymentLabel(transaction.businessModule)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {transaction.businessReferenceId}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatPaymentLabel(transaction.method)}
                  </TableCell>
                  <TableCell className="max-w-44 truncate">
                    {transaction.providerOrderId ?? "—"}
                  </TableCell>
                  <TableCell>
                    {formatPaymentDateTime(transaction.createdAt)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatPaymentMoney(
                      transaction.currency,
                      transaction.amountMinor,
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPaymentMoney(
                      transaction.currency,
                      transaction.gatewayFeeMinor,
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={transactionStatusVariant(transaction.status)}
                    >
                      {formatPaymentLabel(transaction.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        aria-label={`Open payment ${transaction.providerPaymentId}`}
                        href={paymentHref(query, {
                          transaction: transaction.chargeId,
                        })}
                        scroll={false}
                      >
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </ContentDataSurface>
  );
}

function WebhookPagination({
  page,
  query,
}: Readonly<{
  page: PaymentWebhookReceiptPage["page"];
  query: PaymentsWorkspaceQuery;
}>): ReactElement {
  const start = page.total === 0 ? 0 : page.offset + 1;
  const end = Math.min(page.total, page.offset + page.limit);
  const previousHref = paymentHref(query, {
    webhookCursor: page.previousCursor ?? undefined,
    webhook: undefined,
  });
  const nextHref = paymentHref(query, {
    webhookCursor: page.nextCursor ?? undefined,
    webhook: undefined,
  });
  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {start.toLocaleString("en-IN")}–{end.toLocaleString("en-IN")} of{" "}
        {page.total.toLocaleString("en-IN")} webhook events · 10 rows per page
      </p>
      <div className="flex gap-2">
        <Button
          asChild
          size="sm"
          variant="outline"
          disabled={!page.hasPreviousPage}
        >
          <Link
            aria-disabled={!page.hasPreviousPage}
            href={previousHref}
            scroll={false}
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> Previous
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          disabled={!page.hasNextPage}
        >
          <Link
            aria-disabled={!page.hasNextPage}
            href={nextHref}
            scroll={false}
          >
            Next <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function WebhooksSection({
  receipts,
  selectedAccount,
  health,
  query,
}: Readonly<{
  receipts: PaymentWebhookReceiptPage;
  selectedAccount: PaymentProviderAccount | null;
  health: PaymentProviderHealth | null;
  query: PaymentsWorkspaceQuery;
}>): ReactElement {
  const webhookUrl =
    selectedAccount === null
      ? null
      : `${API_CONFIG.baseUrl}/erp/webhooks/payments/razorpay/${selectedAccount.webhookEndpointKey}`;
  return (
    <div className="grid gap-5">
      <ContentDataSurface
        title="Webhook configuration"
        description="Razorpay sends signed payment lifecycle events to this system-owned endpoint."
        padded
      >
        {selectedAccount === null ? (
          <ContentEmptyState
            icon={<Webhook aria-hidden="true" />}
            title="No payment account selected"
            description="Configure or select a Razorpay account to view its webhook endpoint."
          />
        ) : (
          <ContentDescriptionList columns="two">
            <ContentDescriptionItem term="Status">
              <Badge
                variant={
                  health?.lastSuccessfulWebhookAt === null
                    ? "secondary"
                    : "success"
                }
              >
                {health?.lastSuccessfulWebhookAt === null
                  ? "Awaiting events"
                  : "Healthy"}
              </Badge>
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Environment">
              {selectedAccount.environment}
            </ContentDescriptionItem>
            <ContentDescriptionItem
              term="Endpoint URL"
              valueClassName="break-all"
            >
              {webhookUrl}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Signing secret">
              {selectedAccount.webhookSecretFingerprint === null
                ? "Not configured"
                : "Configured"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Last successful webhook">
              {formatPaymentDateTime(health?.lastSuccessfulWebhookAt ?? null)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Endpoint key">
              {selectedAccount.webhookEndpointKey}
            </ContentDescriptionItem>
          </ContentDescriptionList>
        )}
      </ContentDataSurface>

      <ContentDataSurface
        title="Webhook logs"
        description="Durable, signature-verified webhook receipts. Raw provider bodies and signatures are not exposed."
        padded={false}
        toolbar={
          <form
            method="get"
            action={PAYMENTS_PATH}
            className="grid gap-2 p-3 md:grid-cols-[minmax(0,1fr)_13rem_minmax(0,1fr)_auto]"
          >
            <input type="hidden" name="tab" value="webhooks" />
            {query.account === undefined ? null : (
              <input type="hidden" name="account" value={query.account} />
            )}
            <Input
              name="webhookQ"
              defaultValue={query.webhookQ ?? ""}
              placeholder="Provider event or resource ID"
              maxLength={160}
            />
            <select
              name="webhookStatus"
              defaultValue={query.webhookStatus ?? ""}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              {WEBHOOK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatPaymentLabel(status)}
                </option>
              ))}
            </select>
            <Input
              name="webhookEventType"
              defaultValue={query.webhookEventType ?? ""}
              placeholder="Event type, e.g. payment.captured"
              maxLength={160}
            />
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
        }
        footer={<WebhookPagination page={receipts.page} query={query} />}
      >
        {receipts.items.length === 0 ? (
          <div className="p-5">
            <ContentEmptyState
              icon={<Webhook aria-hidden="true" />}
              title="No webhook events match these filters"
              description="Verified provider events will appear here after Razorpay sends them."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Signature</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16">
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.items.map((receipt) => (
                  <TableRow key={receipt.webhookReceiptId}>
                    <TableCell>
                      {formatPaymentDateTime(receipt.receivedAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {receipt.eventType}
                    </TableCell>
                    <TableCell>{receipt.resourceId ?? "—"}</TableCell>
                    <TableCell>
                      {receipt.signatureVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <ShieldCheck aria-hidden="true" className="size-4" />{" "}
                          Verified
                        </span>
                      ) : (
                        <span className="text-destructive">Not verified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={transactionStatusVariant(receipt.status)}>
                        {formatPaymentLabel(receipt.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          aria-label={`Open webhook ${receipt.eventType}`}
                          href={paymentHref(query, {
                            webhook: receipt.webhookReceiptId,
                          })}
                          scroll={false}
                        >
                          <ArrowRight aria-hidden="true" className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ContentDataSurface>
    </div>
  );
}

function ConfigurationSection({
  accounts,
  selectedAccount,
  health,
  canConfigure,
}: Readonly<{
  accounts: readonly PaymentProviderAccount[];
  selectedAccount: PaymentProviderAccount | null;
  health: PaymentProviderHealth | null;
  canConfigure: boolean;
}>): ReactElement {
  return (
    <div className="grid gap-5">
      <ContentDataSurface
        title="Payment gateway accounts"
        description="Tenant-scoped provider accounts. Secrets are encrypted in the API and never returned to the ERP browser."
        actions={canConfigure ? <PaymentAccountDialog /> : undefined}
        padded
      >
        {accounts.length === 0 ? (
          <ContentEmptyState
            icon={<CreditCard aria-hidden="true" />}
            title="No payment gateway configured"
            description="Connect Razorpay before enabling live ERP payment collection."
            actions={canConfigure ? <PaymentAccountDialog /> : undefined}
          />
        ) : (
          <div className="grid gap-3">
            {accounts.map((account) => (
              <div
                key={account.providerAccountId}
                className="grid gap-4 rounded-xl border border-border/70 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
              >
                <div className="grid gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">
                      {account.accountReference ?? "Razorpay"}
                    </h3>
                    <Badge
                      variant={
                        account.environment === "LIVE" ? "default" : "secondary"
                      }
                    >
                      {account.environment}
                    </Badge>
                    <Badge
                      variant={
                        account.status === "ACTIVE"
                          ? "success"
                          : account.status === "DEGRADED"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {formatPaymentLabel(account.status)}
                    </Badge>
                    {account.isDefault ? (
                      <Badge variant="outline">Default</Badge>
                    ) : null}
                  </div>
                  <div className="grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                    <span>Key ID: {maskPaymentKey(account.clientKeyId)}</span>
                    <span>
                      Credential version: {account.credentialVersion ?? "—"}
                    </span>
                    <span>
                      Last updated: {formatPaymentDateTime(account.updatedAt)}
                    </span>
                    <span>
                      Webhook:{" "}
                      {account.webhookSecretFingerprint === null
                        ? "Not configured"
                        : "Configured"}
                    </span>
                  </div>
                </div>
                {canConfigure ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <PaymentAccountDialog
                      account={account}
                      trigger={
                        <Button variant="outline" size="sm">
                          <KeyRound aria-hidden="true" className="size-4" />{" "}
                          Rotate credentials
                        </Button>
                      }
                    />
                    <PaymentAccountActions account={account} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ContentDataSurface>

      {selectedAccount === null ? null : (
        <ContentDataSurface
          title="Operational configuration"
          description="System-owned webhook routing and account health for the selected provider."
          padded
        >
          <ContentDescriptionList columns="two">
            <ContentDescriptionItem term="Provider account ID">
              {selectedAccount.providerAccountId}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Webhook endpoint key">
              {selectedAccount.webhookEndpointKey}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Credentials configured">
              {health?.credentialsConfigured ? "Yes" : "No"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Last webhook">
              {formatPaymentDateTime(health?.lastSuccessfulWebhookAt ?? null)}
            </ContentDescriptionItem>
          </ContentDescriptionList>
          <ContentStatus
            className="mt-4"
            icon={<ShieldCheck aria-hidden="true" />}
            title="Provider charges are not manually configured"
            description="Gateway fees and taxes are derived from verified provider payment data. Expected commercial pricing should remain separate from authoritative transaction fees."
          />
        </ContentDataSurface>
      )}
    </div>
  );
}

export function PaymentsPage({
  accounts,
  selectedAccount,
  health,
  overview,
  transactions,
  webhookReceipts,
  transactionDetail,
  webhookDetail,
  query,
  capabilities,
}: Readonly<{
  accounts: readonly PaymentProviderAccount[];
  selectedAccount: PaymentProviderAccount | null;
  health: PaymentProviderHealth | null;
  overview: PaymentOverview;
  transactions: PaymentTransactionPage | null;
  webhookReceipts: PaymentWebhookReceiptPage | null;
  transactionDetail: PaymentTransactionDetail | null;
  webhookDetail: PaymentWebhookReceipt | null;
  query: PaymentsWorkspaceQuery;
  capabilities: PaymentsCapabilities;
}>): ReactElement {
  const providerLabel =
    selectedAccount === null
      ? accounts.length === 0
        ? "No gateway configured"
        : "All payment accounts"
      : `${selectedAccount.accountReference ?? "Razorpay"} · ${selectedAccount.environment}`;
  const closeTransactionHref = paymentHref(query, { transaction: undefined });
  const closeWebhookHref = paymentHref(query, { webhook: undefined });

  return (
    <ContentRoot width="full" density="compact">
      <div className="grid gap-5">
        <ContentHeader
          eyebrow="Settings · Integrations"
          icon={<CreditCard aria-hidden="true" />}
          iconTone="primary"
          title="Payments"
          description="Manage payment gateways, transactions, refunds, reconciliation and provider webhooks for the active tenant."
          actions={
            capabilities.canConfigure ? <PaymentAccountDialog /> : undefined
          }
          meta={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{providerLabel}</Badge>
              {selectedAccount?.status === "ACTIVE" ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                  <CheckCircle2 aria-hidden="true" className="size-3.5" />{" "}
                  Active
                </span>
              ) : null}
            </div>
          }
        />

        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <PaymentWorkspaceNav query={query} />
          <div className="min-w-0 lg:justify-self-end">
            <AccountSelector accounts={accounts} query={query} />
          </div>
        </div>

        {query.tab === "overview" ? (
          <OverviewSection
            overview={overview}
            health={health}
            selectedAccount={selectedAccount}
          />
        ) : null}
        {query.tab === "transactions" && transactions !== null ? (
          <TransactionsSection transactions={transactions} query={query} />
        ) : null}
        {query.tab === "webhooks" && webhookReceipts !== null ? (
          <WebhooksSection
            receipts={webhookReceipts}
            selectedAccount={selectedAccount}
            health={health}
            query={query}
          />
        ) : null}
        {query.tab === "configuration" ? (
          <ConfigurationSection
            accounts={accounts}
            selectedAccount={selectedAccount}
            health={health}
            canConfigure={capabilities.canConfigure}
          />
        ) : null}

        {transactionDetail === null ? null : (
          <PaymentTransactionSheet
            transaction={transactionDetail}
            closeHref={closeTransactionHref}
            canRefund={capabilities.canRefund}
            canReconcile={capabilities.canReconcile}
          />
        )}
        {webhookDetail === null ? null : (
          <PaymentWebhookSheet
            receipt={webhookDetail}
            closeHref={closeWebhookHref}
          />
        )}
      </div>
    </ContentRoot>
  );
}

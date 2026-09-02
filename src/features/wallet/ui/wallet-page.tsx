// oz-next-app/src/features/wallet/ui/wallet-page.tsx
import Link from "next/link";
import type { ReactElement } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  FileText,
  Landmark,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentEmptyState,
  ContentMetricCard,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { CreditNoteWorkspace } from "@/features/wallet/ui/credit-note-workspace";
import { WalletAnimatedAmount } from "@/features/wallet/ui/wallet-animated-amount";
import { WalletWorkspaceHeader } from "@/features/wallet/ui/wallet-workspace-header";
import { formatMoney } from "@/features/wallet/utils/wallet-money";

import {
  WALLET_ACTIVITY_PAGE_SIZE,
  type WalletEntry,
  type WalletEntryType,
  type WalletSearchParams,
  type WalletStatus,
  type WalletSummary,
  type WalletWorkspaceData,
  type WelfareAccrual,
  type WelfareAccrualStatus,
} from "@/features/wallet/contracts/wallet.schema";
import type { WalletCapabilities } from "@/features/wallet/policies/wallet.policy";

export type WalletPageProps = Readonly<{
  data: WalletWorkspaceData;
  query: WalletSearchParams;
  capabilities: WalletCapabilities;
}>;

type QueryPatch = Readonly<{
  walletId?: string | null;
  entryCursor?: string | null;
  accrualCursor?: string | null;
  accrualStatus?: WelfareAccrualStatus | null;
}>;

type CursorPaginationKind = "entries" | "accruals";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

const ACCRUAL_STATUSES = [
  "PENDING",
  "BLOCKED",
  "CANCELLED",
  "CREDITED",
  "REVERSED",
] as const satisfies readonly WelfareAccrualStatus[];

const ENTRY_LABELS = {
  WELFARE_SALE_CREDIT: "Welfare sale credit",
  WELFARE_INVOICE_CANCELLATION_REVERSAL: "Invoice cancellation reversal",
  CREDIT_NOTE_ENTITLEMENT: "Credit Note entitlement",
  CREDIT_NOTE_SETTLEMENT: "Credit Note settlement",
  TRANSFER_DEBIT: "Wallet transfer",
  TRANSFER_CREDIT: "Wallet transfer received",
  ADMIN_ADJUSTMENT_CREDIT: "Administrative credit",
  ADMIN_ADJUSTMENT_DEBIT: "Administrative debit",
} as const satisfies Record<WalletEntryType, string>;

function formatDateTime(value: string): string {
  return DATE_TIME_FORMATTER.format(new Date(value));
}

function formatDate(value: string): string {
  return DATE_FORMATTER.format(new Date(value));
}

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function walletStatusVariant(status: WalletStatus): BadgeProps["variant"] {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "RESTRICTED":
      return "warning";
    case "FROZEN":
      return "destructive";
    case "CLOSED":
      return "outline";
  }
}

function accrualStatusVariant(
  status: WelfareAccrualStatus,
): BadgeProps["variant"] {
  switch (status) {
    case "CREDITED":
      return "success";
    case "PENDING":
      return "info";
    case "BLOCKED":
      return "warning";
    case "CANCELLED":
    case "REVERSED":
      return "outline";
  }
}

function invoiceStatusVariant(status: string): BadgeProps["variant"] {
  switch (status) {
    case "ISSUED":
      return "success";
    case "PENDING_OTP":
      return "warning";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

function welfareInvoiceDocumentHref(accrualId: string): string {
  return `/api/welfare/accruals/${encodeURIComponent(accrualId)}/invoice-document`;
}

function walletQuery(
  current: WalletSearchParams,
  patch: QueryPatch,
): Record<string, string> {
  const next: Record<string, string> = {};
  const walletId =
    patch.walletId === undefined ? current.walletId : patch.walletId;
  const entryCursor =
    patch.entryCursor === undefined ? current.entryCursor : patch.entryCursor;
  const accrualCursor =
    patch.accrualCursor === undefined
      ? current.accrualCursor
      : patch.accrualCursor;
  const accrualStatus =
    patch.accrualStatus === undefined
      ? current.accrualStatus
      : patch.accrualStatus;

  if (walletId !== undefined && walletId !== null) {
    next["walletId"] = walletId;
  }
  if (entryCursor !== undefined && entryCursor !== null) {
    next["entryCursor"] = entryCursor;
  }
  if (accrualCursor !== undefined && accrualCursor !== null) {
    next["accrualCursor"] = accrualCursor;
  }
  if (accrualStatus !== undefined && accrualStatus !== null) {
    next["accrualStatus"] = accrualStatus;
  }

  return next;
}

function WalletAccountSelector({
  wallets,
  selected,
}: Readonly<{
  wallets: readonly WalletSummary[];
  selected: WalletSummary;
}>): ReactElement | null {
  if (wallets.length <= 1) {
    return null;
  }

  return (
    <ContentDataSurface
      title="Wallet accounts"
      description="Choose the Welfare Fund wallet associated with your dealer organization."
      padded
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {wallets.map((wallet) => {
          const active = wallet.walletId === selected.walletId;

          return (
            <Button
              key={wallet.walletId}
              asChild
              variant={active ? "secondary" : "outline"}
              className="h-auto min-h-20 justify-start px-4 py-3 text-left"
            >
              <Link
                href={{
                  pathname: "/wallet",
                  query: { walletId: wallet.walletId },
                }}
                aria-current={active ? "page" : undefined}
                scroll={false}
              >
                <span className="grid min-w-0 gap-1">
                  <span className="truncate text-body-sm font-semibold">
                    {wallet.ownerOrgUnitName}
                  </span>
                  <span className="text-caption text-muted-readable">
                    {humanize(wallet.ownerOrgUnitType)} · {wallet.currency}
                  </span>
                </span>
              </Link>
            </Button>
          );
        })}
      </div>
    </ContentDataSurface>
  );
}

function WalletHero({
  wallet,
}: Readonly<{ wallet: WalletSummary }>): ReactElement {
  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.09] via-card to-card shadow-sm shadow-foreground/5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
      />
      <CardContent className="grid min-w-0 gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)] lg:items-center">
        <div className="grid min-w-0 gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">Welfare Fund</Badge>
            <Badge variant={walletStatusVariant(wallet.status)}>
              {humanize(wallet.status)}
            </Badge>
            <Badge variant="outline">{wallet.currency}</Badge>
          </div>

          <div className="grid min-w-0 gap-2">
            <p className="text-overline text-muted-readable">
              Available balance
            </p>
            <WalletAnimatedAmount
              amount={wallet.availableBalance}
              currency={wallet.currency}
              className="max-w-full whitespace-nowrap text-[clamp(2rem,4vw,3rem)] leading-none font-semibold tracking-tight text-foreground"
            />
            <p className="max-w-3xl text-body-sm text-muted-readable">
              Posted funds available after wallet reservations. Pending Welfare
              Fund credits remain separate until settlement is posted.
            </p>
          </div>
        </div>

        <div className="grid min-w-0 gap-1.5 rounded-2xl border border-border/70 bg-background/70 px-4 py-3.5 shadow-xs supports-[backdrop-filter]:bg-background/60 supports-[backdrop-filter]:backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-2 text-body-sm font-semibold">
            <Landmark
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="truncate">{wallet.ownerOrgUnitName}</span>
          </div>
          <p className="text-caption text-muted-readable">
            {humanize(wallet.ownerOrgUnitType)} wallet
          </p>
          <p className="text-caption text-muted-readable text-tabular">
            Updated {formatDateTime(wallet.updatedAt)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function BalanceMetrics({
  wallet,
}: Readonly<{ wallet: WalletSummary }>): ReactElement {
  return (
    <section
      aria-labelledby="wallet-balance-summary-title"
      className="grid min-w-0 gap-3"
    >
      <div className="flex min-w-0 flex-col gap-1 px-0.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 id="wallet-balance-summary-title" className="text-card-title">
            Wallet balance summary
          </h2>
          <p className="text-caption text-muted-readable">
            Current posted, pending, reserved, and account-state position.
          </p>
        </div>
        <p className="shrink-0 text-caption text-muted-readable">
          Currency ·{" "}
          <span className="font-medium text-foreground">{wallet.currency}</span>
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ContentMetricCard
          presentation="dashboard"
          tone="primary"
          label="Posted balance"
          value={
            <WalletAnimatedAmount
              amount={wallet.postedBalance}
              currency={wallet.currency}
              delayMs={80}
            />
          }
          description="Posted ledger"
          icon={<CircleDollarSign aria-hidden="true" />}
        />
        <ContentMetricCard
          presentation="dashboard"
          tone={wallet.pendingCredit === "0.00" ? "default" : "info"}
          label="Pending credit"
          value={
            <WalletAnimatedAmount
              amount={wallet.pendingCredit}
              currency={wallet.currency}
              delayMs={140}
            />
          }
          description="Awaiting posting"
          icon={<Clock3 aria-hidden="true" />}
        />
        <ContentMetricCard
          presentation="dashboard"
          tone={wallet.reservedBalance === "0.00" ? "default" : "warning"}
          label="Reserved"
          value={
            <WalletAnimatedAmount
              amount={wallet.reservedBalance}
              currency={wallet.currency}
              delayMs={200}
            />
          }
          description="Temporarily held"
          icon={<ShieldCheck aria-hidden="true" />}
        />
        <ContentMetricCard
          presentation="dashboard"
          tone={wallet.status === "ACTIVE" ? "success" : "warning"}
          label="Wallet status"
          value={
            <span className="block truncate text-xl leading-tight font-semibold tracking-tight sm:text-2xl">
              {humanize(wallet.status)}
            </span>
          }
          description="Account state"
          icon={<WalletCards aria-hidden="true" />}
        />
      </div>
    </section>
  );
}

function walletMoneyMinorUnits(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  if (
    whole === undefined ||
    !/^\d+$/u.test(whole) ||
    !/^\d*$/u.test(fraction)
  ) {
    throw new Error("Wallet monetary value is invalid.");
  }
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
}

function walletRatioPercent(numerator: bigint, denominator: bigint): number {
  if (denominator <= 0n) return 0;
  const rounded = (numerator * 100n + denominator / 2n) / denominator;
  return Number(rounded > 100n ? 100n : rounded);
}

function WalletFinancialSignals({
  wallet,
}: Readonly<{ wallet: WalletSummary }>): ReactElement {
  const posted = walletMoneyMinorUnits(wallet.postedBalance);
  const available = walletMoneyMinorUnits(wallet.availableBalance);
  const reserved = walletMoneyMinorUnits(wallet.reservedBalance);
  const pending = walletMoneyMinorUnits(wallet.pendingCredit);
  const liquidityPercent = walletRatioPercent(available, posted);
  const reservedPercent = walletRatioPercent(reserved, posted);
  const pipelineBase = posted + pending;
  const pendingPercent = walletRatioPercent(pending, pipelineBase);

  const nextAction =
    wallet.status !== "ACTIVE"
      ? "Review wallet account state"
      : reserved > 0n
        ? "Monitor reserved funds"
        : pending > 0n
          ? "Track pending settlement"
          : "Wallet is fully operational";

  return (
    <ContentDataSurface
      title="Wallet intelligence"
      description="Deterministic liquidity and settlement signals calculated from the authoritative wallet balances."
      padded
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-1 rounded-xl border border-border/70 bg-muted/20 p-3.5">
          <span className="text-caption text-muted-readable">
            Liquidity readiness
          </span>
          <span className="text-xl font-semibold text-foreground text-tabular">
            {String(liquidityPercent)}%
          </span>
          <span className="text-caption text-muted-readable">
            Available from posted balance
          </span>
        </div>
        <div className="grid gap-1 rounded-xl border border-border/70 bg-muted/20 p-3.5">
          <span className="text-caption text-muted-readable">
            Pending pipeline
          </span>
          <span className="text-xl font-semibold text-foreground text-tabular">
            {formatMoney(wallet.pendingCredit, wallet.currency)}
          </span>
          <span className="text-caption text-muted-readable">
            {String(pendingPercent)}% of posted + pending funds
          </span>
        </div>
        <div className="grid gap-1 rounded-xl border border-border/70 bg-muted/20 p-3.5">
          <span className="text-caption text-muted-readable">
            Reserved exposure
          </span>
          <span className="text-xl font-semibold text-foreground text-tabular">
            {formatMoney(wallet.reservedBalance, wallet.currency)}
          </span>
          <span className="text-caption text-muted-readable">
            {String(reservedPercent)}% of posted balance protected
          </span>
        </div>
        <div className="grid gap-1 rounded-xl border border-border/70 bg-muted/20 p-3.5">
          <span className="text-caption text-muted-readable">
            Next attention
          </span>
          <span className="text-body-sm font-semibold text-foreground">
            {nextAction}
          </span>
          <span className="text-caption text-muted-readable">
            Rule-based signal, not a financial recommendation
          </span>
        </div>
      </div>
    </ContentDataSurface>
  );
}

function EntryDirection({
  entry,
}: Readonly<{ entry: WalletEntry }>): ReactElement {
  const credit = entry.direction === "CREDIT";

  return (
    <div
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-xl border",
        credit
          ? "border-success/20 bg-success/10 text-success"
          : "border-destructive/20 bg-destructive/10 text-destructive",
      )}
      aria-hidden="true"
    >
      {credit ? (
        <ArrowDownLeft className="size-4" />
      ) : (
        <ArrowUpRight className="size-4" />
      )}
    </div>
  );
}

function TransactionCards({
  entries,
}: Readonly<{ entries: readonly WalletEntry[] }>): ReactElement {
  return (
    <div className="grid gap-3 md:hidden">
      {entries.map((entry) => (
        <Card key={entry.walletEntryId} className="shadow-none">
          <CardContent className="grid gap-4 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <EntryDirection entry={entry} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-semibold">
                  {ENTRY_LABELS[entry.entryType]}
                </p>
                <p className="text-caption text-muted-readable text-tabular">
                  {formatDateTime(entry.effectiveAt)}
                </p>
              </div>
              <p
                className={cn(
                  "shrink-0 text-body-sm font-semibold text-tabular",
                  entry.direction === "CREDIT"
                    ? "text-success"
                    : "text-destructive",
                )}
              >
                {entry.direction === "CREDIT" ? "+" : "−"}
                {formatMoney(entry.amount, entry.currency)}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-caption text-muted-readable">
              <span>{humanize(entry.sourceType)}</span>
              <span className="text-tabular">
                Posted {formatDateTime(entry.postedAt)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TransactionTable({
  entries,
}: Readonly<{ entries: readonly WalletEntry[] }>): ReactElement {
  return (
    <div className="hidden overflow-x-auto md:block">
      <Table className="min-w-[62rem]">
        <TableHeader>
          <TableRow>
            <TableHead>Transaction</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-center">Effective</TableHead>
            <TableHead className="text-center">Posted</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.walletEntryId}>
              <TableCell>
                <div className="flex min-w-0 items-center gap-3">
                  <EntryDirection entry={entry} />
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium">
                      {ENTRY_LABELS[entry.entryType]}
                    </p>
                    <p className="text-caption text-muted-readable">
                      {entry.direction === "CREDIT" ? "Credit" : "Debit"}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-body-sm text-muted-readable">
                {humanize(entry.sourceType)}
              </TableCell>
              <TableCell className="text-center text-caption text-muted-readable text-tabular">
                {formatDateTime(entry.effectiveAt)}
              </TableCell>
              <TableCell className="text-center text-caption text-muted-readable text-tabular">
                {formatDateTime(entry.postedAt)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right text-body-sm font-semibold text-tabular",
                  entry.direction === "CREDIT"
                    ? "text-success"
                    : "text-destructive",
                )}
              >
                {entry.direction === "CREDIT" ? "+" : "−"}
                {formatMoney(entry.amount, entry.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CursorPagination({
  kind,
  query,
  walletId,
  itemCount,
  nextCursor,
  itemLabel,
}: Readonly<{
  kind: CursorPaginationKind;
  query: WalletSearchParams;
  walletId: string;
  itemCount: number;
  nextCursor: string | null;
  itemLabel: string;
}>): ReactElement {
  const currentCursor =
    kind === "entries" ? query.entryCursor : query.accrualCursor;
  const firstPatch: QueryPatch =
    kind === "entries"
      ? { walletId, entryCursor: null }
      : { walletId, accrualCursor: null };
  const nextPatch: QueryPatch =
    kind === "entries"
      ? { walletId, entryCursor: nextCursor }
      : { walletId, accrualCursor: nextCursor };

  return (
    <div className="flex min-w-0 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-caption text-muted-readable">
        Showing {itemCount.toLocaleString("en-IN")} of up to{" "}
        {WALLET_ACTIVITY_PAGE_SIZE.toLocaleString("en-IN")} {itemLabel} on this
        page.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {currentCursor === undefined ? null : (
          <Button asChild variant="outline" size="sm">
            <Link
              href={{
                pathname: "/wallet",
                query: walletQuery(query, firstPatch),
              }}
              scroll={false}
            >
              First {WALLET_ACTIVITY_PAGE_SIZE}
            </Link>
          </Button>
        )}

        {nextCursor === null ? (
          <Badge variant="secondary">End of results</Badge>
        ) : (
          <Button asChild size="sm">
            <Link
              href={{
                pathname: "/wallet",
                query: walletQuery(query, nextPatch),
              }}
              scroll={false}
            >
              Next {WALLET_ACTIVITY_PAGE_SIZE}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function Transactions({
  data,
  query,
  capabilities,
}: Readonly<{
  data: WalletWorkspaceData;
  query: WalletSearchParams;
  capabilities: WalletCapabilities;
}>): ReactElement {
  if (!capabilities.canReadEntries) {
    return (
      <ContentStatus
        variant="default"
        title="Transaction history is not available"
        description="Your account does not currently include the wallet entry read permission."
        icon={<ShieldCheck aria-hidden="true" />}
      />
    );
  }

  const wallet = data.selectedWallet;
  const entries = data.entries;

  if (wallet === null || entries === null) {
    return (
      <ContentEmptyState
        icon={<ReceiptText aria-hidden="true" />}
        title="No wallet transactions yet"
        description="Posted Welfare Fund credits and other authorized ledger entries will appear here."
      />
    );
  }

  return (
    <ContentDataSurface
      title="Transactions"
      description="Authoritative posted ledger activity for this Welfare Fund wallet."
      padded={false}
      className="min-w-0 overflow-hidden [&>[data-slot=card-footer]]:p-0"
      footer={
        <CursorPagination
          kind="entries"
          query={query}
          walletId={wallet.walletId}
          itemCount={entries.items.length}
          nextCursor={entries.nextCursor}
          itemLabel="transactions"
        />
      }
    >
      {entries.items.length === 0 ? (
        <div className="p-4 sm:p-6">
          <ContentEmptyState
            icon={<ReceiptText aria-hidden="true" />}
            title="No wallet transactions on this page"
            description={
              query.entryCursor === undefined
                ? "Posted Welfare Fund credits and other authorized ledger entries will appear here."
                : "No additional posted ledger entries were returned. Return to the first page to review recent transactions."
            }
          />
        </div>
      ) : (
        <div className="p-3 md:p-0">
          <TransactionCards entries={entries.items} />
          <TransactionTable entries={entries.items} />
        </div>
      )}
    </ContentDataSurface>
  );
}

function InvoiceDocumentAction({
  accrual,
  compact = false,
}: Readonly<{
  accrual: WelfareAccrual;
  compact?: boolean;
}>): ReactElement {
  if (!accrual.invoicePdfAvailable) {
    return (
      <span
        className="text-caption text-muted-readable"
        aria-label="Invoice PDF unavailable"
      >
        Not available
      </span>
    );
  }

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={compact ? "w-full" : undefined}
    >
      <a
        href={welfareInvoiceDocumentHref(accrual.accrualId)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View PDF for invoice ${accrual.invoiceNumber}`}
      >
        <FileText aria-hidden="true" className="size-4" />
        View PDF
      </a>
    </Button>
  );
}

function AccrualCard({
  accrual,
}: Readonly<{ accrual: WelfareAccrual }>): ReactElement {
  return (
    <Card className="shadow-none">
      <CardContent className="grid gap-4 p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-body-sm font-semibold text-tabular">
              {accrual.invoiceNumber}
            </p>
            <p className="text-caption text-muted-readable text-tabular">
              Invoice date {formatDate(accrual.invoiceDate)}
            </p>
          </div>
          <Badge variant={accrualStatusVariant(accrual.status)}>
            {humanize(accrual.status)}
          </Badge>
        </div>

        <div className="grid gap-2">
          <div className="min-w-0">
            <p className="text-caption text-muted-readable">Customer</p>
            <p
              className="truncate text-body-sm font-medium"
              title={accrual.customerName ?? undefined}
            >
              {accrual.customerName ?? "Customer unavailable"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-caption text-muted-readable">
              Invoice status
            </span>
            <Badge variant={invoiceStatusVariant(accrual.invoiceStatus)}>
              {humanize(accrual.invoiceStatus)}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/45 p-3">
          <div>
            <p className="text-caption text-muted-readable">Welfare amount</p>
            <p className="text-body-sm font-semibold text-tabular">
              {formatMoney(accrual.welfareAmount, accrual.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-caption text-muted-readable">Credit due</p>
            <p className="text-body-sm font-medium text-tabular">
              {formatDate(accrual.creditDueAt)}
            </p>
          </div>
        </div>

        <InvoiceDocumentAction accrual={accrual} compact />

        {accrual.blockedReason !== null ? (
          <p className="text-caption text-warning-foreground">
            {accrual.blockedReason}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AccrualTable({
  accruals,
}: Readonly<{ accruals: readonly WelfareAccrual[] }>): ReactElement {
  return (
    <div className="hidden overflow-x-auto md:block">
      <Table className="min-w-[86rem]">
        <TableHeader>
          <TableRow>
            <TableHead>Invoice date</TableHead>
            <TableHead>Invoice number</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-center">Invoice status</TableHead>
            <TableHead className="text-center">Welfare status</TableHead>
            <TableHead className="text-right">Welfare amount</TableHead>
            <TableHead className="text-center">Credit due</TableHead>
            <TableHead className="text-center">Invoice</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accruals.map((accrual) => (
            <TableRow key={accrual.accrualId}>
              <TableCell className="whitespace-nowrap text-body-sm text-tabular">
                {formatDate(accrual.invoiceDate)}
              </TableCell>
              <TableCell className="max-w-64 truncate text-body-sm font-medium text-tabular">
                {accrual.invoiceNumber}
              </TableCell>
              <TableCell className="max-w-80 text-body-sm">
                <span
                  className="block truncate"
                  title={accrual.customerName ?? undefined}
                >
                  {accrual.customerName ?? "Customer unavailable"}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={invoiceStatusVariant(accrual.invoiceStatus)}>
                  {humanize(accrual.invoiceStatus)}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={accrualStatusVariant(accrual.status)}>
                  {humanize(accrual.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-body-sm font-semibold text-tabular">
                {formatMoney(accrual.welfareAmount, accrual.currency)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-center text-caption text-muted-readable text-tabular">
                {formatDate(accrual.creditDueAt)}
              </TableCell>
              <TableCell className="text-center">
                <InvoiceDocumentAction accrual={accrual} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AccrualFilter({
  query,
  walletId,
}: Readonly<{
  query: WalletSearchParams;
  walletId: string;
}>): ReactElement {
  const options: ReadonlyArray<WelfareAccrualStatus | null> = [
    null,
    ...ACCRUAL_STATUSES,
  ];

  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      {options.map((status) => {
        const active = (query.accrualStatus ?? null) === status;
        const label = status === null ? "All" : humanize(status);

        return (
          <Button
            key={status ?? "all"}
            asChild
            variant={active ? "secondary" : "outline"}
            size="sm"
          >
            <Link
              href={{
                pathname: "/wallet",
                query: walletQuery(query, {
                  walletId,
                  accrualStatus: status,
                  accrualCursor: null,
                }),
              }}
              aria-current={active ? "page" : undefined}
              scroll={false}
            >
              {label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

function AccrualHistory({
  data,
  query,
  capabilities,
}: Readonly<{
  data: WalletWorkspaceData;
  query: WalletSearchParams;
  capabilities: WalletCapabilities;
}>): ReactElement {
  const selectedWallet = data.selectedWallet;

  if (selectedWallet === null) {
    return <></>;
  }

  if (!capabilities.canReadWelfareAccruals) {
    return (
      <ContentStatus
        variant="default"
        title="Welfare Fund history is not available"
        description="Your account does not currently include the Welfare Fund accrual read permission."
        icon={<ShieldCheck aria-hidden="true" />}
      />
    );
  }

  const accruals = data.accruals;

  if (accruals === null) {
    return (
      <ContentEmptyState
        icon={<CalendarClock aria-hidden="true" />}
        title="Welfare Fund history is unavailable"
        description="No accrual page was returned for the selected wallet."
      />
    );
  }

  return (
    <ContentDataSurface
      title="Welfare Fund history"
      description="Invoice-based accruals and settlement state for your dealer organization."
      toolbar={
        <AccrualFilter query={query} walletId={selectedWallet.walletId} />
      }
      padded={false}
      className="min-w-0 overflow-hidden [&>[data-slot=card-footer]]:p-0"
      footer={
        <CursorPagination
          kind="accruals"
          query={query}
          walletId={selectedWallet.walletId}
          itemCount={accruals.items.length}
          nextCursor={accruals.nextCursor}
          itemLabel="accruals"
        />
      }
    >
      {accruals.items.length === 0 ? (
        <div className="p-4 sm:p-6">
          <ContentEmptyState
            icon={<CalendarClock aria-hidden="true" />}
            title="No matching Welfare Fund history"
            description={
              query.accrualCursor !== undefined
                ? "No additional accruals were returned. Return to the first page or adjust the status filter."
                : query.accrualStatus === undefined
                  ? "Welfare Fund accruals will appear here after eligible invoiced sales are processed."
                  : `No ${humanize(query.accrualStatus).toLowerCase()} accruals were found.`
            }
          />
        </div>
      ) : (
        <div className="p-3 md:p-0">
          <div className="grid gap-3 md:hidden">
            {accruals.items.map((accrual) => (
              <AccrualCard key={accrual.accrualId} accrual={accrual} />
            ))}
          </div>
          <AccrualTable accruals={accruals.items} />
        </div>
      )}
    </ContentDataSurface>
  );
}

export function WalletPage({
  data,
  query,
  capabilities,
}: WalletPageProps): ReactElement {
  const wallet = data.selectedWallet;

  return (
    <ContentRoot
      width="full"
      density="compact"
      aria-labelledby="wallet-page-title"
      className="min-w-0"
    >
      <Tabs
        defaultValue={query.tab ?? "welfare-fund"}
        className="min-w-0 gap-4"
      >
        <WalletWorkspaceHeader
          titleId="wallet-page-title"
          title="Wallet"
          description="Track Welfare Fund balances and the full Credit Note performance, offer, purchase, and settlement cycle."
          actions={
            <TabsList
              variant="workspace"
              aria-label="Wallet types"
              className="h-10 w-auto min-w-0 !gap-2 rounded-xl border border-border/70 bg-muted/35 !p-1.5 shadow-none"
            >
              <TabsTrigger
                value="welfare-fund"
                className="h-7 min-w-[8.75rem] !flex-none justify-center gap-2 rounded-lg border border-transparent px-3 data-[state=active]:border-border/80"
              >
                <CircleDollarSign aria-hidden="true" className="size-4" />
                <span>Welfare Fund</span>
              </TabsTrigger>
              <TabsTrigger
                value="credit-note"
                className="h-7 min-w-[8.25rem] !flex-none justify-center gap-2 rounded-lg border border-transparent px-3 data-[state=active]:border-border/80"
              >
                <ReceiptText aria-hidden="true" className="size-4" />
                <span>Credit Note</span>
              </TabsTrigger>
            </TabsList>
          }
        />

        <TabsContent value="welfare-fund" className="grid min-w-0 gap-4">
          {wallet === null ? (
            <ContentEmptyState
              icon={<WalletCards aria-hidden="true" />}
              title="Welfare Fund wallet is not available"
              description="No Welfare Fund wallet is currently assigned to your authenticated dealer organization. Contact Ozotec support if you expect an active wallet."
            />
          ) : (
            <>
              <WalletAccountSelector
                wallets={data.welfareWallets}
                selected={wallet}
              />
              <WalletHero wallet={wallet} />
              <BalanceMetrics wallet={wallet} />
              <WalletFinancialSignals wallet={wallet} />

              {wallet.status !== "ACTIVE" ? (
                <ContentStatus
                  variant="warning"
                  title={`Wallet status: ${humanize(wallet.status)}`}
                  description="Balances and history remain visible. Availability of wallet operations is controlled by the backend wallet status and policy."
                  icon={<ShieldCheck aria-hidden="true" />}
                />
              ) : null}

              <Transactions
                data={data}
                query={query}
                capabilities={capabilities}
              />
              <AccrualHistory
                data={data}
                query={query}
                capabilities={capabilities}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="credit-note" className="grid min-w-0 gap-4">
          <CreditNoteWorkspace
            overview={data.creditNoteOverview}
            insights={data.creditNoteInsights}
            transactions={data.creditNoteTransactions}
            earnings={data.creditNoteEarnings}
            settlements={data.creditNoteSettlements}
            invoices={data.creditNotePurchaseInvoices}
            query={query}
            capabilities={capabilities}
          />
        </TabsContent>
      </Tabs>
    </ContentRoot>
  );
}

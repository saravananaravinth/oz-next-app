// oz-next-app/src/features/wallet/ui/credit-note-workspace.tsx
import Link from "next/link";
import {
  PurchaseInvoices,
  PurchaseTable,
  PurchaseEvidenceDetail,
} from "./purchase-invoices";
import { CreditNotePolicyGuide } from "./credit-note-policy-guide";
import { purchaseCycleLink, walletQuery } from "../utils/purchase-links";
import type {
  PurchasePage,
  PurchaseDetail,
} from "../contracts/purchases.schema";
import type { ReactElement } from "react";
import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CircleGauge,
  Gift,
  Info,
  ReceiptText,
  RefreshCw,
  Rocket,
  ShoppingCart,
  Target,
  Trophy,
  TriangleAlert,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentEmptyState,
  ContentMetricCard,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type {
  CreditNoteEarningHistory,
  CreditNoteEarningHistoryPage,
  CreditNoteOfferStatus,
  CreditNoteOverview,
  CreditNoteSettlementHistory,
  CreditNoteSettlementHistoryPage,
  CreditNoteSettlementStatus,
  CreditNoteTransactionHistory,
  CreditNoteTransactionHistoryPage,
  WalletSearchParams,
} from "@/features/wallet/contracts/wallet.schema";
import type { WalletCapabilities } from "@/features/wallet/policies/wallet.policy";
import { formatMoney } from "@/features/wallet/utils/wallet-money";

export type CreditNoteWorkspaceProps = Readonly<{
  overview: CreditNoteOverview | null;
  transactions: CreditNoteTransactionHistoryPage | null;
  earnings: CreditNoteEarningHistoryPage | null;
  settlements: CreditNoteSettlementHistoryPage | null;
  invoices: PurchasePage | null;
  purchaseActivity: PurchasePage | null;
  purchaseDetail: PurchaseDetail | null;
  query: WalletSearchParams;
  capabilities: WalletCapabilities;
}>;

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

function formatDate(value: string): string {
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00+05:30`));
}

function formatPeriodEnd(endExclusive: string): string {
  const end = new Date(`${endExclusive}T00:00:00+05:30`);
  end.setDate(end.getDate() - 1);
  return DATE_FORMATTER.format(end);
}

function formatDateTime(value: string | null): string {
  return value === null
    ? "Not yet synced"
    : DATE_TIME_FORMATTER.format(new Date(value));
}

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function offerStatusVariant(
  status: CreditNoteOfferStatus,
): BadgeProps["variant"] {
  switch (status) {
    case "ACTIVE":
    case "QUALIFIED":
      return "success";
    case "PENDING_QUALIFICATION":
      return "info";
    case "NOT_QUALIFIED":
    case "EXPIRED":
      return "warning";
    case "FINALIZED":
      return "outline";
  }
}

function settlementStatusVariant(
  status: CreditNoteSettlementStatus,
): BadgeProps["variant"] {
  switch (status) {
    case "SETTLED":
      return "success";
    case "PENDING":
    case "POSTING":
      return "info";
    case "BLOCKED_PROVIDER_CONFIGURATION":
    case "RECONCILIATION_REQUIRED":
    case "ADJUSTMENT_REQUIRED":
      return "warning";
    case "NOT_DUE":
    case "NO_BENEFIT":
      return "outline";
  }
}

function OpportunityBanner({
  overview,
}: Readonly<{ overview: CreditNoteOverview }>): ReactElement {
  const tone = overview.opportunityMessage.tone;
  const icon =
    tone === "SUCCESS" ? (
      <Trophy aria-hidden="true" />
    ) : tone === "WARNING" ? (
      <Rocket aria-hidden="true" />
    ) : (
      <Info aria-hidden="true" />
    );
  const variant =
    tone === "SUCCESS" ? "success" : tone === "WARNING" ? "warning" : "info";

  return (
    <ContentStatus
      variant={variant}
      icon={icon}
      title={overview.opportunityMessage.title}
      description={overview.opportunityMessage.description}
      actions={
        overview.opportunityMessage.hypotheticalMissedAmount !== null ? (
          <Badge
            variant="warning"
            className="h-7 px-3 text-body-sm text-tabular"
          >
            Missed opportunity{" "}
            {formatMoney(
              overview.opportunityMessage.hypotheticalMissedAmount,
              overview.currency,
            )}
          </Badge>
        ) : undefined
      }
    />
  );
}

function CreditNoteHero({
  overview,
}: Readonly<{ overview: CreditNoteOverview }>): ReactElement {
  const offerActive = overview.offer.isActive;

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.11] via-card to-card shadow-sm shadow-foreground/5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent"
      />
      <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)] lg:items-center">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={offerStatusVariant(overview.offer.status)}>
              {offerActive
                ? "Purchase offer active"
                : humanize(overview.offer.status)}
            </Badge>
            <Badge variant="outline">{overview.offer.period.label}</Badge>
          </div>

          <div className="grid gap-2">
            <p className="text-overline text-muted-readable">
              {offerActive
                ? "Earn on every approved purchase"
                : "Current offer status"}
            </p>
            <p className="text-[clamp(2rem,4.2vw,3.25rem)] leading-none font-semibold tracking-tight text-foreground text-tabular">
              {formatMoney(
                overview.offer.creditPerApprovedPurchaseVehicle,
                overview.currency,
              )}
              <span className="ms-2 text-body-sm font-medium tracking-normal text-muted-readable">
                / vehicle
              </span>
            </p>
            <p className="max-w-3xl text-body-sm text-muted-readable">
              {offerActive
                ? `${String(overview.offer.approvedPurchaseVehicleCount)} approved vehicle purchase${overview.offer.approvedPurchaseVehicleCount === 1 ? "" : "s"} currently count toward ${overview.settlement.period.label} Credit Note settlement.`
                : `This purchase offer activates only after the previous month's retail target is achieved. Your live next-offer progress is shown below.`}
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/75 p-4 shadow-xs supports-[backdrop-filter]:bg-background/65 supports-[backdrop-filter]:backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-caption font-medium text-muted-readable">
              Accrued this offer
            </span>
            <Badge variant={offerActive ? "success" : "outline"}>
              {String(overview.offer.approvedPurchaseVehicleCount)} vehicles
            </Badge>
          </div>
          <p className="text-2xl font-semibold tracking-tight text-foreground text-tabular">
            {formatMoney(overview.offer.accruedAmount, overview.currency)}
          </p>
          <div className="flex items-start gap-2 text-caption text-muted-readable">
            <CalendarClock
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>
              Offer closes {formatDate(overview.offer.closesAt)}. Final
              settlement is scheduled in {overview.settlement.period.label}.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreditNoteMetrics({
  overview,
}: Readonly<{ overview: CreditNoteOverview }>): ReactElement {
  return (
    <section
      aria-labelledby="credit-note-performance-summary-title"
      className="grid min-w-0 gap-3"
    >
      <div className="min-w-0 px-0.5">
        <h2
          id="credit-note-performance-summary-title"
          className="text-card-title"
        >
          Credit Note performance summary
        </h2>
        <p className="text-caption text-muted-readable">
          Current benefit, offer accrual, qualification progress, and lifetime
          settlement.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ContentMetricCard
          presentation="dashboard"
          tone="info"
          label="Pending Credit Note"
          value={formatMoney(
            overview.unsettledCreditNoteBalance,
            overview.currency,
          )}
          description="Awaiting settlement"
          icon={<BadgeIndianRupee aria-hidden="true" />}
        />
        <ContentMetricCard
          presentation="dashboard"
          tone={overview.offer.isActive ? "success" : "default"}
          label="Current offer earned"
          value={formatMoney(overview.offer.accruedAmount, overview.currency)}
          description={`${String(overview.offer.approvedPurchaseVehicleCount)} approved vehicles`}
          icon={<ShoppingCart aria-hidden="true" />}
        />
        <ContentMetricCard
          presentation="dashboard"
          tone={overview.performance.targetAchieved ? "success" : "warning"}
          label="Next offer progress"
          value={`${String(overview.performance.eligibleRetailVehicleCount)} / ${String(overview.performance.targetRetailVehicleCount)}`}
          description={
            overview.performance.targetAchieved
              ? "Target achieved"
              : `${String(overview.performance.vehiclesRemaining)} remaining`
          }
          icon={<Target aria-hidden="true" />}
        />
        <ContentMetricCard
          presentation="dashboard"
          tone="success"
          label="Lifetime settled"
          value={formatMoney(overview.lifetimeSettledAmount, overview.currency)}
          description="Provider settled"
          icon={<Trophy aria-hidden="true" />}
        />
      </div>
    </section>
  );
}

function EligibilityTracker({
  overview,
}: Readonly<{ overview: CreditNoteOverview }>): ReactElement {
  const achieved = overview.performance.targetAchieved;

  return (
    <ContentDataSurface
      title={`Unlock your ${overview.performance.period.endExclusive === overview.offer.period.start ? overview.offer.period.label : "next-month"} offer`}
      description={`${overview.performance.period.label} retail performance determines the purchase offer for the following calendar month.`}
      padded
      className="overflow-hidden"
      actions={
        <Badge variant={achieved ? "success" : "warning"}>
          {achieved
            ? "Target achieved"
            : `${String(overview.performance.vehiclesRemaining)} to go`}
        </Badge>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-center">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-foreground text-tabular">
                {String(overview.performance.eligibleRetailVehicleCount)}
                <span className="ms-1 text-lg font-medium text-muted-readable">
                  / {String(overview.performance.targetRetailVehicleCount)}{" "}
                  vehicles
                </span>
              </p>
              <p className="mt-1 text-body-sm text-muted-readable">
                Eligible B2C/customer retail vehicle sales counted for{" "}
                {overview.performance.period.label}.
              </p>
            </div>
            <p className="text-body-sm font-semibold text-foreground text-tabular">
              {String(overview.performance.progressPercent)}%
            </p>
          </div>

          <Progress
            value={overview.performance.progressPercent}
            aria-label={`Credit Note eligibility progress: ${String(overview.performance.progressPercent)} percent`}
            className="h-3"
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-3">
              <p className="text-caption text-muted-readable">
                Target deadline
              </p>
              <p className="mt-1 text-body-sm font-semibold text-foreground">
                {formatPeriodEnd(overview.performance.period.endExclusive)}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/25 px-3.5 py-3">
              <p className="text-caption text-muted-readable">
                Reward after qualification
              </p>
              <p className="mt-1 text-body-sm font-semibold text-foreground text-tabular">
                {formatMoney(
                  overview.policy.purchaseCreditAmount,
                  overview.currency,
                )}{" "}
                / approved purchase
              </p>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "grid gap-3 rounded-2xl border p-4",
            achieved
              ? "border-success/25 bg-success/[0.06]"
              : "border-warning/25 bg-warning/[0.06]",
          )}
        >
          <span className="grid size-11 place-items-center rounded-2xl bg-background shadow-xs">
            {achieved ? (
              <CheckCircle2
                className="size-5 text-success"
                aria-hidden="true"
              />
            ) : (
              <CircleGauge className="size-5 text-warning" aria-hidden="true" />
            )}
          </span>
          <div className="grid gap-1">
            <p className="text-card-title text-foreground">
              {achieved
                ? "Next offer is secured"
                : `${String(overview.performance.vehiclesRemaining)} more vehicle${overview.performance.vehiclesRemaining === 1 ? "" : "s"} to unlock it`}
            </p>
            <p className="text-body-sm text-muted-readable">
              {achieved
                ? `Your next-month ₹${overview.policy.purchaseCreditAmount} per approved purchase offer is locked in.`
                : "Every additional eligible retail delivery moves you closer to next month’s Credit Note opportunity."}
            </p>
          </div>
        </div>
      </div>
    </ContentDataSurface>
  );
}

function ProcessTimeline({
  overview,
}: Readonly<{ overview: CreditNoteOverview }>): ReactElement {
  const steps = [
    {
      title: "1. Sell retail vehicles",
      period: overview.offer.qualificationPerformance.period.label,
      description: `${String(overview.offer.qualificationPerformance.eligibleRetailVehicleCount)} of ${String(overview.offer.qualificationPerformance.targetRetailVehicleCount)} eligible retail vehicles qualified this offer.`,
      icon: <Target aria-hidden="true" />,
      complete: overview.offer.qualificationPerformance.targetAchieved,
    },
    {
      title: "2. Earn on purchases",
      period: overview.offer.period.label,
      description: `${String(overview.offer.approvedPurchaseVehicleCount)} approved purchase vehicles × ${formatMoney(overview.offer.creditPerApprovedPurchaseVehicle, overview.currency)}.`,
      icon: <Gift aria-hidden="true" />,
      complete: overview.offer.status === "FINALIZED",
    },
    {
      title: "3. Credit Note settlement",
      period: formatDate(overview.settlement.period.start),
      description:
        overview.settlement.status === "SETTLED"
          ? `Settled as ${overview.settlement.zohoCreditNoteNumber ?? "Zoho Credit Note"}.`
          : `Finalized benefit is scheduled for settlement on ${formatDate(overview.settlement.period.start)}.`,
      icon: <ReceiptText aria-hidden="true" />,
      complete: overview.settlement.status === "SETTLED",
    },
  ] as const;

  return (
    <ContentDataSurface
      title="How the Credit Note cycle works"
      description="This month's retail performance unlocks next month's purchase offer; that offer settles in the following month."
      padded
    >
      <div className="grid gap-3 lg:grid-cols-3">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="relative rounded-2xl border border-border/70 bg-card p-4"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-xl border [&_svg]:size-4",
                  step.complete
                    ? "border-success/25 bg-success/10 text-success"
                    : "border-border/70 bg-muted/40 text-muted-readable",
                )}
              >
                {step.complete ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  step.icon
                )}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-body-sm font-semibold text-foreground">
                    {step.title}
                  </p>
                  <Badge variant={step.complete ? "success" : "outline"}>
                    {step.period}
                  </Badge>
                </div>
                <p className="mt-1.5 text-caption text-muted-readable">
                  {step.description}
                </p>
              </div>
            </div>
            {index < steps.length - 1 ? (
              <ArrowRight
                aria-hidden="true"
                className="absolute top-1/2 -right-2.5 hidden size-5 -translate-y-1/2 rounded-full bg-background text-muted-readable lg:block"
              />
            ) : null}
          </div>
        ))}
      </div>
    </ContentDataSurface>
  );
}

function SettlementCard({
  overview,
}: Readonly<{ overview: CreditNoteOverview }>): ReactElement {
  return (
    <ContentDataSurface
      title="Settlement status"
      description="Only finalized month-close benefit becomes a financial entitlement. Live projected amounts never enter the wallet balance."
      padded
      actions={
        <Badge variant={settlementStatusVariant(overview.settlement.status)}>
          {humanize(overview.settlement.status)}
        </Badge>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-1 rounded-xl border border-border/70 bg-muted/20 p-3.5">
          <span className="text-caption text-muted-readable">
            Settlement month
          </span>
          <span className="text-body-sm font-semibold text-foreground">
            {overview.settlement.period.label}
          </span>
        </div>
        <div className="grid gap-1 rounded-xl border border-border/70 bg-muted/20 p-3.5">
          <span className="text-caption text-muted-readable">
            Final vehicle count
          </span>
          <span className="text-body-sm font-semibold text-foreground text-tabular">
            {overview.settlement.finalPurchaseVehicleCount === null
              ? "Pending month close"
              : String(overview.settlement.finalPurchaseVehicleCount)}
          </span>
        </div>
        <div className="grid gap-1 rounded-xl border border-border/70 bg-muted/20 p-3.5">
          <span className="text-caption text-muted-readable">
            Final Credit Note amount
          </span>
          <span className="text-body-sm font-semibold text-foreground text-tabular">
            {overview.settlement.finalAmount === null
              ? "Pending month close"
              : formatMoney(overview.settlement.finalAmount, overview.currency)}
          </span>
        </div>
        <div className="grid gap-1 rounded-xl border border-border/70 bg-muted/20 p-3.5">
          <span className="text-caption text-muted-readable">
            Zoho document
          </span>
          <span className="truncate text-body-sm font-semibold text-foreground">
            {overview.settlement.zohoCreditNoteNumber ?? "Not created yet"}
          </span>
        </div>
      </div>
    </ContentDataSurface>
  );
}

type CreditNoteHistoryKind = "transactions" | "earnings" | "settlements";

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function formatMonth(value: string): string {
  return MONTH_FORMATTER.format(new Date(`${value}T00:00:00+05:30`));
}

function formatOptionalDateTime(value: string | null): string {
  return value === null ? "—" : formatDateTime(value);
}

function signedPercent(value: string | null): string {
  if (value === null) return "—";
  return `${value.startsWith("-") ? "" : "+"}${value}%`;
}

function earningStateVariant(
  state: CreditNoteEarningHistory["earningState"],
): BadgeProps["variant"] {
  switch (state) {
    case "SETTLED":
    case "FINALIZED":
      return "success";
    case "ACCRUING":
      return "info";
    case "NOT_QUALIFIED":
    case "NO_BENEFIT":
      return "warning";
    case "PENDING":
      return "outline";
  }
}

function providerStatusVariant(
  status: CreditNoteSettlementHistory["providerStatus"],
): BadgeProps["variant"] {
  switch (status) {
    case "OPEN":
      return "success";
    case "PREPARED":
    case "DRAFT_CREATED":
      return "info";
    case "FAILED":
      return "destructive";
    case "OUTCOME_UNKNOWN":
    case "RECONCILIATION_REQUIRED":
      return "warning";
    case "VOID":
    case null:
      return "outline";
  }
}

function historyQuery(
  query: WalletSearchParams,
  kind: CreditNoteHistoryKind,
  cursor: string | null,
): Record<string, string> {
  const next: Record<string, string> = walletQuery(query);
  if (query.walletId !== undefined) next["walletId"] = query.walletId;
  if (query.creditNoteInvoiceCursor !== undefined) {
    next["creditNoteInvoiceCursor"] = query.creditNoteInvoiceCursor;
  }

  const transactionCursor =
    kind === "transactions"
      ? cursor
      : (query.creditNoteTransactionCursor ?? null);
  const earningCursor =
    kind === "earnings" ? cursor : (query.creditNoteEarningCursor ?? null);
  const settlementCursor =
    kind === "settlements"
      ? cursor
      : (query.creditNoteSettlementCursor ?? null);

  delete next["creditNoteTransactionCursor"];
  delete next["creditNoteEarningCursor"];
  delete next["creditNoteSettlementCursor"];
  if (transactionCursor !== null)
    next["creditNoteTransactionCursor"] = transactionCursor;
  if (earningCursor !== null) next["creditNoteEarningCursor"] = earningCursor;
  if (settlementCursor !== null)
    next["creditNoteSettlementCursor"] = settlementCursor;
  return next;
}

function currentHistoryCursor(
  query: WalletSearchParams,
  kind: CreditNoteHistoryKind,
): string | undefined {
  switch (kind) {
    case "transactions":
      return query.creditNoteTransactionCursor;
    case "earnings":
      return query.creditNoteEarningCursor;
    case "settlements":
      return query.creditNoteSettlementCursor;
  }
}

function HistoryFooter({
  query,
  kind,
  itemCount,
  nextCursor,
}: Readonly<{
  query: WalletSearchParams;
  kind: CreditNoteHistoryKind;
  itemCount: number;
  nextCursor: string | null;
}>): ReactElement {
  const currentCursor = currentHistoryCursor(query, kind);
  const label =
    kind === "transactions"
      ? "transactions"
      : kind === "earnings"
        ? "earnings"
        : "settlements";

  return (
    <div className="flex w-full flex-col gap-2 px-4 py-3 text-caption text-muted-readable sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {String(itemCount)} {label} on this page.
      </span>
      <div className="flex items-center gap-2">
        {currentCursor === undefined ? (
          <Button variant="ghost" size="sm" disabled>
            First page
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm">
            <Link
              href={{
                pathname: "/wallet",
                query: historyQuery(query, kind, null),
              }}
              scroll={false}
            >
              First page
            </Link>
          </Button>
        )}
        {nextCursor === null ? (
          <Button variant="outline" size="sm" disabled>
            End of history
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link
              href={{
                pathname: "/wallet",
                query: historyQuery(query, kind, nextCursor),
              }}
              scroll={false}
            >
              Next 6
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function TransactionHistory({
  page,
  query,
  canReadTransactions,
}: Readonly<{
  page: CreditNoteTransactionHistoryPage | null;
  query: WalletSearchParams;
  canReadTransactions: boolean;
}>): ReactElement {
  if (!canReadTransactions) {
    return (
      <ContentStatus
        variant="default"
        icon={<ReceiptText aria-hidden="true" />}
        title="Transaction history requires wallet ledger access"
        description="Credit Note earnings and settlements remain visible, but posted debit and credit entries require the wallet entry read permission."
      />
    );
  }

  return (
    <ContentDataSurface
      title="Wallet postings"
      description="Posted Credit Note wallet ledger activity. Entitlement credits and settlement debits are shown as separate auditable postings."
      padded={false}
      className="min-w-0 overflow-hidden [&>[data-slot=card-footer]]:p-0"
      footer={
        page === null ? undefined : (
          <HistoryFooter
            query={query}
            kind="transactions"
            itemCount={page.items.length}
            nextCursor={page.nextCursor}
          />
        )
      }
    >
      {page === null || page.items.length === 0 ? (
        <div className="p-4 sm:p-6">
          <ContentEmptyState
            icon={<ReceiptText aria-hidden="true" />}
            title="No Credit Note transactions yet"
            description="Finalized entitlements and provider settlements will appear here as immutable wallet postings."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 p-3 md:hidden">
            {page.items.map((item) => (
              <TransactionHistoryCard
                key={item.transactionId}
                item={item}
                query={query}
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[66rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Posted</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Offer period</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((item) => (
                  <TableRow key={item.transactionId}>
                    <TableCell className="whitespace-nowrap text-caption text-tabular">
                      {formatDateTime(item.postedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[15rem] max-w-[24rem]">
                        <p className="font-medium text-foreground">
                          {item.entryType === "CREDIT_NOTE_ENTITLEMENT"
                            ? "Earning posted"
                            : "Provider settlement"}
                        </p>
                        <p className="mt-0.5 text-caption text-muted-readable">
                          {item.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-56">
                      <span
                        className="block truncate font-medium text-foreground"
                        title={item.zohoCreditNoteNumber ?? item.cycleId}
                      >
                        <Link
                          className="underline underline-offset-4"
                          href={purchaseCycleLink(query, item.cycleId)}
                        >
                          {item.zohoCreditNoteNumber ??
                            `Cycle ${item.cycleId.slice(0, 8)}`}
                        </Link>
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-caption text-muted-readable">
                      {item.offerPeriodStart === null
                        ? "—"
                        : formatMonth(item.offerPeriodStart)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-tabular">
                      {item.direction === "DEBIT"
                        ? formatMoney(item.amount, item.currency)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-tabular">
                      {item.direction === "CREDIT"
                        ? formatMoney(item.amount, item.currency)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="success">Posted</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </ContentDataSurface>
  );
}

function TransactionHistoryCard({
  item,
  query,
}: Readonly<{
  item: CreditNoteTransactionHistory;
  query: WalletSearchParams;
}>): ReactElement {
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {item.entryType === "CREDIT_NOTE_ENTITLEMENT"
                ? "Earning posted"
                : "Provider settlement"}
            </p>
            <p className="mt-0.5 text-caption text-muted-readable">
              {formatDateTime(item.postedAt)}
            </p>
          </div>
          <Badge variant="success">Posted</Badge>
        </div>
        <p className="text-caption text-muted-readable">{item.description}</p>
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/35 p-3">
          <div>
            <p className="text-caption text-muted-readable">
              {item.direction === "CREDIT" ? "Credit" : "Debit"}
            </p>
            <p className="mt-0.5 font-semibold text-foreground text-tabular">
              {formatMoney(item.amount, item.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-caption text-muted-readable">Reference</p>
            <p
              className="mt-0.5 truncate font-medium text-foreground"
              title={item.zohoCreditNoteNumber ?? item.cycleId}
            >
              {item.zohoCreditNoteNumber ?? item.cycleId.slice(0, 8)}
            </p>
          </div>
        </div>
        <Link
          className="text-sm underline underline-offset-4"
          href={purchaseCycleLink(query, item.cycleId)}
        >
          View supporting purchases
        </Link>
      </CardContent>
    </Card>
  );
}

function EarningHistory({
  page,
  query,
}: Readonly<{
  page: CreditNoteEarningHistoryPage | null;
  query: WalletSearchParams;
}>): ReactElement {
  return (
    <ContentDataSurface
      title="Earning history"
      description="Monthly qualification, approved purchase evidence, earned value, and comparable trend. Finalized amounts supersede live accrual estimates."
      padded={false}
      className="min-w-0 overflow-hidden [&>[data-slot=card-footer]]:p-0"
      footer={
        page === null ? undefined : (
          <HistoryFooter
            query={query}
            kind="earnings"
            itemCount={page.items.length}
            nextCursor={page.nextCursor}
          />
        )
      }
    >
      {page === null || page.items.length === 0 ? (
        <div className="p-4 sm:p-6">
          <ContentEmptyState
            icon={<Gift aria-hidden="true" />}
            title="No Credit Note earnings yet"
            description="Monthly earning records will appear after the Credit Note lifecycle begins for this dealer."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 p-3 md:hidden">
            {page.items.map((item) => (
              <EarningHistoryCard
                key={item.cycleId}
                item={item}
                query={query}
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[72rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Offer month</TableHead>
                  <TableHead className="text-center">Qualification</TableHead>
                  <TableHead className="text-right">
                    Approved purchases
                  </TableHead>
                  <TableHead className="text-right">Credit / vehicle</TableHead>
                  <TableHead className="text-right">Earning</TableHead>
                  <TableHead className="text-center">MoM</TableHead>
                  <TableHead className="text-center">State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((item) => (
                  <TableRow key={item.cycleId}>
                    <TableCell>
                      <p className="font-medium text-foreground">
                        {formatMonth(item.offerPeriodStart)}
                      </p>
                      <p className="mt-0.5 text-caption text-muted-readable">
                        Settlement {formatMonth(item.settlementPeriodStart)}
                      </p>
                    </TableCell>
                    <TableCell className="text-center text-tabular">
                      <span className="font-medium text-foreground">
                        {String(item.retailSaleCount)} /{" "}
                        {String(item.retailTargetCount)}
                      </span>
                      <span className="ms-1 text-caption text-muted-readable">
                        ({String(item.qualificationPercent)}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-tabular">
                      {item.approvedPurchaseVehicleCount > 0 ? (
                        <Link
                          className="underline underline-offset-4"
                          href={purchaseCycleLink(query, item.cycleId)}
                          aria-label={`View ${String(item.approvedPurchaseVehicleCount)} approved purchases for ${formatMonth(item.offerPeriodStart)}`}
                        >
                          {item.approvedPurchaseVehicleCount}
                        </Link>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="text-right text-tabular">
                      {formatMoney(item.creditPerVehicle, item.currency)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-tabular">
                      {formatMoney(item.displayAmount, item.currency)}
                    </TableCell>
                    <TableCell className="text-center text-tabular">
                      {item.changePercent === null
                        ? "—"
                        : signedPercent(item.changePercent)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={earningStateVariant(item.earningState)}>
                        {humanize(item.earningState)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </ContentDataSurface>
  );
}

function EarningHistoryCard({
  item,
  query,
}: Readonly<{
  item: CreditNoteEarningHistory;
  query: WalletSearchParams;
}>): ReactElement {
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">
              {formatMonth(item.offerPeriodStart)}
            </p>
            <p className="mt-0.5 text-caption text-muted-readable">
              Settlement {formatMonth(item.settlementPeriodStart)}
            </p>
          </div>
          <Badge variant={earningStateVariant(item.earningState)}>
            {humanize(item.earningState)}
          </Badge>
        </div>
        <p className="text-2xl font-semibold tracking-tight text-foreground text-tabular">
          {formatMoney(item.displayAmount, item.currency)}
        </p>
        <div className="grid grid-cols-2 gap-3 text-caption">
          <div>
            <p className="text-muted-readable">Qualification</p>
            <p className="mt-0.5 font-medium text-foreground text-tabular">
              {String(item.retailSaleCount)} / {String(item.retailTargetCount)}{" "}
              · {String(item.qualificationPercent)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-readable">Approved purchases</p>
            <p className="mt-0.5 font-medium text-foreground text-tabular">
              {item.approvedPurchaseVehicleCount > 0 ? (
                <Link
                  className="underline underline-offset-4"
                  href={purchaseCycleLink(query, item.cycleId)}
                  aria-label={`View ${String(item.approvedPurchaseVehicleCount)} approved purchases for ${formatMonth(item.offerPeriodStart)}`}
                >
                  {item.approvedPurchaseVehicleCount}
                </Link>
              ) : (
                "0"
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-readable">Credit / vehicle</p>
            <p className="mt-0.5 font-medium text-foreground text-tabular">
              {formatMoney(item.creditPerVehicle, item.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-readable">MoM</p>
            <p className="mt-0.5 font-medium text-foreground text-tabular">
              {item.changePercent === null
                ? "—"
                : signedPercent(item.changePercent)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SettlementHistory({
  page,
  query,
}: Readonly<{
  page: CreditNoteSettlementHistoryPage | null;
  query: WalletSearchParams;
}>): ReactElement {
  return (
    <ContentDataSurface
      title="Settlement history"
      description="Month-close settlement lifecycle with provider reference, final benefit, posting attempts, and reconciliation state."
      padded={false}
      className="min-w-0 overflow-hidden [&>[data-slot=card-footer]]:p-0"
      footer={
        page === null ? undefined : (
          <HistoryFooter
            query={query}
            kind="settlements"
            itemCount={page.items.length}
            nextCursor={page.nextCursor}
          />
        )
      }
    >
      {page === null || page.items.length === 0 ? (
        <div className="p-4 sm:p-6">
          <ContentEmptyState
            icon={<CalendarClock aria-hidden="true" />}
            title="No settlement history yet"
            description="Finalized Credit Note months and their provider settlement state will appear here."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 p-3 md:hidden">
            {page.items.map((item) => (
              <SettlementHistoryCard key={item.cycleId} item={item} />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[78rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Settlement month</TableHead>
                  <TableHead>Credit Note / reference</TableHead>
                  <TableHead className="text-right">Vehicles</TableHead>
                  <TableHead className="text-right">Final amount</TableHead>
                  <TableHead className="text-center">Provider</TableHead>
                  <TableHead className="text-center">Settlement</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((item) => (
                  <TableRow key={item.cycleId}>
                    <TableCell className="whitespace-nowrap font-medium text-foreground">
                      {formatMonth(item.settlementPeriodStart)}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[14rem] max-w-[24rem]">
                        <p
                          className="truncate font-medium text-foreground"
                          title={
                            item.zohoCreditNoteNumber ??
                            item.providerReference ??
                            undefined
                          }
                        >
                          {item.zohoCreditNoteNumber ??
                            item.providerReference ??
                            "Pending provider document"}
                        </p>
                        <p className="mt-0.5 truncate text-caption text-muted-readable">
                          {item.providerReference ??
                            `Cycle ${item.cycleId.slice(0, 8)}`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-tabular">
                      {item.finalPurchaseVehicleCount === null
                        ? "—"
                        : String(item.finalPurchaseVehicleCount)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-tabular">
                      {item.finalAmount === null
                        ? "—"
                        : formatMoney(item.finalAmount, item.currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={providerStatusVariant(item.providerStatus)}
                      >
                        {item.providerStatus === null
                          ? "Not started"
                          : humanize(item.providerStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={settlementStatusVariant(item.settlementStatus)}
                      >
                        {humanize(item.settlementStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-caption text-muted-readable">
                      {formatOptionalDateTime(
                        item.settledAt ??
                          item.providerOpenedAt ??
                          item.lastAttemptAt,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </ContentDataSurface>
  );
}

function SettlementHistoryCard({
  item,
}: Readonly<{ item: CreditNoteSettlementHistory }>): ReactElement {
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {formatMonth(item.settlementPeriodStart)}
            </p>
            <p
              className="mt-0.5 truncate text-caption text-muted-readable"
              title={item.providerReference ?? undefined}
            >
              {item.zohoCreditNoteNumber ??
                item.providerReference ??
                "Provider document pending"}
            </p>
          </div>
          <Badge variant={settlementStatusVariant(item.settlementStatus)}>
            {humanize(item.settlementStatus)}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/35 p-3">
          <div>
            <p className="text-caption text-muted-readable">Final amount</p>
            <p className="mt-0.5 font-semibold text-foreground text-tabular">
              {item.finalAmount === null
                ? "—"
                : formatMoney(item.finalAmount, item.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-caption text-muted-readable">Vehicles</p>
            <p className="mt-0.5 font-medium text-foreground text-tabular">
              {item.finalPurchaseVehicleCount === null
                ? "—"
                : String(item.finalPurchaseVehicleCount)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant={providerStatusVariant(item.providerStatus)}>
            {item.providerStatus === null
              ? "Provider not started"
              : humanize(item.providerStatus)}
          </Badge>
          <span className="text-caption text-muted-readable">
            {formatOptionalDateTime(
              item.settledAt ?? item.providerOpenedAt ?? item.lastAttemptAt,
            )}
          </span>
        </div>
        {item.lastErrorCode === null ? null : (
          <p className="rounded-lg border border-warning/25 bg-warning/[0.06] px-3 py-2 text-caption text-warning-foreground">
            Attention: {humanize(item.lastErrorCode)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DataFreshness({
  overview,
}: Readonly<{ overview: CreditNoteOverview }>): ReactElement {
  const syncMessage = (() => {
    switch (overview.dataFreshness.invoiceSyncStatus) {
      case "NOT_CONFIGURED":
        return "Purchase invoice location is not configured";
      case "NOT_RUN":
        return "Zoho invoice sync has not run";
      case "FAILED":
        return "Zoho invoice sync failed; operator attention is required";
      case "STALE":
        return `Zoho invoice sync is stale (last succeeded ${formatDateTime(overview.dataFreshness.invoiceSyncLastSucceededAt)})`;
      case "CURRENT":
        return overview.offer.approvedPurchaseVehicleCount === 0
          ? "Zoho invoice sync succeeded; no eligible VIN evidence was found"
          : `Zoho invoice sync succeeded through ${overview.dataFreshness.invoiceSyncCoveredThrough ?? "the latest provider window"}`;
    }
  })();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 text-caption text-muted-readable">
      <div className="flex items-center gap-2">
        <RefreshCw className="size-3.5" aria-hidden="true" />
        <span>{syncMessage}</span>
      </div>
      <div className="flex items-center gap-2 text-tabular">
        <Clock3 className="size-3.5" aria-hidden="true" />
        <span>
          View generated {formatDateTime(overview.dataFreshness.generatedAt)}
        </span>
      </div>
    </div>
  );
}

export function CreditNoteWorkspace({
  overview,
  transactions,
  earnings,
  settlements,
  invoices,
  purchaseActivity,
  purchaseDetail,
  query,
  capabilities,
}: CreditNoteWorkspaceProps): ReactElement {
  if (!capabilities.canReadCreditNoteOverview) {
    return (
      <ContentEmptyState
        icon={<ReceiptText aria-hidden="true" />}
        title="Credit Note access is not enabled"
        description="Your dealer account does not currently have Credit Note eligibility access. Contact Ozotec support if you expect this workspace."
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      {overview === null ? (
        <ContentStatus
          variant="warning"
          icon={<TriangleAlert aria-hidden="true" />}
          title="Credit Note eligibility is being prepared"
          description="The current monthly Credit Note cycle is not available yet. Historical earnings, settlements, and posted transactions remain readable below. No projected amount is treated as a financial entitlement."
        />
      ) : (
        <>
          <CreditNoteHero overview={overview} />
          <CreditNoteMetrics overview={overview} />
          <CreditNotePolicyGuide
            overview={overview}
            page={invoices}
            query={query}
          />

          <OpportunityBanner overview={overview} />
          <EligibilityTracker overview={overview} />
          <ProcessTimeline overview={overview} />
          <SettlementCard overview={overview} />
        </>
      )}

      {overview === null ? (
        <CreditNotePolicyGuide
          overview={overview}
          page={invoices}
          query={query}
        />
      ) : null}
      <EarningHistory page={earnings} query={query} />
      <section id="credit-note-settlements">
        <SettlementHistory page={settlements} query={query} />
      </section>
      <section id="credit-note-transactions" className="min-w-0">
        <ContentDataSurface
          title="Transaction history"
          description="Inspect approved purchase activity or posted wallet credits and debits."
          padded={false}
        >
          <nav
            aria-label="Transaction history views"
            className="flex gap-2 border-b p-3"
          >
            {(
              [
                ["purchases", "Purchases"],
                ["postings", "Wallet postings"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                variant={
                  (query.creditNoteActivityTab ?? "purchases") === value
                    ? "default"
                    : "outline"
                }
                size="sm"
                asChild
              >
                <Link
                  aria-current={
                    (query.creditNoteActivityTab ?? "purchases") === value
                      ? "page"
                      : undefined
                  }
                  href={{
                    pathname: "/wallet",
                    query: {
                      ...walletQuery(query),
                      creditNoteActivityTab: value,
                    },
                    hash: "credit-note-transactions",
                  }}
                >
                  {label}
                </Link>
              </Button>
            ))}
          </nav>
          {query.creditNoteActivityTab === "postings" ? (
            <TransactionHistory
              page={transactions}
              query={query}
              canReadTransactions={capabilities.canReadEntries}
            />
          ) : (
            <PurchaseTable
              page={purchaseActivity}
              query={query}
              canReadDocuments={capabilities.canReadCreditNoteDocuments}
              activity
            />
          )}
        </ContentDataSurface>
      </section>
      <PurchaseInvoices
        page={invoices}
        query={query}
        canReadDocuments={capabilities.canReadCreditNoteDocuments}
      />
      <PurchaseEvidenceDetail
        detail={purchaseDetail}
        query={query}
        canReadDocuments={capabilities.canReadCreditNoteDocuments}
      />
      {overview === null ? null : <DataFreshness overview={overview} />}
    </div>
  );
}

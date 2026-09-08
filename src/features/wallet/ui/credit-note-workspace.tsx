// oz-next-app/src/features/wallet/ui/credit-note-workspace.tsx
import type { ReactElement } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Gift,
  Info,
  ReceiptText,
  RefreshCw,
  Rocket,
  ShoppingCart,
  Target,
  Trophy,
  TriangleAlert,
  WalletCards,
} from "lucide-react";

import {
  ContentEmptyState,
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
  PurchaseDetail,
  PurchasePage,
} from "@/features/wallet/contracts/purchases.schema";
import type {
  CreditNoteEarningHistory,
  CreditNoteEarningHistoryPage,
  CreditNoteOfferStatus,
  CreditNoteOverview,
  CreditNoteSettlementHistory,
  CreditNoteSettlementHistoryPage,
  CreditNoteSettlementStatus,
  CreditNoteTransactionHistoryPage,
  WalletSearchParams,
} from "@/features/wallet/contracts/wallet.schema";
import type { WalletCapabilities } from "@/features/wallet/policies/wallet.policy";
import { formatMoney } from "@/features/wallet/utils/wallet-money";

import { CreditNotePolicyGuide } from "./credit-note-policy-guide";
import {
  CreditNoteInset,
  CreditNoteMetric,
  CreditNoteMetricGrid,
  CreditNoteMobileList,
  CreditNoteSection,
  CreditNoteTableViewport,
  CreditNoteToolbar,
} from "./credit-note-ui";
import {
  PurchaseEvidenceDetail,
  PurchaseInvoices,
  PurchaseTable,
} from "./purchase-invoices";
import {
  creditNoteActivityLink,
  purchaseCycleLink,
  walletQuery,
} from "../utils/purchase-links";

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

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "numeric",
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

function formatDateTime(value: string): string {
  return DATE_TIME_FORMATTER.format(new Date(value));
}

function formatOptionalDateTime(value: string | null): string {
  return value === null ? "—" : formatDateTime(value);
}

function formatMonth(value: string): string {
  return MONTH_FORMATTER.format(new Date(`${value}T00:00:00+05:30`));
}

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function signedPercent(value: string | null): string {
  if (value === null) {
    return "—";
  }
  return `${value.startsWith("-") ? "" : "+"}${value}%`;
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

function settlementStatusLabel(status: CreditNoteSettlementStatus): string {
  switch (status) {
    case "NOT_DUE":
      return "Not due";
    case "PENDING":
      return "Pending";
    case "POSTING":
      return "Processing";
    case "SETTLED":
      return "Settled";
    case "BLOCKED_PROVIDER_CONFIGURATION":
      return "Setup required";
    case "RECONCILIATION_REQUIRED":
      return "Review required";
    case "ADJUSTMENT_REQUIRED":
      return "Adjustment required";
    case "NO_BENEFIT":
      return "No benefit";
  }
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

function documentStatusVariant(
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

function CreditNoteHero({
  overview,
}: Readonly<{ overview: CreditNoteOverview }>): ReactElement {
  const qualified = overview.offer.qualificationPerformance.targetAchieved;

  return (
    <Card className="relative min-w-0 overflow-hidden border-primary/25 bg-gradient-to-br from-primary/[0.11] via-card to-card py-0 shadow-md shadow-foreground/5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-reduce:animate-none">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
      />
      <CardContent className="grid gap-4 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-overline text-muted-readable">Current cycle</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {overview.offer.period.label}
              </h2>
              <Badge variant={offerStatusVariant(overview.offer.status)}>
                {overview.offer.isActive
                  ? "Offer active"
                  : humanize(overview.offer.status)}
              </Badge>
            </div>
            <p className="mt-1.5 text-body-sm text-muted-readable">
              {String(
                overview.offer.qualificationPerformance
                  .eligibleRetailVehicleCount,
              )}{" "}
              /{" "}
              {String(
                overview.offer.qualificationPerformance
                  .targetRetailVehicleCount,
              )}{" "}
              retail vehicles qualified this offer.
            </p>
          </div>
          <Badge variant={qualified ? "success" : "warning"}>
            {qualified ? "Qualified" : "Not qualified"}
          </Badge>
        </div>

        <CreditNoteMetricGrid>
          <CreditNoteMetric
            icon={<Gift aria-hidden="true" />}
            tone="primary"
            label="Credit / eligible vehicle"
            value={formatMoney(
              overview.offer.creditPerApprovedPurchaseVehicle,
              overview.currency,
            )}
            caption="Applied to approved purchase evidence"
            emphasis
          />
          <CreditNoteMetric
            icon={<CircleDollarSign aria-hidden="true" />}
            tone="success"
            label="Accrued this cycle"
            value={formatMoney(overview.offer.accruedAmount, overview.currency)}
            caption={
              overview.offer.isActive ? "Current earning" : "Recorded earning"
            }
            emphasis
          />
          <CreditNoteMetric
            icon={<ShoppingCart aria-hidden="true" />}
            tone="info"
            label="Approved purchases"
            value={String(overview.offer.approvedPurchaseVehicleCount)}
            caption={`Offer closes ${formatDate(overview.offer.closesAt)}`}
            emphasis
          />
          <CreditNoteMetric
            icon={<CalendarClock aria-hidden="true" />}
            tone="warning"
            label="Settlement month"
            value={overview.settlement.period.label}
            caption={settlementStatusLabel(overview.settlement.status)}
          />
        </CreditNoteMetricGrid>
      </CardContent>
    </Card>
  );
}

function OpportunityStrip({
  overview,
}: Readonly<{ overview: CreditNoteOverview }>): ReactElement {
  const tone = overview.opportunityMessage.tone;
  const Icon = tone === "SUCCESS" ? Trophy : tone === "WARNING" ? Rocket : Info;
  const toneClass =
    tone === "SUCCESS"
      ? "border-success/25 bg-success/[0.05]"
      : tone === "WARNING"
        ? "border-warning/30 bg-warning/[0.06]"
        : "border-info/25 bg-info/[0.05]";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        toneClass,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-background/70 text-foreground shadow-xs">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            {overview.opportunityMessage.title}
          </p>
          <p className="mt-0.5 text-caption text-muted-readable">
            {overview.opportunityMessage.description}
          </p>
        </div>
      </div>
      {overview.opportunityMessage.hypotheticalMissedAmount !== null ? (
        <Badge variant="warning" className="shrink-0 text-tabular">
          {formatMoney(
            overview.opportunityMessage.hypotheticalMissedAmount,
            overview.currency,
          )}
        </Badge>
      ) : null}
    </div>
  );
}

function EligibilityTracker({
  overview,
}: Readonly<{ overview: CreditNoteOverview }>): ReactElement {
  const achieved = overview.performance.targetAchieved;

  return (
    <CreditNoteSection
      title="Next offer progress"
      description={`${overview.performance.period.label} retail performance unlocks the following purchase offer.`}
      icon={<Target aria-hidden="true" />}
      tone={achieved ? "success" : "default"}
      actions={
        <Badge variant={achieved ? "success" : "warning"}>
          {achieved
            ? "Target achieved"
            : `${String(overview.performance.vehiclesRemaining)} to go`}
        </Badge>
      }
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-foreground text-tabular sm:text-3xl">
              {String(overview.performance.eligibleRetailVehicleCount)}
              <span className="ms-1 text-body-sm font-medium text-muted-readable">
                / {String(overview.performance.targetRetailVehicleCount)}{" "}
                vehicles
              </span>
            </p>
          </div>
          <p className="font-semibold text-foreground text-tabular">
            {String(overview.performance.progressPercent)}%
          </p>
        </div>
        <Progress
          value={overview.performance.progressPercent}
          aria-label={`Credit Note eligibility progress: ${String(overview.performance.progressPercent)} percent`}
          className="h-2.5"
        />
        <CreditNoteMetricGrid className="xl:grid-cols-3">
          <CreditNoteMetric
            icon={<CalendarClock aria-hidden="true" />}
            label="Target deadline"
            value={formatPeriodEnd(overview.performance.period.endExclusive)}
          />
          <CreditNoteMetric
            icon={<Gift aria-hidden="true" />}
            tone="primary"
            label="Reward after qualification"
            value={`${formatMoney(overview.policy.purchaseCreditAmount, overview.currency)} / purchase`}
          />
          <CreditNoteMetric
            icon={
              achieved ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <Target aria-hidden="true" />
              )
            }
            tone={achieved ? "success" : "warning"}
            label={achieved ? "Offer unlocked" : "Vehicles remaining"}
            value={
              achieved
                ? "Secured"
                : String(overview.performance.vehiclesRemaining)
            }
          />
        </CreditNoteMetricGrid>
      </div>
    </CreditNoteSection>
  );
}

function ProcessTimeline({
  overview,
}: Readonly<{ overview: CreditNoteOverview }>): ReactElement {
  const steps = [
    {
      title: "Qualify",
      period: overview.offer.qualificationPerformance.period.label,
      value: `${String(overview.offer.qualificationPerformance.eligibleRetailVehicleCount)} / ${String(overview.offer.qualificationPerformance.targetRetailVehicleCount)}`,
      icon: <Target aria-hidden="true" />,
      complete: overview.offer.qualificationPerformance.targetAchieved,
    },
    {
      title: "Earn on purchases",
      period: overview.offer.period.label,
      value: `${String(overview.offer.approvedPurchaseVehicleCount)} approved`,
      icon: <ShoppingCart aria-hidden="true" />,
      complete: overview.offer.status === "FINALIZED",
    },
    {
      title: "Settlement",
      period: overview.settlement.period.label,
      value: settlementStatusLabel(overview.settlement.status),
      icon: <ReceiptText aria-hidden="true" />,
      complete: overview.settlement.status === "SETTLED",
    },
  ] as const;

  return (
    <CreditNoteSection
      title="How it works"
      description="Qualification → purchase earning → settlement."
      icon={<ArrowRight aria-hidden="true" />}
    >
      <div className="grid gap-2.5 lg:grid-cols-3">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="relative flex min-w-0 items-center gap-3 rounded-2xl border border-border/65 bg-background/45 p-3.5 transition-[transform,border-color,box-shadow] duration-300 ease-enterprise hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-sm motion-reduce:transform-none motion-reduce:transition-none"
          >
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full border text-sm font-semibold text-tabular [&_svg]:size-4",
                step.complete
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-primary/25 bg-primary/10 text-primary",
              )}
            >
              {step.complete ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                String(index + 1)
              )}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{step.title}</p>
              <p className="text-caption text-muted-readable">{step.period}</p>
              <p className="mt-0.5 text-caption font-medium text-foreground text-tabular">
                {step.value}
              </p>
            </div>
            {index < steps.length - 1 ? (
              <ArrowRight
                aria-hidden="true"
                className="absolute -right-2.5 top-1/2 hidden size-5 -translate-y-1/2 rounded-full bg-background text-primary lg:block"
              />
            ) : null}
          </div>
        ))}
      </div>
    </CreditNoteSection>
  );
}

function SettlementSummary({
  overview,
}: Readonly<{ overview: CreditNoteOverview }>): ReactElement {
  return (
    <CreditNoteSection
      title="Settlement summary"
      description="Month-close result and document status for this cycle."
      icon={<WalletCards aria-hidden="true" />}
      actions={
        <Badge variant={settlementStatusVariant(overview.settlement.status)}>
          {settlementStatusLabel(overview.settlement.status)}
        </Badge>
      }
    >
      <CreditNoteMetricGrid>
        <CreditNoteMetric
          icon={<CalendarClock aria-hidden="true" />}
          label="Settlement month"
          value={overview.settlement.period.label}
        />
        <CreditNoteMetric
          icon={<ShoppingCart aria-hidden="true" />}
          label="Final vehicle count"
          value={
            overview.settlement.finalPurchaseVehicleCount === null
              ? "Pending"
              : String(overview.settlement.finalPurchaseVehicleCount)
          }
        />
        <CreditNoteMetric
          icon={<CircleDollarSign aria-hidden="true" />}
          tone="success"
          label="Final amount"
          value={
            overview.settlement.finalAmount === null
              ? "Pending"
              : formatMoney(overview.settlement.finalAmount, overview.currency)
          }
          emphasis={overview.settlement.finalAmount !== null}
        />
        <CreditNoteMetric
          icon={<ReceiptText aria-hidden="true" />}
          label="Credit Note document"
          value={overview.settlement.zohoCreditNoteNumber ?? "Not created yet"}
        />
      </CreditNoteMetricGrid>
    </CreditNoteSection>
  );
}

type CreditNoteHistoryKind = "transactions" | "earnings" | "settlements";

function historyQuery(
  query: WalletSearchParams,
  kind: CreditNoteHistoryKind,
  cursor: string | null,
): Record<string, string> {
  const next: Record<string, string> = walletQuery(query);

  if (query.walletId !== undefined) {
    next["walletId"] = query.walletId;
  }
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

  if (transactionCursor !== null) {
    next["creditNoteTransactionCursor"] = transactionCursor;
  }
  if (earningCursor !== null) {
    next["creditNoteEarningCursor"] = earningCursor;
  }
  if (settlementCursor !== null) {
    next["creditNoteSettlementCursor"] = settlementCursor;
  }

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
      ? "postings"
      : kind === "earnings"
        ? "earnings"
        : "settlements";

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span>
        {String(itemCount)} {label} shown
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
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function EarningHistory({
  page,
  query,
  canReadPurchases,
}: Readonly<{
  page: CreditNoteEarningHistoryPage | null;
  query: WalletSearchParams;
  canReadPurchases: boolean;
}>): ReactElement {
  return (
    <CreditNoteSection
      title="Earning history"
      description="Qualification, approved purchases and recorded earning by offer month."
      icon={<Gift aria-hidden="true" />}
      padded={false}
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
        <div className="grid min-h-40 place-items-center p-5 text-center">
          <p className="text-body-sm text-muted-readable">
            No Credit Note earnings yet.
          </p>
        </div>
      ) : (
        <>
          <CreditNoteMobileList>
            {page.items.map((item) => (
              <Card key={item.cycleId} className="gap-0 py-0 shadow-none">
                <CardContent className="grid gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {formatMonth(item.offerPeriodStart)}
                      </p>
                      <p className="text-caption text-muted-readable">
                        {String(item.retailSaleCount)} /{" "}
                        {String(item.retailTargetCount)} qualified
                      </p>
                    </div>
                    <Badge variant={earningStateVariant(item.earningState)}>
                      {humanize(item.earningState)}
                    </Badge>
                  </div>
                  <CreditNoteMetricGrid className="grid-cols-2 sm:grid-cols-2 xl:grid-cols-2">
                    <CreditNoteMetric
                      label="Approved purchases"
                      value={
                        item.approvedPurchaseVehicleCount > 0 &&
                        canReadPurchases ? (
                          <Link
                            className="underline underline-offset-4"
                            href={purchaseCycleLink(query, item.cycleId)}
                          >
                            {String(item.approvedPurchaseVehicleCount)}
                          </Link>
                        ) : (
                          String(item.approvedPurchaseVehicleCount)
                        )
                      }
                    />
                    <CreditNoteMetric
                      label="Earning"
                      value={formatMoney(item.displayAmount, item.currency)}
                    />
                  </CreditNoteMetricGrid>
                </CardContent>
              </Card>
            ))}
          </CreditNoteMobileList>
          <CreditNoteTableViewport>
            <Table className="min-w-[68rem]">
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
                    <TableCell className="font-medium">
                      {formatMonth(item.offerPeriodStart)}
                    </TableCell>
                    <TableCell className="text-center text-tabular">
                      {String(item.retailSaleCount)} /{" "}
                      {String(item.retailTargetCount)} (
                      {String(item.qualificationPercent)}%)
                    </TableCell>
                    <TableCell className="text-right font-medium text-tabular">
                      {item.approvedPurchaseVehicleCount > 0 &&
                      canReadPurchases ? (
                        <Link
                          className="underline underline-offset-4"
                          href={purchaseCycleLink(query, item.cycleId)}
                        >
                          {String(item.approvedPurchaseVehicleCount)}
                        </Link>
                      ) : (
                        String(item.approvedPurchaseVehicleCount)
                      )}
                    </TableCell>
                    <TableCell className="text-right text-tabular">
                      {formatMoney(item.creditPerVehicle, item.currency)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-tabular">
                      {formatMoney(item.displayAmount, item.currency)}
                    </TableCell>
                    <TableCell className="text-center text-tabular">
                      {signedPercent(item.changePercent)}
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
          </CreditNoteTableViewport>
        </>
      )}
    </CreditNoteSection>
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
    <CreditNoteSection
      id="credit-note-settlements"
      title="Settlement history"
      description="Finalized benefits, document lifecycle and reconciliation state."
      icon={<CalendarClock aria-hidden="true" />}
      padded={false}
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
        <div className="grid min-h-40 place-items-center p-5 text-center">
          <p className="text-body-sm text-muted-readable">
            No settlement history yet.
          </p>
        </div>
      ) : (
        <>
          <CreditNoteMobileList>
            {page.items.map((item) => (
              <Card key={item.cycleId} className="gap-0 py-0 shadow-none">
                <CardContent className="grid gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {formatMonth(item.settlementPeriodStart)}
                      </p>
                      <p className="text-caption text-muted-readable">
                        {item.zohoCreditNoteNumber ??
                          `Cycle ${item.cycleId.slice(0, 8)}`}
                      </p>
                    </div>
                    <Badge
                      variant={settlementStatusVariant(item.settlementStatus)}
                    >
                      {settlementStatusLabel(item.settlementStatus)}
                    </Badge>
                  </div>
                  <CreditNoteMetricGrid className="grid-cols-2 sm:grid-cols-2 xl:grid-cols-2">
                    <CreditNoteMetric
                      label="Final amount"
                      value={
                        item.finalAmount === null
                          ? "—"
                          : formatMoney(item.finalAmount, item.currency)
                      }
                    />
                    <CreditNoteMetric
                      label="Vehicles"
                      value={
                        item.finalPurchaseVehicleCount === null
                          ? "—"
                          : String(item.finalPurchaseVehicleCount)
                      }
                    />
                  </CreditNoteMetricGrid>
                </CardContent>
              </Card>
            ))}
          </CreditNoteMobileList>
          <CreditNoteTableViewport>
            <Table className="min-w-[72rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Settlement month</TableHead>
                  <TableHead>Credit Note</TableHead>
                  <TableHead className="text-right">Vehicles</TableHead>
                  <TableHead className="text-right">Final amount</TableHead>
                  <TableHead className="text-center">Document status</TableHead>
                  <TableHead className="text-center">Settlement</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((item) => (
                  <TableRow key={item.cycleId}>
                    <TableCell className="font-medium">
                      {formatMonth(item.settlementPeriodStart)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">
                        {item.zohoCreditNoteNumber ?? "Pending document"}
                      </p>
                      <p className="mt-0.5 text-caption text-muted-readable">
                        Cycle {item.cycleId.slice(0, 8)}
                      </p>
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
                        variant={documentStatusVariant(item.providerStatus)}
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
                        {settlementStatusLabel(item.settlementStatus)}
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
          </CreditNoteTableViewport>
        </>
      )}
    </CreditNoteSection>
  );
}

function TransactionPostings({
  page,
  query,
}: Readonly<{
  page: CreditNoteTransactionHistoryPage | null;
  query: WalletSearchParams;
}>): ReactElement {
  if (page === null || page.items.length === 0) {
    return (
      <div className="grid min-h-40 place-items-center p-5 text-center">
        <p className="text-body-sm text-muted-readable">
          No Credit Note wallet postings yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <CreditNoteMobileList>
        {page.items.map((item) => (
          <Card key={item.transactionId} className="gap-0 py-0 shadow-none">
            <CardContent className="grid gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {item.entryType === "CREDIT_NOTE_ENTITLEMENT"
                      ? "Earning posted"
                      : "Settlement posted"}
                  </p>
                  <p className="text-caption text-muted-readable">
                    {formatDateTime(item.postedAt)}
                  </p>
                </div>
                <Badge variant="success">Posted</Badge>
              </div>
              <CreditNoteInset className="flex items-center justify-between gap-3">
                <span className="text-caption text-muted-readable">
                  {item.direction === "CREDIT" ? "Credit" : "Debit"}
                </span>
                <span className="font-semibold text-foreground text-tabular">
                  {formatMoney(item.amount, item.currency)}
                </span>
              </CreditNoteInset>
              <Link
                className="text-caption font-medium text-primary underline underline-offset-4"
                href={purchaseCycleLink(query, item.cycleId)}
              >
                View supporting purchases
              </Link>
            </CardContent>
          </Card>
        ))}
      </CreditNoteMobileList>
      <CreditNoteTableViewport>
        <Table className="min-w-[66rem]">
          <TableHeader>
            <TableRow>
              <TableHead>Posted</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Offer month</TableHead>
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
                  <p className="font-medium text-foreground">
                    {item.entryType === "CREDIT_NOTE_ENTITLEMENT"
                      ? "Earning posted"
                      : "Settlement posted"}
                  </p>
                  <p className="mt-0.5 max-w-80 truncate text-caption text-muted-readable">
                    {item.description}
                  </p>
                </TableCell>
                <TableCell>
                  <Link
                    className="font-medium underline underline-offset-4"
                    href={purchaseCycleLink(query, item.cycleId)}
                  >
                    {item.zohoCreditNoteNumber ??
                      `Cycle ${item.cycleId.slice(0, 8)}`}
                  </Link>
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
      </CreditNoteTableViewport>
    </>
  );
}

function TransactionHistorySection({
  transactions,
  purchaseActivity,
  query,
  canReadPostings,
  canReadPurchases,
  canReadDocuments,
}: Readonly<{
  transactions: CreditNoteTransactionHistoryPage | null;
  purchaseActivity: PurchasePage | null;
  query: WalletSearchParams;
  canReadPostings: boolean;
  canReadPurchases: boolean;
  canReadDocuments: boolean;
}>): ReactElement | null {
  const requestedActivityTab = query.creditNoteActivityTab ?? "purchases";
  const activityTab =
    requestedActivityTab === "postings" && canReadPostings
      ? "postings"
      : requestedActivityTab === "purchases" && canReadPurchases
        ? "purchases"
        : canReadPurchases
          ? "purchases"
          : "postings";

  if (!canReadPostings && !canReadPurchases) {
    return null;
  }

  const actions = (
    <nav aria-label="Transaction history views">
      <CreditNoteToolbar className="rounded-xl border border-border/65 bg-muted/35 p-1">
        {canReadPurchases ? (
          <Button
            asChild
            variant={activityTab === "purchases" ? "default" : "ghost"}
            size="sm"
            className="rounded-lg"
          >
            <Link
              aria-current={activityTab === "purchases" ? "page" : undefined}
              href={creditNoteActivityLink(query, "purchases")}
            >
              Purchases
            </Link>
          </Button>
        ) : null}
        {canReadPostings ? (
          <Button
            asChild
            variant={activityTab === "postings" ? "default" : "ghost"}
            size="sm"
            className="rounded-lg"
          >
            <Link
              aria-current={activityTab === "postings" ? "page" : undefined}
              href={creditNoteActivityLink(query, "postings")}
            >
              Wallet postings
            </Link>
          </Button>
        ) : null}
      </CreditNoteToolbar>
    </nav>
  );

  return (
    <CreditNoteSection
      id="credit-note-transactions"
      title="Transaction history"
      description="Approved purchase activity and posted Credit Note wallet entries."
      icon={<WalletCards aria-hidden="true" />}
      actions={actions}
      padded={false}
      footer={
        activityTab === "postings" && transactions !== null ? (
          <HistoryFooter
            query={query}
            kind="transactions"
            itemCount={transactions.items.length}
            nextCursor={transactions.nextCursor}
          />
        ) : undefined
      }
    >
      {activityTab === "postings" ? (
        <TransactionPostings page={transactions} query={query} />
      ) : (
        <PurchaseTable
          page={purchaseActivity}
          query={query}
          canReadDocuments={canReadDocuments}
          activity
        />
      )}
    </CreditNoteSection>
  );
}

function DataFreshness({
  overview,
}: Readonly<{ overview: CreditNoteOverview }>): ReactElement {
  const syncMessage = (() => {
    switch (overview.dataFreshness.invoiceSyncStatus) {
      case "NOT_CONFIGURED":
        return "Purchase invoice synchronization is not configured";
      case "NOT_RUN":
        return "Purchase invoice synchronization has not run";
      case "FAILED":
        return "Purchase invoice synchronization needs attention";
      case "STALE":
        return `Purchase invoice data may be stale · last successful ${overview.dataFreshness.invoiceSyncLastSucceededAt === null ? "unknown" : formatDateTime(overview.dataFreshness.invoiceSyncLastSucceededAt)}`;
      case "CURRENT":
        return overview.offer.approvedPurchaseVehicleCount === 0
          ? "Purchase invoices are current; no eligible VIN evidence is recorded for this cycle"
          : `Purchase invoices are current through ${overview.dataFreshness.invoiceSyncCoveredThrough ?? "the latest available period"}`;
    }
  })();

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-caption text-muted-readable sm:flex-row sm:items-center sm:justify-between">
      <span className="flex min-w-0 items-center gap-2">
        <RefreshCw aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate">{syncMessage}</span>
      </span>
      <span className="shrink-0 text-tabular">
        Updated {formatDateTime(overview.dataFreshness.generatedAt)}
      </span>
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
  const canReadOverview = capabilities.canReadCreditNoteOverview;
  const canReadPurchases = capabilities.canReadCreditNotePurchaseInvoices;
  const canReadPostings = canReadOverview && capabilities.canReadEntries;

  if (!canReadOverview && !canReadPurchases) {
    return (
      <ContentEmptyState
        icon={<ReceiptText aria-hidden="true" />}
        title="Credit Note access is not enabled"
        description="Your dealer account does not currently have Credit Note eligibility or purchase-invoice access."
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      {canReadOverview ? (
        overview === null ? (
          <ContentStatus
            variant="warning"
            icon={<TriangleAlert aria-hidden="true" />}
            title="Credit Note cycle is being prepared"
            description="Current-cycle eligibility is not available yet. Historical records remain available below."
          />
        ) : (
          <>
            <CreditNoteHero overview={overview} />
            <OpportunityStrip overview={overview} />
            <EligibilityTracker overview={overview} />
            <ProcessTimeline overview={overview} />
            <SettlementSummary overview={overview} />
          </>
        )
      ) : (
        <ContentStatus
          variant="default"
          icon={<ShoppingCart aria-hidden="true" />}
          title="Purchase invoice access enabled"
          description="You can inspect supporting purchase evidence for your Credit Note cycles."
        />
      )}

      <CreditNotePolicyGuide
        overview={canReadOverview ? overview : null}
        page={canReadPurchases ? invoices : null}
        query={query}
        canReadPurchases={canReadPurchases}
        canReadSettlements={canReadOverview}
      />

      {canReadOverview ? (
        <>
          <EarningHistory
            page={earnings}
            query={query}
            canReadPurchases={canReadPurchases}
          />
          <SettlementHistory page={settlements} query={query} />
        </>
      ) : null}

      <TransactionHistorySection
        transactions={transactions}
        purchaseActivity={purchaseActivity}
        query={query}
        canReadPostings={canReadPostings}
        canReadPurchases={canReadPurchases}
        canReadDocuments={capabilities.canReadCreditNoteDocuments}
      />

      {canReadPurchases ? (
        <>
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
        </>
      ) : null}

      {canReadOverview && overview !== null ? (
        <DataFreshness overview={overview} />
      ) : null}
    </div>
  );
}

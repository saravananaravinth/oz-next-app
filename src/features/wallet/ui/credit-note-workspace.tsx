// oz-next-app/src/features/wallet/ui/credit-note-workspace.tsx
import Link from "next/link";
import type { ReactElement } from "react";
import {
  ArrowRight,
  BadgeIndianRupee,
  CalendarClock,
  CheckCircle2,
  CircleGauge,
  Clock3,
  Eye,
  FileDown,
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
  CreditNoteApprovalStatus,
  CreditNoteOfferStatus,
  CreditNoteOverview,
  CreditNotePurchaseInvoice,
  CreditNotePurchaseInvoicePage,
  CreditNoteSettlementStatus,
  WalletSearchParams,
} from "@/features/wallet/contracts/wallet.schema";
import type { WalletCapabilities } from "@/features/wallet/policies/wallet.policy";
import { formatMoney } from "@/features/wallet/utils/wallet-money";

export type CreditNoteWorkspaceProps = Readonly<{
  overview: CreditNoteOverview | null;
  invoices: CreditNotePurchaseInvoicePage | null;
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

function approvalVariant(
  status: CreditNoteApprovalStatus,
): BadgeProps["variant"] {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "info";
    case "REJECTED":
      return "destructive";
    case "NOT_REQUIRED":
    case "UNKNOWN":
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
            <Badge variant="outline">Read only</Badge>
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

type MetricProps = Readonly<{
  label: string;
  value: string;
  description: string;
  icon: ReactElement;
  tone?: "default" | "success" | "info" | "warning";
}>;

function MetricCard({
  label,
  value,
  description,
  icon,
  tone = "default",
}: MetricProps): ReactElement {
  return (
    <Card
      data-tone={tone}
      className={cn(
        "min-w-0 overflow-hidden border-border/70 bg-gradient-to-br shadow-sm shadow-foreground/[0.04]",
        tone === "default" && "from-card via-card to-muted/25",
        tone === "success" && "from-success/[0.07] via-card to-card",
        tone === "info" && "from-info/[0.07] via-card to-card",
        tone === "warning" && "from-warning/[0.07] via-card to-card",
      )}
    >
      <CardContent className="grid gap-3 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <span className="text-caption font-medium text-muted-readable">
            {label}
          </span>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border/70 bg-background/80 text-primary [&_svg]:size-4">
            {icon}
          </span>
        </div>
        <p className="truncate text-xl font-semibold tracking-tight text-foreground text-tabular">
          {value}
        </p>
        <p className="text-caption text-muted-readable">{description}</p>
      </CardContent>
    </Card>
  );
}

function CreditNoteMetrics({
  overview,
}: Readonly<{ overview: CreditNoteOverview }>): ReactElement {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Pending Credit Note"
        value={formatMoney(
          overview.unsettledCreditNoteBalance,
          overview.currency,
        )}
        description="Finalized benefit not yet settled in Zoho. Live projections are excluded."
        icon={<BadgeIndianRupee aria-hidden="true" />}
        tone="info"
      />
      <MetricCard
        label="Current offer earned"
        value={formatMoney(overview.offer.accruedAmount, overview.currency)}
        description={`${String(overview.offer.approvedPurchaseVehicleCount)} approved purchased vehicles in ${overview.offer.period.label}.`}
        icon={<ShoppingCart aria-hidden="true" />}
        tone={overview.offer.isActive ? "success" : "default"}
      />
      <MetricCard
        label="Next offer progress"
        value={`${String(overview.performance.eligibleRetailVehicleCount)} / ${String(overview.performance.targetRetailVehicleCount)}`}
        description={`${String(overview.performance.vehiclesRemaining)} more retail vehicle${overview.performance.vehiclesRemaining === 1 ? "" : "s"} needed.`}
        icon={<Target aria-hidden="true" />}
        tone={overview.performance.targetAchieved ? "success" : "warning"}
      />
      <MetricCard
        label="Lifetime settled"
        value={formatMoney(overview.lifetimeSettledAmount, overview.currency)}
        description="Credit Note value successfully settled through the provider workflow."
        icon={<Trophy aria-hidden="true" />}
        tone="success"
      />
    </div>
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

function documentHref(
  invoiceProjectionId: string,
  disposition: "inline" | "attachment",
): string {
  return `/api/credit-notes/invoices/${encodeURIComponent(invoiceProjectionId)}/document?disposition=${disposition}`;
}

function InvoiceActions({
  invoice,
  canReadDocuments,
}: Readonly<{
  invoice: CreditNotePurchaseInvoice;
  canReadDocuments: boolean;
}>): ReactElement | null {
  if (!canReadDocuments) return null;

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button asChild size="sm" variant="ghost">
        <a
          href={documentHref(invoice.invoiceProjectionId, "inline")}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View invoice ${invoice.invoiceNumber ?? invoice.providerInvoiceId}`}
        >
          <Eye aria-hidden="true" />
          <span className="hidden xl:inline">View</span>
        </a>
      </Button>
      <Button asChild size="sm" variant="outline">
        <a
          href={documentHref(invoice.invoiceProjectionId, "attachment")}
          aria-label={`Download invoice ${invoice.invoiceNumber ?? invoice.providerInvoiceId}`}
        >
          <FileDown aria-hidden="true" />
          <span className="hidden xl:inline">Download</span>
        </a>
      </Button>
    </div>
  );
}

function InvoiceCard({
  invoice,
  canReadDocuments,
}: Readonly<{
  invoice: CreditNotePurchaseInvoice;
  canReadDocuments: boolean;
}>): ReactElement {
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-body-sm font-semibold text-foreground">
              {invoice.invoiceNumber ?? "Zoho invoice"}
            </p>
            <p className="mt-0.5 truncate text-caption text-muted-readable">
              {invoice.referenceNumber ??
                invoice.locationName ??
                "Provider-discovered invoice"}
            </p>
          </div>
          <Badge variant={approvalVariant(invoice.approvalStatus)}>
            {humanize(invoice.approvalStatus)}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-caption">
          <div>
            <p className="text-muted-readable">Invoice date</p>
            <p className="mt-0.5 font-medium text-foreground">
              {invoice.invoiceDate === null
                ? "Pending sync"
                : formatDate(invoice.invoiceDate)}
            </p>
          </div>
          <div>
            <p className="text-muted-readable">Vehicles counted</p>
            <p className="mt-0.5 font-medium text-foreground text-tabular">
              {String(invoice.countedVehicleCount)} /{" "}
              {String(invoice.vehicleCount)}
            </p>
          </div>
          <div>
            <p className="text-muted-readable">Invoice total</p>
            <p className="mt-0.5 font-medium text-foreground text-tabular">
              {invoice.total === null || invoice.currency === null
                ? "—"
                : formatMoney(invoice.total, invoice.currency)}
            </p>
          </div>
          <div>
            <p className="text-muted-readable">Provider status</p>
            <p className="mt-0.5 font-medium text-foreground">
              {invoice.providerStatus === null
                ? "Unknown"
                : humanize(invoice.providerStatus)}
            </p>
          </div>
          <div>
            <p className="text-muted-readable">Invoice location</p>
            <p className="mt-0.5 font-medium text-foreground">
              {invoice.locationName ?? invoice.locationId ?? "Not supplied"}
            </p>
          </div>
          <div>
            <p className="text-muted-readable">Eligibility</p>
            <p className="mt-0.5 font-medium text-foreground">
              {humanize(invoice.exclusionReason ?? invoice.eligibilityStatus)}
            </p>
          </div>
        </div>
        <InvoiceActions invoice={invoice} canReadDocuments={canReadDocuments} />
      </CardContent>
    </Card>
  );
}

function invoicePaginationQuery(
  query: WalletSearchParams,
  cursor: string | null,
): Record<string, string> {
  const next: Record<string, string> = { tab: "credit-note" };
  if (query.walletId !== undefined) next["walletId"] = query.walletId;
  if (cursor !== null) next["creditNoteInvoiceCursor"] = cursor;
  return next;
}

function PurchaseInvoices({
  invoices,
  query,
  canReadDocuments,
}: Readonly<{
  invoices: CreditNotePurchaseInvoicePage | null;
  query: WalletSearchParams;
  canReadDocuments: boolean;
}>): ReactElement {
  if (invoices === null) {
    return (
      <ContentDataSurface
        title="Approved purchase invoices"
        description="Purchase invoice visibility requires the Credit Note purchase-invoice permission."
        padded
      >
        <ContentEmptyState
          icon={<ReceiptText aria-hidden="true" />}
          title="Purchase invoices are not available"
          description="Your account can view Credit Note eligibility, but it does not currently have permission to inspect dealer purchase invoices."
        />
      </ContentDataSurface>
    );
  }

  const footer =
    query.creditNoteInvoiceCursor !== undefined ||
    invoices.nextCursor !== null ? (
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
        {query.creditNoteInvoiceCursor === undefined ? (
          <Button variant="ghost" size="sm" disabled>
            First page
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm">
            <Link
              href={{
                pathname: "/wallet",
                query: invoicePaginationQuery(query, null),
              }}
              scroll={false}
            >
              First page
            </Link>
          </Button>
        )}
        {invoices.nextCursor === null ? (
          <Button variant="outline" size="sm" disabled>
            End of list
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link
              href={{
                pathname: "/wallet",
                query: invoicePaginationQuery(query, invoices.nextCursor),
              }}
              scroll={false}
            >
              Next invoices
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    ) : undefined;

  return (
    <ContentDataSurface
      title="Approved purchase invoices"
      description="Shipment-bound Zoho Inventory invoices for the active offer month. Only provider-approved invoices contribute to the benefit."
      padded={false}
      className="min-w-0 overflow-hidden [&>[data-slot=card-footer]]:p-0"
      footer={footer}
    >
      {invoices.items.length === 0 ? (
        <div className="p-4 sm:p-6">
          <ContentEmptyState
            icon={<ReceiptText aria-hidden="true" />}
            title="No purchase invoices yet"
            description="Approved Zoho purchase invoices will appear here after they are synchronized and mapped to your dealer shipment."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 p-3 md:hidden">
            {invoices.items.map((invoice) => (
              <InvoiceCard
                key={invoice.invoiceProjectionId}
                invoice={invoice}
                canReadDocuments={canReadDocuments}
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-center">Date</TableHead>
                  <TableHead className="text-center">Approval</TableHead>
                  <TableHead className="text-right">Vehicles</TableHead>
                  <TableHead className="text-right">Invoice total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.items.map((invoice) => (
                  <TableRow key={invoice.invoiceProjectionId}>
                    <TableCell>
                      <div className="min-w-[12rem]">
                        <p className="font-medium text-foreground">
                          {invoice.invoiceNumber ?? "Zoho invoice"}
                        </p>
                        <p className="mt-0.5 text-caption text-muted-readable">
                          {invoice.referenceNumber ??
                            invoice.locationName ??
                            "Provider-discovered invoice"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-tabular">
                      {invoice.invoiceDate === null
                        ? "—"
                        : formatDate(invoice.invoiceDate)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={approvalVariant(invoice.approvalStatus)}>
                        {humanize(invoice.approvalStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-tabular">
                      <span className="font-medium text-foreground">
                        {String(invoice.countedVehicleCount)}
                      </span>
                      <span className="text-muted-readable">
                        {` / ${String(invoice.vehicleCount)}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-tabular">
                      {invoice.total === null || invoice.currency === null
                        ? "—"
                        : formatMoney(invoice.total, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <InvoiceActions
                        invoice={invoice}
                        canReadDocuments={canReadDocuments}
                      />
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
  invoices,
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

  if (overview === null) {
    return (
      <ContentStatus
        variant="warning"
        icon={<TriangleAlert aria-hidden="true" />}
        title="Credit Note eligibility is being prepared"
        description="The current monthly Credit Note cycle is not available yet. No projected amount has been treated as a financial entitlement."
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      <CreditNoteHero overview={overview} />
      <CreditNoteMetrics overview={overview} />
      <OpportunityBanner overview={overview} />
      <EligibilityTracker overview={overview} />
      <ProcessTimeline overview={overview} />
      <SettlementCard overview={overview} />
      <PurchaseInvoices
        invoices={invoices}
        query={query}
        canReadDocuments={capabilities.canReadCreditNoteDocuments}
      />
      <DataFreshness overview={overview} />
    </div>
  );
}

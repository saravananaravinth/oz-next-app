import type { ReactElement } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ReceiptText,
  ShoppingCart,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { PurchasePage } from "../contracts/purchases.schema";
import type {
  CreditNoteOverview,
  WalletSearchParams,
} from "../contracts/wallet.schema";
import { purchaseCycleLink } from "../utils/purchase-links";
import { formatMoney } from "../utils/wallet-money";
import {
  CreditNoteInset,
  CreditNoteMetric,
  CreditNoteMetricGrid,
  CreditNoteSection,
  CreditNoteToolbar,
} from "./credit-note-ui";
import { purchaseMonth } from "./purchase-invoices";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});

function inclusivePeriodEnd(endExclusive: string): string {
  const end = new Date(`${endExclusive}T00:00:00+05:30`);
  end.setDate(end.getDate() - 1);
  return DATE_FORMATTER.format(end);
}

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function settlementStatusLabel(status: string): string {
  switch (status) {
    case "BLOCKED_PROVIDER_CONFIGURATION":
      return "Setup required";
    case "RECONCILIATION_REQUIRED":
      return "Review required";
    case "ADJUSTMENT_REQUIRED":
      return "Adjustment required";
    case "POSTING":
      return "Processing";
    default:
      return humanize(status);
  }
}
export function CreditNotePolicyGuide({
  overview,
  page,
  query,
  canReadPurchases,
  canReadSettlements,
}: {
  overview: CreditNoteOverview | null;
  page: PurchasePage | null;
  query: WalletSearchParams;
  canReadPurchases: boolean;
  canReadSettlements: boolean;
}): ReactElement {
  const selected = page?.cycle;
  const qualification = overview?.offer.qualificationPerformance;
  const cycle =
    selected ??
    (overview !== null && qualification !== undefined
      ? {
          cycleId: overview.cycleId,
          performanceStart: qualification.period.start,
          performanceEndExclusive: qualification.period.endExclusive,
          offerStart: overview.offer.period.start,
          offerEndExclusive: overview.offer.period.endExclusive,
          settlementStart: overview.settlement.period.start,
          settlementEndExclusive: overview.settlement.period.endExclusive,
          currency: overview.currency,
          retailSaleCount: qualification.eligibleRetailVehicleCount,
          retailTargetCount: qualification.targetRetailVehicleCount,
          qualified: qualification.targetAchieved,
          creditPerVehicle: overview.offer.creditPerApprovedPurchaseVehicle,
          approvedVehicleCount: overview.offer.approvedPurchaseVehicleCount,
          amount: overview.offer.accruedAmount,
          offerStatus: overview.offer.status,
          settlementStatus: overview.settlement.status,
          finalized: overview.settlement.finalAmount !== null,
          settledAt: overview.settlement.settledAt,
          reconciledAt: overview.offer.purchaseLastReconciledAt,
        }
      : null);

  if (cycle === null) {
    return (
      <CreditNoteSection
        title="Your credit-note policy"
        description="Your cycle-specific target and purchase benefit will appear when a Credit Note cycle is available."
        icon={<ReceiptText aria-hidden="true" />}
      >
        <CreditNoteInset className="text-body-sm text-muted-readable">
          No policy cycle is available for this view.
        </CreditNoteInset>
      </CreditNoteSection>
    );
  }

  const remaining = Math.max(
    0,
    cycle.retailTargetCount - cycle.retailSaleCount,
  );
  const selectedMonth = purchaseMonth(cycle.offerStart);
  const currentCycleSelected = overview?.cycleId === cycle.cycleId;

  return (
    <CreditNoteSection
      title="Your credit-note policy"
      description={`Rules recorded for the ${selectedMonth} purchase month.`}
      icon={<ReceiptText aria-hidden="true" />}
      actions={
        <CreditNoteToolbar>
          <Badge variant={cycle.qualified ? "success" : "warning"}>
            {cycle.qualified ? "Qualified" : "Not qualified"}
          </Badge>
          <Badge variant="outline">
            {settlementStatusLabel(cycle.settlementStatus)}
          </Badge>
        </CreditNoteToolbar>
      }
    >
      <div className="grid gap-4">
        <CreditNoteMetricGrid>
          <CreditNoteMetric
            icon={<Target aria-hidden="true" />}
            tone={cycle.qualified ? "success" : "warning"}
            label={`Qualify in ${purchaseMonth(cycle.performanceStart)}`}
            value={`${String(cycle.retailSaleCount)} / ${String(cycle.retailTargetCount)}`}
            caption={
              cycle.qualified
                ? "Retail target achieved"
                : `${String(remaining)} vehicle${remaining === 1 ? "" : "s"} remaining`
            }
          />
          <CreditNoteMetric
            icon={<ShoppingCart aria-hidden="true" />}
            tone="primary"
            label={`Earn in ${selectedMonth}`}
            value={`${String(cycle.approvedVehicleCount)} approved`}
            caption={`${formatMoney(cycle.creditPerVehicle, cycle.currency)} per eligible vehicle`}
          />
          <CreditNoteMetric
            icon={<ReceiptText aria-hidden="true" />}
            tone="info"
            label="Recorded earning"
            value={formatMoney(cycle.amount, cycle.currency)}
            caption={
              cycle.finalized
                ? "Finalized cycle evidence"
                : "Current cycle evidence"
            }
            emphasis
          />
          <CreditNoteMetric
            icon={<CalendarClock aria-hidden="true" />}
            tone="default"
            label={`Settlement in ${purchaseMonth(cycle.settlementStart)}`}
            value={settlementStatusLabel(cycle.settlementStatus)}
            caption={`Configured through ${inclusivePeriodEnd(cycle.settlementEndExclusive)}`}
          />
        </CreditNoteMetricGrid>

        <CreditNoteInset>
          <div className="grid gap-3">
            <div>
              <p className="text-card-title text-foreground">
                Which purchases count?
              </p>
              <p className="mt-0.5 text-caption text-muted-readable">
                Eligibility is evaluated from saved cycle evidence.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                "Issued company purchase invoices",
                "Issued, non-cancelled dealer-to-dealer invoices",
                "Each normalized VIN counts once per buyer and purchase month",
                "Finalized evidence remains authoritative after later source changes",
              ].map((rule) => (
                <div
                  key={rule}
                  className="flex items-start gap-2 rounded-xl border border-border/60 bg-background/55 px-3 py-2.5 text-caption text-foreground"
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-success"
                  />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        </CreditNoteInset>

        {currentCycleSelected ? (
          <CreditNoteInset className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">
                Next offer progress ·{" "}
                {overview.nextOfferPerformance.period.label}
              </p>
              <p className="mt-0.5 text-caption text-muted-readable">
                {String(
                  overview.nextOfferPerformance.eligibleRetailVehicleCount,
                )}{" "}
                /{" "}
                {String(overview.nextOfferPerformance.targetRetailVehicleCount)}{" "}
                eligible retail vehicles ·{" "}
                {String(overview.nextOfferPerformance.vehiclesRemaining)}{" "}
                remaining
              </p>
            </div>
            <Badge
              variant={
                overview.nextOfferPerformance.targetAchieved
                  ? "success"
                  : "outline"
              }
            >
              {String(overview.nextOfferPerformance.progressPercent)}%
            </Badge>
          </CreditNoteInset>
        ) : null}

        {canReadPurchases || canReadSettlements ? (
          <div className="flex flex-wrap gap-2">
            {canReadPurchases ? (
              <Button asChild size="sm" variant="outline">
                <Link href={purchaseCycleLink(query, cycle.cycleId)}>
                  View approved purchases
                </Link>
              </Button>
            ) : null}
            {canReadSettlements ? (
              <Button asChild size="sm" variant="ghost">
                <Link href="#credit-note-settlements">
                  View settlement history
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </CreditNoteSection>
  );
}

import Link from "next/link";
import { BookOpen } from "lucide-react";

import {
  ContentDataSurface,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { PurchasePage } from "../contracts/purchases.schema";
import type {
  CreditNoteOverview,
  WalletSearchParams,
} from "../contracts/wallet.schema";
import { purchaseCycleLink } from "../utils/purchase-links";
import { formatMoney } from "../utils/wallet-money";
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
}) {
  const selected = page?.cycle;
  const qualification = overview?.offer.qualificationPerformance;
  const cycle =
    selected ??
    (overview && qualification
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

  if (!cycle) {
    return (
      <ContentStatus
        variant="default"
        icon={<BookOpen aria-hidden="true" />}
        title="Your credit-note policy"
        description="Your target, purchase benefit and settlement months will appear when a credit-note cycle is available."
      />
    );
  }

  const remaining = Math.max(
    0,
    cycle.retailTargetCount - cycle.retailSaleCount,
  );
  const next =
    overview !== null && overview.cycleId === cycle.cycleId
      ? overview.nextOfferPerformance
      : null;

  return (
    <ContentDataSurface
      title="Your credit-note policy"
      description={`Rules recorded for the ${purchaseMonth(cycle.offerStart)} purchase month`}
      padded
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="outline">Offer: {humanize(cycle.offerStatus)}</Badge>
        <Badge variant="outline">
          Settlement: {humanize(cycle.settlementStatus)}
        </Badge>
      </div>

      <ol className="grid gap-3 md:grid-cols-3">
        <li className="rounded-xl border bg-muted/20 p-4">
          <h3 className="font-semibold">
            1. Qualify in {purchaseMonth(cycle.performanceStart)}
          </h3>
          <p className="mt-2 text-sm">
            Sell {cycle.retailTargetCount} eligible retail vehicles by{" "}
            {inclusivePeriodEnd(cycle.performanceEndExclusive)}.
          </p>
          <p className="mt-2 text-sm font-medium">
            {cycle.retailSaleCount} / {cycle.retailTargetCount} achieved ·{" "}
            {cycle.qualified
              ? "Target achieved"
              : `${String(remaining)} short of the target`}
          </p>
        </li>

        <li className="rounded-xl border bg-muted/20 p-4">
          <h3 className="font-semibold">
            2. Earn on {purchaseMonth(cycle.offerStart)} purchases
          </h3>
          <p className="mt-2 text-sm">
            When this cycle is qualified, each eligible purchased vehicle can
            contribute {formatMoney(cycle.creditPerVehicle, cycle.currency)}.
          </p>
          <p className="mt-2 text-sm font-medium text-tabular">
            {cycle.approvedVehicleCount} approved ×{" "}
            {formatMoney(cycle.creditPerVehicle, cycle.currency)} ={" "}
            {formatMoney(cycle.amount, cycle.currency)}{" "}
            {cycle.finalized ? "finalized" : "accruing"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Purchase period: {purchaseMonth(cycle.offerStart)} through{" "}
            {inclusivePeriodEnd(cycle.offerEndExclusive)}.
          </p>
        </li>

        <li className="rounded-xl border bg-muted/20 p-4">
          <h3 className="font-semibold">
            3. Settlement in {purchaseMonth(cycle.settlementStart)}
          </h3>
          <p className="mt-2 text-sm">
            After the purchase period closes, the saved cycle evidence is
            finalized and processed during the configured settlement period.
            Accruing earnings are not yet a posted wallet credit.
          </p>
          <p className="mt-2 text-sm">
            Configured settlement period ends{" "}
            {inclusivePeriodEnd(cycle.settlementEndExclusive)}. The recorded
            settlement status is {humanize(cycle.settlementStatus)}; this period
            is not a guaranteed payment date.
          </p>
        </li>
      </ol>

      <div className="mt-4 rounded-lg border p-4">
        <h3 className="font-semibold">Which purchases count?</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            Eligible Zoho purchase invoices beginning with FG/ and issued,
            non-cancelled dealer-to-dealer invoices bought by your dealership.
          </li>
          <li>
            Each normalized VIN counts once per buying dealer per purchase
            month, even when it appears in both invoice sources.
          </li>
          <li>
            D2D purchases do not require delivery confirmation or full payment.
            Self-sales and missing or invalid VIN evidence do not qualify.
          </li>
          <li>
            Invoice dates determine the purchase month. Before finalization,
            later source changes can affect accruals; after finalization, the
            persisted cycle evidence remains the authoritative earning record.
          </li>
        </ul>
      </div>

      {next ? (
        <div className="mt-4 rounded-lg border border-dashed p-4 text-sm">
          <h3 className="font-semibold">
            Progress toward the next offer · {next.period.label}
          </h3>
          <p className="mt-1">
            This is separate from the {purchaseMonth(cycle.offerStart)} earning
            offer above. {next.eligibleRetailVehicleCount} /{" "}
            {next.targetRetailVehicleCount} eligible retail vehicles are
            recorded for the next qualification period.
            {next.targetAchieved
              ? " The next target is already achieved."
              : ` ${String(next.vehiclesRemaining)} more are required to reach the target.`}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {canReadPurchases ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={purchaseCycleLink(query, cycle.cycleId)}>
              View approved purchases
            </Link>
          </Button>
        ) : null}
        {canReadSettlements ? (
          <Button variant="ghost" size="sm" asChild>
            <a href="#credit-note-settlements">View settlement history</a>
          </Button>
        ) : null}
      </div>
    </ContentDataSurface>
  );
}

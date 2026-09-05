import Link from "next/link";
import {
  ContentDataSurface,
  ContentStatus,
} from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import type {
  CreditNoteOverview,
  WalletSearchParams,
} from "../contracts/wallet.schema";
import type { PurchasePage } from "../contracts/purchases.schema";
import { purchaseCycleLink } from "../utils/purchase-links";
import { formatMoney } from "../utils/wallet-money";
import { purchaseMonth } from "./purchase-invoices";

export function CreditNotePolicyGuide({
  overview,
  page,
  query,
}: {
  overview: CreditNoteOverview | null;
  page: PurchasePage | null;
  query: WalletSearchParams;
}) {
  const selected = page?.cycle;
  const qualification = overview?.offer.qualificationPerformance;
  const cycle =
    selected ??
    (overview && qualification
      ? {
          cycleId: overview.cycleId,
          performanceStart: qualification.period.start,
          offerStart: overview.offer.period.start,
          offerEndExclusive: overview.offer.period.endExclusive,
          settlementStart: overview.settlement.period.start,
          currency: overview.currency,
          retailSaleCount: qualification.eligibleRetailVehicleCount,
          retailTargetCount: qualification.targetRetailVehicleCount,
          qualified: qualification.targetAchieved,
          creditPerVehicle: overview.offer.creditPerApprovedPurchaseVehicle,
          approvedVehicleCount: overview.offer.approvedPurchaseVehicleCount,
          amount: overview.offer.accruedAmount,
          finalized: overview.settlement.finalAmount !== null,
        }
      : null);
  if (!cycle)
    return (
      <ContentStatus
        variant="default"
        icon={<BookOpen aria-hidden="true" />}
        title="Your credit-note policy"
        description="Your target, purchase benefit and settlement months will appear when a credit-note cycle is available."
      />
    );
  const remaining = Math.max(
    0,
    cycle.retailTargetCount - cycle.retailSaleCount,
  );
  const deadline = new Date(`${cycle.offerStart}T00:00:00Z`);
  deadline.setUTCDate(deadline.getUTCDate() - 1);
  const next = overview?.nextOfferPerformance;
  return (
    <ContentDataSurface
      title="Your credit-note policy"
      description={`Rules for the ${purchaseMonth(cycle.offerStart)} purchase month`}
      padded
    >
      <ol className="grid gap-3 md:grid-cols-3">
        <li className="rounded-xl border bg-muted/20 p-4">
          <h3 className="font-semibold">
            1. Qualify in {purchaseMonth(cycle.performanceStart)}
          </h3>
          <p className="mt-2 text-sm">
            Sell {cycle.retailTargetCount} eligible retail vehicles by{" "}
            {deadline.toLocaleDateString("en-IN", {
              dateStyle: "medium",
              timeZone: "UTC",
            })}
            .
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
            Once qualified, earn{" "}
            {formatMoney(cycle.creditPerVehicle, cycle.currency)} per eligible
            vehicle purchased in this month.
          </p>
          <p className="mt-2 text-sm font-medium">
            {cycle.approvedVehicleCount} approved ×{" "}
            {formatMoney(cycle.creditPerVehicle, cycle.currency)} ={" "}
            {formatMoney(cycle.amount, cycle.currency)}{" "}
            {cycle.finalized ? "finalized" : "accruing"}
          </p>
        </li>
        <li className="rounded-xl border bg-muted/20 p-4">
          <h3 className="font-semibold">
            3. Settlement in {purchaseMonth(cycle.settlementStart)}
          </h3>
          <p className="mt-2 text-sm">
            After the purchase month closes, approved earnings are finalized and
            processed as a credit note. Accruing earnings are not yet a posted
            wallet credit.
          </p>
          <p className="mt-2 text-sm">
            The settlement history shows actual processing status; the month is
            not a guaranteed payment date.
          </p>
        </li>
      </ol>
      <div className="mt-4 rounded-lg border p-4">
        <h3 className="font-semibold">Which purchases count?</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            Eligible Zoho FG/ vehicle invoices and issued, non-cancelled
            dealer-to-dealer invoices bought by your dealership.
          </li>
          <li>
            Each VIN counts once per buying dealer per purchase month, including
            when it appears in both sources.
          </li>
          <li>
            D2D purchases do not require delivery confirmation or full payment.
            Self-sales and missing or invalid VINs do not qualify.
          </li>
          <li>
            Invoice dates determine the purchase month. Cancelled purchases are
            removed before finalization; finalized evidence remains available in
            history.
          </li>
        </ul>
      </div>
      {next ? (
        <div className="mt-4 text-sm">
          <h3 className="font-semibold">
            Your next qualification target · {next.period.label}
          </h3>
          <p className="mt-1">
            {next.targetAchieved
              ? "You have reached the target."
              : `Sell ${String(next.vehiclesRemaining)} more eligible retail vehicles to reach your target of ${String(next.targetRetailVehicleCount)}.`}{" "}
            Progress: {next.eligibleRetailVehicleCount} /{" "}
            {next.targetRetailVehicleCount}. This qualifies the following
            month’s purchase offer.
          </p>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={purchaseCycleLink(query, cycle.cycleId)}>
            View approved purchases
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href="#credit-note-settlements">View settlement history</a>
        </Button>
      </div>
    </ContentDataSurface>
  );
}

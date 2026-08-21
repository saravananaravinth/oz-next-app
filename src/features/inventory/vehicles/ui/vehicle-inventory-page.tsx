// oz-next-app/src/features/inventory/vehicles/ui/vehicle-inventory-page.tsx
import type { ReactElement } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CarFront,
  Minus,
  PackageCheck,
  PackageOpen,
  ShieldAlert,
  Truck,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentHeader,
  ContentMetricCard,
  ContentMetrics,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ApiHttpError } from "@/lib/api/problem";
import { cn } from "@/lib/utils";

import type {
  ResolvedVehicleInventoryAccess,
  VehicleInventoryAccess,
} from "@/features/inventory/vehicles/policies/vehicle-inventory.policy";
import type {
  VehicleInventoryKpiTrend,
  VehicleInventorySearchParams,
  VehicleInventoryWorkspaceData,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
import { VehicleInventoryDataQuality } from "@/features/inventory/vehicles/ui/vehicle-inventory-data-quality";
import { VehicleInventoryFilters } from "@/features/inventory/vehicles/ui/vehicle-inventory-filters";
import { VehicleInventoryTable } from "@/features/inventory/vehicles/ui/vehicle-inventory-table";
import { vehicleInventoryPageHref } from "@/features/inventory/vehicles/utils/vehicle-inventory-url";

function kpiHref(
  query: VehicleInventorySearchParams,
  kpi: VehicleInventorySearchParams["kpi"],
): ReturnType<typeof vehicleInventoryPageHref> {
  return vehicleInventoryPageHref(query, {
    kpi: query.kpi === kpi ? undefined : kpi,
    status: [],
    cursor: undefined,
  });
}

function KpiTooltip({
  children,
  content,
}: Readonly<{
  children: ReactElement;
  content: string;
}>): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="h-full min-w-0">{children}</div>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <span className="grid gap-1">
          <span>{content}</span>
          <span className="text-muted-readable">
            Trend compares stock activity in the latest 30 days with the
            preceding 30 days under the same authorized filters.
          </span>
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

type KpiDeltaSemantics = "higher-better" | "lower-better" | "neutral";
type KpiDeltaSentiment = "favorable" | "adverse" | "neutral" | "stable";

function kpiDeltaSentiment(
  direction: -1 | 0 | 1,
  semantics: KpiDeltaSemantics,
): KpiDeltaSentiment {
  if (direction === 0) {
    return "stable";
  }

  if (semantics === "neutral") {
    return "neutral";
  }

  if (semantics === "higher-better") {
    return direction > 0 ? "favorable" : "adverse";
  }

  return direction < 0 ? "favorable" : "adverse";
}

const KPI_DELTA_SENTIMENT_CLASSES = {
  favorable:
    "border-success/35 bg-success/10 text-success dark:border-success/40 dark:bg-success/15",
  adverse:
    "border-destructive/35 bg-destructive/10 text-destructive dark:border-destructive/45 dark:bg-destructive/15",
  neutral:
    "border-info/35 bg-info/10 text-info dark:border-info/40 dark:bg-info/15",
  stable: "border-border/70 bg-muted/65 text-foreground/75 dark:bg-muted/45",
} as const satisfies Readonly<Record<KpiDeltaSentiment, string>>;

const KPI_DELTA_ACTIVE_SENTIMENT_CLASSES = {
  favorable:
    "border-success/55 bg-background/90 text-success shadow-xs ring-1 ring-inset ring-success/15 dark:bg-background/85",
  adverse:
    "border-destructive/55 bg-background/90 text-destructive shadow-xs ring-1 ring-inset ring-destructive/15 dark:bg-background/85",
  neutral:
    "border-info/55 bg-background/90 text-info shadow-xs ring-1 ring-inset ring-info/15 dark:bg-background/85",
  stable:
    "border-background/45 bg-background/90 text-foreground shadow-xs ring-1 ring-inset ring-foreground/10 dark:bg-background/85",
} as const satisfies Readonly<Record<KpiDeltaSentiment, string>>;

function sentimentLabel(sentiment: KpiDeltaSentiment): string {
  switch (sentiment) {
    case "favorable":
      return "Favorable";
    case "adverse":
      return "Needs attention";
    case "neutral":
      return "Directional";
    case "stable":
      return "No change";
  }
}

function KpiDeltaIndicator({
  trend,
  semantics,
  active,
}: Readonly<{
  trend: VehicleInventoryKpiTrend;
  semantics: KpiDeltaSemantics;
  active: boolean;
}>): ReactElement {
  const direction: -1 | 0 | 1 = trend.delta > 0 ? 1 : trend.delta < 0 ? -1 : 0;
  const sentiment = kpiDeltaSentiment(direction, semantics);
  const DeltaIcon =
    direction > 0 ? ArrowUpRight : direction < 0 ? ArrowDownRight : Minus;
  const baseClassName = cn(
    "inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[0.6875rem] font-semibold leading-none text-tabular",
    active
      ? KPI_DELTA_ACTIVE_SENTIMENT_CLASSES[sentiment]
      : KPI_DELTA_SENTIMENT_CLASSES[sentiment],
  );
  const meaning = sentimentLabel(sentiment);

  if (trend.previousPeriod === 0) {
    if (trend.currentPeriod === 0) {
      return (
        <span
          className={baseClassName}
          aria-label="No matching stock activity in either 30-day comparison period"
        >
          <DeltaIcon aria-hidden="true" className="size-3" />
          0%
        </span>
      );
    }

    return (
      <span
        className={baseClassName}
        aria-label={`${meaning}: ${trend.currentPeriod.toLocaleString("en-IN")} new matching stock activities in the latest 30 days; the preceding 30-day period had none`}
      >
        <DeltaIcon aria-hidden="true" className="size-3" />+
        {trend.delta.toLocaleString("en-IN")} new
      </span>
    );
  }

  const deltaPercent = trend.deltaPercent ?? 0;
  const prefix = deltaPercent > 0 ? "+" : "";
  const formattedPercent = deltaPercent.toLocaleString("en-IN", {
    maximumFractionDigits: 1,
  });

  return (
    <span
      className={baseClassName}
      aria-label={`${meaning}: ${prefix}${formattedPercent} percent stock activity versus the preceding 30-day period`}
    >
      <DeltaIcon aria-hidden="true" className="size-3" />
      {prefix}
      {formattedPercent}%
    </span>
  );
}

const INVENTORY_KPI_CARD_CLASS_NAME =
  "[&_[data-slot=content-metric-card-value]]:text-[clamp(1.5rem,1.65vw,1.875rem)]";

export function VehicleInventoryPage({
  access,
  query,
  data,
}: Readonly<{
  access: ResolvedVehicleInventoryAccess;
  query: VehicleInventorySearchParams;
  data: VehicleInventoryWorkspaceData;
}>): ReactElement {
  const kpis = data.list.kpis;
  const trends = data.list.kpiTrends;

  return (
    <ContentRoot
      width="full"
      aria-labelledby="vehicle-inventory-title"
      className="lg:h-full lg:min-h-0 lg:overflow-hidden"
    >
      <VehicleInventoryFilters query={query} facets={data.facets} />

      {data.cursorReset ? (
        <ContentStatus
          variant="warning"
          icon={<AlertTriangle aria-hidden="true" />}
          title="Inventory list restarted at the first page"
          description="The previous page link was no longer valid for the current filters. Your filters are still applied, and the first 20 results in the current sort order are shown."
        />
      ) : null}

      <ContentMetrics
        aria-label="Inventory summary"
        className="!grid-cols-[repeat(6,minmax(10rem,1fr))] gap-3 overflow-x-auto overscroll-x-contain pb-1"
      >
        <KpiTooltip content="All vehicles and transfer-history rows you are authorized to view with the current filters.">
          <ContentMetricCard
            href={vehicleInventoryPageHref(query, {
              kpi: undefined,
              status: [],
              cursor: undefined,
            })}
            label="Total"
            value={kpis.total.toLocaleString("en-IN")}
            className={INVENTORY_KPI_CARD_CLASS_NAME}
            trend={
              <KpiDeltaIndicator
                trend={trends.total}
                semantics="neutral"
                active={query.kpi === undefined}
              />
            }
            active={query.kpi === undefined}
            ariaLabel={`Total: ${kpis.total.toLocaleString("en-IN")} matching inventory records.`}
            icon={<CarFront aria-hidden="true" />}
            presentation="dashboard"
            tone="primary"
          />
        </KpiTooltip>
        <KpiTooltip content="Vehicles currently on hand and available in the authorized stock scope.">
          <ContentMetricCard
            href={kpiHref(query, "AVAILABLE")}
            label="Available"
            value={kpis.available.toLocaleString("en-IN")}
            className={INVENTORY_KPI_CARD_CLASS_NAME}
            trend={
              <KpiDeltaIndicator
                trend={trends.available}
                semantics="higher-better"
                active={query.kpi === "AVAILABLE"}
              />
            }
            active={query.kpi === "AVAILABLE"}
            ariaLabel={`Available: ${kpis.available.toLocaleString("en-IN")} vehicles ready in stock.`}
            icon={<PackageOpen aria-hidden="true" />}
            presentation="dashboard"
            tone="success"
          />
        </KpiTooltip>
        <KpiTooltip content="Vehicles currently held against a reservation and not available as free stock.">
          <ContentMetricCard
            href={kpiHref(query, "RESERVED")}
            label="Reserved"
            value={kpis.reserved.toLocaleString("en-IN")}
            className={INVENTORY_KPI_CARD_CLASS_NAME}
            trend={
              <KpiDeltaIndicator
                trend={trends.reserved}
                semantics="neutral"
                active={query.kpi === "RESERVED"}
              />
            }
            active={query.kpi === "RESERVED"}
            ariaLabel={`Reserved: ${kpis.reserved.toLocaleString("en-IN")} vehicles.`}
            icon={<PackageCheck aria-hidden="true" />}
            presentation="dashboard"
            tone="info"
          />
        </KpiTooltip>
        <KpiTooltip content="Completed outbound vehicle transfers retained as inventory history for the authorized scope.">
          <ContentMetricCard
            href={kpiHref(query, "TRANSFERRED")}
            label="Transferred"
            value={kpis.transferred.toLocaleString("en-IN")}
            className={INVENTORY_KPI_CARD_CLASS_NAME}
            trend={
              <KpiDeltaIndicator
                trend={trends.transferred}
                semantics="neutral"
                active={query.kpi === "TRANSFERRED"}
              />
            }
            active={query.kpi === "TRANSFERRED"}
            ariaLabel={`Transferred: ${kpis.transferred.toLocaleString("en-IN")} transfer-history records.`}
            icon={<Truck aria-hidden="true" />}
            presentation="dashboard"
            tone="default"
          />
        </KpiTooltip>
        <KpiTooltip content="Vehicles whose sale is completed in the authorized inventory scope.">
          <ContentMetricCard
            href={kpiHref(query, "SOLD")}
            label="Sold"
            value={kpis.sold.toLocaleString("en-IN")}
            className={INVENTORY_KPI_CARD_CLASS_NAME}
            trend={
              <KpiDeltaIndicator
                trend={trends.sold}
                semantics="higher-better"
                active={query.kpi === "SOLD"}
              />
            }
            active={query.kpi === "SOLD"}
            ariaLabel={`Sold: ${kpis.sold.toLocaleString("en-IN")} vehicles.`}
            icon={<PackageCheck aria-hidden="true" />}
            presentation="dashboard"
            tone="default"
          />
        </KpiTooltip>
        <KpiTooltip content="Available vehicles that have remained in stock for more than 30 days and may need sales attention.">
          <ContentMetricCard
            href={kpiHref(query, "AGING")}
            label="Aging"
            value={kpis.aging.toLocaleString("en-IN")}
            className={INVENTORY_KPI_CARD_CLASS_NAME}
            trend={
              <KpiDeltaIndicator
                trend={trends.aging}
                semantics="lower-better"
                active={query.kpi === "AGING"}
              />
            }
            active={query.kpi === "AGING"}
            ariaLabel={`Aging: ${kpis.aging.toLocaleString("en-IN")} available vehicles over 30 days.`}
            icon={<AlertTriangle aria-hidden="true" />}
            presentation="dashboard"
            tone="warning"
          />
        </KpiTooltip>
      </ContentMetrics>

      <VehicleInventoryDataQuality
        counts={data.list.dataQuality}
        context={access.context}
        query={query}
        canRemediate={access.capabilities.canRemediateDataQuality}
      />

      <ContentDataSurface
        padded
        className="min-h-[28rem] lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
        contentClassName="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
      >
        <VehicleInventoryTable
          data={data}
          query={query}
          context={access.context}
        />
      </ContentDataSurface>
    </ContentRoot>
  );
}

export function VehicleInventoryAccessState({
  access,
}: Readonly<{
  access: Exclude<VehicleInventoryAccess, ResolvedVehicleInventoryAccess>;
}>): ReactElement {
  return (
    <ContentRoot width="narrow" aria-labelledby="inventory-forbidden-title">
      <ContentHeader
        eyebrow={
          <Badge variant="destructive">
            <ShieldAlert aria-hidden="true" className="size-3.5" />
            Access restricted
          </Badge>
        }
        title={
          <span id="inventory-forbidden-title">
            Vehicle inventory is unavailable
          </span>
        }
        description="Your current account does not have access to this inventory workspace."
      />
      <ContentStatus
        variant="destructive"
        icon={<ShieldAlert aria-hidden="true" />}
        title="Check your inventory access"
        description={
          <>
            <span>
              Confirm that your account has vehicle inventory permission and an
              active tenant or dealer assignment.
            </span>
            <span className="mt-2 block">
              If your access should include this workspace, contact your ERP
              administrator and share this detail: {access.reason}
            </span>
          </>
        }
      />
    </ContentRoot>
  );
}

export function VehicleInventoryRequestFailureState({
  error,
}: Readonly<{ error: ApiHttpError }>): ReactElement {
  const title =
    error.status === 403
      ? "Inventory access was denied"
      : error.status === 429
        ? "Inventory request rate limited"
        : error.status >= 500
          ? "Inventory service is unavailable"
          : "Inventory could not be loaded";
  const description =
    error.status === 403
      ? "You do not have access to this inventory scope. Check your tenant or dealer assignment and inventory permission. If both are correct, contact your ERP administrator."
      : error.status === 429
        ? `The protected inventory rate limit was reached.${error.retryAfterSeconds === undefined ? " Retry shortly." : ` Retry after approximately ${String(error.retryAfterSeconds)} seconds.`}`
        : error.status >= 500
          ? "The inventory service could not complete this request. Retry once. If it still fails, send the reference below to ERP support. No inventory changes were made."
          : "One or more inventory filters or page parameters are no longer valid. Reset the inventory request and try again.";

  return (
    <ContentRoot
      width="narrow"
      aria-labelledby="inventory-request-failure-title"
    >
      <ContentHeader
        eyebrow={<Badge variant="destructive">Request failed</Badge>}
        title={<span id="inventory-request-failure-title">{title}</span>}
        description="Your inventory data could not be shown safely, so the page stopped instead of displaying incomplete information."
      />
      <ContentStatus
        variant="destructive"
        icon={<AlertTriangle aria-hidden="true" />}
        title="What you can do"
        description={
          <>
            <span>{description}</span>
            <span className="mt-2 block">
              If retrying does not work, share the reference below with your ERP
              support team.
            </span>
            {error.requestId === undefined ? null : (
              <span className="mt-2 block text-caption">
                Reference: <code>{error.requestId}</code>
              </span>
            )}
          </>
        }
        actions={
          <Button variant="outline" asChild>
            <a href="/inventory/vehicles">Reset inventory request</a>
          </Button>
        }
      />
    </ContentRoot>
  );
}

export function VehicleInventoryInvalidQueryState({
  issues,
}: Readonly<{
  issues: ReadonlyArray<
    Readonly<{
      path: readonly PropertyKey[];
      message: string;
    }>
  >;
}>): ReactElement {
  return (
    <ContentRoot width="narrow" aria-labelledby="inventory-query-error-title">
      <ContentHeader
        eyebrow={<Badge variant="destructive">Invalid request</Badge>}
        title={
          <span id="inventory-query-error-title">
            Inventory filters could not be applied
          </span>
        }
        description="One or more filters in this inventory link are invalid or no longer supported. No inventory request was sent."
      />
      <ContentStatus
        variant="destructive"
        icon={<AlertTriangle aria-hidden="true" />}
        title="Reset the invalid filters"
        description={
          <>
            <span>
              Use “Reset request” to return to the default inventory view, then
              apply the filters again.
            </span>
            {issues.length === 0 ? null : (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {issues.slice(0, 4).map((issue, index) => (
                  <li key={`${issue.path.join(".")}-${String(index)}`}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </>
        }
        actions={
          <Button variant="outline" asChild>
            <a href="/inventory/vehicles">Reset request</a>
          </Button>
        }
      />
    </ContentRoot>
  );
}

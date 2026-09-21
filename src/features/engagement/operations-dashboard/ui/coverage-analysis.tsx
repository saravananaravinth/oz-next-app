// oz-next-app/src/features/engagement/operations-dashboard/ui/coverage-analysis.tsx
import type * as React from "react";
import Link from "next/link";
import {
  CircleCheck,
  MapPinned,
  Route,
  Store,
  TableProperties,
  TriangleAlert,
  UsersRound,
} from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  EngagementCoverageResult,
  EngagementDashboardSearchParams,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import { AssignedLeadCoverageMap } from "@/features/engagement/operations-dashboard/ui/assigned-lead-coverage-map";
import { EngagementMetricGrid } from "@/features/engagement/operations-dashboard/ui/engagement-metric-grid";
import {
  deriveInitialCoverageMapViewport,
  serializeCoverageMapFilters,
  toCoverageMapFilters,
} from "@/features/engagement/operations-dashboard/utils/coverage-map";
import {
  formatDashboardInteger,
  formatDashboardPercentage,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import {
  ENGAGEMENT_DASHBOARD_ROUTES,
  engagementWorkspaceHref,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type CoverageAnalysisProps = Readonly<{
  coverage: EngagementCoverageResult;
  query: EngagementDashboardSearchParams;
}>;

type CoverageItem = EngagementCoverageResult["items"][number];

const STATUS_LABELS: Readonly<Record<CoverageItem["status"], string>> = {
  HEALTHY: "Coverage ready",
  NO_ACTIVE_DEALER: "No ready dealer",
  LOCATION_GAP: "Location setup needed",
  HIGH_UNASSIGNED: "Assignment gap",
  DISTANCE_RISK: "Distance risk",
  CONCENTRATION_RISK: "Dealer concentration",
};

function statusVariant(status: CoverageItem["status"]): BadgeProps["variant"] {
  switch (status) {
    case "HEALTHY":
      return "success";
    case "NO_ACTIVE_DEALER":
      return "destructive";
    case "LOCATION_GAP":
    case "HIGH_UNASSIGNED":
    case "DISTANCE_RISK":
    case "CONCENTRATION_RISK":
      return "warning";
  }
}

function CoverageMetricSummary({
  coverage,
}: Readonly<{ coverage: EngagementCoverageResult }>): React.ReactElement {
  const totals = coverage.items.reduce(
    (current, item) => ({
      assigned: current.assigned + item.assignedLeadCount,
      converted: current.converted + item.convertedCount,
      readyDealers: current.readyDealers + item.activeVehicleDealerCount,
      atRisk: current.atRisk + (item.status === "HEALTHY" ? 0 : 1),
      distanceExceeded:
        current.distanceExceeded + item.distanceExceededLeadCount,
    }),
    {
      assigned: 0,
      converted: 0,
      readyDealers: 0,
      atRisk: 0,
      distanceExceeded: 0,
    },
  );

  return (
    <EngagementMetricGrid
      columns={5}
      metrics={[
        {
          id: "assigned",
          label: "Assigned leads analysed",
          value: formatDashboardInteger(totals.assigned),
          description: `Across ${formatDashboardInteger(coverage.items.length)} districts`,
          icon: <UsersRound aria-hidden="true" className="size-5" />,
          tone: "info",
        },
        {
          id: "dealers",
          label: "Assignment-ready dealers",
          value: formatDashboardInteger(totals.readyDealers),
          description: "Vehicle enabled, engagement active and mapped",
          icon: <Store aria-hidden="true" className="size-5" />,
          tone: "success",
        },
        {
          id: "conversion",
          label: "Assigned conversion",
          value: formatDashboardPercentage(
            totals.assigned === 0
              ? 0
              : (totals.converted / totals.assigned) * 100,
          ),
          description: `${formatDashboardInteger(totals.converted)} converted assigned leads`,
          icon: <CircleCheck aria-hidden="true" className="size-5" />,
          tone: "success",
        },
        {
          id: "risk",
          label: "Districts needing action",
          value: formatDashboardInteger(totals.atRisk),
          description: "Coverage, location, distance or concentration risk",
          icon: <TriangleAlert aria-hidden="true" className="size-5" />,
          tone: totals.atRisk > 0 ? "warning" : "success",
        },
        {
          id: "distance",
          label: "Distance exceptions",
          value: formatDashboardInteger(totals.distanceExceeded),
          description: "Assigned leads beyond configured distance",
          icon: <Route aria-hidden="true" className="size-5" />,
          tone: totals.distanceExceeded > 0 ? "warning" : "success",
        },
      ]}
    />
  );
}

function CoverageTable({
  coverage,
  query,
}: Readonly<{
  coverage: EngagementCoverageResult;
  query: EngagementDashboardSearchParams;
}>): React.ReactElement {
  return (
    <section aria-labelledby="coverage-table-heading" className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TableProperties aria-hidden="true" className="size-4" />
            <h2 id="coverage-table-heading" className="text-card-title">
              District coverage table
            </h2>
          </div>
          <p className="mt-1 text-caption text-muted-readable">
            Accessible operational fallback with assigned-lead coverage,
            distance, conversion and dealer readiness details.
          </p>
        </div>
        <Badge variant="outline">
          {formatDashboardInteger(coverage.items.length)} districts
        </Badge>
      </div>

      <div
        role="region"
        aria-label="District coverage table"
        tabIndex={0}
        className="max-w-full overflow-x-auto rounded-2xl border border-border/70 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Table className="min-w-[1100px]">
          <TableHeader>
            <TableRow>
              <TableHead>District & assessment</TableHead>
              <TableHead className="text-right">Assigned</TableHead>
              <TableHead>Ready dealer coverage</TableHead>
              <TableHead>Travel & concentration</TableHead>
              <TableHead className="text-right">Converted</TableHead>
              <TableHead className="w-32">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coverage.items.map((item) => {
              const dealerHref = engagementWorkspaceHref(
                ENGAGEMENT_DASHBOARD_ROUTES.dealers,
                query,
                {
                  districts: [item.district],
                  dealerCursor: null,
                },
              );

              return (
                <TableRow key={item.district}>
                  <TableCell className="min-w-72 align-top">
                    <div className="grid gap-2">
                      <span className="font-medium">{item.district}</span>
                      <Badge
                        variant={statusVariant(item.status)}
                        className="w-fit"
                      >
                        {STATUS_LABELS[item.status]}
                      </Badge>
                      <span className="text-caption text-muted-readable">
                        {item.reasons.length === 0
                          ? "No additional coverage exceptions."
                          : item.reasons.join(" ")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-right text-tabular">
                    <span className="font-medium">
                      {formatDashboardInteger(item.assignedLeadCount)}
                    </span>
                    <p className="text-caption text-muted-readable">
                      {formatDashboardInteger(item.leadCount)} total demand
                    </p>
                  </TableCell>
                  <TableCell className="min-w-52 align-top">
                    <span className="font-medium">
                      {formatDashboardInteger(item.activeVehicleDealerCount)}{" "}
                      ready
                    </span>
                    <p className="text-caption text-muted-readable">
                      {formatDashboardInteger(
                        item.configuredVehicleDealerCount,
                      )}{" "}
                      configured ·{" "}
                      {formatDashboardInteger(
                        item.dealersMissingCoordinatesCount,
                      )}{" "}
                      missing coordinates
                    </p>
                  </TableCell>
                  <TableCell className="min-w-64 align-top">
                    <p>
                      Median:{" "}
                      {item.medianAssignmentDistanceKm === null
                        ? "Not available"
                        : `${item.medianAssignmentDistanceKm.toFixed(1)} km`}
                    </p>
                    <p className="text-caption text-muted-readable">
                      {formatDashboardInteger(item.distanceExceededLeadCount)}{" "}
                      distance exceptions
                    </p>
                    <p className="text-caption text-muted-readable">
                      {item.topDealerName === null
                        ? "No concentration"
                        : `${item.topDealerName}: ${formatDashboardPercentage(item.topDealerAssignmentSharePct)}`}
                    </p>
                  </TableCell>
                  <TableCell className="align-top text-right text-tabular">
                    <span className="font-medium">
                      {formatDashboardInteger(item.convertedCount)}
                    </span>
                    <p className="text-caption text-muted-readable">
                      {formatDashboardPercentage(item.conversionRatePct)}
                    </p>
                  </TableCell>
                  <TableCell className="align-top">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={dealerHref}
                        aria-label={`View ${item.district} dealers`}
                      >
                        View dealers
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function CoverageAnalysis({
  coverage,
  query,
}: CoverageAnalysisProps): React.ReactElement {
  const initialViewport = deriveInitialCoverageMapViewport(coverage.items);
  const mapContextKey = `${serializeCoverageMapFilters(toCoverageMapFilters(query))}:${coverage.generatedAt}`;

  return (
    <div className="grid min-w-0 gap-6">
      <CoverageMetricSummary coverage={coverage} />

      <section aria-labelledby="coverage-map-heading" className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MapPinned aria-hidden="true" className="size-4" />
              <h2 id="coverage-map-heading" className="text-card-title">
                Assigned-lead Google Maps coverage
              </h2>
            </div>
            <p className="mt-1 max-w-3xl text-caption text-muted-readable">
              Vehicle Enquiry demand uses privacy-grid centers; dealer markers
              use configured dealer coordinates. Exact customer locations are
              never sent to the browser map.
            </p>
          </div>
          <Badge variant="outline">Privacy-safe geospatial view</Badge>
        </div>

        <AssignedLeadCoverageMap
          key={mapContextKey}
          query={query}
          initialViewport={initialViewport}
        />
      </section>

      <CoverageTable coverage={coverage} query={query} />
    </div>
  );
}

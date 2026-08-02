// oz-next-app/src/features/engagement/operations-dashboard/ui/coverage-analysis.tsx
"use client";

import * as React from "react";
import {
  CircleCheck,
  Compass,
  Map,
  MapPinned,
  Route,
  Store,
  TableProperties,
  TriangleAlert,
  UsersRound,
} from "lucide-react";

import {
  ContentEmptyState,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
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

import {
  readEngagementDistrictDealersAction,
  type ReadEngagementDistrictDealersActionResult,
} from "@/features/engagement/operations-dashboard/actions/engagement-dashboard.actions";
import type {
  EngagementCoverageResult,
  EngagementDashboardSearchParams,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import { EngagementMetricGrid } from "@/features/engagement/operations-dashboard/ui/engagement-metric-grid";
import {
  formatDashboardInteger,
  formatDashboardPercentage,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";

export type CoverageAnalysisProps = Readonly<{
  coverage: EngagementCoverageResult;
  query: EngagementDashboardSearchParams;
}>;

type CoverageItem = EngagementCoverageResult["items"][number];

type PlotPoint = Readonly<{
  item: CoverageItem;
  x: number;
  y: number;
}>;

type CoordinateTick = Readonly<{
  position: number;
  label: string;
}>;

type PlotModel = Readonly<{
  points: readonly PlotPoint[];
  hullPath: string | null;
  latitudeTicks: readonly CoordinateTick[];
  longitudeTicks: readonly CoordinateTick[];
}>;

const STATUS_LABELS: Readonly<Record<CoverageItem["status"], string>> = {
  HEALTHY: "Coverage ready",
  NO_ACTIVE_DEALER: "No ready dealer",
  LOCATION_GAP: "Location setup needed",
  HIGH_UNASSIGNED: "Assignment gap",
  DISTANCE_RISK: "Distance risk",
  CONCENTRATION_RISK: "Dealer concentration",
};

const MAP_LEFT = 8;
const MAP_RIGHT = 92;
const MAP_TOP = 25;
const MAP_BOTTOM = 91;
const MAP_TICK_COUNT = 5;

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

function mapPointClassName(status: CoverageItem["status"]): string {
  switch (status) {
    case "HEALTHY":
      return "bg-success text-success-foreground ring-success/30";
    case "NO_ACTIVE_DEALER":
      return "bg-destructive text-destructive-foreground ring-destructive/30";
    case "LOCATION_GAP":
    case "HIGH_UNASSIGNED":
    case "DISTANCE_RISK":
    case "CONCENTRATION_RISK":
      return "bg-warning text-warning-foreground ring-warning/35";
  }
}

function actionInput(query: EngagementDashboardSearchParams, district: string) {
  return {
    district,
    from: query.from,
    to: query.to,
    leadSourceIds: query.leadSourceIds,
    ivrFlowCodes: query.ivrFlowCodes,
    statuses: query.statuses,
    dealerOrgUnitIds: query.dealerOrgUnitIds,
    districts: query.districts,
    cities: query.cities,
    assignmentStates: query.assignmentStates,
    conversionStates: query.conversionStates,
    followUpStates: query.followUpStates,
    issueSeverities: query.issueSeverities,
    ...(query.q === undefined ? {} : { q: query.q }),
  } as const;
}

function formatCoordinate(
  value: number,
  axis: "latitude" | "longitude",
): string {
  const suffix =
    axis === "latitude" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";

  return `${Math.abs(value).toFixed(2)}°${suffix}`;
}

function crossProduct(
  origin: PlotPoint,
  left: PlotPoint,
  right: PlotPoint,
): number {
  return (
    (left.x - origin.x) * (right.y - origin.y) -
    (left.y - origin.y) * (right.x - origin.x)
  );
}

function convexHull(points: readonly PlotPoint[]): readonly PlotPoint[] {
  if (points.length < 3) {
    return [];
  }

  const sorted = [...points].sort((left, right) =>
    left.x === right.x ? left.y - right.y : left.x - right.x,
  );
  const lower: PlotPoint[] = [];
  const upper: PlotPoint[] = [];

  for (const point of sorted) {
    while (lower.length >= 2) {
      const origin = lower.at(-2);
      const left = lower.at(-1);

      if (
        origin === undefined ||
        left === undefined ||
        crossProduct(origin, left, point) > 0
      ) {
        break;
      }

      lower.pop();
    }
    lower.push(point);
  }

  for (const point of [...sorted].reverse()) {
    while (upper.length >= 2) {
      const origin = upper.at(-2);
      const left = upper.at(-1);

      if (
        origin === undefined ||
        left === undefined ||
        crossProduct(origin, left, point) > 0
      ) {
        break;
      }

      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function buildPlotModel(items: readonly CoverageItem[]): PlotModel {
  const located = items.filter(
    (item) => item.centroidLatitude !== null && item.centroidLongitude !== null,
  );

  if (located.length === 0) {
    return {
      points: [],
      hullPath: null,
      latitudeTicks: [],
      longitudeTicks: [],
    };
  }

  const latitudes = located.map((item) => item.centroidLatitude ?? 0);
  const longitudes = located.map((item) => item.centroidLongitude ?? 0);
  const rawMinLatitude = Math.min(...latitudes);
  const rawMaxLatitude = Math.max(...latitudes);
  const rawMinLongitude = Math.min(...longitudes);
  const rawMaxLongitude = Math.max(...longitudes);
  const latitudePadding = Math.max(
    (rawMaxLatitude - rawMinLatitude) * 0.08,
    0.05,
  );
  const longitudePadding = Math.max(
    (rawMaxLongitude - rawMinLongitude) * 0.08,
    0.05,
  );
  const minLatitude = rawMinLatitude - latitudePadding;
  const maxLatitude = rawMaxLatitude + latitudePadding;
  const minLongitude = rawMinLongitude - longitudePadding;
  const maxLongitude = rawMaxLongitude + longitudePadding;
  const latitudeRange = maxLatitude - minLatitude;
  const longitudeRange = maxLongitude - minLongitude;

  const points = located.map((item) => ({
    item,
    x:
      MAP_LEFT +
      (((item.centroidLongitude ?? minLongitude) - minLongitude) /
        longitudeRange) *
        (MAP_RIGHT - MAP_LEFT),
    y:
      MAP_BOTTOM -
      (((item.centroidLatitude ?? minLatitude) - minLatitude) / latitudeRange) *
        (MAP_BOTTOM - MAP_TOP),
  }));
  const hull = convexHull(points);
  const hullPath =
    hull.length < 3
      ? null
      : `${hull
          .map(
            (point, index) =>
              `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
          )
          .join(" ")} Z`;
  const latitudeTicks = Array.from({ length: MAP_TICK_COUNT }, (_, index) => {
    const ratio = index / (MAP_TICK_COUNT - 1);
    return {
      position: MAP_TOP + ratio * (MAP_BOTTOM - MAP_TOP),
      label: formatCoordinate(maxLatitude - ratio * latitudeRange, "latitude"),
    };
  });
  const longitudeTicks = Array.from({ length: MAP_TICK_COUNT }, (_, index) => {
    const ratio = index / (MAP_TICK_COUNT - 1);
    return {
      position: MAP_LEFT + ratio * (MAP_RIGHT - MAP_LEFT),
      label: formatCoordinate(
        minLongitude + ratio * longitudeRange,
        "longitude",
      ),
    };
  });

  return {
    points,
    hullPath,
    latitudeTicks,
    longitudeTicks,
  };
}

function DistrictSummary({
  item,
}: Readonly<{ item: CoverageItem }>): React.ReactElement {
  return (
    <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/25 p-4 sm:grid-cols-3">
      <div className="min-w-0">
        <p className="text-caption text-muted-readable">Assigned leads</p>
        <p className="mt-1 text-card-title text-tabular">
          {formatDashboardInteger(item.assignedLeadCount)}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-caption text-muted-readable">Configured dealers</p>
        <p className="mt-1 text-card-title text-tabular">
          {formatDashboardInteger(item.configuredVehicleDealerCount)}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-caption text-muted-readable">Assignment ready</p>
        <p className="mt-1 text-card-title text-tabular">
          {formatDashboardInteger(item.activeVehicleDealerCount)}
        </p>
      </div>
    </div>
  );
}

function DistrictDealerDialog({
  item,
  query,
  open,
  onOpenChange,
}: Readonly<{
  item: CoverageItem | null;
  query: EngagementDashboardSearchParams;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>): React.ReactElement {
  const [result, setResult] =
    React.useState<ReadEngagementDistrictDealersActionResult | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open || item === null || result !== null) {
      return;
    }

    let cancelled = false;

    startTransition(async () => {
      const nextResult = await readEngagementDistrictDealersAction(
        actionInput(query, item.district),
      );

      if (!cancelled) {
        setResult(nextResult);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [item, open, query, result]);

  function handleOpenChange(nextOpen: boolean): void {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setResult(null);
    }
  }

  const aggregateExpectsDealers =
    item !== null && item.configuredVehicleDealerCount > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent height="viewport" className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {item?.district ?? "District"} dealer performance
          </DialogTitle>
          <DialogDescription>
            Assigned vehicle-sales metrics for configured dealers in the
            selected district and active actor-scoped filter set.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid content-start gap-5">
          {item === null ? null : <DistrictSummary item={item} />}

          {isPending && result === null ? (
            <div
              className="grid gap-3"
              aria-busy="true"
              aria-label="Loading district dealers"
            >
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          ) : result === null ? null : !result.ok ? (
            <ContentStatus
              variant="destructive"
              title="District dealers could not be loaded"
              description={
                result.requestId === undefined
                  ? result.message
                  : `${result.message} Reference: ${result.requestId}`
              }
              actions={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                  }}
                >
                  Try again
                </Button>
              }
            />
          ) : result.dealers.items.length === 0 ? (
            <ContentEmptyState
              icon={<Store aria-hidden="true" />}
              title={
                aggregateExpectsDealers
                  ? "Dealer detail could not be reconciled"
                  : "No configured dealers in this district"
              }
              description={
                aggregateExpectsDealers
                  ? "Coverage aggregates indicate configured dealers, but no dealer record matched the current actor-scoped filters. Refresh the workspace and verify district and location data."
                  : "Review dealer engagement participation and location configuration."
              }
            />
          ) : (
            <div
              role="region"
              aria-label={`${item?.district ?? "District"} dealer performance table`}
              className="max-w-full overflow-x-auto rounded-2xl border border-border/70"
            >
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                    <TableHead className="text-right">
                      Dealer responded
                    </TableHead>
                    <TableHead className="text-right">Follow-up</TableHead>
                    <TableHead className="text-right">Booked</TableHead>
                    <TableHead className="text-right">Converted</TableHead>
                    <TableHead>Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.dealers.items.map((dealer) => (
                    <TableRow key={dealer.dealerOrgUnitId}>
                      <TableCell>
                        <div className="grid gap-1">
                          <span className="font-medium">
                            {dealer.dealerName}
                          </span>
                          <span className="text-caption text-muted-readable">
                            {dealer.dealerCode} ·{" "}
                            {dealer.city ?? "City unavailable"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            dealer.engagementActive ? "success" : "outline"
                          }
                        >
                          {dealer.engagementActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-tabular">
                        {formatDashboardInteger(dealer.assignedCount)}
                      </TableCell>
                      <TableCell className="text-right text-tabular">
                        {formatDashboardInteger(dealer.respondedCount)}
                      </TableCell>
                      <TableCell className="text-right text-tabular">
                        {formatDashboardInteger(dealer.followUpAvailableCount)}
                      </TableCell>
                      <TableCell className="text-right text-tabular">
                        {formatDashboardInteger(dealer.bookedCount)}
                      </TableCell>
                      <TableCell className="text-right text-tabular">
                        {formatDashboardInteger(dealer.convertedCount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            dealer.health.status === "HEALTHY"
                              ? "success"
                              : "warning"
                          }
                        >
                          {dealer.health.status.replaceAll("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function CoverageMap({
  items,
  selectedDistrict,
  onSelectDistrict,
}: Readonly<{
  items: readonly CoverageItem[];
  selectedDistrict: string | null;
  onSelectDistrict: (district: string) => void;
}>): React.ReactElement {
  const model = React.useMemo(() => buildPlotModel(items), [items]);

  if (model.points.length === 0) {
    return (
      <div className="grid min-h-[34rem] place-items-center rounded-3xl border border-border/70 bg-muted/20 p-6">
        <ContentEmptyState
          icon={<MapPinned aria-hidden="true" />}
          title="No assigned-lead coordinates available"
          description="Use the table view and correct lead or dealer location data before relying on geographic analysis."
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-[36rem] overflow-hidden rounded-3xl border border-border/70 bg-card shadow-inner">
      <div className="absolute inset-0 bg-muted/15" />

      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="coverage-map-grid"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.16"
              className="text-border/65"
            />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#coverage-map-grid)" />
        <rect
          x={MAP_LEFT}
          y={MAP_TOP}
          width={MAP_RIGHT - MAP_LEFT}
          height={MAP_BOTTOM - MAP_TOP}
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.25"
          className="text-border"
        />
        {model.hullPath === null ? null : (
          <path
            d={model.hullPath}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.35"
            strokeLinejoin="round"
            className="text-primary/10"
          />
        )}
      </svg>

      <div className="absolute inset-x-4 top-4 z-20 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border/70 bg-card/92 p-4 shadow-sm supports-[backdrop-filter]:backdrop-blur-md">
        <div className="min-w-0">
          <p className="text-card-title">Assigned-lead geospatial coverage</p>
          <p className="mt-1 text-caption text-muted-readable">
            Latitude and longitude projection of assigned lead centroids. Select
            a district to inspect dealer performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant="success">Ready</Badge>
          <Badge variant="warning">Needs action</Badge>
          <Badge variant="destructive">No ready dealer</Badge>
          <Badge variant="outline">
            {formatDashboardInteger(model.points.length)} mapped districts
          </Badge>
        </div>
      </div>

      <div className="absolute right-4 top-28 z-10 grid place-items-center rounded-xl border border-border/70 bg-card/85 p-2 shadow-sm supports-[backdrop-filter]:backdrop-blur-md">
        <Compass aria-hidden="true" className="size-5" />
        <span className="mt-0.5 text-[0.625rem] font-semibold tracking-[0.16em] text-muted-readable">
          N
        </span>
      </div>

      {model.latitudeTicks.map((tick, index) => (
        <span
          key={`latitude-${String(index)}-${tick.label}`}
          aria-hidden="true"
          className="absolute left-2 z-10 -translate-y-1/2 text-[0.625rem] text-muted-readable text-tabular"
          style={{ top: `${String(tick.position)}%` }}
        >
          {tick.label}
        </span>
      ))}

      {model.longitudeTicks.map((tick, index) => (
        <span
          key={`longitude-${String(index)}-${tick.label}`}
          aria-hidden="true"
          className="absolute bottom-2 z-10 -translate-x-1/2 text-[0.625rem] text-muted-readable text-tabular"
          style={{ left: `${String(tick.position)}%` }}
        >
          {tick.label}
        </span>
      ))}

      {model.points.map(({ item, x, y }) => {
        const selected = selectedDistrict === item.district;
        const size = Math.min(
          2.75,
          1.25 + Math.sqrt(item.assignedLeadCount) * 0.15,
        );

        return (
          <button
            key={item.district}
            type="button"
            className={cn(
              "group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-lg outline-none ring-offset-2 ring-offset-card transition-transform hover:z-30 hover:scale-110 focus-visible:z-30 focus-visible:ring-3 motion-reduce:transition-none",
              mapPointClassName(item.status),
              selected ? "z-30 scale-110 ring-3" : "ring-1",
            )}
            style={{
              left: `${String(x)}%`,
              top: `${String(y)}%`,
              width: `${String(size)}rem`,
              height: `${String(size)}rem`,
            }}
            aria-label={`${item.district}, ${formatDashboardInteger(item.assignedLeadCount)} assigned leads, ${STATUS_LABELS[item.status]}`}
            aria-pressed={selected}
            onClick={() => {
              onSelectDistrict(item.district);
            }}
          >
            <span className="sr-only">Open district dealer details</span>
            <span className="absolute inset-1/3 rounded-full bg-current opacity-35" />
            <span className="pointer-events-none absolute left-1/2 top-full mt-2 hidden min-w-max max-w-64 -translate-x-1/2 rounded-xl border border-border/70 bg-popover px-3 py-2 text-start text-caption text-popover-foreground shadow-lg group-hover:block group-focus-visible:block">
              <span className="block font-medium">{item.district}</span>
              <span className="mt-0.5 block text-muted-readable">
                {formatDashboardInteger(item.assignedLeadCount)} assigned ·{" "}
                {formatDashboardInteger(item.activeVehicleDealerCount)} ready
                dealers
              </span>
            </span>
          </button>
        );
      })}

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border/70 bg-card/85 px-3 py-1.5 text-[0.625rem] text-muted-readable shadow-sm supports-[backdrop-filter]:backdrop-blur-md">
        Bubble size represents assigned-lead volume · shaded area represents the
        observed coverage extent
      </div>
    </div>
  );
}

export function CoverageAnalysis({
  coverage,
  query,
}: CoverageAnalysisProps): React.ReactElement {
  const [district, setDistrict] = React.useState<string | null>(null);
  const selectedItem = React.useMemo(
    () =>
      district === null
        ? null
        : (coverage.items.find((item) => item.district === district) ?? null),
    [coverage.items, district],
  );
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
    <div className="grid min-w-0 gap-5">
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

      <Tabs defaultValue="map" className="grid min-w-0 gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="map">
            <Map aria-hidden="true" />
            Map
          </TabsTrigger>
          <TabsTrigger value="table">
            <TableProperties aria-hidden="true" />
            Table
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-0 min-w-0">
          <CoverageMap
            items={coverage.items}
            selectedDistrict={district}
            onSelectDistrict={setDistrict}
          />
        </TabsContent>

        <TabsContent value="table" className="mt-0 min-w-0">
          <div
            role="region"
            aria-label="District coverage table"
            className="max-w-full overflow-x-auto rounded-2xl border border-border/70"
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
                {coverage.items.map((item) => (
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
                          {item.reasons.join(" ")}
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`View ${item.district} dealers`}
                        onClick={() => {
                          setDistrict(item.district);
                        }}
                      >
                        View dealers
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <DistrictDealerDialog
        item={selectedItem}
        query={query}
        open={selectedItem !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDistrict(null);
          }
        }}
      />
    </div>
  );
}

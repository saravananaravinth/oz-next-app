// oz-next-app/src/features/engagement/operations-dashboard/ui/top-lead-locations.tsx
"use client";

import * as React from "react";
import { MapPinned } from "lucide-react";

import { ContentEmptyState } from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  EngagementCoverageResult,
  EngagementDashboardSearchParams,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import { AssignedLeadCoverageMap } from "@/features/engagement/operations-dashboard/ui/assigned-lead-coverage-map";
import { deriveInitialCoverageMapViewport } from "@/features/engagement/operations-dashboard/utils/coverage-map";
import { formatDashboardInteger } from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";

type MapScope = "TAMIL_NADU" | "INDIA";
const INDIA_VIEWPORT = {
  south: 6.4,
  west: 68.0,
  north: 35.7,
  east: 97.5,
  zoom: 4,
} as const;

export function TopLeadLocations({
  coverage,
  query,
}: Readonly<{
  coverage: EngagementCoverageResult;
  query: EngagementDashboardSearchParams;
}>): React.ReactElement {
  const [scope, setScope] = React.useState<MapScope>("TAMIL_NADU");
  const ranked = React.useMemo(
    () =>
      [...coverage.items]
        .sort((left, right) => right.leadCount - left.leadCount)
        .slice(0, 5),
    [coverage.items],
  );
  const viewport = React.useMemo(
    () =>
      scope === "INDIA"
        ? INDIA_VIEWPORT
        : deriveInitialCoverageMapViewport(coverage.items),
    [coverage.items, scope],
  );

  if (coverage.items.length === 0) {
    return (
      <ContentEmptyState
        icon={<MapPinned aria-hidden="true" />}
        title="No lead locations in this period"
        description="Location intelligence appears when matching leads have a district or usable coordinates."
      />
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {scope === "TAMIL_NADU" ? "Tamil Nadu districts" : "India states"}
          </Badge>
          <Badge variant="outline">
            {formatDashboardInteger(
              coverage.items.reduce((sum, item) => sum + item.leadCount, 0),
            )}{" "}
            leads
          </Badge>
        </div>
        <div className="flex gap-1" role="group" aria-label="Map scope">
          <Button
            type="button"
            size="sm"
            variant={scope === "TAMIL_NADU" ? "secondary" : "ghost"}
            onClick={() => {
              setScope("TAMIL_NADU");
            }}
          >
            Districts
          </Button>
          <Button
            type="button"
            size="sm"
            variant={scope === "INDIA" ? "secondary" : "ghost"}
            onClick={() => {
              setScope("INDIA");
            }}
          >
            India
          </Button>
        </div>
      </div>
      <div className="[&>div]:min-h-[22rem]">
        <AssignedLeadCoverageMap
          query={query}
          initialViewport={viewport}
          size="dashboard"
        />
      </div>
      <ol className="grid gap-1 text-caption text-muted-readable sm:grid-cols-2">
        {ranked.map((item, index) => (
          <li
            key={item.district}
            className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 px-3 py-2"
          >
            <span className="truncate">
              {index + 1}. {item.district}
            </span>
            <span className="text-tabular font-medium text-foreground">
              {formatDashboardInteger(item.leadCount)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

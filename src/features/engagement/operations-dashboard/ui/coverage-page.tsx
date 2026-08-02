// oz-next-app/src/features/engagement/operations-dashboard/ui/coverage-page.tsx
import type * as React from "react";
import { MapPinned } from "lucide-react";

import {
  ContentDataSurface,
  ContentEmptyState,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";

import type { EngagementDashboardSearchParams } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementCoverageWorkspaceData } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.types";
import type { ResolvedEngagementDashboardAccess } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { CoverageAnalysis } from "@/features/engagement/operations-dashboard/ui/coverage-analysis";
import { EngagementWorkspaceShell } from "@/features/engagement/operations-dashboard/ui/engagement-workspace-shell";
import { ENGAGEMENT_DASHBOARD_ROUTES } from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type CoveragePageProps = Readonly<{
  access: ResolvedEngagementDashboardAccess;
  query: EngagementDashboardSearchParams;
  data: EngagementCoverageWorkspaceData;
}>;

export function CoveragePage({
  access,
  query,
  data,
}: CoveragePageProps): React.ReactElement {
  const coverage = data.coverage.status === "ready" ? data.coverage.data : null;

  return (
    <EngagementWorkspaceShell
      access={access}
      query={query}
      route={ENGAGEMENT_DASHBOARD_ROUTES.coverage}
      filterOptions={data.filterOptions}
    >
      {coverage === null ? (
        <ContentStatus
          variant={
            data.coverage.status === "forbidden" ? "warning" : "destructive"
          }
          title={
            data.coverage.status === "forbidden"
              ? "Coverage analysis is restricted"
              : "Coverage analysis is unavailable"
          }
          description="No coverage data was rendered outside the authorized tenant and actor scope."
        />
      ) : coverage.items.length === 0 ? (
        <ContentEmptyState
          icon={<MapPinned aria-hidden="true" />}
          title="No assigned vehicle-sales leads in this view"
          description="Coverage intentionally excludes unassigned leads because customer demand is not yet dealer-confirmed."
        />
      ) : (
        <ContentDataSurface
          title="Assigned-lead demand and dealer coverage"
          description="Coverage analysis uses assigned VEHICLE_SALES leads only. Map and table views share the same actor-scoped dataset."
          actions={<Badge variant="outline">Assigned leads only</Badge>}
          padded
          scrollable={false}
        >
          <CoverageAnalysis coverage={coverage} query={query} />
        </ContentDataSurface>
      )}
    </EngagementWorkspaceShell>
  );
}

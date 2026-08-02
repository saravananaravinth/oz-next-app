// oz-next-app/src/features/engagement/operations-dashboard/ui/dealer-performance-page.tsx
import type * as React from "react";

import {
  ContentDataSurface,
  ContentStatus,
} from "@/components/common/content-shell";

import type { EngagementDashboardSearchParams } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDealerWorkspaceData } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.types";
import type { ResolvedEngagementDashboardAccess } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import {
  DealerPerformanceControls,
  DealerPerformanceTable,
} from "@/features/engagement/operations-dashboard/ui/dealer-performance-table";
import { EngagementWorkspaceShell } from "@/features/engagement/operations-dashboard/ui/engagement-workspace-shell";
import { ENGAGEMENT_DASHBOARD_ROUTES } from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type DealerPerformancePageProps = Readonly<{
  access: ResolvedEngagementDashboardAccess;
  query: EngagementDashboardSearchParams;
  data: EngagementDealerWorkspaceData;
}>;

export function DealerPerformancePage({
  access,
  query,
  data,
}: DealerPerformancePageProps): React.ReactElement {
  return (
    <EngagementWorkspaceShell
      access={access}
      query={query}
      route={ENGAGEMENT_DASHBOARD_ROUTES.dealers}
      filterOptions={data.filterOptions}
    >
      <ContentDataSurface
        title="Dealer performance overview"
        description="Vehicle-sales engagement activity by dealer. Assigned leads are sorted highest first by default."
        actions={<DealerPerformanceControls query={query} />}
        contentClassName="px-[var(--card-spacing)] pb-[var(--card-spacing)]"
        scrollable={false}
      >
        {data.dealers.status === "ready" ? (
          <DealerPerformanceTable
            result={data.dealers.data}
            query={query}
            capabilities={access.capabilities}
          />
        ) : (
          <ContentStatus
            variant={
              data.dealers.status === "forbidden" ? "warning" : "destructive"
            }
            title={
              data.dealers.status === "forbidden"
                ? "Dealer performance is restricted"
                : "Dealer performance is unavailable"
            }
            description="No dealer data was rendered outside the authorized tenant and actor scope."
          />
        )}
      </ContentDataSurface>
    </EngagementWorkspaceShell>
  );
}

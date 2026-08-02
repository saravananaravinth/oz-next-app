// oz-next-app/src/features/engagement/operations-dashboard/ui/issue-workbench-page.tsx
import type * as React from "react";

import {
  ContentDataSurface,
  ContentStatus,
} from "@/components/common/content-shell";

import type { EngagementDashboardSearchParams } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementIssueWorkspaceData } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.types";
import type { ResolvedEngagementDashboardAccess } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { EngagementWorkspaceShell } from "@/features/engagement/operations-dashboard/ui/engagement-workspace-shell";
import { IssueQueue } from "@/features/engagement/operations-dashboard/ui/issue-queue";
import { ENGAGEMENT_DASHBOARD_ROUTES } from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type IssueWorkbenchPageProps = Readonly<{
  access: ResolvedEngagementDashboardAccess;
  query: EngagementDashboardSearchParams;
  data: EngagementIssueWorkspaceData;
}>;

export function IssueWorkbenchPage({
  access,
  query,
  data,
}: IssueWorkbenchPageProps): React.ReactElement {
  return (
    <EngagementWorkspaceShell
      access={access}
      query={query}
      route={ENGAGEMENT_DASHBOARD_ROUTES.issues}
      filterOptions={data.filterOptions}
    >
      <ContentDataSurface
        title="Support work queue"
        description="Critical and high-severity vehicle-sales exceptions appear first. Every action remains permission-gated, idempotent and audited."
        padded
        scrollable={false}
      >
        {data.issues.status === "ready" ? (
          <IssueQueue
            result={data.issues.data}
            query={query}
            capabilities={access.capabilities}
          />
        ) : (
          <ContentStatus
            variant={
              data.issues.status === "forbidden" ? "warning" : "destructive"
            }
            title={
              data.issues.status === "forbidden"
                ? "Support workbench is restricted"
                : "Support workbench is unavailable"
            }
            description="No issue data was rendered outside the authorized actor and tenant scope."
          />
        )}
      </ContentDataSurface>
    </EngagementWorkspaceShell>
  );
}

// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-journey-page.tsx
import type * as React from "react";

import { ContentStatus } from "@/components/common/content-shell";

import type { EngagementDashboardSearchParams } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type {
  EngagementDashboardSectionResult,
  EngagementJourneyWorkspaceData,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.types";
import type { ResolvedEngagementDashboardAccess } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { EngagementWorkspaceShell } from "@/features/engagement/operations-dashboard/ui/engagement-workspace-shell";
import { JourneyOverview } from "@/features/engagement/operations-dashboard/ui/journey-overview";
import { ENGAGEMENT_DASHBOARD_ROUTES } from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type EngagementJourneyPageProps = Readonly<{
  access: ResolvedEngagementDashboardAccess;
  query: EngagementDashboardSearchParams;
  data: EngagementJourneyWorkspaceData;
}>;

function journeyFailure(
  result: Exclude<
    EngagementDashboardSectionResult<unknown>,
    { status: "ready" }
  >,
): React.ReactElement {
  return (
    <ContentStatus
      variant={result.status === "forbidden" ? "warning" : "destructive"}
      title={
        result.status === "forbidden"
          ? "Journey analytics is restricted"
          : "Journey analytics is unavailable"
      }
      description={
        result.status === "forbidden"
          ? "The active role does not have permission to read this section."
          : result.error?.requestId === undefined
            ? "The authoritative process-run snapshot could not be loaded. Refresh the page before retrying."
            : `The authoritative process-run snapshot could not be loaded. Reference: ${result.error.requestId}`
      }
    />
  );
}

export function EngagementJourneyPage({
  access,
  query,
  data,
}: EngagementJourneyPageProps): React.ReactElement {
  return (
    <EngagementWorkspaceShell
      access={access}
      query={query}
      route={ENGAGEMENT_DASHBOARD_ROUTES.journey}
    >
      {data.journey.status === "ready" ? (
        <JourneyOverview snapshot={data.journey.data} />
      ) : (
        journeyFailure(data.journey)
      )}
    </EngagementWorkspaceShell>
  );
}

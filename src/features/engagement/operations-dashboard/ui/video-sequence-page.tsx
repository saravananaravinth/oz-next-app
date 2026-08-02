// oz-next-app/src/features/engagement/operations-dashboard/ui/video-sequence-page.tsx
import type * as React from "react";

import { ContentStatus } from "@/components/common/content-shell";

import type { EngagementDashboardSearchParams } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementVideoSequenceWorkspaceData } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.types";
import type { ResolvedEngagementDashboardAccess } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { EngagementWorkspaceShell } from "@/features/engagement/operations-dashboard/ui/engagement-workspace-shell";
import { VideoSequenceConfiguration } from "@/features/engagement/operations-dashboard/ui/video-sequence-configuration";
import { ENGAGEMENT_DASHBOARD_ROUTES } from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type VideoSequencePageProps = Readonly<{
  access: ResolvedEngagementDashboardAccess;
  query: EngagementDashboardSearchParams;
  data: EngagementVideoSequenceWorkspaceData;
}>;

export function VideoSequencePage({
  access,
  query,
  data,
}: VideoSequencePageProps): React.ReactElement {
  return (
    <EngagementWorkspaceShell
      access={access}
      query={query}
      route={ENGAGEMENT_DASHBOARD_ROUTES.videoSequences}
      showFilters={false}
    >
      {data.videoSequences.status === "ready" ? (
        <VideoSequenceConfiguration
          sequences={data.videoSequences.data.items}
          canUpdate={access.capabilities.canUpdateVideoSequences}
        />
      ) : (
        <ContentStatus
          variant={
            data.videoSequences.status === "forbidden"
              ? "warning"
              : "destructive"
          }
          title={
            data.videoSequences.status === "forbidden"
              ? "Video schedule is restricted"
              : "Video schedule is unavailable"
          }
          description="No video-sequence data was rendered outside the authorized tenant and actor scope."
        />
      )}
    </EngagementWorkspaceShell>
  );
}

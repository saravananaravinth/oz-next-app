// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-dashboard-page.tsx
import type * as React from "react";
import Link from "next/link";
import { Building2, CircleAlert } from "lucide-react";

import {
  ContentHeader,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { EngagementDashboardSearchParams } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type {
  EngagementDashboardSectionResult,
  EngagementOverviewData,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.types";
import type {
  EngagementDashboardAccess,
  ResolvedEngagementDashboardAccess,
} from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { EngagementLeadsTable } from "@/features/engagement/operations-dashboard/ui/engagement-leads-table";
import { EngagementWorkspaceShell } from "@/features/engagement/operations-dashboard/ui/engagement-workspace-shell";
import { JourneyOverview } from "@/features/engagement/operations-dashboard/ui/journey-overview";
import { formatDashboardInteger } from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import { ENGAGEMENT_DASHBOARD_ROUTES } from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type EngagementDashboardPageProps = Readonly<{
  access: ResolvedEngagementDashboardAccess;
  query: EngagementDashboardSearchParams;
  data: EngagementOverviewData;
}>;

function sectionFailure(
  title: string,
  result: Exclude<
    EngagementDashboardSectionResult<unknown>,
    { status: "ready" }
  >,
): React.ReactElement {
  return (
    <ContentStatus
      variant={result.status === "forbidden" ? "warning" : "destructive"}
      title={`${title} ${result.status === "forbidden" ? "is restricted" : "is unavailable"}`}
      description={
        result.status === "forbidden"
          ? "The active role does not have permission to read this section."
          : result.error?.requestId === undefined
            ? "This section failed independently. Refresh the dashboard before retrying."
            : `This section failed independently. Reference: ${result.error.requestId}`
      }
    />
  );
}

export function EngagementDashboardPage({
  access,
  query,
  data,
}: EngagementDashboardPageProps): React.ReactElement {
  return (
    <EngagementWorkspaceShell
      access={access}
      query={query}
      route={ENGAGEMENT_DASHBOARD_ROUTES.overview}
      filterOptions={data.filterOptions}
    >
      {data.journey.status === "ready" ? (
        <JourneyOverview snapshot={data.journey.data} />
      ) : (
        sectionFailure("Authoritative journey analytics", data.journey)
      )}

      <section
        aria-labelledby="engagement-operational-queue-heading"
        className="grid gap-3"
      >
        <ContentHeader
          variant="compact"
          eyebrow="Operational context"
          icon={<Building2 aria-hidden="true" />}
          iconTone="default"
          title="Lead work queue"
          description="This queue remains lead-based for follow-up and intervention workflows. Advanced queue filters do not change the process-run journey KPIs above; the cohort dates are shared for navigation consistency."
          actions={
            data.leads.status === "ready" ? (
              <Badge variant="outline">
                {formatDashboardInteger(data.leads.data.items.length)} shown
              </Badge>
            ) : undefined
          }
          id="engagement-operational-queue-heading"
        />

        {data.leads.status === "ready" ? (
          <EngagementLeadsTable
            result={data.leads.data}
            query={query}
            capabilities={access.capabilities}
          />
        ) : (
          sectionFailure("Vehicle-sales engagement queue", data.leads)
        )}
      </section>
    </EngagementWorkspaceShell>
  );
}

export function EngagementDashboardAccessState({
  access,
}: Readonly<{
  access: Exclude<EngagementDashboardAccess, { kind: "resolved" }>;
}>): React.ReactElement {
  const contextRequired = access.kind === "context_required";

  return (
    <ContentRoot width="default">
      <ContentHeader
        eyebrow="Vehicle sales engagement"
        icon={contextRequired ? <Building2 /> : <CircleAlert />}
        iconTone={contextRequired ? "warning" : "destructive"}
        title={
          contextRequired
            ? "Select a tenant in the application header"
            : "Access restricted"
        }
        description={
          contextRequired
            ? "The dashboard reuses the globally selected tenant. Select it once from the application header and reopen this page."
            : access.reason
        }
      />
      <ContentStatus
        variant={contextRequired ? "warning" : "destructive"}
        title={
          contextRequired
            ? "Global tenant context required"
            : "Permission required"
        }
        description="No dashboard request was made without a valid actor and tenant scope."
      />
    </ContentRoot>
  );
}

export function EngagementDashboardInvalidQueryState({
  issues,
}: Readonly<{ issues: readonly string[] }>): React.ReactElement {
  return (
    <ContentRoot width="default">
      <ContentHeader
        eyebrow="Vehicle sales engagement"
        icon={<CircleAlert />}
        iconTone="destructive"
        title="This dashboard link is invalid"
        description="The URL contains unsupported or unsafe filter values."
        actions={
          <Button asChild>
            <Link href={ENGAGEMENT_DASHBOARD_ROUTES.overview} prefetch={false}>
              Open default view
            </Link>
          </Button>
        }
      />
      <ContentStatus
        variant="destructive"
        title="Filter validation failed"
        description={issues.slice(0, 5).join(" · ")}
      />
    </ContentRoot>
  );
}

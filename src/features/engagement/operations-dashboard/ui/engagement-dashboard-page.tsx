// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-dashboard-page.tsx
import type * as React from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  CircleAlert,
  Handshake,
  PhoneCall,
  UserRound,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentHeader,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
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
import {
  EngagementMetricGrid,
  type EngagementMetric,
} from "@/features/engagement/operations-dashboard/ui/engagement-metric-grid";
import { EngagementLeadsTable } from "@/features/engagement/operations-dashboard/ui/engagement-leads-table";
import { EngagementWorkspaceShell } from "@/features/engagement/operations-dashboard/ui/engagement-workspace-shell";
import { LeadSourceChart } from "@/features/engagement/operations-dashboard/ui/lead-source-chart";
import { TopLeadLocations } from "@/features/engagement/operations-dashboard/ui/top-lead-locations";
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

function overviewMetrics(
  data: Extract<EngagementOverviewData["summary"], { status: "ready" }>["data"],
  query: EngagementDashboardSearchParams,
): readonly EngagementMetric[] {
  const { kpis } = data;

  return [
    {
      id: "new-leads",
      label: "New leads",
      value: formatDashboardInteger(kpis.newLeads.value),
      description: `${formatDashboardInteger(Math.round(kpis.newLeads.averagePerDay))} average per day.`,
      help: "Vehicle-sales leads created inside the selected operational date and filter scope.",
      icon: <UserRound aria-hidden="true" className="size-5" />,
      tone: "info",
      ...(query.comparison === "NONE"
        ? {}
        : {
            trend: {
              value: kpis.newLeads.changePct,
              positiveIsGood: true,
              label: "No comparable baseline",
            },
          }),
    },
    {
      id: "assigned",
      label: "Assigned",
      value: formatDashboardInteger(kpis.assigned.value),
      description: "Leads assigned to a dealer in the selected period.",
      help: "Unique vehicle-sales leads with a verified dealer assignment.",
      icon: <Building2 aria-hidden="true" className="size-5" />,
      tone: "info",
      trend: {
        value: kpis.assigned.changePct,
        positiveIsGood: true,
        label: "No comparable baseline",
      },
    },
    {
      id: "contacted",
      label: "Contacted",
      value: formatDashboardInteger(kpis.contacted.value),
      description: "Leads with verified dealer interaction evidence.",
      help: "Unique leads where the dealer opened or updated the secure lead workflow.",
      icon: <PhoneCall aria-hidden="true" className="size-5" />,
      tone: "info",
      trend: {
        value: kpis.contacted.changePct,
        positiveIsGood: true,
        label: "No comparable baseline",
      },
    },
    {
      id: "booked",
      label: "Booked",
      value: formatDashboardInteger(kpis.booked.value),
      description: "Leads linked to verified vehicle bookings.",
      help: "Unique leads with a non-cancelled sale order or booking event.",
      icon: <Handshake aria-hidden="true" className="size-5" />,
      tone: "success",
      trend: {
        value: kpis.booked.changePct,
        positiveIsGood: true,
        label: "No comparable baseline",
      },
    },
    {
      id: "conversion",
      label: "Converted",
      value: formatDashboardInteger(kpis.converted.value),
      description: "Leads linked to a sale invoice in the selected period.",
      help: "Unique leads with a verified sale-invoice conversion event.",
      icon: <CheckCircle2 aria-hidden="true" className="size-5" />,
      tone: "success",
      trend: {
        value: kpis.converted.changePct,
        positiveIsGood: true,
        label: "No comparable baseline",
      },
    },
  ];
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
      <section
        aria-label="Engagement performance indicators"
        className="grid gap-3"
      >
        {data.summary.status === "ready" ? (
          <EngagementMetricGrid
            metrics={overviewMetrics(data.summary.data, query)}
            columns={5}
          />
        ) : (
          sectionFailure("Engagement KPIs", data.summary)
        )}
      </section>

      <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(28rem,.85fr)]">
        {data.leadFlow.status === "ready" ? (
          <ContentDataSurface
            title="New vs closed leads"
            description="Daily acquisition and terminal outcomes for the selected period."
            contentClassName="min-h-[26rem] px-[var(--card-spacing)] pb-[var(--card-spacing)]"
          >
            <LeadSourceChart series={data.leadFlow.data} query={query} />
          </ContentDataSurface>
        ) : (
          sectionFailure("Lead flow trend", data.leadFlow)
        )}
        {data.coverage.status === "ready" ? (
          <ContentDataSurface
            title="Top lead locations"
            description="Lead concentration across Tamil Nadu districts with India-level context."
            contentClassName="px-[var(--card-spacing)] pb-[var(--card-spacing)]"
          >
            <TopLeadLocations coverage={data.coverage.data} query={query} />
          </ContentDataSurface>
        ) : (
          sectionFailure("Top lead locations", data.coverage)
        )}
      </div>

      <section
        aria-label="Vehicle-sales engagement queue"
        className="grid gap-3"
      >
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

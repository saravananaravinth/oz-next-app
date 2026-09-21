// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-dashboard-page.tsx
import type * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  UserRound,
} from "lucide-react";

import {
  ContentDataSurface,
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
import {
  EngagementMetricGrid,
  type EngagementMetric,
} from "@/features/engagement/operations-dashboard/ui/engagement-metric-grid";
import { EngagementOverviewFunnel } from "@/features/engagement/operations-dashboard/ui/engagement-overview-funnel";
import { EngagementLeadsTable } from "@/features/engagement/operations-dashboard/ui/engagement-leads-table";
import { EngagementWorkspaceShell } from "@/features/engagement/operations-dashboard/ui/engagement-workspace-shell";
import { LeadSourceChart } from "@/features/engagement/operations-dashboard/ui/lead-source-chart";
import {
  formatDashboardDuration,
  formatDashboardInteger,
  formatDashboardPercentage,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
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
      description: `${formatDashboardInteger(Math.round(kpis.newLeads.averagePerDay))} average per day in the selected period.`,
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
      id: "assignment-health",
      label: "Assignment rate",
      value: formatDashboardPercentage(kpis.assignmentHealth.ratePct),
      description: `${formatDashboardInteger(kpis.assignmentHealth.assignedCount)} assigned of ${formatDashboardInteger(kpis.assignmentHealth.assignableCount)} assignable leads.`,
      help: "Share of assignable leads with a dealer assignment in the selected operational scope.",
      icon: <Building2 aria-hidden="true" className="size-5" />,
      tone: kpis.assignmentHealth.unassignedCount > 0 ? "warning" : "success",
      badge: `${formatDashboardInteger(kpis.assignmentHealth.unassignedCount)} unassigned`,
    },
    {
      id: "dealer-response",
      label: "Response SLA",
      value: formatDashboardPercentage(kpis.dealerResponseSla.ratePct),
      description: `${formatDashboardInteger(kpis.dealerResponseSla.respondedCount)} responded; median ${formatDashboardDuration(kpis.dealerResponseSla.medianResponseMinutes)}.`,
      help: "Dealer responses measured against the configured response SLA for eligible assigned leads.",
      icon: <Clock3 aria-hidden="true" className="size-5" />,
      tone: kpis.dealerResponseSla.breachedCount > 0 ? "warning" : "success",
      badge: `${formatDashboardInteger(kpis.dealerResponseSla.breachedCount)} breached`,
    },
    {
      id: "follow-up",
      label: "Follow-up compliance",
      value: formatDashboardPercentage(kpis.followUpCompliance.ratePct),
      description: `${formatDashboardInteger(kpis.followUpCompliance.completedOnTimeCount)} completed on time of ${formatDashboardInteger(kpis.followUpCompliance.dueCount)} due.`,
      help: "On-time dealer follow-up completion for due follow-up actions in the selected scope.",
      icon: <CalendarClock aria-hidden="true" className="size-5" />,
      tone: kpis.followUpCompliance.overdueCount > 0 ? "warning" : "success",
      badge: `${formatDashboardInteger(kpis.followUpCompliance.overdueCount)} overdue`,
    },
    {
      id: "conversion",
      label: "Conversion",
      value: formatDashboardPercentage(kpis.conversion.ratePct),
      description: `${formatDashboardInteger(kpis.conversion.convertedCount)} converted from ${formatDashboardInteger(kpis.conversion.eligibleCount)} eligible leads.`,
      help: "Operational lead conversion rate for the selected lead cohort and filters.",
      icon: <CheckCircle2 aria-hidden="true" className="size-5" />,
      tone: "success",
      badge: `${formatDashboardInteger(kpis.conversion.bookingCount)} booked`,
    },
    {
      id: "needs-attention",
      label: "Needs attention",
      value: formatDashboardInteger(kpis.needsAttention.totalCount),
      description: `${formatDashboardInteger(kpis.needsAttention.criticalCount)} critical and ${formatDashboardInteger(kpis.needsAttention.highCount)} high-priority items.`,
      help: "Open operational attention items within the selected dashboard scope.",
      icon: <CircleAlert aria-hidden="true" className="size-5" />,
      tone:
        kpis.needsAttention.criticalCount > 0
          ? "destructive"
          : kpis.needsAttention.highCount > 0
            ? "warning"
            : "default",
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
        aria-labelledby="engagement-overview-kpi-heading"
        className="grid gap-3"
      >
        <ContentHeader
          id="engagement-overview-kpi-heading"
          variant="compact"
          eyebrow="Overview"
          icon={<BarChart3 aria-hidden="true" />}
          iconTone="info"
          title="Vehicle-sales engagement performance"
          description="Operational KPIs, source trend, lifecycle funnel, and actionable lead queue for the same validated filter scope."
        />
        {data.summary.status === "ready" ? (
          <EngagementMetricGrid
            metrics={overviewMetrics(data.summary.data, query)}
            columns={6}
          />
        ) : (
          sectionFailure("Engagement KPIs", data.summary)
        )}
      </section>

      {data.leadSources.status === "ready" ? (
        <ContentDataSurface
          title="Lead-source trend"
          description="Compare vehicle-sales acquisition volume by source over the selected period. Select a bar to cross-filter the operational view."
          contentClassName="min-h-[26rem] px-[var(--card-spacing)] pb-[var(--card-spacing)]"
        >
          <LeadSourceChart series={data.leadSources.data} query={query} />
        </ContentDataSurface>
      ) : (
        sectionFailure("Lead-source trend", data.leadSources)
      )}

      {data.funnel.status === "ready" ? (
        <EngagementOverviewFunnel funnel={data.funnel.data} />
      ) : (
        sectionFailure("Lead lifecycle funnel", data.funnel)
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
          description="Priority vehicle-sales leads for follow-up and intervention. The queue uses the same date, search, and advanced filters as the Overview KPIs, source trend, and funnel."
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

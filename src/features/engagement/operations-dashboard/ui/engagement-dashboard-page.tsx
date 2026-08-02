// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-dashboard-page.tsx
import type * as React from "react";
import Link from "next/link";
import {
  AlarmClockCheck,
  Building2,
  CircleAlert,
  Gauge,
  Info,
  ShoppingCart,
  Users,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentGrid,
  ContentHeader,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type {
  EngagementDashboardSearchParams,
  EngagementDashboardSummary,
  EngagementFunnel,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
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
import {
  formatDashboardDuration,
  formatDashboardInteger,
  formatDashboardPercentage,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import {
  ENGAGEMENT_DASHBOARD_ROUTES,
  engagementWorkspaceHref,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

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
            ? "This section failed independently. Refresh or narrow the filters before retrying."
            : `This section failed independently. Reference: ${result.error.requestId}`
      }
    />
  );
}

function comparisonChange(
  current: number,
  previous: number | null,
): number | null {
  if (previous === null || previous === 0) {
    return current === 0 && previous === 0 ? 0 : null;
  }

  return ((current - previous) / previous) * 100;
}

function metrics(
  summary: EngagementDashboardSummary,
  comparison: EngagementDashboardSummary | null,
  query: EngagementDashboardSearchParams,
): readonly EngagementMetric[] {
  const current = summary.kpis;
  const previous = comparison?.kpis ?? null;
  const dealers = engagementWorkspaceHref(
    ENGAGEMENT_DASHBOARD_ROUTES.dealers,
    query,
  );
  const support = engagementWorkspaceHref(
    ENGAGEMENT_DASHBOARD_ROUTES.issues,
    query,
  );

  return [
    {
      id: "new-leads",
      label: "New vehicle leads",
      value: formatDashboardInteger(current.newLeads.value),
      description: `${current.newLeads.averagePerDay.toFixed(1)} average per day`,
      help: "Vehicle-sales leads created in the selected period. The trend compares the same metric with the configured comparison period.",
      icon: <Users aria-hidden="true" className="size-5" />,
      tone: "info",
      trend: {
        value: comparisonChange(
          current.newLeads.value,
          previous?.newLeads.value ?? null,
        ),
        positiveIsGood: true,
      },
      href: engagementWorkspaceHref(
        ENGAGEMENT_DASHBOARD_ROUTES.overview,
        query,
      ),
    },
    {
      id: "assignment",
      label: "Assignment health",
      value: formatDashboardPercentage(current.assignmentHealth.ratePct),
      description: `${formatDashboardInteger(current.assignmentHealth.assignedCount)} assigned · ${formatDashboardInteger(current.assignmentHealth.unassignedCount)} unassigned`,
      help: "Assigned leads divided by all assignable vehicle-sales leads. Unassigned leads usually indicate missing location, dealer eligibility, capacity, or coverage.",
      icon: <Building2 aria-hidden="true" className="size-5" />,
      tone: current.assignmentHealth.ratePct >= 90 ? "success" : "warning",
      trend: {
        value: comparisonChange(
          current.assignmentHealth.ratePct,
          previous?.assignmentHealth.ratePct ?? null,
        ),
        positiveIsGood: true,
      },
      href: dealers,
    },
    {
      id: "response-sla",
      label: "Dealer response SLA",
      value: formatDashboardPercentage(current.dealerResponseSla.ratePct),
      description: `${formatDashboardInteger(current.dealerResponseSla.respondedCount)} within SLA · ${formatDashboardInteger(current.dealerResponseSla.breachedCount)} breached`,
      help: "Share of eligible assigned leads whose first dealer response was recorded within the configured response target.",
      icon: <Gauge aria-hidden="true" className="size-5" />,
      tone: current.dealerResponseSla.breachedCount > 0 ? "warning" : "success",
      trend: {
        value: comparisonChange(
          current.dealerResponseSla.ratePct,
          previous?.dealerResponseSla.ratePct ?? null,
        ),
        positiveIsGood: true,
      },
      href: support,
    },
    {
      id: "follow-up",
      label: "Follow-up compliance",
      value: formatDashboardPercentage(current.followUpCompliance.ratePct),
      description: `${formatDashboardInteger(current.followUpCompliance.completedOnTimeCount)} on time · ${formatDashboardInteger(current.followUpCompliance.overdueCount)} overdue`,
      help: "Follow-ups completed on or before their due time divided by follow-ups due in the selected cohort.",
      icon: <AlarmClockCheck aria-hidden="true" className="size-5" />,
      tone: current.followUpCompliance.overdueCount > 0 ? "warning" : "success",
      trend: {
        value: comparisonChange(
          current.followUpCompliance.ratePct,
          previous?.followUpCompliance.ratePct ?? null,
        ),
        positiveIsGood: true,
      },
      href: support,
    },
    {
      id: "conversion",
      label: "Cohort conversion",
      value: formatDashboardPercentage(current.conversion.ratePct),
      description: `${formatDashboardInteger(current.conversion.bookingCount)} booked · ${formatDashboardInteger(current.conversion.convertedCount)} converted`,
      help: "Verified conversions divided by eligible leads created in the selected period. Later conversions remain attributed to their original cohort.",
      icon: <ShoppingCart aria-hidden="true" className="size-5" />,
      tone: "success",
      trend: {
        value: comparisonChange(
          current.conversion.ratePct,
          previous?.conversion.ratePct ?? null,
        ),
        positiveIsGood: true,
      },
      href: engagementWorkspaceHref(
        ENGAGEMENT_DASHBOARD_ROUTES.overview,
        query,
      ),
    },
    {
      id: "attention",
      label: "Needs attention",
      value: formatDashboardInteger(current.needsAttention.totalCount),
      description: `${formatDashboardInteger(current.needsAttention.criticalCount)} critical · ${formatDashboardInteger(current.needsAttention.highCount)} high`,
      help: "Open operational exceptions across assignment, response, follow-up, customer location, dealer configuration, and message delivery.",
      icon: <CircleAlert aria-hidden="true" className="size-5" />,
      tone:
        current.needsAttention.criticalCount > 0 ? "destructive" : "warning",
      trend: {
        value: comparisonChange(
          current.needsAttention.totalCount,
          previous?.needsAttention.totalCount ?? null,
        ),
        positiveIsGood: false,
      },
      href: support,
    },
  ];
}

function Funnel({
  funnel,
}: Readonly<{ funnel: EngagementFunnel }>): React.ReactElement {
  const maximum = funnel.stages[0]?.count ?? 0;
  const stageHelp = {
    NEW: "Vehicle-sales leads created in the selected cohort.",
    ASSIGNED: "Leads with a current eligible dealer assignment.",
    CONTACTED: "Assigned leads with a recorded first dealer response.",
    BOOKED: "Leads with a verified booking event.",
    CONVERTED: "Leads linked to a verified conversion record.",
  } as const satisfies Readonly<
    Record<EngagementFunnel["stages"][number]["code"], string>
  >;

  return (
    <div className="grid gap-3">
      {funnel.stages.map((stage, index) => {
        const progress = maximum === 0 ? 0 : (stage.count / maximum) * 100;
        return (
          <div
            key={stage.code}
            className="grid gap-2 rounded-2xl border border-border/70 p-3.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant="outline" className="size-6 rounded-full px-0">
                  {index + 1}
                </Badge>
                <span className="truncate text-body-sm font-medium">
                  {stage.name}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-readable"
                      tabIndex={0}
                    >
                      <Info aria-hidden="true" className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{stageHelp[stage.code]}</TooltipContent>
                </Tooltip>
              </div>
              <span className="text-section-title text-tabular">
                {formatDashboardInteger(stage.count)}
              </span>
            </div>
            <Progress
              value={progress}
              aria-label={`${stage.name} ${progress.toFixed(1)} percent of the starting cohort`}
            />
            <div className="flex flex-wrap justify-between gap-2 text-caption text-muted-readable">
              <span>
                {stage.dropOffPct === null
                  ? "Starting cohort"
                  : `${formatDashboardPercentage(stage.dropOffPct)} drop-off`}
              </span>
              <span>
                Median from prior:{" "}
                {formatDashboardDuration(stage.medianMinutesFromPrevious)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EngagementDashboardPage({
  access,
  query,
  data,
}: EngagementDashboardPageProps): React.ReactElement {
  const comparison =
    data.comparisonSummary?.status === "ready"
      ? data.comparisonSummary.data
      : null;

  return (
    <EngagementWorkspaceShell
      access={access}
      query={query}
      route={ENGAGEMENT_DASHBOARD_ROUTES.overview}
      filterOptions={data.filterOptions}
    >
      {data.summary.status !== "ready" ? (
        sectionFailure("Overview KPIs", data.summary)
      ) : (
        <EngagementMetricGrid
          metrics={metrics(data.summary.data, comparison, query)}
        />
      )}

      <ContentGrid variant="main-aside" className="items-stretch">
        <ContentDataSurface
          title="Lead intake by source"
          description="Vehicle-sales lead volume and source mix across the selected period."
          className="h-full"
          contentClassName="flex min-h-0 flex-1 flex-col px-[var(--card-spacing)] pb-[var(--card-spacing)]"
        >
          {data.sourceSeries.status === "ready" ? (
            <LeadSourceChart series={data.sourceSeries.data} query={query} />
          ) : (
            sectionFailure("Lead-source chart", data.sourceSeries)
          )}
        </ContentDataSurface>

        <ContentDataSurface
          title="Vehicle-sales funnel"
          description="Cohort progression, drop-off, and median time between lifecycle stages."
          className="h-full"
          contentClassName="px-[var(--card-spacing)] pb-[var(--card-spacing)]"
        >
          {data.funnel.status === "ready" ? (
            <Funnel funnel={data.funnel.data} />
          ) : (
            sectionFailure("Vehicle-sales funnel", data.funnel)
          )}
        </ContentDataSurface>
      </ContentGrid>

      {data.leads.status === "ready" ? (
        <EngagementLeadsTable
          result={data.leads.data}
          query={query}
          capabilities={access.capabilities}
        />
      ) : (
        sectionFailure("Vehicle-sales leads", data.leads)
      )}
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
            <Link href={ENGAGEMENT_DASHBOARD_ROUTES.overview}>
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

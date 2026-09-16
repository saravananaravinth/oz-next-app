// oz-next-app/src/features/engagement/vehicle-enquiries/ui/vehicle-enquiries-page.tsx
import type * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlarmClockCheck,
  ArrowDown,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Gauge,
  MessageSquareText,
  Route,
  Search,
  ShieldAlert,
  ShoppingCart,
  TriangleAlert,
  Users,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentGrid,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { WorkspaceHeader } from "@/components/common/workspace-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import type {
  EngagementCoverageResult,
  EngagementDashboardIssueResult,
  EngagementDashboardSearchParams,
  EngagementDashboardSummary,
  EngagementDealerPerformanceItem,
  EngagementDealerPerformanceResult,
  EngagementFunnel,
  EngagementLeadSourceSeries,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDashboardSectionResult } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.types";
import type { ResolvedEngagementDashboardAccess } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { EngagementMetricGrid } from "@/features/engagement/operations-dashboard/ui/engagement-metric-grid";
import { EngagementWorkspaceShell } from "@/features/engagement/operations-dashboard/ui/engagement-workspace-shell";
import {
  formatDashboardAge,
  formatDashboardDateTime,
  formatDashboardDuration,
  formatDashboardInteger,
  formatDashboardPercentage,
  titleCaseDashboardToken,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import {
  ENGAGEMENT_DASHBOARD_ROUTES,
  engagementWorkspaceHref,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";
import type {
  VehicleEnquiriesAttentionState,
  VehicleEnquiriesCommandCenterData,
} from "@/features/engagement/vehicle-enquiries/contracts/vehicle-enquiries";
import { VehicleEnquiriesIncidentQueue } from "@/features/engagement/vehicle-enquiries/ui/vehicle-enquiries-incident-queue";
import { VehicleEnquiriesLeadMonitor } from "@/features/engagement/vehicle-enquiries/ui/vehicle-enquiries-lead-monitor";

export type VehicleEnquiriesPageProps = Readonly<{
  access: ResolvedEngagementDashboardAccess;
  query: EngagementDashboardSearchParams;
  data: VehicleEnquiriesCommandCenterData;
}>;

type ContentStatusPresentationVariant = NonNullable<
  React.ComponentProps<typeof ContentStatus>["variant"]
>;

type BadgePresentationVariant = NonNullable<BadgeProps["variant"]>;

type AttentionPresentation = Readonly<{
  label: string;
  description: string;
  variant: ContentStatusPresentationVariant;
  badgeVariant: BadgePresentationVariant;
  icon: React.ReactNode;
}>;

const DEALER_HEALTH_ORDER = {
  CONFIGURATION_ISSUE: 0,
  AT_RISK: 1,
  WATCH: 2,
  INACTIVE: 3,
  HEALTHY: 4,
} as const satisfies Readonly<
  Record<EngagementDealerPerformanceItem["health"]["status"], number>
>;

function attentionState(
  summary: EngagementDashboardSummary,
): VehicleEnquiriesAttentionState {
  const attention = summary.kpis.needsAttention;

  if (attention.criticalCount > 0) {
    return "CRITICAL";
  }

  if (attention.highCount > 0) {
    return "AT_RISK";
  }

  if (attention.mediumCount > 0 || attention.lowCount > 0) {
    return "DEGRADED";
  }

  return "HEALTHY";
}

function attentionPresentation(
  state: VehicleEnquiriesAttentionState,
): AttentionPresentation {
  switch (state) {
    case "CRITICAL":
      return {
        label: "Critical intervention required",
        description:
          "The backend has classified at least one Vehicle Enquiries issue as critical. Prioritize the incident queue before routine monitoring.",
        variant: "destructive",
        badgeVariant: "destructive",
        icon: <ShieldAlert aria-hidden="true" />,
      };
    case "AT_RISK":
      return {
        label: "Vehicle Enquiries at risk",
        description:
          "High-severity engagement exceptions are active. Assign ownership and verify remediation outcomes during this shift.",
        variant: "warning",
        badgeVariant: "warning",
        icon: <TriangleAlert aria-hidden="true" />,
      };
    case "DEGRADED":
      return {
        label: "Operational attention required",
        description:
          "Medium or low severity engagement exceptions are active. The flow is measurable, but staff attention is still required.",
        variant: "warning",
        badgeVariant: "warning",
        icon: <CircleAlert aria-hidden="true" />,
      };
    case "HEALTHY":
      return {
        label: "No deterministic support issues detected",
        description:
          "The current engagement dashboard issue model has no active attention item for this filtered Vehicle Enquiries cohort.",
        variant: "success",
        badgeVariant: "success",
        icon: <CheckCircle2 aria-hidden="true" />,
      };
  }
}

function sectionStatus(
  title: string,
  section: EngagementDashboardSectionResult<unknown>,
): React.ReactElement {
  return (
    <ContentStatus
      variant={section.status === "forbidden" ? "warning" : "destructive"}
      title={
        section.status === "forbidden"
          ? `${title} is restricted`
          : `${title} is unavailable`
      }
      description={
        section.status === "forbidden"
          ? "The active actor does not have the required permission for this command-center section. No cross-scope fallback was attempted."
          : "The section could not be loaded from the engagement API. Other independently loaded sections remain usable."
      }
    />
  );
}

function percentageOf(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (numerator / denominator) * 100));
}

function relativeChangePct(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / previous) * 100;
}

function SummaryMetrics({
  summary,
  comparison,
}: Readonly<{
  summary: EngagementDashboardSummary;
  comparison: EngagementDashboardSummary | null;
}>): React.ReactElement {
  const { kpis } = summary;

  return (
    <EngagementMetricGrid
      columns={6}
      metrics={[
        {
          id: "lead-intake",
          label: "Lead intake",
          value: formatDashboardInteger(kpis.newLeads.value),
          description: `${formatDashboardInteger(kpis.newLeads.averagePerDay)} average leads per day in the selected Vehicle Enquiries cohort.`,
          icon: <Users aria-hidden="true" className="size-5" />,
          tone: "info",
          trend: {
            value: kpis.newLeads.changePct,
            positiveIsGood: true,
          },
        },
        {
          id: "assignment",
          label: "Assignment health",
          value: formatDashboardPercentage(kpis.assignmentHealth.ratePct),
          description: `${formatDashboardInteger(kpis.assignmentHealth.unassignedCount)} unassigned of ${formatDashboardInteger(kpis.assignmentHealth.assignableCount)} assignable leads.`,
          icon: <Route aria-hidden="true" className="size-5" />,
          tone:
            kpis.assignmentHealth.unassignedCount > 0 ? "warning" : "success",
          ...(comparison === null
            ? {}
            : {
                trend: {
                  value: relativeChangePct(
                    kpis.assignmentHealth.ratePct,
                    comparison.kpis.assignmentHealth.ratePct,
                  ),
                  positiveIsGood: true,
                },
              }),
        },
        {
          id: "response",
          label: "Dealer response SLA",
          value: formatDashboardPercentage(kpis.dealerResponseSla.ratePct),
          description: `${formatDashboardInteger(kpis.dealerResponseSla.breachedCount)} SLA breaches across ${formatDashboardInteger(kpis.dealerResponseSla.eligibleCount)} eligible leads.`,
          icon: <MessageSquareText aria-hidden="true" className="size-5" />,
          tone:
            kpis.dealerResponseSla.breachedCount > 0 ? "warning" : "success",
          ...(comparison === null
            ? {}
            : {
                trend: {
                  value: relativeChangePct(
                    kpis.dealerResponseSla.ratePct,
                    comparison.kpis.dealerResponseSla.ratePct,
                  ),
                  positiveIsGood: true,
                },
              }),
        },
        {
          id: "follow-up",
          label: "Follow-up compliance",
          value: formatDashboardPercentage(kpis.followUpCompliance.ratePct),
          description: `${formatDashboardInteger(kpis.followUpCompliance.overdueCount)} overdue follow-ups across ${formatDashboardInteger(kpis.followUpCompliance.dueCount)} due leads.`,
          icon: <AlarmClockCheck aria-hidden="true" className="size-5" />,
          tone:
            kpis.followUpCompliance.overdueCount > 0 ? "warning" : "success",
          ...(comparison === null
            ? {}
            : {
                trend: {
                  value: relativeChangePct(
                    kpis.followUpCompliance.ratePct,
                    comparison.kpis.followUpCompliance.ratePct,
                  ),
                  positiveIsGood: true,
                },
              }),
        },
        {
          id: "bookings",
          label: "Bookings",
          value: formatDashboardInteger(kpis.conversion.bookingCount),
          description: `${formatDashboardInteger(kpis.conversion.completedInPeriodCount)} completed outcomes recorded in the selected period.`,
          icon: <ShoppingCart aria-hidden="true" className="size-5" />,
          tone: "default",
          ...(comparison === null
            ? {}
            : {
                trend: {
                  value: relativeChangePct(
                    kpis.conversion.bookingCount,
                    comparison.kpis.conversion.bookingCount,
                  ),
                  positiveIsGood: true,
                },
              }),
        },
        {
          id: "attention",
          label: "Needs attention",
          value: formatDashboardInteger(kpis.needsAttention.totalCount),
          description: `${formatDashboardInteger(kpis.needsAttention.criticalCount)} critical · ${formatDashboardInteger(kpis.needsAttention.highCount)} high severity.`,
          icon: <ShieldAlert aria-hidden="true" className="size-5" />,
          tone:
            kpis.needsAttention.criticalCount > 0
              ? "destructive"
              : kpis.needsAttention.totalCount > 0
                ? "warning"
                : "success",
        },
      ]}
    />
  );
}

function LifecycleFunnel({
  funnel,
}: Readonly<{ funnel: EngagementFunnel }>): React.ReactElement {
  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {funnel.stages.map((stage, index) => (
        <div key={stage.code} className="relative min-w-0">
          <Card size="sm" className="h-full shadow-none">
            <CardHeader className="gap-2 pb-2">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={index === 0 ? "info" : "outline"}>
                  {String(index + 1).padStart(2, "0")}
                </Badge>
                {stage.dropOffPct === null ? null : (
                  <Badge
                    variant={stage.dropOffPct > 35 ? "warning" : "secondary"}
                  >
                    <ArrowDown aria-hidden="true" />
                    {formatDashboardPercentage(stage.dropOffPct)}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-card-title">{stage.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 pt-0">
              <p className="text-page-title text-tabular">
                {formatDashboardInteger(stage.count)}
              </p>
              <p className="text-caption text-muted-readable">
                {stage.medianMinutesFromPrevious === null
                  ? "Entry stage"
                  : `Median ${formatDashboardDuration(stage.medianMinutesFromPrevious)} from previous stage`}
              </p>
            </CardContent>
          </Card>
          {index < funnel.stages.length - 1 ? (
            <ArrowRight
              aria-hidden="true"
              className="absolute top-1/2 -right-2 z-10 hidden size-4 -translate-y-1/2 text-muted-readable lg:block"
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SourceMix({
  series,
}: Readonly<{ series: EngagementLeadSourceSeries }>): React.ReactElement {
  const total = series.sources.reduce(
    (sum, source) => sum + source.totalCount,
    0,
  );

  if (series.sources.length === 0 || total === 0) {
    return (
      <p className="text-body-sm text-muted-readable">
        No lead-source volume is available for this filtered cohort.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {series.sources.map((source) => {
        const share = percentageOf(source.totalCount, total);

        return (
          <div key={source.leadSourceId} className="grid gap-2">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-body-sm font-medium text-foreground">
                  {source.name}
                </p>
                <p className="text-caption text-muted-readable">
                  {source.code}
                </p>
              </div>
              <div className="shrink-0 text-end text-tabular">
                <p className="text-body-sm font-medium">
                  {formatDashboardInteger(source.totalCount)}
                </p>
                <p className="text-caption text-muted-readable">
                  {formatDashboardPercentage(share)}
                </p>
              </div>
            </div>
            <Progress value={share} aria-label={`${source.name} lead share`} />
          </div>
        );
      })}
    </div>
  );
}

function IncidentSummary({
  summary,
  issues,
}: Readonly<{
  summary: EngagementDashboardSummary;
  issues: EngagementDashboardIssueResult;
}>): React.ReactElement {
  const oldest = issues.items.reduce(
    (max, issue) => Math.max(max, issue.issueAgeMinutes),
    0,
  );
  const retryEligible = issues.items.reduce(
    (count, issue) => count + (issue.retryEligible ? 1 : 0),
    0,
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border bg-muted/20 p-4">
        <p className="text-overline text-muted-readable">Critical</p>
        <p className="mt-1 text-page-title text-tabular">
          {formatDashboardInteger(summary.kpis.needsAttention.criticalCount)}
        </p>
      </div>
      <div className="rounded-2xl border bg-muted/20 p-4">
        <p className="text-overline text-muted-readable">High</p>
        <p className="mt-1 text-page-title text-tabular">
          {formatDashboardInteger(summary.kpis.needsAttention.highCount)}
        </p>
      </div>
      <div className="rounded-2xl border bg-muted/20 p-4">
        <p className="text-overline text-muted-readable">Retry eligible</p>
        <p className="mt-1 text-page-title text-tabular">
          {formatDashboardInteger(retryEligible)}
        </p>
        <p className="mt-1 text-caption text-muted-readable">
          Visible issue page
        </p>
      </div>
      <div className="rounded-2xl border bg-muted/20 p-4">
        <p className="text-overline text-muted-readable">Oldest visible</p>
        <p className="mt-1 text-page-title text-tabular">
          {formatDashboardAge(oldest)}
        </p>
      </div>
    </div>
  );
}

function DealerRisk({
  result,
}: Readonly<{
  result: EngagementDealerPerformanceResult;
}>): React.ReactElement {
  const risks = [...result.items]
    .filter((dealer) => dealer.health.status !== "HEALTHY")
    .sort(
      (left, right) =>
        DEALER_HEALTH_ORDER[left.health.status] -
          DEALER_HEALTH_ORDER[right.health.status] ||
        right.issueCount - left.issueCount,
    )
    .slice(0, 6);

  if (risks.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-success/25 bg-success/[0.035] p-4">
        <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
        <div>
          <p className="text-body-sm font-medium">
            No dealer risk in this page
          </p>
          <p className="text-caption text-muted-readable">
            Every visible dealer record is classified healthy by the backend.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {risks.map((dealer) => (
        <div
          key={dealer.dealerOrgUnitId}
          className="grid gap-3 rounded-2xl border border-border/70 bg-muted/15 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        >
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate text-body-sm font-medium">
                {dealer.dealerName}
              </p>
              <Badge
                variant={
                  dealer.health.status === "CONFIGURATION_ISSUE" ||
                  dealer.health.status === "AT_RISK"
                    ? "destructive"
                    : "warning"
                }
              >
                {titleCaseDashboardToken(dealer.health.status)}
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-caption text-muted-readable">
              {dealer.health.reasons.join(" · ") ||
                "Backend health classification"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4 text-caption text-muted-readable">
            <span>
              Open{" "}
              <strong className="text-foreground">
                {dealer.openLeadCount}
              </strong>
            </span>
            <span>
              Issues{" "}
              <strong className="text-foreground">{dealer.issueCount}</strong>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CoverageRisk({
  result,
}: Readonly<{ result: EngagementCoverageResult }>): React.ReactElement {
  const risks = result.items
    .filter((item) => item.status !== "HEALTHY")
    .slice(0, 6);

  if (risks.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-success/25 bg-success/[0.035] p-4">
        <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
        <div>
          <p className="text-body-sm font-medium">No coverage risk detected</p>
          <p className="text-caption text-muted-readable">
            Every district in the current coverage result is classified healthy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {risks.map((item) => (
        <div
          key={item.district}
          className="rounded-2xl border border-border/70 bg-muted/15 p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-body-sm font-medium">{item.district}</p>
            <Badge
              variant={
                item.status === "NO_ACTIVE_DEALER" ? "destructive" : "warning"
              }
            >
              {titleCaseDashboardToken(item.status)}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-readable">
            <span>{formatDashboardInteger(item.leadCount)} leads</span>
            <span>
              {formatDashboardPercentage(item.unassignedRatePct)} unassigned
            </span>
            <span>
              {formatDashboardInteger(item.activeVehicleDealerCount)} active
              dealers
            </span>
          </div>
          {item.reasons.length > 0 ? (
            <p className="mt-2 line-clamp-2 text-caption text-muted-readable">
              {item.reasons.join(" · ")}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function VehicleEnquiriesPage({
  access,
  query,
  data,
}: VehicleEnquiriesPageProps): React.ReactElement {
  const summary = data.summary.status === "ready" ? data.summary.data : null;
  const comparisonSummary =
    data.comparisonSummary?.status === "ready"
      ? data.comparisonSummary.data
      : null;
  const presentation =
    summary === null ? null : attentionPresentation(attentionState(summary));
  const supportHref = engagementWorkspaceHref(
    ENGAGEMENT_DASHBOARD_ROUTES.issues,
    query,
  );
  const coverageHref = engagementWorkspaceHref(
    ENGAGEMENT_DASHBOARD_ROUTES.coverage,
    query,
  );
  const dealersHref = engagementWorkspaceHref(
    ENGAGEMENT_DASHBOARD_ROUTES.dealers,
    query,
  );

  return (
    <EngagementWorkspaceShell
      access={access}
      query={query}
      route={ENGAGEMENT_DASHBOARD_ROUTES.vehicleEnquiries}
      filterOptions={data.filterOptions}
    >
      <WorkspaceHeader
        titleId="vehicle-enquiries-command-center-title"
        title="Vehicle Enquiries command center"
        description="Monitor the current Vehicle Enquiries cohort, investigate lead history, identify dealer and coverage risks, and perform audited support interventions."
        icon={<Gauge aria-hidden="true" />}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="info">VEHICLE_ENQUIRIES</Badge>
            {summary === null ? null : (
              <Badge variant="outline">
                Updated {formatDashboardDateTime(summary.generatedAt)}
              </Badge>
            )}
          </div>
        }
      />

      {summary === null || presentation === null ? (
        sectionStatus("Command-center summary", data.summary)
      ) : (
        <ContentStatus
          variant={presentation.variant}
          title={presentation.label}
          description={presentation.description}
          icon={presentation.icon}
          announce={
            attentionState(summary) === "CRITICAL" ? "assertive" : "polite"
          }
          actions={
            <Badge variant={presentation.badgeVariant}>
              {formatDashboardInteger(summary.kpis.needsAttention.totalCount)}{" "}
              attention items
            </Badge>
          }
        />
      )}

      {summary === null ? null : (
        <SummaryMetrics summary={summary} comparison={comparisonSummary} />
      )}

      <ContentGrid variant="main-aside">
        <ContentDataSurface
          title="Vehicle Enquiry lifecycle"
          description="Measured backend lifecycle stages for the fixed Vehicle Enquiries flow. Counts and transition timing are authoritative for the selected lead cohort."
          actions={
            <Badge variant="outline">
              <Activity aria-hidden="true" />
              Cohort lifecycle
            </Badge>
          }
          contentClassName="p-[var(--card-spacing)]"
        >
          {data.funnel.status === "ready" ? (
            <LifecycleFunnel funnel={data.funnel.data} />
          ) : (
            sectionStatus("Lifecycle funnel", data.funnel)
          )}
        </ContentDataSurface>

        <ContentSection
          title="Early-warning signals"
          description="Operational symptoms already represented by current engagement contracts."
        >
          {summary === null ? (
            sectionStatus("Early-warning signals", data.summary)
          ) : (
            <div className="grid gap-3">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                <p className="text-overline text-muted-readable">Unassigned</p>
                <p className="mt-1 text-page-title text-tabular">
                  {formatDashboardInteger(
                    summary.kpis.assignmentHealth.unassignedCount,
                  )}
                </p>
                <p className="mt-1 text-caption text-muted-readable">
                  Median assignment{" "}
                  {formatDashboardDuration(
                    summary.kpis.assignmentHealth.medianAssignmentMinutes,
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                <p className="text-overline text-muted-readable">
                  Dealer SLA breaches
                </p>
                <p className="mt-1 text-page-title text-tabular">
                  {formatDashboardInteger(
                    summary.kpis.dealerResponseSla.breachedCount,
                  )}
                </p>
                <p className="mt-1 text-caption text-muted-readable">
                  Median response{" "}
                  {formatDashboardDuration(
                    summary.kpis.dealerResponseSla.medianResponseMinutes,
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                <p className="text-overline text-muted-readable">
                  Overdue follow-ups
                </p>
                <p className="mt-1 text-page-title text-tabular">
                  {formatDashboardInteger(
                    summary.kpis.followUpCompliance.overdueCount,
                  )}
                </p>
              </div>
            </div>
          )}
        </ContentSection>
      </ContentGrid>

      <ContentGrid variant="two">
        <ContentDataSurface
          title="Lead-source analytics"
          description="Acquisition mix inside the fixed Vehicle Enquiries cohort. Use the centralized filters to isolate source, geography, dealer, state, and free-text search."
          actions={
            <Badge variant="outline">
              <BarChart3 aria-hidden="true" />
              Source share
            </Badge>
          }
          contentClassName="p-[var(--card-spacing)]"
        >
          {data.sourceSeries.status === "ready" ? (
            <SourceMix series={data.sourceSeries.data} />
          ) : (
            sectionStatus("Lead-source analytics", data.sourceSeries)
          )}
        </ContentDataSurface>

        <ContentDataSurface
          title="Incident intelligence"
          description="Severity and age of the current deterministic support issue page. Remediation remains backend-authorized, idempotent, and audited."
          actions={
            access.capabilities.canReadIssues ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={supportHref} prefetch={false}>
                  Full support queue
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : undefined
          }
          contentClassName="p-[var(--card-spacing)]"
        >
          {summary !== null && data.issues.status === "ready" ? (
            <IncidentSummary summary={summary} issues={data.issues.data} />
          ) : data.issues.status === "ready" ? (
            sectionStatus("Summary", data.summary)
          ) : (
            sectionStatus("Incident intelligence", data.issues)
          )}
        </ContentDataSurface>
      </ContentGrid>

      <ContentDataSurface
        title="Needs attention"
        description="Prioritized Vehicle Enquiries incidents with same-screen audited actions. Lead-specific incidents can open the existing Lead 360 journey without leaving the command center."
        actions={
          data.issues.status === "ready" ? (
            <Badge variant="secondary">
              {formatDashboardInteger(data.issues.data.items.length)} visible
            </Badge>
          ) : undefined
        }
        contentClassName="p-[var(--card-spacing)]"
      >
        {data.issues.status === "ready" ? (
          <VehicleEnquiriesIncidentQueue
            result={data.issues.data}
            capabilities={access.capabilities}
          />
        ) : (
          sectionStatus("Incident queue", data.issues)
        )}
      </ContentDataSurface>

      <ContentDataSurface
        title="Lead monitor and Lead 360"
        description="Search and filter Vehicle Enquiries leads, then open the existing journey, timeline, assignment, location, communication, and privileged lead controls exposed by the current backend contract."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              <Search aria-hidden="true" />
              Search uses dashboard q
            </Badge>
            {data.leads.status === "ready" ? (
              <Badge variant="secondary">
                {formatDashboardInteger(data.leads.data.items.length)} visible
              </Badge>
            ) : null}
          </div>
        }
        contentClassName="p-[var(--card-spacing)]"
      >
        {data.leads.status === "ready" ? (
          <VehicleEnquiriesLeadMonitor
            result={data.leads.data}
            capabilities={access.capabilities}
          />
        ) : (
          sectionStatus("Lead monitor", data.leads)
        )}
      </ContentDataSurface>

      <ContentGrid variant="two">
        <ContentDataSurface
          title="Dealer health watch"
          description="Backend dealer-health classification, current open load, and visible issue concentration for Vehicle Enquiries."
          actions={
            access.capabilities.canReadDealerPerformance ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={dealersHref} prefetch={false}>
                  Dealer workspace
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : undefined
          }
          contentClassName="p-[var(--card-spacing)]"
        >
          {data.dealers.status === "ready" ? (
            <DealerRisk result={data.dealers.data} />
          ) : (
            sectionStatus("Dealer health", data.dealers)
          )}
        </ContentDataSurface>

        <ContentDataSurface
          title="Coverage risk watch"
          description="District-level assignment coverage, active dealer availability, distance, concentration, and unassigned risk."
          actions={
            access.capabilities.canReadDealerPerformance ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={coverageHref} prefetch={false}>
                  Coverage workspace
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : undefined
          }
          contentClassName="p-[var(--card-spacing)]"
        >
          {data.coverage.status === "ready" ? (
            <CoverageRisk result={data.coverage.data} />
          ) : (
            sectionStatus("Coverage risk", data.coverage)
          )}
        </ContentDataSurface>
      </ContentGrid>

      <ContentSection
        title="Operational telemetry boundary"
        description="This frontend intentionally does not infer data that the current engagement dashboard API does not expose."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2
                aria-hidden="true"
                className="size-5 text-success"
              />
              <p className="text-body-sm font-medium">Available now</p>
            </div>
            <p className="mt-2 text-body-sm text-muted-readable">
              Lead cohort, assignment, dealer response SLA, follow-up, booking
              and conversion, deterministic support issues, Lead 360, dealer
              health, and district coverage.
            </p>
          </div>
          <Separator orientation="vertical" className="hidden h-16 lg:block" />
          <div>
            <div className="flex items-center gap-2">
              <Clock3 aria-hidden="true" className="size-5 text-info" />
              <p className="text-body-sm font-medium">
                Requires backend read-model expansion
              </p>
            </div>
            <p className="mt-2 text-body-sm text-muted-readable">
              IVR/webhook ingestion stage health, process-run diagnostics,
              location resolver evidence/recovery analytics, task/provider
              latency, and cross-lead incident correlation. No synthetic values
              are shown for these stages.
            </p>
          </div>
        </div>
      </ContentSection>
    </EngagementWorkspaceShell>
  );
}

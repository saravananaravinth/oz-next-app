// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-dashboard-page.tsx
import type * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CircleHelp,
  Clock3,
  Filter,
  MessageSquareWarning,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldAlert,
  Target,
  UserCheck,
  UsersRound,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentEmptyState,
  ContentGrid,
  ContentHeader,
  ContentMetricCard,
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TenantMembership } from "@/lib/api/contracts";

import type {
  EngagementCoverageResult,
  EngagementDashboardSearchParams,
  EngagementDashboardSummary,
  EngagementFunnel,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type {
  EngagementDashboardAccess,
  ResolvedEngagementDashboardAccess,
} from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import type {
  EngagementDashboardSectionResult,
  EngagementDashboardWorkspaceData,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.types";
import { DealerPerformanceTable } from "@/features/engagement/operations-dashboard/ui/dealer-performance-table";
import { EngagementDashboardFilters } from "@/features/engagement/operations-dashboard/ui/engagement-dashboard-filters";
import { EngagementIssueQueue } from "@/features/engagement/operations-dashboard/ui/issue-queue";
import { LeadSourceChart } from "@/features/engagement/operations-dashboard/ui/lead-source-chart";
import { VideoSequenceConfiguration } from "@/features/engagement/operations-dashboard/ui/video-sequence-configuration";
import {
  formatDashboardDate,
  formatDashboardDateTime,
  formatDashboardDuration,
  formatDashboardInteger,
  formatDashboardPercentage,
  formatDashboardSignedPercent,
  formatDashboardSignedPoints,
  titleCaseDashboardToken,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import {
  engagementDashboardHref,
  engagementDashboardResetHref,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type EngagementDashboardPageProps = Readonly<{
  access: ResolvedEngagementDashboardAccess;
  query: EngagementDashboardSearchParams;
  data: EngagementDashboardWorkspaceData;
  tenants: readonly TenantMembership[];
}>;

type SemanticDirection = "positive" | "negative" | "neutral";

type KpiComparison = Readonly<{
  current: number;
  previous: number | null;
  kind: "count" | "percentage";
  higherIsBetter: boolean;
}>;

function activeFilterCount(query: EngagementDashboardSearchParams): number {
  return [
    query.leadSourceIds,
    query.ivrFlowCodes,
    query.leadTypes,
    query.statuses,
    query.dealerOrgUnitIds,
    query.districts,
    query.cities,
    query.assignmentStates,
    query.conversionStates,
    query.followUpStates,
    query.issueSeverities,
  ].reduce(
    (total, values) => total + values.length,
    query.q === undefined ? 0 : 1,
  );
}

function comparisonChange(input: KpiComparison): Readonly<{
  label: string;
  direction: SemanticDirection;
}> {
  if (input.previous === null)
    return { label: "Comparison unavailable", direction: "neutral" };
  const delta = input.current - input.previous;
  if (delta === 0) return { label: "No change", direction: "neutral" };
  const direction: SemanticDirection =
    (delta > 0 && input.higherIsBetter) || (delta < 0 && !input.higherIsBetter)
      ? "positive"
      : "negative";
  if (input.kind === "percentage") {
    return {
      label: `${formatDashboardSignedPoints(delta)} vs previous`,
      direction,
    };
  }
  const pct = input.previous === 0 ? null : (delta / input.previous) * 100;
  return {
    label: `${formatDashboardSignedPercent(pct)} vs previous`,
    direction,
  };
}

function Trend({
  comparison,
}: Readonly<{ comparison: ReturnType<typeof comparisonChange> }>) {
  const Icon =
    comparison.direction === "positive"
      ? ArrowUpRight
      : comparison.direction === "negative"
        ? ArrowDownRight
        : ArrowRight;
  return (
    <span
      className={
        comparison.direction === "negative"
          ? "inline-flex items-center gap-1 text-destructive"
          : comparison.direction === "positive"
            ? "inline-flex items-center gap-1 text-foreground"
            : "inline-flex items-center gap-1 text-muted-readable"
      }
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {comparison.label}
    </span>
  );
}

function FormulaTooltip({ text }: Readonly<{ text: string }>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex size-7 items-center justify-center rounded-full text-muted-readable"
          aria-label={text}
        >
          <CircleHelp aria-hidden="true" className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">{text}</TooltipContent>
    </Tooltip>
  );
}

function KpiCards({
  summary,
  previous,
  query,
}: Readonly<{
  summary: EngagementDashboardSummary;
  previous: EngagementDashboardSummary | null;
  query: EngagementDashboardSearchParams;
}>) {
  const current = summary.kpis;
  const prior = previous?.kpis ?? null;
  const cards = [
    {
      key: "new-leads",
      label: "New Leads",
      value: formatDashboardInteger(current.newLeads.value),
      description: `${formatDashboardInteger(current.newLeads.value)} distinct leads · count metric (no denominator) · ${current.newLeads.averagePerDay.toFixed(1)} average/day`,
      icon: <UsersRound aria-hidden="true" className="size-5" />,
      tooltip:
        "Distinct leads created in the selected period. Average per day uses the inclusive selected date range.",
      comparison: comparisonChange({
        current: current.newLeads.value,
        previous: prior?.newLeads.value ?? null,
        kind: "count",
        higherIsBetter: true,
      }),
      href: engagementDashboardHref(
        query,
        { dealerCursor: null, issueCursor: null },
        "dealers",
      ),
    },
    {
      key: "assignment",
      label: "Assignment Health",
      value: formatDashboardPercentage(current.assignmentHealth.ratePct),
      description: `${formatDashboardInteger(current.assignmentHealth.assignedCount)} assigned / ${formatDashboardInteger(current.assignmentHealth.assignableCount)} assignable · ${formatDashboardInteger(current.assignmentHealth.unassignedCount)} unassigned · median ${formatDashboardDuration(current.assignmentHealth.medianAssignmentMinutes)}`,
      icon: <UserCheck aria-hidden="true" className="size-5" />,
      tooltip:
        "Assigned leads divided by assignable leads. Median assignment duration is reported separately.",
      comparison: comparisonChange({
        current: current.assignmentHealth.ratePct,
        previous: prior?.assignmentHealth.ratePct ?? null,
        kind: "percentage",
        higherIsBetter: true,
      }),
      href: engagementDashboardHref(
        query,
        { assignmentStates: ["UNASSIGNED"], issueCursor: null },
        "issues",
      ),
    },
    {
      key: "response-sla",
      label: "Dealer Response SLA",
      value: formatDashboardPercentage(current.dealerResponseSla.ratePct),
      description: `${formatDashboardInteger(current.dealerResponseSla.respondedCount)} within SLA / ${formatDashboardInteger(current.dealerResponseSla.eligibleCount)} eligible · ${formatDashboardInteger(current.dealerResponseSla.breachedCount)} breached · median ${formatDashboardDuration(current.dealerResponseSla.medianResponseMinutes)}`,
      icon: <Clock3 aria-hidden="true" className="size-5" />,
      tooltip:
        "Eligible leads receiving their first valid dealer response within the configured SLA divided by response-eligible leads.",
      comparison: comparisonChange({
        current: current.dealerResponseSla.ratePct,
        previous: prior?.dealerResponseSla.ratePct ?? null,
        kind: "percentage",
        higherIsBetter: true,
      }),
      href: engagementDashboardHref(
        query,
        { issueSeverities: [], issueCursor: null },
        "issues",
      ),
    },
    {
      key: "follow-up",
      label: "Follow-up Compliance",
      value: formatDashboardPercentage(current.followUpCompliance.ratePct),
      description: `${formatDashboardInteger(current.followUpCompliance.completedOnTimeCount)} on time / ${formatDashboardInteger(current.followUpCompliance.dueCount)} due · ${formatDashboardInteger(current.followUpCompliance.overdueCount)} overdue`,
      icon: <CalendarClock aria-hidden="true" className="size-5" />,
      tooltip:
        "Follow-ups completed on or before their scheduled time divided by follow-ups due in the selected scope.",
      comparison: comparisonChange({
        current: current.followUpCompliance.ratePct,
        previous: prior?.followUpCompliance.ratePct ?? null,
        kind: "percentage",
        higherIsBetter: true,
      }),
      href: engagementDashboardHref(
        query,
        { followUpStates: ["OVERDUE"], issueCursor: null },
        "issues",
      ),
    },
    {
      key: "conversion",
      label: "Cohort Conversion",
      value: formatDashboardPercentage(current.conversion.ratePct),
      description: `${formatDashboardInteger(current.conversion.convertedCount)} converted / ${formatDashboardInteger(current.conversion.eligibleCount)} eligible · ${formatDashboardInteger(current.conversion.bookingCount)} booked · ${formatDashboardInteger(current.conversion.completedInPeriodCount)} conversions completed in period`,
      icon: <Target aria-hidden="true" className="size-5" />,
      tooltip:
        "Cohort conversion uses eligible assigned leads from the selected cohort. Conversions completed in period is an activity metric and is shown separately.",
      comparison: comparisonChange({
        current: current.conversion.ratePct,
        previous: prior?.conversion.ratePct ?? null,
        kind: "percentage",
        higherIsBetter: true,
      }),
      href: engagementDashboardHref(
        query,
        { conversionStates: ["CONVERTED"], dealerCursor: null },
        "dealers",
      ),
    },
    {
      key: "attention",
      label: "Needs Attention",
      value: formatDashboardInteger(current.needsAttention.totalCount),
      description: `${formatDashboardInteger(current.needsAttention.totalCount)} unresolved · ${formatDashboardInteger(current.needsAttention.criticalCount)} critical · ${formatDashboardInteger(current.needsAttention.highCount)} high · ${formatDashboardInteger(current.needsAttention.mediumCount)} medium`,
      icon: <MessageSquareWarning aria-hidden="true" className="size-5" />,
      tooltip:
        "Distinct unresolved operational issues in the selected scope, grouped by backend severity.",
      comparison: comparisonChange({
        current: current.needsAttention.totalCount,
        previous: prior?.needsAttention.totalCount ?? null,
        kind: "count",
        higherIsBetter: false,
      }),
      href: engagementDashboardHref(query, { issueCursor: null }, "issues"),
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.href}
          className="group min-w-0"
          scroll={false}
        >
          <ContentMetricCard
            label={
              <span className="flex items-center justify-between gap-2">
                <span>{card.label}</span>
                <FormulaTooltip text={card.tooltip} />
              </span>
            }
            value={card.value}
            description={card.description}
            icon={card.icon}
            trend={<Trend comparison={card.comparison} />}
            className="h-full transition-transform group-hover:-translate-y-0.5 motion-reduce:transition-none"
          />
        </Link>
      ))}
    </div>
  );
}

function SectionFailure({ title }: Readonly<{ title: string }>) {
  return (
    <ContentStatus
      variant="destructive"
      icon={<AlertTriangle aria-hidden="true" />}
      title={`${title} unavailable`}
      description="This section failed independently. Other dashboard sections remain usable. Refresh or narrow the filter scope before retrying."
    />
  );
}

function SectionForbidden({ title }: Readonly<{ title: string }>) {
  return (
    <ContentStatus
      variant="default"
      icon={<BadgeCheck aria-hidden="true" />}
      title={`${title} restricted`}
      description="The active actor context does not include the permission required for this section."
    />
  );
}

function sectionContent<TData>(
  result: EngagementDashboardSectionResult<TData>,
  title: string,
  render: (data: TData) => React.ReactNode,
): React.ReactNode {
  if (result.status === "ready") return render(result.data);
  if (result.status === "forbidden") return <SectionForbidden title={title} />;
  return <SectionFailure title={title} />;
}

function EngagementFunnelView({
  funnel,
  query,
}: Readonly<{
  funnel: EngagementFunnel;
  query: EngagementDashboardSearchParams;
}>) {
  const max = Math.max(...funnel.stages.map((stage) => stage.count), 1);
  return (
    <div className="grid gap-3">
      {funnel.stages.map((stage, index) => (
        <Link
          key={stage.code}
          href={engagementDashboardHref(
            query,
            { statuses: [stage.code], dealerCursor: null, issueCursor: null },
            "dealers",
          )}
          className="grid gap-2 rounded-2xl border p-3 transition-colors hover:bg-muted/40 motion-reduce:transition-none"
          scroll={false}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  index === funnel.stages.length - 1 ? "secondary" : "outline"
                }
              >
                {index + 1}
              </Badge>
              <span className="font-medium">{stage.name}</span>
            </div>
            <span className="text-section-title text-tabular">
              {formatDashboardInteger(stage.count)}
            </span>
          </div>
          <Progress
            value={(stage.count / max) * 100}
            aria-label={`${stage.name} funnel volume`}
          />
          <div className="flex flex-wrap justify-between gap-2 text-caption text-muted-readable">
            <span>
              Drop-off{" "}
              {stage.dropOffPct === null
                ? "—"
                : formatDashboardPercentage(stage.dropOffPct)}
            </span>
            <span>
              Median from prior{" "}
              {formatDashboardDuration(stage.medianMinutesFromPrevious)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function OperationsHealth({
  summary,
}: Readonly<{ summary: EngagementDashboardSummary }>) {
  const items = [
    ["Unassigned leads", summary.kpis.assignmentHealth.unassignedCount],
    ["Dealer response breaches", summary.kpis.dealerResponseSla.breachedCount],
    ["Overdue follow-ups", summary.kpis.followUpCompliance.overdueCount],
    ["Critical issues", summary.kpis.needsAttention.criticalCount],
    ["High issues", summary.kpis.needsAttention.highCount],
    ["Medium issues", summary.kpis.needsAttention.mediumCount],
  ] as const;
  return (
    <div className="grid gap-2">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
        >
          <span className="text-body-sm text-muted-readable">{label}</span>
          <Badge variant={value > 0 ? "destructive" : "secondary"}>
            {formatDashboardInteger(value)}
          </Badge>
        </div>
      ))}
      <p className="text-caption text-muted-readable">
        Values come from dashboard operational records. Redis health is not used
        as the source of truth.
      </p>
    </div>
  );
}

function FollowUpWorkload({
  summary,
  query,
}: Readonly<{
  summary: EngagementDashboardSummary;
  query: EngagementDashboardSearchParams;
}>) {
  const due = summary.kpis.followUpCompliance.dueCount;
  const overdue = summary.kpis.followUpCompliance.overdueCount;
  const onTime = summary.kpis.followUpCompliance.completedOnTimeCount;
  return (
    <div className="grid gap-3">
      <Link
        href={engagementDashboardHref(
          query,
          { followUpStates: ["OVERDUE"], issueCursor: null },
          "issues",
        )}
        className="rounded-2xl border p-4 hover:bg-muted/40"
        scroll={false}
      >
        <p className="text-caption text-muted-readable">Overdue</p>
        <p className="mt-1 text-section-title text-tabular">
          {formatDashboardInteger(overdue)}
        </p>
      </Link>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border p-4">
          <p className="text-caption text-muted-readable">Due in period</p>
          <p className="mt-1 text-card-title text-tabular">
            {formatDashboardInteger(due)}
          </p>
        </div>
        <div className="rounded-2xl border p-4">
          <p className="text-caption text-muted-readable">Completed on time</p>
          <p className="mt-1 text-card-title text-tabular">
            {formatDashboardInteger(onTime)}
          </p>
        </div>
      </div>
      <p className="text-caption text-muted-readable">
        Due-today, due-tomorrow, and scheduled-later splits require a dedicated
        workload aggregate endpoint; the strict current contract exposes them as
        filters, not counts.
      </p>
    </div>
  );
}

function CoverageTable({
  coverage,
  query,
}: Readonly<{
  coverage: EngagementCoverageResult;
  query: EngagementDashboardSearchParams;
}>) {
  if (coverage.items.length === 0) {
    return (
      <ContentEmptyState
        title="No district demand data"
        description="No coverage rows match this dashboard view."
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>District</TableHead>
            <TableHead>Leads</TableHead>
            <TableHead>Active dealers</TableHead>
            <TableHead>Unassigned</TableHead>
            <TableHead>Median distance</TableHead>
            <TableHead>Conversion</TableHead>
            <TableHead>Coverage state</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coverage.items.map((item) => (
            <TableRow key={item.district}>
              <TableCell>
                <Link
                  href={engagementDashboardHref(query, {
                    districts: [item.district],
                    dealerCursor: null,
                    issueCursor: null,
                  })}
                  className="font-medium underline-offset-4 hover:underline"
                  scroll={false}
                >
                  {item.district}
                </Link>
              </TableCell>
              <TableCell className="text-tabular">
                {formatDashboardInteger(item.leadCount)}
              </TableCell>
              <TableCell className="text-tabular">
                {formatDashboardInteger(item.activeDealerCount)}
              </TableCell>
              <TableCell className="text-tabular">
                {formatDashboardInteger(item.unassignedLeadCount)}
              </TableCell>
              <TableCell className="text-tabular">
                {item.medianAssignmentDistanceKm === null
                  ? "—"
                  : `${item.medianAssignmentDistanceKm.toFixed(1)} km`}
              </TableCell>
              <TableCell className="text-tabular">
                {formatDashboardPercentage(item.conversionRatePct)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={item.risk === "NONE" ? "secondary" : "destructive"}
                >
                  {titleCaseDashboardToken(item.risk)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function EngagementDashboardPage({
  access,
  query,
  data,
  tenants,
}: EngagementDashboardPageProps): React.ReactElement {
  const filters = activeFilterCount(query);
  const summary = data.summary.status === "ready" ? data.summary.data : null;
  const comparisonSummary =
    data.comparisonSummary?.status === "ready"
      ? data.comparisonSummary.data
      : null;
  const generatedAt =
    summary?.generatedAt ??
    (data.sourceSeries.status === "ready"
      ? data.sourceSeries.data.generatedAt
      : null);

  return (
    <ContentRoot width="full" density="compact">
      <ContentHeader
        eyebrow="Engagement operations"
        title="Engagement Dashboard"
        description="Lead intake, assignment, dealer response, follow-up, conversion, support intervention, and dealer coverage in one actor-scoped operational workspace."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={engagementDashboardHref(query)}>
                <RefreshCw aria-hidden="true" className="size-4" /> Refresh
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href={engagementDashboardResetHref(query)}>
                <RotateCcw aria-hidden="true" className="size-4" /> Reset
                filters
              </Link>
            </Button>
          </div>
        }
        meta={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              <CalendarClock aria-hidden="true" className="size-3" />
              {formatDashboardDate(query.from)} –{" "}
              {formatDashboardDate(query.to)}
            </Badge>
            <Badge variant="outline">
              Comparison:{" "}
              {query.comparison === "NONE" ? "Off" : "Previous period"}
            </Badge>
            <Badge variant="outline">Asia/Kolkata</Badge>
            <Badge variant="outline">
              <Filter aria-hidden="true" className="size-3" />
              {filters} active filters
            </Badge>
            <Badge variant="outline">
              Refreshed {formatDashboardDateTime(generatedAt)}
            </Badge>
          </div>
        }
        variant="compact"
      />

      <EngagementDashboardFilters
        query={query}
        options={
          data.filterOptions.status === "ready" ? data.filterOptions.data : null
        }
        tenants={tenants}
        showTenantSelector={access.actorKind === "SUPER_ADMIN"}
      />

      <nav
        aria-label="Engagement dashboard sections"
        className="flex flex-wrap gap-2 rounded-2xl border bg-card p-2"
      >
        <Button variant="ghost" size="sm" asChild>
          <a href="#overview">Overview</a>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href="#dealers">Dealers</a>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href="#issues">Issues</a>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href="#configuration">
            <Settings2 aria-hidden="true" className="size-4" />
            Configuration
          </a>
        </Button>
      </nav>

      <div id="overview" className="scroll-mt-36" aria-hidden="true" />

      {summary === null ? (
        data.summary.status === "forbidden" ? (
          <SectionForbidden title="Dashboard summary" />
        ) : (
          <SectionFailure title="Dashboard summary" />
        )
      ) : (
        <KpiCards
          summary={summary}
          previous={comparisonSummary}
          query={query}
        />
      )}

      <ContentGrid variant="main-aside">
        <ContentDataSurface
          title="Daily Lead Intake"
          description="See how lead volume and source mix change over time. Range-aware grain, zero-filled periods, and top-six source grouping are returned by the API."
          contentClassName="p-4 sm:p-5"
        >
          {sectionContent(data.sourceSeries, "Lead-source series", (series) => (
            <LeadSourceChart series={series} query={query} />
          ))}
        </ContentDataSurface>

        <ContentSection
          title="Engagement Funnel"
          description="New → Assigned → Contacted → Booked → Converted"
          contentClassName="grid gap-3"
        >
          {sectionContent(data.funnel, "Engagement funnel", (funnel) => (
            <EngagementFunnelView funnel={funnel} query={query} />
          ))}
        </ContentSection>
      </ContentGrid>

      {summary !== null ? (
        <ContentGrid variant="three">
          <ContentSection
            title="Operations Health"
            description="Compact operational exceptions from dashboard records."
          >
            <OperationsHealth summary={summary} />
          </ContentSection>
          <ContentSection
            title="Follow-up Workload"
            description="Current due and overdue workload."
          >
            <FollowUpWorkload summary={summary} query={query} />
          </ContentSection>
          <ContentSection
            title="Metric Semantics"
            description="Cohort and activity measures remain distinct."
          >
            <div className="grid gap-3 text-body-sm">
              <div className="rounded-2xl border p-3">
                <p className="font-medium">Cohort conversion</p>
                <p className="mt-1 text-muted-readable">
                  Eligible assigned leads in the selected cohort that eventually
                  converted.
                </p>
              </div>
              <div className="rounded-2xl border p-3">
                <p className="font-medium">Conversions completed</p>
                <p className="mt-1 text-muted-readable">
                  Conversion events completed during the selected period,
                  regardless of cohort creation date.
                </p>
              </div>
            </div>
          </ContentSection>
        </ContentGrid>
      ) : null}

      <ContentDataSurface
        id="dealers"
        title="Dealer Performance Overview"
        description="Explainable health states, readiness, SLA, follow-up, conversion, backlog, and keyset pagination."
        contentClassName="p-4 sm:p-5"
      >
        {sectionContent(data.dealers, "Dealer performance", (dealers) => (
          <DealerPerformanceTable
            result={dealers}
            query={query}
            capabilities={access.capabilities}
          />
        ))}
      </ContentDataSurface>

      <ContentDataSurface
        id="issues"
        title="Issue and Support Workbench"
        description="Human-readable operational issues with masked customer contact, audited interventions, idempotency, and severity-aware keyset pagination."
        contentClassName="p-4 sm:p-5"
      >
        {sectionContent(data.issues, "Issue queue", (issues) => (
          <EngagementIssueQueue
            result={issues}
            query={query}
            capabilities={access.capabilities}
          />
        ))}
      </ContentDataSurface>

      <ContentDataSurface
        title="Demand versus Dealer Coverage"
        description="District demand, active dealer supply, unassigned demand, assignment distance, conversion, and explicit coverage risks."
        contentClassName="p-4 sm:p-5"
      >
        {sectionContent(data.coverage, "Coverage analysis", (coverage) => (
          <CoverageTable coverage={coverage} query={query} />
        ))}
      </ContentDataSurface>

      <ContentDataSurface
        id="configuration"
        title="Configuration"
        description="Tenant-level engagement configuration. Video sequences are not dealer-owned and remain isolated from dealer settings."
        contentClassName="p-4 sm:p-5"
      >
        {sectionContent(
          data.videoSequences,
          "Video sequence configuration",
          (videoSequences) => (
            <VideoSequenceConfiguration
              data={videoSequences}
              tenantId={
                access.actorKind === "SUPER_ADMIN" ? access.tenantId : undefined
              }
              canUpdate={access.capabilities.canUpdateVideoSequences}
            />
          ),
        )}
      </ContentDataSurface>

      <ContentStatus
        variant="default"
        icon={<Activity aria-hidden="true" />}
        title="Contract-bound dashboard"
        description="Every widget uses a strict, independent API contract. Unsupported source-quality aggregates, unrestricted provider diagnostics, and undeclared mutation actions are intentionally not inferred by the frontend."
      />
    </ContentRoot>
  );
}

export function EngagementDashboardAccessState({
  access,
  tenants,
}: Readonly<{
  access: Exclude<EngagementDashboardAccess, ResolvedEngagementDashboardAccess>;
  tenants: readonly TenantMembership[];
}>): React.ReactElement {
  if (access.kind === "context_required") {
    return (
      <ContentRoot width="default">
        <ContentHeader
          title="Select an organization context"
          description="Super administrator dashboard access requires an explicit tenant context before any dashboard request is made."
          variant="compact"
        />
        <ContentSection
          title="Tenant context"
          description="The selected tenant is sent only as an authorized server-side actor header."
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.map((tenant) => (
              <Button
                key={tenant.tenant_id}
                variant="outline"
                asChild
                className="h-auto justify-start p-4 text-left"
              >
                <Link
                  href={`/engagement/dashboard?tenantId=${encodeURIComponent(tenant.tenant_id)}`}
                >
                  <Building2 aria-hidden="true" className="size-5" />
                  <span className="grid">
                    <span className="font-medium">{tenant.tenant_name}</span>
                    <span className="text-caption text-muted-readable">
                      {tenant.tenant_id}
                    </span>
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        </ContentSection>
      </ContentRoot>
    );
  }

  return (
    <ContentRoot width="default">
      <ContentStatus
        variant="destructive"
        icon={<ShieldAlert aria-hidden="true" />}
        title="Engagement dashboard access denied"
        description={access.reason}
      />
    </ContentRoot>
  );
}

export function EngagementDashboardInvalidQueryState({
  issues,
}: Readonly<{ issues: readonly string[] }>): React.ReactElement {
  return (
    <ContentRoot width="default">
      <ContentStatus
        variant="destructive"
        icon={<AlertTriangle aria-hidden="true" />}
        title="Invalid engagement dashboard view"
        description="The URL contains unknown or invalid dashboard parameters. The request was rejected before calling the API."
      />
      <ContentSection title="Validation details">
        <ul className="list-disc space-y-1 pl-5 text-body-sm text-muted-readable">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
        <Button asChild className="mt-4">
          <Link href="/engagement/dashboard">Open default dashboard</Link>
        </Button>
      </ContentSection>
    </ContentRoot>
  );
}

export function EngagementDashboardLoadingState(): React.ReactElement {
  return (
    <ContentRoot width="full" density="compact" aria-busy="true">
      <ContentHeader
        title="Engagement Dashboard"
        description="Loading actor-scoped engagement operations…"
        variant="compact"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-3xl border bg-muted/40 motion-reduce:animate-none"
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-3xl border bg-muted/40 motion-reduce:animate-none" />
      <div className="h-96 animate-pulse rounded-3xl border bg-muted/40 motion-reduce:animate-none" />
    </ContentRoot>
  );
}

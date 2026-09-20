// oz-next-app/src/features/engagement/operations-dashboard/ui/journey-overview.tsx
import type * as React from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  DatabaseZap,
  GitBranch,
  Info,
  MessageCircleReply,
  Route,
  Timer,
  UserRoundX,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentGrid,
  ContentHeader,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type {
  EngagementJourneyAnalyticsSnapshot,
  EngagementJourneyFunnel,
  EngagementJourneyOutcomes,
} from "@/features/engagement/operations-dashboard/contracts/journey-analytics.schema";
import {
  EngagementMetricGrid,
  type EngagementMetric,
} from "@/features/engagement/operations-dashboard/ui/engagement-metric-grid";
import {
  formatDashboardDate,
  formatDashboardDateTime,
  formatDashboardDuration,
  formatDashboardInteger,
  formatDashboardPercentage,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";

export type JourneyOverviewProps = Readonly<{
  snapshot: EngagementJourneyAnalyticsSnapshot;
}>;

function percentage(value: number | null): string {
  return value === null ? "Not available" : formatDashboardPercentage(value);
}

function outcome(
  outcomes: EngagementJourneyOutcomes,
  code: EngagementJourneyOutcomes["items"][number]["code"],
): EngagementJourneyOutcomes["items"][number] {
  const item = outcomes.items.find((candidate) => candidate.code === code);
  if (item === undefined) {
    throw new Error(`Journey outcome is missing: ${code}`);
  }
  return item;
}

function journeyMetrics(
  snapshot: EngagementJourneyAnalyticsSnapshot,
): readonly EngagementMetric[] {
  const summary = snapshot.summary;
  const diagnostics = summary.diagnostics;
  const noResponse = outcome(snapshot.outcomes, "NO_RESPONSE");
  const noDealer = outcome(snapshot.outcomes, "NO_DEALER");

  return [
    {
      id: "process-runs",
      label: "Process runs",
      value: formatDashboardInteger(snapshot.totalRuns),
      description: `${formatDashboardInteger(summary.maturedRuns)} matured · ${formatDashboardInteger(diagnostics.currentRuns)} current`,
      help: "Distinct Vehicle Enquiries process runs started inside the selected cohort. Reminder fan-out does not increase this count.",
      icon: <Route aria-hidden="true" className="size-5" />,
      tone: "info",
    },
    {
      id: "eligible",
      label: "Eligible journeys",
      value: formatDashboardInteger(summary.conversionEligibleRuns),
      description: `${formatDashboardInteger(diagnostics.maturedExcludedRuns)} matured runs excluded from the conversion denominator`,
      help: "Matured, complete, non-superseded terminal journeys. Incomplete and ambiguous historical runs are excluded rather than treated as failures.",
      icon: <GitBranch aria-hidden="true" className="size-5" />,
      tone: diagnostics.maturedExcludedRuns > 0 ? "warning" : "success",
    },
    {
      id: "completion",
      label: "Journey completion",
      value: percentage(summary.completionRatePct),
      description: `${formatDashboardInteger(summary.completedRuns)} completed of ${formatDashboardInteger(summary.conversionEligibleRuns)} eligible journeys`,
      help: "Completed journeys divided by the authoritative matured conversion denominator.",
      icon: <CheckCircle2 aria-hidden="true" className="size-5" />,
      tone:
        summary.completionRatePct !== null && summary.completionRatePct >= 80
          ? "success"
          : "warning",
    },
    {
      id: "no-response",
      label: "No response",
      value: percentage(noResponse.ratePct),
      description: `${formatDashboardInteger(noResponse.count)} terminal no-response journeys`,
      help: "Matured eligible journeys that reached the authoritative no-response terminal outcome.",
      icon: <UserRoundX aria-hidden="true" className="size-5" />,
      tone: noResponse.count > 0 ? "warning" : "success",
    },
    {
      id: "no-dealer",
      label: "No eligible dealer",
      value: percentage(noDealer.ratePct),
      description: `${formatDashboardInteger(noDealer.count)} terminal no-dealer journeys`,
      help: "Matured eligible journeys where the authoritative assignment flow could not select an eligible dealer.",
      icon: <Building2 aria-hidden="true" className="size-5" />,
      tone: noDealer.count > 0 ? "warning" : "success",
    },
    {
      id: "projection-coverage",
      label: "Projection coverage",
      value: percentage(diagnostics.projectionCoveragePct),
      description: `${formatDashboardInteger(diagnostics.projectionMissingRuns)} missing · ${formatDashboardInteger(diagnostics.incompleteRuns)} incomplete`,
      help: "Share of process runs with a Phase-4 journey projection. Missing or incomplete projection evidence stays diagnostic and does not become a synthetic business outcome.",
      icon: <DatabaseZap aria-hidden="true" className="size-5" />,
      tone:
        diagnostics.projectionMissingRuns === 0 &&
        diagnostics.incompleteRuns === 0
          ? "success"
          : "warning",
    },
  ];
}

function StageHelp({ text }: Readonly<{ text: string }>): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-readable"
          tabIndex={0}
        >
          <Info aria-hidden="true" className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">{text}</TooltipContent>
    </Tooltip>
  );
}

function JourneyFunnel({
  funnel,
}: Readonly<{ funnel: EngagementJourneyFunnel }>): React.ReactElement {
  const stageHelp = {
    STARTED:
      "A distinct Vehicle Enquiries process run entered the causal journey.",
    LOCATION_REQUESTED:
      "The run required customer location evidence or used preserved location state.",
    LOCATION_REQUEST_SENT:
      "The location request communication reached the authoritative outbound-message pipeline.",
    CUSTOMER_RESPONDED:
      "A customer response attributable to this process run was observed.",
    RESOLVER_DECIDED:
      "The location resolver produced a process-run-scoped decision. Native coordinate capture may bypass this stage.",
    LOCATION_RESOLVED:
      "Usable location evidence became available for dealer assignment. Re-engagement may preserve this state.",
    ASSIGNMENT_REQUESTED:
      "Dealer selection was requested for the same causal process run.",
    DEALER_ASSIGNED:
      "A current dealer assignment was persisted for the process run. Re-engagement may preserve an existing assignment.",
    CUSTOMER_NOTIFICATION_SENT:
      "The customer dealer-assignment notification was accepted by the outbound communication pipeline.",
    COMPLETED: "The journey reached its successful terminal outcome.",
  } as const satisfies Readonly<
    Record<EngagementJourneyFunnel["stages"][number]["code"], string>
  >;

  return (
    <div className="grid gap-2.5">
      {funnel.stages.map((stage, index) => {
        const progress = stage.conversionRatePct ?? 0;
        return (
          <div
            key={stage.code}
            className="grid gap-2 rounded-2xl border border-border/70 bg-card/45 p-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Badge variant="outline" className="size-6 rounded-full px-0">
                  {index + 1}
                </Badge>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-body-sm font-medium">
                      {stage.name}
                    </p>
                    <StageHelp text={stageHelp[stage.code]} />
                  </div>
                  <p className="text-caption text-muted-readable">
                    {formatDashboardInteger(stage.reachedCount)} reached ·{" "}
                    {formatDashboardInteger(stage.bypassedCount)} bypassed
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-section-title text-tabular">
                  {formatDashboardInteger(stage.progressedCount)}
                </p>
                <p className="text-caption text-muted-readable">
                  {percentage(stage.conversionRatePct)} of denominator
                </p>
              </div>
            </div>
            <Progress
              value={progress}
              aria-label={`${stage.name} ${progress.toFixed(1)} percent of the journey denominator`}
            />
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-caption text-muted-readable">
              <span>From prior: {percentage(stage.fromPreviousRatePct)}</span>
              <span>
                Median from start:{" "}
                {formatDashboardDuration(stage.medianMinutesFromStart)}
              </span>
              <span>
                P95: {formatDashboardDuration(stage.p95MinutesFromStart)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OutcomePanel({
  outcomes,
}: Readonly<{ outcomes: EngagementJourneyOutcomes }>): React.ReactElement {
  const styles = {
    COMPLETED: {
      variant: "success",
      icon: <CheckCircle2 aria-hidden="true" className="size-4" />,
    },
    NO_RESPONSE: {
      variant: "warning",
      icon: <MessageCircleReply aria-hidden="true" className="size-4" />,
    },
    NO_DEALER: {
      variant: "destructive",
      icon: <Building2 aria-hidden="true" className="size-4" />,
    },
  } as const satisfies Readonly<
    Record<
      EngagementJourneyOutcomes["items"][number]["code"],
      Readonly<{ variant: BadgeProps["variant"]; icon: React.ReactNode }>
    >
  >;

  return (
    <div className="grid gap-3">
      {outcomes.items.map((item) => (
        <div
          key={item.code}
          className="grid gap-2 rounded-2xl border border-border/70 p-3.5"
        >
          <div className="flex items-center justify-between gap-3">
            <Badge variant={styles[item.code].variant}>
              {styles[item.code].icon}
              {item.name}
            </Badge>
            <span className="text-section-title text-tabular">
              {formatDashboardInteger(item.count)}
            </span>
          </div>
          <Progress
            value={item.ratePct ?? 0}
            aria-label={`${item.name} ${percentage(item.ratePct)}`}
          />
          <div className="flex justify-between gap-3 text-caption text-muted-readable">
            <span>{percentage(item.ratePct)}</span>
            <span>
              Denominator {formatDashboardInteger(item.denominatorCount)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function LatencyPanel({
  snapshot,
}: Readonly<{
  snapshot: EngagementJourneyAnalyticsSnapshot;
}>): React.ReactElement {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {snapshot.latency.metrics.map((metric) => {
        const coverage =
          metric.applicableCount === 0
            ? null
            : (metric.sampleCount / metric.applicableCount) * 100;
        return (
          <div
            key={metric.code}
            className="grid content-start gap-3 rounded-2xl border border-border/70 bg-card/45 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-foreground">
                  {metric.name}
                </p>
                <p className="mt-1 text-caption text-muted-readable">
                  {formatDashboardInteger(metric.sampleCount)} observed of{" "}
                  {formatDashboardInteger(metric.applicableCount)} applicable
                </p>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-info/25 bg-info/10 text-info">
                <Timer aria-hidden="true" className="size-4" />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-muted/45 p-2.5">
                <p className="text-overline text-muted-readable">Median</p>
                <p className="mt-1 text-section-title text-tabular">
                  {formatDashboardDuration(metric.medianMinutes)}
                </p>
              </div>
              <div className="rounded-xl bg-muted/45 p-2.5">
                <p className="text-overline text-muted-readable">P95</p>
                <p className="mt-1 text-section-title text-tabular">
                  {formatDashboardDuration(metric.p95Minutes)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-caption text-muted-readable">
              <span>Sample coverage</span>
              <span className="text-tabular">{percentage(coverage)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectionDiagnostics({
  snapshot,
}: Readonly<{
  snapshot: EngagementJourneyAnalyticsSnapshot;
}>): React.ReactElement {
  const diagnostics = snapshot.summary.diagnostics;
  const hasQualityGap =
    diagnostics.projectionMissingRuns > 0 ||
    diagnostics.incompleteRuns > 0 ||
    diagnostics.unknownRuns > 0;

  return (
    <div className="grid gap-3">
      {hasQualityGap ? (
        <ContentStatus
          variant="warning"
          title="Journey evidence needs attention"
          description={`${formatDashboardInteger(diagnostics.projectionMissingRuns)} projection-missing, ${formatDashboardInteger(diagnostics.incompleteRuns)} incomplete, and ${formatDashboardInteger(diagnostics.unknownRuns)} unknown runs remain diagnostic and are excluded where evidence is insufficient.`}
        />
      ) : (
        <ContentStatus
          variant="success"
          title="Journey projection is complete for this cohort"
          description="No missing, incomplete, or unknown journey projections were reported in this snapshot."
        />
      )}

      <div className="grid grid-cols-2 gap-2 text-caption sm:grid-cols-3">
        {[
          { label: "Current", value: diagnostics.currentRuns },
          { label: "In progress", value: diagnostics.inProgressRuns },
          { label: "Superseded", value: diagnostics.supersededRuns },
          { label: "Matured excluded", value: diagnostics.maturedExcludedRuns },
          { label: "Incomplete", value: diagnostics.incompleteRuns },
          { label: "Unknown", value: diagnostics.unknownRuns },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border/70 p-3"
          >
            <p className="text-muted-readable">{item.label}</p>
            <p className="mt-1 text-section-title text-tabular text-foreground">
              {formatDashboardInteger(item.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function JourneyOverview({
  snapshot,
}: JourneyOverviewProps): React.ReactElement {
  return (
    <>
      <ContentHeader
        eyebrow="Vehicle Enquiries · process-run analytics"
        icon={<Activity aria-hidden="true" />}
        iconTone="info"
        title="Customer-to-dealer journey"
        description={`Authoritative journey analytics for process runs started ${formatDashboardDate(snapshot.cohort.from)}–${formatDashboardDate(snapshot.cohort.to)}. The ${String(snapshot.cohort.maturityHours)}h maturity horizon keeps current runs outside terminal conversion denominators.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{snapshot.contractVersion}</Badge>
            <Badge variant="outline">{snapshot.resolverVersion}</Badge>
            <Badge variant="outline">
              Snapshot {snapshot.snapshotId.slice(0, 12)}
            </Badge>
          </div>
        }
      />

      <EngagementMetricGrid metrics={journeyMetrics(snapshot)} columns={6} />

      <ContentGrid variant="main-aside" className="items-stretch">
        <ContentDataSurface
          title="Journey funnel"
          description={`Progression across ${formatDashboardInteger(snapshot.funnel.denominatorRuns)} matured, complete, non-superseded terminal journeys. Preserved and native-coordinate stages are represented as bypasses rather than fabricated events.`}
          className="h-full"
          contentClassName="px-[var(--card-spacing)] pb-[var(--card-spacing)]"
        >
          <JourneyFunnel funnel={snapshot.funnel} />
        </ContentDataSurface>

        <div className="grid content-start gap-4">
          <ContentDataSurface
            title="Terminal outcomes"
            description="Mutually exclusive outcomes inside the same authoritative denominator."
            contentClassName="px-[var(--card-spacing)] pb-[var(--card-spacing)]"
          >
            <OutcomePanel outcomes={snapshot.outcomes} />
          </ContentDataSurface>

          <ContentDataSurface
            title="Projection health"
            description="Data-quality diagnostics stay separate from business outcomes and conversion rates."
            contentClassName="px-[var(--card-spacing)] pb-[var(--card-spacing)]"
          >
            <ProjectionDiagnostics snapshot={snapshot} />
          </ContentDataSurface>
        </div>
      </ContentGrid>

      <ContentDataSurface
        title="Journey latency"
        description="Median and P95 elapsed time across the same snapshot. Missing observations remain null and are reported through sample coverage instead of becoming zero-duration events."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              <Clock3 aria-hidden="true" />
              Generated {formatDashboardDateTime(snapshot.generatedAt)}
            </Badge>
            <Badge variant="outline">
              <DatabaseZap aria-hidden="true" />
              {percentage(
                snapshot.summary.diagnostics.projectionCoveragePct,
              )}{" "}
              projected
            </Badge>
          </div>
        }
        contentClassName="px-[var(--card-spacing)] pb-[var(--card-spacing)]"
      >
        <LatencyPanel snapshot={snapshot} />
      </ContentDataSurface>

      {snapshot.summary.conversionEligibleRuns === 0 ? (
        <ContentStatus
          variant="info"
          icon={<CircleAlert aria-hidden="true" />}
          title="No matured terminal journeys in this cohort"
          description="Current or incomplete runs can still appear in diagnostics. Expand the date range or reduce the maturity horizon only if that matches the reporting question."
        />
      ) : null}
    </>
  );
}

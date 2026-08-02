// oz-next-app/src/features/engagement/dealership-application-operations/ui/dealership-application-dashboard-page.tsx
import type * as React from "react";
import {
  ContentDataSurface,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Progress } from "@/components/ui/progress";

import type {
  DealershipApplicationFunnel,
  DealershipApplicationSearchParams,
} from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";
import type {
  DealershipApplicationDashboardData,
  DealershipApplicationSectionResult,
} from "@/features/engagement/dealership-application-operations/contracts/dealership-application.types";
import type { ResolvedDealershipApplicationAccess } from "@/features/engagement/dealership-application-operations/policies/dealership-application.policy";
import { DealershipApplicationFilters } from "@/features/engagement/dealership-application-operations/ui/dealership-application-filters";
import {
  DealershipApplicationKpis,
  DealershipApplicationWorkQueue,
} from "@/features/engagement/dealership-application-operations/ui/dealership-application-kpis";
import { DealershipApplicationSourceChart } from "@/features/engagement/dealership-application-operations/ui/dealership-application-source-chart";
import { DealershipApplicationsTable } from "@/features/engagement/dealership-application-operations/ui/dealership-applications-table";
import {
  formatDealershipInteger,
  formatDealershipPercentage,
  titleCaseDealershipToken,
} from "@/features/engagement/dealership-application-operations/utils/dealership-application-format";

export type DealershipApplicationDashboardPageProps = Readonly<{
  access: ResolvedDealershipApplicationAccess;
  query: DealershipApplicationSearchParams;
  data: DealershipApplicationDashboardData;
}>;

function sectionFailure(
  title: string,
  result: Exclude<
    DealershipApplicationSectionResult<unknown>,
    { status: "ready" }
  >,
): React.ReactElement {
  return (
    <ContentStatus
      variant={result.status === "forbidden" ? "warning" : "destructive"}
      title={
        result.status === "forbidden"
          ? `${title} is restricted`
          : `${title} is unavailable`
      }
      description={
        result.status === "forbidden"
          ? "The active actor cannot read this section. No data was rendered outside the authorized scope."
          : result.error?.requestId === undefined
            ? "This section failed independently. Refresh the page or narrow the filters before retrying."
            : `This section failed independently. Reference: ${result.error.requestId}`
      }
    />
  );
}

function Funnel({
  stages,
}: Readonly<{
  stages: DealershipApplicationFunnel["stages"];
}>): React.ReactElement {
  const maximum = Math.max(1, ...stages.map((stage) => stage.count));
  return (
    <div className="grid gap-3">
      {stages.map((stage, index) => (
        <div
          key={`${stage.status}-${String(index)}`}
          className="grid gap-2 rounded-2xl border border-border/70 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-0.5">
              <span className="text-card-title">{stage.label}</span>
              <span className="text-caption text-muted-readable">
                {titleCaseDealershipToken(stage.status)}
              </span>
            </div>
            <div className="text-end">
              <div className="text-card-title text-tabular">
                {formatDealershipInteger(stage.count)}
              </div>
              <div className="text-caption text-muted-readable">
                {stage.conversionFromPreviousPercentage === null
                  ? index === 0
                    ? "Intake baseline"
                    : "Conversion unavailable"
                  : `${formatDealershipPercentage(stage.conversionFromPreviousPercentage)} from prior stage`}
              </div>
            </div>
          </div>
          <Progress
            value={(stage.count / maximum) * 100}
            aria-label={`${stage.label}: ${String(stage.count)}`}
          />
        </div>
      ))}
    </div>
  );
}

export function DealershipApplicationDashboardPage({
  query,
  data,
}: DealershipApplicationDashboardPageProps): React.ReactElement {
  const filterOptions =
    data.filterOptions.status === "ready" ? data.filterOptions.data : null;

  return (
    <ContentRoot
      width="full"
      gutter="none"
      density="compact"
      className="max-w-none gap-4"
    >
      <DealershipApplicationFilters
        query={query}
        filterOptions={filterOptions}
      />

      {data.summary.status === "ready" ? (
        <DealershipApplicationKpis summary={data.summary.data} query={query} />
      ) : (
        sectionFailure("Operational KPIs", data.summary)
      )}

      <ContentDataSurface
        title="Needs attention"
        description="Unassigned, overdue, appointment, onboarding, activation, and exit work requiring the manager’s attention. Counts remain scoped to the authenticated organization hierarchy."
        padded
        scrollable={false}
      >
        {data.summary.status === "ready" ? (
          <DealershipApplicationWorkQueue
            summary={data.summary.data}
            query={query}
          />
        ) : (
          sectionFailure("Needs attention", data.summary)
        )}
      </ContentDataSurface>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(22rem,0.85fr)]">
        <ContentDataSurface
          title="Daily application intake by source"
          description="Interactive source comparison using bounded API buckets. Select a bar to cross-filter the application queue."
          padded
          scrollable={false}
        >
          {data.sourceSeries.status === "ready" ? (
            <DealershipApplicationSourceChart
              series={data.sourceSeries.data}
              query={query}
            />
          ) : (
            sectionFailure("Source analysis", data.sourceSeries)
          )}
        </ContentDataSurface>

        <ContentDataSurface
          title="Lifecycle funnel"
          description="Current distribution across the critical conversion stages from intake to active dealer."
          padded
          scrollable={false}
        >
          {data.funnel.status === "ready" ? (
            <Funnel stages={data.funnel.data.stages} />
          ) : (
            sectionFailure("Lifecycle funnel", data.funnel)
          )}
        </ContentDataSurface>
      </div>

      <ContentDataSurface
        title="Dealership application queue"
        description="Deterministic keyset-paginated cases. Open a record to evaluate, schedule appointments, record notes, complete onboarding, provision, activate, or exit a dealer."
        padded={false}
        scrollable={false}
      >
        {data.applications.status === "ready" ? (
          <DealershipApplicationsTable
            result={data.applications.data}
            query={query}
          />
        ) : (
          sectionFailure("Application queue", data.applications)
        )}
      </ContentDataSurface>
    </ContentRoot>
  );
}

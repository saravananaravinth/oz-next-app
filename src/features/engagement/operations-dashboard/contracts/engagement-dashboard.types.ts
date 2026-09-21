// oz-next-app/src/features/engagement/operations-dashboard/contracts/engagement-dashboard.types.ts
import type { ApiHttpError } from "@/lib/api/problem";

import type {
  EngagementCoverageResult,
  EngagementDashboardIssueResult,
  EngagementDashboardLeadListResult,
  EngagementDashboardSummary,
  EngagementDealerPerformanceResult,
  EngagementFilterOptions,
  EngagementFunnel,
  EngagementLeadSourceSeries,
  EngagementVideoSequenceListResult,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementJourneyAnalyticsSnapshot } from "@/features/engagement/operations-dashboard/contracts/journey-analytics.schema";

export type EngagementDashboardSectionResult<TData> =
  | Readonly<{ status: "ready"; data: TData }>
  | Readonly<{ status: "forbidden" }>
  | Readonly<{
      status: "failed";
      error: ApiHttpError | null;
    }>;

export type EngagementOverviewData = Readonly<{
  summary: EngagementDashboardSectionResult<EngagementDashboardSummary>;
  leadSources: EngagementDashboardSectionResult<EngagementLeadSourceSeries>;
  funnel: EngagementDashboardSectionResult<EngagementFunnel>;
  filterOptions: EngagementDashboardSectionResult<EngagementFilterOptions>;
  leads: EngagementDashboardSectionResult<EngagementDashboardLeadListResult>;
}>;

export type EngagementJourneyWorkspaceData = Readonly<{
  journey: EngagementDashboardSectionResult<EngagementJourneyAnalyticsSnapshot>;
}>;

export type EngagementDealerWorkspaceData = Readonly<{
  dealers: EngagementDashboardSectionResult<EngagementDealerPerformanceResult>;
  filterOptions: EngagementDashboardSectionResult<EngagementFilterOptions>;
}>;

export type EngagementIssueWorkspaceData = Readonly<{
  issues: EngagementDashboardSectionResult<EngagementDashboardIssueResult>;
  filterOptions: EngagementDashboardSectionResult<EngagementFilterOptions>;
}>;

export type EngagementCoverageWorkspaceData = Readonly<{
  coverage: EngagementDashboardSectionResult<EngagementCoverageResult>;
  filterOptions: EngagementDashboardSectionResult<EngagementFilterOptions>;
}>;

export type EngagementVideoSequenceWorkspaceData = Readonly<{
  videoSequences: EngagementDashboardSectionResult<EngagementVideoSequenceListResult>;
}>;

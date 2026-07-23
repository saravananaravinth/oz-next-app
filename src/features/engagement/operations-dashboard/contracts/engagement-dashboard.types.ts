import type { ApiHttpError } from "@/lib/api/problem";

import type {
  EngagementCoverageResult,
  EngagementDashboardIssueResult,
  EngagementDashboardSummary,
  EngagementDealerPerformanceResult,
  EngagementFilterOptions,
  EngagementFunnel,
  EngagementLeadSourceSeries,
  EngagementVideoSequenceListResult,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";

export type EngagementDashboardSectionResult<TData> =
  | Readonly<{ status: "ready"; data: TData }>
  | Readonly<{ status: "forbidden" }>
  | Readonly<{
      status: "failed";
      error: ApiHttpError | null;
    }>;

export type EngagementDashboardWorkspaceData = Readonly<{
  summary: EngagementDashboardSectionResult<EngagementDashboardSummary>;
  comparisonSummary: EngagementDashboardSectionResult<EngagementDashboardSummary> | null;
  sourceSeries: EngagementDashboardSectionResult<EngagementLeadSourceSeries>;
  funnel: EngagementDashboardSectionResult<EngagementFunnel>;
  dealers: EngagementDashboardSectionResult<EngagementDealerPerformanceResult>;
  issues: EngagementDashboardSectionResult<EngagementDashboardIssueResult>;
  coverage: EngagementDashboardSectionResult<EngagementCoverageResult>;
  filterOptions: EngagementDashboardSectionResult<EngagementFilterOptions>;
  videoSequences: EngagementDashboardSectionResult<EngagementVideoSequenceListResult>;
}>;

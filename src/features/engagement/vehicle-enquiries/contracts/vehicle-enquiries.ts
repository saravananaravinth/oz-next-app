// oz-next-app/src/features/engagement/vehicle-enquiries/contracts/vehicle-enquiries.ts
import type {
  EngagementCoverageResult,
  EngagementDashboardIssueResult,
  EngagementDashboardLeadListResult,
  EngagementDashboardSearchParams,
  EngagementDashboardSummary,
  EngagementDealerPerformanceResult,
  EngagementFilterOptions,
  EngagementFunnel,
  EngagementLeadSourceSeries,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDashboardSectionResult } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.types";

export const VEHICLE_ENQUIRIES_FLOW_CODE = "VEHICLE_ENQUIRIES" as const;

export type VehicleEnquiriesAttentionState =
  "HEALTHY" | "DEGRADED" | "AT_RISK" | "CRITICAL";

export type VehicleEnquiriesCommandCenterData = Readonly<{
  summary: EngagementDashboardSectionResult<EngagementDashboardSummary>;
  comparisonSummary: EngagementDashboardSectionResult<EngagementDashboardSummary> | null;
  sourceSeries: EngagementDashboardSectionResult<EngagementLeadSourceSeries>;
  funnel: EngagementDashboardSectionResult<EngagementFunnel>;
  filterOptions: EngagementDashboardSectionResult<EngagementFilterOptions>;
  leads: EngagementDashboardSectionResult<EngagementDashboardLeadListResult>;
  issues: EngagementDashboardSectionResult<EngagementDashboardIssueResult>;
  dealers: EngagementDashboardSectionResult<EngagementDealerPerformanceResult>;
  coverage: EngagementDashboardSectionResult<EngagementCoverageResult>;
}>;

export function scopeVehicleEnquiriesQuery(
  query: EngagementDashboardSearchParams,
): EngagementDashboardSearchParams {
  return {
    ...query,
    ivrFlowCodes: [VEHICLE_ENQUIRIES_FLOW_CODE],
    dealerCursor: undefined,
    leadCursor: undefined,
    issueCursor: undefined,
  };
}

// oz-next-app/src/features/engagement/vehicle-enquiries/server/vehicle-enquiries.server.ts
import "server-only";

import type { ErpFeatureQueryValue } from "@/features/erp-core/api/erp-feature.client.server";
import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import { ENGAGEMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { isApiHttpError } from "@/lib/api/problem";

import {
  engagementCoverageResultSchema,
  engagementDashboardIssueResultSchema,
  engagementDashboardLeadListResultSchema,
  engagementDashboardSummarySchema,
  engagementDealerPerformanceResultSchema,
  engagementFilterOptionsSchema,
  engagementFunnelSchema,
  engagementLeadSourceSeriesSchema,
  previousDashboardRange,
  type EngagementCoverageResult,
  type EngagementDashboardIssueResult,
  type EngagementDashboardLeadListResult,
  type EngagementDashboardSearchParams,
  type EngagementDealerPerformanceResult,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDashboardSectionResult } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.types";
import type { ResolvedEngagementDashboardAccess } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import {
  VEHICLE_ENQUIRIES_FLOW_CODE,
  type VehicleEnquiriesCommandCenterData,
} from "@/features/engagement/vehicle-enquiries/contracts/vehicle-enquiries";

const dashboardClient = createErpFeatureClient({
  featureName: "engagement.vehicle-enquiries-command-center",
  basePath: ENGAGEMENT_ENDPOINTS.operationsDashboardBase,
});

function compactQuery(
  input: Readonly<Record<string, ErpFeatureQueryValue>>,
): Readonly<Record<string, ErpFeatureQueryValue>> {
  const output: Record<string, ErpFeatureQueryValue> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value) && value.length === 0) {
      continue;
    }

    output[key] = value;
  }

  return output;
}

function commandCenterQuery(
  query: EngagementDashboardSearchParams,
  range: Readonly<{ from: string; to: string }> = query,
): Readonly<Record<string, ErpFeatureQueryValue>> {
  return compactQuery({
    from: range.from,
    to: range.to,
    leadSourceId: query.leadSourceIds,
    ivrFlowCode: [VEHICLE_ENQUIRIES_FLOW_CODE],
    status: query.statuses,
    dealerOrgUnitId: query.dealerOrgUnitIds,
    district: query.districts,
    city: query.cities,
    assignmentState: query.assignmentStates,
    conversionState: query.conversionStates,
    followUpState: query.followUpStates,
    issueSeverity: query.issueSeverities,
    q: query.q,
  });
}

async function settle<TData>(
  promise: Promise<TData>,
): Promise<EngagementDashboardSectionResult<TData>> {
  try {
    return { status: "ready", data: await promise };
  } catch (error: unknown) {
    if (isApiHttpError(error) && error.status === 403) {
      return { status: "forbidden" };
    }

    return {
      status: "failed",
      error: isApiHttpError(error) ? error : null,
    };
  }
}

function forbiddenSection<TData>(): EngagementDashboardSectionResult<TData> {
  return { status: "forbidden" };
}

type ActorContext = NonNullable<
  ResolvedEngagementDashboardAccess["actorContext"]
>;

type ActorContextOptions =
  Readonly<Record<never, never>> | Readonly<{ actorContext: ActorContext }>;

function actorContextOptions(
  access: ResolvedEngagementDashboardAccess,
): ActorContextOptions {
  return access.actorContext === undefined
    ? {}
    : { actorContext: access.actorContext };
}

export async function readVehicleEnquiriesCommandCenter(
  input: Readonly<{
    query: EngagementDashboardSearchParams;
    access: ResolvedEngagementDashboardAccess;
  }>,
): Promise<VehicleEnquiriesCommandCenterData> {
  const common = commandCenterQuery(input.query);
  const previousRange = previousDashboardRange(
    input.query.from,
    input.query.to,
  );
  const options = actorContextOptions(input.access);

  const summaryPromise = settle(
    dashboardClient.request({
      path: "/summary",
      query: common,
      schema: engagementDashboardSummarySchema,
      ...options,
    }),
  );

  const comparisonPromise =
    input.query.comparison === "PREVIOUS_PERIOD"
      ? settle(
          dashboardClient.request({
            path: "/summary",
            query: commandCenterQuery(input.query, previousRange),
            schema: engagementDashboardSummarySchema,
            ...options,
          }),
        )
      : Promise.resolve(null);

  const sourceSeriesPromise = settle(
    dashboardClient.request({
      path: "/lead-sources/timeseries",
      query: compactQuery({
        ...common,
        ...(input.query.grain === "AUTO" ? {} : { grain: input.query.grain }),
      }),
      schema: engagementLeadSourceSeriesSchema,
      ...options,
    }),
  );

  const funnelPromise = settle(
    dashboardClient.request({
      path: "/funnel",
      query: common,
      schema: engagementFunnelSchema,
      ...options,
    }),
  );

  const filterOptionsPromise = settle(
    dashboardClient.request({
      path: "/filter-options",
      schema: engagementFilterOptionsSchema,
      ...options,
    }),
  );

  const leadsPromise = input.access.capabilities.canReadLeads
    ? settle(
        dashboardClient.request({
          path: "/leads",
          query: compactQuery({
            ...common,
            limit: input.query.leadLimit,
            cursor: input.query.leadCursor,
          }),
          schema: engagementDashboardLeadListResultSchema,
          ...options,
        }),
      )
    : Promise.resolve(forbiddenSection<EngagementDashboardLeadListResult>());

  const issuesPromise = input.access.capabilities.canReadIssues
    ? settle(
        dashboardClient.request({
          path: "/issues",
          query: compactQuery({
            ...common,
            issueCategory: input.query.issueCategories,
            issueState: input.query.issueStates,
            limit: input.query.issueLimit,
            cursor: input.query.issueCursor,
          }),
          schema: engagementDashboardIssueResultSchema,
          ...options,
        }),
      )
    : Promise.resolve(forbiddenSection<EngagementDashboardIssueResult>());

  const dealersPromise = input.access.capabilities.canReadDealerPerformance
    ? settle(
        dashboardClient.request({
          path: "/dealers",
          query: compactQuery({
            ...common,
            engagementState: input.query.dealerEngagementState,
            sortBy: input.query.dealerSortBy,
            sortDirection: input.query.dealerSortDirection,
            limit: input.query.dealerLimit,
            cursor: input.query.dealerCursor,
          }),
          schema: engagementDealerPerformanceResultSchema,
          ...options,
        }),
      )
    : Promise.resolve(forbiddenSection<EngagementDealerPerformanceResult>());

  const coveragePromise = input.access.capabilities.canReadDealerPerformance
    ? settle(
        dashboardClient.request({
          path: "/coverage",
          query: common,
          schema: engagementCoverageResultSchema,
          ...options,
        }),
      )
    : Promise.resolve(forbiddenSection<EngagementCoverageResult>());

  const [
    summary,
    comparisonSummary,
    sourceSeries,
    funnel,
    filterOptions,
    leads,
    issues,
    dealers,
    coverage,
  ] = await Promise.all([
    summaryPromise,
    comparisonPromise,
    sourceSeriesPromise,
    funnelPromise,
    filterOptionsPromise,
    leadsPromise,
    issuesPromise,
    dealersPromise,
    coveragePromise,
  ]);

  return {
    summary,
    comparisonSummary,
    sourceSeries,
    funnel,
    filterOptions,
    leads,
    issues,
    dealers,
    coverage,
  };
}

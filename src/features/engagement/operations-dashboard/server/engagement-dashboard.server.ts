// oz-next-app/src/features/engagement/operations-dashboard/server/engagement-dashboard.server.ts
import "server-only";

import type { ErpFeatureQueryValue } from "@/features/erp-core/api/erp-feature.client.server";
import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import { ENGAGEMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { isApiHttpError } from "@/lib/api/problem";

import {
  engagementCoverageResultSchema,
  engagementDashboardIssueResultSchema,
  engagementDashboardSummarySchema,
  engagementDealerDetailSchema,
  engagementDealerPerformanceResultSchema,
  engagementFilterOptionsSchema,
  engagementFunnelSchema,
  engagementLeadDetailSchema,
  engagementLeadSourceSeriesSchema,
  engagementVideoSequenceListResultSchema,
  previousDashboardRange,
  type EngagementCoverageResult,
  type EngagementDashboardIssueResult,
  type EngagementDashboardSearchParams,
  type EngagementDealerDetail,
  type EngagementDealerPerformanceResult,
  type EngagementLeadDetail,
  type EngagementVideoSequenceListResult,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type {
  EngagementDashboardSectionResult,
  EngagementDashboardWorkspaceData,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.types";
import type { ResolvedEngagementDashboardAccess } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";

const videoSequenceClient = createErpFeatureClient({
  featureName: "engagement.video-sequences",
  basePath: ENGAGEMENT_ENDPOINTS.videoSequencesBase,
});

const dashboardClient = createErpFeatureClient({
  featureName: "engagement.operations-dashboard",
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

function commonQuery(
  query: EngagementDashboardSearchParams,
  range: Readonly<{ from: string; to: string }> = query,
): Readonly<Record<string, ErpFeatureQueryValue>> {
  return compactQuery({
    from: range.from,
    to: range.to,
    leadSourceId: query.leadSourceIds,
    ivrFlowCode: query.ivrFlowCodes,
    leadType: query.leadTypes,
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

export async function readEngagementDashboardWorkspace(
  input: Readonly<{
    query: EngagementDashboardSearchParams;
    access: ResolvedEngagementDashboardAccess;
  }>,
): Promise<EngagementDashboardWorkspaceData> {
  const actorContext = input.access.actorContext;
  const common = commonQuery(input.query);
  const previousRange = previousDashboardRange(
    input.query.from,
    input.query.to,
  );

  const summaryPromise = settle(
    dashboardClient.request({
      path: "/summary",
      query: common,
      schema: engagementDashboardSummarySchema,
      ...(actorContext !== undefined ? { actorContext } : {}),
    }),
  );
  const comparisonSummaryPromise =
    input.query.comparison === "PREVIOUS_PERIOD"
      ? settle(
          dashboardClient.request({
            path: "/summary",
            query: commonQuery(input.query, previousRange),
            schema: engagementDashboardSummarySchema,
            ...(actorContext !== undefined ? { actorContext } : {}),
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
      ...(actorContext !== undefined ? { actorContext } : {}),
    }),
  );
  const funnelPromise = settle(
    dashboardClient.request({
      path: "/funnel",
      query: common,
      schema: engagementFunnelSchema,
      ...(actorContext !== undefined ? { actorContext } : {}),
    }),
  );
  const filterOptionsPromise = settle(
    dashboardClient.request({
      path: "/filter-options",
      schema: engagementFilterOptionsSchema,
      ...(actorContext !== undefined ? { actorContext } : {}),
    }),
  );
  const dealersPromise = input.access.capabilities.canReadDealerPerformance
    ? settle(
        dashboardClient.request({
          path: "/dealers",
          query: compactQuery({
            ...common,
            sortBy: input.query.dealerSortBy,
            sortDirection: input.query.dealerSortDirection,
            limit: input.query.dealerLimit,
            cursor: input.query.dealerCursor,
          }),
          schema: engagementDealerPerformanceResultSchema,
          ...(actorContext !== undefined ? { actorContext } : {}),
        }),
      )
    : Promise.resolve(forbiddenSection<EngagementDealerPerformanceResult>());
  const issuesPromise = input.access.capabilities.canReadIssues
    ? settle(
        dashboardClient.request({
          path: "/issues",
          query: compactQuery({
            ...common,
            limit: input.query.issueLimit,
            cursor: input.query.issueCursor,
          }),
          schema: engagementDashboardIssueResultSchema,
          ...(actorContext !== undefined ? { actorContext } : {}),
        }),
      )
    : Promise.resolve(forbiddenSection<EngagementDashboardIssueResult>());
  const videoSequencesPromise = input.access.capabilities.canReadVideoSequences
    ? settle(
        videoSequenceClient.request({
          path: "/",
          query: { includeInactive: true },
          schema: engagementVideoSequenceListResultSchema,
          ...(actorContext !== undefined ? { actorContext } : {}),
        }),
      )
    : Promise.resolve(forbiddenSection<EngagementVideoSequenceListResult>());
  const coveragePromise = input.access.capabilities.canReadDealerPerformance
    ? settle(
        dashboardClient.request({
          path: "/coverage",
          query: common,
          schema: engagementCoverageResultSchema,
          ...(actorContext !== undefined ? { actorContext } : {}),
        }),
      )
    : Promise.resolve(forbiddenSection<EngagementCoverageResult>());

  const [
    summary,
    comparisonSummary,
    sourceSeries,
    funnel,
    dealers,
    issues,
    coverage,
    filterOptions,
    videoSequences,
  ] = await Promise.all([
    summaryPromise,
    comparisonSummaryPromise,
    sourceSeriesPromise,
    funnelPromise,
    dealersPromise,
    issuesPromise,
    coveragePromise,
    filterOptionsPromise,
    videoSequencesPromise,
  ]);

  return {
    summary,
    comparisonSummary,
    sourceSeries,
    funnel,
    dealers,
    issues,
    coverage,
    filterOptions,
    videoSequences,
  };
}

export async function readEngagementDashboardDealer(
  input: Readonly<{
    dealerOrgUnitId: string;
    query: EngagementDashboardSearchParams;
    access: ResolvedEngagementDashboardAccess;
  }>,
): Promise<EngagementDealerDetail> {
  return await dashboardClient.request({
    path: `/dealers/${encodeURIComponent(input.dealerOrgUnitId)}`,
    query: commonQuery(input.query),
    schema: engagementDealerDetailSchema,
    ...(input.access.actorContext !== undefined
      ? { actorContext: input.access.actorContext }
      : {}),
  });
}

export async function readEngagementDashboardLead(
  input: Readonly<{
    leadId: string;
    access: ResolvedEngagementDashboardAccess;
  }>,
): Promise<EngagementLeadDetail> {
  return await dashboardClient.request({
    path: `/leads/${encodeURIComponent(input.leadId)}`,
    schema: engagementLeadDetailSchema,
    ...(input.access.actorContext !== undefined
      ? { actorContext: input.access.actorContext }
      : {}),
  });
}

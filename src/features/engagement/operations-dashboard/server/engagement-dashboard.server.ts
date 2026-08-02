// oz-next-app/src/features/engagement/operations-dashboard/server/engagement-dashboard.server.ts
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
  EngagementCoverageWorkspaceData,
  EngagementDashboardSectionResult,
  EngagementDealerWorkspaceData,
  EngagementIssueWorkspaceData,
  EngagementOverviewData,
  EngagementVideoSequenceWorkspaceData,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.types";
import type { ResolvedEngagementDashboardAccess } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";

const videoSequenceClient = createErpFeatureClient({
  featureName: "engagement.video-sequences",
  basePath: ENGAGEMENT_ENDPOINTS.videoSequencesBase,
});

const dashboardClient = createErpFeatureClient({
  featureName: "engagement.vehicle-sales-dashboard",
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

type EngagementActorContext = NonNullable<
  ResolvedEngagementDashboardAccess["actorContext"]
>;

type EngagementActorContextOptions =
  | Readonly<Record<never, never>>
  | Readonly<{ actorContext: EngagementActorContext }>;

function actorContextOptions(
  access: ResolvedEngagementDashboardAccess,
): EngagementActorContextOptions {
  return access.actorContext === undefined
    ? {}
    : { actorContext: access.actorContext };
}

async function readFilterOptions(access: ResolvedEngagementDashboardAccess) {
  return await settle(
    dashboardClient.request({
      path: "/filter-options",
      schema: engagementFilterOptionsSchema,
      ...actorContextOptions(access),
    }),
  );
}

export async function readEngagementOverview(
  input: Readonly<{
    query: EngagementDashboardSearchParams;
    access: ResolvedEngagementDashboardAccess;
  }>,
): Promise<EngagementOverviewData> {
  const common = commonQuery(input.query);
  const previousRange = previousDashboardRange(
    input.query.from,
    input.query.to,
  );
  const options = actorContextOptions(input.access);

  const [
    summary,
    comparisonSummary,
    sourceSeries,
    funnel,
    filterOptions,
    leads,
  ] = await Promise.all([
    settle(
      dashboardClient.request({
        path: "/summary",
        query: common,
        schema: engagementDashboardSummarySchema,
        ...options,
      }),
    ),
    input.query.comparison === "PREVIOUS_PERIOD"
      ? settle(
          dashboardClient.request({
            path: "/summary",
            query: commonQuery(input.query, previousRange),
            schema: engagementDashboardSummarySchema,
            ...options,
          }),
        )
      : Promise.resolve(null),
    settle(
      dashboardClient.request({
        path: "/lead-sources/timeseries",
        query: compactQuery({
          ...common,
          ...(input.query.grain === "AUTO" ? {} : { grain: input.query.grain }),
        }),
        schema: engagementLeadSourceSeriesSchema,
        ...options,
      }),
    ),
    settle(
      dashboardClient.request({
        path: "/funnel",
        query: common,
        schema: engagementFunnelSchema,
        ...options,
      }),
    ),
    readFilterOptions(input.access),
    settle(
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
    ),
  ]);

  return {
    summary,
    comparisonSummary,
    sourceSeries,
    funnel,
    filterOptions,
    leads,
  };
}

export async function readEngagementDealerWorkspace(
  input: Readonly<{
    query: EngagementDashboardSearchParams;
    access: ResolvedEngagementDashboardAccess;
  }>,
): Promise<EngagementDealerWorkspaceData> {
  if (!input.access.capabilities.canReadDealerPerformance) {
    return {
      dealers: forbiddenSection<EngagementDealerPerformanceResult>(),
      filterOptions: await readFilterOptions(input.access),
    };
  }

  const [dealers, filterOptions] = await Promise.all([
    settle(
      dashboardClient.request({
        path: "/dealers",
        query: compactQuery({
          ...commonQuery(input.query),
          engagementState: input.query.dealerEngagementState,
          sortBy: input.query.dealerSortBy,
          sortDirection: input.query.dealerSortDirection,
          limit: input.query.dealerLimit,
          cursor: input.query.dealerCursor,
        }),
        schema: engagementDealerPerformanceResultSchema,
        ...actorContextOptions(input.access),
      }),
    ),
    readFilterOptions(input.access),
  ]);

  return { dealers, filterOptions };
}

export async function readEngagementIssueWorkspace(
  input: Readonly<{
    query: EngagementDashboardSearchParams;
    access: ResolvedEngagementDashboardAccess;
  }>,
): Promise<EngagementIssueWorkspaceData> {
  if (!input.access.capabilities.canReadIssues) {
    return {
      issues: forbiddenSection<EngagementDashboardIssueResult>(),
      filterOptions: await readFilterOptions(input.access),
    };
  }

  const [issues, filterOptions] = await Promise.all([
    settle(
      dashboardClient.request({
        path: "/issues",
        query: compactQuery({
          ...commonQuery(input.query),
          issueCategory: input.query.issueCategories,
          issueState: input.query.issueStates,
          limit: input.query.issueLimit,
          cursor: input.query.issueCursor,
        }),
        schema: engagementDashboardIssueResultSchema,
        ...actorContextOptions(input.access),
      }),
    ),
    readFilterOptions(input.access),
  ]);

  return { issues, filterOptions };
}

export async function readEngagementCoverageWorkspace(
  input: Readonly<{
    query: EngagementDashboardSearchParams;
    access: ResolvedEngagementDashboardAccess;
  }>,
): Promise<EngagementCoverageWorkspaceData> {
  if (!input.access.capabilities.canReadDealerPerformance) {
    return {
      coverage: forbiddenSection<EngagementCoverageResult>(),
      filterOptions: await readFilterOptions(input.access),
    };
  }

  const [coverage, filterOptions] = await Promise.all([
    settle(
      dashboardClient.request({
        path: "/coverage",
        query: commonQuery(input.query),
        schema: engagementCoverageResultSchema,
        ...actorContextOptions(input.access),
      }),
    ),
    readFilterOptions(input.access),
  ]);

  return { coverage, filterOptions };
}

export async function readEngagementVideoSequenceWorkspace(
  input: Readonly<{
    access: ResolvedEngagementDashboardAccess;
  }>,
): Promise<EngagementVideoSequenceWorkspaceData> {
  if (!input.access.capabilities.canReadVideoSequences) {
    return {
      videoSequences: forbiddenSection<EngagementVideoSequenceListResult>(),
    };
  }

  return {
    videoSequences: await settle(
      videoSequenceClient.request({
        path: "/",
        query: { includeInactive: true },
        schema: engagementVideoSequenceListResultSchema,
        ...actorContextOptions(input.access),
      }),
    ),
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
    ...actorContextOptions(input.access),
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
    ...actorContextOptions(input.access),
  });
}

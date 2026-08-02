// oz-next-app/src/features/engagement/dealership-application-operations/server/dealership-application.server.ts
import "server-only";

import type { ErpFeatureQueryValue } from "@/features/erp-core/api/erp-feature.client.server";
import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import { ENGAGEMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { isApiHttpError } from "@/lib/api/problem";

import {
  dealershipApplicationDashboardSummarySchema,
  dealershipApplicationDetailSchema,
  dealershipDistrictAssignmentCatalogSchema,
  dealershipApplicationFilterOptionsSchema,
  dealershipApplicationFunnelSchema,
  dealershipApplicationPageSchema,
  dealershipApplicationSourceSeriesSchema,
  type DealershipApplicationDetail,
  type DealershipApplicationFilterOptions,
  type DealershipApplicationSearchParams,
} from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";
import type {
  DealershipApplicationDashboardData,
  DealershipApplicationSectionResult,
} from "@/features/engagement/dealership-application-operations/contracts/dealership-application.types";
import type { ResolvedDealershipApplicationAccess } from "@/features/engagement/dealership-application-operations/policies/dealership-application.policy";

const dealershipApplicationClient = createErpFeatureClient({
  featureName: "engagement.dealership-applications",
  basePath: ENGAGEMENT_ENDPOINTS.dealershipApplicationsBase,
});

function compactQuery(
  input: Readonly<Record<string, ErpFeatureQueryValue>>,
): Readonly<Record<string, ErpFeatureQueryValue>> {
  const output: Record<string, ErpFeatureQueryValue> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    output[key] = value;
  }

  return output;
}

function commonQuery(
  query: DealershipApplicationSearchParams,
): Readonly<Record<string, ErpFeatureQueryValue>> {
  return compactQuery({
    from: query.from,
    to: query.to,
    phase: query.phases,
    status: query.statuses,
    priority: query.priorities,
    sourceKind: query.sourceKinds,
    sourceId: query.sourceIds,
    ownerUserId: query.ownerUserIds,
    ownerOrgUnitId: query.ownerOrgUnitIds,
    district: query.districts,
    city: query.cities,
    q: query.q,
  });
}

async function settle<TData>(
  promise: Promise<TData>,
): Promise<DealershipApplicationSectionResult<TData>> {
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

function actorOptions(access: ResolvedDealershipApplicationAccess) {
  return access.actorContext === undefined
    ? {}
    : { actorContext: access.actorContext };
}

export async function readDealershipApplicationDashboard(
  input: Readonly<{
    query: DealershipApplicationSearchParams;
    access: ResolvedDealershipApplicationAccess;
  }>,
): Promise<DealershipApplicationDashboardData> {
  const common = commonQuery(input.query);
  const options = actorOptions(input.access);
  const applicationsPromise = input.access.capabilities.canReadApplications
    ? settle(
        dealershipApplicationClient.request({
          path: "/",
          query: compactQuery({
            ...common,
            sortBy: input.query.sortBy,
            sortDirection: input.query.sortDirection,
            limit: input.query.limit,
            cursor: input.query.cursor,
          }),
          schema: dealershipApplicationPageSchema,
          ...options,
        }),
      )
    : Promise.resolve({ status: "forbidden" } as const);
  const filterOptionsPromise = input.access.capabilities.canReadApplications
    ? settle(
        dealershipApplicationClient.request({
          path: "/filter-options",
          schema: dealershipApplicationFilterOptionsSchema,
          ...options,
        }),
      )
    : Promise.resolve({ status: "forbidden" } as const);
  const [summary, sourceSeries, funnel, applications, filterOptions] =
    await Promise.all([
      settle(
        dealershipApplicationClient.request({
          path: "/dashboard/summary",
          query: common,
          schema: dealershipApplicationDashboardSummarySchema,
          ...options,
        }),
      ),
      settle(
        dealershipApplicationClient.request({
          path: "/dashboard/source-series",
          query: compactQuery({ ...common, grain: input.query.grain }),
          schema: dealershipApplicationSourceSeriesSchema,
          ...options,
        }),
      ),
      settle(
        dealershipApplicationClient.request({
          path: "/dashboard/funnel",
          query: common,
          schema: dealershipApplicationFunnelSchema,
          ...options,
        }),
      ),
      applicationsPromise,
      filterOptionsPromise,
    ]);

  return {
    summary,
    sourceSeries,
    funnel,
    applications,
    filterOptions,
  };
}

export async function readDealershipApplicationDetail(
  input: Readonly<{
    applicationId: string;
    access: ResolvedDealershipApplicationAccess;
  }>,
): Promise<DealershipApplicationDetail> {
  return await dealershipApplicationClient.detail(
    input.applicationId,
    dealershipApplicationDetailSchema,
    undefined,
    input.access.actorContext,
  );
}

export async function readDealershipApplicationFilterOptions(
  access: ResolvedDealershipApplicationAccess,
): Promise<DealershipApplicationFilterOptions> {
  return await dealershipApplicationClient.request({
    path: "/filter-options",
    schema: dealershipApplicationFilterOptionsSchema,
    ...actorOptions(access),
  });
}

export async function readDealershipDistrictAssignments(
  access: ResolvedDealershipApplicationAccess,
) {
  return await dealershipApplicationClient.request({
    path: "/district-assignments",
    schema: dealershipDistrictAssignmentCatalogSchema,
    ...actorOptions(access),
  });
}

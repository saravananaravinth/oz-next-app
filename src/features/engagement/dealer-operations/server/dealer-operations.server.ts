import "server-only";

import type { ErpFeatureQueryValue } from "@/features/erp-core/api/erp-feature.client.server";
import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import type { ResolvedDealershipApplicationAccess } from "@/features/engagement/dealership-application-operations/policies/dealership-application.policy";
import { ENGAGEMENT_ENDPOINTS } from "@/lib/api/endpoints";

import {
  dealerOperationDetailSchema,
  dealerOperationPageSchema,
  type DealerOperationDetail,
  type DealerOperationPage,
  type DealerOperationsSearchParams,
} from "@/features/engagement/dealer-operations/contracts/dealer-operations.schema";

const client = createErpFeatureClient({
  featureName: "engagement.dealer-operations",
  basePath: ENGAGEMENT_ENDPOINTS.dealerOperationsBase,
});

function actorOptions(access: ResolvedDealershipApplicationAccess) {
  return access.actorContext === undefined
    ? {}
    : { actorContext: access.actorContext };
}

function compactQuery(
  input: Readonly<Record<string, ErpFeatureQueryValue>>,
): Readonly<Record<string, ErpFeatureQueryValue>> {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
}

export async function readDealerOperationsPage(
  input: Readonly<{
    access: ResolvedDealershipApplicationAccess;
    query: DealerOperationsSearchParams;
  }>,
): Promise<DealerOperationPage> {
  return await client.request({
    path: "/dealers",
    query: compactQuery({
      q: input.query.q,
      orgUnitType: input.query.orgUnitType,
      active: input.query.active,
      cursor: input.query.cursor,
      limit: input.query.limit,
    }),
    schema: dealerOperationPageSchema,
    ...actorOptions(input.access),
  });
}

export async function readDealerOperationDetail(
  input: Readonly<{
    access: ResolvedDealershipApplicationAccess;
    dealerOrgUnitId: string;
  }>,
): Promise<DealerOperationDetail> {
  return await client.request({
    path: `/dealers/${encodeURIComponent(input.dealerOrgUnitId)}`,
    schema: dealerOperationDetailSchema,
    ...actorOptions(input.access),
  });
}

export async function readDealerSelfServiceDetail(
  dealerOrgUnitId: string,
): Promise<DealerOperationDetail> {
  return await client.request({
    path: `/dealers/${encodeURIComponent(dealerOrgUnitId)}`,
    schema: dealerOperationDetailSchema,
  });
}

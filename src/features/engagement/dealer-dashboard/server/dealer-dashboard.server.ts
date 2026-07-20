// oz-next-app/src/features/engagement/dealer-dashboard/server/dealer-dashboard.server.ts
import "server-only";

import { z } from "zod";

import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import { ENGAGEMENT_ENDPOINTS } from "@/lib/api/endpoints";
import type { ServerActorContextHeaders } from "@/server/api/request-context-headers";

import type { DealerDashboardCapabilities } from "@/features/engagement/dealer-dashboard/policies/dealer-dashboard.policy";

import {
  dealerEngagementDashboardSchema,
  ownerGuideSummarySchema,
  type DealerDashboardData,
  type DealerDashboardSearchParams,
  type OwnerGuideSummary,
} from "@/features/engagement/dealer-dashboard/contracts/dealer-dashboard.schema";

const dealerEngagementClient = createErpFeatureClient({
  featureName: "engagement.dealer",
  basePath: ENGAGEMENT_ENDPOINTS.dealerBase,
});

const ownerGuidePreviewSchema = z
  .array(ownerGuideSummarySchema)
  .max(12)
  .readonly();

export async function readDealerDashboardData(
  input: Readonly<{
    query: Pick<DealerDashboardSearchParams, "from" | "to">;
    actorContext?: ServerActorContextHeaders;
    capabilities: Pick<DealerDashboardCapabilities, "canReadOwnerGuides">;
  }>,
): Promise<DealerDashboardData> {
  const query = {
    ...(input.query.from !== undefined ? { from: input.query.from } : {}),
    ...(input.query.to !== undefined ? { to: input.query.to } : {}),
  } as const;

  const dashboardPromise = dealerEngagementClient.request({
    path: "/dashboard",
    query,
    schema: dealerEngagementDashboardSchema,
    ...(input.actorContext !== undefined
      ? { actorContext: input.actorContext }
      : {}),
  });

  const ownerGuidesPromise = input.capabilities.canReadOwnerGuides
    ? dealerEngagementClient.request({
        path: "/happy-customers",
        query: { limit: 12 },
        schema: ownerGuidePreviewSchema,
        ...(input.actorContext !== undefined
          ? { actorContext: input.actorContext }
          : {}),
      })
    : Promise.resolve([] as readonly OwnerGuideSummary[]);

  const [dashboard, ownerGuides] = await Promise.all([
    dashboardPromise,
    ownerGuidesPromise,
  ]);

  return {
    dashboard,
    ownerGuides,
  };
}

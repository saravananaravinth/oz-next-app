import "server-only";

import { z } from "zod";

import { createErpFeatureClient } from "@/features/erp/shared/clients/erp-feature.server";
import { ENGAGEMENT_ENDPOINTS } from "@/lib/api/endpoints";
import type { ServerActorContextHeaders } from "@/server/api/request-context";

import {
  dealerEngagementDashboardSchema,
  ownerGuideSummarySchema,
  type DealerDashboardSearchParams,
  type DealerEngagementDashboard,
  type OwnerGuideSummary,
} from "./schemas";

const dealerEngagementClient = createErpFeatureClient({
  featureName: "engagement.dealer",
  basePath: ENGAGEMENT_ENDPOINTS.dealerBase,
});

const ownerGuidePreviewSchema = z
  .array(ownerGuideSummarySchema)
  .max(12)
  .readonly();

export type DealerDashboardData = Readonly<{
  dashboard: DealerEngagementDashboard;
  ownerGuides: readonly OwnerGuideSummary[];
}>;

export async function readDealerDashboardData(
  input: Readonly<{
    query: Pick<DealerDashboardSearchParams, "from" | "to">;
    actorContext?: ServerActorContextHeaders;
  }>,
): Promise<DealerDashboardData> {
  const query = {
    ...(input.query.from !== undefined ? { from: input.query.from } : {}),
    ...(input.query.to !== undefined ? { to: input.query.to } : {}),
  } as const;

  const [dashboard, ownerGuides] = await Promise.all([
    dealerEngagementClient.request({
      path: "/dashboard",
      query,
      schema: dealerEngagementDashboardSchema,
      ...(input.actorContext !== undefined
        ? { actorContext: input.actorContext }
        : {}),
    }),
    dealerEngagementClient.request({
      path: "/owner-guides",
      query: { limit: 12 },
      schema: ownerGuidePreviewSchema,
      ...(input.actorContext !== undefined
        ? { actorContext: input.actorContext }
        : {}),
    }),
  ]);

  return {
    dashboard,
    ownerGuides,
  };
}

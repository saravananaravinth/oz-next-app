// oz-next-app/src/app/(protected)/engagement/dashboard/dealers/[dealerOrgUnitId]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { z } from "zod";

import {
  EngagementDealerDetailPage,
  ENGAGEMENT_DASHBOARD_ROUTES,
  readEngagementDashboardDealer,
  type EngagementDashboardRawSearchParams,
} from "@/features/engagement/operations-dashboard";
import {
  renderEngagementDashboardResourceFailure,
  resolveEngagementDashboardRoute,
} from "@/app/(protected)/engagement/dashboard/_lib/engagement-dashboard-route";

const PAGE_TITLE = "Dealer engagement details";
const PAGE_DESCRIPTION =
  "Authorized dealer-level vehicle-sales engagement performance, settings, location, and operational health.";

const dealerRouteParamsSchema = z
  .object({
    dealerOrgUnitId: z.uuid(),
  })
  .strict();

type EngagementDealerRoutePageProps = Readonly<{
  params: Promise<Readonly<{ dealerOrgUnitId: string }>>;
  searchParams: Promise<EngagementDashboardRawSearchParams>;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
} satisfies Metadata;

export default async function EngagementDealerRoutePage({
  params,
  searchParams,
}: EngagementDealerRoutePageProps): Promise<ReactElement> {
  const [route, rawParams] = await Promise.all([
    resolveEngagementDashboardRoute({
      searchParams,
      requiredCapability: "canReadDealerPerformance",
      capabilityFallbackHref: ENGAGEMENT_DASHBOARD_ROUTES.dealers,
    }),
    params,
  ]);

  if (route.kind === "blocked") {
    return route.content;
  }

  const parsedParams = dealerRouteParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  let dealer: Awaited<ReturnType<typeof readEngagementDashboardDealer>>;

  try {
    dealer = await readEngagementDashboardDealer({
      dealerOrgUnitId: parsedParams.data.dealerOrgUnitId,
      query: route.query,
      access: route.access,
    });
  } catch (error: unknown) {
    return renderEngagementDashboardResourceFailure(error, {
      resourceLabel: "Dealer engagement details",
      fallbackHref: ENGAGEMENT_DASHBOARD_ROUTES.dealers,
      fallbackLabel: "Back to dealer performance",
    });
  }

  return (
    <EngagementDealerDetailPage
      dealer={dealer}
      query={route.query}
      access={route.access}
    />
  );
}

// oz-next-app/src/app/(protected)/engagement/dashboard/dealers/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import {
  DealerPerformancePage,
  ENGAGEMENT_DASHBOARD_ROUTES,
  readEngagementDealerWorkspace,
  type EngagementDashboardRawSearchParams,
} from "@/features/engagement/operations-dashboard";
import { resolveEngagementDashboardRoute } from "@/app/(protected)/engagement/dashboard/_lib/engagement-dashboard-route";

const PAGE_TITLE = "Vehicle sales dealer performance";
const PAGE_DESCRIPTION =
  "Actor-scoped dealer assignment, response, follow-up, conversion, health, and engagement-configuration performance.";

type DealerPerformanceRoutePageProps = Readonly<{
  searchParams: Promise<EngagementDashboardRawSearchParams>;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
} satisfies Metadata;

export default async function DealerPerformanceRoutePage({
  searchParams,
}: DealerPerformanceRoutePageProps): Promise<ReactElement> {
  const route = await resolveEngagementDashboardRoute({
    searchParams,
    requiredCapability: "canReadDealerPerformance",
    capabilityFallbackHref: ENGAGEMENT_DASHBOARD_ROUTES.overview,
  });

  if (route.kind === "blocked") {
    return route.content;
  }

  const data = await readEngagementDealerWorkspace({
    query: route.query,
    access: route.access,
  });

  return (
    <DealerPerformancePage
      access={route.access}
      query={route.query}
      data={data}
    />
  );
}

// oz-next-app/src/app/(protected)/engagement/dashboard/coverage/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import {
  CoveragePage,
  ENGAGEMENT_DASHBOARD_ROUTES,
  readEngagementCoverageWorkspace,
  type EngagementDashboardRawSearchParams,
} from "@/features/engagement/operations-dashboard";
import { resolveEngagementDashboardRoute } from "@/app/(protected)/engagement/dashboard/_lib/engagement-dashboard-route";

const PAGE_TITLE = "Vehicle sales demand and dealer coverage";
const PAGE_DESCRIPTION =
  "Actor-scoped assigned-lead demand, dealer readiness, geographic coverage, and distance-exception analysis.";

type CoverageRoutePageProps = Readonly<{
  searchParams: Promise<EngagementDashboardRawSearchParams>;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
} satisfies Metadata;

export default async function CoverageRoutePage({
  searchParams,
}: CoverageRoutePageProps): Promise<ReactElement> {
  const route = await resolveEngagementDashboardRoute({
    searchParams,
    requiredCapability: "canReadDealerPerformance",
    capabilityFallbackHref: ENGAGEMENT_DASHBOARD_ROUTES.overview,
  });

  if (route.kind === "blocked") {
    return route.content;
  }

  const data = await readEngagementCoverageWorkspace({
    query: route.query,
    access: route.access,
  });

  return <CoveragePage access={route.access} query={route.query} data={data} />;
}

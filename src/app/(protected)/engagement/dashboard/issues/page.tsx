// oz-next-app/src/app/(protected)/engagement/dashboard/issues/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import {
  ENGAGEMENT_DASHBOARD_ROUTES,
  IssueWorkbenchPage,
  readEngagementIssueWorkspace,
  type EngagementDashboardRawSearchParams,
} from "@/features/engagement/operations-dashboard";
import { resolveEngagementDashboardRoute } from "@/app/(protected)/engagement/dashboard/_lib/engagement-dashboard-route";

const PAGE_TITLE = "Vehicle sales support workbench";
const PAGE_DESCRIPTION =
  "Permission-gated vehicle-sales engagement exceptions, interventions, retries, and audited operational recovery.";

type IssueWorkbenchRoutePageProps = Readonly<{
  searchParams: Promise<EngagementDashboardRawSearchParams>;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
} satisfies Metadata;

export default async function IssueWorkbenchRoutePage({
  searchParams,
}: IssueWorkbenchRoutePageProps): Promise<ReactElement> {
  const route = await resolveEngagementDashboardRoute({
    searchParams,
    requiredCapability: "canReadIssues",
    capabilityFallbackHref: ENGAGEMENT_DASHBOARD_ROUTES.overview,
  });

  if (route.kind === "blocked") {
    return route.content;
  }

  const data = await readEngagementIssueWorkspace({
    query: route.query,
    access: route.access,
  });

  return (
    <IssueWorkbenchPage access={route.access} query={route.query} data={data} />
  );
}

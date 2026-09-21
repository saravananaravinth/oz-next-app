// oz-next-app/src/app/(protected)/engagement/dashboard/journey/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { resolveEngagementDashboardRoute } from "@/app/(protected)/engagement/dashboard/_lib/engagement-dashboard-route";
import {
  EngagementJourneyPage,
  readEngagementJourneyWorkspace,
  type EngagementDashboardRawSearchParams,
} from "@/features/engagement/operations-dashboard";

const PAGE_TITLE = "Vehicle enquiry journey";
const PAGE_DESCRIPTION =
  "Authoritative process-run journey funnel, terminal outcomes, latency, maturity, and projection health for Vehicle Enquiries.";

type EngagementJourneyRoutePageProps = Readonly<{
  searchParams: Promise<EngagementDashboardRawSearchParams>;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
} satisfies Metadata;

export default async function EngagementJourneyRoutePage({
  searchParams,
}: EngagementJourneyRoutePageProps): Promise<ReactElement> {
  const route = await resolveEngagementDashboardRoute({ searchParams });

  if (route.kind === "blocked") {
    return route.content;
  }

  const data = await readEngagementJourneyWorkspace({
    query: route.query,
    access: route.access,
  });

  return (
    <EngagementJourneyPage
      access={route.access}
      query={route.query}
      data={data}
    />
  );
}

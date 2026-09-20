// oz-next-app/src/app/(protected)/engagement/dashboard/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import {
  EngagementDashboardPage,
  readEngagementOverview,
  type EngagementDashboardRawSearchParams,
} from "@/features/engagement/operations-dashboard";
import { resolveEngagementDashboardRoute } from "@/app/(protected)/engagement/dashboard/_lib/engagement-dashboard-route";

const PAGE_TITLE = "Vehicle enquiry journey";
const PAGE_DESCRIPTION =
  "Authoritative Vehicle Enquiries journey analytics with process-run funnel, terminal outcomes, latency, projection health, and operational lead context.";

type EngagementDashboardPageProps = Readonly<{
  searchParams: Promise<EngagementDashboardRawSearchParams>;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
} satisfies Metadata;

export default async function EngagementDashboardRoutePage({
  searchParams,
}: EngagementDashboardPageProps): Promise<ReactElement> {
  const route = await resolveEngagementDashboardRoute({ searchParams });

  if (route.kind === "blocked") {
    return route.content;
  }

  const data = await readEngagementOverview({
    query: route.query,
    access: route.access,
  });

  return (
    <EngagementDashboardPage
      access={route.access}
      query={route.query}
      data={data}
    />
  );
}

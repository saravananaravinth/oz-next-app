// oz-next-app/src/app/(protected)/engagement/dashboard/configuration/video-sequences/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import {
  ENGAGEMENT_DASHBOARD_ROUTES,
  readEngagementVideoSequenceWorkspace,
  VideoSequencePage,
  type EngagementDashboardRawSearchParams,
} from "@/features/engagement/operations-dashboard";
import { resolveEngagementDashboardRoute } from "@/app/(protected)/engagement/dashboard/_lib/engagement-dashboard-route";

const PAGE_TITLE = "Vehicle sales customer video schedule";
const PAGE_DESCRIPTION =
  "Permission-aware customer video sequence configuration with actor-scoped reads and audited updates.";

type VideoSequenceRoutePageProps = Readonly<{
  searchParams: Promise<EngagementDashboardRawSearchParams>;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
} satisfies Metadata;

export default async function VideoSequenceRoutePage({
  searchParams,
}: VideoSequenceRoutePageProps): Promise<ReactElement> {
  const route = await resolveEngagementDashboardRoute({
    searchParams,
    requiredCapability: "canReadVideoSequences",
    capabilityFallbackHref: ENGAGEMENT_DASHBOARD_ROUTES.overview,
  });

  if (route.kind === "blocked") {
    return route.content;
  }

  const data = await readEngagementVideoSequenceWorkspace({
    access: route.access,
  });

  return (
    <VideoSequencePage access={route.access} query={route.query} data={data} />
  );
}

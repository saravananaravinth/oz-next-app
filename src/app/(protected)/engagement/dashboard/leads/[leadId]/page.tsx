// oz-next-app/src/app/(protected)/engagement/dashboard/leads/[leadId]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { z } from "zod";

import {
  EngagementLeadDetailPage,
  ENGAGEMENT_DASHBOARD_ROUTES,
  readEngagementDashboardLead,
  type EngagementDashboardRawSearchParams,
} from "@/features/engagement/operations-dashboard";
import {
  renderEngagementDashboardResourceFailure,
  resolveEngagementDashboardRoute,
} from "@/app/(protected)/engagement/dashboard/_lib/engagement-dashboard-route";

const PAGE_TITLE = "Engagement lead details";
const PAGE_DESCRIPTION =
  "Authorized vehicle-sales lead identity, assignment, lifecycle, location, and engagement evidence.";

const leadRouteParamsSchema = z
  .object({
    leadId: z.uuid(),
  })
  .strict();

type EngagementLeadRoutePageProps = Readonly<{
  params: Promise<Readonly<{ leadId: string }>>;
  searchParams: Promise<EngagementDashboardRawSearchParams>;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
} satisfies Metadata;

export default async function EngagementLeadRoutePage({
  params,
  searchParams,
}: EngagementLeadRoutePageProps): Promise<ReactElement> {
  const [route, rawParams] = await Promise.all([
    resolveEngagementDashboardRoute({
      searchParams,
      requiredCapability: "canReadLeads",
      capabilityFallbackHref: ENGAGEMENT_DASHBOARD_ROUTES.issues,
    }),
    params,
  ]);

  if (route.kind === "blocked") {
    return route.content;
  }

  const parsedParams = leadRouteParamsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    notFound();
  }

  let lead: Awaited<ReturnType<typeof readEngagementDashboardLead>>;

  try {
    lead = await readEngagementDashboardLead({
      leadId: parsedParams.data.leadId,
      access: route.access,
    });
  } catch (error: unknown) {
    return renderEngagementDashboardResourceFailure(error, {
      resourceLabel: "Lead details",
      fallbackHref: ENGAGEMENT_DASHBOARD_ROUTES.issues,
      fallbackLabel: "Back to support workbench",
    });
  }

  return <EngagementLeadDetailPage lead={lead} query={route.query} />;
}

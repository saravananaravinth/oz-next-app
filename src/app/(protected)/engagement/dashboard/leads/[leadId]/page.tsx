// oz-next-app/src/app/(protected)/engagement/dashboard/leads/[leadId]/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ContentRoot, ContentStatus } from "@/components/common/content-shell";
import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  EngagementDashboardAccessState,
  EngagementDashboardInvalidQueryState,
  EngagementLeadDetailPage,
  parseEngagementDashboardSearchParams,
  readEngagementDashboardLead,
  resolveEngagementDashboardAccess,
  type EngagementLeadDetail,
  type EngagementDashboardRawSearchParams,
} from "@/features/engagement/operations-dashboard";
import { isApiHttpError } from "@/lib/api/problem";

const leadParamsSchema = z.object({ leadId: z.uuid() }).strict();

type RoutePageProps = Readonly<{
  params: Promise<Readonly<{ leadId: string }>>;
  searchParams: Promise<EngagementDashboardRawSearchParams>;
}>;

export const metadata = {
  title: "Engagement lead details",
  robots: { index: false, follow: false, nocache: true },
} satisfies Metadata;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export default async function EngagementLeadRoutePage({
  params,
  searchParams,
}: RoutePageProps): Promise<ReactElement> {
  const [me, rawParams, rawSearchParams] = await Promise.all([
    requireAuthenticatedMe(),
    params,
    searchParams,
  ]);
  const parsedParams = leadParamsSchema.safeParse(rawParams);
  if (!parsedParams.success) notFound();

  const parsedQuery = parseEngagementDashboardSearchParams(rawSearchParams);
  if (!parsedQuery.success) {
    return (
      <EngagementDashboardInvalidQueryState
        issues={parsedQuery.error.issues.map(
          (issue) =>
            `${issue.path.map(String).join(".") || "$"}: ${issue.message}`,
        )}
      />
    );
  }

  const access = resolveEngagementDashboardAccess(
    me,
    parsedQuery.data.tenantId,
  );
  if (access.kind !== "resolved") {
    return (
      <EngagementDashboardAccessState access={access} tenants={me.tenants} />
    );
  }
  if (!access.capabilities.canReadLeads) {
    return (
      <ContentRoot width="default">
        <ContentStatus
          variant="destructive"
          title="Lead access denied"
          description="The active actor lacks engagement:lead:read."
        />
      </ContentRoot>
    );
  }

  let lead: EngagementLeadDetail;
  try {
    lead = await readEngagementDashboardLead({
      leadId: parsedParams.data.leadId,
      access,
    });
  } catch (error: unknown) {
    if (isApiHttpError(error) && error.status === 404) notFound();
    if (isApiHttpError(error)) {
      return (
        <ContentRoot width="default">
          <ContentStatus
            variant="destructive"
            title="Lead details unavailable"
            description="The lead detail request could not be completed without exposing unsafe backend details."
          />
        </ContentRoot>
      );
    }
    throw error;
  }

  return <EngagementLeadDetailPage lead={lead} query={parsedQuery.data} />;
}

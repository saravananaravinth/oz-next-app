// oz-next-app/src/app/(protected)/engagement/dashboard/dealers/[dealerOrgUnitId]/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";

import { ContentRoot, ContentStatus } from "@/components/common/content-shell";
import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  EngagementDashboardAccessState,
  EngagementDashboardInvalidQueryState,
  EngagementDealerDetailPage,
  parseEngagementDashboardSearchParams,
  readEngagementDashboardDealer,
  resolveEngagementDashboardAccess,
  type EngagementDealerDetail,
  type EngagementDashboardRawSearchParams,
} from "@/features/engagement/operations-dashboard";
import { isApiHttpError } from "@/lib/api/problem";

const dealerParamsSchema = z.object({ dealerOrgUnitId: z.uuid() }).strict();

type RoutePageProps = Readonly<{
  params: Promise<Readonly<{ dealerOrgUnitId: string }>>;
  searchParams: Promise<EngagementDashboardRawSearchParams>;
}>;

export const metadata = {
  title: "Dealer engagement details",
  robots: { index: false, follow: false, nocache: true },
} satisfies Metadata;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export default async function EngagementDealerRoutePage({
  params,
  searchParams,
}: RoutePageProps): Promise<ReactElement> {
  const [me, rawParams, rawSearchParams] = await Promise.all([
    requireAuthenticatedMe(),
    params,
    searchParams,
  ]);
  const parsedParams = dealerParamsSchema.safeParse(rawParams);
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
  if (!access.capabilities.canReadDealerPerformance) {
    return (
      <ContentRoot width="default">
        <ContentStatus
          variant="destructive"
          title="Dealer performance access denied"
          description="The active actor lacks engagement:dealer-performance:read."
        />
      </ContentRoot>
    );
  }

  let dealer: EngagementDealerDetail;
  try {
    dealer = await readEngagementDashboardDealer({
      dealerOrgUnitId: parsedParams.data.dealerOrgUnitId,
      query: parsedQuery.data,
      access,
    });
  } catch (error: unknown) {
    if (isApiHttpError(error) && error.status === 404) notFound();
    if (isApiHttpError(error)) {
      return (
        <ContentRoot width="default">
          <ContentStatus
            variant="destructive"
            title="Dealer details unavailable"
            description={
              error.status === 409
                ? "The dealer view changed. Return to the dashboard and reopen it."
                : "The dealer detail request could not be completed."
            }
          />
        </ContentRoot>
      );
    }
    throw error;
  }

  return (
    <EngagementDealerDetailPage
      dealer={dealer}
      query={parsedQuery.data}
      access={access}
    />
  );
}

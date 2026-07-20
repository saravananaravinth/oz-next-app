// oz-next-app/src/app/(protected)/dashboard/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { WelcomeDashboard } from "@/features/dashboard/ui/welcome-dashboard";
import {
  DealerDashboardPage,
  SuperAdminDealerContext,
  dealerDashboardSearchParamsSchema,
  readDealerDashboardData,
  resolveDealerDashboardAccess,
  type DealerDashboardContext,
  type DealerDashboardSearchParams,
} from "@/features/engagement/dealer-dashboard";

const PAGE_TITLE = "Dashboard";
const PAGE_DESCRIPTION =
  "Role-aware Ozotec EV enterprise operations dashboard.";

type DashboardPageProps = Readonly<{
  searchParams: Promise<
    Readonly<Record<string, string | string[] | undefined>>
  >;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
} satisfies Metadata;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function firstValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  return value?.[0];
}

function parseDashboardSearchParams(
  value: Readonly<Record<string, string | string[] | undefined>>,
): DealerDashboardSearchParams {
  const parsed = dealerDashboardSearchParamsSchema.safeParse({
    from: firstValue(value["from"]),
    to: firstValue(value["to"]),
    tenantId: firstValue(value["tenantId"]),
    dealerOrgUnitId: firstValue(value["dealerOrgUnitId"]),
  });

  if (!parsed.success) {
    return {};
  }

  return parsed.data;
}

function selectedDealerContext(
  query: DealerDashboardSearchParams,
): DealerDashboardContext | undefined {
  if (query.tenantId === undefined || query.dealerOrgUnitId === undefined) {
    return undefined;
  }

  return {
    tenantId: query.tenantId,
    dealerOrgUnitId: query.dealerOrgUnitId,
  };
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps): Promise<ReactElement> {
  const [me, rawSearchParams] = await Promise.all([
    requireAuthenticatedMe(),
    searchParams,
  ]);
  const query = parseDashboardSearchParams(rawSearchParams);
  const access = resolveDealerDashboardAccess(me, selectedDealerContext(query));

  if (access.kind === "unsupported") {
    return <WelcomeDashboard />;
  }

  if (access.kind === "context_required") {
    return <SuperAdminDealerContext />;
  }

  const data = await readDealerDashboardData({
    query,
    capabilities: access.capabilities,
    ...(access.actorContext !== undefined
      ? { actorContext: access.actorContext }
      : {}),
  });

  return <DealerDashboardPage access={access} data={data} query={query} />;
}

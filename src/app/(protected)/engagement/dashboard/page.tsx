// oz-next-app/src/app/(protected)/engagement/dashboard/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  EngagementDashboardAccessState,
  EngagementDashboardInvalidQueryState,
  EngagementDashboardPage,
  parseEngagementDashboardSearchParams,
  readEngagementDashboardWorkspace,
  resolveEngagementDashboardAccess,
  type EngagementDashboardRawSearchParams,
} from "@/features/engagement/operations-dashboard";

const PAGE_TITLE = "Engagement dashboard";
const PAGE_DESCRIPTION =
  "Actor-scoped lead operations, dealer performance, support issues, and district coverage.";

type RoutePageProps = Readonly<{
  searchParams: Promise<EngagementDashboardRawSearchParams>;
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

export default async function EngagementDashboardRoutePage({
  searchParams,
}: RoutePageProps): Promise<ReactElement> {
  const [me, rawSearchParams] = await Promise.all([
    requireAuthenticatedMe(),
    searchParams,
  ]);
  const parsedQuery = parseEngagementDashboardSearchParams(rawSearchParams);

  if (!parsedQuery.success) {
    return (
      <EngagementDashboardInvalidQueryState
        issues={parsedQuery.error.issues.map((issue) => {
          const path =
            issue.path.length === 0 ? "$" : issue.path.map(String).join(".");
          return `${path}: ${issue.message}`;
        })}
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

  const data = await readEngagementDashboardWorkspace({
    query: parsedQuery.data,
    access,
  });

  return (
    <EngagementDashboardPage
      access={access}
      query={parsedQuery.data}
      data={data}
      tenants={me.tenants}
    />
  );
}

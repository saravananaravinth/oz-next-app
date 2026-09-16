// oz-next-app/src/app/(protected)/engagement/vehicle-enquiries/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  EngagementDashboardAccessState,
  EngagementDashboardInvalidQueryState,
  parseEngagementDashboardSearchParams,
  resolveEngagementDashboardAccess,
  type EngagementDashboardRawSearchParams,
} from "@/features/engagement/operations-dashboard";
import {
  readVehicleEnquiriesCommandCenter,
  scopeVehicleEnquiriesQuery,
  VehicleEnquiriesPage,
} from "@/features/engagement/vehicle-enquiries";

const PAGE_TITLE = "Vehicle Enquiries command center";
const PAGE_DESCRIPTION =
  "Operational monitoring, incident remediation, lead investigation, dealer health, and coverage analytics for Vehicle Enquiries.";

type VehicleEnquiriesRoutePageProps = Readonly<{
  searchParams: Promise<EngagementDashboardRawSearchParams>;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
} satisfies Metadata;

function queryIssues(
  issues: ReadonlyArray<
    Readonly<{
      path: readonly PropertyKey[];
      message: string;
    }>
  >,
): readonly string[] {
  return issues.slice(0, 5).map((issue) => {
    const path =
      issue.path.length === 0 ? "$" : issue.path.map(String).join(".");
    return `${path}: ${issue.message}`;
  });
}

export default async function VehicleEnquiriesRoutePage({
  searchParams,
}: VehicleEnquiriesRoutePageProps): Promise<ReactElement> {
  const [me, rawSearchParams] = await Promise.all([
    requireAuthenticatedMe(),
    searchParams,
  ]);
  const parsedQuery = parseEngagementDashboardSearchParams(rawSearchParams);

  if (!parsedQuery.success) {
    return (
      <EngagementDashboardInvalidQueryState
        issues={queryIssues(parsedQuery.error.issues)}
      />
    );
  }

  const access = resolveEngagementDashboardAccess(me);

  if (access.kind !== "resolved") {
    return <EngagementDashboardAccessState access={access} />;
  }

  const query = scopeVehicleEnquiriesQuery(parsedQuery.data);
  const data = await readVehicleEnquiriesCommandCenter({ query, access });

  return <VehicleEnquiriesPage access={access} query={query} data={data} />;
}

import type { ReactElement, ReactNode } from "react";

import { resolveDealerOperationsAccess } from "@/app/(protected)/engagement/dealership-applications/_lib/dealer-operations-route";
import { readDealershipDistrictAssignments } from "@/features/engagement/dealership-application-operations";
import { DealerOperationsWorkspace } from "@/features/engagement/dealer-operations/ui/dealer-operations-workspace";

export default async function DealershipOperationsLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactElement> {
  const route = await resolveDealerOperationsAccess(
    "canReadDashboard",
    "Dealership operations",
  );
  if (route.kind === "blocked") return route.content;

  const districtAssignments = route.access.capabilities
    .canManageDistrictAssignments
    ? await readDealershipDistrictAssignments(route.access).catch(() => null)
    : null;

  return (
    <DealerOperationsWorkspace
      access={route.access}
      districtAssignments={districtAssignments}
    >
      {children}
    </DealerOperationsWorkspace>
  );
}

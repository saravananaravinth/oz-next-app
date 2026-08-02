// oz-next-app/src/app/(protected)/engagement/dealership-applications/loading.tsx
import type { ReactElement } from "react";

import { DealershipApplicationsDashboardSkeleton } from "@/features/engagement/dealership-application-operations/ui/dealership-application-page-skeletons";

export default function DealershipApplicationsLoading(): ReactElement {
  return <DealershipApplicationsDashboardSkeleton />;
}

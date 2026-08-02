// oz-next-app/src/app/(protected)/engagement/dealership-applications/[applicationId]/loading.tsx
import type { ReactElement } from "react";

import { DealershipApplicationDetailSkeleton } from "@/features/engagement/dealership-application-operations/ui/dealership-application-page-skeletons";

export default function DealershipApplicationDetailLoading(): ReactElement {
  return <DealershipApplicationDetailSkeleton />;
}

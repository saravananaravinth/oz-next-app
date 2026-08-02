import type { ReactElement } from "react";

import { DealerDetailSkeleton } from "@/features/engagement/dealership-application-operations/ui/dealership-application-page-skeletons";

export default function DealerDetailLoading(): ReactElement {
  return <DealerDetailSkeleton />;
}

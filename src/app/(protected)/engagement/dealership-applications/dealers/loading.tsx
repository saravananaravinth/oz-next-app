import type { ReactElement } from "react";

import { DealerListSkeleton } from "@/features/engagement/dealership-application-operations/ui/dealership-application-page-skeletons";

export default function DealerListLoading(): ReactElement {
  return <DealerListSkeleton />;
}

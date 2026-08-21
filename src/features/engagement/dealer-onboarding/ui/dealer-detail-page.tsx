// oz-next-app/src/features/engagement/dealer-onboarding/ui/dealer-detail-page.tsx
import type { ReactElement } from "react";

import type { DealerDirectoryDetail } from "@/features/engagement/dealer-onboarding/contracts/dealer-onboarding.schema";
import type { ResolvedDealerAdministrationAccess } from "@/features/engagement/dealer-onboarding/policies/dealer-onboarding.policy";
import { DealerDetailWorkbench } from "@/features/engagement/dealer-onboarding/ui/dealer-detail-workbench";

export function DealerDetailPage({
  access,
  dealer,
}: Readonly<{
  access: ResolvedDealerAdministrationAccess;
  dealer: DealerDirectoryDetail;
}>): ReactElement {
  return <DealerDetailWorkbench access={access} initialDealer={dealer} />;
}

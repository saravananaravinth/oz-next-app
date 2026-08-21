// oz-next-app/src/features/engagement/dealer-onboarding/ui/dealer-onboarding-page.tsx
import type { ReactElement } from "react";

import { ContentRoot } from "@/components/common/content-shell";
import type {
  DealerDirectoryPage,
  DealerDirectorySearchParams,
} from "@/features/engagement/dealer-onboarding/contracts/dealer-onboarding.schema";
import type { ResolvedDealerAdministrationAccess } from "@/features/engagement/dealer-onboarding/policies/dealer-onboarding.policy";
import { DealerDirectoryTable } from "@/features/engagement/dealer-onboarding/ui/dealer-directory-table";

export function DealerOnboardingPage({
  access,
  data,
  query,
}: Readonly<{
  access: ResolvedDealerAdministrationAccess;
  data: DealerDirectoryPage;
  query: DealerDirectorySearchParams;
}>): ReactElement {
  return (
    <ContentRoot
      width="full"
      density="compact"
      className="min-h-[calc(100dvh-8rem)]"
    >
      <DealerDirectoryTable access={access} data={data} query={query} />
    </ContentRoot>
  );
}

import type * as React from "react";

import { ContentRoot } from "@/components/common/content-shell";
import type { DealershipApplicationFilterOptions } from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";
import { DirectOnboardingWorkbench } from "@/features/engagement/dealer-operations/ui/direct-onboarding-workbench";

export type DirectOnboardingPageProps = Readonly<{
  filterOptions: DealershipApplicationFilterOptions;
}>;

export function DirectOnboardingPage({
  filterOptions,
}: DirectOnboardingPageProps): React.ReactElement {
  return (
    <ContentRoot
      width="full"
      gutter="none"
      density="compact"
      className="max-w-none gap-4"
    >
      <DirectOnboardingWorkbench filterOptions={filterOptions} />
    </ContentRoot>
  );
}

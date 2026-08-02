// oz-next-app/src/app/(protected)/engagement/dealership-applications/direct-onboarding/loading.tsx
import type { ReactElement } from "react";

import { DirectOnboardingSkeleton } from "@/features/engagement/dealership-application-operations/ui/dealership-application-page-skeletons";

export default function DirectOnboardingLoading(): ReactElement {
  return <DirectOnboardingSkeleton />;
}

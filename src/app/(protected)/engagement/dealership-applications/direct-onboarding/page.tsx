import type { Metadata } from "next";
import type { ReactElement } from "react";

import { resolveDealerOperationsAccess } from "@/app/(protected)/engagement/dealership-applications/_lib/dealer-operations-route";
import { readDealershipApplicationFilterOptions } from "@/features/engagement/dealership-application-operations";
import { DirectOnboardingPage } from "@/features/engagement/dealer-operations";

export const metadata = {
  title: "Direct dealer onboarding",
  description:
    "Exceptional dealer onboarding after backend duplicate preflight confirms no application or existing dealer is available.",
} satisfies Metadata;

export default async function DirectDealerOnboardingRoutePage(): Promise<ReactElement> {
  const route = await resolveDealerOperationsAccess(
    "canDirectOnboard",
    "Direct dealer onboarding",
  );
  if (route.kind === "blocked") return route.content;

  const filterOptions = await readDealershipApplicationFilterOptions(
    route.access,
  );
  return <DirectOnboardingPage filterOptions={filterOptions} />;
}

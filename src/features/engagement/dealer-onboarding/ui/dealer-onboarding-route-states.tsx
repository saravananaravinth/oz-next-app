// oz-next-app/src/features/engagement/dealer-onboarding/ui/dealer-onboarding-route-states.tsx
import type { ReactElement } from "react";
import { ShieldAlert, TriangleAlert } from "lucide-react";
import type { z } from "zod";

import { ContentRoot, ContentStatus } from "@/components/common/content-shell";
import type { DealerAdministrationAccess } from "@/features/engagement/dealer-onboarding/policies/dealer-onboarding.policy";

export function DealerOnboardingAccessState({
  access,
}: Readonly<{
  access: Exclude<DealerAdministrationAccess, { kind: "resolved" }>;
}>): ReactElement {
  const contextRequired = access.kind === "context_required";
  return (
    <ContentRoot width="narrow">
      <ContentStatus
        variant={contextRequired ? "warning" : "destructive"}
        icon={
          contextRequired ? (
            <TriangleAlert aria-hidden="true" />
          ) : (
            <ShieldAlert aria-hidden="true" />
          )
        }
        title={
          contextRequired
            ? "Select a tenant from the global tenant switcher"
            : "Dealer administration is unavailable"
        }
        description={access.reason}
      />
    </ContentRoot>
  );
}

export function DealerOnboardingInvalidQueryState({
  issues,
}: Readonly<{ issues: readonly z.core.$ZodIssue[] }>): ReactElement {
  return (
    <ContentRoot width="narrow">
      <ContentStatus
        variant="destructive"
        icon={<TriangleAlert aria-hidden="true" />}
        title="Dealer directory filters are invalid"
        description={
          issues[0]?.message ?? "Remove unsupported query parameters and retry."
        }
      />
    </ContentRoot>
  );
}

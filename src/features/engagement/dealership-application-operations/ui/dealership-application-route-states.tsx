// oz-next-app/src/features/engagement/dealership-application-operations/ui/dealership-application-route-states.tsx
import type * as React from "react";
import Link from "next/link";
import { LockKeyhole, ShieldAlert, TriangleAlert } from "lucide-react";

import {
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";
import type { DealershipApplicationAccess } from "@/features/engagement/dealership-application-operations/policies/dealership-application.policy";
import { DEALERSHIP_APPLICATION_ROUTES } from "@/features/engagement/dealership-application-operations/utils/dealership-application-url";

export function DealershipApplicationAccessState({
  access,
}: Readonly<{
  access: Exclude<DealershipApplicationAccess, { kind: "resolved" }>;
}>): React.ReactElement {
  const contextRequired = access.kind === "context_required";

  return (
    <ContentRoot width="default">
      <ContentSection
        title={
          contextRequired
            ? "Select a tenant to open dealership applications"
            : "Dealership application access restricted"
        }
        description={
          contextRequired
            ? "Super administrators must select an explicit tenant context before any dealership lifecycle data is requested."
            : access.reason
        }
        padded
      >
        <ContentStatus
          variant={contextRequired ? "warning" : "destructive"}
          icon={
            contextRequired ? (
              <ShieldAlert aria-hidden="true" />
            ) : (
              <LockKeyhole aria-hidden="true" />
            )
          }
          title={
            contextRequired ? "Tenant context required" : "Permission required"
          }
          description="No protected dealership application request was made outside a resolved actor and tenant scope."
        />
      </ContentSection>
    </ContentRoot>
  );
}

export function DealershipApplicationInvalidQueryState({
  issues,
}: Readonly<{ issues: readonly string[] }>): React.ReactElement {
  return (
    <ContentRoot width="default">
      <ContentSection
        title="Dealership application filters are invalid"
        description="The URL did not match the bounded dashboard query contract. No protected request was sent."
        actions={
          <Button variant="outline" asChild>
            <Link href={DEALERSHIP_APPLICATION_ROUTES.dashboard}>
              Reset dashboard filters
            </Link>
          </Button>
        }
        padded
      >
        <ContentStatus
          variant="warning"
          icon={<TriangleAlert aria-hidden="true" />}
          title="Review the saved link"
          description={
            issues.length === 0
              ? "One or more query values are invalid."
              : issues.join(" · ")
          }
        />
      </ContentSection>
    </ContentRoot>
  );
}

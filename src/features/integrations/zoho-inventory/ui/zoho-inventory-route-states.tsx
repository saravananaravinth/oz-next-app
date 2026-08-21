// oz-next-app/src/features/integrations/zoho-inventory/ui/zoho-inventory-route-states.tsx
import type { ReactElement } from "react";
import { LockKeyhole, Network, TriangleAlert } from "lucide-react";

import { ContentRoot, ContentStatus } from "@/components/common/content-shell";

import type { ZohoInventoryAccess } from "@/features/integrations/zoho-inventory/policies/zoho-inventory.policy";

export function ZohoInventoryAccessState({
  access,
}: Readonly<{
  access: Exclude<ZohoInventoryAccess, { kind: "resolved" }>;
}>): ReactElement {
  const contextRequired = access.kind === "context_required";

  return (
    <ContentRoot width="wide">
      <ContentStatus
        variant={contextRequired ? "warning" : "destructive"}
        icon={
          contextRequired ? (
            <Network aria-hidden="true" />
          ) : (
            <LockKeyhole aria-hidden="true" />
          )
        }
        title={
          contextRequired
            ? "Tenant context required"
            : "Zoho Inventory access unavailable"
        }
        description={access.reason}
      />
    </ContentRoot>
  );
}

export function ZohoInventoryInvalidQueryState(): ReactElement {
  return (
    <ContentRoot width="wide">
      <ContentStatus
        variant="warning"
        icon={<TriangleAlert aria-hidden="true" />}
        title="Invalid Zoho Inventory workspace URL"
        description="The integration workspace query parameters were rejected. Open the Zoho Inventory settings page again from ERP navigation."
      />
    </ContentRoot>
  );
}

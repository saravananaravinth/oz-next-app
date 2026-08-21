// oz-next-app/src/features/inventory/components/ui/component-inventory-tenant-context.tsx
import type { ReactElement } from "react";
import { Building2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Compatibility boundary for integrations that previously rendered a page-local
 * component tenant picker. Tenant selection is application-wide and is owned by
 * the protected shell header; this feature must never create an independent
 * tenant authority from URL or local component state.
 */
export function ComponentInventoryTenantContext(): ReactElement {
  return (
    <Alert>
      <Building2 aria-hidden="true" />
      <AlertTitle>Tenant is managed globally</AlertTitle>
      <AlertDescription>
        Component inventory automatically follows the tenant selected in the
        application header. Change the tenant there to switch component scope.
      </AlertDescription>
    </Alert>
  );
}

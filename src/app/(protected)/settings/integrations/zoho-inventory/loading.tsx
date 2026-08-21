// oz-next-app/src/app/(protected)/settings/integrations/zoho-inventory/loading.tsx
import type { ReactElement } from "react";

import {
  ContentDataSurface,
  ContentRoot,
  ContentSkeleton,
} from "@/components/common/content-shell";

export default function ZohoInventoryIntegrationLoading(): ReactElement {
  return (
    <ContentRoot width="full" density="compact" aria-busy="true">
      <ContentSkeleton
        variant="page"
        label="Loading Zoho Inventory integration"
      />
      <ContentDataSurface title="Connections" padded>
        <ContentSkeleton variant="section" rows={3} />
      </ContentDataSurface>
      <ContentDataSurface title="Synchronization history" padded>
        <ContentSkeleton variant="table" rows={5} />
      </ContentDataSurface>
    </ContentRoot>
  );
}

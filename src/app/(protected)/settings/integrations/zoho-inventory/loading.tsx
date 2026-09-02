// oz-next-app/src/app/(protected)/settings/integrations/zoho-inventory/loading.tsx
import type { ReactElement } from "react";

import {
  ContentDataSurface,
  ContentRoot,
  ContentSkeleton,
} from "@/components/common/content-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function ZohoInventoryIntegrationLoading(): ReactElement {
  return (
    <ContentRoot width="full" density="compact" aria-busy="true">
      <div className="flex h-[60px] items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 sm:px-5">
        <Skeleton className="size-9 shrink-0 rounded-xl" />
        <div className="grid min-w-0 flex-1 gap-1.5">
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-3 w-[34rem] max-w-[60vw]" />
        </div>
        <Skeleton className="h-9 w-44 shrink-0 rounded-xl" />
      </div>

      <ContentDataSurface title="Connections" padded>
        <ContentSkeleton variant="section" rows={2} />
      </ContentDataSurface>

      <ContentDataSurface title="Catalogue overview" padded>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="min-h-[6.75rem] rounded-2xl" />
          ))}
        </div>
      </ContentDataSurface>

      <ContentDataSurface title="Synced items" padded>
        <ContentSkeleton variant="table" rows={10} />
      </ContentDataSurface>

      <ContentDataSurface title="Webhook configuration" padded>
        <ContentSkeleton variant="section" rows={3} />
        <div className="mt-4">
          <ContentSkeleton variant="table" rows={10} />
        </div>
      </ContentDataSurface>

      <ContentDataSurface title="Synchronization history" padded>
        <ContentSkeleton variant="table" rows={10} />
      </ContentDataSurface>
    </ContentRoot>
  );
}

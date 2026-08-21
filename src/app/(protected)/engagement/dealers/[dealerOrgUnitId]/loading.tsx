// oz-next-app/src/app/(protected)/engagement/dealers/[dealerOrgUnitId]/loading.tsx
import type { ReactElement } from "react";

import { ContentRoot } from "@/components/common/content-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function DealerAdministrationLoading(): ReactElement {
  return (
    <ContentRoot
      width="full"
      density="compact"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading dealer administration</span>
      <div className="rounded-3xl border border-border/70 bg-card p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-96 max-w-[60vw]" />
          </div>
          <Skeleton className="h-11 w-40 rounded-2xl" />
        </div>
        <div className="mb-4 flex gap-2">
          <Skeleton className="h-11 w-80 rounded-2xl" />
          <Skeleton className="h-11 w-44 rounded-2xl" />
          <Skeleton className="h-11 w-40 rounded-2xl" />
        </div>
        <Skeleton className="min-h-[32rem] w-full rounded-3xl" />
      </div>
    </ContentRoot>
  );
}

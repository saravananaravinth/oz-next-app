// oz-next-app/src/app/(protected)/inventory/components/loading.tsx
import type { ReactElement } from "react";

import {
  ContentDataSurface,
  ContentMetrics,
  ContentRoot,
} from "@/components/common/content-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComponentInventoryLoading(): ReactElement {
  return (
    <ContentRoot
      width="full"
      aria-label="Loading component inventory"
      aria-busy="true"
      className="lg:h-full lg:min-h-0 lg:overflow-hidden"
    >
      <div className="grid gap-3 rounded-3xl border border-border/70 bg-card/80 p-3 sm:grid-cols-[minmax(0,1fr)_11.5rem_auto]">
        <Skeleton className="h-10 rounded-2xl" />
        <Skeleton className="h-10 rounded-2xl" />
        <Skeleton className="h-10 w-28 rounded-2xl" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>

      <ContentMetrics className="!grid-cols-[repeat(6,minmax(10rem,1fr))] gap-3 overflow-hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="grid min-h-24 gap-3 rounded-3xl border border-border/70 bg-card p-4"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </ContentMetrics>

      <ContentDataSurface
        padded
        className="min-h-[28rem] lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
        contentClassName="grid gap-2"
      >
        <Skeleton className="h-12 rounded-xl" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </ContentDataSurface>
    </ContentRoot>
  );
}

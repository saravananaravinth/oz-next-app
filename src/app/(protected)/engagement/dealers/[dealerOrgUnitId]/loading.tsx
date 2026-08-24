// oz-next-app/src/app/(protected)/engagement/dealers/[dealerOrgUnitId]/loading.tsx
import type { ReactElement } from "react";

import { ContentRoot } from "@/components/common/content-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function DealerDetailLoading(): ReactElement {
  return (
    <ContentRoot
      width="full"
      density="compact"
      aria-busy="true"
      aria-live="polite"
      className="min-h-[calc(100dvh-8rem)]"
    >
      <span className="sr-only">Loading dealer details</span>

      <div className="h-[60px] min-h-[60px] max-h-[60px] overflow-hidden rounded-2xl border border-border/70 bg-card px-4 shadow-xs shadow-foreground/5 sm:px-5">
        <div className="flex h-full min-w-max items-center gap-3">
          <Skeleton className="size-8 rounded-xl" />
          <Skeleton className="size-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-3 w-80" />
          </div>
          <div className="ms-auto flex items-center gap-2 ps-6">
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 rounded-3xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-[42rem] max-w-[80vw]" />
        </div>

        <div className="mt-5 grid grid-cols-2 border-b border-border/70 sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="px-3 py-2.5">
              <Skeleton className="h-4 w-4/5 max-w-32" />
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-border/70 p-4"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-6 w-36" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {Array.from({ length: 2 }, (_, sectionIndex) => (
            <div
              key={sectionIndex}
              className="rounded-2xl border border-border/70 p-5"
            >
              <Skeleton className="h-5 w-44" />
              <Skeleton className="mt-2 h-3 w-64" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }, (_, rowIndex) => (
                  <div key={rowIndex} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ContentRoot>
  );
}

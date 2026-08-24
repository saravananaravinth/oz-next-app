// oz-next-app/src/app/(protected)/engagement/dealers/onboarding/loading.tsx
import type { ReactElement } from "react";

import { ContentRoot } from "@/components/common/content-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function DealerOnboardingLoading(): ReactElement {
  return (
    <ContentRoot
      width="full"
      density="comfortable"
      aria-busy="true"
      aria-live="polite"
      className="min-h-[calc(100dvh-8rem)]"
    >
      <span className="sr-only">Loading dealer onboarding</span>

      <div className="h-[60px] min-h-[60px] max-h-[60px] overflow-hidden rounded-2xl border border-border/70 bg-card px-4 shadow-xs shadow-foreground/5 sm:px-5">
        <div className="flex h-full min-w-max items-center gap-3">
          <Skeleton className="size-8 rounded-xl" />
          <Skeleton className="size-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-96" />
          </div>
          <div className="ms-auto flex items-center gap-2 ps-6">
            <Skeleton className="h-8 w-36 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-5 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-[36rem] max-w-[75vw]" />
          </div>
        </div>
      </div>

      <div className="grid min-h-0 gap-5 xl:grid-cols-[minmax(15rem,19rem)_minmax(0,1fr)]">
        <div className="rounded-3xl border border-border/70 bg-card p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-56" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-3 w-48" />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>
      </div>
    </ContentRoot>
  );
}

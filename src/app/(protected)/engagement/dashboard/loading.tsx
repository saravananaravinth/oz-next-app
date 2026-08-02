// oz-next-app/src/app/(protected)/engagement/dashboard/loading.tsx
import type { ReactElement } from "react";

import {
  ContentRoot,
  ContentSection,
  ContentSkeleton,
} from "@/components/common/content-shell";
import { Skeleton } from "@/components/ui/skeleton";

const METRIC_COUNT = 5;

export default function EngagementDashboardLoading(): ReactElement {
  return (
    <ContentRoot
      width="full"
      gutter="none"
      density="compact"
      className="max-w-none gap-4"
      aria-busy="true"
      aria-live="polite"
    >
      <section
        aria-label="Loading vehicle-sales navigation and filters"
        className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-xs shadow-foreground/5"
      >
        <div className="flex min-w-0 flex-col gap-3 p-3 @4xl/content-root:flex-row @4xl/content-root:items-center">
          <div className="grid min-w-44 gap-1 px-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>

          <div className="flex min-w-0 flex-1 gap-2 overflow-hidden">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-28 shrink-0 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/20 p-3">
          <Skeleton className="h-10 w-40 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="ms-auto h-10 w-24 rounded-xl" />
        </div>
      </section>

      <section
        aria-label="Loading engagement metrics"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        {Array.from({ length: METRIC_COUNT }, (_, index) => (
          <ContentSkeleton
            key={index}
            variant="section"
            rows={2}
            label={`Loading engagement metric ${String(index + 1)}`}
          />
        ))}
      </section>

      <ContentSection padded={false} contentClassName="grid gap-4 p-4">
        <div className="flex gap-2" aria-hidden="true">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>

        <ContentSkeleton
          variant="table"
          rows={8}
          label="Loading vehicle-sales engagement workspace"
        />
      </ContentSection>
    </ContentRoot>
  );
}

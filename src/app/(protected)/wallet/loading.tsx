// oz-next-app/src/app/(protected)/wallet/loading.tsx
import type { ReactElement } from "react";

import { ContentRoot } from "@/components/common/content-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function MetricSkeleton(): ReactElement {
  return (
    <Card className="relative min-w-0 overflow-hidden border-border/70 shadow-sm shadow-foreground/[0.04]">
      <CardContent className="grid min-h-[9.25rem] min-w-0 content-between gap-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="size-9 rounded-xl" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-8 w-40 max-w-full" />
          <Skeleton className="h-4 w-full max-w-52" />
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows }: Readonly<{ rows: number }>): ReactElement {
  return (
    <Card className="overflow-hidden shadow-none">
      <CardContent className="grid gap-0 p-0">
        <div className="grid gap-2 border-b border-border/70 px-4 py-4 sm:px-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid gap-0 px-4 sm:px-5">
          {Array.from({ length: rows }, (_, index) => (
            <div
              key={index}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_8rem] items-center gap-3 border-b border-border/60 py-3 last:border-b-0"
            >
              <Skeleton className="size-9 rounded-xl" />
              <div className="grid min-w-0 gap-2">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-3.5 w-32 max-w-full" />
              </div>
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3 sm:px-5">
          <Skeleton className="h-4 w-52 max-w-full" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function WalletLoading(): ReactElement {
  return (
    <ContentRoot
      width="full"
      density="compact"
      aria-busy="true"
      aria-live="polite"
      className="min-w-0"
    >
      <span className="sr-only">Loading wallet workspace</span>

      <header
        aria-hidden="true"
        className="h-[60px] min-h-[60px] max-h-[60px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs shadow-foreground/5"
      >
        <div className="flex h-full min-w-max items-center gap-3 px-4 sm:px-5">
          <Skeleton className="size-9 rounded-xl" />
          <div className="grid gap-1.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3.5 w-80 max-w-[55vw]" />
          </div>
          <div className="ms-auto flex items-center gap-2 ps-6">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </header>

      <div
        aria-hidden="true"
        className="h-12 overflow-hidden rounded-2xl border border-border/70 bg-card p-1.5 shadow-xs shadow-foreground/5"
      >
        <div className="flex h-full items-center gap-1">
          <Skeleton className="h-9 w-44 rounded-xl" />
          <Skeleton className="h-9 w-40 rounded-xl" />
        </div>
      </div>

      <Card className="relative overflow-hidden border-primary/20 shadow-sm shadow-foreground/5">
        <CardContent className="grid min-w-0 gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)] lg:items-center">
          <div className="grid min-w-0 gap-4">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <div className="grid gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-72 max-w-full" />
              <Skeleton className="h-4 w-full max-w-2xl" />
            </div>
          </div>
          <Skeleton className="h-24 w-full rounded-2xl" />
        </CardContent>
      </Card>

      <section
        aria-label="Loading wallet balance summary"
        className="grid gap-3"
      >
        <div className="flex items-end justify-between gap-4 px-0.5">
          <div className="grid gap-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-80 max-w-[60vw]" />
          </div>
          <Skeleton className="hidden h-4 w-24 sm:block" />
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      </section>

      <TableSkeleton rows={5} />
      <TableSkeleton rows={5} />
    </ContentRoot>
  );
}

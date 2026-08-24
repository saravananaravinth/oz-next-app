// oz-next-app/src/app/(protected)/engagement/dealers/loading.tsx
import type { ReactElement } from "react";

import { ContentRoot } from "@/components/common/content-shell";
import { Skeleton } from "@/components/ui/skeleton";

const TABLE_COLUMNS = Array.from({ length: 8 });

export default function DealerDirectoryLoading(): ReactElement {
  return (
    <ContentRoot
      width="full"
      density="compact"
      aria-busy="true"
      aria-live="polite"
      className="lg:h-full lg:min-h-0 lg:overflow-hidden"
    >
      <span className="sr-only">Loading dealer directory</span>

      <div className="h-[60px] min-h-[60px] max-h-[60px] overflow-hidden rounded-2xl border border-border/70 bg-card px-4 shadow-xs shadow-foreground/5 sm:px-5">
        <div className="flex h-full min-w-max items-center gap-3">
          <Skeleton className="size-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-80" />
          </div>
          <div className="ms-auto flex items-center gap-2 ps-6">
            <Skeleton className="h-8 w-56 rounded-xl" />
            <Skeleton className="h-8 w-40 rounded-xl" />
            <Skeleton className="h-8 w-32 rounded-xl" />
            <Skeleton className="size-8 rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-hidden rounded-3xl border border-border/70 bg-card">
        <div className="hidden lg:block">
          <div className="grid grid-cols-[2.1fr_.9fr_1.8fr_1.45fr_1.75fr_1.45fr_.95fr_.85fr] border-b border-border/70 bg-muted/20 px-3 py-3">
            {TABLE_COLUMNS.map((_, index) => (
              <div key={index} className="min-w-0 px-2">
                <Skeleton className="h-4 w-3/4 max-w-32" />
              </div>
            ))}
          </div>
          {Array.from({ length: 7 }, (_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid min-h-16 grid-cols-[2.1fr_.9fr_1.8fr_1.45fr_1.75fr_1.45fr_.95fr_.85fr] items-center border-b border-border/60 px-3 py-2 last:border-b-0"
            >
              {TABLE_COLUMNS.map((_, columnIndex) => (
                <div
                  key={`${rowIndex.toString()}-${columnIndex.toString()}`}
                  className="min-w-0 space-y-1.5 px-2"
                >
                  <Skeleton className="h-4 w-4/5" />
                  {columnIndex === 0 ||
                  columnIndex === 2 ||
                  columnIndex === 3 ||
                  columnIndex === 4 ? (
                    <Skeleton className="h-3 w-3/5" />
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="grid gap-3 p-3 lg:hidden">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-border/70 p-4"
            >
              <div className="flex justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }, (_, fieldIndex) => (
                  <div key={fieldIndex} className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-28 max-w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex h-10 min-h-10 items-center justify-between border-t border-border/70 px-4">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </ContentRoot>
  );
}

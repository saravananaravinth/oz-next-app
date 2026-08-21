// oz-next-app/src/app/(protected)/inventory/vehicles/loading.tsx
import type { ReactElement } from "react";

import {
  ContentDataSurface,
  ContentMetrics,
  ContentRoot,
  ContentScrollArea,
} from "@/components/common/content-shell";
import { Skeleton } from "@/components/ui/skeleton";

const KPI_KEYS = [
  "total",
  "available",
  "reserved",
  "transferred",
  "sold",
  "aging",
] as const;
const TABLE_ROW_KEYS = ["a", "b", "c", "d", "e", "f", "g"] as const;
const TABLE_COLUMN_CLASSES = [
  "14fr",
  "18fr",
  "16fr",
  "11fr",
  "18fr",
  "12fr",
  "11fr",
] as const;

function InventoryMetricSkeleton(): ReactElement {
  return (
    <div className="flex min-h-[6.75rem] flex-col justify-between rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-3.5 w-20 rounded-md" />
        <Skeleton className="size-7 rounded-lg" />
      </div>
      <div className="flex items-end justify-between gap-3">
        <Skeleton className="h-9 w-20 rounded-lg" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-9 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function InventoryToolbarSkeleton(): ReactElement {
  return (
    <div className="flex h-[60px] min-h-[60px] items-center justify-between gap-6 overflow-hidden rounded-2xl border border-border/70 bg-card px-5">
      <div className="flex shrink-0 items-center gap-3">
        <Skeleton className="size-9 rounded-xl" />
        <div className="grid gap-1.5">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-72 max-w-[45vw] rounded-md" />
        </div>
      </div>
      <div className="hidden min-w-0 items-center gap-2 md:flex">
        <Skeleton className="h-9 w-56 rounded-xl" />
        <Skeleton className="h-9 w-48 rounded-xl" />
        <Skeleton className="h-8 w-24 rounded-xl" />
        <Skeleton className="h-9 w-20 rounded-xl" />
        <Skeleton className="size-9 rounded-xl" />
      </div>
    </div>
  );
}

function InventoryWarningSkeleton(): ReactElement {
  return (
    <div className="flex h-[60px] min-h-[60px] items-center gap-3 rounded-2xl border border-warning/20 bg-warning/[0.035] px-4">
      <Skeleton className="size-9 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-52 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-lg" />
        </div>
        <Skeleton className="mt-1.5 h-3 w-64 max-w-[50vw] rounded-md" />
      </div>
      <Skeleton className="hidden h-9 w-28 rounded-xl sm:block" />
    </div>
  );
}

function InventoryTableSkeleton(): ReactElement {
  const columnTemplate = TABLE_COLUMN_CLASSES.join(" ");

  return (
    <ContentDataSurface
      padded
      className="min-h-[28rem] lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
      contentClassName="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
    >
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border/70 pb-2.5">
        <Skeleton className="size-9 rounded-xl" />
        <div className="grid flex-1 gap-1.5">
          <Skeleton className="h-4 w-44 rounded-md" />
          <Skeleton className="h-3 w-56 rounded-md" />
        </div>
        <Skeleton className="h-6 w-20 rounded-lg" />
      </div>

      <div className="hidden min-h-0 flex-1 flex-col lg:flex">
        <div
          className="grid h-11 shrink-0 items-center gap-4 border-b border-border/70 bg-muted/20 px-3"
          style={{ gridTemplateColumns: columnTemplate }}
          aria-hidden="true"
        >
          {TABLE_COLUMN_CLASSES.map((_, index) => (
            <Skeleton
              key={String(index)}
              className={
                index === 6
                  ? "ml-auto h-3 w-10 rounded-md"
                  : "h-3 w-16 rounded-md"
              }
            />
          ))}
        </div>

        <div className="grid min-h-0 flex-1 auto-rows-fr">
          {TABLE_ROW_KEYS.map((rowKey) => (
            <div
              key={rowKey}
              className="grid min-h-20 items-center gap-4 border-b border-border/55 px-3 last:border-b-0"
              style={{ gridTemplateColumns: columnTemplate }}
              aria-hidden="true"
            >
              <div className="grid gap-2">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-7 w-full max-w-44 rounded-lg" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
              <Skeleton className="h-7 w-28 rounded-lg" />
              <div className="grid gap-2">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-3 w-28 rounded-md" />
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-3 w-28 rounded-md" />
              </div>
              <div className="grid justify-items-end gap-2">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-3 w-10 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 py-3 lg:hidden">
        {TABLE_ROW_KEYS.slice(0, 3).map((rowKey) => (
          <div
            key={rowKey}
            className="grid gap-3 rounded-xl border border-border/70 bg-card p-4"
            aria-hidden="true"
          >
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-6 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border/70 pt-4">
        <Skeleton className="h-3 w-72 max-w-[60%] rounded-md" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    </ContentDataSurface>
  );
}

export default function VehicleInventoryLoading(): ReactElement {
  return (
    <ContentRoot
      width="full"
      aria-busy="true"
      aria-live="polite"
      className="lg:h-full lg:min-h-0 lg:overflow-hidden"
    >
      <span className="sr-only">Loading vehicle inventory</span>

      <InventoryToolbarSkeleton />

      <ContentScrollArea label="Loading inventory KPI summary" tabIndex={-1}>
        <ContentMetrics className="min-w-[72rem] !grid-cols-6 gap-3">
          {KPI_KEYS.map((key) => (
            <InventoryMetricSkeleton key={key} />
          ))}
        </ContentMetrics>
      </ContentScrollArea>

      <InventoryWarningSkeleton />
      <InventoryTableSkeleton />
    </ContentRoot>
  );
}

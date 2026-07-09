// oz-next-app/src/app/loading.tsx
import type { ReactElement } from "react";

import { Skeleton } from "@/components/ui/skeleton";

const SIDEBAR_ITEMS = [
  "dashboard",
  "inventory",
  "sales",
  "purchasing",
  "finance",
  "reports",
] as const;

const TABLE_ROWS = [
  "row-1",
  "row-2",
  "row-3",
  "row-4",
  "row-5",
  "row-6",
] as const;

const KPI_CARDS = ["kpi-1", "kpi-2", "kpi-3", "kpi-4"] as const;

function SidebarSkeleton(): ReactElement {
  return (
    <aside
      aria-hidden="true"
      className="hidden min-h-svh w-72 shrink-0 border-r border-sidebar-border bg-sidebar/80 p-4 backdrop-blur lg:block"
    >
      <div className="flex items-center gap-3 px-2 py-2">
        <Skeleton className="size-9 rounded-2xl" />

        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      <div className="mt-8 space-y-2">
        {SIDEBAR_ITEMS.map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 rounded-2xl px-2 py-2"
          >
            <Skeleton className="size-4 rounded-md" />
            <Skeleton className="h-4 w-36" />
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-sidebar-border bg-background/70 p-3 shadow-sm">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-4/5" />
      </div>
    </aside>
  );
}

function HeaderSkeleton(): ReactElement {
  return (
    <header
      aria-hidden="true"
      className="sticky top-0 z-10 border-b border-border bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-9 rounded-2xl lg:hidden" />

          <div className="space-y-2">
            <Skeleton className="h-4 w-40 sm:w-56" />
            <Skeleton className="h-3 w-28 sm:w-36" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="hidden h-9 w-56 rounded-2xl md:block" />
          <Skeleton className="size-9 rounded-2xl" />
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>
    </header>
  );
}

function ContentSkeleton(): ReactElement {
  return (
    <section aria-hidden="true" className="content-visibility-auto p-4 sm:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-6 w-48 sm:w-64" />
              <Skeleton className="h-4 w-64 max-w-full sm:w-96" />
            </div>

            <Skeleton className="h-10 w-36 rounded-2xl" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPI_CARDS.map((item) => (
            <div
              key={item}
              className="rounded-3xl border border-border bg-card p-4 shadow-sm"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-8 w-28" />
              <Skeleton className="mt-3 h-3 w-36 max-w-full" />
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>

            <Skeleton className="hidden h-9 w-28 rounded-2xl sm:block" />
          </div>

          <div className="divide-y divide-border">
            {TABLE_ROWS.map((row) => (
              <div key={row} className="grid grid-cols-12 gap-3 p-4">
                <Skeleton className="col-span-5 h-4" />
                <Skeleton className="col-span-3 h-4" />
                <Skeleton className="col-span-2 hidden h-4 sm:block" />
                <Skeleton className="col-span-2 h-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Loading(): ReactElement {
  return (
    <section
      aria-busy="true"
      aria-label="Loading application content"
      className="min-h-svh bg-background text-foreground"
    >
      <div role="status" aria-live="polite" className="sr-only">
        Loading application content. Please wait.
      </div>

      <div className="flex min-h-svh">
        <SidebarSkeleton />

        <div className="min-w-0 flex-1">
          <HeaderSkeleton />
          <ContentSkeleton />
        </div>
      </div>
    </section>
  );
}

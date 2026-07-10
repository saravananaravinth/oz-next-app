// oz-next-app/src/app/(protected)/dashboard/loading.tsx
import type { ReactElement } from "react";

import { ContentGrid, ContentMetrics, ContentRoot } from "@/components/content";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const METRIC_KEYS = [
  "assigned-leads",
  "bookings",
  "conversions",
  "forward-requests",
  "owner-guides",
  "matching-ready",
  "fresh-locations",
  "open-assignments",
] as const;

const FUNNEL_KEYS = [
  "assigned",
  "notified",
  "accepted",
  "visited",
  "test-drive",
  "booked",
  "converted",
] as const;

function MetricSkeleton(): ReactElement {
  return (
    <Card size="sm" aria-hidden="true">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="grid min-w-0 flex-1 gap-2">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
        <Skeleton className="size-10 rounded-2xl" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-32 rounded-full" />
      </CardContent>
    </Card>
  );
}

export default function DashboardLoading(): ReactElement {
  return (
    <ContentRoot
      width="full"
      aria-busy="true"
      aria-labelledby="dashboard-loading-title"
    >
      <div className="sr-only" role="status" aria-live="polite">
        <h1 id="dashboard-loading-title">Loading secure dealer dashboard</h1>
      </div>

      <Card aria-hidden="true">
        <CardContent className="grid gap-6 p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid min-w-0 gap-3">
              <Skeleton className="h-6 w-40 rounded-full" />
              <Skeleton className="h-12 w-72 max-w-full rounded-3xl" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Skeleton className="h-11 w-full rounded-2xl sm:w-32" />
              <Skeleton className="h-11 w-full rounded-2xl sm:w-52" />
            </div>
          </div>

          <div className="grid gap-4 border-t border-border/70 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-xl" />
                <div className="grid gap-2">
                  <Skeleton className="h-5 w-32 rounded-full" />
                  <Skeleton className="h-3 w-72 max-w-full rounded-full" />
                </div>
              </div>
              <Skeleton className="h-10 w-full rounded-2xl sm:w-48" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,20rem)_minmax(12rem,20rem)_auto]">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-10 w-full self-end rounded-2xl sm:col-span-2 xl:col-span-1 xl:w-32" />
            </div>
          </div>
        </CardContent>
      </Card>

      <ContentMetrics>
        {METRIC_KEYS.slice(0, 4).map((key) => (
          <MetricSkeleton key={key} />
        ))}
      </ContentMetrics>

      <ContentMetrics>
        {METRIC_KEYS.slice(4).map((key) => (
          <MetricSkeleton key={key} />
        ))}
      </ContentMetrics>

      <Skeleton aria-hidden="true" className="h-24 w-full rounded-3xl" />

      <ContentGrid variant="main-aside">
        <Card aria-hidden="true">
          <CardContent className="grid gap-5 p-5 sm:p-6">
            <Skeleton className="h-7 w-64 rounded-xl" />
            {FUNNEL_KEYS.map((key) => (
              <div key={key} className="grid gap-2">
                <div className="flex justify-between gap-4">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-4 w-10 rounded-full" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card aria-hidden="true">
          <CardContent className="grid gap-4 p-5 sm:p-6">
            <Skeleton className="h-7 w-52 rounded-xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </CardContent>
        </Card>
      </ContentGrid>

      <Skeleton aria-hidden="true" className="h-80 w-full rounded-3xl" />
    </ContentRoot>
  );
}

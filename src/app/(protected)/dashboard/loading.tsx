// oz-next-app/src/app/(protected)/dashboard/loading.tsx
import type { ReactElement } from "react";

import { ContentGrid, ContentMetrics, ContentRoot } from "@/components/content";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const SIGNAL_SKELETON_KEYS = [
  "session",
  "tenant-policy",
  "shell",
  "runtime",
] as const;

const DETAIL_SKELETON_KEYS = [
  "workspace-tools",
  "enterprise-baseline",
] as const;

function DashboardSignalSkeleton(): ReactElement {
  return (
    <Card size="sm" aria-hidden="true">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="grid min-w-0 flex-1 gap-2">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-5 w-36 rounded-full" />
        </div>

        <Skeleton className="size-10 rounded-2xl" />
      </CardHeader>

      <CardContent>
        <Skeleton className="h-14 w-full rounded-2xl" />
      </CardContent>
    </Card>
  );
}

function DashboardSectionSkeleton(): ReactElement {
  return (
    <Card aria-hidden="true">
      <CardHeader className="gap-3">
        <Skeleton className="size-11 rounded-2xl" />
        <Skeleton className="h-8 w-full max-w-sm rounded-2xl" />
        <Skeleton className="h-4 w-full max-w-lg rounded-full" />
      </CardHeader>

      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
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
        <h1 id="dashboard-loading-title">Loading dashboard</h1>
      </div>

      <Card aria-hidden="true">
        <CardContent className="grid gap-6">
          <div className="grid gap-3">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-14 w-full max-w-2xl rounded-3xl" />
            <Skeleton className="h-5 w-full max-w-3xl rounded-full" />
          </div>

          <Card size="sm">
            <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="grid min-w-0 gap-2">
                <Skeleton className="h-5 w-56 rounded-full" />
                <Skeleton className="h-4 w-full max-w-lg rounded-full" />
              </div>

              <Skeleton className="h-12 w-28 rounded-2xl" />
              <Skeleton className="h-2 w-full rounded-full sm:col-span-2" />
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <ContentMetrics>
        {SIGNAL_SKELETON_KEYS.map((key) => (
          <DashboardSignalSkeleton key={key} />
        ))}
      </ContentMetrics>

      <ContentGrid variant="main-aside">
        {DETAIL_SKELETON_KEYS.map((key) => (
          <DashboardSectionSkeleton key={key} />
        ))}
      </ContentGrid>

      <Skeleton aria-hidden="true" className="h-16 w-full rounded-2xl" />
    </ContentRoot>
  );
}

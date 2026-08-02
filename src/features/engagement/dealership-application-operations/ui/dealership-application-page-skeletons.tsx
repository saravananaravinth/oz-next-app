// oz-next-app/src/features/engagement/dealership-application-operations/ui/dealership-application-page-skeletons.tsx
import type * as React from "react";

import { ContentRoot } from "@/components/common/content-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function WorkspaceNavigationSkeleton(): React.ReactElement {
  return (
    <div className="flex min-h-14 items-center gap-2 rounded-2xl border border-border/70 bg-card px-3 py-2 shadow-xs">
      <Skeleton className="hidden h-8 w-40 rounded-xl lg:block" />
      <Skeleton className="h-9 w-32 rounded-xl" />
      <Skeleton className="h-9 w-44 rounded-xl" />
      <Skeleton className="h-9 w-40 rounded-xl" />
    </div>
  );
}

function SurfaceSkeleton({
  className,
  rows = 3,
}: Readonly<{
  className?: string;
  rows?: number;
}>): React.ReactElement {
  return (
    <Card className={className}>
      <CardHeader className="gap-2">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="grid gap-3">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-2xl" />
        ))}
      </CardContent>
    </Card>
  );
}

export function DealershipApplicationsDashboardSkeleton(): React.ReactElement {
  return (
    <ContentRoot
      width="full"
      gutter="none"
      density="compact"
      aria-busy="true"
      aria-label="Loading dealership applications"
      className="max-w-none gap-4"
    >
      <WorkspaceNavigationSkeleton />

      <div className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-2 xl:grid-cols-6">
        <Skeleton className="h-10 rounded-xl sm:col-span-2" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index}>
            <CardContent className="grid gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="size-9 rounded-xl" />
              </div>
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <SurfaceSkeleton rows={2} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(22rem,0.85fr)]">
        <SurfaceSkeleton rows={5} />
        <SurfaceSkeleton rows={5} />
      </div>

      <SurfaceSkeleton rows={7} />
    </ContentRoot>
  );
}

export function DealershipApplicationDetailSkeleton(): React.ReactElement {
  return (
    <ContentRoot
      width="full"
      gutter="none"
      density="compact"
      aria-busy="true"
      aria-label="Loading dealership application"
      className="max-w-none gap-4"
    >
      <WorkspaceNavigationSkeleton />

      <Card>
        <CardContent className="grid gap-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-2">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <Skeleton className="h-9 w-36 rounded-xl" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-3xl" />
            ))}
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)]">
        <SurfaceSkeleton rows={5} />
        <SurfaceSkeleton rows={5} />
      </div>

      <SurfaceSkeleton rows={7} />
      <SurfaceSkeleton rows={5} />
    </ContentRoot>
  );
}

export function DirectOnboardingSkeleton(): React.ReactElement {
  return (
    <ContentRoot
      width="full"
      gutter="none"
      density="compact"
      aria-busy="true"
      aria-label="Loading direct dealer onboarding"
      className="max-w-none gap-4"
    >
      <WorkspaceNavigationSkeleton />
      <Card>
        <CardContent className="grid gap-6 p-6">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-20 rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-16 rounded-xl sm:col-span-2" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <div className="flex justify-end border-t border-border/70 pt-4">
            <Skeleton className="h-10 w-48 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    </ContentRoot>
  );
}

export function DealerListSkeleton(): React.ReactElement {
  return (
    <ContentRoot
      width="full"
      gutter="none"
      density="compact"
      aria-busy="true"
      aria-label="Loading dealers and sub-dealers"
      className="max-w-none gap-4"
    >
      <WorkspaceNavigationSkeleton />
      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-2">
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            <Skeleton className="h-9 w-40 rounded-xl" />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-24 rounded-xl" />
            ))}
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 p-0">
          <Skeleton className="h-11 w-full rounded-none" />
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="mx-4 h-16 rounded-xl" />
          ))}
          <div className="flex justify-end border-t border-border/70 p-4">
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    </ContentRoot>
  );
}

export function DealerDetailSkeleton(): React.ReactElement {
  return (
    <ContentRoot
      width="full"
      gutter="none"
      density="compact"
      aria-busy="true"
      aria-label="Loading dealer workspace"
      className="max-w-none gap-4"
    >
      <WorkspaceNavigationSkeleton />
      <div className="flex justify-end">
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <Card>
        <CardHeader className="gap-3">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
          <div className="flex gap-2 border-b border-border/70 pb-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-28 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <SurfaceSkeleton rows={5} />
            <SurfaceSkeleton rows={5} />
          </div>
        </CardContent>
      </Card>
    </ContentRoot>
  );
}

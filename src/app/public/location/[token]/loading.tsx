// oz-next-app/src/app/public/location/[token]/loading.tsx
import type { ReactElement } from "react";

import {
  ContentFormActions,
  ContentRoot,
  ContentSplit,
} from "@/components/common/content-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicLocationShell } from "@/features/engagement/location-requests/ui/location-request-shell";

export default function PublicLocationLoading(): ReactElement {
  const footerActions = (
    <ContentFormActions
      aria-hidden="true"
      className="mx-auto w-full max-w-7xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent sm:justify-end"
    >
      <Skeleton className="h-11 w-full rounded-2xl sm:w-64" />
    </ContentFormActions>
  );

  return (
    <PublicLocationShell
      footerActions={footerActions}
      mainLabelledBy="public-location-loading-title"
    >
      <ContentRoot
        width="wide"
        density="compact"
        aria-busy="true"
        className="px-3 py-3 sm:px-0 sm:py-0"
      >
        <div className="sr-only" role="status" aria-live="polite">
          <h1 id="public-location-loading-title">
            Preparing secure location request
          </h1>
        </div>

        <Card aria-hidden="true">
          <CardContent className="grid gap-5 p-5 sm:p-6">
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-6 w-36 rounded-full" />
              </div>
              <Skeleton className="h-9 w-72 max-w-full rounded-xl" />
              <Skeleton className="h-5 w-full max-w-2xl rounded-full" />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          </CardContent>
        </Card>

        <ContentSplit
          variant="main-context"
          className="gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem]"
        >
          <Card aria-hidden="true">
            <CardContent className="grid gap-5 p-5 sm:p-6">
              <Skeleton className="h-7 w-56 rounded-xl" />
              <Skeleton className="h-5 w-full max-w-xl rounded-full" />
              <Skeleton className="h-56 w-full rounded-3xl" />
              <div className="grid gap-3 sm:grid-cols-3">
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </div>
              <Skeleton className="h-24 rounded-2xl" />
            </CardContent>
          </Card>

          <Card aria-hidden="true" className="hidden lg:block">
            <CardContent className="grid gap-4 p-5">
              <Skeleton className="h-7 w-40 rounded-xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </CardContent>
          </Card>
        </ContentSplit>
      </ContentRoot>
    </PublicLocationShell>
  );
}

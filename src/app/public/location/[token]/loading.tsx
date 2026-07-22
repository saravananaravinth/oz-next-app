// oz-next-app/src/app/public/location/[token]/loading.tsx
import type { ReactElement } from "react";

import {
  ContentFormActions,
  ContentRoot,
} from "@/components/common/content-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicLocationShell } from "@/features/engagement/location-requests/ui/location-request-shell";

export default function PublicLocationLoading(): ReactElement {
  const footerActions = (
    <ContentFormActions
      aria-hidden="true"
      className="mx-auto w-full max-w-3xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent sm:justify-end"
    >
      <Skeleton className="h-12 w-full rounded-2xl sm:w-64" />
    </ContentFormActions>
  );

  return (
    <PublicLocationShell
      footerActions={footerActions}
      mainLabelledBy="public-location-loading-title"
    >
      <ContentRoot
        width="narrow"
        density="compact"
        aria-busy="true"
        className="max-w-2xl px-3 py-4 sm:px-0 sm:py-2"
      >
        <div className="sr-only" role="status" aria-live="polite">
          <h1 id="public-location-loading-title">
            Preparing secure location request
          </h1>
        </div>

        <div
          aria-hidden="true"
          className="flex items-center justify-between gap-3 px-1"
        >
          <Skeleton className="h-6 w-44 rounded-full" />
          <Skeleton className="h-4 w-36 rounded-full" />
        </div>

        <Card aria-hidden="true" className="border-primary/20">
          <CardContent className="grid gap-6 p-5 sm:p-6">
            <div className="grid justify-items-center gap-4">
              <Skeleton className="size-20 rounded-[1.75rem]" />

              <div className="grid w-full justify-items-center gap-2">
                <Skeleton className="h-9 w-72 max-w-full rounded-xl" />
                <Skeleton className="h-5 w-full max-w-lg rounded-full" />
                <Skeleton className="h-5 w-4/5 max-w-md rounded-full" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>

            <Skeleton className="h-64 w-full rounded-3xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </CardContent>
        </Card>

        <Skeleton
          aria-hidden="true"
          className="mx-auto h-4 w-4/5 max-w-md rounded-full"
        />
      </ContentRoot>
    </PublicLocationShell>
  );
}

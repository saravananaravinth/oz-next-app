// oz-next-app/src/app/erp/public/location/[token]/loading.tsx
import type { ReactElement } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicLocationShell } from "@/features/engagement/public-location/public-location-shell";

export default function PublicLocationLoading(): ReactElement {
  const footerActions = (
    <div className="mx-auto grid w-full max-w-2xl gap-2.5" aria-hidden="true">
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="mx-auto h-3 w-80 max-w-full rounded-full" />
    </div>
  );

  return (
    <PublicLocationShell
      footerActions={footerActions}
      mainLabelledBy="public-location-loading-title"
    >
      <section aria-busy="true" className="flex w-full max-w-2xl">
        <p className="sr-only" role="status" aria-live="polite">
          Preparing secure location request…
        </p>

        <Card
          aria-hidden="true"
          className="min-h-full w-full gap-0 overflow-hidden rounded-none border-x-0 border-y-0 border-border/70 bg-card/96 py-0 shadow-xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl sm:min-h-0 sm:rounded-3xl sm:border"
        >
          <CardHeader className="gap-5 px-4 py-5 sm:px-7 sm:py-7">
            <div className="grid gap-2">
              <Skeleton className="h-3 w-32 rounded-full" />
              <h1 id="public-location-loading-title">
                <Skeleton className="h-8 w-72 max-w-full rounded-full" />
              </h1>
              <Skeleton className="h-5 w-full max-w-xl rounded-full" />
              <Skeleton className="h-5 w-4/5 max-w-lg rounded-full" />
            </div>
          </CardHeader>

          <CardContent className="grid gap-5 px-4 pb-7 sm:px-7 sm:pb-8">
            <Skeleton className="h-56 w-full rounded-2xl" />

            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>

            <Skeleton className="h-24 w-full rounded-2xl" />
          </CardContent>
        </Card>
      </section>
    </PublicLocationShell>
  );
}

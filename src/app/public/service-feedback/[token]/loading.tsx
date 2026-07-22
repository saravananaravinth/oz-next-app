// oz-next-app/src/app/public/service-feedback/[token]/loading.tsx
import type { ReactElement } from "react";

import {
  ContentFormActions,
  ContentRoot,
} from "@/components/common/content-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicServiceFeedbackShell } from "@/features/engagement/service-feedback";

export default function ServiceFeedbackLoading(): ReactElement {
  const footerActions = (
    <ContentFormActions
      aria-hidden="true"
      className="mx-auto w-full max-w-3xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent sm:justify-end"
    >
      <div className="grid w-full grid-cols-2 gap-2 sm:w-80">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </ContentFormActions>
  );

  return (
    <PublicServiceFeedbackShell
      footerActions={footerActions}
      mainLabelledBy="service-feedback-loading-title"
    >
      <ContentRoot
        width="narrow"
        density="compact"
        aria-busy="true"
        className="max-w-3xl px-3 py-4 sm:px-0 sm:py-2"
      >
        <div className="sr-only" role="status" aria-live="polite">
          <h1 id="service-feedback-loading-title">
            Preparing secure feedback form
          </h1>
        </div>

        <div
          aria-hidden="true"
          className="flex items-center justify-between gap-3 px-1"
        >
          <Skeleton className="h-6 w-48 rounded-full" />
          <Skeleton className="h-4 w-32 rounded-full" />
        </div>

        <Card aria-hidden="true" className="border-primary/20">
          <CardContent className="grid gap-5 p-5 sm:p-6">
            <div className="grid gap-3 border-b border-border/70 pb-5">
              <div className="flex justify-between gap-4">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>

              <Skeleton className="h-2 w-full rounded-full" />

              <div className="hidden grid-cols-4 gap-2 sm:grid">
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>

              <div className="grid gap-2 pt-1">
                <Skeleton className="h-9 w-72 max-w-full rounded-xl" />
                <Skeleton className="h-5 w-full max-w-xl rounded-full" />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl sm:col-span-2" />
              <Skeleton className="h-24 w-full rounded-2xl sm:col-span-2" />
            </div>
          </CardContent>
        </Card>

        <Skeleton
          aria-hidden="true"
          className="mx-auto h-4 w-4/5 max-w-md rounded-full"
        />
      </ContentRoot>
    </PublicServiceFeedbackShell>
  );
}

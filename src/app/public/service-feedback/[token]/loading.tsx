// oz-next-app/src/app/public/service-feedback/[token]/loading.tsx
import type { ReactElement } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicServiceFeedbackShell } from "@/features/engagement/public-service-feedback";

export default function ServiceFeedbackLoading(): ReactElement {
  const footerActions = (
    <div className="mx-auto grid w-full max-w-3xl gap-2.5" aria-hidden="true">
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
      <Skeleton className="mx-auto h-3 w-80 max-w-full" />
    </div>
  );

  return (
    <PublicServiceFeedbackShell
      footerActions={footerActions}
      mainLabelledBy="service-feedback-loading-title"
    >
      <section aria-busy="true" className="flex w-full max-w-3xl sm:px-0">
        <p className="sr-only" role="status" aria-live="polite">
          Preparing secure feedback form…
        </p>

        <Card
          aria-hidden="true"
          className="w-full gap-0 overflow-hidden rounded-none border-x-0 border-y-0 border-border/70 bg-card/96 py-0 shadow-xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl sm:rounded-3xl sm:border"
        >
          <CardHeader className="gap-5 px-4 py-5 sm:px-7 sm:py-7">
            <div className="grid gap-2">
              <Skeleton className="h-3 w-40" />
              <h1 id="service-feedback-loading-title">
                <Skeleton className="h-8 w-64 max-w-full" />
              </h1>
              <Skeleton className="h-5 w-full max-w-xl" />
            </div>
            <div className="grid gap-3">
              <div className="flex justify-between gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 px-4 pb-6 sm:px-7 sm:pb-7">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </CardContent>
        </Card>
      </section>
    </PublicServiceFeedbackShell>
  );
}

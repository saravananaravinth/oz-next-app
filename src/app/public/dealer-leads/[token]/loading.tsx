// oz-next-app/src/app/erp/public/dealer-leads/[token]/loading.tsx
import type { ReactElement } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicDealerLeadShell } from "@/features/engagement/public-dealer-leads/public-dealer-lead-shell";

export default function PublicDealerLeadLoading(): ReactElement {
  const footerActions = (
    <div className="mx-auto grid w-full max-w-4xl gap-2.5">
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="mx-auto h-3 w-72 max-w-full" />
    </div>
  );

  return (
    <PublicDealerLeadShell
      footerActions={footerActions}
      mainLabelledBy="dealer-lead-loading-title"
    >
      <section aria-busy="true" className="w-full max-w-4xl">
        <p
          id="dealer-lead-loading-title"
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          Loading secure vehicle enquiry follow-up…
        </p>

        <Card className="w-full gap-0 overflow-hidden rounded-none border-x-0 border-y-0 border-border/70 bg-card/96 py-0 shadow-xl shadow-foreground/5 sm:rounded-3xl sm:border">
          <CardHeader className="gap-4 px-4 py-5 sm:px-7 sm:py-7">
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-8 w-72 max-w-full" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </CardHeader>

          <CardContent className="grid gap-6 px-4 pb-6 sm:px-7 sm:pb-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="grid gap-4">
              <Skeleton className="h-64 w-full rounded-3xl" />
              <Skeleton className="h-56 w-full rounded-3xl" />
            </div>

            <div className="grid gap-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </div>
              <Skeleton className="h-96 w-full rounded-3xl" />
            </div>
          </CardContent>
        </Card>
      </section>
    </PublicDealerLeadShell>
  );
}

// oz-next-app/src/app/public/dealer-leads/[token]/loading.tsx
import type { ReactElement } from "react";

import {
  ContentFormActions,
  ContentRoot,
} from "@/components/common/content-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicDealerLeadShell } from "@/features/engagement/dealer-lead-updates/ui/dealer-lead-shell";

const WORKFLOW_STEP_KEYS = [
  "action",
  "details",
  "schedule",
  "note",
  "history",
] as const;

export default function PublicDealerLeadLoading(): ReactElement {
  const footerActions = (
    <ContentFormActions
      aria-hidden="true"
      className="mx-auto w-full max-w-4xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent sm:justify-end"
    >
      <Skeleton className="h-12 w-full rounded-2xl sm:w-64" />
    </ContentFormActions>
  );

  return (
    <PublicDealerLeadShell
      footerActions={footerActions}
      mainLabelledBy="dealer-lead-loading-title"
    >
      <ContentRoot
        width="narrow"
        density="compact"
        className="max-w-4xl px-3 py-4 sm:px-0 sm:py-2"
        aria-busy="true"
      >
        <div className="sr-only" role="status" aria-live="polite">
          <h1 id="dealer-lead-loading-title">
            Loading secure customer enquiry follow-up
          </h1>
        </div>

        <div
          aria-hidden="true"
          className="flex items-center justify-between gap-3 px-1"
        >
          <Skeleton className="h-6 w-44 rounded-full" />
          <Skeleton className="h-4 w-32 rounded-full" />
        </div>

        <Card aria-hidden="true" className="border-primary/20 shadow-lg">
          <CardContent className="grid gap-5 p-5 sm:p-6">
            <div className="grid gap-3 border-b border-border/70 pb-5">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-6 w-36 rounded-full" />
              </div>

              <Skeleton className="h-9 w-72 max-w-full rounded-2xl" />
              <Skeleton className="h-4 w-full max-w-2xl rounded-full" />

              <div className="grid gap-2 sm:grid-cols-2">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/70 p-1.5">
              <div className="flex w-max min-w-full gap-1">
                {WORKFLOW_STEP_KEYS.map((key) => (
                  <Skeleton
                    key={key}
                    className="h-14 min-w-[9.25rem] flex-1 rounded-xl"
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card aria-hidden="true">
          <CardContent className="grid gap-5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 rounded-2xl" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-7 w-64 max-w-full rounded-xl" />
                <Skeleton className="h-4 w-full max-w-xl rounded-full" />
              </div>
            </div>

            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </CardContent>
        </Card>
      </ContentRoot>
    </PublicDealerLeadShell>
  );
}

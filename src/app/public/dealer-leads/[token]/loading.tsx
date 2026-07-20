// oz-next-app/src/app/public/dealer-leads/[token]/loading.tsx
import type { ReactElement } from "react";

import {
  ContentRoot,
  ContentSection,
  ContentSkeleton,
  ContentSplit,
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
  return (
    <PublicDealerLeadShell mainLabelledBy="dealer-lead-loading-title">
      <ContentRoot
        width="wide"
        density="compact"
        className="px-3 py-3 sm:px-0 sm:py-0"
        aria-busy="true"
      >
        <div className="sr-only" role="status" aria-live="polite">
          <h1 id="dealer-lead-loading-title">
            Loading secure vehicle enquiry follow-up
          </h1>
        </div>

        <Card aria-hidden="true" className="border-primary/20 shadow-lg">
          <CardContent className="grid gap-5">
            <div className="grid gap-3">
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

            <div className="-mx-1 overflow-hidden rounded-2xl border border-border/70 p-1.5">
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

        <ContentSplit
          variant="main-context"
          className="gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-6 2xl:grid-cols-[minmax(0,1fr)_21rem]"
        >
          <ContentSection aria-hidden="true">
            <ContentSkeleton
              variant="form"
              rows={4}
              label="Loading follow-up form"
            />
          </ContentSection>

          <aside className="hidden lg:block" aria-hidden="true">
            <ContentSection>
              <ContentSkeleton
                variant="section"
                rows={4}
                label="Loading lead summary"
              />
            </ContentSection>
          </aside>
        </ContentSplit>
      </ContentRoot>
    </PublicDealerLeadShell>
  );
}

// oz-next-app/src/app/public/service-feedback/[token]/loading.tsx
import type { ReactElement } from "react";

import {
  ContentFormActions,
  ContentRoot,
  ContentSection,
} from "@/components/common/content-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicServiceFeedbackShell } from "@/features/engagement/service-feedback";

export default function ServiceFeedbackLoading(): ReactElement {
  const footerActions = (
    <ContentFormActions
      aria-hidden="true"
      className="mx-auto w-full max-w-7xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent"
    >
      <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:w-72">
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </ContentFormActions>
  );

  return (
    <PublicServiceFeedbackShell
      footerActions={footerActions}
      mainLabelledBy="service-feedback-loading-title"
    >
      <ContentRoot
        width="wide"
        density="compact"
        className="px-3 py-3 sm:px-0 sm:py-0"
      >
        <p className="sr-only" role="status" aria-live="polite">
          Preparing secure feedback form…
        </p>

        <ContentSection aria-busy="true" className="shadow-lg">
          <div aria-hidden="true" className="grid gap-5">
            <div className="grid gap-2">
              <Skeleton className="h-5 w-40 rounded-full" />
              <h1 id="service-feedback-loading-title">
                <Skeleton className="h-9 w-64 max-w-full rounded-xl" />
              </h1>
              <Skeleton className="h-5 w-full max-w-xl rounded-full" />
            </div>

            <div className="grid gap-3">
              <div className="flex justify-between gap-4">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl sm:col-span-2" />
            </div>
          </div>
        </ContentSection>
      </ContentRoot>
    </PublicServiceFeedbackShell>
  );
}

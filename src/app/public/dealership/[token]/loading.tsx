// oz-next-app/src/app/public/dealership/[token]/loading.tsx
import type { ReactElement } from "react";

import {
  ContentFormActions,
  ContentRoot,
  ContentSection,
  ContentSkeleton,
} from "@/components/common/content-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicDealershipShell } from "@/features/engagement/dealership-applications/ui/dealership-application-shell";

export default function PublicDealershipFormLoading(): ReactElement {
  const footerActions = (
    <ContentFormActions className="mx-auto grid w-full max-w-4xl grid-cols-2 border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent">
      <Skeleton className="h-11 w-full rounded-2xl" />
      <Skeleton className="h-11 w-full rounded-2xl" />
    </ContentFormActions>
  );

  return (
    <PublicDealershipShell
      footerActions={footerActions}
      mainLabelledBy="dealership-loading-title"
    >
      <ContentRoot
        width="wide"
        density="compact"
        className="px-3 py-3 sm:px-0 sm:py-0"
        aria-busy="true"
      >
        <div className="sr-only" role="status" aria-live="polite">
          <h1 id="dealership-loading-title">
            Preparing dealership application form
          </h1>
        </div>

        <ContentSection className="border-primary/15 bg-card/90 shadow-md">
          <div className="grid gap-4">
            <Skeleton className="h-5 w-44 rounded-full" />
            <Skeleton className="h-10 w-80 max-w-full rounded-2xl" />
            <Skeleton className="h-5 w-full max-w-2xl rounded-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </ContentSection>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <ContentSection>
            <ContentSkeleton
              variant="form"
              rows={4}
              label="Loading dealership form fields"
            />
          </ContentSection>

          <ContentSection className="hidden lg:block">
            <ContentSkeleton
              variant="section"
              rows={3}
              label="Loading application guidance"
            />
          </ContentSection>
        </div>
      </ContentRoot>
    </PublicDealershipShell>
  );
}

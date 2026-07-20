// oz-next-app/src/app/public/warranty/[token]/loading.tsx
import type { ReactElement } from "react";

import {
  ContentFormActions,
  ContentHeader,
  ContentRoot,
  ContentSection,
  ContentSplit,
} from "@/components/common/content-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicWarrantyShell } from "@/features/engagement/warranty-applications";

export default function WarrantyApplicationLoading(): ReactElement {
  const footerActions = (
    <ContentFormActions
      aria-hidden="true"
      className="mx-auto w-full max-w-7xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent sm:justify-between"
    >
      <Skeleton className="hidden h-10 w-48 sm:block" />
      <div className="grid w-full grid-cols-2 gap-2 sm:w-72">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </ContentFormActions>
  );

  return (
    <PublicWarrantyShell
      footerActions={footerActions}
      mainLabelledBy="warranty-loading-title"
    >
      <p
        id="warranty-loading-title"
        className="sr-only"
        role="status"
        aria-live="polite"
      >
        Preparing warranty application…
      </p>

      <ContentRoot
        width="wide"
        density="compact"
        className="px-3 py-3 sm:px-0 sm:py-0"
        aria-busy="true"
      >
        <ContentHeader
          variant="compact"
          eyebrow={<Skeleton className="h-6 w-44 rounded-full" />}
          title={<Skeleton className="h-8 w-64 max-w-full" />}
          description={<Skeleton className="h-5 w-full max-w-xl" />}
          meta={
            <div className="grid w-full gap-2 sm:grid-cols-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="hidden h-10 w-full rounded-xl sm:block" />
            </div>
          }
          cardClassName="border-primary/20 bg-card/92 shadow-lg shadow-primary/5"
        >
          <div className="mt-4 grid gap-3 border-t border-border/70 pt-4">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </ContentHeader>

        <ContentSplit
          variant="main-context"
          className="gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6"
        >
          <ContentSection className="border-primary/15 bg-card/94 shadow-md">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-11 w-full" />
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-11 w-full" />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-11 w-full" />
              </div>
            </div>
          </ContentSection>

          <ContentSection className="hidden bg-card/90 shadow-md lg:block">
            <div className="grid gap-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </ContentSection>
        </ContentSplit>
      </ContentRoot>
    </PublicWarrantyShell>
  );
}

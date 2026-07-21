// oz-next-app/src/app/public/dealership/[token]/loading.tsx
import type { ReactElement } from "react";

import { ContentRoot, ContentSection } from "@/components/common/content-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicDealershipShell } from "@/features/engagement/dealership-applications/ui/dealership-application-shell";

export default function PublicDealershipFormLoading(): ReactElement {
  return (
    <PublicDealershipShell mainLabelledBy="dealership-loading-title">
      <ContentRoot
        width="narrow"
        density="compact"
        className="max-w-xl"
        aria-busy="true"
      >
        <div className="grid gap-3 px-1">
          <div className="sr-only" role="status" aria-live="polite">
            <h1 id="dealership-loading-title">
              Preparing dealership application
            </h1>
          </div>
          <Skeleton className="h-7 w-80 max-w-full rounded-lg" />
          <Skeleton className="h-4 w-64 max-w-full rounded-full" />
          <div className="grid gap-2.5 pt-1">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3.5 w-24 rounded-full" />
              <Skeleton className="h-3.5 w-28 rounded-full" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        </div>

        <ContentSection className="border-primary/15 bg-card/95 shadow-lg shadow-primary/5">
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Skeleton className="h-6 w-72 max-w-full rounded-lg" />
              <Skeleton className="h-4 w-52 max-w-full rounded-full" />
            </div>
            <div className="grid gap-2.5">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </ContentSection>
      </ContentRoot>
    </PublicDealershipShell>
  );
}

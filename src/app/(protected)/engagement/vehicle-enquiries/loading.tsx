// oz-next-app/src/app/(protected)/engagement/vehicle-enquiries/loading.tsx
import type { ReactElement } from "react";

import {
  ContentGrid,
  ContentRoot,
  ContentSection,
  ContentSkeleton,
} from "@/components/common/content-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function VehicleEnquiriesLoading(): ReactElement {
  return (
    <ContentRoot
      width="full"
      gutter="none"
      density="compact"
      className="max-w-none gap-4"
      aria-busy="true"
      aria-label="Loading Vehicle Enquiries command center"
    >
      <section className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-xs">
        <div className="flex min-w-0 gap-2 overflow-hidden p-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-28 shrink-0 rounded-xl" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border/70 bg-muted/20 p-3">
          <Skeleton className="h-10 w-40 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="ms-auto h-10 w-24 rounded-xl" />
        </div>
      </section>

      <Skeleton className="h-[60px] w-full rounded-2xl" />
      <ContentSkeleton
        variant="section"
        rows={2}
        label="Loading command center status"
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <ContentSkeleton
            key={index}
            variant="section"
            rows={2}
            label={`Loading Vehicle Enquiries metric ${String(index + 1)}`}
          />
        ))}
      </section>

      <ContentGrid variant="two">
        <ContentSkeleton
          variant="section"
          rows={5}
          label="Loading lifecycle analytics"
        />
        <ContentSkeleton
          variant="section"
          rows={5}
          label="Loading incident analytics"
        />
      </ContentGrid>

      <ContentSection>
        <ContentSkeleton
          variant="table"
          rows={7}
          label="Loading Vehicle Enquiries incidents"
        />
      </ContentSection>

      <ContentSection>
        <ContentSkeleton
          variant="table"
          rows={8}
          label="Loading Vehicle Enquiries leads"
        />
      </ContentSection>
    </ContentRoot>
  );
}

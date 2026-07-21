// oz-next-app/src/app/(protected)/inventory/vehicles/loading.tsx
import type { ReactElement } from "react";

import {
  ContentHeader,
  ContentRoot,
  ContentSection,
  ContentSkeleton,
} from "@/components/common/content-shell";

export default function VehicleInventoryLoading(): ReactElement {
  return (
    <ContentRoot width="full" aria-busy="true" aria-live="polite">
      <ContentHeader title="Vehicle inventory" />

      <section
        aria-label="Loading inventory KPIs"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <ContentSkeleton
            key={index}
            variant="section"
            rows={2}
            label={`Loading inventory metric ${String(index + 1)}`}
          />
        ))}
      </section>

      <ContentSection>
        <ContentSkeleton
          variant="form"
          rows={3}
          label="Loading inventory controls"
        />
      </ContentSection>

      <ContentSection>
        <ContentSkeleton
          variant="table"
          rows={8}
          label="Loading authorized vehicle stock"
        />
      </ContentSection>
    </ContentRoot>
  );
}

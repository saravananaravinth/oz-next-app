// oz-next-app/src/app/(protected)/engagement/vehicle-enquiries/error.tsx
"use client";

import type { ReactElement } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import {
  ContentHeader,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";

export default function VehicleEnquiriesError({
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>): ReactElement {
  return (
    <ContentRoot width="default">
      <ContentHeader
        eyebrow="Vehicle Enquiries"
        icon={<TriangleAlert aria-hidden="true" />}
        iconTone="destructive"
        title="Command center could not be rendered"
        description="The route failed before the independently handled engagement sections could render. Retry the server view; no mutation is performed by this action."
      />
      <ContentStatus
        variant="destructive"
        title="Vehicle Enquiries view unavailable"
        description="The active session and tenant scope remain unchanged. If the failure continues, use the existing engagement dashboard while the route is investigated."
        actions={
          <Button type="button" onClick={reset}>
            <RefreshCw aria-hidden="true" />
            Retry
          </Button>
        }
      />
    </ContentRoot>
  );
}

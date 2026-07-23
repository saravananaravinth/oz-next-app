// oz-next-app/src/app/(protected)/engagement/dashboard/error.tsx
"use client";

import type { ReactElement } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { ContentRoot, ContentStatus } from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";

type EngagementDashboardErrorProps = Readonly<{
  error: Error & { readonly digest?: string };
  reset: () => void;
}>;

const SAFE_REFERENCE = /^[A-Za-z0-9._:-]{1,128}$/u;

export default function EngagementDashboardError({
  error,
  reset,
}: EngagementDashboardErrorProps): ReactElement {
  const digest = error.digest?.trim() ?? "";
  const reference = SAFE_REFERENCE.test(digest) ? digest : null;
  return (
    <ContentRoot width="default">
      <ContentStatus
        variant="destructive"
        icon={<AlertTriangle aria-hidden="true" />}
        title="Engagement dashboard could not be opened"
        description={
          reference === null
            ? "Retry the dashboard. No mutation was performed."
            : `Retry the dashboard. Reference: ${reference}`
        }
        actions={
          <Button type="button" onClick={reset}>
            <RefreshCw aria-hidden="true" className="size-4" /> Try again
          </Button>
        }
      />
    </ContentRoot>
  );
}

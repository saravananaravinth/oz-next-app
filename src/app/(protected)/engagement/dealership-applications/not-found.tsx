// oz-next-app/src/app/(protected)/engagement/dealership-applications/not-found.tsx
import type { ReactElement } from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";

import {
  ContentHeader,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";

export default function DealershipApplicationNotFound(): ReactElement {
  return (
    <ContentRoot width="default">
      <ContentHeader
        eyebrow="Engagement operations"
        icon={<SearchX aria-hidden="true" />}
        iconTone="warning"
        title="Dealership application not found"
        description="The record does not exist, is no longer available, or is outside the authenticated organization scope."
      />
      <ContentStatus
        variant="warning"
        title="Open the current work queue"
        description="No application data was disclosed for this identifier."
        actions={
          <Button asChild>
            <Link href="/engagement/dealership-applications">
              Back to applications
            </Link>
          </Button>
        }
      />
    </ContentRoot>
  );
}

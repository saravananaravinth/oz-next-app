// oz-next-app/src/app/(protected)/engagement/dashboard/not-found.tsx
import Link from "next/link";
import type { ReactElement } from "react";
import { ArrowLeft, SearchX } from "lucide-react";

import {
  ContentHeader,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";
import { ENGAGEMENT_DASHBOARD_ROUTES } from "@/features/engagement/operations-dashboard";

export default function EngagementDashboardNotFound(): ReactElement {
  return (
    <ContentRoot width="narrow">
      <ContentHeader
        eyebrow="Vehicle sales engagement"
        icon={<SearchX aria-hidden="true" />}
        iconTone="warning"
        title="Engagement record not found"
        description="The record may have been removed, moved, or become unavailable in the active actor and tenant context."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={ENGAGEMENT_DASHBOARD_ROUTES.overview}>
                <ArrowLeft aria-hidden="true" className="size-4" />
                Back to overview
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href={ENGAGEMENT_DASHBOARD_ROUTES.dealers}>
                Open dealer performance
              </Link>
            </Button>
          </div>
        }
      />

      <ContentStatus
        variant="warning"
        title="No resource was rendered"
        description="The route returned a not-found result without disclosing whether an inaccessible resource exists outside the authorized scope."
      />
    </ContentRoot>
  );
}

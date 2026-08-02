import type * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ContentRoot } from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";
import type { ResolvedDealershipApplicationAccess } from "@/features/engagement/dealership-application-operations/policies/dealership-application.policy";
import type { DealerOperationDetail } from "@/features/engagement/dealer-operations/contracts/dealer-operations.schema";
import { DealerDetailWorkbench } from "@/features/engagement/dealer-operations/ui/dealer-detail-workbench";
import { DEALER_OPERATIONS_ROUTES } from "@/features/engagement/dealer-operations/utils/dealer-operations-url";

export type DealerDetailPageProps = Readonly<{
  access: ResolvedDealershipApplicationAccess;
  detail: DealerOperationDetail;
}>;

export function DealerDetailPage({
  access,
  detail,
}: DealerDetailPageProps): React.ReactElement {
  return (
    <ContentRoot
      width="full"
      gutter="none"
      density="compact"
      className="max-w-none gap-4"
    >
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href={DEALER_OPERATIONS_ROUTES.dealers}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to dealers
          </Link>
        </Button>
      </div>
      <DealerDetailWorkbench access={access} detail={detail} />
    </ContentRoot>
  );
}

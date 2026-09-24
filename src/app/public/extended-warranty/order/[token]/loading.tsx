// oz-next-app/src/app/public/extended-warranty/order/[token]/loading.tsx
import type { ReactElement } from "react";

import {
  ContentRoot,
  ContentSkeleton,
} from "@/components/common/content-shell";

export default function ExtendedWarrantyOrderStatusLoading(): ReactElement {
  return (
    <ContentRoot width="default" className="py-8">
      <ContentSkeleton variant="page" />
    </ContentRoot>
  );
}

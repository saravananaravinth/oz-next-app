// oz-next-app/src/app/public/extended-warranty/order/[token]/error.tsx
"use client";

import { RefreshCw } from "lucide-react";
import type { ReactElement } from "react";

import {
  ContentFormActions,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";

export default function ExtendedWarrantyOrderStatusError({
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>): ReactElement {
  return (
    <ContentRoot width="narrow" className="py-12">
      <ContentStatus
        variant="destructive"
        title="Order status unavailable"
        description="The secure Extended Warranty order page could not be loaded."
        actions={
          <ContentFormActions>
            <Button type="button" onClick={reset}>
              <RefreshCw aria-hidden="true" />
              Try again
            </Button>
          </ContentFormActions>
        }
        announce="assertive"
      />
    </ContentRoot>
  );
}

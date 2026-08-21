// oz-next-app/src/app/(protected)/settings/integrations/zoho-inventory/error.tsx
"use client";

import type { ReactElement } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ContentRoot, ContentStatus } from "@/components/common/content-shell";

type ZohoInventoryIntegrationErrorProps = Readonly<{
  error: Error & { readonly digest?: string };
  reset: () => void;
}>;

const SAFE_DIGEST_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/u;

export default function ZohoInventoryIntegrationError({
  error,
  reset,
}: ZohoInventoryIntegrationErrorProps): ReactElement {
  const digest = error.digest?.trim() ?? "";
  const safeDigest = SAFE_DIGEST_PATTERN.test(digest) ? digest : null;

  return (
    <ContentRoot width="wide">
      <ContentStatus
        variant="destructive"
        icon={<TriangleAlert aria-hidden="true" />}
        title="Zoho Inventory workspace could not be loaded"
        description={
          <span className="grid gap-2">
            <span>
              The integration state could not be read safely. No provider-side
              change should be assumed from this page failure.
            </span>
            {safeDigest === null ? null : (
              <span className="text-caption">Reference: {safeDigest}</span>
            )}
          </span>
        }
        actions={
          <Button type="button" variant="outline" onClick={reset}>
            Try again
          </Button>
        }
      />
    </ContentRoot>
  );
}

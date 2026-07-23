// oz-next-app/src/features/engagement/operations-dashboard/ui/dealer-configuration-sheet.tsx
"use client";

import type * as React from "react";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import type { EngagementDealerDetail } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import { DealerConfigurationForms } from "@/features/engagement/operations-dashboard/ui/dealer-configuration-forms";

export type DealerConfigurationSheetProps = Readonly<{
  dealer: EngagementDealerDetail;
  tenantId: string | undefined;
  canUpdateSettings: boolean;
  canUpdateLocation: boolean;
  triggerLabel?: string;
}>;

export function DealerConfigurationSheet({
  dealer,
  tenantId,
  canUpdateSettings,
  canUpdateLocation,
  triggerLabel = "Configure dealer",
}: DealerConfigurationSheetProps): React.ReactElement {
  const canUpdate = canUpdateSettings || canUpdateLocation;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" disabled={!canUpdate}>
          <Settings2 aria-hidden="true" className="size-4" />
          {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-3xl"
      >
        <SheetHeader>
          <SheetTitle>Configure {dealer.dealerName}</SheetTitle>
          <SheetDescription>
            Dedicated permission-gated forms use strict validation, stable
            idempotency keys, row-version concurrency, and mandatory audit
            reasons.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <DealerConfigurationForms
            dealer={dealer}
            tenantId={tenantId}
            canUpdateSettings={canUpdateSettings}
            canUpdateLocation={canUpdateLocation}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

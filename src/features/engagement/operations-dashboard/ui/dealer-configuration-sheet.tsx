// oz-next-app/src/features/engagement/operations-dashboard/ui/dealer-configuration-sheet.tsx
"use client";

import type * as React from "react";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { EngagementDealerDetail } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import { DealerConfigurationForms } from "@/features/engagement/operations-dashboard/ui/dealer-configuration-forms";

export type DealerConfigurationSheetProps = Readonly<{
  dealer: EngagementDealerDetail;
  canUpdateSettings: boolean;
  canUpdateLocation: boolean;
  triggerLabel?: string;
}>;

export function DealerConfigurationSheet({
  dealer,
  canUpdateSettings,
  canUpdateLocation,
  triggerLabel = "Configure dealer",
}: DealerConfigurationSheetProps): React.ReactElement {
  const canUpdate = canUpdateSettings || canUpdateLocation;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" disabled={!canUpdate}>
          <Settings2 aria-hidden="true" className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent height="viewport" className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Configure {dealer.dealerName}</DialogTitle>
          <DialogDescription>
            Dedicated permission-gated forms use strict validation, stable
            idempotency keys, row-version concurrency, and mandatory audit
            reasons.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <DealerConfigurationForms
            dealer={dealer}
            canUpdateSettings={canUpdateSettings}
            canUpdateLocation={canUpdateLocation}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

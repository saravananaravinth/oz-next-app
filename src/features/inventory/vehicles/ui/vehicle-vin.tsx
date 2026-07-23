// oz-next-app/src/features/inventory/vehicles/ui/vehicle-vin.tsx
"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function maskVin(vin: string): string {
  const suffixLength = Math.min(6, vin.length);
  const suffix = vin.slice(-suffixLength);

  return `${"•".repeat(Math.max(4, vin.length - suffixLength))}${suffix}`;
}

export function VehicleVin({
  vin,
}: Readonly<{ vin: string | null }>): React.ReactElement {
  const [revealed, setRevealed] = React.useState(false);

  if (vin === null) {
    return (
      <span className="font-mono text-caption text-muted-readable">
        VIN not available
      </span>
    );
  }

  const actionLabel = revealed ? "Hide full VIN" : "Reveal full VIN";

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span
        className="min-w-0 truncate font-mono text-caption text-muted-readable"
        aria-live="polite"
      >
        {revealed ? vin : maskVin(vin)}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0"
            aria-pressed={revealed}
            aria-label={actionLabel}
            onClick={() => {
              setRevealed((current) => !current);
            }}
          >
            {revealed ? (
              <EyeOff aria-hidden="true" className="size-3.5" />
            ) : (
              <Eye aria-hidden="true" className="size-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{actionLabel}</TooltipContent>
      </Tooltip>
    </span>
  );
}

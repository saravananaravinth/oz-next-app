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
      <span className="inline-flex min-h-7 items-center rounded-lg border border-border/60 bg-muted/30 px-2 font-mono text-[0.6875rem] text-muted-readable">
        VIN not available
      </span>
    );
  }

  const actionLabel = revealed ? "Hide full VIN" : "Show full VIN";

  return (
    <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5">
      <code
        className="block min-w-0 truncate rounded-lg border border-border/60 bg-muted/30 px-2 py-1 font-mono text-[0.6875rem] tracking-[0.035em] text-foreground"
        aria-live="polite"
      >
        {revealed ? vin : maskVin(vin)}
      </code>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-7 shrink-0 rounded-lg"
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

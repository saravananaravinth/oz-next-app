// oz-next-app/src/features/inventory/vehicles/ui/vehicle-inventory-components-hover-card.tsx
"use client";

import * as React from "react";
import { Copy, PackageSearch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useToast } from "@/shared/hooks/use-toast";

import type { VehicleInventoryItem } from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";

type InstalledComponent = VehicleInventoryItem["components"][number];

function humanizeToken(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll("_", " ")
    .replace(/(^|\s)\p{L}/gu, (match) => match.toLocaleUpperCase("en-US"));
}

function componentSummary(components: readonly InstalledComponent[]): string {
  if (components.length === 0) {
    return "No installed component details";
  }

  const typeCount = new Set(components.map((component) => component.type)).size;
  const serialCount = components.reduce(
    (sum, component) => sum + component.serialNumbers.length,
    0,
  );

  return `${typeCount.toLocaleString("en-IN")} component type${typeCount === 1 ? "" : "s"} · ${serialCount.toLocaleString("en-IN")} serial${serialCount === 1 ? "" : "s"}`;
}

export function VehicleInventoryComponentsHoverCard({
  components,
}: Readonly<{
  components: readonly InstalledComponent[];
}>): React.ReactElement {
  const toast = useToast();
  const summary = componentSummary(components);

  async function copySerialNumber(serialNumber: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(serialNumber);
      toast.success({
        title: "Serial number copied",
        description: "The installed component serial number is ready to paste.",
        replace: true,
      });
    } catch {
      toast.error({
        title: "Serial number could not be copied",
        description:
          "Select the serial number manually and copy it from this card.",
        replace: true,
      });
    }
  }

  return (
    <HoverCard openDelay={220} closeDelay={180}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md text-left text-caption text-muted-readable outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/45 motion-reduce:transition-none"
          aria-label={`${summary}. Open installed component details.`}
        >
          <PackageSearch aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{summary}</span>
        </button>
      </HoverCardTrigger>

      <HoverCardContent
        align="start"
        side="bottom"
        className="w-[min(27rem,calc(100vw-2rem))] overflow-hidden p-0"
      >
        <div className="border-b border-border/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <PackageSearch aria-hidden="true" className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-card-title text-foreground">
                Installed components
              </p>
              <p className="truncate text-caption text-muted-readable">
                {summary}
              </p>
            </div>
          </div>
        </div>

        {components.length === 0 ? (
          <p className="px-4 py-5 text-body-sm text-muted-readable">
            Installed component details are not available for this vehicle.
          </p>
        ) : (
          <div className="scrollbar-compact max-h-72 space-y-2 overflow-y-auto overscroll-contain p-3">
            {components.map((component, componentIndex) => (
              <section
                key={`${component.type}-${String(componentIndex)}`}
                className="rounded-xl border border-border/70 bg-muted/25 p-3"
                aria-label={humanizeToken(component.type)}
              >
                <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-body-sm font-medium text-foreground">
                    {humanizeToken(component.type)}
                  </span>
                  <Badge variant="secondary" className="shrink-0 text-tabular">
                    {component.serialNumbers.length.toLocaleString("en-IN")}{" "}
                    serial
                    {component.serialNumbers.length === 1 ? "" : "s"}
                  </Badge>
                </div>

                {component.serialNumbers.length === 0 ? (
                  <p className="text-caption text-muted-readable">
                    Serial number unavailable
                  </p>
                ) : (
                  <div className="grid gap-1.5">
                    {component.serialNumbers.map(
                      (serialNumber, serialIndex) => (
                        <div
                          key={`${serialNumber}-${String(serialIndex)}`}
                          className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border/60 bg-background/75 px-2.5 py-1.5"
                        >
                          <code className="min-w-0 select-all truncate font-mono text-[0.6875rem] text-foreground">
                            {serialNumber}
                          </code>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="size-7 shrink-0"
                            aria-label={`Copy serial number ${String(serialIndex + 1)} for ${humanizeToken(component.type)}`}
                            onClick={() => {
                              void copySerialNumber(serialNumber);
                            }}
                          >
                            <Copy aria-hidden="true" className="size-3.5" />
                          </Button>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

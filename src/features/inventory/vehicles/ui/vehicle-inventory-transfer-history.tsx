// oz-next-app/src/features/inventory/vehicles/ui/vehicle-inventory-transfer-history.tsx
"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Clock3,
  MapPin,
  RefreshCw,
  Warehouse,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { loadVehicleInventoryTransferHistoryAction } from "@/features/inventory/vehicles/actions/vehicle-inventory.actions";
import type { VehicleInventoryTransferHistoryResult } from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
import type { VehicleInventoryContext } from "@/features/inventory/vehicles/policies/vehicle-inventory.policy";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

type TransferHistoryState =
  | Readonly<{ kind: "idle" | "loading" }>
  | Readonly<{
      kind: "success";
      data: VehicleInventoryTransferHistoryResult;
    }>
  | Readonly<{
      kind: "error";
      message: string;
      requestId: string | null;
    }>;

type TransferLocation = NonNullable<
  VehicleInventoryTransferHistoryResult["currentLocation"]
>;

function formatDateTime(value: string): string {
  return DATE_TIME_FORMATTER.format(new Date(value));
}

function locationSummary(location: TransferLocation): string {
  const locality = [location.district, location.state].filter(
    (value): value is string => value !== null,
  );

  return locality.length === 0
    ? "Location details unavailable"
    : locality.join(" · ");
}

function TransferLocationCard({
  label,
  location,
}: Readonly<{
  label: string;
  location: TransferLocation;
}>): React.ReactElement {
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-muted/25 p-3">
      <p className="text-caption text-muted-readable">{label}</p>
      <div className="mt-1.5 grid min-w-0 gap-1">
        <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
          <Warehouse aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{location.storeName}</span>
        </span>
        <span className="truncate text-caption text-muted-readable">
          {location.orgUnitName} · {location.storeCode}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-caption text-muted-readable">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{locationSummary(location)}</span>
        </span>
      </div>
    </div>
  );
}

function TransferHistoryContent({
  result,
}: Readonly<{
  result: VehicleInventoryTransferHistoryResult;
}>): React.ReactElement {
  return (
    <div className="grid gap-5">
      <section
        aria-labelledby="current-stock-location-title"
        className="grid gap-2"
      >
        <h3
          id="current-stock-location-title"
          className="text-body-sm font-medium"
        >
          Current stock location
        </h3>
        {result.currentLocation === null ? (
          <p className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3 text-body-sm text-muted-readable">
            The vehicle&apos;s current store is outside the dealer locations
            visible to this authorized history scope.
          </p>
        ) : (
          <TransferLocationCard
            label="Current"
            location={result.currentLocation}
          />
        )}
      </section>

      <section aria-labelledby="transfer-timeline-title" className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 id="transfer-timeline-title" className="text-body-sm font-medium">
            Transfer timeline
          </h3>
          <Badge variant="secondary" className="text-tabular">
            {result.events.length.toLocaleString("en-IN")} movement
            {result.events.length === 1 ? "" : "s"}
          </Badge>
        </div>

        <ol className="grid gap-3">
          {result.events.map((event, index) => (
            <li
              key={event.transferId}
              className="relative rounded-2xl border border-border/70 bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary text-caption font-medium text-tabular">
                    {index + 1}
                  </span>
                  <span className="text-body-sm font-medium">
                    Vehicle transfer
                  </span>
                </div>
                <Badge variant="outline">
                  {event.status.replaceAll("_", " ")}
                </Badge>
              </div>

              <div className="mt-3 grid items-stretch gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-3">
                <TransferLocationCard label="From" location={event.from} />
                <span className="hidden self-center text-muted-readable md:grid md:size-8 md:place-items-center">
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
                <TransferLocationCard label="To" location={event.to} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-readable">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 aria-hidden="true" className="size-3.5" />
                  Movement {formatDateTime(event.eventAt)}
                </span>
                {event.receivedAt === null ? null : (
                  <span>Received {formatDateTime(event.receivedAt)}</span>
                )}
              </div>
            </li>
          ))}
        </ol>

        {result.truncated ? (
          <Alert variant="warning">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Older transfer records are not shown</AlertTitle>
            <AlertDescription>
              This view is intentionally bounded to the latest 100 authorized
              transfer events.
            </AlertDescription>
          </Alert>
        ) : null}
      </section>
    </div>
  );
}

function TransferHistorySkeleton(): React.ReactElement {
  return (
    <div
      className="grid gap-4"
      aria-label="Loading vehicle transfer history"
      aria-busy="true"
    >
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-36 rounded-2xl" />
      <Skeleton className="h-36 rounded-2xl" />
    </div>
  );
}

export function VehicleInventoryTransferHistory({
  context,
  unitId,
  vin,
  children,
}: Readonly<{
  context: VehicleInventoryContext;
  unitId: string;
  vin: string | null;
  children: React.ReactElement;
}>): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<TransferHistoryState>({
    kind: "idle",
  });
  const requestSequence = React.useRef(0);

  const loadHistory = React.useCallback((): void => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setState({ kind: "loading" });

    void loadVehicleInventoryTransferHistoryAction({
      context,
      unitId,
    }).then((result) => {
      if (requestSequence.current !== sequence) {
        return;
      }

      if (result.ok) {
        setState({ kind: "success", data: result.data });
        return;
      }

      setState({
        kind: "error",
        message: result.message,
        requestId: result.requestId ?? null,
      });
    });
  }, [context, unitId]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean): void => {
      setOpen(nextOpen);

      if (nextOpen && state.kind === "idle") {
        loadHistory();
      }
    },
    [loadHistory, state.kind],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent height="viewport" className="sm:max-w-4xl">
        <DialogHeader>
          <div className="flex min-w-0 items-center gap-3 pr-8">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <ArrowRightLeft aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="truncate text-subsection-title">
                Vehicle transfer history
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate text-caption">
                {vin ?? "VIN unavailable"} · authorized dealer movement timeline
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          {state.kind === "idle" || state.kind === "loading" ? (
            <TransferHistorySkeleton />
          ) : null}

          {state.kind === "error" ? (
            <div className="grid gap-4">
              <Alert variant="destructive">
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>Transfer history could not be loaded</AlertTitle>
                <AlertDescription>
                  {state.message}
                  {state.requestId === null ? null : (
                    <span className="mt-1 block text-caption">
                      Reference: <code>{state.requestId}</code>
                    </span>
                  )}
                </AlertDescription>
              </Alert>
              <div>
                <Button type="button" variant="outline" onClick={loadHistory}>
                  <RefreshCw aria-hidden="true" className="size-4" />
                  Retry
                </Button>
              </div>
            </div>
          ) : null}

          {state.kind === "success" ? (
            <TransferHistoryContent result={state.data} />
          ) : null}
        </DialogBody>

        <DialogFooter className="items-center sm:justify-between">
          <span className="mr-auto hidden text-caption text-muted-readable sm:inline">
            Read-only movement history · actor and dealer scope enforced by ERP
          </span>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

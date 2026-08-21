// oz-next-app/src/features/inventory/components/ui/component-inventory-record-dialog.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash2,
  Clock3,
  History,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  Truck,
  Wrench,
} from "lucide-react";

import {
  ContentDescriptionItem,
  ContentDescriptionList,
} from "@/components/common/content-shell";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import {
  loadComponentHistoryAction,
  quarantineComponentAction,
  releaseComponentAction,
  type ComponentHistoryActionResult,
  type ComponentStateActionResult,
} from "@/features/inventory/components/actions/component-inventory.actions";
import type {
  ComponentHistoryItem,
  ComponentInventoryContext,
  ComponentContextOptions,
  ComponentInventoryItem,
  ComponentJsonObject,
} from "@/features/inventory/components/contracts/component-inventory.schema";
import type { ComponentInventoryCapabilities } from "@/features/inventory/components/policies/component-inventory.policy";
import { ComponentDefinitionEditDialog } from "@/features/inventory/components/ui/component-definition-edit-dialog";
import { ComponentInventoryOperationalActions } from "@/features/inventory/components/ui/component-inventory-operations";
import { isSoldComponentVehicle } from "@/features/inventory/components/utils/component-inventory-status";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
});
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function humanize(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll("_", " ")
    .replace(/(^|\s)\p{L}/gu, (match) => match.toLocaleUpperCase("en-US"));
}

function formatDate(value: string): string {
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`));
}

function formatDateTime(value: string): string {
  return DATE_TIME_FORMATTER.format(new Date(value));
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ComponentConfiguration({
  metadata,
}: Readonly<{ metadata: ComponentJsonObject }>): React.ReactElement | null {
  const configurationValue = metadata["configuration"];
  const configuration = isRecord(configurationValue)
    ? configurationValue
    : null;
  const imei = textValue(metadata["imei_number"]);
  const batteryType = textValue(configuration?.["battery_type"]);
  const capacityKwh = numberValue(configuration?.["capacity_kwh"]);
  const voltageV = numberValue(configuration?.["voltage_v"]);
  const bms = textValue(configuration?.["bms"]);
  const mounting = textValue(configuration?.["mounting"]);
  const packCount = numberValue(configuration?.["battery_pack_count"]);

  if (
    imei === null &&
    batteryType === null &&
    capacityKwh === null &&
    voltageV === null &&
    bms === null &&
    mounting === null &&
    packCount === null
  ) {
    return null;
  }

  return (
    <div className="grid gap-2 rounded-2xl border border-border/70 bg-muted/25 p-3">
      <p className="text-body-sm font-medium text-foreground">
        Recorded configuration
      </p>
      <div className="flex flex-wrap gap-1.5">
        {batteryType === null ? null : (
          <Badge variant="secondary">{batteryType}</Badge>
        )}
        {capacityKwh === null ? null : (
          <Badge variant="secondary">
            {capacityKwh.toLocaleString("en-IN")} kWh
          </Badge>
        )}
        {voltageV === null ? null : (
          <Badge variant="secondary">
            {voltageV.toLocaleString("en-IN")} V
          </Badge>
        )}
        {bms === null ? null : <Badge variant="secondary">BMS: {bms}</Badge>}
        {mounting === null ? null : (
          <Badge variant="secondary">{humanize(mounting)}</Badge>
        )}
        {packCount === null ? null : (
          <Badge variant="secondary">
            {packCount.toLocaleString("en-IN")} packs
          </Badge>
        )}
        {imei === null ? null : <Badge variant="secondary">IMEI: {imei}</Badge>}
      </div>
    </div>
  );
}

function StockLocation({
  item,
}: Readonly<{ item: ComponentInventoryItem }>): React.ReactElement {
  if (item.store !== null) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <MapPin aria-hidden="true" className="size-4 text-muted-readable" />
        {item.store.name} · {item.store.code}
      </span>
    );
  }

  if (item.state === "IN_TRANSIT") {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-readable">
        <Truck aria-hidden="true" className="size-4" />
        Between stores
      </span>
    );
  }

  if (item.state === "RETIRED") {
    return (
      <span className="text-muted-readable">No active stock location</span>
    );
  }

  return (
    <span
      className={
        item.state === "UNLOCATED"
          ? "inline-flex items-center gap-1.5 text-destructive"
          : "inline-flex items-center gap-1.5 text-warning-foreground"
      }
    >
      <CircleSlash2 aria-hidden="true" className="size-4" />
      {item.state === "UNLOCATED" ? "Unlocated" : "Location not resolved"}
    </span>
  );
}

type HistoryState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "ready"; items: readonly ComponentHistoryItem[] }>
  | Readonly<{ kind: "error"; message: string; requestId: string | null }>;

function HistoryPanel({
  state,
  onRetry,
}: Readonly<{
  state: HistoryState;
  onRetry: () => void;
}>): React.ReactElement {
  if (state.kind === "idle" || state.kind === "loading") {
    return (
      <div
        className="grid gap-2"
        aria-busy="true"
        aria-label="Loading component history"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <Alert variant="destructive">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>History could not be loaded</AlertTitle>
        <AlertDescription>
          {state.message}
          {state.requestId === null ? null : (
            <span className="mt-1 block text-caption">
              Reference: <code>{state.requestId}</code>
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onRetry}
          >
            <RefreshCw aria-hidden="true" className="size-3.5" />
            Retry history
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (state.items.length === 0) {
    return (
      <p className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-body-sm text-muted-readable">
        No audited component events are available yet.
      </p>
    );
  }

  return (
    <ol className="grid gap-2">
      {state.items.map((event) => (
        <li
          key={event.eventId}
          className="grid gap-1 rounded-2xl border border-border/70 bg-card px-3 py-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-body-sm font-medium text-foreground">
              {humanize(event.eventType)}
            </span>
            <span className="inline-flex items-center gap-1 text-caption text-muted-readable">
              <Clock3 aria-hidden="true" className="size-3.5" />
              {formatDateTime(event.createdAt)}
            </span>
          </div>
          {event.reason === null ? null : (
            <p className="text-body-sm text-muted-readable">{event.reason}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

function StateActionDialog({
  item,
  context,
  action,
}: Readonly<{
  item: ComponentInventoryItem;
  context: ComponentInventoryContext;
  action: "quarantine" | "release";
}>): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [failureMessage, setFailureMessage] = React.useState<string | null>(
    null,
  );
  const idempotencyKeyRef = React.useRef<string | null>(null);
  const quarantining = action === "quarantine";

  function submit(): void {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setFailureMessage(
        "Reconnect to the network before retrying. Your reason has been preserved.",
      );
      return;
    }

    const normalizedReason = reason.trim();
    if (normalizedReason.length < 5) {
      setFailureMessage("Enter a clear reason of at least 5 characters.");
      return;
    }

    const idempotencyKey = idempotencyKeyRef.current;
    if (idempotencyKey === null) {
      setFailureMessage(
        "The action session expired. Close this dialog and retry.",
      );
      return;
    }

    setFailureMessage(null);
    startTransition(async () => {
      try {
        const result: ComponentStateActionResult = quarantining
          ? await quarantineComponentAction({
              context,
              componentInventoryId: item.componentInventoryId,
              custodyRowVersion: item.custodyRowVersion,
              reason: normalizedReason,
              idempotencyKey,
            })
          : await releaseComponentAction({
              context,
              componentInventoryId: item.componentInventoryId,
              custodyRowVersion: item.custodyRowVersion,
              reason: normalizedReason,
              idempotencyKey,
            });

        if (!result.ok) {
          setFailureMessage(
            result.requestId === undefined
              ? result.message
              : `${result.message} Reference: ${result.requestId}`,
          );
          return;
        }

        setOpen(false);
        router.refresh();
      } catch {
        setFailureMessage(
          "The request could not reach the secure component service. Your reason has been preserved; retry when the connection is stable.",
        );
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          idempotencyKeyRef.current = `component-${action}:${crypto.randomUUID()}`;
          setReason("");
          setFailureMessage(null);
        }
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={quarantining ? "destructive" : "default"}
          size="sm"
        >
          {quarantining ? (
            <ShieldAlert aria-hidden="true" className="size-4" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="size-4" />
          )}
          {quarantining ? "Quarantine" : "Return to available"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {quarantining ? "Quarantine component" : "Release component"}
          </DialogTitle>
          <DialogDescription>
            {quarantining
              ? "Remove this component from the available pool while it is inspected or corrected."
              : "Return this quarantined component to the available pool after the issue has been verified as resolved."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid gap-4">
          <Alert variant={quarantining ? "warning" : "default"}>
            {quarantining ? (
              <AlertTriangle aria-hidden="true" />
            ) : (
              <PackageCheck aria-hidden="true" />
            )}
            <AlertTitle>{item.component.name}</AlertTitle>
            <AlertDescription>
              {item.serialNumber ?? item.component.code} · Current state:{" "}
              {humanize(item.state)}
            </AlertDescription>
          </Alert>

          <div className="grid gap-2">
            <label
              htmlFor={`component-${action}-reason`}
              className="text-body-sm font-medium"
            >
              Reason
            </label>
            <Textarea
              id={`component-${action}-reason`}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
              }}
              maxLength={500}
              rows={4}
              placeholder={
                quarantining
                  ? "Example: Serial label is damaged and requires verification."
                  : "Example: Serial identity verified against clean evidence."
              }
            />
            <p className="text-caption text-muted-readable">
              This reason is stored in the component audit trail.
            </p>
          </div>

          {failureMessage === null ? null : (
            <Alert variant="destructive" role="alert">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Action not completed</AlertTitle>
              <AlertDescription>{failureMessage}</AlertDescription>
            </Alert>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={quarantining ? "destructive" : "default"}
            onClick={submit}
            disabled={pending || reason.trim().length < 5}
            aria-busy={pending}
          >
            {pending
              ? "Saving…"
              : quarantining
                ? "Confirm quarantine"
                : "Confirm release"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ComponentInventoryRecordDialog({
  item,
  context,
  capabilities,
  contextOptions,
  selectedStoreId,
}: Readonly<{
  item: ComponentInventoryItem;
  context: ComponentInventoryContext;
  capabilities: ComponentInventoryCapabilities;
  contextOptions: ComponentContextOptions;
  selectedStoreId?: string | undefined;
}>): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [historyState, setHistoryState] = React.useState<HistoryState>({
    kind: "idle",
  });

  const loadHistory = React.useCallback((): void => {
    if (!capabilities.canReadAudit) {
      return;
    }

    setHistoryState({ kind: "loading" });
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setHistoryState({
        kind: "error",
        message: "Reconnect to the network before loading component history.",
        requestId: null,
      });
      return;
    }

    void loadComponentHistoryAction({
      context,
      componentInventoryId: item.componentInventoryId,
    })
      .then((result: ComponentHistoryActionResult) => {
        if (result.ok) {
          setHistoryState({ kind: "ready", items: result.data });
          return;
        }

        setHistoryState({
          kind: "error",
          message: result.message,
          requestId: result.requestId ?? null,
        });
      })
      .catch(() => {
        setHistoryState({
          kind: "error",
          message:
            "The history request could not reach the secure component service. Retry when the connection is stable.",
          requestId: null,
        });
      });
  }, [capabilities.canReadAudit, context, item.componentInventoryId]);

  const operationalStoreSelected =
    selectedStoreId !== undefined && item.store?.storeId === selectedStoreId;
  const canQuarantine =
    operationalStoreSelected &&
    capabilities.canQuarantine &&
    item.state === "AVAILABLE";
  const canRelease =
    operationalStoreSelected &&
    capabilities.canQuarantine &&
    item.state === "QUARANTINED";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && capabilities.canReadAudit) {
          loadHistory();
        } else if (!nextOpen) {
          setHistoryState({ kind: "idle" });
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
        >
          View
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{item.component.name}</span>
            <Badge variant="secondary">{item.component.code}</Badge>
          </DialogTitle>
          <DialogDescription>
            Physical component identity, custody, vehicle association, integrity
            status, and audited activity.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid gap-5">
          {item.integrityWarnings.length > 0 ? (
            <Alert variant="warning">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Component needs attention</AlertTitle>
              <AlertDescription>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {item.integrityWarnings.map((warning) => (
                    <Badge key={warning} variant="warning">
                      {humanize(warning)}
                    </Badge>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          {item.vehicle?.statusMismatch === true ? (
            <Alert variant="warning">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>
                Vehicle inventory status requires reconciliation
              </AlertTitle>
              <AlertDescription>
                The vehicle inventory status (
                {item.vehicle.inventoryStatus ?? "not recorded"}) and lifecycle
                status ({item.vehicle.lifecycleStatus ?? "not recorded"})
                disagree. The API fails closed for sold-vehicle component
                mutations and uses the inventory status as the authoritative
                operational source when available.
              </AlertDescription>
            </Alert>
          ) : null}

          {isSoldComponentVehicle(item.vehicle) &&
          !capabilities.canModifySoldVehicleComponents ? (
            <Alert variant="info">
              <ShieldAlert aria-hidden="true" />
              <AlertTitle>
                Sold-vehicle component protection is active
              </AlertTitle>
              <AlertDescription>
                This component is attached to a sold vehicle. Attachment and
                replacement mutations are restricted to administrators; the
                backend remains authoritative even if vehicle status changes
                after this page loads.
              </AlertDescription>
            </Alert>
          ) : null}

          <ContentDescriptionList columns="two">
            <ContentDescriptionItem term="Type">
              {humanize(item.component.type)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Component code">
              {item.component.code}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Operational status">
              {item.operationalState === "OTHER"
                ? "Other status"
                : humanize(item.operationalState)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Status source">
              {item.statusSource === "VEHICLE"
                ? "Vehicle inventory"
                : "Component custody"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Custody state">
              {humanize(item.state)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Tracking">
              {item.component.isSerialized ? "Serialized" : "Non-serialized"}
              {item.component.trackLot ? " · lot tracked" : ""}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Serial number">
              {item.serialNumber ?? "Not recorded"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Lot number">
              {item.lotNumber ?? "Not recorded"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Unit of measure">
              {item.component.uomCode ?? "Not configured"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Expiry date">
              {item.expiryDate === null
                ? "Not applicable"
                : formatDate(item.expiryDate)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Stock location">
              <StockLocation item={item} />
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Vehicle">
              {item.vehicle === null
                ? "Not attached"
                : (item.vehicle.vin ?? "Vehicle VIN not recorded")}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Vehicle status">
              {item.vehicle?.status ?? "Not available"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Vehicle inventory status">
              {item.vehicle?.inventoryStatus ?? "Not available"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Vehicle lifecycle status">
              {item.vehicle?.lifecycleStatus ?? "Not available"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Transfer">
              {item.activeTransferId === null
                ? "No active transfer"
                : "Transfer in progress"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Last updated">
              {formatDateTime(item.updatedAt)}
            </ContentDescriptionItem>
          </ContentDescriptionList>

          <ComponentConfiguration metadata={item.metadata} />

          <div className="flex flex-wrap gap-2">
            {capabilities.canUpdateDefinition ? (
              <ComponentDefinitionEditDialog
                definition={item.component}
                context={context}
              />
            ) : null}
          </div>

          {!operationalStoreSelected && item.store !== null ? (
            <Alert>
              <MapPin aria-hidden="true" />
              <AlertTitle>
                Select this organization or dealer to manage the component
              </AlertTitle>
              <AlertDescription>
                All-organization monitoring remains read-only for physical
                mutations. Select {item.store.orgUnitName} in the Organization /
                dealer control above. Its linked store ({item.store.name}) is
                selected automatically to enable authorized Send, Attach,
                Replace, correction, and custody actions for this record.
              </AlertDescription>
            </Alert>
          ) : null}

          <ComponentInventoryOperationalActions
            item={item}
            context={context}
            contextOptions={contextOptions}
            capabilities={capabilities}
            enabled={operationalStoreSelected}
          />

          {canQuarantine || canRelease ? (
            <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-start gap-2">
                <Wrench
                  aria-hidden="true"
                  className="mt-0.5 size-4 text-muted-readable"
                />
                <div className="grid gap-1">
                  <p className="text-body-sm font-medium text-foreground">
                    Custody action
                  </p>
                  <p className="text-caption text-muted-readable">
                    Only state transitions valid for the current backend custody
                    state are offered.
                  </p>
                </div>
              </div>
              <div>
                {canQuarantine ? (
                  <StateActionDialog
                    item={item}
                    context={context}
                    action="quarantine"
                  />
                ) : null}
                {canRelease ? (
                  <StateActionDialog
                    item={item}
                    context={context}
                    action="release"
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          <Separator />

          <section
            aria-labelledby={`component-history-${item.componentInventoryId}`}
            className="grid gap-3"
          >
            <div className="flex items-center gap-2">
              <History
                aria-hidden="true"
                className="size-4 text-muted-readable"
              />
              <h3
                id={`component-history-${item.componentInventoryId}`}
                className="text-card-title"
              >
                Audit history
              </h3>
            </div>

            {capabilities.canReadAudit ? (
              <HistoryPanel state={historyState} onRetry={loadHistory} />
            ) : (
              <p className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-body-sm text-muted-readable">
                Audit history is hidden because this actor does not have
                inventory:component:audit:read.
              </p>
            )}
          </section>
        </DialogBody>

        <DialogFooter className="items-center sm:justify-between">
          <span className="mr-auto hidden text-caption text-muted-readable sm:inline">
            Read access is actor-scoped; mutations are revalidated by the
            backend.
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

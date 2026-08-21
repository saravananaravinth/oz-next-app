// oz-next-app/src/features/inventory/components/ui/component-inventory-operations.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRightLeft,
  Camera,
  CarFront,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Replace,
  Send,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { putPresignedUpload } from "@/lib/api/browser-client";
import { useDebounce } from "@/shared/hooks/use-debounce";

import {
  attachComponentAction,
  correctComponentAction,
  createComponentEvidenceUploadAction,
  finalizeComponentEvidenceUploadAction,
  loadComponentEvidenceStatusAction,
  loadReplacementOptionsAction,
  replaceComponentAction,
  transferComponentAction,
} from "@/features/inventory/components/actions/component-inventory.actions";
import {
  searchComponentTargetVehicles,
  type ComponentTargetVehicle,
} from "@/features/inventory/components/api/component-target-vehicle.client";
import {
  COMPONENT_EVIDENCE_MAX_BYTES,
  COMPONENT_REMOVAL_DISPOSITIONS,
  type ComponentBatteryConfigurationInput,
  type ComponentContextOptions,
  type ComponentInventoryContext,
  type ComponentInventoryItem,
  type ComponentReplacementOption,
  type ComponentRemovalDisposition,
} from "@/features/inventory/components/contracts/component-inventory.schema";
import type { ComponentInventoryCapabilities } from "@/features/inventory/components/policies/component-inventory.policy";
import { ComponentBatteryConfigurationWizard } from "@/features/inventory/components/ui/component-battery-configuration-wizard";
import { ComponentStorePicker } from "@/features/inventory/components/ui/component-inventory-scope-dialogs";
import {
  batteryConfigurationOptions,
  currentBatteryConfiguration,
} from "@/features/inventory/components/utils/component-battery-configuration";
import {
  isSoldComponentVehicle,
  isSoldVehicleStatus,
} from "@/features/inventory/components/utils/component-inventory-status";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type EvidenceImageType = (typeof IMAGE_TYPES)[number];

function isEvidenceImageType(value: string): value is EvidenceImageType {
  return IMAGE_TYPES.some((type) => type === value);
}
const EVIDENCE_POLL_ATTEMPTS = 20;
const EVIDENCE_POLL_MS = 1_500;

function humanize(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll("_", " ")
    .replace(/(^|\s)\p{L}/gu, (match) => match.toLocaleUpperCase("en-US"));
}

function failureMessage(
  result: Readonly<{ message: string; requestId?: string }>,
): string {
  return result.requestId === undefined
    ? result.message
    : `${result.message} Reference: ${result.requestId}`;
}

function intent(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

function isRemovalDisposition(
  value: string,
): value is ComponentRemovalDisposition {
  return COMPONENT_REMOVAL_DISPOSITIONS.some(
    (candidate) => candidate === value,
  );
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function captureLocation(): Promise<
  Readonly<{ latitude: number; longitude: number; accuracyMeters: number }>
> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Location services are unavailable on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
      },
      () => {
        reject(
          new Error(
            "Location permission is required for integrity-sensitive component corrections.",
          ),
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}

function TransferDialog({
  item,
  context,
  contextOptions,
}: Readonly<{
  item: ComponentInventoryItem;
  context: ComponentInventoryContext;
  contextOptions: ComponentContextOptions;
}>): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [destination, setDestination] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [failure, setFailure] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const intentRef = React.useRef("");
  const destinations = contextOptions.stores.filter(
    (store) => store.isActive && store.storeId !== item.store?.storeId,
  );
  const selectedDestination = destinations.find(
    (store) => store.storeId === destination,
  );

  function submit(): void {
    const sourceStore = item.store;

    if (
      sourceStore === null ||
      selectedDestination === undefined ||
      reason.trim().length < 3
    ) {
      setFailure(
        "Choose an authorized active destination and enter a clear dispatch reason.",
      );
      return;
    }

    startTransition(async () => {
      const result = await transferComponentAction({
        context,
        fromStoreId: sourceStore.storeId,
        toStoreId: selectedDestination.storeId,
        componentInventoryIds: [item.componentInventoryId],
        reason: reason.trim(),
        idempotencyKey: intentRef.current,
      });
      if (!result.ok) {
        setFailure(failureMessage(result));
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDestination("");
          setReason("");
          setFailure(null);
          intentRef.current = intent("component-send");
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Send aria-hidden="true" />
          Send
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send component to another store</DialogTitle>
          <DialogDescription>
            Send this Available component to any backend-authorized dealer,
            sub-dealer, or internal active store. Dispatch changes custody to In
            Transit; the destination must receive it before it becomes Available
            there.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <Alert>
            <ArrowRightLeft aria-hidden="true" />
            <AlertTitle>{item.component.name}</AlertTitle>
            <AlertDescription>
              {item.serialNumber ?? item.component.code} · Source:{" "}
              {item.store?.name ?? "Unresolved source"}
              {item.store === null ? "" : ` · ${item.store.orgUnitName}`}
            </AlertDescription>
          </Alert>

          <div className="grid gap-2">
            <label className="text-body-sm font-medium">
              Destination stock location
            </label>
            <ComponentStorePicker
              stores={destinations}
              value={destination.length === 0 ? undefined : destination}
              onValueChange={(value) => {
                setDestination(value ?? "");
                setFailure(null);
              }}
              allowAll={false}
              activeOnly
              triggerLabel="Choose dealer / sub-dealer destination"
            />
            {selectedDestination === undefined ? null : (
              <p className="text-caption text-muted-readable">
                Destination: {selectedDestination.orgUnitName} ·{" "}
                {selectedDestination.city ??
                  selectedDestination.district ??
                  selectedDestination.state ??
                  "Location details not recorded"}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <label
              className="text-body-sm font-medium"
              htmlFor="component-transfer-reason"
            >
              Dispatch reason
            </label>
            <Textarea
              id="component-transfer-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.currentTarget.value);
              }}
              maxLength={500}
              rows={3}
              placeholder="Example: Sending replacement LFP battery to Tiruppur dealer stock for an approved service replacement."
            />
          </div>

          {failure === null ? null : (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Send not completed</AlertTitle>
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={submit}
            disabled={
              pending || destination.length === 0 || reason.trim().length < 3
            }
          >
            {pending ? "Dispatching…" : "Create transfer and dispatch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttachDialog({
  item,
  context,
  canModifySoldVehicleComponents,
}: Readonly<{
  item: ComponentInventoryItem;
  context: ComponentInventoryContext;
  canModifySoldVehicleComponents: boolean;
}>): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounced = useDebounce(query, 280, { maxWait: 750 });
  const [vehicles, setVehicles] = React.useState<
    readonly ComponentTargetVehicle[]
  >([]);
  const [selected, setSelected] = React.useState<ComponentTargetVehicle | null>(
    null,
  );
  const [searching, setSearching] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [failure, setFailure] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const intentRef = React.useRef("");

  React.useEffect(() => {
    const normalized = debounced.trim();
    if (!open || normalized.length < 3) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    queueMicrotask(() => {
      if (active) {
        setSearching(true);
      }
    });

    void searchComponentTargetVehicles(
      { tenantId: context.tenantId, query: normalized },
      controller.signal,
    )
      .then((results) => {
        if (active) {
          setVehicles(results);
        }
      })
      .catch((error: unknown) => {
        if (
          active &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setFailure("Authorized vehicle lookup could not be completed.");
        }
      })
      .finally(() => {
        if (active) {
          setSearching(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [context.tenantId, debounced, open]);

  function submit(): void {
    if (selected === null || reason.trim().length < 3) {
      setFailure(
        "Select the exact target vehicle and enter a clear installation reason.",
      );
      return;
    }

    if (
      isSoldVehicleStatus(selected.inventoryStatus) &&
      !canModifySoldVehicleComponents
    ) {
      setFailure(
        "Only administrators can attach or replace components on sold vehicles.",
      );
      return;
    }

    startTransition(async () => {
      const result = await attachComponentAction({
        context,
        componentInventoryId: item.componentInventoryId,
        unitId: selected.unitId,
        custodyRowVersion: item.custodyRowVersion,
        reason: reason.trim(),
        idempotencyKey: intentRef.current,
      });
      if (!result.ok) {
        setFailure(failureMessage(result));
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setQuery("");
          setVehicles([]);
          setSelected(null);
          setReason("");
          setFailure(null);
          intentRef.current = intent("component-attach");
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <CarFront aria-hidden="true" />
          Attach
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Attach component to vehicle</DialogTitle>
          <DialogDescription>
            Search only authorized vehicle inventory. The backend revalidates
            store custody, vehicle location, BOM/variant compatibility,
            condition, and existing active attachments before installation.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <div className="grid gap-2">
            <label
              className="text-body-sm font-medium"
              htmlFor="component-target-vehicle"
            >
              Target vehicle
            </label>
            <Input
              id="component-target-vehicle"
              value={query}
              onChange={(event) => {
                setQuery(event.currentTarget.value);
                setVehicles([]);
                setSelected(null);
                setFailure(null);
              }}
              maxLength={100}
              placeholder="Search VIN, model, variant…"
            />
          </div>
          {searching ? (
            <p className="inline-flex items-center gap-2 text-body-sm text-muted-readable">
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
              Searching authorized vehicles…
            </p>
          ) : null}
          {vehicles.length === 0 ? null : (
            <div className="grid max-h-56 gap-2 overflow-y-auto">
              {vehicles.map((vehicle) => {
                const soldRestricted =
                  isSoldVehicleStatus(vehicle.inventoryStatus) &&
                  !canModifySoldVehicleComponents;

                return (
                  <Button
                    key={vehicle.unitId}
                    type="button"
                    variant={
                      selected?.unitId === vehicle.unitId
                        ? "secondary"
                        : "outline"
                    }
                    className="h-auto justify-start rounded-2xl px-3 py-2 text-start"
                    onClick={() => {
                      setSelected(vehicle);
                    }}
                    disabled={soldRestricted}
                    aria-label={
                      soldRestricted
                        ? `${vehicle.vin ?? "Vehicle"}, sold vehicle, administrator access required`
                        : undefined
                    }
                  >
                    <span className="grid min-w-0 gap-0.5">
                      <span className="flex flex-wrap items-center gap-1.5 font-medium">
                        <span>{vehicle.vin ?? "VIN not recorded"}</span>
                        <Badge
                          variant={
                            isSoldVehicleStatus(vehicle.inventoryStatus)
                              ? "warning"
                              : "outline"
                          }
                        >
                          {vehicle.inventoryStatus}
                        </Badge>
                        {soldRestricted ? (
                          <Badge variant="destructive">Admin only</Badge>
                        ) : null}
                      </span>
                      <span className="text-caption text-muted-readable">
                        {[vehicle.modelName, vehicle.variantName]
                          .filter(Boolean)
                          .join(" · ")}
                        {" · "}
                        {vehicle.storeName} · {vehicle.dealerName}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          )}
          {selected === null ? null : (
            <Alert>
              <CarFront aria-hidden="true" />
              <AlertTitle>Selected vehicle</AlertTitle>
              <AlertDescription>
                {selected.vin ?? "VIN not recorded"} · {selected.storeName} ·{" "}
                {selected.inventoryStatus}. If this component is in another
                store, the backend will require a transfer instead of creating a
                remote attachment.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-2">
            <label
              className="text-body-sm font-medium"
              htmlFor="component-attach-reason"
            >
              Installation reason
            </label>
            <Textarea
              id="component-attach-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.currentTarget.value);
              }}
              maxLength={500}
              rows={3}
              placeholder="Example: Installing this component on the selected vehicle after custody and compatibility verification."
            />
          </div>
          {failure === null ? null : (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Attachment not completed</AlertTitle>
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={submit}
            disabled={pending || selected === null || reason.trim().length < 3}
          >
            {pending ? "Attaching…" : "Confirm attachment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReplaceDialog({
  item,
  context,
}: Readonly<{
  item: ComponentInventoryItem;
  context: ComponentInventoryContext;
}>): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<
    readonly ComponentReplacementOption[]
  >([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [disposition, setDisposition] =
    React.useState<ComponentRemovalDisposition>("QUARANTINE");
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const intentRef = React.useRef("");

  const load = React.useCallback((): void => {
    if (item.vehicle === null) return;
    setLoading(true);
    setFailure(null);
    void loadReplacementOptionsAction({
      context,
      componentInventoryId: item.componentInventoryId,
      unitId: item.vehicle.unitId,
      limit: 100,
    })
      .then((result) => {
        if (result.ok) setOptions(result.data);
        else setFailure(failureMessage(result));
      })
      .catch(() => {
        setFailure("Replacement candidates could not be loaded.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [context, item.componentInventoryId, item.vehicle]);

  function submit(): void {
    const vehicle = item.vehicle;
    const candidate = options.find(
      (option) => option.componentInventoryId === selectedId,
    );
    if (
      vehicle === null ||
      candidate === undefined ||
      !candidate.compatibility.compatible ||
      reason.trim().length < 3
    ) {
      setFailure(
        "Select a compatible replacement component and enter a clear replacement reason.",
      );
      return;
    }
    startTransition(async () => {
      const result = await replaceComponentAction({
        context,
        newComponentInventoryId: candidate.componentInventoryId,
        unitId: vehicle.unitId,
        newComponentCustodyRowVersion: candidate.custodyRowVersion,
        removedDisposition: disposition,
        reason: reason.trim(),
        idempotencyKey: intentRef.current,
      });
      if (!result.ok) {
        setFailure(failureMessage(result));
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setOptions([]);
          setSelectedId("");
          setDisposition("QUARANTINE");
          setReason("");
          setFailure(null);
          intentRef.current = intent("component-replace");
          window.setTimeout(load, 0);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Replace aria-hidden="true" />
          Replace
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Replace installed component</DialogTitle>
          <DialogDescription>
            This is one atomic backend operation: remove the old attachment,
            install the selected available component, apply the removal
            disposition, update custody, and write audit history.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          {loading ? (
            <p className="inline-flex items-center gap-2 text-body-sm text-muted-readable">
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
              Evaluating compatible replacement stock…
            </p>
          ) : null}
          {!loading && options.length === 0 ? (
            <Alert>
              <RefreshCw aria-hidden="true" />
              <AlertTitle>No replacement stock available</AlertTitle>
              <AlertDescription>
                No authorized available component currently satisfies this
                replacement lookup.
              </AlertDescription>
            </Alert>
          ) : null}
          {options.length === 0 ? null : (
            <div className="grid gap-2">
              <label
                className="text-body-sm font-medium"
                htmlFor="replacement-component"
              >
                Replacement component
              </label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger id="replacement-component">
                  <SelectValue placeholder="Select replacement" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem
                      key={option.componentInventoryId}
                      value={option.componentInventoryId}
                      disabled={!option.compatibility.compatible}
                    >
                      {option.serialNumber ?? option.componentCode} ·{" "}
                      {option.componentName} ·{" "}
                      {option.compatibility.compatible
                        ? "Compatible"
                        : "Not compatible"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <label
              className="text-body-sm font-medium"
              htmlFor="removed-component-disposition"
            >
              Removed component disposition
            </label>
            <Select
              value={disposition}
              onValueChange={(value) => {
                if (isRemovalDisposition(value)) setDisposition(value);
              }}
            >
              <SelectTrigger id="removed-component-disposition">
                <SelectValue placeholder="Choose disposition" />
              </SelectTrigger>
              <SelectContent>
                {COMPONENT_REMOVAL_DISPOSITIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {humanize(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-caption text-muted-readable">
              Quarantine is the safe default for fault-related replacements.
              Return to pool only after the removed component is known to be
              usable.
            </p>
          </div>
          <div className="grid gap-2">
            <label
              className="text-body-sm font-medium"
              htmlFor="component-replace-reason"
            >
              Replacement reason
            </label>
            <Textarea
              id="component-replace-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.currentTarget.value);
              }}
              maxLength={500}
              rows={3}
              placeholder="Example: Replace a faulty controller and quarantine the removed component for inspection."
            />
          </div>
          {failure === null ? null : (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Replacement not completed</AlertTitle>
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={submit}
            disabled={
              pending || selectedId.length === 0 || reason.trim().length < 3
            }
          >
            {pending ? "Replacing…" : "Confirm replacement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CorrectionDialog({
  item,
  context,
}: Readonly<{
  item: ComponentInventoryItem;
  context: ComponentInventoryContext;
}>): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serial, setSerial] = React.useState(item.serialNumber ?? "");
  const [lot, setLot] = React.useState(item.lotNumber ?? "");
  const [expiry, setExpiry] = React.useState(item.expiryDate ?? "");
  const [imei, setImei] = React.useState(
    typeof item.metadata["imei_number"] === "string"
      ? item.metadata["imei_number"]
      : "",
  );
  const currentConfiguration = React.useMemo(
    () => currentBatteryConfiguration(item.metadata),
    [item.metadata],
  );
  const approvedConfigurations = React.useMemo(
    () =>
      item.component.type === "BATTERY"
        ? batteryConfigurationOptions(item.component.metadata)
        : [],
    [item.component.metadata, item.component.type],
  );
  const currentConfigurationIsApproved =
    currentConfiguration !== null &&
    approvedConfigurations.some(
      (configuration) => configuration.id === currentConfiguration.id,
    );
  const [selectedBatteryConfiguration, setSelectedBatteryConfiguration] =
    React.useState<ComponentBatteryConfigurationInput | null>(
      currentConfigurationIsApproved ? currentConfiguration : null,
    );
  const [reason, setReason] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const baseIntent = React.useRef("");

  async function waitForEvidence(evidenceId: string): Promise<boolean> {
    for (let attempt = 0; attempt < EVIDENCE_POLL_ATTEMPTS; attempt += 1) {
      const result = await loadComponentEvidenceStatusAction({
        context,
        evidenceId,
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      if (result.data.usable) {
        return true;
      }
      if (
        ["INFECTED", "REJECTED", "ERROR"].includes(result.data.scanStatus ?? "")
      ) {
        throw new Error(
          "The captured evidence did not pass the required file-safety scan.",
        );
      }
      await sleep(EVIDENCE_POLL_MS);
    }
    return false;
  }

  function submit(): void {
    if (file === null || reason.trim().length < 5) {
      setFailure(
        "Capture a current component image and enter a clear correction reason of at least 5 characters.",
      );
      return;
    }
    const evidenceFile = file;
    const evidenceContentType = evidenceFile.type;

    if (
      !isEvidenceImageType(evidenceContentType) ||
      evidenceFile.size <= 0 ||
      evidenceFile.size > COMPONENT_EVIDENCE_MAX_BYTES
    ) {
      setFailure(
        "Evidence must be a JPEG, PNG, or WebP image no larger than 10 MB.",
      );
      return;
    }

    const serialChanged = serial.trim() !== (item.serialNumber ?? "");
    const lotChanged = lot.trim() !== (item.lotNumber ?? "");
    const expiryChanged = expiry !== (item.expiryDate ?? "");
    const currentImei =
      typeof item.metadata["imei_number"] === "string"
        ? item.metadata["imei_number"]
        : "";
    const imeiChanged = imei.trim() !== currentImei;
    const configurationChanged =
      item.component.type === "BATTERY" &&
      (selectedBatteryConfiguration?.id ?? "") !==
        (currentConfiguration?.id ?? "");

    if (configurationChanged && selectedBatteryConfiguration === null) {
      setFailure(
        "Select an approved battery configuration before applying this correction.",
      );
      return;
    }

    if (
      !serialChanged &&
      !lotChanged &&
      !expiryChanged &&
      !imeiChanged &&
      !configurationChanged
    ) {
      setFailure(
        "Change at least one serial, lot, expiry, configuration, or metadata value before submitting evidence.",
      );
      return;
    }

    const metadata = {
      ...(imeiChanged
        ? { imeiNumber: imei.trim().length === 0 ? null : imei.trim() }
        : {}),
      ...(configurationChanged && selectedBatteryConfiguration !== null
        ? {
            configuration: selectedBatteryConfiguration,
            ...(selectedBatteryConfiguration.batteryType === undefined
              ? {}
              : {
                  batteryTypeCode: selectedBatteryConfiguration.batteryType,
                  batteryTypeName: selectedBatteryConfiguration.batteryType,
                }),
            ...(selectedBatteryConfiguration.capacityKwh === undefined
              ? {}
              : { capacityKwh: selectedBatteryConfiguration.capacityKwh }),
            ...(selectedBatteryConfiguration.voltageV === undefined
              ? {}
              : { voltageV: selectedBatteryConfiguration.voltageV }),
            ...(selectedBatteryConfiguration.bms === undefined
              ? {}
              : { bms: selectedBatteryConfiguration.bms }),
            ...(selectedBatteryConfiguration.mounting === undefined
              ? {}
              : { mounting: selectedBatteryConfiguration.mounting }),
          }
        : {}),
    };
    const metadataChanged = imeiChanged || configurationChanged;

    setFailure(null);
    setStatus("Preparing verified evidence…");
    startTransition(async () => {
      try {
        const [checksum, location] = await Promise.all([
          sha256(evidenceFile),
          captureLocation(),
        ]);
        const uploadResult = await createComponentEvidenceUploadAction({
          context,
          componentInventoryId: item.componentInventoryId,
          fileName: evidenceFile.name,
          contentType: evidenceContentType,
          sizeBytes: evidenceFile.size,
          checksumSha256: checksum,
          idempotencyKey: `${baseIntent.current}:evidence`,
        });
        if (!uploadResult.ok) {
          setFailure(failureMessage(uploadResult));
          setStatus(null);
          return;
        }

        setStatus("Uploading captured image securely…");
        const headers = new Headers(uploadResult.data.upload.requiredHeaders);
        if (!headers.has("content-type")) {
          headers.set("content-type", uploadResult.data.upload.contentType);
        }
        await putPresignedUpload(
          uploadResult.data.upload.url,
          uploadResult.data.upload.method,
          headers,
          evidenceFile,
        );

        setStatus("Finalizing evidence and starting safety scan…");
        const finalized = await finalizeComponentEvidenceUploadAction({
          context,
          uploadId: uploadResult.data.uploadId,
          checksumSha256: checksum,
          sizeBytes: evidenceFile.size,
          captureChallenge: uploadResult.data.captureChallenge,
          capturedAt: new Date().toISOString(),
          location,
          idempotencyKey: `${baseIntent.current}:finalize`,
        });
        if (!finalized.ok) {
          setFailure(failureMessage(finalized));
          setStatus(null);
          return;
        }

        setStatus("Waiting for the evidence safety scan…");
        const usable =
          finalized.data.usable ||
          (await waitForEvidence(uploadResult.data.evidenceId));
        if (!usable) {
          setFailure(
            "Evidence scanning is still in progress. Keep this dialog open and retry the correction after the scan completes.",
          );
          setStatus(null);
          return;
        }

        setStatus("Applying audited component correction…");
        const corrected = await correctComponentAction({
          context,
          componentInventoryId: item.componentInventoryId,
          inventoryRowVersion: item.inventoryRowVersion,
          evidenceId: uploadResult.data.evidenceId,
          reason: reason.trim(),
          ...(serialChanged
            ? {
                serialNumber: serial.trim().length === 0 ? null : serial.trim(),
              }
            : {}),
          ...(lotChanged
            ? { lotNumber: lot.trim().length === 0 ? null : lot.trim() }
            : {}),
          ...(expiryChanged
            ? { expiryDate: expiry.length === 0 ? null : expiry }
            : {}),
          ...(metadataChanged ? { metadata } : {}),
          idempotencyKey: `${baseIntent.current}:correction`,
        });
        if (!corrected.ok) {
          setFailure(failureMessage(corrected));
          setStatus(null);
          return;
        }
        setOpen(false);
        router.refresh();
      } catch (error: unknown) {
        setFailure(
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "The evidence-backed correction could not be completed safely.",
        );
        setStatus(null);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setSerial(item.serialNumber ?? "");
          setLot(item.lotNumber ?? "");
          setExpiry(item.expiryDate ?? "");
          setImei(
            typeof item.metadata["imei_number"] === "string"
              ? item.metadata["imei_number"]
              : "",
          );
          setSelectedBatteryConfiguration(
            currentConfigurationIsApproved ? currentConfiguration : null,
          );
          setReason("");
          setFile(null);
          setFailure(null);
          setStatus(null);
          baseIntent.current = intent("component-correction");
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <PencilLine aria-hidden="true" />
          {item.component.type === "BATTERY"
            ? "Update battery details"
            : "Correct data"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {item.component.type === "BATTERY"
              ? "Update battery details"
              : "Correct component identity or metadata"}
          </DialogTitle>
          <DialogDescription>
            {item.component.type === "BATTERY"
              ? "Choose the real battery configuration step by step. Serial, lot, battery details, and other integrity-sensitive changes require a newly captured component image, live device location, server challenge, checksum verification, and a clean file scan."
              : "Integrity-sensitive changes require a newly captured component image, live device location, a server challenge, checksum verification, and a clean file scan before the patch is accepted."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label
                className="text-body-sm font-medium"
                htmlFor="correct-component-serial"
              >
                Serial number
              </label>
              <Input
                id="correct-component-serial"
                value={serial}
                placeholder="Scan or enter serial number"
                onChange={(event) => {
                  setSerial(event.currentTarget.value);
                }}
                maxLength={256}
              />
            </div>
            <div className="grid gap-2">
              <label
                className="text-body-sm font-medium"
                htmlFor="correct-component-lot"
              >
                Lot number
              </label>
              <Input
                id="correct-component-lot"
                value={lot}
                placeholder="Enter lot number, if applicable"
                onChange={(event) => {
                  setLot(event.currentTarget.value);
                }}
                maxLength={128}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label
                className="text-body-sm font-medium"
                htmlFor="correct-component-expiry"
              >
                Expiry date
              </label>
              <Input
                id="correct-component-expiry"
                type="date"
                value={expiry}
                placeholder="Select expiry date"
                onChange={(event) => {
                  setExpiry(event.currentTarget.value);
                }}
              />
            </div>
            <div className="grid gap-2">
              <label
                className="text-body-sm font-medium"
                htmlFor="correct-component-imei"
              >
                IMEI / modem identity
              </label>
              <Input
                id="correct-component-imei"
                value={imei}
                placeholder="Enter IMEI / modem identity, if applicable"
                onChange={(event) => {
                  setImei(event.currentTarget.value);
                }}
                maxLength={64}
              />
            </div>
          </div>

          {item.component.type === "BATTERY" ? (
            approvedConfigurations.length > 0 ? (
              <div className="grid gap-3">
                <ComponentBatteryConfigurationWizard
                  key={`${item.componentInventoryId}:${open ? "open" : "closed"}`}
                  options={approvedConfigurations}
                  value={selectedBatteryConfiguration}
                  onValueChange={(value) => {
                    setSelectedBatteryConfiguration(value);
                    setFailure(null);
                  }}
                  disabled={pending}
                />
                {currentConfiguration !== null &&
                !currentConfigurationIsApproved ? (
                  <Alert variant="warning">
                    <AlertTriangle aria-hidden="true" />
                    <AlertTitle>
                      Recorded battery configuration is no longer approved
                    </AlertTitle>
                    <AlertDescription>
                      The current recorded configuration is not published by the
                      component master. Choose the verified physical battery
                      characteristics above and capture evidence before saving.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            ) : (
              <Alert variant="warning">
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>
                  No approved battery configurations published
                </AlertTitle>
                <AlertDescription>
                  Battery configuration cannot be edited until the component
                  master publishes approved choices. Serial, lot, expiry, and
                  modem identity remain available through the evidence-backed
                  correction flow.
                </AlertDescription>
              </Alert>
            )
          ) : null}

          <div className="grid gap-2">
            <label
              className="text-body-sm font-medium"
              htmlFor="correct-component-photo"
            >
              Real-time component photo
            </label>
            <Input
              id="correct-component-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              placeholder="Capture component photo"
              onChange={(event) => {
                setFile(event.currentTarget.files?.[0] ?? null);
              }}
            />
            <p className="text-caption text-muted-readable">
              Capture the physical component currently being corrected. Precise
              location is sent only to the protected evidence record and must
              not be logged by the UI.
            </p>
          </div>
          <div className="grid gap-2">
            <label
              className="text-body-sm font-medium"
              htmlFor="correct-component-reason"
            >
              Correction reason
            </label>
            <Textarea
              id="correct-component-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.currentTarget.value);
              }}
              maxLength={500}
              rows={3}
              placeholder="Explain what is being corrected and why the current physical evidence supports this change."
            />
          </div>
          {status === null ? null : (
            <Alert>
              <Camera aria-hidden="true" />
              <AlertTitle>Verification in progress</AlertTitle>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}
          {failure === null ? null : (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Correction not completed</AlertTitle>
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={submit}
            disabled={pending || file === null || reason.trim().length < 5}
          >
            {pending ? "Verifying…" : "Verify evidence and apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DisabledOperationalAction({
  icon,
  label,
  reason,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  reason: string;
}>): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex" tabIndex={0}>
          <Button type="button" variant="outline" size="sm" disabled>
            {icon}
            {label}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{reason}</TooltipContent>
    </Tooltip>
  );
}

export function ComponentInventoryOperationalActions({
  item,
  context,
  contextOptions,
  capabilities,
  enabled,
}: Readonly<{
  item: ComponentInventoryItem;
  context: ComponentInventoryContext;
  contextOptions: ComponentContextOptions;
  capabilities: ComponentInventoryCapabilities;
  enabled: boolean;
}>): React.ReactElement | null {
  const eligibleTransfer =
    item.state === "AVAILABLE" && item.store?.isActive === true;
  const eligibleAttach =
    capabilities.canSearchVehicles &&
    item.state === "AVAILABLE" &&
    item.store !== null &&
    item.store.isActive &&
    item.integrityWarnings.length === 0;
  const eligibleReplace = item.state === "ATTACHED" && item.vehicle !== null;
  const soldVehicleMutationRestricted =
    isSoldComponentVehicle(item.vehicle) &&
    !capabilities.canModifySoldVehicleComponents;
  const eligibleCorrect =
    item.state !== "IN_TRANSIT" && item.state !== "RETIRED";

  const showTransferControl = capabilities.canTransfer;
  const showAttachControl = capabilities.canAttach && eligibleAttach;
  const showReplaceControl = capabilities.canReplace && eligibleReplace;
  const showCorrectControl = capabilities.canUpdate && eligibleCorrect;

  if (
    !showTransferControl &&
    !showAttachControl &&
    !showReplaceControl &&
    !showCorrectControl
  ) {
    return null;
  }

  const scopeReason =
    "Select this component's organization or dealer in the Component inventory toolbar. Its linked stock location is applied automatically before physical operations are enabled.";
  const transferUnavailableReason = !enabled
    ? scopeReason
    : item.state !== "AVAILABLE"
      ? `Send is available only when custody is Available. This component is currently ${humanize(item.state)}.`
      : item.store === null
        ? "Send requires a verified current source stock location."
        : !item.store.isActive
          ? "Send is blocked while the current source store is inactive."
          : "Send is unavailable for this component.";

  return (
    <div className="grid gap-2 rounded-2xl border border-border/70 bg-muted/15 p-3">
      <div className="flex flex-wrap gap-2">
        {showAttachControl ? (
          enabled ? (
            <AttachDialog
              item={item}
              context={context}
              canModifySoldVehicleComponents={
                capabilities.canModifySoldVehicleComponents
              }
            />
          ) : (
            <DisabledOperationalAction
              icon={<CarFront aria-hidden="true" />}
              label="Attach"
              reason={scopeReason}
            />
          )
        ) : null}

        {showReplaceControl ? (
          soldVehicleMutationRestricted ? (
            <DisabledOperationalAction
              icon={<Replace aria-hidden="true" />}
              label="Replace"
              reason="Only administrators can replace components attached to sold vehicles. The API revalidates vehicle status when the mutation is submitted."
            />
          ) : enabled ? (
            <ReplaceDialog item={item} context={context} />
          ) : (
            <DisabledOperationalAction
              icon={<Replace aria-hidden="true" />}
              label="Replace"
              reason={scopeReason}
            />
          )
        ) : null}

        {showTransferControl ? (
          enabled && eligibleTransfer ? (
            <TransferDialog
              item={item}
              context={context}
              contextOptions={contextOptions}
            />
          ) : (
            <DisabledOperationalAction
              icon={<Send aria-hidden="true" />}
              label="Send"
              reason={transferUnavailableReason}
            />
          )
        ) : null}

        {showCorrectControl ? (
          enabled ? (
            <CorrectionDialog item={item} context={context} />
          ) : (
            <DisabledOperationalAction
              icon={<PencilLine aria-hidden="true" />}
              label={
                item.component.type === "BATTERY"
                  ? "Update battery details"
                  : "Correct data"
              }
              reason={scopeReason}
            />
          )
        ) : null}
      </div>

      {showTransferControl ? (
        <p className="text-caption text-muted-readable">
          Send moves an Available component to another authorized dealer,
          sub-dealer, or internal store through the audited transfer workflow.
        </p>
      ) : null}
    </div>
  );
}

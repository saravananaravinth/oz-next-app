// oz-next-app/src/features/inventory/components/ui/component-inventory-create-dialog.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  CirclePlus,
  PackagePlus,
  Plus,
  Sparkles,
  TriangleAlert,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import {
  createComponentDefinitionAction,
  createPhysicalComponentAction,
  searchComponentDefinitionsAction,
} from "@/features/inventory/components/actions/component-inventory.actions";
import {
  COMPONENT_INVENTORY_TYPES,
  type ComponentBatteryConfigurationInput,
  type ComponentContextOptions,
  type ComponentDefinitionSummary,
  type ComponentInventoryType,
} from "@/features/inventory/components/contracts/component-inventory.schema";
import { ComponentBatteryConfigurationWizard } from "@/features/inventory/components/ui/component-battery-configuration-wizard";
import { ComponentStorePicker } from "@/features/inventory/components/ui/component-inventory-scope-dialogs";
import { batteryConfigurationOptions } from "@/features/inventory/components/utils/component-battery-configuration";

function humanize(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll("_", " ")
    .replace(/(^|\s)\p{L}/gu, (match) => match.toLocaleUpperCase("en-US"));
}

function isComponentType(value: string): value is ComponentInventoryType {
  return COMPONENT_INVENTORY_TYPES.some((candidate) => candidate === value);
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function RequirementBadge({
  required,
}: Readonly<{ required: boolean }>): React.ReactElement {
  return required ? (
    <Badge variant="default" className="ml-1.5 align-middle text-[0.65rem]">
      Required
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="ml-1.5 align-middle text-[0.65rem] text-muted-readable"
    >
      Optional
    </Badge>
  );
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: Readonly<{
  htmlFor?: string;
  children: React.ReactNode;
  required: boolean;
}>): React.ReactElement {
  return (
    <label
      htmlFor={htmlFor}
      className="text-body-sm font-medium text-foreground"
    >
      {children}
      <RequirementBadge required={required} />
    </label>
  );
}

export function ComponentInventoryCreateDialog({
  tenantId,
  contextOptions,
  defaultStoreId,
}: Readonly<{
  tenantId: string;
  contextOptions: ComponentContextOptions;
  defaultStoreId?: string | undefined;
}>): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [definitions, setDefinitions] = React.useState<
    readonly ComponentDefinitionSummary[]
  >([]);
  const [definitionsLoading, setDefinitionsLoading] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [definitionId, setDefinitionId] = React.useState("");
  const [storeId, setStoreId] = React.useState("");
  const [serialNumber, setSerialNumber] = React.useState("");
  const [lotNumber, setLotNumber] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [batteryConfiguration, setBatteryConfiguration] =
    React.useState<ComponentBatteryConfigurationInput | null>(null);
  const [reason, setReason] = React.useState("");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<ComponentInventoryType>("BATTERY");
  const [uomCode, setUomCode] = React.useState("NOS");
  const [isSerialized, setIsSerialized] = React.useState(true);
  const [trackLot, setTrackLot] = React.useState(false);
  const physicalIntent = React.useRef("");
  const definitionIntent = React.useRef("");

  const selectedDefinition = definitions.find(
    (definition) => definition.componentId === definitionId,
  );
  const batteryConfigurations = React.useMemo(
    () =>
      selectedDefinition?.type === "BATTERY"
        ? batteryConfigurationOptions(selectedDefinition.metadata)
        : [],
    [selectedDefinition],
  );
  const activeStores = contextOptions.stores.filter((store) => store.isActive);

  const loadDefinitions = React.useCallback((): void => {
    setDefinitionsLoading(true);
    void searchComponentDefinitionsAction({
      context: { tenantId },
      limit: 100,
    })
      .then((result) => {
        if (result.ok) {
          setDefinitions(result.data);
          return;
        }
        setFailure(result.message);
      })
      .catch(() => {
        setFailure(
          "Component masters could not be loaded. Retry when the connection is stable.",
        );
      })
      .finally(() => {
        setDefinitionsLoading(false);
      });
  }, [tenantId]);

  function reset(): void {
    setFailure(null);
    setDefinitionId("");
    setStoreId(
      defaultStoreId !== undefined &&
        activeStores.some((store) => store.storeId === defaultStoreId)
        ? defaultStoreId
        : "",
    );
    setSerialNumber("");
    setLotNumber("");
    setExpiryDate("");
    setBatteryConfiguration(null);
    setReason("");
    setCode("");
    setName("");
    setType("BATTERY");
    setUomCode("NOS");
    setIsSerialized(true);
    setTrackLot(false);
    physicalIntent.current = `component-create-physical:${crypto.randomUUID()}`;
    definitionIntent.current = `component-create-master:${crypto.randomUUID()}`;
  }

  function submitPhysical(): void {
    if (
      selectedDefinition === undefined ||
      storeId.length === 0 ||
      reason.trim().length < 3
    ) {
      setFailure(
        "Complete every Required field: component master, active stock location, and creation reason.",
      );
      return;
    }
    if (selectedDefinition.isSerialized && serialNumber.trim().length === 0) {
      setFailure(
        "This master is serialized, so the physical serial number is Required.",
      );
      return;
    }
    if (selectedDefinition.trackLot && lotNumber.trim().length === 0) {
      setFailure("This master is lot tracked, so the lot number is Required.");
      return;
    }
    if (selectedDefinition.type === "BATTERY") {
      if (batteryConfigurations.length === 0) {
        setFailure(
          "This battery master has no approved battery configurations. Update the component master before creating usable battery stock.",
        );
        return;
      }
      if (batteryConfiguration === null) {
        setFailure(
          "Complete the battery configuration steps before creating this battery.",
        );
        return;
      }
    }

    setFailure(null);
    startTransition(async () => {
      const result = await createPhysicalComponentAction({
        context: { tenantId },
        componentId: selectedDefinition.componentId,
        storeId,
        serialNumber: nullable(serialNumber),
        lotNumber: nullable(lotNumber),
        expiryDate: expiryDate.length === 0 ? null : expiryDate,
        batteryConfiguration:
          selectedDefinition.type === "BATTERY" ? batteryConfiguration : null,
        reason: reason.trim(),
        idempotencyKey: physicalIntent.current,
      });
      if (!result.ok) {
        setFailure(
          result.requestId === undefined
            ? result.message
            : `${result.message} Reference: ${result.requestId}`,
        );
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function submitDefinition(): void {
    if (code.trim().length < 2 || name.trim().length < 2) {
      setFailure(
        "Component code and component name are Required and must be valid.",
      );
      return;
    }

    setFailure(null);
    startTransition(async () => {
      const result = await createComponentDefinitionAction({
        context: { tenantId },
        code: code.trim(),
        name: name.trim(),
        type,
        uomCode: nullable(uomCode),
        isSerialized,
        trackLot,
        idempotencyKey: definitionIntent.current,
      });
      if (!result.ok) {
        setFailure(
          result.requestId === undefined
            ? result.message
            : `${result.message} Reference: ${result.requestId}`,
        );
        return;
      }
      setDefinitions((current) => [result.data, ...current]);
      setDefinitionId(result.data.componentId);
      setFailure(null);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          reset();
          loadDefinitions();
        }
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="h-9 rounded-xl">
          <Plus aria-hidden="true" className="size-4" />
          New component
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create component inventory</DialogTitle>
          <DialogDescription>
            Create a physical component that can enter custody, or create a
            reusable component master. Required and Optional fields are
            identified before submission.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Tabs defaultValue="physical" className="grid gap-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="physical">
                <PackagePlus aria-hidden="true" /> Physical component
              </TabsTrigger>
              <TabsTrigger value="master">
                <CirclePlus aria-hidden="true" /> Component master
              </TabsTrigger>
            </TabsList>

            <TabsContent value="physical" className="grid gap-5">
              <Alert>
                <Sparkles aria-hidden="true" />
                <AlertTitle>Create real stock</AlertTitle>
                <AlertDescription>
                  Start with the product master and physical stock location.
                  Tracking fields become Required automatically when the
                  selected master uses serial or lot tracking.
                </AlertDescription>
              </Alert>

              <section
                className="grid gap-4 rounded-2xl border border-border/70 p-4"
                aria-labelledby="physical-component-required"
              >
                <h3
                  id="physical-component-required"
                  className="text-card-title"
                >
                  1. Required identity and custody
                </h3>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="component-create-master" required>
                    Component master
                  </FieldLabel>
                  <Select
                    value={definitionId}
                    onValueChange={(value) => {
                      setDefinitionId(value);
                      setBatteryConfiguration(null);
                      setFailure(null);
                    }}
                    disabled={definitionsLoading}
                  >
                    <SelectTrigger id="component-create-master">
                      <SelectValue
                        placeholder={
                          definitionsLoading
                            ? "Loading component masters…"
                            : "Choose the component product"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {definitions.map((definition) => (
                        <SelectItem
                          key={definition.componentId}
                          value={definition.componentId}
                        >
                          {definition.name} · {definition.code} ·{" "}
                          {humanize(definition.type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <FieldLabel required>Initial stock location</FieldLabel>
                  <ComponentStorePicker
                    stores={activeStores}
                    value={storeId.length === 0 ? undefined : storeId}
                    onValueChange={(value) => {
                      setStoreId(value ?? "");
                    }}
                    allowAll={false}
                    activeOnly
                    triggerLabel="Choose active stock location"
                  />
                  <p className="text-caption text-muted-readable">
                    Only backend-authorized active stores can receive newly
                    created physical stock.
                  </p>
                </div>
              </section>

              {selectedDefinition?.type === "BATTERY" ? (
                batteryConfigurations.length > 0 ? (
                  <ComponentBatteryConfigurationWizard
                    key={selectedDefinition.componentId}
                    options={batteryConfigurations}
                    value={batteryConfiguration}
                    onValueChange={(value) => {
                      setBatteryConfiguration(value);
                      setFailure(null);
                    }}
                    disabled={pending}
                  />
                ) : (
                  <Alert variant="warning">
                    <TriangleAlert aria-hidden="true" />
                    <AlertTitle>
                      Battery master configuration is incomplete
                    </AlertTitle>
                    <AlertDescription>
                      Approved battery choices are not published on this master.
                      Create or update product master configuration before
                      adding physical battery stock.
                    </AlertDescription>
                  </Alert>
                )
              ) : null}

              <section
                className="grid gap-4 rounded-2xl border border-border/70 p-4"
                aria-labelledby="physical-component-tracking"
              >
                <h3
                  id="physical-component-tracking"
                  className="text-card-title"
                >
                  2. Tracking details
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <FieldLabel
                      htmlFor="component-create-serial"
                      required={selectedDefinition?.isSerialized ?? false}
                    >
                      Serial number
                    </FieldLabel>
                    <Input
                      id="component-create-serial"
                      value={serialNumber}
                      onChange={(event) => {
                        setSerialNumber(event.currentTarget.value);
                      }}
                      maxLength={256}
                      placeholder={
                        selectedDefinition?.isSerialized
                          ? "Scan or enter serial number"
                          : "Not required by this master"
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel
                      htmlFor="component-create-lot"
                      required={selectedDefinition?.trackLot ?? false}
                    >
                      Lot number
                    </FieldLabel>
                    <Input
                      id="component-create-lot"
                      value={lotNumber}
                      onChange={(event) => {
                        setLotNumber(event.currentTarget.value);
                      }}
                      maxLength={128}
                      placeholder={
                        selectedDefinition?.trackLot
                          ? "Enter production / receipt lot"
                          : "Optional"
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2 sm:max-w-xs">
                  <FieldLabel
                    htmlFor="component-create-expiry"
                    required={false}
                  >
                    Expiry date
                  </FieldLabel>
                  <Input
                    id="component-create-expiry"
                    type="date"
                    value={expiryDate}
                    placeholder="Select expiry date"
                    onChange={(event) => {
                      setExpiryDate(event.currentTarget.value);
                    }}
                  />
                </div>
              </section>

              <div className="grid gap-2">
                <FieldLabel htmlFor="component-create-reason" required>
                  Creation reason
                </FieldLabel>
                <Textarea
                  id="component-create-reason"
                  value={reason}
                  onChange={(event) => {
                    setReason(event.currentTarget.value);
                  }}
                  maxLength={500}
                  rows={3}
                  placeholder="Example: Received replacement battery from central warehouse against approved inward stock."
                />
              </div>

              {failure === null ? null : (
                <Alert variant="destructive">
                  <TriangleAlert aria-hidden="true" />
                  <AlertTitle>Component not created</AlertTitle>
                  <AlertDescription>{failure}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={submitPhysical}
                  disabled={pending || definitionsLoading}
                >
                  {pending ? "Creating…" : "Create physical component"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="master" className="grid gap-5">
              <Alert>
                <Boxes aria-hidden="true" />
                <AlertTitle>Define reusable product identity</AlertTitle>
                <AlertDescription>
                  A master does not create physical stock. It defines the
                  component product, type, unit of measure, and tracking policy
                  used by future physical instances.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <FieldLabel htmlFor="component-master-code" required>
                    Component code
                  </FieldLabel>
                  <Input
                    id="component-master-code"
                    value={code}
                    onChange={(event) => {
                      setCode(event.currentTarget.value);
                    }}
                    maxLength={64}
                    placeholder="Example: LFP"
                  />
                </div>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="component-master-name" required>
                    Component name
                  </FieldLabel>
                  <Input
                    id="component-master-name"
                    value={name}
                    onChange={(event) => {
                      setName(event.currentTarget.value);
                    }}
                    maxLength={160}
                    placeholder="Example: LFP Battery"
                  />
                </div>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="component-master-type" required>
                    Component type
                  </FieldLabel>
                  <Select
                    value={type}
                    onValueChange={(value) => {
                      if (isComponentType(value)) setType(value);
                    }}
                  >
                    <SelectTrigger id="component-master-type">
                      <SelectValue placeholder="Choose component type" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPONENT_INVENTORY_TYPES.map((componentType) => (
                        <SelectItem key={componentType} value={componentType}>
                          {humanize(componentType)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="component-master-uom" required={false}>
                    Unit of measure
                  </FieldLabel>
                  <Input
                    id="component-master-uom"
                    value={uomCode}
                    onChange={(event) => {
                      setUomCode(event.currentTarget.value);
                    }}
                    maxLength={32}
                    placeholder="NOS"
                  />
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-border/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-body-sm font-medium">
                      Serialized tracking
                    </p>
                    <p className="text-caption text-muted-readable">
                      Require one unique physical serial identity for each
                      component instance.
                    </p>
                  </div>
                  <Switch
                    checked={isSerialized}
                    onCheckedChange={setIsSerialized}
                    aria-label="Serialized tracking"
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-body-sm font-medium">Lot tracking</p>
                    <p className="text-caption text-muted-readable">
                      Require a production or receipt lot number for each
                      physical instance.
                    </p>
                  </div>
                  <Switch
                    checked={trackLot}
                    onCheckedChange={setTrackLot}
                    aria-label="Lot tracking"
                  />
                </div>
              </div>

              {failure === null ? null : (
                <Alert variant="destructive">
                  <TriangleAlert aria-hidden="true" />
                  <AlertTitle>Master not created</AlertTitle>
                  <AlertDescription>{failure}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={submitDefinition}
                  disabled={pending}
                >
                  {pending ? "Creating…" : "Create component master"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

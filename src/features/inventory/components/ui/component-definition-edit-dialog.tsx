// oz-next-app/src/features/inventory/components/ui/component-definition-edit-dialog.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, PencilLine } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  updateComponentDefinitionAction,
  type ComponentDefinitionActionResult,
} from "@/features/inventory/components/actions/component-inventory.actions";
import type {
  ComponentDefinitionSummary,
  ComponentInventoryContext,
} from "@/features/inventory/components/contracts/component-inventory.schema";

function actionFailure(result: ComponentDefinitionActionResult): string {
  if (result.ok) {
    return "";
  }

  return result.requestId === undefined
    ? result.message
    : `${result.message} Reference: ${result.requestId}`;
}

function intent(): string {
  return `component-master-update:${crypto.randomUUID()}`;
}

export function ComponentDefinitionEditDialog({
  definition,
  context,
}: Readonly<{
  definition: ComponentDefinitionSummary;
  context: ComponentInventoryContext;
}>): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(definition.name);
  const [uomCode, setUomCode] = React.useState(definition.uomCode ?? "");
  const [isSerialized, setIsSerialized] = React.useState(
    definition.isSerialized,
  );
  const [trackLot, setTrackLot] = React.useState(definition.trackLot);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const idempotencyKeyRef = React.useRef("");

  function reset(): void {
    setName(definition.name);
    setUomCode(definition.uomCode ?? "");
    setIsSerialized(definition.isSerialized);
    setTrackLot(definition.trackLot);
    setFailure(null);
    idempotencyKeyRef.current = intent();
  }

  function submit(): void {
    const normalizedName = name.trim();
    const normalizedUom = uomCode.trim();
    const nextUom = normalizedUom.length === 0 ? null : normalizedUom;

    if (normalizedName.length < 2) {
      setFailure("Enter a component name with at least 2 characters.");
      return;
    }

    const nameChanged = normalizedName !== definition.name;
    const uomChanged = nextUom !== definition.uomCode;
    const serializedChanged = isSerialized !== definition.isSerialized;
    const lotTrackingChanged = trackLot !== definition.trackLot;

    if (
      !nameChanged &&
      !uomChanged &&
      !serializedChanged &&
      !lotTrackingChanged
    ) {
      setFailure("Change at least one component master field before saving.");
      return;
    }

    setFailure(null);
    startTransition(async () => {
      const result = await updateComponentDefinitionAction({
        context,
        componentId: definition.componentId,
        rowVersion: definition.rowVersion,
        ...(nameChanged ? { name: normalizedName } : {}),
        ...(uomChanged ? { uomCode: nextUom } : {}),
        ...(serializedChanged ? { isSerialized } : {}),
        ...(lotTrackingChanged ? { trackLot } : {}),
        idempotencyKey: idempotencyKeyRef.current,
      });

      if (!result.ok) {
        setFailure(actionFailure(result));
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          reset();
        }
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <PencilLine aria-hidden="true" />
          Edit master
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit component master</DialogTitle>
          <DialogDescription>
            Update shared master attributes for {definition.code}. Physical
            serial, lot, configuration, and custody data are managed through
            their dedicated audited workflows.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid gap-4">
          <Alert>
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Shared definition</AlertTitle>
            <AlertDescription>
              Changes apply to every physical instance that references this
              component master. Code and component type remain immutable in this
              workflow.
            </AlertDescription>
          </Alert>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <label
                htmlFor="component-master-code"
                className="text-body-sm font-medium"
              >
                Component code
              </label>
              <Input
                id="component-master-code"
                value={definition.code}
                placeholder="Component code"
                readOnly
                aria-readonly="true"
              />
            </div>
            <div className="grid gap-2">
              <label
                htmlFor="component-master-type"
                className="text-body-sm font-medium"
              >
                Component type
              </label>
              <Input
                id="component-master-type"
                value={definition.type}
                placeholder="Component type"
                readOnly
                aria-readonly="true"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="component-master-name"
              className="text-body-sm font-medium"
            >
              Component name
            </label>
            <Input
              id="component-master-name"
              value={name}
              placeholder="Enter component name"
              onChange={(event) => {
                setName(event.currentTarget.value);
                setFailure(null);
              }}
              maxLength={160}
            />
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="component-master-uom"
              className="text-body-sm font-medium"
            >
              Unit of measure
            </label>
            <Input
              id="component-master-uom"
              value={uomCode}
              onChange={(event) => {
                setUomCode(event.currentTarget.value);
                setFailure(null);
              }}
              maxLength={32}
              placeholder="Example: NOS"
            />
          </div>

          <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
            <label className="flex items-start gap-3 text-body-sm">
              <Checkbox
                checked={isSerialized}
                onCheckedChange={(checked) => {
                  if (typeof checked === "boolean") {
                    setIsSerialized(checked);
                    setFailure(null);
                  }
                }}
                aria-label="Serialized component"
              />
              <span className="grid gap-0.5">
                <span className="font-medium text-foreground">Serialized</span>
                <span className="text-caption text-muted-readable">
                  Physical instances normally require a unique serial identity.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-body-sm">
              <Checkbox
                checked={trackLot}
                onCheckedChange={(checked) => {
                  if (typeof checked === "boolean") {
                    setTrackLot(checked);
                    setFailure(null);
                  }
                }}
                aria-label="Track component lots"
              />
              <span className="grid gap-0.5">
                <span className="font-medium text-foreground">Track lots</span>
                <span className="text-caption text-muted-readable">
                  Preserve lot-level traceability for physical inventory.
                </span>
              </span>
            </label>
          </div>

          {failure === null ? null : (
            <Alert variant="destructive" role="alert">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Master update not completed</AlertTitle>
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save master changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// oz-next-app/src/features/inventory/components/ui/component-reconciliation-dialog.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LoaderCircle, MapPinCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Textarea } from "@/components/ui/textarea";

import { reconcileComponentsAction } from "@/features/inventory/components/actions/component-inventory.actions";
import type {
  ComponentContextOptions,
  ComponentInventoryContext,
  ComponentInventoryItem,
} from "@/features/inventory/components/contracts/component-inventory.schema";
import { ComponentStorePicker } from "@/features/inventory/components/ui/component-inventory-scope-dialogs";

function failureMessage(
  result: Readonly<{ message: string; requestId?: string }>,
): string {
  return result.requestId === undefined
    ? result.message
    : `${result.message} Reference: ${result.requestId}`;
}

export function ComponentReconciliationDialog({
  items,
  context,
  contextOptions,
  onCompleted,
}: Readonly<{
  items: readonly ComponentInventoryItem[];
  context: ComponentInventoryContext;
  contextOptions: ComponentContextOptions;
  onCompleted: () => void;
}>): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [storeId, setStoreId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [failure, setFailure] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const idempotencyKeyRef = React.useRef("");
  const activeStores = contextOptions.stores.filter((store) => store.isActive);
  const selectedStore = activeStores.find((store) => store.storeId === storeId);

  function submit(): void {
    if (
      items.length === 0 ||
      selectedStore === undefined ||
      reason.trim().length < 5
    ) {
      setFailure(
        "Choose an authorized active store and enter a clear reconciliation reason.",
      );
      return;
    }

    startTransition(async () => {
      const result = await reconcileComponentsAction({
        context,
        components: items.map((item) => ({
          componentInventoryId: item.componentInventoryId,
          custodyRowVersion: item.custodyRowVersion,
        })),
        storeId: selectedStore.storeId,
        reason: reason.trim(),
        idempotencyKey: idempotencyKeyRef.current,
      });
      if (!result.ok) {
        setFailure(failureMessage(result));
        return;
      }
      setOpen(false);
      onCompleted();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setStoreId("");
          setReason("");
          setFailure(null);
          idempotencyKeyRef.current = `component-reconcile:${crypto.randomUUID()}`;
        }
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" disabled={items.length === 0}>
          <MapPinCheck aria-hidden="true" />
          Reconcile {items.length.toLocaleString("en-IN")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirm physical stock location</DialogTitle>
          <DialogDescription>
            This audited action marks the selected Unlocated components
            Available at one verified stock location. It does not infer custody
            from historical vehicle or installation data.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <Alert>
            <MapPinCheck aria-hidden="true" />
            <AlertTitle>
              {items.length.toLocaleString("en-IN")} component
              {items.length === 1 ? "" : "s"} selected
            </AlertTitle>
            <AlertDescription>
              The entire batch succeeds or fails together if any row changed
              after this page loaded.
            </AlertDescription>
          </Alert>

          <div className="grid gap-2">
            <label className="text-body-sm font-medium">
              Verified stock location
            </label>
            <ComponentStorePicker
              stores={activeStores}
              value={storeId.length === 0 ? undefined : storeId}
              onValueChange={(value) => {
                setStoreId(value ?? "");
                setFailure(null);
              }}
              allowAll={false}
              activeOnly
              triggerLabel="Choose authorized active store"
            />
          </div>

          <div className="grid gap-2">
            <label
              className="text-body-sm font-medium"
              htmlFor="component-reconciliation-reason"
            >
              Verification reason
            </label>
            <Textarea
              id="component-reconciliation-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.currentTarget.value);
                setFailure(null);
              }}
              maxLength={500}
              rows={3}
              placeholder="Example: Physical count completed at the central spare-parts cage on 11 Aug 2026."
            />
          </div>

          {failure === null ? null : (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Reconciliation not completed</AlertTitle>
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
          <Button
            type="button"
            onClick={submit}
            disabled={pending || items.length === 0}
          >
            {pending ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : null}
            Confirm location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

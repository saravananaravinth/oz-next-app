// oz-next-app/src/features/integrations/zoho-inventory/ui/zoho-connection-actions.tsx
"use client";

import * as React from "react";
import { LoaderCircle, RefreshCw, RotateCcw, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/shared/hooks";

import {
  disconnectZohoConnectionAction,
  runZohoReconciliationAction,
  verifyZohoConnectionAction,
} from "@/features/integrations/zoho-inventory/actions/zoho-inventory.actions";
import type { ZohoExternalConnection } from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";
import type { ZohoInventoryCapabilities } from "@/features/integrations/zoho-inventory/policies/zoho-inventory.policy";
import { ZohoConnectControl } from "@/features/integrations/zoho-inventory/ui/zoho-connect-control";

function failureDescription(
  input: Readonly<{ message: string; requestId?: string }>,
): string {
  return input.requestId === undefined
    ? input.message
    : `${input.message} Reference: ${input.requestId}`;
}

export function ZohoConnectionActions({
  connection,
  capabilities,
}: Readonly<{
  connection: ZohoExternalConnection;
  capabilities: ZohoInventoryCapabilities;
}>): React.ReactElement {
  const router = useRouter();
  const [operation, setOperation] = React.useState<
    "verify" | "sync" | "disconnect" | null
  >(null);
  const isBusy = operation !== null;

  function verify(): void {
    setOperation("verify");
    void verifyZohoConnectionAction({
      connectionId: connection.connectionId,
    }).then((result) => {
      setOperation(null);

      if (!result.ok) {
        toast.error({
          title: "Zoho verification failed",
          description: failureDescription(result),
          replace: true,
        });
        return;
      }

      toast.success({
        title: "Zoho connection verified",
        description: `${result.data.organizationName} is accessible with the current authorization.`,
        replace: true,
      });
      router.refresh();
    });
  }

  function reconcile(): void {
    setOperation("sync");
    const idempotencyKey = `zoho-reconcile:${crypto.randomUUID()}`;

    void runZohoReconciliationAction({
      connectionId: connection.connectionId,
      idempotencyKey,
    }).then((result) => {
      setOperation(null);

      if (!result.ok) {
        toast.error({
          title: "Reconciliation could not be queued",
          description: failureDescription(result),
          replace: true,
        });
        return;
      }

      toast.success({
        title: "Zoho reconciliation queued",
        description:
          "The organization verification job is queued on the private synchronization worker.",
        replace: true,
      });
      router.refresh();
    });
  }

  function disconnect(): void {
    setOperation("disconnect");
    void disconnectZohoConnectionAction({
      connectionId: connection.connectionId,
    }).then((result) => {
      setOperation(null);

      if (!result.ok) {
        toast.error({
          title: "Zoho connection could not be disconnected",
          description: failureDescription(result),
          replace: true,
        });
        return;
      }

      toast.success({
        title: "Zoho Inventory disconnected",
        description:
          "The refresh credential was revoked and this ERP connection is disabled.",
        replace: true,
      });
      router.refresh();
    });
  }

  if (
    connection.status === "REAUTH_REQUIRED" ||
    connection.status === "DISABLED"
  ) {
    return capabilities.canConfigure ? (
      <ZohoConnectControl
        fixedDataCenter={connection.dataCenter}
        forceConsent
        label={
          connection.status === "REAUTH_REQUIRED"
            ? "Reconnect Zoho"
            : "Connect again"
        }
      />
    ) : (
      <span className="text-caption text-muted-readable">
        Configuration permission required
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {capabilities.canConfigure ? (
        <Button
          type="button"
          variant="outline"
          onClick={verify}
          disabled={isBusy}
        >
          {operation === "verify" ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <RefreshCw aria-hidden="true" className="size-4" />
          )}
          Verify
        </Button>
      ) : null}

      {capabilities.canRunSync ? (
        <Button
          type="button"
          variant="outline"
          onClick={reconcile}
          disabled={isBusy}
        >
          {operation === "sync" ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <RotateCcw aria-hidden="true" className="size-4" />
          )}
          Reconcile
        </Button>
      ) : null}

      {capabilities.canConfigure ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              disabled={isBusy}
              className="text-destructive hover:text-destructive"
            >
              <Unplug aria-hidden="true" className="size-4" />
              Disconnect
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <Unplug aria-hidden="true" />
              </AlertDialogMedia>
              <AlertDialogTitle>Disconnect Zoho Inventory?</AlertDialogTitle>
              <AlertDialogDescription>
                This revokes the stored Zoho refresh credential and disables
                future synchronization for {connection.organizationName}.
                Historical synchronization records remain available for audit
                and reconciliation history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={operation === "disconnect"}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={disconnect}
                disabled={operation === "disconnect"}
              >
                {operation === "disconnect" ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                ) : null}
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}

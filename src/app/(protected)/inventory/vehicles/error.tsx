// oz-next-app/src/app/(protected)/inventory/vehicles/error.tsx
"use client";

import { useSyncExternalStore, type ReactElement } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

import {
  ContentHeader,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type VehicleInventoryErrorProps = Readonly<{
  error: Error & { readonly digest?: string };
  reset: () => void;
}>;

const SAFE_DIGEST_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

function subscribeToConnectivity(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);

  return (): void => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function browserOnlineSnapshot(): boolean {
  return navigator.onLine;
}

function serverOnlineSnapshot(): true {
  return true;
}

export default function VehicleInventoryError({
  error,
  reset,
}: VehicleInventoryErrorProps): ReactElement {
  const isOnline = useSyncExternalStore(
    subscribeToConnectivity,
    browserOnlineSnapshot,
    serverOnlineSnapshot,
  );
  const digest = error.digest?.trim() ?? "";
  const reference = SAFE_DIGEST_PATTERN.test(digest) ? digest : null;

  return (
    <ContentRoot width="narrow" aria-labelledby="inventory-error-title">
      <ContentHeader
        eyebrow={
          <Badge variant={isOnline ? "destructive" : "secondary"}>
            {isOnline ? "Unexpected failure" : "Offline"}
          </Badge>
        }
        title={
          <span id="inventory-error-title">
            Vehicle inventory could not be opened
          </span>
        }
        description={
          isOnline
            ? "The protected inventory route failed outside the expected API error states. No inventory records were changed or cached."
            : "This device is offline. Protected inventory is never served from a stale browser or CDN cache."
        }
      />
      <ContentStatus
        variant={isOnline ? "destructive" : "warning"}
        role="alert"
        aria-live="assertive"
        icon={
          isOnline ? (
            <AlertTriangle aria-hidden="true" />
          ) : (
            <WifiOff aria-hidden="true" />
          )
        }
        title={isOnline ? "Inventory workspace failed" : "Connection required"}
        description={
          <>
            {isOnline
              ? "Retry the route. If the failure continues, provide the safe reference to the platform team."
              : "Reconnect to the network, then retry the inventory workspace."}
            {reference === null ? null : (
              <span className="mt-2 block text-caption">
                Reference: <code>{reference}</code>
              </span>
            )}
          </>
        }
        actions={
          <Button type="button" onClick={reset} disabled={!isOnline}>
            <RefreshCw aria-hidden="true" className="size-4" />
            {isOnline ? "Try again" : "Waiting for connection"}
          </Button>
        }
      />
    </ContentRoot>
  );
}

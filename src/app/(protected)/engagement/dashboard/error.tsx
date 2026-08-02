// oz-next-app/src/app/(protected)/engagement/dashboard/error.tsx
"use client";

import { useSyncExternalStore, useTransition, type ReactElement } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

import {
  ContentHeader,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type EngagementDashboardErrorProps = Readonly<{
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

export default function EngagementDashboardError({
  error,
  reset,
}: EngagementDashboardErrorProps): ReactElement {
  const [isRetryPending, startRetryTransition] = useTransition();
  const isOnline = useSyncExternalStore(
    subscribeToConnectivity,
    browserOnlineSnapshot,
    serverOnlineSnapshot,
  );
  const digest = error.digest?.trim() ?? "";
  const reference = SAFE_DIGEST_PATTERN.test(digest) ? digest : null;

  function retry(): void {
    startRetryTransition(() => {
      reset();
    });
  }

  return (
    <ContentRoot
      width="narrow"
      aria-labelledby="engagement-dashboard-error-title"
    >
      <ContentHeader
        eyebrow={
          <Badge variant={isOnline ? "destructive" : "secondary"}>
            {isOnline ? "Unexpected failure" : "Offline"}
          </Badge>
        }
        icon={
          isOnline ? (
            <AlertTriangle aria-hidden="true" />
          ) : (
            <WifiOff aria-hidden="true" />
          )
        }
        iconTone={isOnline ? "destructive" : "warning"}
        title={
          <span id="engagement-dashboard-error-title">
            Vehicle-sales engagement could not be opened
          </span>
        }
        description={
          isOnline
            ? "The protected route failed outside the expected validated API states. No engagement mutation was performed by this error boundary."
            : "This device is offline. Protected engagement data is not served from a stale browser or CDN cache."
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
        title={isOnline ? "Engagement workspace failed" : "Connection required"}
        description={
          <>
            {isOnline
              ? "Retry the route. If the failure continues, provide the safe reference to the platform team."
              : "Reconnect to the network, then retry the engagement workspace."}
            {reference === null ? null : (
              <span className="mt-2 block text-caption">
                Reference: <code>{reference}</code>
              </span>
            )}
          </>
        }
        actions={
          <Button
            type="button"
            onClick={retry}
            disabled={!isOnline || isRetryPending}
            aria-busy={isRetryPending}
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            {isRetryPending
              ? "Retrying…"
              : isOnline
                ? "Try again"
                : "Waiting for connection"}
          </Button>
        }
      />
    </ContentRoot>
  );
}

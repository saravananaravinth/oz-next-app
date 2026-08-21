// oz-next-app/src/app/(protected)/engagement/dealers/error.tsx
"use client";

import { useSyncExternalStore, type ReactElement } from "react";
import { RefreshCw, TriangleAlert, WifiOff } from "lucide-react";

import { ContentRoot, ContentStatus } from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";

const SAFE_DIGEST_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export default function DealerOnboardingError({
  error,
  reset,
}: Readonly<{
  error: Error & { readonly digest?: string };
  reset: () => void;
}>): ReactElement {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  const digest = error.digest?.trim() ?? "";
  const reference = SAFE_DIGEST_PATTERN.test(digest) ? digest : null;

  return (
    <ContentRoot width="narrow">
      <ContentStatus
        variant={online ? "destructive" : "warning"}
        icon={
          online ? (
            <TriangleAlert aria-hidden="true" />
          ) : (
            <WifiOff aria-hidden="true" />
          )
        }
        title={
          online
            ? "Dealer onboarding could not be opened"
            : "Connection required"
        }
        description={
          <>
            {online
              ? "The protected onboarding route failed outside its expected API states. No dealer creation should be assumed."
              : "Protected onboarding is never served from stale browser or CDN cache. Reconnect and retry."}
            {reference === null ? null : (
              <span className="mt-2 block text-caption">
                Reference: <code>{reference}</code>
              </span>
            )}
          </>
        }
        actions={
          <Button type="button" onClick={reset} disabled={!online}>
            <RefreshCw aria-hidden="true" className="size-4" />
            {online ? "Try again" : "Waiting for connection"}
          </Button>
        }
      />
    </ContentRoot>
  );
}

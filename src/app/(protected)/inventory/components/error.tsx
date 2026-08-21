// oz-next-app/src/app/(protected)/inventory/components/error.tsx
"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

import {
  ContentHeader,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ComponentInventoryError({
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>): ReactElement {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = (): void => {
      setOnline(true);
    };
    const handleOffline = (): void => {
      setOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <ContentRoot width="narrow" aria-labelledby="component-error-title">
      <ContentHeader
        eyebrow={
          <Badge variant="destructive">Component inventory unavailable</Badge>
        }
        title={
          <span id="component-error-title">
            The component workspace could not be rendered
          </span>
        }
        description="No stale component data is shown after an unexpected rendering or server-boundary failure."
      />

      <ContentStatus
        variant={online ? "destructive" : "warning"}
        icon={
          online ? (
            <AlertTriangle aria-hidden="true" />
          ) : (
            <WifiOff aria-hidden="true" />
          )
        }
        title={
          online ? "Retry the component workspace" : "You appear to be offline"
        }
        description={
          online
            ? "Retry once. If the problem continues, contact ERP support. No component mutation was submitted by this error boundary."
            : "Reconnect to the network before retrying. Component inventory is intentionally not served from a stale authenticated cache."
        }
        actions={
          <Button type="button" onClick={reset} disabled={!online}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Retry
          </Button>
        }
      />
    </ContentRoot>
  );
}

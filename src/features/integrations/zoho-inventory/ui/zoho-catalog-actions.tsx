// oz-next-app/src/features/integrations/zoho-inventory/ui/zoho-catalog-actions.tsx
"use client";

import * as React from "react";
import {
  Copy,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Webhook,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { API_CONFIG } from "@/lib/api/http-contract";
import { toast } from "@/shared/hooks";
import {
  createZohoWebhookEndpointAction,
  disableZohoWebhookEndpointAction,
  rotateZohoWebhookEndpointAction,
  runZohoCatalogueSyncAction,
  runZohoCatalogueSyncBatchAction,
} from "@/features/integrations/zoho-inventory/actions/zoho-inventory.actions";
import type { ZohoWebhookSecretResult } from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";

function notifyFailure(
  title: string,
  result: Readonly<{ message: string; requestId?: string }>,
): void {
  toast.error({
    title,
    description:
      result.requestId === undefined
        ? result.message
        : `${result.message} Reference: ${result.requestId}`,
    replace: true,
  });
}

export function ZohoCatalogueSyncButton({
  connectionId,
  scopeId,
}: Readonly<{ connectionId: string; scopeId: string }>): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  function sync(): void {
    startTransition(async () => {
      const result = await runZohoCatalogueSyncAction({
        connectionId,
        scopeId,
      });
      if (!result.ok) {
        notifyFailure("Catalogue sync could not be queued", result);
        return;
      }
      toast.success({
        title: "Catalogue sync queued",
        description:
          "ERP will refresh each scoped Zoho item without creating or changing component mappings.",
        replace: true,
      });
      router.refresh();
    });
  }
  return (
    <Button size="sm" onClick={sync} disabled={pending} aria-busy={pending}>
      {pending ? (
        <LoaderCircle className="animate-spin" aria-hidden="true" />
      ) : (
        <RefreshCw aria-hidden="true" />
      )}
      Sync now
    </Button>
  );
}

export function ZohoCatalogueSyncAllButton({
  connectionId,
}: Readonly<{ connectionId: string }>): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  function sync(): void {
    startTransition(async () => {
      const result = await runZohoCatalogueSyncBatchAction({ connectionId });
      if (!result.ok) {
        notifyFailure("Category syncs could not be queued", result);
        return;
      }
      toast.success({
        title: "Category syncs queued",
        description: `${result.data.jobs.length.toLocaleString("en-IN")} category syncs will refresh items, composites, and their dependencies.`,
        replace: true,
      });
      router.refresh();
    });
  }
  return (
    <Button size="sm" onClick={sync} disabled={pending} aria-busy={pending}>
      {pending ? (
        <LoaderCircle className="animate-spin" aria-hidden="true" />
      ) : (
        <RefreshCw aria-hidden="true" />
      )}
      Sync all categories
    </Button>
  );
}

export function ZohoWebhookCreateButton({
  connectionId,
}: Readonly<{ connectionId: string }>): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [credential, setCredential] =
    React.useState<ZohoWebhookSecretResult | null>(null);
  function create(): void {
    startTransition(async () => {
      const result = await createZohoWebhookEndpointAction({ connectionId });
      if (!result.ok) {
        notifyFailure("Webhook endpoint could not be created", result);
        return;
      }
      setCredential(result.data);
      router.refresh();
    });
  }
  async function copy(value: string): Promise<void> {
    await navigator.clipboard.writeText(value);
    toast.success({
      title: "Copied",
      description:
        "Store this value in Zoho now; the secret is shown only once.",
      replace: true,
    });
  }
  const url =
    credential === null
      ? null
      : new URL(
          `/erp/channel-ingest/webhooks/zoho-inventory/${credential.endpoint.endpointKey}`,
          API_CONFIG.baseUrl,
        ).toString();
  return (
    <div className="grid gap-3">
      <Button
        size="sm"
        variant="outline"
        onClick={create}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <Webhook aria-hidden="true" />
        )}
        Create endpoint
      </Button>
      {credential !== null && url !== null ? (
        <div
          role="status"
          className="grid gap-2 rounded-xl border border-warning/40 bg-warning/5 p-3 text-caption"
        >
          <p className="font-medium text-foreground">
            Copy now — this secret will not be shown again.
          </p>
          <code className="break-all">URL: {url}</code>
          <code className="break-all">
            X-Oz-Zoho-Webhook-Secret: {credential.secret}
          </code>
          <div className="flex flex-wrap gap-2">
            <Button
              size="xs"
              variant="secondary"
              onClick={() => void copy(url)}
            >
              <Copy aria-hidden="true" />
              Copy URL
            </Button>
            <Button
              size="xs"
              variant="secondary"
              onClick={() => void copy(credential.secret)}
            >
              <Copy aria-hidden="true" />
              Copy secret
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ZohoWebhookEndpointActions({
  connectionId,
  endpointId,
}: Readonly<{ connectionId: string; endpointId: string }>): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [secret, setSecret] = React.useState<string | null>(null);
  function rotate(): void {
    startTransition(async () => {
      const result = await rotateZohoWebhookEndpointAction({
        connectionId,
        endpointId,
      });
      if (!result.ok) {
        notifyFailure("Webhook secret could not be rotated", result);
        return;
      }
      setSecret(result.data.secret);
      router.refresh();
    });
  }
  function disable(): void {
    startTransition(async () => {
      const result = await disableZohoWebhookEndpointAction({
        connectionId,
        endpointId,
      });
      if (!result.ok) {
        notifyFailure("Webhook endpoint could not be disabled", result);
        return;
      }
      setSecret(null);
      router.refresh();
    });
  }
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="xs" variant="outline" onClick={rotate} disabled={pending}>
          <RotateCcw aria-hidden="true" />
          Rotate
        </Button>
        <Button
          size="xs"
          variant="destructive"
          onClick={disable}
          disabled={pending}
        >
          Disable
        </Button>
      </div>
      {secret === null ? null : (
        <code
          role="status"
          className="max-w-xl break-all rounded-lg bg-muted p-2 text-caption"
        >
          New one-time secret: {secret}
        </code>
      )}
    </div>
  );
}

import type { ReactElement } from "react";
import Link from "next/link";
import { AlertTriangle, Boxes, KeyRound, Webhook } from "lucide-react";

import {
  ContentDataSurface,
  ContentEmptyState,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ZohoConnectionOverview,
  ZohoItemDetail,
  ZohoItemsResult,
  ZohoIntegrationSearchParams,
  ZohoWebhookEndpoint,
  ZohoWebhookReceipt,
} from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";
import {
  ZohoCatalogueSyncButton,
  ZohoWebhookCreateButton,
  ZohoWebhookEndpointActions,
} from "@/features/integrations/zoho-inventory/ui/zoho-catalog-actions";

function dateTime(value: string | null): string {
  if (value === null) return "Never";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function ZohoCatalogMonitor({
  overview,
  items,
  webhooks,
  receipts,
  query,
  itemDetail,
  canSync,
  canConfigure,
}: Readonly<{
  overview: ZohoConnectionOverview;
  items: ZohoItemsResult;
  webhooks: readonly ZohoWebhookEndpoint[];
  receipts: readonly ZohoWebhookReceipt[];
  query: ZohoIntegrationSearchParams;
  itemDetail: ZohoItemDetail | null;
  canSync: boolean;
  canConfigure: boolean;
}>): ReactElement {
  const scope = overview.scopes.find((entry) => entry.isActive);
  return (
    <>
      {!overview.itemReadScopeGranted ? (
        <ContentStatus
          variant="warning"
          icon={<AlertTriangle aria-hidden="true" />}
          title="Reconnect Zoho to enable item sync"
          description="The current authorization is missing ZohoInventory.items.READ. Reconnect before running manual, scheduled, or webhook item refreshes."
        />
      ) : null}
      <ContentDataSurface
        title="Catalogue overview"
        description="Monitoring mirrors Zoho data only. ERP components and manufacturing mappings remain authoritative and are never inferred."
        padded
        actions={
          canSync && scope !== undefined && overview.itemReadScopeGranted ? (
            <ZohoCatalogueSyncButton
              connectionId={overview.connection.connectionId}
              scopeId={scope.scopeId}
            />
          ) : undefined
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["In scope", overview.overview.inScopeItems],
            ["All mirrored", overview.overview.totalItems],
            ["Mapped", overview.overview.mappedItems],
            ["Serials", overview.overview.serials],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-xl border bg-muted/20 p-3"
            >
              <p className="text-caption text-muted-readable">{label}</p>
              <p className="text-xl font-semibold text-tabular">
                {Number(value).toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-caption text-muted-readable">
          Daily full reconciliation: 02:00 Asia/Kolkata · Last successful sync:{" "}
          {dateTime(overview.overview.lastSuccessfulSyncAt)} · Scope:{" "}
          {scope?.sourceCode ?? "Not configured"}
        </p>
      </ContentDataSurface>

      <ContentDataSurface
        title="Synced items"
        description={`${items.total.toLocaleString("en-IN")} monitored Zoho items. Select an item to inspect stock and serials.`}
        padded
      >
        <form
          method="get"
          className="mb-4 grid gap-2 rounded-xl border bg-muted/10 p-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <input
            type="hidden"
            name="connection"
            value={overview.connection.connectionId}
          />
          <label className="grid gap-1 text-caption">
            Search
            <input
              className="h-9 rounded-lg border bg-background px-3 text-body-sm"
              type="search"
              name="search"
              defaultValue={query.search ?? ""}
              placeholder="Name or SKU"
            />
          </label>
          <label className="grid gap-1 text-caption">
            Membership
            <select
              className="h-9 rounded-lg border bg-background px-2 text-body-sm"
              name="membership"
              defaultValue={query.membership ?? ""}
            >
              <option value="">All</option>
              <option value="IN_SCOPE">In scope</option>
              <option value="OUT_OF_SCOPE">Out of scope</option>
              <option value="DELETED">Deleted</option>
            </select>
          </label>
          <label className="grid gap-1 text-caption">
            Mapping
            <select
              className="h-9 rounded-lg border bg-background px-2 text-body-sm"
              name="mapping"
              defaultValue={query.mapping ?? ""}
            >
              <option value="">All</option>
              <option value="MAPPED">Mapped</option>
              <option value="UNMAPPED">Unmapped</option>
              <option value="CONFLICT">Conflict</option>
              <option value="INVALID_CONFIGURATION">
                Invalid configuration
              </option>
            </select>
          </label>
          <label className="grid gap-1 text-caption">
            Item status
            <input
              className="h-9 rounded-lg border bg-background px-3 text-body-sm"
              name="itemStatus"
              defaultValue={query.itemStatus ?? ""}
              placeholder="e.g. active"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              className="h-9 rounded-lg bg-primary px-4 text-caption font-medium text-primary-foreground"
              type="submit"
            >
              Apply filters
            </button>
            <Link
              className="h-9 content-center text-caption text-primary underline"
              href={{
                pathname: "/settings/integrations/zoho-inventory",
                query: { connection: overview.connection.connectionId },
              }}
            >
              Clear
            </Link>
          </div>
        </form>
        {items.items.length === 0 ? (
          <ContentEmptyState
            icon={<Boxes aria-hidden="true" />}
            title="No synced items"
            description="Run a manual full sync after reconnecting Zoho with item read access."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead>Mapping</TableHead>
                  <TableHead>Serial tracking</TableHead>
                  <TableHead>Synced</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.items.map((item) => (
                  <TableRow key={item.itemMappingId}>
                    <TableCell>
                      <Link
                        className="font-medium text-primary hover:underline"
                        href={`/settings/integrations/zoho-inventory?connection=${encodeURIComponent(overview.connection.connectionId)}&item=${encodeURIComponent(item.zohoItemId)}`}
                      >
                        {item.name}
                      </Link>
                      <div className="text-caption text-muted-readable">
                        {item.sku ?? item.zohoItemId}
                      </div>
                    </TableCell>
                    <TableCell className="text-tabular">
                      {item.actualAvailableStock ?? item.availableStock ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.membershipState === "IN_SCOPE"
                            ? "success"
                            : item.membershipState === "DELETED"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {item.membershipState}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.mappingStatus === "MAPPED"
                            ? "success"
                            : "outline"
                        }
                      >
                        {item.mappingStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.serialTrackingEnabled ? "Enabled" : "No"}
                    </TableCell>
                    <TableCell>{dateTime(item.lastSyncedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {items.nextCursor === null ? null : (
          <div className="mt-3 flex justify-end">
            <Link
              className="rounded-lg border px-3 py-2 text-caption font-medium"
              href={{
                pathname: "/settings/integrations/zoho-inventory",
                query: {
                  connection: overview.connection.connectionId,
                  cursor: items.nextCursor,
                  ...(query.search === undefined
                    ? {}
                    : { search: query.search }),
                  ...(query.membership === undefined
                    ? {}
                    : { membership: query.membership }),
                  ...(query.mapping === undefined
                    ? {}
                    : { mapping: query.mapping }),
                  ...(query.itemStatus === undefined
                    ? {}
                    : { itemStatus: query.itemStatus }),
                },
              }}
            >
              Next page
            </Link>
          </div>
        )}
      </ContentDataSurface>

      {itemDetail === null ? null : (
        <ContentDataSurface
          title={itemDetail.item.name}
          description={`Zoho item ${itemDetail.item.zohoItemId}`}
          padded
        >
          <div className="grid gap-2 text-body-sm sm:grid-cols-3">
            <p>
              Available stock:{" "}
              <strong>{itemDetail.item.availableStock ?? "—"}</strong>
            </p>
            <p>
              Actual stock:{" "}
              <strong>{itemDetail.item.actualAvailableStock ?? "—"}</strong>
            </p>
            <p>
              Provider modified:{" "}
              <strong>
                {dateTime(itemDetail.item.providerLastModifiedAt)}
              </strong>
            </p>
          </div>
          {itemDetail.imageDownload === null ? null : (
            <p className="mt-3 text-body-sm">
              <a
                className="text-primary underline"
                href={itemDetail.imageDownload.url}
                target="_blank"
                rel="noreferrer"
              >
                Open private item image
              </a>{" "}
              <span className="text-caption text-muted-readable">
                (link expires {dateTime(itemDetail.imageDownload.expiresAt)})
              </span>
            </p>
          )}
          <h3 className="mt-4 font-semibold">
            Serials ({itemDetail.serials.length.toLocaleString("en-IN")})
          </h3>
          {itemDetail.serials.length === 0 ? (
            <p className="mt-2 text-caption text-muted-readable">
              No serial records for this item.
            </p>
          ) : (
            <div className="mt-2 max-h-72 overflow-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transacted out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemDetail.serials.map((serial) => (
                    <TableRow key={serial.zohoSerialId}>
                      <TableCell>{serial.serialNumber}</TableCell>
                      <TableCell>
                        {serial.providerStatus ?? serial.membershipState}
                      </TableCell>
                      <TableCell>
                        {serial.isTransactedOut ? "Yes" : "No"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ContentDataSurface>
      )}

      <ContentDataSurface
        title="Webhook configuration"
        description={`Receipts in the last 24 hours: ${overview.overview.webhookReceipts24h.toLocaleString("en-IN")} (${overview.overview.failedWebhookReceipts24h.toLocaleString("en-IN")} failed or ignored). Payloads are notifications; ERP always re-fetches the authoritative item.`}
        padded
        actions={
          canConfigure ? (
            <ZohoWebhookCreateButton
              connectionId={overview.connection.connectionId}
            />
          ) : undefined
        }
      >
        {webhooks.length === 0 ? (
          <ContentEmptyState
            icon={<Webhook aria-hidden="true" />}
            title="No webhook endpoint"
            description="Create an endpoint, then configure the URL and one-time secret in Zoho Inventory."
          />
        ) : (
          <div className="grid gap-3">
            {webhooks.map((endpoint) => (
              <div
                key={endpoint.webhookEndpointId}
                className="grid gap-2 rounded-xl border p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Badge
                      variant={
                        endpoint.status === "DISABLED" ? "outline" : "success"
                      }
                    >
                      {endpoint.status}
                    </Badge>
                    <p className="mt-1 text-caption text-muted-readable">
                      Last delivery: {dateTime(endpoint.lastReceivedAt)}
                      {endpoint.previousSecretValidUntil === null
                        ? ""
                        : ` · Previous secret valid until ${dateTime(endpoint.previousSecretValidUntil)}`}
                    </p>
                  </div>
                  {canConfigure && endpoint.status !== "DISABLED" ? (
                    <ZohoWebhookEndpointActions
                      connectionId={overview.connection.connectionId}
                      endpointId={endpoint.webhookEndpointId}
                    />
                  ) : null}
                </div>
                <code className="break-all text-caption">
                  /erp/channel-ingest/webhooks/zoho-inventory/
                  {endpoint.endpointKey}
                </code>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 rounded-xl border bg-muted/20 p-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <KeyRound aria-hidden="true" className="size-4" />
            Zoho Inventory setup
          </h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-body-sm">
            <li>
              Reconnect Zoho from ERP to grant{" "}
              <code>ZohoInventory.items.READ</code>.
            </li>
            <li>
              In ERP, create a webhook endpoint and copy the displayed URL and
              one-time secret.
            </li>
            <li>
              In Zoho Inventory, open{" "}
              <strong>
                Settings → Automation → Workflow Actions → Webhooks → + New
                Webhook
              </strong>
              .
            </li>
            <li>
              Select the <strong>Items</strong> module, <code>POST</code>, the
              ERP URL, and the default JSON payload.
            </li>
            <li>
              Add headers <code>Content-Type: application/json</code> and{" "}
              <code>
                X-Oz-Zoho-Webhook-Secret: &lt;ERP-generated secret&gt;
              </code>
              .
            </li>
            <li>
              Create an event-based workflow rule for{" "}
              <strong>Created or Edited</strong>, run every time, and invoke the
              webhook immediately.
            </li>
            <li>
              Create a second event-based rule for <strong>Deleted</strong>,
              invoking the same webhook.
            </li>
            <li>
              Use <strong>Save and Execute</strong>, then verify a receipt and{" "}
              <code>WEBHOOK</code> sync job in ERP.
            </li>
            <li>
              Rotate secrets by updating Zoho during the 24-hour grace window,
              then confirm deliveries use the new secret.
            </li>
          </ol>
        </div>
        {receipts.length === 0 ? null : (
          <div className="mt-5 overflow-x-auto">
            <h3 className="mb-2 font-semibold">Recent delivery outcomes</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Event / item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Failure</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.receiptId}>
                    <TableCell>{dateTime(receipt.receivedAt)}</TableCell>
                    <TableCell>
                      {receipt.eventName ?? "Unknown event"}
                      <div className="text-caption text-muted-readable">
                        {receipt.resourceId ?? "No resource parsed"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          receipt.status === "FAILED"
                            ? "destructive"
                            : receipt.status === "IGNORED"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {receipt.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-caption">
                        {receipt.lastErrorCode ?? "—"}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ContentDataSurface>
    </>
  );
}

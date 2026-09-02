// oz-next-app/src/features/integrations/zoho-inventory/ui/zoho-catalog-monitor.tsx
import type { ReactElement } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Database,
  ExternalLink,
  Filter,
  KeyRound,
  Layers3,
  PackageCheck,
  RotateCcw,
  Search,
  ShieldCheck,
  Webhook,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentEmptyState,
  ContentList,
  ContentListItem,
  ContentMetricCard,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ZohoCompositionGraph,
  ZohoConnectionOverview,
  ZohoIntegrationSearchParams,
  ZohoItem,
  ZohoItemDetail,
  ZohoItemsResult,
  ZohoWebhookEndpoint,
  ZohoWebhookReceipt,
} from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";
import {
  ZohoCatalogueSyncAllButton,
  ZohoWebhookCreateButton,
  ZohoWebhookEndpointActions,
} from "@/features/integrations/zoho-inventory/ui/zoho-catalog-actions";
import { ZohoWebhookReceiptsTable } from "@/features/integrations/zoho-inventory/ui/zoho-webhook-receipts-table";

const ALL_FILTER_VALUE = "__all__";
const ZOHO_ITEMS_PAGE_SIZE = 10;

type PreservedFilters = Readonly<{
  search?: string;
  membership?: string;
  mapping?: string;
  entity?: string;
  category?: string;
  itemStatus?: string;
}>;

function dateTime(value: string | null): string {
  if (value === null) return "Never";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function preservedFilters(
  query: ZohoIntegrationSearchParams,
): PreservedFilters {
  return {
    ...(query.search === undefined ? {} : { search: query.search }),
    ...(query.membership === undefined ? {} : { membership: query.membership }),
    ...(query.mapping === undefined ? {} : { mapping: query.mapping }),
    ...(query.entity === undefined ? {} : { entity: query.entity }),
    ...(query.category === undefined ? {} : { category: query.category }),
    ...(query.itemStatus === undefined ? {} : { itemStatus: query.itemStatus }),
  };
}

function CompositionBranch({
  graph,
  itemId,
  visited,
  nodesById,
  edgesByParent,
}: Readonly<{
  graph: ZohoCompositionGraph;
  itemId: string;
  visited: readonly string[];
  nodesById: ReadonlyMap<string, ZohoItem>;
  edgesByParent: ReadonlyMap<string, ZohoCompositionGraph["edges"]>;
}>): ReactElement {
  const node = nodesById.get(itemId);
  const edges = edgesByParent.get(itemId) ?? [];
  const cycle = visited.includes(itemId);

  if (node === undefined) return <li>Unavailable Zoho item {itemId}</li>;
  if (cycle) return <li>{node.name} (cycle blocked)</li>;
  if (edges.length === 0) return <li>{node.name}</li>;

  return (
    <li>
      <details open={itemId === graph.rootItemId}>
        <summary className="cursor-pointer font-medium">
          {node.name}{" "}
          <span className="text-muted-readable">
            ({node.sku ?? node.zohoItemId})
          </span>
        </summary>
        <ul className="ml-5 mt-2 list-disc space-y-2">
          {edges.map((edge) => (
            <li key={`${edge.parentItemId}:${edge.lineItemId}`}>
              <span className="text-caption text-muted-readable">
                Quantity {edge.quantity}
              </span>
              <ul className="ml-5 mt-1 list-disc">
                <CompositionBranch
                  graph={graph}
                  itemId={edge.childItemId}
                  visited={[...visited, itemId]}
                  nodesById={nodesById}
                  edgesByParent={edgesByParent}
                />
              </ul>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

function CompositionTree({
  graph,
}: Readonly<{ graph: ZohoCompositionGraph }>): ReactElement {
  const nodesById = new Map(
    graph.nodes.map((node) => [node.zohoItemId, node] as const),
  );
  const groupedEdges = new Map<
    string,
    Array<ZohoCompositionGraph["edges"][number]>
  >();

  for (const edge of graph.edges) {
    const existing = groupedEdges.get(edge.parentItemId);
    if (existing === undefined) groupedEdges.set(edge.parentItemId, [edge]);
    else existing.push(edge);
  }

  return (
    <ul className="mt-3 list-disc pl-5 text-body-sm">
      <CompositionBranch
        graph={graph}
        itemId={graph.rootItemId}
        visited={[]}
        nodesById={nodesById}
        edgesByParent={groupedEdges}
      />
    </ul>
  );
}

function SyncedItemsFilter({
  overview,
  query,
}: Readonly<{
  overview: ZohoConnectionOverview;
  query: ZohoIntegrationSearchParams;
}>): ReactElement {
  const scopes = overview.scopes.filter((entry) => entry.isActive);

  return (
    <form
      method="get"
      className="grid gap-3 @2xl/content-data-surface:grid-cols-2 @5xl/content-data-surface:grid-cols-3 @7xl/content-data-surface:grid-cols-7"
    >
      <input
        type="hidden"
        name="connection"
        value={overview.connection.connectionId}
      />

      <div className="grid min-w-0 gap-1.5 @7xl/content-data-surface:col-span-2">
        <Label htmlFor="zoho-item-search">Search</Label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-readable"
          />
          <Input
            id="zoho-item-search"
            className="h-9 rounded-xl pl-9"
            type="search"
            name="search"
            defaultValue={query.search ?? ""}
            placeholder="Name or SKU"
          />
        </div>
      </div>

      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor="zoho-membership-filter">Membership</Label>
        <Select
          name="membership"
          defaultValue={query.membership ?? ALL_FILTER_VALUE}
        >
          <SelectTrigger
            id="zoho-membership-filter"
            size="compact"
            className="w-full"
          >
            <SelectValue placeholder="All membership" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>All</SelectItem>
            <SelectItem value="IN_SCOPE">In scope</SelectItem>
            <SelectItem value="OUT_OF_SCOPE">Out of scope</SelectItem>
            <SelectItem value="DELETED">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor="zoho-mapping-filter">Mapping</Label>
        <Select name="mapping" defaultValue={query.mapping ?? ALL_FILTER_VALUE}>
          <SelectTrigger
            id="zoho-mapping-filter"
            size="compact"
            className="w-full"
          >
            <SelectValue placeholder="All mapping states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>All</SelectItem>
            <SelectItem value="MAPPED">Mapped</SelectItem>
            <SelectItem value="UNMAPPED">Unmapped</SelectItem>
            <SelectItem value="CONFLICT">Conflict</SelectItem>
            <SelectItem value="INVALID_CONFIGURATION">
              Invalid configuration
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor="zoho-entity-filter">Entity kind</Label>
        <Select name="entity" defaultValue={query.entity ?? ALL_FILTER_VALUE}>
          <SelectTrigger
            id="zoho-entity-filter"
            size="compact"
            className="w-full"
          >
            <SelectValue placeholder="All entity kinds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>All</SelectItem>
            <SelectItem value="ITEM">Item</SelectItem>
            <SelectItem value="COMPOSITE">Composite</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor="zoho-category-filter">Category</Label>
        <Select
          name="category"
          defaultValue={query.category ?? ALL_FILTER_VALUE}
        >
          <SelectTrigger
            id="zoho-category-filter"
            size="compact"
            className="w-full"
          >
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>All</SelectItem>
            {scopes.map((scope) =>
              scope.categoryId === null ? null : (
                <SelectItem key={scope.scopeId} value={scope.categoryId}>
                  {scope.categoryName}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor="zoho-item-status-filter">Item status</Label>
        <Input
          id="zoho-item-status-filter"
          className="h-9 rounded-xl"
          name="itemStatus"
          defaultValue={query.itemStatus ?? ""}
          placeholder="e.g. active"
        />
      </div>

      <div className="flex items-end gap-2 @7xl/content-data-surface:col-span-7 @7xl/content-data-surface:justify-end">
        <Button type="submit" size="sm">
          <Filter aria-hidden="true" />
          Apply filters
        </Button>
        <Button asChild type="button" size="sm" variant="ghost">
          <Link
            href={{
              pathname: "/settings/integrations/zoho-inventory",
              query: { connection: overview.connection.connectionId },
            }}
          >
            <RotateCcw aria-hidden="true" />
            Clear
          </Link>
        </Button>
      </div>
    </form>
  );
}

function SyncedItemsTable({
  overview,
  items,
  query,
}: Readonly<{
  overview: ZohoConnectionOverview;
  items: ZohoItemsResult;
  query: ZohoIntegrationSearchParams;
}>): ReactElement {
  const filters = preservedFilters(query);

  if (items.items.length === 0) {
    return (
      <ContentEmptyState
        icon={<Boxes aria-hidden="true" />}
        title="No synced items"
        description={
          overview.itemReadScopeGranted
            ? "Run Sync now to mirror the authorized Zoho catalogue. If it fails, use the safe code in synchronization history when contacting support."
            : "Reconnect Zoho with item read access before running a catalogue sync."
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <Table>
        <TableHeader className="bg-muted/20">
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Membership</TableHead>
            <TableHead>Mapping</TableHead>
            <TableHead>Serial tracking</TableHead>
            <TableHead>Synced</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.items.map((item) => (
            <TableRow key={item.itemMappingId}>
              <TableCell className="max-w-[28rem]">
                <Link
                  className="block truncate font-medium text-primary hover:underline"
                  href={{
                    pathname: "/settings/integrations/zoho-inventory",
                    query: {
                      connection: overview.connection.connectionId,
                      item: item.zohoItemId,
                      ...filters,
                    },
                  }}
                >
                  {item.name}
                </Link>
                <div className="mt-0.5 truncate text-caption text-muted-readable">
                  {item.sku ?? item.zohoItemId}
                </div>
              </TableCell>
              <TableCell>
                <div className="grid gap-1">
                  <Badge variant="outline" className="w-fit">
                    {item.entityKind === "COMPOSITE"
                      ? (item.comboType ?? "COMPOSITE")
                      : "ITEM"}
                  </Badge>
                  <span className="text-caption text-muted-readable">
                    {item.scopeRole}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right text-tabular font-medium">
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
                  {item.membershipState.replaceAll("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    item.mappingStatus === "MAPPED"
                      ? "success"
                      : item.mappingStatus === "CONFLICT" ||
                          item.mappingStatus === "INVALID_CONFIGURATION"
                        ? "warning"
                        : "outline"
                  }
                >
                  {item.mappingStatus.replaceAll("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={item.serialTrackingEnabled ? "info" : "outline"}
                >
                  {item.serialTrackingEnabled ? "Enabled" : "Not tracked"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-readable">
                {dateTime(item.lastSyncedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/65 bg-muted/15 px-4 py-2.5">
        <p className="text-caption text-muted-readable">
          Showing up to {String(ZOHO_ITEMS_PAGE_SIZE)} items per page ·{" "}
          {items.total.toLocaleString("en-IN")} total
        </p>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            {query.cursor === undefined ? null : (
              <PaginationItem>
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={{
                      pathname: "/settings/integrations/zoho-inventory",
                      query: {
                        connection: overview.connection.connectionId,
                        ...filters,
                      },
                    }}
                  >
                    First 10
                  </Link>
                </Button>
              </PaginationItem>
            )}
            <PaginationItem>
              {items.nextCursor === null ? (
                <Badge variant="outline">End of results</Badge>
              ) : (
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={{
                      pathname: "/settings/integrations/zoho-inventory",
                      query: {
                        connection: overview.connection.connectionId,
                        cursor: items.nextCursor,
                        ...filters,
                      },
                    }}
                  >
                    Next 10
                  </Link>
                </Button>
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

function ItemDetail({
  itemDetail,
}: Readonly<{ itemDetail: ZohoItemDetail }>): ReactElement {
  return (
    <ContentDataSurface
      title={itemDetail.item.name}
      description={`Zoho item ${itemDetail.item.zohoItemId}`}
      padded
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <ContentMetricCard
          presentation="dashboard"
          tone="info"
          label="Available stock"
          value={itemDetail.item.availableStock ?? "—"}
          description="Zoho available"
          icon={<PackageCheck aria-hidden="true" />}
        />
        <ContentMetricCard
          presentation="dashboard"
          tone="primary"
          label="Actual stock"
          value={itemDetail.item.actualAvailableStock ?? "—"}
          description="Zoho actual available"
          icon={<Database aria-hidden="true" />}
        />
        <ContentMetricCard
          presentation="dashboard"
          tone="default"
          label="Provider modified"
          value={dateTime(itemDetail.item.providerLastModifiedAt)}
          description="Zoho source timestamp"
          icon={<CheckCircle2 aria-hidden="true" />}
        />
      </div>

      {itemDetail.imageDownload === null ? null : (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/65 bg-muted/20 p-3 text-body-sm">
          <Button asChild size="sm" variant="outline">
            <a
              href={itemDetail.imageDownload.url}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink aria-hidden="true" />
              Open private item image
            </a>
          </Button>
          <span className="text-caption text-muted-readable">
            Link expires {dateTime(itemDetail.imageDownload.expiresAt)}
          </span>
        </div>
      )}

      {itemDetail.composition === null ? null : (
        <div className="mt-4 rounded-2xl border border-border/70 bg-muted/15 p-4">
          <h3 className="inline-flex items-center gap-2 font-semibold">
            <Layers3 aria-hidden="true" className="size-4 text-info" />
            Composite bill of materials
          </h3>
          <p className="mt-1 text-caption text-muted-readable">
            Direct Zoho relationships are preserved; nested composites remain
            expandable.
          </p>
          {itemDetail.composition.truncated ? (
            <p className="mt-2 text-caption text-warning">
              This display reached the 1,000-edge safety limit. Use
              synchronization history to investigate an unexpectedly large
              graph.
            </p>
          ) : null}
          <CompositionTree graph={itemDetail.composition} />
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-border/70">
        <div className="flex items-center justify-between gap-3 border-b border-border/65 bg-muted/20 px-4 py-3">
          <h3 className="font-semibold">Serials</h3>
          <Badge variant="outline">
            {itemDetail.serials.length.toLocaleString("en-IN")}
          </Badge>
        </div>
        {itemDetail.serials.length === 0 ? (
          <p className="p-4 text-caption text-muted-readable">
            No serial records for this item.
          </p>
        ) : (
          <div className="max-h-72 overflow-auto">
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
                    <TableCell className="font-medium">
                      {serial.serialNumber}
                    </TableCell>
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
      </div>
    </ContentDataSurface>
  );
}

function WebhookConfiguration({
  overview,
  webhooks,
  receipts,
  canConfigure,
}: Readonly<{
  overview: ZohoConnectionOverview;
  webhooks: readonly ZohoWebhookEndpoint[];
  receipts: readonly ZohoWebhookReceipt[];
  canConfigure: boolean;
}>): ReactElement {
  return (
    <ContentDataSurface
      title="Webhook configuration"
      description={`Receipts in the last 24 hours: ${overview.overview.webhookReceipts24h.toLocaleString("en-IN")} · ${overview.overview.failedWebhookReceipts24h.toLocaleString("en-IN")} failed or ignored. ERP re-fetches authoritative Zoho data after every accepted notification.`}
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
        <ContentList density="compact">
          {webhooks.map((endpoint) => (
            <ContentListItem
              key={endpoint.webhookEndpointId}
              className="border-border/75 bg-card shadow-xs shadow-foreground/[0.025]"
              media={
                <Webhook aria-hidden="true" className="size-5 text-info" />
              }
              title="Zoho Inventory webhook"
              meta={
                <>
                  <Badge
                    variant={
                      endpoint.status === "DISABLED"
                        ? "outline"
                        : endpoint.status === "ROTATING"
                          ? "warning"
                          : "success"
                    }
                  >
                    {endpoint.status}
                  </Badge>
                  <Badge variant="secondary">
                    {endpoint.allowedResourceTypes.length.toLocaleString(
                      "en-IN",
                    )}{" "}
                    resource types
                  </Badge>
                </>
              }
              description={`Last delivery ${dateTime(endpoint.lastReceivedAt)}`}
              actions={
                canConfigure && endpoint.status !== "DISABLED" ? (
                  <ZohoWebhookEndpointActions
                    connectionId={overview.connection.connectionId}
                    endpointId={endpoint.webhookEndpointId}
                  />
                ) : undefined
              }
            >
              <div className="mt-2 grid gap-3">
                <div className="rounded-xl border border-border/65 bg-muted/20 p-3">
                  <p className="mb-1 text-caption font-medium text-foreground/80">
                    ERP endpoint
                  </p>
                  <code className="block break-all text-caption text-muted-readable">
                    /erp/channel-ingest/webhooks/zoho-inventory/
                    {endpoint.endpointKey}
                  </code>
                </div>
                <ContentDescriptionList columns="two">
                  <ContentDescriptionItem term="Created">
                    {dateTime(endpoint.createdAt)}
                  </ContentDescriptionItem>
                  <ContentDescriptionItem term="Secret rotation">
                    {endpoint.previousSecretValidUntil === null
                      ? "No active grace window"
                      : `Previous secret valid until ${dateTime(endpoint.previousSecretValidUntil)}`}
                  </ContentDescriptionItem>
                </ContentDescriptionList>
              </div>
            </ContentListItem>
          ))}
        </ContentList>
      )}

      <details className="group mt-4 rounded-2xl border border-border/70 bg-muted/15">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-body-sm font-semibold text-foreground marker:hidden">
          <span className="inline-flex items-center gap-2">
            <KeyRound aria-hidden="true" className="size-4 text-info" />
            Zoho Inventory webhook setup guide
          </span>
          <span className="text-caption font-normal text-muted-readable group-open:hidden">
            Show configuration steps
          </span>
          <span className="hidden text-caption font-normal text-muted-readable group-open:inline">
            Hide configuration steps
          </span>
        </summary>
        <div className="border-t border-border/65 px-4 pb-4 pt-3">
          <ol className="list-decimal space-y-2 pl-5 text-body-sm text-foreground/90">
            <li>
              Reconnect Zoho from ERP to grant{" "}
              <code>ZohoInventory.items.READ</code> and{" "}
              <code>ZohoInventory.compositeitems.READ</code>.
            </li>
            <li>
              Create an ERP webhook endpoint and copy the displayed URL and
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
              Configure both <strong>Items</strong> and{" "}
              <strong>Composite Items</strong> modules with <code>POST</code>,
              the ERP URL, and their default JSON payloads.
            </li>
            <li>
              Add <code>Content-Type: application/json</code> and{" "}
              <code>
                X-Oz-Zoho-Webhook-Secret: &lt;ERP-generated secret&gt;
              </code>
              .
            </li>
            <li>
              Create an event-based rule for <strong>Created or Edited</strong>,
              run every time, and invoke the webhook immediately.
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
      </details>

      <ZohoWebhookReceiptsTable receipts={receipts} />
    </ContentDataSurface>
  );
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
  const scopes = overview.scopes.filter((entry) => entry.isActive);

  return (
    <>
      {!overview.itemReadScopeGranted ? (
        <ContentStatus
          variant="warning"
          icon={<AlertTriangle aria-hidden="true" />}
          title="Reconnect Zoho to enable item sync"
          description="The current authorization is missing item or composite-item read access. Reconnect before running catalogue refreshes."
        />
      ) : null}

      <ContentDataSurface
        title="Catalogue overview"
        description="Monitoring mirrors Zoho data only. ERP components and manufacturing mappings remain authoritative and are never inferred."
        padded
        actions={
          canSync && scopes.length > 0 && overview.itemReadScopeGranted ? (
            <ZohoCatalogueSyncAllButton
              connectionId={overview.connection.connectionId}
            />
          ) : undefined
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ContentMetricCard
            presentation="dashboard"
            tone="info"
            label="In scope"
            value={overview.overview.inScopeItems.toLocaleString("en-IN")}
            description="Monitored by ERP"
            icon={<PackageCheck aria-hidden="true" />}
          />
          <ContentMetricCard
            presentation="dashboard"
            tone="primary"
            label="All mirrored"
            value={overview.overview.totalItems.toLocaleString("en-IN")}
            description="Zoho catalogue mirror"
            icon={<Boxes aria-hidden="true" />}
          />
          <ContentMetricCard
            presentation="dashboard"
            tone={overview.overview.mappedItems > 0 ? "success" : "default"}
            label="Mapped"
            value={overview.overview.mappedItems.toLocaleString("en-IN")}
            description="ERP component mappings"
            icon={<ShieldCheck aria-hidden="true" />}
          />
          <ContentMetricCard
            presentation="dashboard"
            tone="default"
            label="Serials"
            value={overview.overview.serials.toLocaleString("en-IN")}
            description="Mirrored serial records"
            icon={<Database aria-hidden="true" />}
          />
        </div>
        <p className="mt-3 text-caption text-muted-readable">
          Daily full reconciliation: 02:00 Asia/Kolkata · Last successful sync:{" "}
          {dateTime(overview.overview.lastSuccessfulSyncAt)} · Scope:{" "}
          {scopes.length === 0
            ? "Not configured"
            : scopes.map((scope) => scope.categoryName).join(", ")}
        </p>
      </ContentDataSurface>

      <ContentDataSurface
        title="Synced items"
        description={`${items.total.toLocaleString("en-IN")} monitored Zoho items · ${String(ZOHO_ITEMS_PAGE_SIZE)} rows per page. Select an item to inspect stock and serials.`}
        toolbar={<SyncedItemsFilter overview={overview} query={query} />}
        padded
      >
        <SyncedItemsTable overview={overview} items={items} query={query} />
      </ContentDataSurface>

      {itemDetail === null ? null : <ItemDetail itemDetail={itemDetail} />}

      <WebhookConfiguration
        overview={overview}
        webhooks={webhooks}
        receipts={receipts}
        canConfigure={canConfigure}
      />
    </>
  );
}

// oz-next-app/src/app/(protected)/settings/integrations/zoho-inventory/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  ZohoInventoryAccessState,
  ZohoInventoryInvalidQueryState,
  ZohoInventoryPage,
  resolveZohoInventoryAccess,
  zohoIntegrationSearchParamsSchema,
  type ZohoIntegrationSearchParams,
} from "@/features/integrations/zoho-inventory";
import {
  readZohoConnections,
  readZohoSyncJobs,
  readZohoConnectionOverview,
  readZohoItems,
  readZohoWebhookEndpoints,
  readZohoWebhookReceipts,
  readZohoItemDetail,
  readCreditNoteOperations,
} from "@/features/integrations/zoho-inventory/server/zoho-inventory.server";
import { readZohoPendingGrant } from "@/features/integrations/zoho-inventory/server/zoho-oauth-session";

const PAGE_TITLE = "Zoho Inventory Integration";
const PAGE_DESCRIPTION =
  "Secure Zoho Inventory OAuth connections, organization verification, and synchronization operations.";

type RawSearchParams = Readonly<Record<string, string | string[] | undefined>>;

type PageProps = Readonly<{
  searchParams: Promise<RawSearchParams>;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
} satisfies Metadata;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function scalar(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseSearchParams(raw: RawSearchParams) {
  const allowed = new Set([
    "oauth",
    "connection",
    "item",
    "search",
    "membership",
    "mapping",
    "itemStatus",
    "cursor",
  ]);

  if (Object.keys(raw).some((key) => !allowed.has(key))) {
    return zohoIntegrationSearchParamsSchema.safeParse({ invalid: "true" });
  }

  if (
    (Array.isArray(raw["oauth"]) && raw["oauth"].length > 0) ||
    (Array.isArray(raw["connection"]) && raw["connection"].length > 0) ||
    (Array.isArray(raw["item"]) && raw["item"].length > 0) ||
    ["search", "membership", "mapping", "itemStatus", "cursor"].some((key) => {
      const value = raw[key];
      return Array.isArray(value) && value.length > 0;
    })
  ) {
    return zohoIntegrationSearchParamsSchema.safeParse({ invalid: "true" });
  }

  return zohoIntegrationSearchParamsSchema.safeParse({
    ...(scalar(raw["oauth"]) === undefined
      ? {}
      : { oauth: scalar(raw["oauth"]) }),
    ...(scalar(raw["connection"]) === undefined
      ? {}
      : { connection: scalar(raw["connection"]) }),
    ...(scalar(raw["item"]) === undefined ? {} : { item: scalar(raw["item"]) }),
    ...(scalar(raw["search"]) === undefined
      ? {}
      : { search: scalar(raw["search"]) }),
    ...(scalar(raw["membership"]) === undefined
      ? {}
      : { membership: scalar(raw["membership"]) }),
    ...(scalar(raw["mapping"]) === undefined
      ? {}
      : { mapping: scalar(raw["mapping"]) }),
    ...(scalar(raw["itemStatus"]) === undefined
      ? {}
      : { itemStatus: scalar(raw["itemStatus"]) }),
    ...(scalar(raw["cursor"]) === undefined
      ? {}
      : { cursor: scalar(raw["cursor"]) }),
  });
}

function selectedConnectionId(
  query: ZohoIntegrationSearchParams,
  connections: Awaited<ReturnType<typeof readZohoConnections>>,
): string | null {
  if (
    query.connection !== undefined &&
    connections.some(
      (connection) => connection.connectionId === query.connection,
    )
  ) {
    return query.connection;
  }

  return (
    connections.find(
      (connection) => connection.isDefault && connection.status !== "DISABLED",
    )?.connectionId ??
    connections.find((connection) => connection.status !== "DISABLED")
      ?.connectionId ??
    connections[0]?.connectionId ??
    null
  );
}

export default async function ZohoInventoryIntegrationRoutePage({
  searchParams,
}: PageProps): Promise<ReactElement> {
  const [me, rawSearchParams] = await Promise.all([
    requireAuthenticatedMe(),
    searchParams,
  ]);
  const parsedQuery = parseSearchParams(rawSearchParams);

  if (!parsedQuery.success) {
    return <ZohoInventoryInvalidQueryState />;
  }

  const access = resolveZohoInventoryAccess(me);

  if (access.kind !== "resolved") {
    return <ZohoInventoryAccessState access={access} />;
  }

  const [connections, stagedGrant] = await Promise.all([
    readZohoConnections({ access }),
    readZohoPendingGrant(),
  ]);
  const pendingGrant =
    stagedGrant !== null && stagedGrant.tenantId === access.tenantId
      ? stagedGrant
      : null;
  const connectionId = selectedConnectionId(parsedQuery.data, connections);
  const selectedConnection =
    connectionId === null
      ? null
      : (connections.find(
          (connection) => connection.connectionId === connectionId,
        ) ?? null);
  const effectivePermissions =
    me.auth?.permissionResolution?.effectivePermissions ??
    me.auth?.effectivePermissions ??
    me.permissions;
  const canReadCreditNoteOperations =
    access.actorKind === "SUPER_ADMIN" ||
    effectivePermissions.includes("credit-note:provider-config:read");
  const canManageCreditNoteOperations =
    access.actorKind === "SUPER_ADMIN" ||
    effectivePermissions.includes("credit-note:reconciliation:run");
  const [
    jobs,
    overview,
    items,
    webhooks,
    receipts,
    itemDetail,
    creditNoteOperations,
  ] =
    selectedConnection === null
      ? ([
          [],
          null,
          { items: [], total: 0, nextCursor: null },
          [],
          [],
          null,
          null,
        ] as const)
      : await Promise.all([
          readZohoSyncJobs({
            access,
            connectionId: selectedConnection.connectionId,
            limit: 50,
          }),
          readZohoConnectionOverview({
            access,
            connectionId: selectedConnection.connectionId,
          }),
          readZohoItems({
            access,
            connectionId: selectedConnection.connectionId,
            limit: 50,
            ...(parsedQuery.data.cursor === undefined
              ? {}
              : { cursor: parsedQuery.data.cursor }),
            ...(parsedQuery.data.search === undefined
              ? {}
              : { search: parsedQuery.data.search }),
            ...(parsedQuery.data.membership === undefined
              ? {}
              : { membershipState: parsedQuery.data.membership }),
            ...(parsedQuery.data.mapping === undefined
              ? {}
              : { mappingStatus: parsedQuery.data.mapping }),
            ...(parsedQuery.data.itemStatus === undefined
              ? {}
              : { itemStatus: parsedQuery.data.itemStatus }),
            ...(parsedQuery.data.entity === undefined
              ? {}
              : { entityKind: parsedQuery.data.entity }),
            ...(parsedQuery.data.category === undefined
              ? {}
              : { categoryId: parsedQuery.data.category }),
          }),
          readZohoWebhookEndpoints({
            access,
            connectionId: selectedConnection.connectionId,
          }),
          readZohoWebhookReceipts({
            access,
            connectionId: selectedConnection.connectionId,
          }),
          parsedQuery.data.item === undefined
            ? Promise.resolve(null)
            : readZohoItemDetail({
                access,
                connectionId: selectedConnection.connectionId,
                itemId: parsedQuery.data.item,
              }),
          canReadCreditNoteOperations
            ? readCreditNoteOperations({ access })
            : Promise.resolve(null),
        ]);
  const query: ZohoIntegrationSearchParams =
    parsedQuery.data.oauth === "authorized" && pendingGrant === null
      ? { ...parsedQuery.data, oauth: "context-lost" }
      : parsedQuery.data;

  return (
    <ZohoInventoryPage
      access={access}
      connections={connections}
      selectedConnection={selectedConnection}
      jobs={jobs}
      pendingGrant={pendingGrant}
      query={query}
      overview={overview}
      items={items}
      webhooks={webhooks}
      receipts={receipts}
      itemDetail={itemDetail}
      creditNoteOperations={creditNoteOperations}
      canManageCreditNoteOperations={canManageCreditNoteOperations}
    />
  );
}

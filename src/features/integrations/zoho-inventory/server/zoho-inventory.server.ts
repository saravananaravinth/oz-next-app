// oz-next-app/src/features/integrations/zoho-inventory/server/zoho-inventory.server.ts
import "server-only";

import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import { ZOHO_INVENTORY_ENDPOINTS } from "@/lib/api/endpoints";
import { HTTP_METHODS } from "@/lib/api/http-contract";
import { serverApiClient } from "@/server/api/edge-api-client";
import type { ServerActorContextHeaders } from "@/server/api/request-context-headers";

import {
  zohoAuthorizationExchangeResultSchema,
  zohoAuthorizationStartResultSchema,
  zohoConnectionsSchema,
  zohoExternalConnectionSchema,
  zohoSyncJobSchema,
  zohoSyncJobsSchema,
  zohoVerifyResultSchema,
  zohoConnectionOverviewSchema,
  zohoItemsResultSchema,
  zohoItemDetailSchema,
  zohoWebhookEndpointsSchema,
  zohoWebhookReceiptsSchema,
  zohoWebhookSecretResultSchema,
  type ZohoAuthorizationExchangeResult,
  type ZohoAuthorizationStartResult,
  type ZohoExternalConnection,
  type ZohoInventoryDataCenter,
  type ZohoSyncJob,
  type ZohoVerifyResult,
  type ZohoConnectionOverview,
  type ZohoItemsResult,
  type ZohoItemDetail,
  type ZohoWebhookEndpoint,
  type ZohoWebhookReceipt,
  type ZohoWebhookSecretResult,
} from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";
import type { ResolvedZohoInventoryAccess } from "@/features/integrations/zoho-inventory/policies/zoho-inventory.policy";

const zohoInventoryClient = createErpFeatureClient({
  featureName: "integrations.zoho-inventory",
  basePath: ZOHO_INVENTORY_ENDPOINTS.base,
});

export async function readZohoConnections(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
  }>,
): Promise<readonly ZohoExternalConnection[]> {
  return await zohoInventoryClient.list(
    zohoConnectionsSchema,
    undefined,
    input.access.actorContext,
  );
}

export async function readZohoConnectionOverview(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    connectionId: string;
  }>,
): Promise<ZohoConnectionOverview> {
  return await zohoInventoryClient.request({
    method: HTTP_METHODS.GET,
    path: `/connections/${encodeURIComponent(input.connectionId)}/overview`,
    schema: zohoConnectionOverviewSchema,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function readZohoItems(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    connectionId: string;
    limit?: number;
    cursor?: string;
    search?: string;
    membershipState?: string;
    mappingStatus?: string;
    itemStatus?: string;
  }>,
): Promise<ZohoItemsResult> {
  return await zohoInventoryClient.request({
    method: HTTP_METHODS.GET,
    path: `/connections/${encodeURIComponent(input.connectionId)}/items`,
    query: {
      limit: input.limit ?? 50,
      ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
      ...(input.search === undefined ? {} : { search: input.search }),
      ...(input.membershipState === undefined
        ? {}
        : { membershipState: input.membershipState }),
      ...(input.mappingStatus === undefined
        ? {}
        : { mappingStatus: input.mappingStatus }),
      ...(input.itemStatus === undefined
        ? {}
        : { itemStatus: input.itemStatus }),
    },
    schema: zohoItemsResultSchema,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function readZohoItemDetail(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    connectionId: string;
    itemId: string;
  }>,
): Promise<ZohoItemDetail> {
  return await zohoInventoryClient.request({
    method: HTTP_METHODS.GET,
    path: `/connections/${encodeURIComponent(input.connectionId)}/items/${encodeURIComponent(input.itemId)}`,
    schema: zohoItemDetailSchema,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function readZohoWebhookEndpoints(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    connectionId: string;
  }>,
): Promise<readonly ZohoWebhookEndpoint[]> {
  return await zohoInventoryClient.request({
    method: HTTP_METHODS.GET,
    path: `/connections/${encodeURIComponent(input.connectionId)}/webhook-endpoints`,
    schema: zohoWebhookEndpointsSchema,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function readZohoWebhookReceipts(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    connectionId: string;
  }>,
): Promise<readonly ZohoWebhookReceipt[]> {
  return await zohoInventoryClient.request({
    method: HTTP_METHODS.GET,
    path: `/connections/${encodeURIComponent(input.connectionId)}/webhook-receipts`,
    query: { limit: 50 },
    schema: zohoWebhookReceiptsSchema,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function enqueueZohoCatalogueSync(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    connectionId: string;
    scopeId: string;
    idempotencyKey: string;
  }>,
): Promise<ZohoSyncJob> {
  return await zohoInventoryClient.request({
    method: HTTP_METHODS.POST,
    path: `/connections/${encodeURIComponent(input.connectionId)}/catalogue-syncs`,
    body: { scopeId: input.scopeId, idempotencyKey: input.idempotencyKey },
    schema: zohoSyncJobSchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function createZohoWebhookEndpoint(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    connectionId: string;
  }>,
): Promise<ZohoWebhookSecretResult> {
  return await zohoInventoryClient.request({
    method: HTTP_METHODS.POST,
    path: `/connections/${encodeURIComponent(input.connectionId)}/webhook-endpoints`,
    schema: zohoWebhookSecretResultSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function rotateZohoWebhookEndpoint(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    connectionId: string;
    endpointId: string;
  }>,
): Promise<ZohoWebhookSecretResult> {
  return await zohoInventoryClient.request({
    method: HTTP_METHODS.POST,
    path: `/connections/${encodeURIComponent(input.connectionId)}/webhook-endpoints/${encodeURIComponent(input.endpointId)}/rotate`,
    schema: zohoWebhookSecretResultSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function disableZohoWebhookEndpoint(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    connectionId: string;
    endpointId: string;
  }>,
): Promise<void> {
  const response = await serverApiClient.raw(
    `${ZOHO_INVENTORY_ENDPOINTS.base}/connections/${encodeURIComponent(input.connectionId)}/webhook-endpoints/${encodeURIComponent(input.endpointId)}/disable`,
    {
      method: HTTP_METHODS.POST,
      auth: true,
      cache: "no-store",
      refreshOnUnauthorized: false,
      ...(input.access.actorContext === undefined
        ? {}
        : { actorContext: input.access.actorContext }),
    },
  );
  if (response.body !== null) await response.body.cancel();
}

export async function beginZohoAuthorization(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    dataCenter: ZohoInventoryDataCenter;
    forceConsent: boolean;
  }>,
): Promise<ZohoAuthorizationStartResult> {
  return await zohoInventoryClient.request({
    method: HTTP_METHODS.POST,
    path: "/authorizations",
    body: {
      dataCenter: input.dataCenter,
      forceConsent: input.forceConsent,
    },
    schema: zohoAuthorizationStartResultSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function exchangeZohoAuthorization(
  input: Readonly<{
    code: string;
    state: string;
    actorContext?: ServerActorContextHeaders;
  }>,
): Promise<ZohoAuthorizationExchangeResult> {
  return await zohoInventoryClient.request({
    method: HTTP_METHODS.POST,
    path: "/oauth/exchange",
    body: {
      code: input.code,
      state: input.state,
    },
    schema: zohoAuthorizationExchangeResultSchema,
    // The callback must be able to refresh a session proactively because the
    // Zoho grant code is short-lived and cannot survive an intermediate login
    // or refresh redirect.
    refreshOnUnauthorized: true,
    ...(input.actorContext === undefined
      ? {}
      : { actorContext: input.actorContext }),
  });
}

export async function createZohoConnection(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    authorizationId: string;
    organizationId: string;
    isDefault: boolean;
  }>,
): Promise<ZohoExternalConnection> {
  return await zohoInventoryClient.request({
    method: HTTP_METHODS.POST,
    path: "/connections",
    body: {
      authorizationId: input.authorizationId,
      organizationId: input.organizationId,
      isDefault: input.isDefault,
    },
    schema: zohoExternalConnectionSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function verifyZohoConnection(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    connectionId: string;
  }>,
): Promise<ZohoVerifyResult> {
  return await zohoInventoryClient.request({
    method: HTTP_METHODS.POST,
    path: `/connections/${encodeURIComponent(input.connectionId)}/verify`,
    schema: zohoVerifyResultSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function disconnectZohoConnection(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    connectionId: string;
  }>,
): Promise<void> {
  const response = await serverApiClient.raw(
    ZOHO_INVENTORY_ENDPOINTS.disconnectConnection(input.connectionId),
    {
      method: HTTP_METHODS.POST,
      auth: true,
      cache: "no-store",
      refreshOnUnauthorized: false,
      ...(input.access.actorContext === undefined
        ? {}
        : { actorContext: input.access.actorContext }),
    },
  );

  if (response.body !== null) {
    await response.body.cancel();
  }
}

export async function readZohoSyncJobs(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    connectionId: string;
    limit?: number;
  }>,
): Promise<readonly ZohoSyncJob[]> {
  return await zohoInventoryClient.request({
    method: HTTP_METHODS.GET,
    path: `/connections/${encodeURIComponent(input.connectionId)}/sync-jobs`,
    query: {
      limit: input.limit ?? 50,
    },
    schema: zohoSyncJobsSchema,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function enqueueZohoReconciliation(
  input: Readonly<{
    access: ResolvedZohoInventoryAccess;
    connectionId: string;
    idempotencyKey: string;
  }>,
): Promise<ZohoSyncJob> {
  return await zohoInventoryClient.request({
    method: HTTP_METHODS.POST,
    path: `/connections/${encodeURIComponent(input.connectionId)}/syncs`,
    body: {
      operation: "RECONCILE",
      resourceType: "organization",
      idempotencyKey: input.idempotencyKey,
    },
    schema: zohoSyncJobSchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

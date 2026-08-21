// oz-next-app/src/features/inventory/components/server/component-inventory.server.ts
import "server-only";

import type { ErpFeatureQueryValue } from "@/features/erp-core/api/erp-feature.client.server";
import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import { INVENTORY_ENDPOINTS } from "@/lib/api/endpoints";
import { HTTP_METHODS } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";

import {
  componentAttachmentResultSchema,
  componentDefinitionSummarySchema,
  componentEvidenceStatusSchema,
  componentEvidenceUploadIntentSchema,
  componentHistoryResultSchema,
  componentContextOptionsSchema,
  componentInventoryFacetsSchema,
  componentInventoryOverviewSchema,
  componentInventoryItemSchema,
  componentInventoryListResultSchema,
  componentReplacementOptionsResultSchema,
  componentReplacementResultSchema,
  componentReconciliationResultSchema,
  componentStateMutationResultSchema,
  componentTransferResultSchema,
  type ComponentAttachmentResult,
  type ComponentBatteryConfigurationInput,
  type ComponentDefinitionSummary,
  type ComponentEvidenceStatus,
  type ComponentEvidenceUploadIntent,
  type ComponentHistoryResult,
  type ComponentInventoryItem,
  type ComponentInventoryListResult,
  type ComponentInventorySearchParams,
  type ComponentInventoryWorkspaceData,
  type ComponentReplacementOptionsResult,
  type ComponentReplacementResult,
  type ComponentReconciliationResult,
  type ComponentStateMutationResult,
  type ComponentTransferResult,
  type ComponentType,
} from "@/features/inventory/components/contracts/component-inventory.schema";
import type { ResolvedComponentInventoryAccess } from "@/features/inventory/components/policies/component-inventory.policy";
import { storedBatteryMetadata } from "@/features/inventory/components/utils/component-battery-configuration";

const componentClient = createErpFeatureClient({
  featureName: "inventory.components",
  basePath: INVENTORY_ENDPOINTS.componentInventoryBase,
});

const CURSOR_INVALID_CODE = "COMPONENT_CURSOR_INVALID";

function compactQuery(
  entries: Readonly<Record<string, ErpFeatureQueryValue>>,
): Readonly<Record<string, ErpFeatureQueryValue>> {
  const compacted: Record<string, ErpFeatureQueryValue> = {};

  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    compacted[key] = value;
  }

  return compacted;
}

function actorContextOptions(access: ResolvedComponentInventoryAccess) {
  return access.actorContext === undefined
    ? {}
    : { actorContext: access.actorContext };
}

function listQuery(
  query: ComponentInventorySearchParams,
  cursor: string | undefined,
): Readonly<Record<string, ErpFeatureQueryValue>> {
  const searchAcrossStates =
    query.q !== undefined &&
    query.state === undefined &&
    !query.includeAllStates;

  return compactQuery({
    q: query.q,
    state: query.state,
    operationalState: query.operationalState,
    includeAllStates:
      query.includeAllStates || searchAcrossStates ? true : undefined,
    componentType: query.componentType,
    orgUnitId: query.orgUnitId,
    storeId: query.storeId,
    componentId: query.componentId,
    limit: query.limit,
    cursor,
  });
}

export async function readComponentInventoryWorkspace(
  input: Readonly<{
    query: ComponentInventorySearchParams;
    access: ResolvedComponentInventoryAccess;
  }>,
): Promise<ComponentInventoryWorkspaceData> {
  const options = actorContextOptions(input.access);
  const facetsPromise = componentClient.request({
    path: "/components/facets",
    schema: componentInventoryFacetsSchema,
    ...options,
  });
  const contextOptionsPromise = componentClient.request({
    path: "/components/context-options",
    schema: componentContextOptionsSchema,
    ...options,
  });
  const overviewPromise = componentClient.request({
    path: "/components/overview",
    query: compactQuery({
      orgUnitId: input.query.orgUnitId,
      storeId: input.query.storeId,
    }),
    schema: componentInventoryOverviewSchema,
    ...options,
  });

  let cursorReset = false;

  try {
    if (input.query.focusComponentInventoryId !== undefined) {
      const [item, facets, contextOptions, overview] = await Promise.all([
        readComponentInventoryItem({
          access: input.access,
          componentInventoryId: input.query.focusComponentInventoryId,
        }),
        facetsPromise,
        contextOptionsPromise,
        overviewPromise,
      ]);

      return {
        list: {
          asOf: new Date().toISOString(),
          items: [item],
          nextCursor: null,
        },
        facets,
        contextOptions,
        overview,
        cursorReset: false,
        focused: true,
      };
    }

    let list: ComponentInventoryListResult;

    try {
      list = await componentClient.request({
        path: "/components",
        query: listQuery(input.query, input.query.cursor),
        schema: componentInventoryListResultSchema,
        ...options,
      });
    } catch (error: unknown) {
      if (!isApiHttpError(error) || error.code !== CURSOR_INVALID_CODE) {
        throw error;
      }

      cursorReset = true;
      list = await componentClient.request({
        path: "/components",
        query: listQuery(input.query, undefined),
        schema: componentInventoryListResultSchema,
        ...options,
      });
    }

    const [facets, contextOptions, overview] = await Promise.all([
      facetsPromise,
      contextOptionsPromise,
      overviewPromise,
    ]);

    return {
      list,
      facets,
      contextOptions,
      overview,
      cursorReset,
      focused: false,
    };
  } catch (error: unknown) {
    void facetsPromise.catch(() => undefined);
    void contextOptionsPromise.catch(() => undefined);
    void overviewPromise.catch(() => undefined);
    throw error;
  }
}

export async function searchComponentInventory(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    query: string;
    limit?: number;
  }>,
): Promise<ComponentInventoryListResult> {
  return await componentClient.request({
    path: "/components",
    query: {
      q: input.query,
      includeAllStates: true,
      limit: input.limit ?? 8,
    },
    schema: componentInventoryListResultSchema,
    ...actorContextOptions(input.access),
  });
}

export async function readComponentInventoryItem(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    componentInventoryId: string;
  }>,
): Promise<ComponentInventoryItem> {
  return await componentClient.request({
    path: `/components/${encodeURIComponent(input.componentInventoryId)}`,
    schema: componentInventoryItemSchema,
    ...actorContextOptions(input.access),
  });
}

export async function readComponentHistory(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    componentInventoryId: string;
  }>,
): Promise<ComponentHistoryResult> {
  return await componentClient.request({
    path: `/components/${encodeURIComponent(input.componentInventoryId)}/history`,
    schema: componentHistoryResultSchema,
    ...actorContextOptions(input.access),
  });
}

export async function listComponentDefinitions(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    q?: string;
    componentType?: ComponentType;
    limit?: number;
  }>,
): Promise<readonly ComponentDefinitionSummary[]> {
  return await componentClient.request({
    path: "/component-definitions",
    query: compactQuery({
      q: input.q,
      componentType: input.componentType,
      limit: input.limit ?? 50,
    }),
    schema: componentDefinitionSummarySchema.array().max(100).readonly(),
    ...actorContextOptions(input.access),
  });
}

export async function createComponentDefinition(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    code: string;
    name: string;
    type: ComponentType;
    uomCode: string | null;
    isSerialized: boolean;
    trackLot: boolean;
    idempotencyKey: string;
  }>,
): Promise<ComponentDefinitionSummary> {
  return await componentClient.request({
    method: HTTP_METHODS.POST,
    path: "/component-definitions",
    body: {
      code: input.code,
      name: input.name,
      type: input.type,
      uomCode: input.uomCode,
      isSerialized: input.isSerialized,
      trackLot: input.trackLot,
      specifications: {},
      metadata: {},
    },
    schema: componentDefinitionSummarySchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...actorContextOptions(input.access),
  });
}

export async function updateComponentDefinition(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    componentId: string;
    rowVersion: number;
    name?: string;
    uomCode?: string | null;
    isSerialized?: boolean;
    trackLot?: boolean;
    idempotencyKey: string;
  }>,
): Promise<ComponentDefinitionSummary> {
  return await componentClient.request({
    method: HTTP_METHODS.PATCH,
    path: `/component-definitions/${encodeURIComponent(input.componentId)}`,
    body: {
      rowVersion: input.rowVersion,
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.uomCode === undefined ? {} : { uomCode: input.uomCode }),
      ...(input.isSerialized === undefined
        ? {}
        : { isSerialized: input.isSerialized }),
      ...(input.trackLot === undefined ? {} : { trackLot: input.trackLot }),
    },
    schema: componentDefinitionSummarySchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...actorContextOptions(input.access),
  });
}

export async function createPhysicalComponent(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    componentId: string;
    storeId: string;
    serialNumber: string | null;
    lotNumber: string | null;
    expiryDate: string | null;
    batteryConfiguration: ComponentBatteryConfigurationInput | null;
    reason: string;
    idempotencyKey: string;
  }>,
): Promise<ComponentInventoryItem> {
  return await componentClient.request({
    method: HTTP_METHODS.POST,
    path: "/components",
    body: {
      componentId: input.componentId,
      storeId: input.storeId,
      serialNumber: input.serialNumber,
      lotNumber: input.lotNumber,
      expiryDate: input.expiryDate,
      metadata:
        input.batteryConfiguration === null
          ? {}
          : storedBatteryMetadata(input.batteryConfiguration),
      reason: input.reason,
    },
    schema: componentInventoryItemSchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...actorContextOptions(input.access),
  });
}

export async function correctPhysicalComponent(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    componentInventoryId: string;
    inventoryRowVersion: number;
    evidenceId: string;
    reason: string;
    serialNumber?: string | null;
    lotNumber?: string | null;
    expiryDate?: string | null;
    metadata?: Readonly<Record<string, unknown>>;
    idempotencyKey: string;
  }>,
): Promise<ComponentInventoryItem> {
  return await componentClient.request({
    method: HTTP_METHODS.PATCH,
    path: `/components/${encodeURIComponent(input.componentInventoryId)}`,
    body: {
      inventoryRowVersion: input.inventoryRowVersion,
      evidenceId: input.evidenceId,
      reason: input.reason,
      ...(input.serialNumber === undefined
        ? {}
        : { serialNumber: input.serialNumber }),
      ...(input.lotNumber === undefined ? {} : { lotNumber: input.lotNumber }),
      ...(input.expiryDate === undefined
        ? {}
        : { expiryDate: input.expiryDate }),
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    },
    schema: componentInventoryItemSchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...actorContextOptions(input.access),
  });
}

export async function attachComponent(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    componentInventoryId: string;
    unitId: string;
    custodyRowVersion: number;
    reason: string;
    idempotencyKey: string;
  }>,
): Promise<ComponentAttachmentResult> {
  return await componentClient.request({
    method: HTTP_METHODS.POST,
    path: `/components/${encodeURIComponent(input.componentInventoryId)}/attach`,
    body: {
      unitId: input.unitId,
      custodyRowVersion: input.custodyRowVersion,
      reason: input.reason,
    },
    schema: componentAttachmentResultSchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...actorContextOptions(input.access),
  });
}

export async function readReplacementOptions(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    componentInventoryId: string;
    unitId: string;
    limit?: number;
  }>,
): Promise<ComponentReplacementOptionsResult> {
  return await componentClient.request({
    path: `/components/${encodeURIComponent(input.componentInventoryId)}/replacement-options`,
    query: {
      unitId: input.unitId,
      limit: input.limit ?? 50,
    },
    schema: componentReplacementOptionsResultSchema,
    ...actorContextOptions(input.access),
  });
}

export async function replaceComponent(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    newComponentInventoryId: string;
    unitId: string;
    newComponentCustodyRowVersion: number;
    oldUnitComponentId?: string;
    removedDisposition: "RETURN_TO_POOL" | "QUARANTINE" | "RETIRED";
    reason: string;
    idempotencyKey: string;
  }>,
): Promise<ComponentReplacementResult> {
  return await componentClient.request({
    method: HTTP_METHODS.POST,
    path: `/components/${encodeURIComponent(input.newComponentInventoryId)}/replace`,
    body: {
      unitId: input.unitId,
      newComponentCustodyRowVersion: input.newComponentCustodyRowVersion,
      ...(input.oldUnitComponentId === undefined
        ? {}
        : { oldUnitComponentId: input.oldUnitComponentId }),
      removedDisposition: input.removedDisposition,
      reason: input.reason,
    },
    schema: componentReplacementResultSchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...actorContextOptions(input.access),
  });
}

async function mutateComponentState(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    componentInventoryId: string;
    action: "quarantine" | "release";
    custodyRowVersion: number;
    reason: string;
    idempotencyKey: string;
  }>,
): Promise<ComponentStateMutationResult> {
  return await componentClient.request({
    method: HTTP_METHODS.POST,
    path: `/components/${encodeURIComponent(input.componentInventoryId)}/${input.action}`,
    body: {
      custodyRowVersion: input.custodyRowVersion,
      reason: input.reason,
    },
    schema: componentStateMutationResultSchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...actorContextOptions(input.access),
  });
}

export async function quarantineComponent(
  input: Omit<Parameters<typeof mutateComponentState>[0], "action">,
): Promise<ComponentStateMutationResult> {
  return await mutateComponentState({ ...input, action: "quarantine" });
}

export async function releaseComponent(
  input: Omit<Parameters<typeof mutateComponentState>[0], "action">,
): Promise<ComponentStateMutationResult> {
  return await mutateComponentState({ ...input, action: "release" });
}

export async function reconcileComponents(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    components: ReadonlyArray<
      Readonly<{
        componentInventoryId: string;
        custodyRowVersion: number;
      }>
    >;
    storeId: string;
    reason: string;
    idempotencyKey: string;
  }>,
): Promise<ComponentReconciliationResult> {
  return await componentClient.request({
    method: HTTP_METHODS.POST,
    path: "/components/reconciliations",
    body: {
      components: input.components,
      storeId: input.storeId,
      reason: input.reason,
    },
    schema: componentReconciliationResultSchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...actorContextOptions(input.access),
  });
}

export async function createComponentTransfer(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    fromStoreId: string;
    toStoreId: string;
    componentInventoryIds: readonly string[];
    reason: string;
    idempotencyKey: string;
  }>,
): Promise<ComponentTransferResult> {
  return await componentClient.request({
    method: HTTP_METHODS.POST,
    path: "/component-transfers",
    body: {
      fromStoreId: input.fromStoreId,
      toStoreId: input.toStoreId,
      componentInventoryIds: input.componentInventoryIds,
      reason: input.reason,
    },
    schema: componentTransferResultSchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...actorContextOptions(input.access),
  });
}

export async function dispatchComponentTransfer(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    transferId: string;
    rowVersion: number;
    reason: string;
    idempotencyKey: string;
  }>,
): Promise<ComponentTransferResult> {
  return await componentClient.request({
    method: HTTP_METHODS.POST,
    path: `/component-transfers/${encodeURIComponent(input.transferId)}/dispatch`,
    body: {
      rowVersion: input.rowVersion,
      reason: input.reason,
    },
    schema: componentTransferResultSchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...actorContextOptions(input.access),
  });
}

export async function createAndDispatchComponentTransfer(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    fromStoreId: string;
    toStoreId: string;
    componentInventoryIds: readonly string[];
    reason: string;
    idempotencyKey: string;
  }>,
): Promise<ComponentTransferResult> {
  const created = await createComponentTransfer(input);

  return await dispatchComponentTransfer({
    access: input.access,
    transferId: created.transferId,
    rowVersion: created.rowVersion,
    reason: input.reason,
    idempotencyKey: `${input.idempotencyKey}:dispatch`,
  });
}

export async function createComponentEvidenceUpload(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    componentInventoryId: string;
    fileName: string;
    contentType: "image/jpeg" | "image/png" | "image/webp";
    sizeBytes: number;
    checksumSha256: string;
    idempotencyKey: string;
  }>,
): Promise<ComponentEvidenceUploadIntent> {
  return await componentClient.request({
    method: HTTP_METHODS.POST,
    path: `/components/${encodeURIComponent(input.componentInventoryId)}/evidence-uploads`,
    body: {
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
    },
    schema: componentEvidenceUploadIntentSchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...actorContextOptions(input.access),
  });
}

export async function finalizeComponentEvidenceUpload(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    uploadId: string;
    checksumSha256: string;
    sizeBytes: number;
    captureChallenge: string;
    capturedAt: string;
    location: Readonly<{
      latitude: number;
      longitude: number;
      accuracyMeters: number;
    }>;
    idempotencyKey: string;
  }>,
): Promise<ComponentEvidenceStatus> {
  return await componentClient.request({
    method: HTTP_METHODS.POST,
    path: `/component-evidence/uploads/${encodeURIComponent(input.uploadId)}/finalize`,
    body: {
      checksumSha256: input.checksumSha256,
      sizeBytes: input.sizeBytes,
      captureChallenge: input.captureChallenge,
      capturedAt: input.capturedAt,
      location: input.location,
    },
    schema: componentEvidenceStatusSchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...actorContextOptions(input.access),
  });
}

export async function readComponentEvidenceStatus(
  input: Readonly<{
    access: ResolvedComponentInventoryAccess;
    evidenceId: string;
  }>,
): Promise<ComponentEvidenceStatus> {
  return await componentClient.request({
    path: `/component-evidence/${encodeURIComponent(input.evidenceId)}`,
    schema: componentEvidenceStatusSchema,
    ...actorContextOptions(input.access),
  });
}

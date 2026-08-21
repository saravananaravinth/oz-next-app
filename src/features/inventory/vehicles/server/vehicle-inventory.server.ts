// oz-next-app/src/features/inventory/vehicles/server/vehicle-inventory.server.ts
import "server-only";

import type { ErpFeatureQueryValue } from "@/features/erp-core/api/erp-feature.client.server";
import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import { INVENTORY_ENDPOINTS } from "@/lib/api/endpoints";
import { HTTP_METHODS } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";
import { serverApiClient } from "@/server/api/edge-api-client";

import {
  vehicleInventoryDataQualityIssuesResultSchema,
  vehicleInventoryFacetsResultSchema,
  vehicleInventoryDealerContextResultSchema,
  vehicleInventoryListResultSchema,
  vehicleInventoryLiveSearchResultSchema,
  vehicleInventoryPriceHistoryResultSchema,
  vehicleInventoryTransferHistoryResultSchema,
  vehicleInventoryRemediationResultSchema,
  type VehicleInventoryArrivalUpdate,
  type VehicleInventoryBatteryConfigurationSelection,
  type VehicleInventoryChargerSelection,
  type VehicleInventoryDataQualityIssuesResult,
  type VehicleInventoryListResult,
  type VehicleInventoryLiveSearchResult,
  type VehicleInventoryPriceHistoryResult,
  type VehicleInventoryTransferHistoryResult,
  type VehicleInventoryRemediationCategory,
  type VehicleInventoryRemediationResult,
  type VehicleInventoryDealerContextQuery,
  type VehicleInventoryDealerContextResult,
  type VehicleInventorySearchParams,
  type VehicleInventoryWorkspaceData,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
import type { ResolvedVehicleInventoryAccess } from "@/features/inventory/vehicles/policies/vehicle-inventory.policy";

const inventoryClient = createErpFeatureClient({
  featureName: "inventory.vehicles",
  basePath: INVENTORY_ENDPOINTS.dealerInventoryBase,
});

const CURSOR_INVALID_CODE = "INVENTORY_CURSOR_INVALID";
const EXPORT_TIMEOUT_MS = 120_000;

export async function readVehicleInventoryDealerContexts(
  query: VehicleInventoryDealerContextQuery,
): Promise<VehicleInventoryDealerContextResult> {
  return await inventoryClient.request({
    path: "/contexts/dealers",
    query: compactQuery({
      tenantId: query.tenantId,
      q: query.q,
      limit: query.limit,
      cursor: query.cursor,
    }),
    schema: vehicleInventoryDealerContextResultSchema,
  });
}

function compactQuery(
  entries: Readonly<Record<string, ErpFeatureQueryValue>>,
): Readonly<Record<string, ErpFeatureQueryValue>> {
  const compacted: Record<string, ErpFeatureQueryValue> = {};

  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value) && value.length === 0) {
      continue;
    }

    compacted[key] = value;
  }

  return compacted;
}

function commonApiQuery(
  query: VehicleInventorySearchParams,
): Readonly<Record<string, ErpFeatureQueryValue>> {
  return compactQuery({
    includeMyStock: query.includeMyStock,
    includeSubDealerStock: query.includeSubDealerStock,
    q: query.q,
    unitId: query.unitId,
    entryKey: query.entryKey,
    status: query.status,
    entryType: query.entryType,
    orgUnitId: query.orgUnitId,
    storeId: query.storeId,
    modelId: query.modelId,
    variantId: query.variantId,
    fuel: query.fuel,
    segment: query.segment,
    color: query.color,
    metallic: query.metallic,
    registrationRequired: query.registrationRequired,
    mrpMin: query.mrpMin,
    mrpMax: query.mrpMax,
    arrivalFrom: query.arrivalFrom,
    arrivalTo: query.arrivalTo,
    transferFrom: query.transferFrom,
    transferTo: query.transferTo,
    ageBucket: query.ageBucket,
    warning: query.warning,
    kpi: query.kpi,
  });
}

function listApiQuery(
  query: VehicleInventorySearchParams,
  cursor: string | undefined,
): Readonly<Record<string, ErpFeatureQueryValue>> {
  return compactQuery({
    ...commonApiQuery(query),
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
    limit: query.limit,
    cursor,
  });
}

type QueryPrimitive = string | number | boolean;

function serializeQueryPrimitive(value: QueryPrimitive): string {
  return typeof value === "string" ? value : String(value);
}

function isQueryPrimitiveArray(
  value: ErpFeatureQueryValue,
): value is readonly QueryPrimitive[] {
  return Array.isArray(value);
}

function exportPath(query: VehicleInventorySearchParams): string {
  const search = new URLSearchParams();
  const values: Readonly<Record<string, ErpFeatureQueryValue>> = {
    ...commonApiQuery(query),
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  };

  for (const key of Object.keys(values).sort((left, right) =>
    left.localeCompare(right),
  )) {
    const value = values[key];

    if (value === undefined || value === null) {
      continue;
    }

    if (isQueryPrimitiveArray(value)) {
      for (const item of value) {
        search.append(key, serializeQueryPrimitive(item));
      }
      continue;
    }

    search.set(key, serializeQueryPrimitive(value));
  }

  const serialized = search.toString();

  return serialized.length > 0
    ? `${INVENTORY_ENDPOINTS.vehiclesExportCsv}?${serialized}`
    : INVENTORY_ENDPOINTS.vehiclesExportCsv;
}

export async function readVehicleInventoryWorkspace(
  input: Readonly<{
    query: VehicleInventorySearchParams;
    access: ResolvedVehicleInventoryAccess;
  }>,
): Promise<VehicleInventoryWorkspaceData> {
  const actorContext =
    input.access.kind === "contextual" ? input.access.actorContext : undefined;
  const facetsPromise = inventoryClient.request({
    path: "/vehicles/facets",
    query: commonApiQuery(input.query),
    schema: vehicleInventoryFacetsResultSchema,
    ...(actorContext !== undefined ? { actorContext } : {}),
  });

  let cursorReset = false;
  let list: VehicleInventoryListResult;

  try {
    list = await inventoryClient.request({
      path: "/vehicles",
      query: listApiQuery(input.query, input.query.cursor),
      schema: vehicleInventoryListResultSchema,
      ...(actorContext !== undefined ? { actorContext } : {}),
    });
  } catch (error: unknown) {
    if (!isApiHttpError(error) || error.code !== CURSOR_INVALID_CODE) {
      throw error;
    }

    cursorReset = true;
    list = await inventoryClient.request({
      path: "/vehicles",
      query: listApiQuery(input.query, undefined),
      schema: vehicleInventoryListResultSchema,
      ...(actorContext !== undefined ? { actorContext } : {}),
    });
  }

  const facets = await facetsPromise;

  return {
    list,
    facets,
    cursorReset,
  };
}

export async function readVehicleInventoryPriceHistory(
  input: Readonly<{
    access: ResolvedVehicleInventoryAccess;
    variantId: string;
    storeId: string;
  }>,
): Promise<VehicleInventoryPriceHistoryResult> {
  return await inventoryClient.request({
    path: "/vehicles/price-history",
    query: {
      variantId: input.variantId,
      storeId: input.storeId,
      limit: 100,
    },
    schema: vehicleInventoryPriceHistoryResultSchema,
    ...(input.access.kind === "contextual"
      ? { actorContext: input.access.actorContext }
      : {}),
  });
}

export async function readVehicleInventoryTransferHistory(
  input: Readonly<{
    access: ResolvedVehicleInventoryAccess;
    unitId: string;
  }>,
): Promise<VehicleInventoryTransferHistoryResult> {
  return await inventoryClient.request({
    path: "/vehicles/transfer-history",
    query: {
      unitId: input.unitId,
      limit: 100,
    },
    schema: vehicleInventoryTransferHistoryResultSchema,
    ...(input.access.kind === "contextual"
      ? { actorContext: input.access.actorContext }
      : {}),
  });
}

export async function searchVehicleInventory(
  input: Readonly<{
    access: ResolvedVehicleInventoryAccess;
    query: string;
    includeMyStock: boolean;
    includeSubDealerStock: boolean;
    limit?: number;
  }>,
): Promise<VehicleInventoryLiveSearchResult> {
  return await inventoryClient.request({
    path: "/vehicles/search",
    query: {
      q: input.query,
      includeMyStock: input.includeMyStock,
      includeSubDealerStock: input.includeSubDealerStock,
      limit: input.limit ?? 8,
    },
    schema: vehicleInventoryLiveSearchResultSchema,
    ...(input.access.kind === "contextual"
      ? { actorContext: input.access.actorContext }
      : {}),
  });
}

export async function readVehicleInventoryExportResponse(
  input: Readonly<{
    query: VehicleInventorySearchParams;
    access: ResolvedVehicleInventoryAccess;
  }>,
): Promise<Response> {
  if (!input.access.capabilities.canExport) {
    throw new TypeError("vehicle_inventory_export_forbidden");
  }

  return await serverApiClient.raw(exportPath(input.query), {
    method: HTTP_METHODS.GET,
    auth: true,
    refreshOnUnauthorized: true,
    cache: "no-store",
    timeoutMs: EXPORT_TIMEOUT_MS,
    accept: "text/csv",
    ...(input.access.kind === "contextual"
      ? { actorContext: input.access.actorContext }
      : {}),
  });
}

export async function readVehicleInventoryDataQualityIssues(
  input: Readonly<{
    query: VehicleInventorySearchParams;
    access: ResolvedVehicleInventoryAccess;
    category: VehicleInventoryRemediationCategory;
  }>,
): Promise<VehicleInventoryDataQualityIssuesResult> {
  return await inventoryClient.request({
    path: "/vehicles/data-quality/issues",
    query: compactQuery({
      ...commonApiQuery(input.query),
      category: input.category,
      kpi: undefined,
    }),
    schema: vehicleInventoryDataQualityIssuesResultSchema,
    refreshOnUnauthorized: false,
    ...(input.access.kind === "contextual"
      ? { actorContext: input.access.actorContext }
      : {}),
  });
}

export async function runVehicleInventoryRemediation(
  input: Readonly<{
    query: VehicleInventorySearchParams;
    access: ResolvedVehicleInventoryAccess;
    category: VehicleInventoryRemediationCategory;
    idempotencyKey: string;
    arrivals?: readonly VehicleInventoryArrivalUpdate[];
    chargerSelections?: readonly VehicleInventoryChargerSelection[];
    batteryConfigurations?: readonly VehicleInventoryBatteryConfigurationSelection[];
  }>,
): Promise<VehicleInventoryRemediationResult> {
  return await inventoryClient.request({
    method: HTTP_METHODS.POST,
    path: "/vehicles/data-quality/remediations",
    query: compactQuery({
      ...commonApiQuery(input.query),
      kpi: undefined,
    }),
    body: {
      category: input.category,
      idempotencyKey: input.idempotencyKey,
      ...(input.arrivals === undefined ? {} : { arrivals: input.arrivals }),
      ...(input.chargerSelections === undefined
        ? {}
        : { chargerSelections: input.chargerSelections }),
      ...(input.batteryConfigurations === undefined
        ? {}
        : { batteryConfigurations: input.batteryConfigurations }),
    },
    schema: vehicleInventoryRemediationResultSchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...(input.access.kind === "contextual"
      ? { actorContext: input.access.actorContext }
      : {}),
  });
}

export async function emailVehicleInventoryDataQualityReport(
  input: Readonly<{
    query: VehicleInventorySearchParams;
    access: ResolvedVehicleInventoryAccess;
    category: VehicleInventoryRemediationCategory;
    idempotencyKey: string;
  }>,
): Promise<VehicleInventoryRemediationResult> {
  return await inventoryClient.request({
    method: HTTP_METHODS.POST,
    path: "/vehicles/data-quality/reports",
    query: compactQuery({
      ...commonApiQuery(input.query),
      kpi: undefined,
    }),
    body: {
      category: input.category,
      idempotencyKey: input.idempotencyKey,
    },
    schema: vehicleInventoryRemediationResultSchema,
    idempotencyKey: input.idempotencyKey,
    refreshOnUnauthorized: false,
    ...(input.access.kind === "contextual"
      ? { actorContext: input.access.actorContext }
      : {}),
  });
}

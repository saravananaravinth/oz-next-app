// oz-next-app/src/features/inventory/vehicles/utils/vehicle-inventory-url.ts
import {
  vehicleInventorySearchParamsSchema,
  type VehicleInventorySearchParams,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
const INVENTORY_PAGE_PATH = "/inventory/vehicles";
const INVENTORY_EXPORT_PATH = "/api/inventory/vehicles/export";

export type VehicleInventorySearchParamOverrides =
  Partial<VehicleInventorySearchParams>;

function appendArray(
  search: URLSearchParams,
  key: string,
  values: readonly string[],
): void {
  for (const value of values) {
    search.append(key, value);
  }
}

function serializeVehicleInventoryQuery(
  query: VehicleInventorySearchParams,
  includePagination: boolean,
): string {
  const search = new URLSearchParams();

  if (query.tenantId !== undefined) {
    search.set("tenantId", query.tenantId);
  }

  if (query.dealerOrgUnitId !== undefined) {
    search.set("dealerOrgUnitId", query.dealerOrgUnitId);
  }

  search.set("scopeSubmitted", "true");

  if (query.includeMyStock) {
    search.append("includeMyStock", "true");
  }

  if (query.includeSubDealerStock) {
    search.append("includeSubDealerStock", "true");
  }

  if (query.q !== undefined) {
    search.set("q", query.q);
  }

  appendArray(search, "status", query.status);
  appendArray(search, "entryType", query.entryType);
  appendArray(search, "orgUnitId", query.orgUnitId);
  appendArray(search, "storeId", query.storeId);
  appendArray(search, "modelId", query.modelId);
  appendArray(search, "variantId", query.variantId);
  appendArray(search, "fuel", query.fuel);
  appendArray(search, "segment", query.segment);
  appendArray(search, "color", query.color);
  appendArray(search, "ageBucket", query.ageBucket);
  appendArray(search, "warning", query.warning);

  if (query.metallic !== undefined) {
    search.set("metallic", String(query.metallic));
  }

  if (query.registrationRequired !== undefined) {
    search.set("registrationRequired", String(query.registrationRequired));
  }

  if (query.mrpMin !== undefined) {
    search.set("mrpMin", String(query.mrpMin));
  }

  if (query.mrpMax !== undefined) {
    search.set("mrpMax", String(query.mrpMax));
  }

  if (query.arrivalFrom !== undefined) {
    search.set("arrivalFrom", query.arrivalFrom);
  }

  if (query.arrivalTo !== undefined) {
    search.set("arrivalTo", query.arrivalTo);
  }

  if (query.transferFrom !== undefined) {
    search.set("transferFrom", query.transferFrom);
  }

  if (query.transferTo !== undefined) {
    search.set("transferTo", query.transferTo);
  }

  if (query.kpi !== undefined) {
    search.set("kpi", query.kpi);
  }

  search.set("sortBy", query.sortBy);
  search.set("sortDirection", query.sortDirection);

  if (includePagination) {
    search.set("limit", String(query.limit));

    if (query.cursor !== undefined) {
      search.set("cursor", query.cursor);
    }
  }

  return search.toString();
}

function mergeQuery(
  query: VehicleInventorySearchParams,
  overrides: VehicleInventorySearchParamOverrides,
): VehicleInventorySearchParams {
  return vehicleInventorySearchParamsSchema.parse({
    ...query,
    ...overrides,
  });
}

export function vehicleInventoryPageHref(
  query: VehicleInventorySearchParams,
  overrides: VehicleInventorySearchParamOverrides = {},
): string {
  const serialized = serializeVehicleInventoryQuery(
    mergeQuery(query, overrides),
    true,
  );

  return serialized.length > 0
    ? `${INVENTORY_PAGE_PATH}?${serialized}`
    : INVENTORY_PAGE_PATH;
}

export function vehicleInventoryExportHref(
  query: VehicleInventorySearchParams,
): string {
  const serialized = serializeVehicleInventoryQuery(query, false);

  return serialized.length > 0
    ? `${INVENTORY_EXPORT_PATH}?${serialized}`
    : INVENTORY_EXPORT_PATH;
}

export function vehicleInventoryResetHref(
  query: VehicleInventorySearchParams,
): string {
  const search = new URLSearchParams();

  if (query.tenantId !== undefined) {
    search.set("tenantId", query.tenantId);
  }

  if (query.dealerOrgUnitId !== undefined) {
    search.set("dealerOrgUnitId", query.dealerOrgUnitId);
  }

  const serialized = search.toString();

  return serialized.length > 0
    ? `${INVENTORY_PAGE_PATH}?${serialized}`
    : INVENTORY_PAGE_PATH;
}

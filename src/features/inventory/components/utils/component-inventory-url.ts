// oz-next-app/src/features/inventory/components/utils/component-inventory-url.ts
import {
  COMPONENT_INVENTORY_PAGE_SIZE,
  type ComponentInventorySearchParams,
} from "@/features/inventory/components/contracts/component-inventory.schema";

const COMPONENT_INVENTORY_PATH = "/inventory/components" as const;

type ComponentInventoryHref =
  | typeof COMPONENT_INVENTORY_PATH
  | `${typeof COMPONENT_INVENTORY_PATH}?${string}`;

type ComponentInventorySearchParamPatch = Readonly<
  Partial<{
    q: string | undefined;
    focusComponentInventoryId: string | undefined;
    state: ComponentInventorySearchParams["state"] | undefined;
    operationalState:
      ComponentInventorySearchParams["operationalState"] | undefined;
    includeAllStates: boolean | undefined;
    componentType: ComponentInventorySearchParams["componentType"] | undefined;
    orgUnitId: string | undefined;
    storeId: string | undefined;
    componentId: string | undefined;
    limit: number | undefined;
    cursor: string | undefined;
  }>
>;

function setOptional(
  search: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined,
): void {
  if (value === undefined || value === "" || value === false) {
    search.delete(key);
    return;
  }

  search.set(key, String(value));
}

export function componentInventoryPageHref(
  query: ComponentInventorySearchParams,
  patch: ComponentInventorySearchParamPatch = {},
): ComponentInventoryHref {
  const next = {
    q: query.q,
    focusComponentInventoryId: query.focusComponentInventoryId,
    state: query.state,
    operationalState: query.operationalState,
    includeAllStates: query.includeAllStates,
    componentType: query.componentType,
    orgUnitId: query.orgUnitId,
    storeId: query.storeId,
    componentId: query.componentId,
    limit: query.limit,
    cursor: query.cursor,
    ...patch,
  };
  const search = new URLSearchParams();

  setOptional(search, "q", next.q);
  setOptional(
    search,
    "focusComponentInventoryId",
    next.focusComponentInventoryId,
  );
  setOptional(search, "state", next.state);
  setOptional(search, "operationalState", next.operationalState);
  setOptional(search, "componentType", next.componentType);
  setOptional(search, "orgUnitId", next.orgUnitId);
  setOptional(search, "storeId", next.storeId);
  setOptional(search, "componentId", next.componentId);

  if (next.limit !== COMPONENT_INVENTORY_PAGE_SIZE) {
    setOptional(search, "limit", next.limit);
  }

  setOptional(search, "cursor", next.cursor);

  const serialized = search.toString();
  return serialized.length === 0
    ? COMPONENT_INVENTORY_PATH
    : `${COMPONENT_INVENTORY_PATH}?${serialized}`;
}

export function componentInventoryResetHref(
  query: ComponentInventorySearchParams,
): ComponentInventoryHref {
  return componentInventoryPageHref(query, {
    q: undefined,
    focusComponentInventoryId: undefined,
    state: undefined,
    operationalState: undefined,
    includeAllStates: false,
    componentType: undefined,
    orgUnitId: undefined,
    storeId: undefined,
    componentId: undefined,
    limit: COMPONENT_INVENTORY_PAGE_SIZE,
    cursor: undefined,
  });
}

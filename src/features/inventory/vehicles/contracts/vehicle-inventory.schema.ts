// oz-next-app/src/features/inventory/vehicles/contracts/vehicle-inventory.schema.ts
import { z } from "zod";

import {
  erpIsoDateTimeSchema,
  erpUuidSchema,
} from "@/features/erp-core/contracts/erp-common.schema";

export const VEHICLE_INVENTORY_ENTRY_TYPES = [
  "CURRENT",
  "TRANSFERRED",
] as const;
export const VEHICLE_INVENTORY_KPI_FILTERS = [
  "RESERVED",
  "AVAILABLE",
  "TRANSFERRED",
  "SOLD",
  "AGING",
] as const;
export const VEHICLE_INVENTORY_AGE_BUCKETS = [
  "0-30",
  "31-60",
  "61-90",
  "91+",
  "UNKNOWN",
] as const;
export const VEHICLE_INVENTORY_DATA_QUALITY_FLAGS = [
  "MISSING_VARIANT",
  "UNKNOWN_ARRIVAL_DATE",
  "STATUS_MISMATCH",
  "METADATA_VARIANT_MODEL_MISMATCH",
  "MISSING_MRP",
  "MISSING_TAX_CONFIGURATION",
  "INACTIVE_STORE",
] as const;
export const VEHICLE_INVENTORY_SORT_FIELDS = [
  "VIN",
  "MODEL",
  "VARIANT",
  "STATUS",
  "ORG_UNIT",
  "MRP",
  "ARRIVAL_DATE",
  "AGE",
  "TRANSFER_DATE",
  "LAST_UPDATE",
] as const;
export const VEHICLE_INVENTORY_SORT_DIRECTIONS = ["ASC", "DESC"] as const;
export const VEHICLE_INVENTORY_REMEDIATION_CATEGORIES = [
  "MISSING_VARIANT",
  "UNKNOWN_ARRIVAL_DATE",
] as const;
export const VEHICLE_INVENTORY_SCOPE_MODES = [
  "DEALER_NETWORK",
  "TENANT_NETWORK",
] as const;
export const VEHICLE_INVENTORY_ARRIVAL_SOURCES = [
  "SHIPMENT",
  "MANUAL",
  "UNKNOWN",
] as const;

const MAX_SEARCH_LENGTH = 100;
const MAX_CURSOR_LENGTH = 2_048;
const MAX_FACET_OPTIONS = 5_000;
const MAX_TAX_COMPONENTS = 32;
const MAX_LIST_ITEMS = 100;
export const VEHICLE_INVENTORY_PAGE_SIZE = 20;
const MAX_DEALER_CONTEXT_ITEMS = 100;
const MAX_COMPONENT_SUMMARIES = 32;
const MAX_COMPONENT_SERIALS = 64;
const MAX_REMEDIATION_ISSUES = 100;
const MAX_REMEDIATION_UPDATES = 100;
const MAX_PRICE_HISTORY_PERIODS = 256;
const MAX_TRANSFER_HISTORY_EVENTS = 100;
const MAX_LIVE_SEARCH_ITEMS = 20;

const dateOnlySchema = z.string().trim().pipe(z.iso.date());
const nullableDateOnlySchema = dateOnlySchema.nullable();
const nullableDateTimeSchema = erpIsoDateTimeSchema.nullable();
const statusTokenSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Z][A-Z0-9_]*$/u);
const safeFacetTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[\p{L}\p{N} ._+\-/]+$/u);
const nullableSafeTextSchema = z.string().trim().min(1).max(256).nullable();
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const nullableNonNegativeNumberSchema = z.number().nonnegative().nullable();

function firstRawValue(
  value: string | readonly string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : value?.[0];
}

function allRawValues(
  value: string | readonly string[] | undefined,
): readonly string[] {
  if (value === undefined) {
    return [];
  }

  const values = typeof value === "string" ? [value] : value;

  return values.flatMap((entry) =>
    entry
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );
}

function emptyStringToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim().length === 0
    ? undefined
    : value;
}

const optionalUuidSearchSchema = z.preprocess(
  emptyStringToUndefined,
  erpUuidSchema.optional(),
);
const optionalDateSearchSchema = z.preprocess(
  emptyStringToUndefined,
  dateOnlySchema.optional(),
);
const optionalSearchTextSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(3).max(MAX_SEARCH_LENGTH).optional(),
);
const optionalEntryKeySearchSchema = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .min(1)
    .max(512)
    .regex(/^[A-Za-z0-9:_-]+$/u)
    .optional(),
);
const optionalCursorSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).max(MAX_CURSOR_LENGTH).optional(),
);
const optionalDecimalSchema = z.preprocess((value) => {
  const normalized = emptyStringToUndefined(value);

  if (
    typeof normalized === "string" &&
    /^\d+(?:\.\d{1,2})?$/u.test(normalized.trim())
  ) {
    return Number(normalized);
  }

  return normalized;
}, z.number().nonnegative().max(1_000_000_000).optional());
const positiveIntegerSchema = (minimum: number, maximum: number) =>
  z.preprocess((value) => {
    const normalized = emptyStringToUndefined(value);

    if (typeof normalized === "string" && /^\d+$/u.test(normalized.trim())) {
      return Number(normalized);
    }

    return normalized;
  }, z.number().int().min(minimum).max(maximum));

const booleanSearchSchema = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "true" || normalized === "1" || normalized === "on") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "off") {
    return false;
  }

  return value;
}, z.boolean());

const optionalBooleanSearchSchema = z.preprocess(
  emptyStringToUndefined,
  booleanSearchSchema.optional(),
);

const uniqueArraySchema = <TValue extends string>(
  itemSchema: z.ZodType<TValue>,
  maximum: number,
) =>
  z
    .array(itemSchema)
    .max(maximum)
    .transform((values) => [...new Set(values)] as readonly TValue[]);

export const vehicleInventorySearchParamsSchema = z
  .object({
    tenantId: optionalUuidSearchSchema,
    dealerOrgUnitId: optionalUuidSearchSchema,
    includeMyStock: booleanSearchSchema.default(true),
    includeSubDealerStock: booleanSearchSchema.default(false),
    q: optionalSearchTextSchema,
    unitId: optionalUuidSearchSchema,
    entryKey: optionalEntryKeySearchSchema,
    status: uniqueArraySchema(statusTokenSchema, 32).default([]),
    entryType: uniqueArraySchema(
      z.enum(VEHICLE_INVENTORY_ENTRY_TYPES),
      VEHICLE_INVENTORY_ENTRY_TYPES.length,
    ).default([]),
    orgUnitId: uniqueArraySchema(erpUuidSchema, 100).default([]),
    storeId: uniqueArraySchema(erpUuidSchema, 100).default([]),
    modelId: uniqueArraySchema(erpUuidSchema, 100).default([]),
    variantId: uniqueArraySchema(erpUuidSchema, 100).default([]),
    fuel: uniqueArraySchema(safeFacetTextSchema, 32).default([]),
    segment: uniqueArraySchema(safeFacetTextSchema, 64).default([]),
    color: uniqueArraySchema(safeFacetTextSchema, 64).default([]),
    metallic: optionalBooleanSearchSchema,
    registrationRequired: optionalBooleanSearchSchema,
    mrpMin: optionalDecimalSchema,
    mrpMax: optionalDecimalSchema,
    arrivalFrom: optionalDateSearchSchema,
    arrivalTo: optionalDateSearchSchema,
    transferFrom: optionalDateSearchSchema,
    transferTo: optionalDateSearchSchema,
    ageBucket: uniqueArraySchema(
      z.enum(VEHICLE_INVENTORY_AGE_BUCKETS),
      VEHICLE_INVENTORY_AGE_BUCKETS.length,
    ).default([]),
    warning: uniqueArraySchema(
      z.enum(VEHICLE_INVENTORY_DATA_QUALITY_FLAGS),
      VEHICLE_INVENTORY_DATA_QUALITY_FLAGS.length,
    ).default([]),
    kpi: z.enum(VEHICLE_INVENTORY_KPI_FILTERS).optional(),
    sortBy: z.enum(VEHICLE_INVENTORY_SORT_FIELDS).default("AGE"),
    sortDirection: z.enum(VEHICLE_INVENTORY_SORT_DIRECTIONS).default("ASC"),
    limit: positiveIntegerSchema(1, 100)
      .default(VEHICLE_INVENTORY_PAGE_SIZE)
      .transform(() => VEHICLE_INVENTORY_PAGE_SIZE),
    cursor: optionalCursorSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.includeMyStock && !value.includeSubDealerStock) {
      context.addIssue({
        code: "custom",
        path: ["includeMyStock"],
        message: "Select my stock, sub-dealer stock, or both.",
      });
    }

    if (value.kpi !== undefined && value.status.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Status and KPI filters cannot be used together.",
      });
    }

    if (
      value.mrpMin !== undefined &&
      value.mrpMax !== undefined &&
      value.mrpMin > value.mrpMax
    ) {
      context.addIssue({
        code: "custom",
        path: ["mrpMax"],
        message: "Maximum MRP must be greater than or equal to minimum MRP.",
      });
    }

    for (const [fromKey, toKey, fromValue, toValue] of [
      ["arrivalFrom", "arrivalTo", value.arrivalFrom, value.arrivalTo],
      ["transferFrom", "transferTo", value.transferFrom, value.transferTo],
    ] as const) {
      if (
        fromValue !== undefined &&
        toValue !== undefined &&
        fromValue > toValue
      ) {
        context.addIssue({
          code: "custom",
          path: [toKey],
          message: `${toKey} must be on or after ${fromKey}.`,
        });
      }
    }
  });

export type VehicleInventoryRawSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;
export type VehicleInventorySearchParams = z.output<
  typeof vehicleInventorySearchParamsSchema
>;
export type VehicleInventoryEntryType =
  (typeof VEHICLE_INVENTORY_ENTRY_TYPES)[number];
export type VehicleInventoryKpiFilter =
  (typeof VEHICLE_INVENTORY_KPI_FILTERS)[number];
export type VehicleInventoryAgeBucket =
  (typeof VEHICLE_INVENTORY_AGE_BUCKETS)[number];
export type VehicleInventoryDataQualityFlag =
  (typeof VEHICLE_INVENTORY_DATA_QUALITY_FLAGS)[number];
export type VehicleInventorySortField =
  (typeof VEHICLE_INVENTORY_SORT_FIELDS)[number];
export type VehicleInventorySortDirection =
  (typeof VEHICLE_INVENTORY_SORT_DIRECTIONS)[number];
export type VehicleInventoryRemediationCategory =
  (typeof VEHICLE_INVENTORY_REMEDIATION_CATEGORIES)[number];
export type VehicleInventoryArrivalSource =
  (typeof VEHICLE_INVENTORY_ARRIVAL_SOURCES)[number];
export type VehicleInventoryScopeMode =
  (typeof VEHICLE_INVENTORY_SCOPE_MODES)[number];

export function parseVehicleInventorySearchParams(
  raw: VehicleInventoryRawSearchParams,
) {
  const scopeSubmitted = firstRawValue(raw["scopeSubmitted"]) === "true";

  return vehicleInventorySearchParamsSchema.safeParse({
    tenantId: firstRawValue(raw["tenantId"]),
    dealerOrgUnitId: firstRawValue(raw["dealerOrgUnitId"]),
    includeMyStock: scopeSubmitted
      ? allRawValues(raw["includeMyStock"]).includes("true")
      : firstRawValue(raw["includeMyStock"]),
    includeSubDealerStock: scopeSubmitted
      ? allRawValues(raw["includeSubDealerStock"]).includes("true")
      : firstRawValue(raw["includeSubDealerStock"]),
    q: firstRawValue(raw["q"]),
    unitId: firstRawValue(raw["unitId"]),
    entryKey: firstRawValue(raw["entryKey"]),
    status: allRawValues(raw["status"]),
    entryType: allRawValues(raw["entryType"]),
    orgUnitId: allRawValues(raw["orgUnitId"]),
    storeId: allRawValues(raw["storeId"]),
    modelId: allRawValues(raw["modelId"]),
    variantId: allRawValues(raw["variantId"]),
    fuel: allRawValues(raw["fuel"]),
    segment: allRawValues(raw["segment"]),
    color: allRawValues(raw["color"]),
    metallic: firstRawValue(raw["metallic"]),
    registrationRequired: firstRawValue(raw["registrationRequired"]),
    mrpMin: firstRawValue(raw["mrpMin"]),
    mrpMax: firstRawValue(raw["mrpMax"]),
    arrivalFrom: firstRawValue(raw["arrivalFrom"]),
    arrivalTo: firstRawValue(raw["arrivalTo"]),
    transferFrom: firstRawValue(raw["transferFrom"]),
    transferTo: firstRawValue(raw["transferTo"]),
    ageBucket: allRawValues(raw["ageBucket"]),
    warning: allRawValues(raw["warning"]),
    kpi: firstRawValue(raw["kpi"]),
    sortBy: firstRawValue(raw["sortBy"]),
    sortDirection: firstRawValue(raw["sortDirection"]),
    limit: firstRawValue(raw["limit"]),
    cursor: firstRawValue(raw["cursor"]),
  });
}

const inventoryBatterySchema = z
  .object({
    type: nullableSafeTextSchema,
    powerKw: nullableNonNegativeNumberSchema,
    label: nullableSafeTextSchema,
  })
  .strict();

const inventoryModelSchema = z
  .object({
    modelId: erpUuidSchema.nullable(),
    snapshotName: nullableSafeTextSchema,
    catalogName: nullableSafeTextSchema,
    fuel: nullableSafeTextSchema,
    segment: nullableSafeTextSchema,
    hsnCode: nullableSafeTextSchema,
    defaultTaxCodeId: erpUuidSchema.nullable(),
    registrationRequired: z.boolean().nullable(),
  })
  .strict();

const inventoryVariantSchema = z
  .object({
    variantId: erpUuidSchema.nullable(),
    name: nullableSafeTextSchema,
    battery: inventoryBatterySchema,
  })
  .strict();

const inventoryColorSchema = z
  .object({
    hex: z
      .string()
      .trim()
      .regex(/^#[0-9A-F]{6}$/iu)
      .nullable(),
    name: nullableSafeTextSchema,
    metallic: z.boolean().nullable(),
  })
  .strict();

const inventoryPerspectiveSchema = z
  .object({
    store: z
      .object({
        storeId: erpUuidSchema,
        name: z.string().trim().min(1).max(256),
        code: z.string().trim().min(1).max(128),
        kind: z.string().trim().min(1).max(128),
        isActive: z.boolean(),
      })
      .strict(),
    orgUnit: z
      .object({
        orgUnitId: erpUuidSchema,
        name: z.string().trim().min(1).max(256),
        type: z.string().trim().min(1).max(128),
        isActive: z.boolean(),
      })
      .strict(),
    location: z
      .object({
        city: nullableSafeTextSchema.optional(),
        district: nullableSafeTextSchema,
        state: nullableSafeTextSchema,
      })
      .strict(),
  })
  .strict();

const inventoryPriceSchema = z
  .object({
    amount: nullableNonNegativeNumberSchema,
    currency: z.string().trim().min(3).max(3).nullable(),
    kind: z.enum(["MRP", "EX_SHOWROOM"]).nullable(),
    priceBook: z
      .object({
        priceBookId: erpUuidSchema,
        name: z.string().trim().min(1).max(256),
        stateId: erpUuidSchema.nullable(),
        stateName: nullableSafeTextSchema,
        isDefault: z.boolean(),
        effectiveFrom: dateOnlySchema,
        effectiveTo: nullableDateOnlySchema,
      })
      .strict()
      .nullable(),
  })
  .strict();

const inventoryTaxSchema = z
  .object({
    jurisdiction: z
      .object({
        jurisdictionId: erpUuidSchema,
        name: nullableSafeTextSchema,
        stateId: erpUuidSchema.nullable(),
      })
      .strict()
      .nullable(),
    components: z
      .array(
        z
          .object({
            component: z.string().trim().min(1).max(64),
            ratePercent: z.number().min(0).max(100),
            isInclusive: z.boolean(),
            effectiveFrom: dateOnlySchema,
            effectiveTo: nullableDateOnlySchema,
          })
          .strict(),
      )
      .max(MAX_TAX_COMPONENTS)
      .readonly(),
  })
  .strict();

export const vehicleInventoryItemSchema = z
  .object({
    entryKey: z.string().trim().min(1).max(512),
    entryType: z.enum(VEHICLE_INVENTORY_ENTRY_TYPES),
    unitId: erpUuidSchema,
    transferId: erpUuidSchema.nullable(),
    inventoryStatus: statusTokenSchema,
    unitStatus: statusTokenSchema,
    stockStatus: statusTokenSchema.nullable(),
    transferAt: nullableDateTimeSchema,
    lastUpdatedAt: erpIsoDateTimeSchema,
    destination: z
      .object({
        storeId: erpUuidSchema,
        storeName: z.string().trim().min(1).max(256),
        orgUnitId: erpUuidSchema,
        orgUnitName: z.string().trim().min(1).max(256),
      })
      .strict()
      .nullable(),
    vin: z.string().trim().min(1).max(64).nullable(),
    arrival: z
      .object({
        deliveredAt: nullableDateTimeSchema,
        fallbackCreatedAt: erpIsoDateTimeSchema,
        ageDays: nonNegativeIntegerSchema.nullable(),
        ageBucket: z.enum(VEHICLE_INVENTORY_AGE_BUCKETS),
        source: z.enum(VEHICLE_INVENTORY_ARRIVAL_SOURCES),
      })
      .strict(),
    model: inventoryModelSchema,
    color: inventoryColorSchema,
    variant: inventoryVariantSchema,
    perspective: inventoryPerspectiveSchema,
    stockLocation: inventoryPerspectiveSchema.nullable(),
    mrp: inventoryPriceSchema,
    components: z
      .array(
        z
          .object({
            type: z.string().trim().min(1).max(128),
            serialNumbers: z
              .array(z.string().trim().min(1).max(256))
              .max(MAX_COMPONENT_SERIALS)
              .readonly(),
          })
          .strict(),
      )
      .max(MAX_COMPONENT_SUMMARIES)
      .readonly(),
    tax: inventoryTaxSchema,
    dataQualityFlags: z
      .array(z.enum(VEHICLE_INVENTORY_DATA_QUALITY_FLAGS))
      .max(VEHICLE_INVENTORY_DATA_QUALITY_FLAGS.length)
      .readonly(),
  })
  .strict();

const inventoryKpisSchema = z
  .object({
    total: nonNegativeIntegerSchema,
    reserved: nonNegativeIntegerSchema,
    available: nonNegativeIntegerSchema,
    transferred: nonNegativeIntegerSchema,
    sold: nonNegativeIntegerSchema,
    aging: nonNegativeIntegerSchema,
  })
  .strict();

export const vehicleInventoryKpiTrendSchema = z
  .object({
    windowDays: z.literal(30),
    currentPeriod: nonNegativeIntegerSchema,
    previousPeriod: nonNegativeIntegerSchema,
    delta: z.number().int(),
    deltaPercent: z.number().nullable(),
  })
  .strict();

const inventoryKpiTrendsSchema = z
  .object({
    total: vehicleInventoryKpiTrendSchema,
    reserved: vehicleInventoryKpiTrendSchema,
    available: vehicleInventoryKpiTrendSchema,
    transferred: vehicleInventoryKpiTrendSchema,
    sold: vehicleInventoryKpiTrendSchema,
    aging: vehicleInventoryKpiTrendSchema,
  })
  .strict();

const inventoryDataQualitySchema = z
  .object({
    missingVariant: nonNegativeIntegerSchema,
    unknownArrivalDate: nonNegativeIntegerSchema,
    statusMismatch: nonNegativeIntegerSchema,
    metadataVariantModelMismatch: nonNegativeIntegerSchema,
    missingMrp: nonNegativeIntegerSchema,
    missingTaxConfiguration: nonNegativeIntegerSchema,
    inactiveStore: nonNegativeIntegerSchema,
  })
  .strict();

export const vehicleInventoryListResultSchema = z
  .object({
    asOf: erpIsoDateTimeSchema,
    items: z.array(vehicleInventoryItemSchema).max(MAX_LIST_ITEMS).readonly(),
    kpis: inventoryKpisSchema,
    kpiTrends: inventoryKpiTrendsSchema,
    pagination: z
      .object({
        limit: z.number().int().min(1).max(100),
        hasMore: z.boolean(),
        nextCursor: z.string().trim().min(1).max(MAX_CURSOR_LENGTH).nullable(),
      })
      .strict(),
    dataQuality: inventoryDataQualitySchema,
  })
  .strict();

export const vehicleInventoryFacetOptionSchema = z
  .object({
    value: z.string().trim().min(1).max(256),
    label: z.string().trim().min(1).max(256),
    count: nonNegativeIntegerSchema,
    parentId: erpUuidSchema.nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict();

const facetArraySchema = z
  .array(vehicleInventoryFacetOptionSchema)
  .max(MAX_FACET_OPTIONS)
  .readonly();

export const vehicleInventoryFacetsResultSchema = z
  .object({
    asOf: erpIsoDateTimeSchema,
    scope: z
      .object({
        mode: z.enum(VEHICLE_INVENTORY_SCOPE_MODES),
        dealerOrgUnitId: erpUuidSchema.nullable(),
        dealerOrgUnitName: z.string().trim().min(1).max(256),
        canIncludeSubDealerStock: z.boolean(),
        eligibleSubDealerCount: nonNegativeIntegerSchema,
      })
      .strict(),
    statuses: facetArraySchema,
    entryTypes: facetArraySchema,
    orgUnits: facetArraySchema,
    stores: facetArraySchema,
    models: facetArraySchema,
    variants: facetArraySchema,
    fuels: facetArraySchema,
    segments: facetArraySchema,
    colors: facetArraySchema,
    ageBuckets: facetArraySchema,
    mrp: z
      .object({
        minimum: nullableNonNegativeNumberSchema,
        maximum: nullableNonNegativeNumberSchema,
        currency: z.string().trim().min(3).max(3).nullable(),
      })
      .strict(),
  })
  .strict();

export const vehicleInventoryDealerContextQuerySchema = z
  .object({
    tenantId: erpUuidSchema,
    q: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
    limit: z.number().int().min(1).max(MAX_DEALER_CONTEXT_ITEMS).default(25),
    cursor: z.string().trim().min(1).max(MAX_CURSOR_LENGTH).optional(),
  })
  .strict();

export const vehicleInventoryDealerContextOptionSchema = z
  .object({
    tenantId: erpUuidSchema,
    dealerOrgUnitId: erpUuidSchema,
    code: z.string().trim().min(1).max(128),
    name: z.string().trim().min(1).max(256),
  })
  .strict();

export const vehicleInventoryDealerContextResultSchema = z
  .object({
    items: z
      .array(vehicleInventoryDealerContextOptionSchema)
      .max(MAX_DEALER_CONTEXT_ITEMS)
      .readonly(),
    pagination: z
      .object({
        limit: z.number().int().min(1).max(MAX_DEALER_CONTEXT_ITEMS),
        hasMore: z.boolean(),
        nextCursor: z.string().trim().min(1).max(MAX_CURSOR_LENGTH).nullable(),
      })
      .strict(),
  })
  .strict();

export const vehicleInventoryRemediationContextSchema = z
  .object({
    tenantId: erpUuidSchema,
    dealerOrgUnitId: erpUuidSchema.nullable(),
  })
  .strict();

export const vehicleInventoryPriceHistoryActionInputSchema = z
  .object({
    context: vehicleInventoryRemediationContextSchema,
    variantId: erpUuidSchema,
    storeId: erpUuidSchema,
  })
  .strict();

export const vehicleInventoryPriceHistoryPeriodSchema = z
  .object({
    priceId: erpUuidSchema,
    priceBookId: erpUuidSchema,
    priceBookName: z.string().trim().min(1).max(256),
    scope: z.enum(["STATE", "GLOBAL_DEFAULT", "GLOBAL"]),
    stateId: erpUuidSchema.nullable(),
    stateName: nullableSafeTextSchema,
    isDefault: z.boolean(),
    currency: z.string().trim().min(3).max(3),
    amount: z.number().nonnegative(),
    kind: z.enum(["MRP", "EX_SHOWROOM"]),
    effectiveFrom: dateOnlySchema,
    effectiveTo: nullableDateOnlySchema,
    priceBookEffectiveFrom: dateOnlySchema,
    priceBookEffectiveTo: nullableDateOnlySchema,
    isCurrent: z.boolean(),
    deltaAmount: z.number().nullable(),
    deltaPercent: z.number().nullable(),
  })
  .strict();

export const vehicleInventoryPriceHistoryResultSchema = z
  .object({
    asOf: erpIsoDateTimeSchema,
    variant: z
      .object({
        variantId: erpUuidSchema,
        name: z.string().trim().min(1).max(256),
        modelId: erpUuidSchema,
        modelName: z.string().trim().min(1).max(256),
      })
      .strict(),
    store: z
      .object({
        storeId: erpUuidSchema,
        name: z.string().trim().min(1).max(256),
        district: nullableSafeTextSchema,
        state: nullableSafeTextSchema,
        stateId: erpUuidSchema.nullable(),
      })
      .strict(),
    periods: z
      .array(vehicleInventoryPriceHistoryPeriodSchema)
      .max(MAX_PRICE_HISTORY_PERIODS)
      .readonly(),
    truncated: z.boolean(),
  })
  .strict();

const vehicleInventoryTransferLocationSchema = z
  .object({
    storeId: erpUuidSchema,
    storeName: z.string().trim().min(1).max(256),
    storeCode: z.string().trim().min(1).max(128),
    orgUnitId: erpUuidSchema,
    orgUnitName: z.string().trim().min(1).max(256),
    district: nullableSafeTextSchema,
    state: nullableSafeTextSchema,
  })
  .strict();

export const vehicleInventoryTransferHistoryActionInputSchema = z
  .object({
    context: vehicleInventoryRemediationContextSchema,
    unitId: erpUuidSchema,
  })
  .strict();

export const vehicleInventoryTransferHistoryResultSchema = z
  .object({
    asOf: erpIsoDateTimeSchema,
    unit: z
      .object({
        unitId: erpUuidSchema,
        vin: z.string().trim().min(1).max(64).nullable(),
      })
      .strict(),
    currentLocation: vehicleInventoryTransferLocationSchema.nullable(),
    events: z
      .array(
        z
          .object({
            transferId: erpUuidSchema,
            status: statusTokenSchema,
            eventAt: erpIsoDateTimeSchema,
            requestedAt: erpIsoDateTimeSchema,
            dispatchedAt: nullableDateTimeSchema,
            receivedAt: nullableDateTimeSchema,
            from: vehicleInventoryTransferLocationSchema,
            to: vehicleInventoryTransferLocationSchema,
          })
          .strict(),
      )
      .max(MAX_TRANSFER_HISTORY_EVENTS)
      .readonly(),
    truncated: z.boolean(),
  })
  .strict();

export const vehicleInventoryLiveSearchResultSchema = z
  .object({
    asOf: erpIsoDateTimeSchema,
    items: z
      .array(
        z
          .object({
            entryKey: z.string().trim().min(1).max(512),
            entryType: z.enum(VEHICLE_INVENTORY_ENTRY_TYPES),
            unitId: erpUuidSchema,
            vin: z.string().trim().min(1).max(64).nullable(),
            inventoryStatus: statusTokenSchema,
            modelName: nullableSafeTextSchema,
            variantName: nullableSafeTextSchema,
            colorName: nullableSafeTextSchema,
            storeName: z.string().trim().min(1).max(256),
            orgUnitName: z.string().trim().min(1).max(256),
            matchedComponentSerials: z
              .array(z.string().trim().min(1).max(256))
              .max(MAX_COMPONENT_SERIALS)
              .readonly(),
          })
          .strict(),
      )
      .max(MAX_LIVE_SEARCH_ITEMS)
      .readonly(),
    truncated: z.boolean(),
  })
  .strict();

export const VEHICLE_INVENTORY_VARIANT_RESOLUTION_REASONS = [
  "MODEL_METADATA_MISSING",
  "BATTERY_NOT_INSTALLED",
  "MULTIPLE_BATTERY_CHEMISTRIES",
  "GRAPHENE_PACK_COUNT_UNSUPPORTED",
  "GRAPHENE_VARIANT_NOT_CONFIGURED",
  "BATTERY_CONFIGURATION_INCOMPLETE",
  "VARIANT_NOT_CONFIGURED",
  "CHARGER_SELECTION_REQUIRED",
  "MULTIPLE_ACTIVE_CHARGERS",
  "CHARGER_NOT_COMPATIBLE",
  "MULTIPLE_VARIANTS_MATCH",
] as const;

export const VEHICLE_INVENTORY_VARIANT_RECOMMENDATION_ACTIONS = [
  "AUTO_RESOLVE",
  "NO_ACTION",
  "CONFIGURE_BATTERY",
  "REQUEST_VARIANT_CREATION",
  "REMOVE_BATTERY",
  "ADD_BATTERIES",
  "REMOVE_BATTERIES",
  "SELECT_CHARGER",
  "REVIEW_CONFIGURATION",
] as const;

export const vehicleInventoryVariantRecommendationSchema = z
  .object({
    decisionId: z.string().trim().min(1).max(128),
    action: z.enum(VEHICLE_INVENTORY_VARIANT_RECOMMENDATION_ACTIONS),
    severity: z.enum(["INFO", "WARNING"]),
    title: z.string().trim().min(1).max(256),
    instruction: z.string().trim().min(1).max(1_024),
    automaticResolutionExpected: z.boolean(),
    targetBatteryPackCount: nonNegativeIntegerSchema.nullable(),
    batteryPackDelta: z.number().int().nullable(),
    targetBatteryType: z.string().trim().min(1).max(64).nullable(),
    targetComponentSerialNumbers: z
      .array(z.string().trim().min(1).max(256))
      .max(MAX_COMPONENT_SERIALS)
      .readonly(),
  })
  .strict();

export const vehicleInventoryBatteryConfigurationOptionSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    batteryType: z.string().trim().min(1).max(64),
    voltageV: nullableNonNegativeNumberSchema,
    capacityKwh: nullableNonNegativeNumberSchema,
    ampHours: nullableNonNegativeNumberSchema,
    bms: z.string().trim().min(1).max(64).nullable(),
    mounting: z.string().trim().min(1).max(64).nullable(),
  })
  .strict();

export const vehicleInventoryBatteryConfigurationTargetSchema = z
  .object({
    compInvId: erpUuidSchema,
    serialNumber: z.string().trim().min(1).max(256).nullable(),
    batteryType: z.string().trim().min(1).max(64),
    currentConfigurationId: z.string().trim().min(1).max(128).nullable(),
    options: z
      .array(vehicleInventoryBatteryConfigurationOptionSchema)
      .max(128)
      .readonly(),
  })
  .strict();

export const vehicleInventoryVariantResolutionSchema = z
  .object({
    reason: z.enum(VEHICLE_INVENTORY_VARIANT_RESOLUTION_REASONS),
    detail: z.string().trim().min(1).max(1_024),
    batteryType: z.string().trim().min(1).max(64).nullable(),
    batteryPackCount: nonNegativeIntegerSchema,
    expectedVoltageV: nullableNonNegativeNumberSchema,
    requiresChargerSelection: z.boolean(),
    chargerOptions: z
      .array(
        z
          .object({
            componentId: erpUuidSchema,
            code: z.string().trim().min(1).max(64),
            name: z.string().trim().min(1).max(256),
          })
          .strict(),
      )
      .max(8)
      .readonly(),
    recommendation: vehicleInventoryVariantRecommendationSchema.optional(),
    batteryConfigurations: z
      .array(vehicleInventoryBatteryConfigurationTargetSchema)
      .max(MAX_REMEDIATION_UPDATES)
      .readonly()
      .optional(),
  })
  .strict();

export const vehicleInventoryDataQualityIssueSchema = z
  .object({
    unitId: erpUuidSchema,
    storeId: erpUuidSchema,
    vin: z.string().trim().min(1).max(64).nullable(),
    modelName: nullableSafeTextSchema,
    colorName: nullableSafeTextSchema,
    variantName: nullableSafeTextSchema,
    componentTypes: z
      .array(z.string().trim().min(1).max(128))
      .max(MAX_COMPONENT_SUMMARIES)
      .readonly(),
    componentSerialNumbers: z
      .array(z.string().trim().min(1).max(256))
      .max(MAX_COMPONENT_SERIALS)
      .readonly(),
    variantResolution: vehicleInventoryVariantResolutionSchema.nullable(),
  })
  .strict();

export const vehicleInventoryDataQualityIssuesResultSchema = z
  .object({
    category: z.enum(VEHICLE_INVENTORY_REMEDIATION_CATEGORIES),
    items: z
      .array(vehicleInventoryDataQualityIssueSchema)
      .max(MAX_REMEDIATION_ISSUES)
      .readonly(),
    total: nonNegativeIntegerSchema,
    truncated: z.boolean(),
  })
  .strict();

export const vehicleInventoryRemediationResultSchema = z
  .object({
    category: z.enum(VEHICLE_INVENTORY_REMEDIATION_CATEGORIES),
    attempted: nonNegativeIntegerSchema,
    resolved: nonNegativeIntegerSchema,
    unresolved: nonNegativeIntegerSchema,
    conflicts: nonNegativeIntegerSchema,
    hasMore: z.boolean(),
    emailQueued: z.boolean(),
    messageId: erpUuidSchema.nullable(),
  })
  .strict();

export const vehicleInventoryArrivalUpdateSchema = z
  .object({
    unitId: erpUuidSchema,
    storeId: erpUuidSchema,
    arrivalDate: dateOnlySchema,
  })
  .strict();

export const vehicleInventoryArrivalUpdatesSchema = z
  .array(vehicleInventoryArrivalUpdateSchema)
  .min(1)
  .max(MAX_REMEDIATION_UPDATES)
  .readonly();

export const vehicleInventoryChargerSelectionSchema = z
  .object({
    unitId: erpUuidSchema,
    chargerComponentId: erpUuidSchema,
  })
  .strict();

export const vehicleInventoryBatteryConfigurationSelectionSchema = z
  .object({
    unitId: erpUuidSchema,
    compInvId: erpUuidSchema,
    configurationId: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9._:-]+$/u),
  })
  .strict();

const vehicleInventoryBatteryConfigurationSelectionsSchema = z
  .array(vehicleInventoryBatteryConfigurationSelectionSchema)
  .max(MAX_REMEDIATION_UPDATES)
  .superRefine((selections, context) => {
    const keys = selections.map(
      (selection) => `${selection.unitId}:${selection.compInvId}`,
    );
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: "custom",
        message:
          "Each installed battery may have only one configuration selection.",
      });
    }
  })
  .readonly();

const vehicleInventoryChargerSelectionsSchema = z
  .array(vehicleInventoryChargerSelectionSchema)
  .max(MAX_REMEDIATION_UPDATES)
  .superRefine((selections, context) => {
    const unitIds = selections.map((selection) => selection.unitId);
    if (new Set(unitIds).size !== unitIds.length) {
      context.addIssue({
        code: "custom",
        message: "Each vehicle may have only one charger selection.",
      });
    }
  })
  .readonly();

export const vehicleInventoryRemediationActionInputSchema = z
  .object({
    context: vehicleInventoryRemediationContextSchema,
    query: vehicleInventorySearchParamsSchema,
    category: z.enum(VEHICLE_INVENTORY_REMEDIATION_CATEGORIES),
    idempotencyKey: z
      .string()
      .trim()
      .min(16)
      .max(128)
      .regex(/^[A-Za-z0-9:_./@-]+$/u),
    arrivals: vehicleInventoryArrivalUpdatesSchema.optional(),
    chargerSelections: vehicleInventoryChargerSelectionsSchema.optional(),
    batteryConfigurations:
      vehicleInventoryBatteryConfigurationSelectionsSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.category !== "MISSING_VARIANT" &&
      (value.chargerSelections?.length ?? 0) > 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["chargerSelections"],
        message:
          "Charger selections are only valid for missing-variant remediation.",
      });
    }

    if (
      value.category !== "MISSING_VARIANT" &&
      (value.batteryConfigurations?.length ?? 0) > 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["batteryConfigurations"],
        message:
          "Battery configurations are only valid for missing-variant remediation.",
      });
    }
  });

export type VehicleInventoryItem = z.output<typeof vehicleInventoryItemSchema>;
export type VehicleInventoryListResult = z.output<
  typeof vehicleInventoryListResultSchema
>;
export type VehicleInventoryFacetOption = z.output<
  typeof vehicleInventoryFacetOptionSchema
>;
export type VehicleInventoryFacetsResult = z.output<
  typeof vehicleInventoryFacetsResultSchema
>;
export type VehicleInventoryDealerContextQuery = z.output<
  typeof vehicleInventoryDealerContextQuerySchema
>;
export type VehicleInventoryDealerContextOption = z.output<
  typeof vehicleInventoryDealerContextOptionSchema
>;
export type VehicleInventoryDealerContextResult = z.output<
  typeof vehicleInventoryDealerContextResultSchema
>;
export type VehicleInventoryDataQualityIssue = z.output<
  typeof vehicleInventoryDataQualityIssueSchema
>;
export type VehicleInventoryDataQualityIssuesResult = z.output<
  typeof vehicleInventoryDataQualityIssuesResultSchema
>;
export type VehicleInventoryPriceHistoryPeriod = z.output<
  typeof vehicleInventoryPriceHistoryPeriodSchema
>;
export type VehicleInventoryPriceHistoryResult = z.output<
  typeof vehicleInventoryPriceHistoryResultSchema
>;
export type VehicleInventoryTransferHistoryResult = z.output<
  typeof vehicleInventoryTransferHistoryResultSchema
>;
export type VehicleInventoryLiveSearchResult = z.output<
  typeof vehicleInventoryLiveSearchResultSchema
>;
export type VehicleInventoryKpiTrend = z.output<
  typeof vehicleInventoryKpiTrendSchema
>;
export type VehicleInventoryRemediationResult = z.output<
  typeof vehicleInventoryRemediationResultSchema
>;
export type VehicleInventoryArrivalUpdate = z.output<
  typeof vehicleInventoryArrivalUpdateSchema
>;
export type VehicleInventoryChargerSelection = z.output<
  typeof vehicleInventoryChargerSelectionSchema
>;
export type VehicleInventoryBatteryConfigurationSelection = z.output<
  typeof vehicleInventoryBatteryConfigurationSelectionSchema
>;
export type VehicleInventoryBatteryConfigurationOption = z.output<
  typeof vehicleInventoryBatteryConfigurationOptionSchema
>;
export type VehicleInventoryBatteryConfigurationTarget = z.output<
  typeof vehicleInventoryBatteryConfigurationTargetSchema
>;
export type VehicleInventoryVariantRecommendation = z.output<
  typeof vehicleInventoryVariantRecommendationSchema
>;
export type VehicleInventoryVariantResolution = z.output<
  typeof vehicleInventoryVariantResolutionSchema
>;
export type VehicleInventoryRemediationActionInput = z.output<
  typeof vehicleInventoryRemediationActionInputSchema
>;

export type VehicleInventoryWorkspaceData = Readonly<{
  list: VehicleInventoryListResult;
  facets: VehicleInventoryFacetsResult;
  cursorReset: boolean;
}>;

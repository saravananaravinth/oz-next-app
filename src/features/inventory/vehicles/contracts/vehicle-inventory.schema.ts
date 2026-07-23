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
  "MISSING_MRP",
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
const MAX_DEALER_CONTEXT_ITEMS = 100;
const MAX_COMPONENT_SUMMARIES = 32;
const MAX_COMPONENT_SERIALS = 64;
const MAX_REMEDIATION_ISSUES = 100;
const MAX_REMEDIATION_UPDATES = 100;

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
    sortBy: z.enum(VEHICLE_INVENTORY_SORT_FIELDS).default("LAST_UPDATE"),
    sortDirection: z.enum(VEHICLE_INVENTORY_SORT_DIRECTIONS).default("DESC"),
    limit: positiveIntegerSchema(1, 100).default(50),
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

    if (
      (value.tenantId === undefined) !==
      (value.dealerOrgUnitId === undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["dealerOrgUnitId"],
        message: "Tenant and dealer context must be provided together.",
      });
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
        dealerOrgUnitId: erpUuidSchema,
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
    dealerOrgUnitId: erpUuidSchema,
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
  })
  .strict();

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
export type VehicleInventoryRemediationResult = z.output<
  typeof vehicleInventoryRemediationResultSchema
>;
export type VehicleInventoryArrivalUpdate = z.output<
  typeof vehicleInventoryArrivalUpdateSchema
>;
export type VehicleInventoryRemediationActionInput = z.output<
  typeof vehicleInventoryRemediationActionInputSchema
>;

export type VehicleInventoryWorkspaceData = Readonly<{
  list: VehicleInventoryListResult;
  facets: VehicleInventoryFacetsResult;
  cursorReset: boolean;
}>;

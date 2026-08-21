// oz-next-app/src/features/inventory/components/contracts/component-inventory.schema.ts
import { z } from "zod";

export const COMPONENT_CUSTODY_STATES = [
  "AVAILABLE",
  "RESERVED",
  "IN_TRANSIT",
  "ATTACHED",
  "QUARANTINED",
  "RETIRED",
  "UNLOCATED",
] as const;

export const COMPONENT_OPERATIONAL_STATES = [
  "AVAILABLE",
  "RESERVED",
  "IN_TRANSIT",
  "ATTACHED",
  "QUARANTINED",
  "SOLD",
  "RETIRED",
  "UNLOCATED",
  "OTHER",
] as const;

export const COMPONENT_STATUS_SOURCES = [
  "COMPONENT_CUSTODY",
  "VEHICLE",
] as const;

export const COMPONENT_TYPES = [
  "BATTERY",
  "CHARGER",
  "DISPLAY",
  "MOTOR",
  "TCU",
  "CONTROLLER",
  "FRAME",
] as const;

export const COMPONENT_INVENTORY_TYPES = [
  "BATTERY",
  "CHARGER",
  "DISPLAY",
  "MOTOR",
  "TCU",
  "CONTROLLER",
] as const;

export const COMPONENT_INTEGRITY_WARNINGS = [
  "ATTACHMENT_DEFINITION_MISMATCH",
  "SERIAL_IDENTITY_CONFLICT",
  "SERIAL_IDENTITY_MISSING",
  "UNLOCATED",
] as const;

export const COMPONENT_REMOVAL_DISPOSITIONS = [
  "RETURN_TO_POOL",
  "QUARANTINE",
  "RETIRED",
] as const;

export const COMPONENT_TRANSFER_STATUSES = [
  "REQUESTED",
  "DISPATCHED",
  "RECEIVED",
  "CANCELLED",
] as const;

export const COMPONENT_INVENTORY_PAGE_SIZE = 50;
export const COMPONENT_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

const uuidSchema = z.uuid();
const safeTextSchema = z.string().trim().min(1).max(256);
const nullableSafeTextSchema = safeTextSchema.nullable();
const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/u);
const sha256Schema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{64}$/u);

const jsonPrimitiveSchema = z.union([
  z.string().max(4_096),
  z.number(),
  z.boolean(),
  z.null(),
]);

type JsonValue =
  | z.infer<typeof jsonPrimitiveSchema>
  | readonly JsonValue[]
  | Readonly<{ [key: string]: JsonValue }>;

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    jsonPrimitiveSchema,
    z.array(jsonValueSchema).max(256),
    z.record(z.string().min(1).max(128), jsonValueSchema),
  ]),
);

export const componentJsonObjectSchema = z
  .record(z.string().min(1).max(128), jsonValueSchema)
  .readonly();

export const componentDefinitionSummarySchema = z
  .object({
    componentId: uuidSchema,
    code: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(160),
    type: z.enum(COMPONENT_TYPES),
    uomCode: z.string().trim().min(1).max(32).nullable(),
    isSerialized: z.boolean(),
    trackLot: z.boolean(),
    specifications: componentJsonObjectSchema,
    metadata: componentJsonObjectSchema,
    rowVersion: z.number().int().positive(),
    updatedAt: z.iso.datetime(),
  })
  .strict();

const componentStoreSchema = z
  .object({
    storeId: uuidSchema,
    code: z.string().trim().min(1).max(128),
    name: z.string().trim().min(1).max(256),
    orgUnitId: uuidSchema,
    orgUnitName: z.string().trim().min(1).max(256),
    orgUnitType: z.string().trim().min(1).max(128),
    isActive: z.boolean(),
  })
  .strict();

const componentVehicleSchema = z
  .object({
    unitId: uuidSchema,
    vin: nullableSafeTextSchema,
    variantId: uuidSchema.nullable(),
    storeId: uuidSchema.nullable(),
    status: z.string().trim().min(1).max(128).nullable().optional(),
    inventoryStatus: z.string().trim().min(1).max(128).nullable().optional(),
    lifecycleStatus: z.string().trim().min(1).max(128).nullable().optional(),
    statusMismatch: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const statusFields = [
      value.status,
      value.inventoryStatus,
      value.lifecycleStatus,
      value.statusMismatch,
    ];
    const presentCount = statusFields.filter(
      (field) => field !== undefined,
    ).length;

    if (presentCount !== 0 && presentCount !== statusFields.length) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Vehicle status fields must be supplied together.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    status: value.status ?? null,
    inventoryStatus: value.inventoryStatus ?? null,
    lifecycleStatus: value.lifecycleStatus ?? null,
    statusMismatch: value.statusMismatch ?? false,
  }));

export const componentInventoryItemSchema = z
  .object({
    componentInventoryId: uuidSchema,
    component: componentDefinitionSummarySchema,
    serialNumber: nullableSafeTextSchema,
    lotNumber: z.string().trim().min(1).max(128).nullable(),
    expiryDate: z.iso.date().nullable(),
    metadata: componentJsonObjectSchema,
    state: z.enum(COMPONENT_CUSTODY_STATES),
    operationalState: z.enum(COMPONENT_OPERATIONAL_STATES).optional(),
    statusSource: z.enum(COMPONENT_STATUS_SOURCES).optional(),
    inventoryRowVersion: z.number().int().positive(),
    custodyRowVersion: z.number().int().positive(),
    store: componentStoreSchema.nullable(),
    vehicle: componentVehicleSchema.nullable(),
    activeTransferId: uuidSchema.nullable(),
    integrityWarnings: z
      .array(z.enum(COMPONENT_INTEGRITY_WARNINGS))
      .max(COMPONENT_INTEGRITY_WARNINGS.length)
      .readonly(),
    updatedAt: z.iso.datetime(),
  })
  .strict()
  .superRefine((value, context) => {
    const operationalStatePresent = value.operationalState !== undefined;
    const statusSourcePresent = value.statusSource !== undefined;

    if (operationalStatePresent !== statusSourcePresent) {
      context.addIssue({
        code: "custom",
        path: ["operationalState"],
        message:
          "Operational state and status source must be supplied together.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    operationalState: value.operationalState ?? value.state,
    statusSource: value.statusSource ?? "COMPONENT_CUSTODY",
  }));

export const componentInventoryListResultSchema = z
  .object({
    asOf: z.iso.datetime(),
    items: z.array(componentInventoryItemSchema).max(100).readonly(),
    nextCursor: z.string().trim().min(8).max(2_048).nullable(),
  })
  .strict();

const componentStateFacetSchema = z
  .object({
    state: z.enum(COMPONENT_CUSTODY_STATES),
    count: z.number().int().nonnegative(),
  })
  .strict();

const componentOperationalStateFacetSchema = z
  .object({
    state: z.enum(COMPONENT_OPERATIONAL_STATES),
    count: z.number().int().nonnegative(),
  })
  .strict();

const componentVehicleStatusFacetSchema = z
  .object({
    status: z.string().trim().min(1).max(128),
    count: z.number().int().nonnegative(),
  })
  .strict();

const componentStoreFacetSchema = z
  .object({
    storeId: uuidSchema,
    code: z.string().trim().min(1).max(128),
    name: z.string().trim().min(1).max(256),
    orgUnitId: uuidSchema,
    orgUnitName: z.string().trim().min(1).max(256),
    isActive: z.boolean(),
    count: z.number().int().nonnegative(),
  })
  .strict();

const componentDefinitionFacetSchema = z
  .object({
    componentId: uuidSchema,
    code: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(160),
    type: z.enum(COMPONENT_TYPES),
    count: z.number().int().nonnegative(),
  })
  .strict();

export const componentInventoryFacetsSchema = z
  .object({
    states: z
      .array(componentStateFacetSchema)
      .max(COMPONENT_CUSTODY_STATES.length)
      .readonly(),
    operationalStates: z
      .array(componentOperationalStateFacetSchema)
      .max(COMPONENT_OPERATIONAL_STATES.length)
      .readonly()
      .optional(),
    vehicleStatuses: z
      .array(componentVehicleStatusFacetSchema)
      .max(128)
      .readonly()
      .optional(),
    stores: z.array(componentStoreFacetSchema).max(1_000).readonly(),
    components: z.array(componentDefinitionFacetSchema).max(1_000).readonly(),
  })
  .strict()
  .superRefine((value, context) => {
    const upgradedFields = [value.operationalStates, value.vehicleStatuses];
    const presentCount = upgradedFields.filter(
      (field) => field !== undefined,
    ).length;

    if (presentCount !== 0 && presentCount !== upgradedFields.length) {
      context.addIssue({
        code: "custom",
        path: ["operationalStates"],
        message:
          "Operational-state and vehicle-status facets must be supplied together.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    operationalStates: value.operationalStates ?? [],
    vehicleStatuses: value.vehicleStatuses ?? [],
    operationalStateAvailable: value.operationalStates !== undefined,
  }));

export const componentOrganizationOptionSchema = z
  .object({
    orgUnitId: uuidSchema,
    code: z.string().trim().min(1).max(128),
    name: z.string().trim().min(1).max(256),
    type: z.string().trim().min(1).max(128),
    isActive: z.boolean(),
    city: z.string().trim().min(1).max(256).nullable(),
    district: z.string().trim().min(1).max(256).nullable(),
    state: z.string().trim().min(1).max(256).nullable(),
    storeCount: z.number().int().nonnegative(),
    componentCount: z.number().int().nonnegative(),
  })
  .strict();

export const componentStoreOptionSchema = z
  .object({
    storeId: uuidSchema,
    code: z.string().trim().min(1).max(128),
    name: z.string().trim().min(1).max(256),
    kind: z.string().trim().min(1).max(128),
    isActive: z.boolean(),
    orgUnitId: uuidSchema,
    orgUnitCode: z.string().trim().min(1).max(128),
    orgUnitName: z.string().trim().min(1).max(256),
    orgUnitType: z.string().trim().min(1).max(128),
    addressLine1: z.string().trim().min(1).max(512).nullable(),
    addressLine2: z.string().trim().min(1).max(512).nullable(),
    city: z.string().trim().min(1).max(256).nullable(),
    district: z.string().trim().min(1).max(256).nullable(),
    state: z.string().trim().min(1).max(256).nullable(),
    postalCode: z.string().trim().min(1).max(32).nullable(),
    country: z.string().trim().min(1).max(128),
    componentCount: z.number().int().nonnegative(),
  })
  .strict();

export const componentContextOptionsSchema = z
  .object({
    organizations: z
      .array(componentOrganizationOptionSchema)
      .max(2_000)
      .readonly(),
    stores: z.array(componentStoreOptionSchema).max(2_000).readonly(),
  })
  .strict();

export const componentMetricTrendSchema = z
  .object({
    state: z.enum(COMPONENT_CUSTODY_STATES),
    windowDays: z.literal(30),
    currentPeriod: z.number().int().nonnegative(),
    previousPeriod: z.number().int().nonnegative(),
    delta: z.number().int(),
    deltaPercent: z.number().nullable(),
  })
  .strict();

export const componentInventoryOverviewSchema = z
  .object({
    asOf: z.iso.datetime(),
    total: z.number().int().nonnegative(),
    states: z
      .array(componentStateFacetSchema)
      .max(COMPONENT_CUSTODY_STATES.length)
      .readonly(),
    operationalStates: z
      .array(componentOperationalStateFacetSchema)
      .max(COMPONENT_OPERATIONAL_STATES.length)
      .readonly()
      .optional(),
    vehicleStatuses: z
      .array(componentVehicleStatusFacetSchema)
      .max(128)
      .readonly()
      .optional(),
    operationalStateBasis: z
      .literal("VEHICLE_INVENTORY_STATUS_WHEN_ATTACHED")
      .optional(),
    trends: z
      .array(componentMetricTrendSchema)
      .max(COMPONENT_CUSTODY_STATES.length)
      .readonly(),
    trendBasis: z.literal("COMPONENT_CUSTODY_EVENTS").optional(),
    trendHistoryAvailable: z.boolean(),
    integrity: z
      .object({
        missingCustody: z.number().int().nonnegative(),
        custodyAttachmentMismatch: z.number().int().nonnegative(),
        attachedWithoutEffectiveStore: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    const upgradedFields = [
      value.operationalStates,
      value.vehicleStatuses,
      value.operationalStateBasis,
      value.trendBasis,
    ];
    const presentCount = upgradedFields.filter(
      (field) => field !== undefined,
    ).length;

    if (presentCount !== 0 && presentCount !== upgradedFields.length) {
      context.addIssue({
        code: "custom",
        path: ["operationalStates"],
        message:
          "Operational overview fields and trend basis must be supplied together.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    operationalStates: value.operationalStates ?? [],
    vehicleStatuses: value.vehicleStatuses ?? [],
    operationalStateBasis: value.operationalStateBasis ?? null,
    operationalStateAvailable: value.operationalStates !== undefined,
    trendBasis: value.trendBasis ?? "COMPONENT_CUSTODY_EVENTS",
  }));

export const componentHistoryItemSchema = z
  .object({
    eventId: uuidSchema,
    eventType: z.string().trim().min(1).max(128),
    reason: z.string().trim().min(1).max(500).nullable(),
    storeId: uuidSchema.nullable(),
    unitId: uuidSchema.nullable(),
    transferId: uuidSchema.nullable(),
    evidenceId: uuidSchema.nullable(),
    actorUserId: uuidSchema.nullable(),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const componentHistoryResultSchema = z
  .array(componentHistoryItemSchema)
  .max(200)
  .readonly();

export const componentStateMutationResultSchema = z
  .object({
    componentInventoryId: uuidSchema,
    state: z.enum(["AVAILABLE", "QUARANTINED"]),
    custodyRowVersion: z.number().int().positive(),
  })
  .strict();

export const componentAttachmentResultSchema = z
  .object({
    componentInventoryId: uuidSchema,
    unitId: uuidSchema,
    unitComponentId: uuidSchema,
  })
  .strict();

export const componentReplacementResultSchema = z
  .object({
    newComponentInventoryId: uuidSchema,
    oldComponentInventoryId: uuidSchema,
    unitId: uuidSchema,
    newUnitComponentId: uuidSchema,
  })
  .strict();

export const componentTransferResultSchema = z
  .object({
    transferId: uuidSchema,
    transferNumber: z.string().trim().min(1).max(64),
    status: z.enum(COMPONENT_TRANSFER_STATUSES),
    fromStoreId: uuidSchema,
    toStoreId: uuidSchema,
    componentInventoryIds: z.array(uuidSchema).min(1).max(50).readonly(),
    rowVersion: z.number().int().positive(),
  })
  .strict();

export const componentReconciliationResultSchema = z
  .object({
    reconciledAt: z.iso.datetime(),
    storeId: uuidSchema,
    items: z
      .array(
        z
          .object({
            componentInventoryId: uuidSchema,
            state: z.literal("AVAILABLE"),
            custodyRowVersion: z.number().int().positive(),
          })
          .strict(),
      )
      .max(100)
      .readonly(),
  })
  .strict();

export const componentCompatibilityDecisionSchema = z
  .object({
    compatible: z.boolean(),
    requiresReview: z.boolean(),
    score: z.number(),
    decisionId: z.string().trim().min(1).max(256),
    reason: z.string().trim().min(1).max(500),
    allowedQuantity: z.number().int().positive().nullable(),
  })
  .strict();

export const componentReplacementOptionSchema = z
  .object({
    componentInventoryId: uuidSchema,
    serialNumber: nullableSafeTextSchema,
    componentId: uuidSchema,
    componentCode: z.string().trim().min(1).max(64),
    componentName: z.string().trim().min(1).max(160),
    componentType: z.enum(COMPONENT_TYPES),
    custodyRowVersion: z.number().int().positive(),
    compatibility: componentCompatibilityDecisionSchema,
  })
  .strict();

export const componentReplacementOptionsResultSchema = z
  .array(componentReplacementOptionSchema)
  .max(100)
  .readonly();

export const componentEvidenceUploadIntentSchema = z
  .object({
    evidenceId: uuidSchema,
    uploadId: uuidSchema,
    fileId: uuidSchema,
    componentInventoryId: uuidSchema,
    captureChallenge: z.string().trim().min(32).max(256),
    upload: z
      .object({
        method: z.literal("PUT"),
        url: z.string().trim().min(1).max(4_096).pipe(z.url()),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        sizeBytes: z.number().int().min(1).max(COMPONENT_EVIDENCE_MAX_BYTES),
        requiredHeaders: z.record(
          z.string().min(1).max(128),
          z.string().max(2_048),
        ),
        expiresAt: z.iso.datetime(),
      })
      .strict(),
  })
  .strict();

export const componentEvidenceStatusSchema = z
  .object({
    evidenceId: uuidSchema,
    fileId: uuidSchema,
    uploadStatus: z.enum(["PENDING_UPLOAD", "FINALIZED", "CANCELLED"]),
    scanStatus: z
      .enum(["PENDING", "SCANNING", "CLEAN", "INFECTED", "REJECTED", "ERROR"])
      .nullable(),
    usable: z.boolean(),
  })
  .strict();

export const componentInventoryContextSchema = z
  .object({ tenantId: uuidSchema })
  .strict();

export const componentStateMutationActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    componentInventoryId: uuidSchema,
    custodyRowVersion: z.number().int().positive(),
    reason: z.string().trim().min(5).max(500),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const reconcileComponentsActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    components: z
      .array(
        z
          .object({
            componentInventoryId: uuidSchema,
            custodyRowVersion: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    storeId: uuidSchema,
    reason: z.string().trim().min(5).max(500),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .refine(
    (value) =>
      new Set(
        value.components.map((component) => component.componentInventoryId),
      ).size === value.components.length,
    { path: ["components"], message: "Duplicate components are not allowed." },
  );

export const componentHistoryActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    componentInventoryId: uuidSchema,
  })
  .strict();

export const componentDefinitionsSearchActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    q: z.string().trim().min(1).max(256).optional(),
    componentType: z.enum(COMPONENT_INVENTORY_TYPES).optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();

export const createComponentDefinitionActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    code: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[A-Za-z0-9._-]+$/u),
    name: z.string().trim().min(2).max(160),
    type: z.enum(COMPONENT_INVENTORY_TYPES),
    uomCode: z.string().trim().min(1).max(32).nullable().default(null),
    isSerialized: z.boolean().default(true),
    trackLot: z.boolean().default(false),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const updateComponentDefinitionActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    componentId: uuidSchema,
    rowVersion: z.number().int().positive(),
    name: z.string().trim().min(2).max(160).optional(),
    uomCode: z.string().trim().min(1).max(32).nullable().optional(),
    isSerialized: z.boolean().optional(),
    trackLot: z.boolean().optional(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.uomCode !== undefined ||
      value.isSerialized !== undefined ||
      value.trackLot !== undefined,
    {
      path: ["name"],
      message: "Change at least one component-master field.",
    },
  );

export const componentBatteryConfigurationInputSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    batteryType: z.string().trim().min(1).max(64).optional(),
    capacityKwh: z.number().positive().max(50).optional(),
    voltageV: z.number().positive().max(1_000).optional(),
    ah: z.number().positive().max(1_000).optional(),
    bms: z.enum(["SMART", "STD"]).optional(),
    mounting: z.enum(["FIXED", "REMOVABLE"]).optional(),
    batteryPackCount: z.number().int().min(1).max(16).optional(),
  })
  .strict();

export const createPhysicalComponentActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    componentId: uuidSchema,
    storeId: uuidSchema,
    serialNumber: z.string().trim().min(1).max(256).nullable().default(null),
    lotNumber: z.string().trim().min(1).max(128).nullable().default(null),
    expiryDate: z.iso.date().nullable().default(null),
    batteryConfiguration: componentBatteryConfigurationInputSchema
      .nullable()
      .default(null),
    reason: z.string().trim().min(3).max(500),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const attachComponentActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    componentInventoryId: uuidSchema,
    unitId: uuidSchema,
    custodyRowVersion: z.number().int().positive(),
    reason: z.string().trim().min(3).max(500),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const replacementOptionsActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    componentInventoryId: uuidSchema,
    unitId: uuidSchema,
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();

export const replaceComponentActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    newComponentInventoryId: uuidSchema,
    unitId: uuidSchema,
    newComponentCustodyRowVersion: z.number().int().positive(),
    oldUnitComponentId: uuidSchema.optional(),
    removedDisposition: z.enum(COMPONENT_REMOVAL_DISPOSITIONS),
    reason: z.string().trim().min(3).max(500),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const transferComponentActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    fromStoreId: uuidSchema,
    toStoreId: uuidSchema,
    componentInventoryIds: z.array(uuidSchema).min(1).max(50),
    reason: z.string().trim().min(3).max(500),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .refine((value) => value.fromStoreId !== value.toStoreId, {
    path: ["toStoreId"],
    message: "Source and destination stores must differ.",
  });

export const createComponentEvidenceUploadActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    componentInventoryId: uuidSchema,
    fileName: z.string().trim().min(1).max(180),
    contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().min(1).max(COMPONENT_EVIDENCE_MAX_BYTES),
    checksumSha256: sha256Schema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const finalizeComponentEvidenceUploadActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    uploadId: uuidSchema,
    checksumSha256: sha256Schema,
    sizeBytes: z.number().int().min(1).max(COMPONENT_EVIDENCE_MAX_BYTES),
    captureChallenge: z
      .string()
      .min(32)
      .max(256)
      .regex(/^[A-Za-z0-9_-]+$/u),
    capturedAt: z.iso.datetime({ offset: true }),
    location: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracyMeters: z.number().positive().max(10_000),
      })
      .strict(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const componentEvidenceStatusActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    evidenceId: uuidSchema,
  })
  .strict();

const componentConfigurationPatchSchema =
  componentBatteryConfigurationInputSchema;

export const componentMetadataPatchSchema = z
  .object({
    configuration: componentConfigurationPatchSchema.nullable().optional(),
    modelId: uuidSchema.nullable().optional(),
    variantName: z.string().trim().min(1).max(160).nullable().optional(),
    batteryPowerKw: z.number().positive().max(100).nullable().optional(),
    batteryTypeCode: z.string().trim().min(1).max(64).nullable().optional(),
    batteryTypeName: z.string().trim().min(1).max(128).nullable().optional(),
    voltageV: z.number().positive().max(1_000).nullable().optional(),
    bms: z.enum(["SMART", "STD"]).nullable().optional(),
    mounting: z.enum(["FIXED", "REMOVABLE"]).nullable().optional(),
    capacityKwh: z.number().positive().max(50).nullable().optional(),
    imeiNumber: z.string().trim().min(5).max(64).nullable().optional(),
  })
  .strict();

export const correctComponentActionInputSchema = z
  .object({
    context: componentInventoryContextSchema,
    componentInventoryId: uuidSchema,
    inventoryRowVersion: z.number().int().positive(),
    evidenceId: uuidSchema,
    reason: z.string().trim().min(5).max(500),
    serialNumber: z.string().trim().min(1).max(256).nullable().optional(),
    lotNumber: z.string().trim().min(1).max(128).nullable().optional(),
    expiryDate: z.iso.date().nullable().optional(),
    metadata: componentMetadataPatchSchema.optional(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .refine(
    (value) =>
      value.serialNumber !== undefined ||
      value.lotNumber !== undefined ||
      value.expiryDate !== undefined ||
      value.metadata !== undefined,
    {
      path: ["serialNumber"],
      message: "At least one component correction field is required.",
    },
  );

const optionalBooleanFromQuery = z.preprocess((value) => {
  if (value === undefined || value === "") return undefined;
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return value;
}, z.boolean().optional());

const optionalLimitFromQuery = z.preprocess((value) => {
  if (value === undefined || value === "") return undefined;
  if (typeof value === "string" && /^\d+$/u.test(value.trim()))
    return Number(value);
  return value;
}, z.number().int().min(1).max(100).default(COMPONENT_INVENTORY_PAGE_SIZE));

export const componentInventorySearchParamsSchema = z
  .object({
    q: z.string().trim().min(1).max(256).optional(),
    focusComponentInventoryId: uuidSchema.optional(),
    state: z.enum(COMPONENT_CUSTODY_STATES).optional(),
    operationalState: z.preprocess(
      (value) => (value === "INWARD_PENDING" ? "QUARANTINED" : value),
      z.enum(COMPONENT_OPERATIONAL_STATES).optional(),
    ),
    includeAllStates: optionalBooleanFromQuery,
    componentType: z.enum(COMPONENT_INVENTORY_TYPES).optional(),
    orgUnitId: uuidSchema.optional(),
    storeId: uuidSchema.optional(),
    componentId: uuidSchema.optional(),
    limit: optionalLimitFromQuery,
    cursor: z.string().trim().min(8).max(2_048).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.includeAllStates === true && value.state !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["state"],
        message: "Choose either all custody states or one custody state.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    includeAllStates: value.state === undefined,
  }));

export type ComponentInventoryRawSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

function singleRawValue(
  value: string | readonly string[] | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  return value.length === 1 ? value[0] : "__duplicate__";
}

export function parseComponentInventorySearchParams(
  raw: ComponentInventoryRawSearchParams,
) {
  const normalizedRaw: Record<string, string | readonly string[] | undefined> =
    {};

  for (const [key, value] of Object.entries(raw)) {
    if (key !== "tenantId") {
      normalizedRaw[key] = value;
    }
  }

  return componentInventorySearchParamsSchema.safeParse({
    ...normalizedRaw,
    q: singleRawValue(raw["q"]),
    focusComponentInventoryId: singleRawValue(raw["focusComponentInventoryId"]),
    state: singleRawValue(raw["state"]),
    operationalState: singleRawValue(raw["operationalState"]),
    includeAllStates: singleRawValue(raw["includeAllStates"]),
    componentType: singleRawValue(raw["componentType"]),
    orgUnitId: singleRawValue(raw["orgUnitId"]),
    storeId: singleRawValue(raw["storeId"]),
    componentId: singleRawValue(raw["componentId"]),
    limit: singleRawValue(raw["limit"]),
    cursor: singleRawValue(raw["cursor"]),
  });
}

export type ComponentJsonObject = z.infer<typeof componentJsonObjectSchema>;
export type ComponentBatteryConfigurationInput = z.infer<
  typeof componentBatteryConfigurationInputSchema
>;
export type ComponentCustodyState = (typeof COMPONENT_CUSTODY_STATES)[number];
export type ComponentOperationalState =
  (typeof COMPONENT_OPERATIONAL_STATES)[number];
export type ComponentStatusSource = (typeof COMPONENT_STATUS_SOURCES)[number];
export type ComponentType = (typeof COMPONENT_TYPES)[number];
export type ComponentInventoryType = (typeof COMPONENT_INVENTORY_TYPES)[number];
export type ComponentIntegrityWarning =
  (typeof COMPONENT_INTEGRITY_WARNINGS)[number];
export type ComponentRemovalDisposition =
  (typeof COMPONENT_REMOVAL_DISPOSITIONS)[number];
export type ComponentDefinitionSummary = z.infer<
  typeof componentDefinitionSummarySchema
>;
export type ComponentInventoryItem = z.infer<
  typeof componentInventoryItemSchema
>;
export type ComponentInventoryListResult = z.infer<
  typeof componentInventoryListResultSchema
>;
export type ComponentInventoryFacets = z.infer<
  typeof componentInventoryFacetsSchema
>;
export type ComponentOrganizationOption = z.infer<
  typeof componentOrganizationOptionSchema
>;
export type ComponentStoreOption = z.infer<typeof componentStoreOptionSchema>;
export type ComponentContextOptions = z.infer<
  typeof componentContextOptionsSchema
>;
export type ComponentMetricTrend = z.infer<typeof componentMetricTrendSchema>;
export type ComponentInventoryOverview = z.infer<
  typeof componentInventoryOverviewSchema
>;
export type ComponentHistoryItem = z.infer<typeof componentHistoryItemSchema>;
export type ComponentHistoryResult = z.infer<
  typeof componentHistoryResultSchema
>;
export type ComponentStateMutationResult = z.infer<
  typeof componentStateMutationResultSchema
>;
export type ComponentAttachmentResult = z.infer<
  typeof componentAttachmentResultSchema
>;
export type ComponentReplacementResult = z.infer<
  typeof componentReplacementResultSchema
>;
export type ComponentTransferResult = z.infer<
  typeof componentTransferResultSchema
>;
export type ComponentReconciliationResult = z.infer<
  typeof componentReconciliationResultSchema
>;
export type ComponentReplacementOption = z.infer<
  typeof componentReplacementOptionSchema
>;
export type ComponentReplacementOptionsResult = z.infer<
  typeof componentReplacementOptionsResultSchema
>;
export type ComponentEvidenceUploadIntent = z.infer<
  typeof componentEvidenceUploadIntentSchema
>;
export type ComponentEvidenceStatus = z.infer<
  typeof componentEvidenceStatusSchema
>;
export type ComponentInventoryContext = z.infer<
  typeof componentInventoryContextSchema
>;
export type ComponentInventorySearchParams = z.output<
  typeof componentInventorySearchParamsSchema
>;

export type ComponentInventoryWorkspaceData = Readonly<{
  list: ComponentInventoryListResult;
  facets: ComponentInventoryFacets;
  contextOptions: ComponentContextOptions;
  overview: ComponentInventoryOverview;
  cursorReset: boolean;
  focused: boolean;
}>;

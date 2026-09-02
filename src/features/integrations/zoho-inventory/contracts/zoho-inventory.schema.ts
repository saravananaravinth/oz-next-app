// oz-next-app/src/features/integrations/zoho-inventory/contracts/zoho-inventory.schema.ts
import { z } from "zod";

export const ZOHO_INVENTORY_DATA_CENTERS = [
  "US",
  "EU",
  "IN",
  "AU",
  "CA",
] as const;

export const zohoInventoryDataCenterSchema = z.enum(
  ZOHO_INVENTORY_DATA_CENTERS,
);
export type ZohoInventoryDataCenter = z.infer<
  typeof zohoInventoryDataCenterSchema
>;

export const zohoConnectionStatusSchema = z.enum([
  "ACTIVE",
  "REAUTH_REQUIRED",
  "DISABLED",
]);
export type ZohoConnectionStatus = z.infer<typeof zohoConnectionStatusSchema>;

export const zohoSyncJobStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "OUTCOME_UNKNOWN",
  "CANCELLED",
]);
export type ZohoSyncJobStatus = z.infer<typeof zohoSyncJobStatusSchema>;

export const zohoSyncOperationSchema = z.enum([
  "SYNC",
  "RECONCILE",
  "REPAIR",
  "BACKFILL",
]);

const uuidSchema = z.string().trim().pipe(z.uuid());
const isoDateTimeSchema = z.union([
  z.iso.datetime({ offset: true }),
  z.iso.datetime(),
]);
const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable();

const safeProviderIdentifierSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._-]+$/u);

const safeIdempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(256)
  .regex(/^[A-Za-z0-9._:/@+=-]+$/u);

const zohoOAuthCodeSchema = z
  .string()
  .trim()
  .min(8)
  .max(8_192)
  .regex(/^[A-Za-z0-9._-]+$/u);

const zohoOAuthStateSchema = z
  .string()
  .trim()
  .min(32)
  .max(512)
  .regex(/^[A-Za-z0-9_-]+$/u);

export const zohoOAuthLocationSchema = z.enum(["us", "eu", "in", "au", "ca"]);

export const zohoOAuthAccountsServerSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .pipe(z.url())
  .refine(
    (value) => {
      const url = new URL(value);

      return (
        url.protocol === "https:" &&
        url.username.length === 0 &&
        url.password.length === 0 &&
        url.pathname === "/" &&
        url.search.length === 0 &&
        url.hash.length === 0
      );
    },
    { message: "Zoho Accounts server must be a bare HTTPS origin." },
  );

function hasCompleteProviderMetadata(
  value: Readonly<{
    location?: string | undefined;
    accountsServer?: string | undefined;
  }>,
): boolean {
  return (
    (value.location === undefined) === (value.accountsServer === undefined)
  );
}

export const zohoExternalConnectionSchema = z
  .object({
    connectionId: uuidSchema,
    tenantId: uuidSchema,
    provider: z.literal("ZOHO_INVENTORY"),
    dataCenter: zohoInventoryDataCenterSchema,
    organizationId: safeProviderIdentifierSchema,
    organizationName: z.string().trim().min(1).max(512),
    status: zohoConnectionStatusSchema,
    grantedScopes: z
      .array(z.string().trim().min(1).max(256))
      .max(64)
      .readonly(),
    isDefault: z.boolean(),
    connectedBy: uuidSchema,
    connectedAt: isoDateTimeSchema,
    lastVerifiedAt: nullableIsoDateTimeSchema,
    lastSuccessfulSyncAt: nullableIsoDateTimeSchema,
    lastFailureAt: nullableIsoDateTimeSchema,
    rowVersion: z.number().int().nonnegative(),
  })
  .strict();

export const zohoConnectionsSchema = z
  .array(zohoExternalConnectionSchema)
  .max(100)
  .readonly();

export const zohoAuthorizationStartResultSchema = z
  .object({
    authorizationId: uuidSchema,
    authorizationUrl: z.string().trim().min(1).max(8_192).pipe(z.url()),
    expiresAt: isoDateTimeSchema,
  })
  .strict();

export const zohoAuthorizationOrganizationSchema = z
  .object({
    organizationId: safeProviderIdentifierSchema,
    name: z.string().trim().min(1).max(512),
    isDefault: z.boolean(),
    country: z.string().trim().max(128).nullable(),
    timeZone: z.string().trim().max(128).nullable(),
    currencyCode: z.string().trim().max(16).nullable(),
  })
  .strict();

export const zohoAuthorizationExchangeResultSchema = z
  .object({
    authorizationId: uuidSchema,
    expiresAt: isoDateTimeSchema,
    organizations: z
      .array(zohoAuthorizationOrganizationSchema)
      .min(1)
      .max(1_000)
      .readonly(),
  })
  .strict();

export const zohoVerifyResultSchema = z
  .object({
    connectionId: uuidSchema,
    organizationId: safeProviderIdentifierSchema,
    organizationName: z.string().trim().min(1).max(512),
    verifiedAt: isoDateTimeSchema,
  })
  .strict();

export const zohoSyncJobSchema = z
  .object({
    syncJobId: uuidSchema,
    tenantId: uuidSchema,
    connectionId: uuidSchema,
    operation: zohoSyncOperationSchema,
    resourceType: z.string().trim().min(1).max(128),
    idempotencyKey: safeIdempotencyKeySchema,
    payloadHash: z
      .string()
      .trim()
      .regex(/^[a-f0-9]{64}$/u),
    status: zohoSyncJobStatusSchema,
    taskId: z.string().trim().min(1).max(512).nullable(),
    attemptCount: z.number().int().nonnegative(),
    createdAt: isoDateTimeSchema,
    startedAt: nullableIsoDateTimeSchema,
    completedAt: nullableIsoDateTimeSchema,
    lastErrorCode: z.string().trim().min(1).max(256).nullable(),
    triggerSource: z.enum(["MANUAL", "SCHEDULED", "WEBHOOK", "SYSTEM"]),
    scopeId: uuidSchema.nullable(),
    resourceKey: z.string().trim().max(256).nullable(),
    triggerReference: z.string().trim().max(512).nullable(),
    batchId: uuidSchema.nullable(),
    parentSyncJobId: uuidSchema.nullable(),
    outcome: z.record(z.string(), z.unknown()).nullable(),
  })
  .strict();

export const zohoSyncJobsSchema = z
  .array(zohoSyncJobSchema)
  .max(100)
  .readonly();

export const beginZohoAuthorizationActionInputSchema = z
  .object({
    dataCenter: zohoInventoryDataCenterSchema.default("IN"),
    forceConsent: z.literal(true).default(true),
  })
  .strict();

export const createZohoConnectionActionInputSchema = z
  .object({
    authorizationId: uuidSchema,
    organizationId: safeProviderIdentifierSchema,
    isDefault: z.boolean().default(false),
  })
  .strict();

export const zohoConnectionActionInputSchema = z
  .object({
    connectionId: uuidSchema,
  })
  .strict();

export const runZohoReconciliationActionInputSchema = z
  .object({
    connectionId: uuidSchema,
    idempotencyKey: safeIdempotencyKeySchema,
  })
  .strict();

export const zohoScopeSchema = z
  .object({
    scopeId: uuidSchema,
    connectionId: uuidSchema,
    sourceCode: z.string().min(1).max(128),
    scopeKind: z.enum(["CUSTOM_VIEW", "CATEGORY"]).default("CUSTOM_VIEW"),
    customViewId: safeProviderIdentifierSchema,
    customViewName: z.string().max(512).nullable(),
    categoryId: safeProviderIdentifierSchema.nullable(),
    categoryName: z.string().min(1).max(512),
    isActive: z.boolean(),
    lastFullSyncAt: nullableIsoDateTimeSchema,
    lastIncrementalSyncAt: nullableIsoDateTimeSchema,
  })
  .strict();

export const zohoOverviewSchema = z
  .object({
    activeScopes: z.number().int().nonnegative(),
    totalItems: z.number().int().nonnegative(),
    inScopeItems: z.number().int().nonnegative(),
    mappedItems: z.number().int().nonnegative(),
    serials: z.number().int().nonnegative(),
    activeWebhookEndpoints: z.number().int().nonnegative(),
    webhookReceipts24h: z.number().int().nonnegative(),
    failedWebhookReceipts24h: z.number().int().nonnegative(),
    lastSuccessfulSyncAt: nullableIsoDateTimeSchema,
  })
  .strict();

export const zohoConnectionOverviewSchema = z
  .object({
    connection: zohoExternalConnectionSchema,
    overview: zohoOverviewSchema,
    scopes: z.array(zohoScopeSchema).max(100).readonly(),
    itemReadScopeGranted: z.boolean(),
  })
  .strict();

export const zohoItemSchema = z
  .object({
    itemMappingId: uuidSchema,
    scopeId: uuidSchema,
    zohoItemId: safeProviderIdentifierSchema,
    componentId: uuidSchema.nullable(),
    sku: z.string().max(256).nullable(),
    name: z.string().min(1).max(1024),
    description: z.string().max(10000).nullable(),
    itemStatus: z.string().max(128).nullable(),
    itemType: z.string().max(128).nullable(),
    productType: z.string().max(128).nullable(),
    entityKind: z.enum(["ITEM", "COMPOSITE"]).default("ITEM"),
    comboType: z.enum(["assembly", "kit"]).nullable().default(null),
    scopeRole: z.enum(["ROOT", "DEPENDENCY"]).default("ROOT"),
    unit: z.string().max(128).nullable(),
    categoryName: z.string().max(512).nullable(),
    salesRate: z.string().nullable(),
    purchaseRate: z.string().nullable(),
    reorderLevel: z.string().nullable(),
    availableStock: z.string().nullable(),
    actualAvailableStock: z.string().nullable(),
    serialTrackingEnabled: z.boolean(),
    batchTrackingEnabled: z.boolean(),
    imageName: z.string().max(1024).nullable(),
    imageContentType: z.string().max(128).nullable(),
    hasImage: z.boolean(),
    providerLastModifiedAt: nullableIsoDateTimeSchema,
    membershipState: z.enum(["IN_SCOPE", "OUT_OF_SCOPE", "DELETED"]),
    mappingStatus: z.enum([
      "MAPPED",
      "UNMAPPED",
      "CONFLICT",
      "INVALID_CONFIGURATION",
    ]),
    lastSyncedAt: isoDateTimeSchema,
    rowVersion: z.number().int().nonnegative(),
  })
  .strict();

export const zohoItemsResultSchema = z
  .object({
    items: z.array(zohoItemSchema).max(100).readonly(),
    total: z.number().int().nonnegative(),
    nextCursor: z.string().min(8).max(1024).nullable(),
  })
  .strict();

export const zohoSerialSchema = z
  .object({
    zohoSerialId: uuidSchema,
    zohoSerialNumberId: safeProviderIdentifierSchema,
    serialNumber: z.string().min(1).max(512),
    providerStatus: z.string().max(128).nullable(),
    isTransactedOut: z.boolean(),
    warehouseId: safeProviderIdentifierSchema.nullable(),
    locationId: safeProviderIdentifierSchema.nullable(),
    membershipState: z.enum(["PRESENT", "MISSING", "DELETED"]),
    lastVerifiedAt: nullableIsoDateTimeSchema,
  })
  .strict();

export const zohoScopeMembershipSchema = z
  .object({
    scopeId: uuidSchema,
    sourceCode: z.string().min(1).max(128),
    categoryId: safeProviderIdentifierSchema.nullable(),
    categoryName: z.string().min(1).max(512),
    inclusionKind: z.enum(["ROOT", "DEPENDENCY"]),
    membershipState: z.enum(["IN_SCOPE", "OUT_OF_SCOPE", "DELETED"]),
  })
  .strict();

export const zohoCompositionEdgeSchema = z
  .object({
    lineItemId: safeProviderIdentifierSchema,
    parentItemId: safeProviderIdentifierSchema,
    childItemId: safeProviderIdentifierSchema,
    quantity: z.string().trim().min(1).max(128),
    itemOrder: z.number().int().nonnegative(),
  })
  .strict();

export const zohoCompositionGraphSchema = z
  .object({
    rootItemId: safeProviderIdentifierSchema,
    nodes: z.array(zohoItemSchema).max(1_000).readonly(),
    edges: z.array(zohoCompositionEdgeSchema).max(1_000).readonly(),
    truncated: z.boolean(),
  })
  .strict();

export const zohoItemDetailSchema = z
  .object({
    item: zohoItemSchema,
    serials: z.array(zohoSerialSchema).max(10000).readonly(),
    imageDownload: z
      .object({ url: z.url(), expiresAt: isoDateTimeSchema })
      .strict()
      .nullable(),
    scopeMemberships: z
      .array(zohoScopeMembershipSchema)
      .max(100)
      .readonly()
      .default([]),
    composition: zohoCompositionGraphSchema.nullable().default(null),
  })
  .strict();

export const zohoWebhookEndpointSchema = z
  .object({
    webhookEndpointId: uuidSchema,
    connectionId: uuidSchema,
    endpointKey: z.string().min(32).max(160),
    status: z.enum(["ACTIVE", "ROTATING", "DISABLED"]),
    allowedResourceTypes: z.array(z.string().max(128)).max(32).readonly(),
    lastReceivedAt: nullableIsoDateTimeSchema,
    previousSecretValidUntil: nullableIsoDateTimeSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();
export const zohoWebhookEndpointsSchema = z
  .array(zohoWebhookEndpointSchema)
  .max(100)
  .readonly();
export const zohoWebhookReceiptSchema = z
  .object({
    receiptId: uuidSchema,
    status: z.enum([
      "RECEIVED",
      "QUEUED",
      "PROCESSING",
      "PROCESSED",
      "FAILED",
      "IGNORED",
    ]),
    resourceId: safeProviderIdentifierSchema.nullable(),
    resourceType: z.enum(["item", "composite_item", "unknown"]).default("item"),
    eventName: z.string().max(256).nullable(),
    receivedAt: isoDateTimeSchema,
    lastErrorCode: z.string().max(256).nullable(),
    syncJobId: uuidSchema.nullable(),
  })
  .strict();
export const zohoWebhookReceiptsSchema = z
  .array(zohoWebhookReceiptSchema)
  .max(100)
  .readonly();
export const zohoWebhookSecretResultSchema = z
  .object({
    endpoint: zohoWebhookEndpointSchema,
    secret: z.string().min(32).max(256),
    secretHeader: z.string().min(1).max(128),
  })
  .strict();

export const runZohoCatalogueSyncActionInputSchema = z
  .object({ connectionId: uuidSchema, scopeId: uuidSchema })
  .strict();
export const runZohoCatalogueSyncBatchActionInputSchema = z
  .object({ connectionId: uuidSchema })
  .strict();
export const zohoSyncBatchResultSchema = z
  .object({ jobs: z.array(zohoSyncJobSchema).max(100).readonly() })
  .strict();
export const zohoWebhookActionInputSchema = z
  .object({ connectionId: uuidSchema })
  .strict();
export const zohoWebhookEndpointActionInputSchema = z
  .object({ connectionId: uuidSchema, endpointId: uuidSchema })
  .strict();

export const zohoOAuthCallbackQuerySchema = z
  .object({
    code: zohoOAuthCodeSchema,
    state: zohoOAuthStateSchema,
    location: zohoOAuthLocationSchema.optional(),
    accountsServer: zohoOAuthAccountsServerSchema.optional(),
  })
  .strict()
  .refine(hasCompleteProviderMetadata, {
    message:
      "Zoho OAuth callback location and Accounts server must be supplied together.",
    path: ["accountsServer"],
  });

export const zohoOAuthDeniedQuerySchema = z
  .object({
    error: z
      .string()
      .trim()
      .min(1)
      .max(256)
      .regex(/^[A-Za-z0-9._-]+$/u),
    state: zohoOAuthStateSchema.optional(),
    location: zohoOAuthLocationSchema.optional(),
    accountsServer: zohoOAuthAccountsServerSchema.optional(),
    errorDescription: z.string().trim().min(1).max(2_048).optional(),
    errorUri: z.string().trim().min(1).max(2_048).pipe(z.url()).optional(),
  })
  .strict()
  .refine(hasCompleteProviderMetadata, {
    message:
      "Zoho OAuth callback location and Accounts server must be supplied together.",
    path: ["accountsServer"],
  });

export const zohoOAuthAttemptContextSchema = z
  .object({
    authorizationId: uuidSchema,
    tenantId: uuidSchema,
    actorContextTenantId: uuidSchema.nullable(),
    dataCenter: zohoInventoryDataCenterSchema,
    stateHash: z
      .string()
      .trim()
      .regex(/^[a-f0-9]{64}$/u),
    expiresAt: isoDateTimeSchema,
  })
  .strict();

export const zohoPendingGrantOrganizationSchema =
  zohoAuthorizationOrganizationSchema.pick({
    organizationId: true,
    name: true,
    isDefault: true,
  });

export const zohoPendingGrantSchema = z
  .object({
    authorizationId: uuidSchema,
    tenantId: uuidSchema,
    expiresAt: isoDateTimeSchema,
    organizations: z
      .array(zohoPendingGrantOrganizationSchema)
      .min(1)
      .max(1_000)
      .readonly(),
  })
  .strict();

export const ZOHO_INTEGRATION_OAUTH_STATUSES = [
  "authorized",
  "denied",
  "invalid-callback",
  "context-lost",
  "session-expired",
  "exchange-failed",
  "selection-unavailable",
] as const;

export const zohoIntegrationSearchParamsSchema = z
  .object({
    oauth: z.enum(ZOHO_INTEGRATION_OAUTH_STATUSES).optional(),
    connection: uuidSchema.optional(),
    item: safeProviderIdentifierSchema.optional(),
    search: z.string().trim().min(1).max(128).optional(),
    membership: z.enum(["IN_SCOPE", "OUT_OF_SCOPE", "DELETED"]).optional(),
    mapping: z
      .enum(["MAPPED", "UNMAPPED", "CONFLICT", "INVALID_CONFIGURATION"])
      .optional(),
    itemStatus: z.string().trim().min(1).max(64).optional(),
    entity: z.enum(["ITEM", "COMPOSITE"]).optional(),
    category: safeProviderIdentifierSchema.optional(),
    cursor: z
      .string()
      .trim()
      .min(8)
      .max(1024)
      .regex(/^[A-Za-z0-9_-]+$/u)
      .optional(),
  })
  .strict();

export const creditNoteOperationsSnapshotSchema = z
  .object({
    configured: z.boolean(),
    locationId: z.string().nullable(),
    locationName: z.string().nullable(),
    lastSuccessfulSyncAt: isoDateTimeSchema.nullable(),
    coveredThrough: z.iso.date().nullable(),
    invoiceCount: z.number().int().nonnegative(),
    eligibleInvoiceCount: z.number().int().nonnegative(),
    excludedInvoiceCount: z.number().int().nonnegative(),
    openIssueCount: z.number().int().nonnegative(),
    activeDealerCount: z.number().int().nonnegative(),
    mappedDealerCount: z.number().int().nonnegative(),
  })
  .strict();

export const creditNoteInvoiceBackfillActionInputSchema = z
  .object({ fromDate: z.iso.date(), toDate: z.iso.date() })
  .strict();

export const creditNoteInvoiceBackfillResultSchema = z
  .object({
    taskId: z.string().trim().min(8).max(256),
    fromDate: z.iso.date(),
    toDate: z.iso.date(),
  })
  .strict();

export type CreditNoteInvoiceBackfillResult = z.infer<
  typeof creditNoteInvoiceBackfillResultSchema
>;

export type ZohoExternalConnection = z.infer<
  typeof zohoExternalConnectionSchema
>;
export type ZohoAuthorizationStartResult = z.infer<
  typeof zohoAuthorizationStartResultSchema
>;
export type ZohoAuthorizationOrganization = z.infer<
  typeof zohoAuthorizationOrganizationSchema
>;
export type ZohoAuthorizationExchangeResult = z.infer<
  typeof zohoAuthorizationExchangeResultSchema
>;
export type ZohoVerifyResult = z.infer<typeof zohoVerifyResultSchema>;
export type ZohoSyncJob = z.infer<typeof zohoSyncJobSchema>;
export type ZohoConnectionOverview = z.infer<
  typeof zohoConnectionOverviewSchema
>;
export type ZohoItem = z.infer<typeof zohoItemSchema>;
export type ZohoItemsResult = z.infer<typeof zohoItemsResultSchema>;
export type ZohoItemDetail = z.infer<typeof zohoItemDetailSchema>;
export type ZohoCompositionGraph = z.infer<typeof zohoCompositionGraphSchema>;
export type ZohoSyncBatchResult = z.infer<typeof zohoSyncBatchResultSchema>;
export type ZohoWebhookEndpoint = z.infer<typeof zohoWebhookEndpointSchema>;
export type ZohoWebhookReceipt = z.infer<typeof zohoWebhookReceiptSchema>;
export type ZohoWebhookSecretResult = z.infer<
  typeof zohoWebhookSecretResultSchema
>;
export type ZohoOAuthCallbackQuery = z.infer<
  typeof zohoOAuthCallbackQuerySchema
>;
export type ZohoOAuthDeniedQuery = z.infer<typeof zohoOAuthDeniedQuerySchema>;
export type ZohoOAuthAttemptContext = z.infer<
  typeof zohoOAuthAttemptContextSchema
>;
export type ZohoPendingGrant = z.infer<typeof zohoPendingGrantSchema>;
export type ZohoIntegrationSearchParams = z.infer<
  typeof zohoIntegrationSearchParamsSchema
>;
export type CreditNoteOperationsSnapshot = z.infer<
  typeof creditNoteOperationsSnapshotSchema
>;
export type BeginZohoAuthorizationActionInput = z.input<
  typeof beginZohoAuthorizationActionInputSchema
>;
export type CreateZohoConnectionActionInput = z.input<
  typeof createZohoConnectionActionInputSchema
>;

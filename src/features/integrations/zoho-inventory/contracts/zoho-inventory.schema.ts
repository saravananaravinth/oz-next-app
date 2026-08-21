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
  })
  .strict();

export const zohoSyncJobsSchema = z
  .array(zohoSyncJobSchema)
  .max(100)
  .readonly();

export const beginZohoAuthorizationActionInputSchema = z
  .object({
    dataCenter: zohoInventoryDataCenterSchema.default("IN"),
    forceConsent: z.boolean().default(false),
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

export const zohoOAuthCallbackQuerySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(8)
      .max(8_192)
      .regex(/^[A-Za-z0-9._-]+$/u),
    state: z
      .string()
      .trim()
      .min(32)
      .max(512)
      .regex(/^[A-Za-z0-9_-]+$/u),
  })
  .strict();

export const zohoOAuthDeniedQuerySchema = z
  .object({
    error: z
      .string()
      .trim()
      .min(1)
      .max(256)
      .regex(/^[A-Za-z0-9._-]+$/u),
    state: z
      .string()
      .trim()
      .min(32)
      .max(512)
      .regex(/^[A-Za-z0-9_-]+$/u)
      .optional(),
  })
  .strict();

export const zohoOAuthAttemptContextSchema = z
  .object({
    authorizationId: uuidSchema,
    tenantId: uuidSchema,
    actorContextTenantId: uuidSchema.nullable(),
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
  })
  .strict();

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
export type ZohoOAuthAttemptContext = z.infer<
  typeof zohoOAuthAttemptContextSchema
>;
export type ZohoPendingGrant = z.infer<typeof zohoPendingGrantSchema>;
export type ZohoIntegrationSearchParams = z.infer<
  typeof zohoIntegrationSearchParamsSchema
>;
export type BeginZohoAuthorizationActionInput = z.input<
  typeof beginZohoAuthorizationActionInputSchema
>;
export type CreateZohoConnectionActionInput = z.input<
  typeof createZohoConnectionActionInputSchema
>;

// oz-next-app/src/features/payments/contracts/payments.schema.ts
import { z } from "zod";

export const paymentProviderCodeSchema = z.literal("RAZORPAY");
export const paymentEnvironmentSchema = z.enum(["TEST", "LIVE"]);
export const paymentAccountStatusSchema = z.enum([
  "ACTIVE",
  "DISABLED",
  "DEGRADED",
]);
export const paymentChargeStatusSchema = z.enum([
  "CREATED",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
]);
export const paymentRefundStatusSchema = z.enum([
  "PENDING",
  "PROCESSED",
  "FAILED",
]);
export const paymentWebhookStatusSchema = z.enum([
  "RECEIVED",
  "PROCESSING",
  "PROCESSED",
  "RETRYABLE_FAILURE",
  "TERMINAL_FAILURE",
  "IGNORED",
]);

export const paymentProviderAccountSchema = z
  .object({
    providerAccountId: z.uuid(),
    tenantId: z.uuid(),
    providerCode: paymentProviderCodeSchema,
    environment: paymentEnvironmentSchema,
    accountReference: z.string().nullable(),
    clientKeyId: z.string().nullable(),
    webhookEndpointKey: z.uuid(),
    status: paymentAccountStatusSchema,
    isDefault: z.boolean(),
    metadata: z.record(z.string(), z.unknown()),
    rowVersion: z.number().int().positive(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    credentialVersion: z.number().int().positive().nullable(),
    apiSecretFingerprint: z.string().nullable(),
    webhookSecretFingerprint: z.string().nullable(),
  })
  .strict();

export const paymentProviderAccountsSchema = z
  .array(paymentProviderAccountSchema)
  .max(100);

export const paymentProviderHealthSchema = z
  .object({
    providerAccountId: z.uuid(),
    providerCode: paymentProviderCodeSchema,
    environment: paymentEnvironmentSchema,
    status: paymentAccountStatusSchema,
    credentialVersion: z.number().int().positive().nullable(),
    credentialsConfigured: z.boolean(),
    webhookEndpointKey: z.uuid(),
    lastSuccessfulWebhookAt: z.iso.datetime({ offset: true }).nullable(),
    reconciliationBacklog: z.number().int().nonnegative(),
    failedCharges: z.number().int().nonnegative(),
  })
  .strict();

export const paymentOverviewSchema = z
  .object({
    providerAccountId: z.uuid().nullable(),
    windowDays: z.number().int().min(1).max(365),
    capturedAmountMinor: z.string().regex(/^\d+$/u),
    refundedAmountMinor: z.string().regex(/^\d+$/u),
    gatewayFeeMinor: z.string().regex(/^\d+$/u),
    capturedCount: z.number().int().nonnegative(),
    refundedCount: z.number().int().nonnegative(),
    failedCount: z.number().int().nonnegative(),
    reconciliationBacklog: z.number().int().nonnegative(),
    webhookProcessedCount: z.number().int().nonnegative(),
    webhookFailedCount: z.number().int().nonnegative(),
    lastSuccessfulWebhookAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();

export const paymentPageInfoSchema = z
  .object({
    limit: z.number().int().min(1).max(50),
    total: z.number().int().nonnegative(),
    offset: z.number().int().nonnegative(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    nextCursor: z.string().min(1).max(2_048).nullable(),
    previousCursor: z.string().min(1).max(2_048).nullable(),
  })
  .strict();

export const paymentTransactionSummarySchema = z
  .object({
    chargeId: z.uuid(),
    paymentIntentId: z.uuid(),
    checkoutSessionId: z.uuid(),
    providerAccountId: z.uuid(),
    providerCode: paymentProviderCodeSchema,
    environment: paymentEnvironmentSchema,
    providerPaymentId: z.string().min(1).max(256),
    providerOrderId: z.string().min(1).max(256).nullable(),
    businessModule: z.string().min(1).max(128),
    businessReferenceId: z.uuid(),
    status: paymentChargeStatusSchema,
    method: z.string().max(64).nullable(),
    international: z.boolean().nullable(),
    amountMinor: z.string().regex(/^\d+$/u),
    capturedAmountMinor: z.string().regex(/^\d+$/u),
    refundedAmountMinor: z.string().regex(/^\d+$/u),
    gatewayFeeMinor: z.string().regex(/^\d+$/u),
    gatewayTaxMinor: z.string().regex(/^\d+$/u),
    netCapturedMinor: z.string().regex(/^-?\d+$/u),
    currency: z.string().length(3),
    providerCreatedAt: z.iso.datetime({ offset: true }).nullable(),
    authorizedAt: z.iso.datetime({ offset: true }).nullable(),
    capturedAt: z.iso.datetime({ offset: true }).nullable(),
    failedAt: z.iso.datetime({ offset: true }).nullable(),
    lastVerifiedAt: z.iso.datetime({ offset: true }).nullable(),
    failureCode: z.string().nullable(),
    failureReason: z.string().nullable(),
    createdAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const paymentTransactionPageSchema = z
  .object({
    items: z.array(paymentTransactionSummarySchema).max(50),
    page: paymentPageInfoSchema,
  })
  .strict();

export const paymentRefundSchema = z
  .object({
    refundId: z.uuid(),
    chargeId: z.uuid(),
    providerAccountId: z.uuid(),
    providerRefundId: z.string().nullable(),
    amountMinor: z.string().regex(/^\d+$/u),
    currency: z.string().length(3),
    status: paymentRefundStatusSchema,
    createdAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const paymentEventSchema = z
  .object({
    paymentEventId: z.string().regex(/^\d+$/u),
    eventType: z.string().min(1).max(256),
    actorKind: z.string().min(1).max(64),
    reasonCode: z.string().nullable(),
    requestId: z.string().min(1).max(256),
    correlationId: z.string().min(1).max(256),
    metadata: z.record(z.string(), z.unknown()),
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const paymentWebhookReceiptSchema = z
  .object({
    webhookReceiptId: z.uuid(),
    providerAccountId: z.uuid(),
    providerEventId: z.string().nullable(),
    eventType: z.string().min(1).max(160),
    signatureVerified: z.boolean(),
    resourceType: z.string().nullable(),
    resourceId: z.string().nullable(),
    payloadSafe: z.record(z.string(), z.unknown()),
    status: paymentWebhookStatusSchema,
    attemptCount: z.number().int().nonnegative(),
    receivedAt: z.iso.datetime({ offset: true }),
    processingStartedAt: z.iso.datetime({ offset: true }).nullable(),
    processedAt: z.iso.datetime({ offset: true }).nullable(),
    lastErrorCode: z.string().nullable(),
    lastErrorDetail: z.string().nullable(),
  })
  .strict();

export const paymentWebhookReceiptPageSchema = z
  .object({
    items: z.array(paymentWebhookReceiptSchema).max(50),
    page: paymentPageInfoSchema,
  })
  .strict();

export const paymentReconciliationJobSchema = z
  .object({
    reconciliationJobId: z.uuid(),
    paymentIntentId: z.uuid(),
    providerAccountId: z.uuid(),
    status: z.enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]),
    reason: z.string().min(1).max(128),
    attemptCount: z.number().int().nonnegative(),
    nextAttemptAt: z.iso.datetime({ offset: true }),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const paymentTransactionDetailSchema = paymentTransactionSummarySchema
  .extend({
    providerReferenceSafe: z.record(z.string(), z.unknown()),
    refunds: z.array(paymentRefundSchema).max(100),
    events: z.array(paymentEventSchema).max(100),
    webhooks: z.array(paymentWebhookReceiptSchema).max(50),
    reconciliationJobs: z.array(paymentReconciliationJobSchema).max(50),
  })
  .strict();

export const paymentsWorkspaceTabSchema = z.enum([
  "overview",
  "transactions",
  "webhooks",
  "configuration",
]);

export const paymentsWorkspaceQuerySchema = z
  .object({
    tab: paymentsWorkspaceTabSchema.default("overview"),
    account: z.uuid().optional(),
    cursor: z.string().min(1).max(2_048).optional(),
    status: paymentChargeStatusSchema.optional(),
    method: z.string().trim().min(1).max(64).optional(),
    q: z.string().trim().min(1).max(160).optional(),
    fromDate: z.iso.date().optional(),
    toDate: z.iso.date().optional(),
    transaction: z.uuid().optional(),
    webhook: z.uuid().optional(),
    webhookCursor: z.string().min(1).max(2_048).optional(),
    webhookStatus: paymentWebhookStatusSchema.optional(),
    webhookEventType: z.string().trim().min(1).max(160).optional(),
    webhookQ: z.string().trim().min(1).max(160).optional(),
  })
  .strict();

export const configurePaymentAccountActionInputSchema = z
  .object({
    providerCode: paymentProviderCodeSchema,
    environment: paymentEnvironmentSchema,
    accountReference: z.string().trim().min(1).max(256).nullable(),
    clientKeyId: z.string().trim().min(1).max(256),
    apiSecret: z.string().trim().min(1).max(16_384),
    webhookSecret: z.string().trim().min(1).max(16_384),
    isDefault: z.boolean(),
  })
  .strict();

export const rotatePaymentCredentialsActionInputSchema = z
  .object({
    providerAccountId: z.uuid(),
    providerCode: paymentProviderCodeSchema,
    environment: paymentEnvironmentSchema,
    clientKeyId: z.string().trim().min(1).max(256),
    apiSecret: z.string().trim().min(1).max(16_384),
    webhookSecret: z.string().trim().min(1).max(16_384),
    rowVersion: z.number().int().positive(),
  })
  .strict();

export const updatePaymentAccountActionInputSchema = z
  .object({
    providerAccountId: z.uuid(),
    accountReference: z.string().trim().min(1).max(256).nullable().optional(),
    status: paymentAccountStatusSchema.optional(),
    isDefault: z.boolean().optional(),
    rowVersion: z.number().int().positive(),
  })
  .strict();

export const paymentRefundActionInputSchema = z
  .object({
    chargeId: z.uuid(),
    amountMinor: z
      .string()
      .regex(/^[1-9]\d*$/u)
      .max(32),
    reasonCode: z.string().trim().min(1).max(128).nullable(),
    idempotencyKey: z
      .string()
      .min(16)
      .max(128)
      .regex(/^[A-Za-z0-9:_./@-]+$/u),
  })
  .strict();

export const paymentRefundCommandResultSchema = z
  .object({
    refundId: z.uuid(),
    providerRefundId: z.string().nullable(),
    status: paymentRefundStatusSchema,
    amountMinor: z.string().regex(/^\d+$/u),
    currency: z.string().length(3),
  })
  .strict();

export const paymentRefreshActionInputSchema = z
  .object({ chargeId: z.uuid() })
  .strict();

export type PaymentProviderAccount = z.infer<
  typeof paymentProviderAccountSchema
>;
export type PaymentProviderHealth = z.infer<typeof paymentProviderHealthSchema>;
export type PaymentOverview = z.infer<typeof paymentOverviewSchema>;
export type PaymentTransactionSummary = z.infer<
  typeof paymentTransactionSummarySchema
>;
export type PaymentTransactionPage = z.infer<
  typeof paymentTransactionPageSchema
>;
export type PaymentTransactionDetail = z.infer<
  typeof paymentTransactionDetailSchema
>;
export type PaymentWebhookReceipt = z.infer<typeof paymentWebhookReceiptSchema>;
export type PaymentWebhookReceiptPage = z.infer<
  typeof paymentWebhookReceiptPageSchema
>;
export type PaymentsWorkspaceQuery = z.infer<
  typeof paymentsWorkspaceQuerySchema
>;
export type PaymentsWorkspaceTab = z.infer<typeof paymentsWorkspaceTabSchema>;

// oz-next-app/src/features/extended-warranty/contracts/admin.schema.ts
import { z } from "zod";

const dateTime = z.iso.datetime({ offset: true }).nullable();

export const extendedWarrantyWorkspaceStatusSchema = z.enum([
  "NOT_PURCHASED",
  "LINK_SENT",
  "ORDERED",
  "PENDING",
  "INSTALLED",
  "REJECTED",
  "PAYMENT_PENDING",
  "PAYMENT_RECONCILING",
  "PROCESSING",
  "INVOICED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "INSTALLATION_PENDING",
  "REVIEW_PENDING",
  "APPROVED",
  "ACTIVATION_PENDING",
  "CERTIFICATE_PENDING",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
  "FAILED",
]);

export const extendedWarrantyWorkspaceQuerySchema = z
  .object({
    q: z.string().trim().max(100).default(""),
    status: z
      .enum([
        "ALL",
        "NOT_PURCHASED",
        "LINK_SENT",
        "ORDERED",
        "PENDING",
        "INSTALLED",
        "REJECTED",
        "PAYMENT_PENDING",
        "PAYMENT_RECONCILING",
        "PROCESSING",
        "INVOICED",
        "PACKED",
        "SHIPPED",
        "DELIVERED",
        "INSTALLATION_PENDING",
        "REVIEW_PENDING",
        "APPROVED",
        "ACTIVATION_PENDING",
        "CERTIFICATE_PENDING",
        "CANCELLED",
        "EXPIRED",
        "REFUNDED",
        "FAILED",
      ])
      .default("ALL"),
    reconciliation: z.enum(["ALL", "ATTENTION", "CLEAR"]).default("ALL"),
    limit: z.coerce.number().int().min(10).max(100).default(25),
    cursor: z.string().trim().min(1).max(512).optional(),
    unitId: z.uuid().optional(),
  })
  .strict();

export const extendedWarrantyWorkspaceOverviewSchema = z
  .object({
    availableStock: z.number().nonnegative().nullable(),
    stockReason: z.string().nullable(),
    orders: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    installed: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
  })
  .strict();

export const extendedWarrantyWorkspaceItemSchema = z
  .object({
    unitId: z.uuid(),
    baseVehicleEntitlementId: z.uuid().nullable(),
    invoiceId: z.uuid().nullable(),
    invoiceNumber: z.string().nullable(),
    invoiceAt: dateTime,
    invoiceLineId: z.uuid().nullable(),
    saleDate: z.iso.date().nullable(),
    vin: z.string().nullable(),
    modelName: z.string().nullable(),
    colorName: z.string().nullable(),
    variantName: z.string().nullable(),
    batteryType: z.string().nullable(),
    batteryPowerKw: z.string().nullable(),
    sellerName: z.string().nullable(),
    sellerDistrict: z.string().nullable(),
    sellerState: z.string().nullable(),
    buyerName: z.string().nullable(),
    buyerDistrict: z.string().nullable(),
    buyerState: z.string().nullable(),
    maskedMobile: z.string().nullable(),
    preferredMsgChannel: z.string().nullable(),
    status: extendedWarrantyWorkspaceStatusSchema,
    orderId: z.uuid().nullable(),
    latestOrderNumber: z.string().nullable(),
    offerId: z.uuid().nullable(),
    latestEventAt: dateTime,
    latestEventType: z.string().nullable(),
    isReconciliationAttention: z.boolean(),
    canSendPurchaseLink: z.boolean(),
    purchaseLinkAction: z.enum(["PREPARE", "SEND", "NONE"]),
    purchaseLinkActionEnabled: z.boolean(),
    purchaseLinkActionReason: z.string().nullable(),
    eligibilityBlockers: z.array(z.string()),
    reconciliationReasons: z.array(z.string()),
    certificateFileId: z.uuid().nullable(),
  })
  .strict();

export const extendedWarrantyWorkspaceSchema = z
  .object({
    overview: extendedWarrantyWorkspaceOverviewSchema,
    items: z.array(extendedWarrantyWorkspaceItemSchema).max(100),
    pageInfo: z
      .object({
        nextCursor: z.string().nullable(),
        totalCount: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const extendedWarrantyWorkspaceDetailEventSchema = z
  .object({
    id: z.string().regex(/^[1-9]\d*$/u),
    occurredAt: z.iso.datetime({ offset: true }),
    eventType: z.string(),
    actorKind: z.string(),
    reasonCode: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()),
  })
  .strict();

export const extendedWarrantyWorkspaceDetailSchema = z
  .object({
    unitId: z.uuid(),
    baseVehicleEntitlementId: z.uuid().nullable(),
    invoiceNumber: z.string().nullable(),
    invoiceAt: dateTime,
    invoiceLineId: z.uuid().nullable(),
    saleDate: z.iso.date().nullable(),
    vin: z.string().nullable(),
    modelName: z.string().nullable(),
    colorName: z.string().nullable(),
    variantName: z.string().nullable(),
    batteryType: z.string().nullable(),
    batteryPowerKw: z.string().nullable(),
    sellerName: z.string().nullable(),
    sellerDistrict: z.string().nullable(),
    sellerState: z.string().nullable(),
    buyerName: z.string().nullable(),
    buyerDistrict: z.string().nullable(),
    buyerState: z.string().nullable(),
    maskedMobile: z.string().nullable(),
    preferredMsgChannel: z.string().nullable(),
    status: extendedWarrantyWorkspaceStatusSchema,
    orderId: z.uuid().nullable(),
    orderNumber: z.string().nullable(),
    orderStatus: z.string().nullable(),
    paymentConfirmedAt: dateTime,
    paidAt: dateTime,
    totalAmountMinor: z.string().nullable(),
    currency: z.string().nullable(),
    fulfillmentStatus: z.string().nullable(),
    trackingNumber: z.string().nullable(),
    carrierName: z.string().nullable(),
    trackingUrl: z.string().nullable(),
    deliveredAt: dateTime,
    installationSubmittedAt: dateTime,
    reviewDecision: z.enum(["APPROVED", "REJECTED"]).nullable(),
    reviewedAt: dateTime,
    certificateNumber: z.string().nullable(),
    certificateIssuedAt: dateTime,
    certificateFileId: z.uuid().nullable(),
    canSendPurchaseLink: z.boolean(),
    purchaseLinkAction: z.enum(["PREPARE", "SEND", "NONE"]),
    purchaseLinkActionEnabled: z.boolean(),
    purchaseLinkActionReason: z.string().nullable(),
    eligibilityBlockers: z.array(z.string()),
    reconciliationReasons: z.array(z.string()),
    paymentIntentId: z.uuid().nullable(),
    payments: z.array(
      z
        .object({
          chargeId: z.uuid(),
          status: z.string(),
          amountMinor: z.string(),
          refundedAmountMinor: z.string(),
          currency: z.string(),
          createdAt: z.iso.datetime({ offset: true }),
        })
        .strict(),
    ),
    reconciliationJobs: z.array(
      z
        .object({
          id: z.uuid(),
          status: z.string(),
          reason: z.string(),
          attemptCount: z.number().int(),
          nextAttemptAt: z.iso.datetime({ offset: true }),
        })
        .strict(),
    ),
    attempts: z.array(
      z
        .object({
          orderId: z.uuid(),
          orderNumber: z.string(),
          status: z.string(),
          createdAt: z.iso.datetime({ offset: true }),
          paymentConfirmedAt: dateTime,
          totalAmountMinor: z.string(),
          currency: z.string(),
        })
        .strict(),
    ),
    events: z.array(extendedWarrantyWorkspaceDetailEventSchema).max(100),
  })
  .strict();

export const extendedWarrantyStockSyncResultSchema = z
  .object({
    synchronizedKitCount: z.number().int().nonnegative(),
    availableStock: z.number().nonnegative().nullable(),
    stockReason: z.string().nullable(),
  })
  .strict();

export const extendedWarrantyPrepareLinkResultSchema = z
  .object({
    outcome: z.enum(["queued", "deduplicated", "skipped"]),
    invoiceLineId: z.uuid(),
    taskId: z.string().min(1).max(256).nullable(),
    detail: z.string().min(1).max(512),
  })
  .strict();
export const extendedWarrantySendPurchaseLinkResultSchema = z
  .object({
    outcome: z.enum(["created", "skipped", "already_exists"]),
    offerId: z.uuid().nullable(),
    messageId: z.uuid().nullable(),
    detail: z.string(),
  })
  .strict();

export const paymentProviderAccountSchema = z
  .object({
    providerAccountId: z.uuid(),
    tenantId: z.uuid(),
    providerCode: z.literal("RAZORPAY"),
    environment: z.enum(["TEST", "LIVE"]),
    accountReference: z.string().nullable(),
    clientKeyId: z.string().nullable(),
    webhookEndpointKey: z.uuid(),
    status: z.enum(["ACTIVE", "DISABLED", "DEGRADED"]),
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

export type ExtendedWarrantyWorkspaceQuery = z.infer<
  typeof extendedWarrantyWorkspaceQuerySchema
>;
export type ExtendedWarrantyWorkspace = z.infer<
  typeof extendedWarrantyWorkspaceSchema
>;
export type ExtendedWarrantyWorkspaceItem = z.infer<
  typeof extendedWarrantyWorkspaceItemSchema
>;
export type ExtendedWarrantyWorkspaceOverview = z.infer<
  typeof extendedWarrantyWorkspaceOverviewSchema
>;
export type ExtendedWarrantyWorkspaceDetail = z.infer<
  typeof extendedWarrantyWorkspaceDetailSchema
>;
export type ExtendedWarrantyStockSyncResult = z.infer<
  typeof extendedWarrantyStockSyncResultSchema
>;
export type ExtendedWarrantyPrepareLinkResult = z.infer<
  typeof extendedWarrantyPrepareLinkResultSchema
>;
export type ExtendedWarrantySendPurchaseLinkResult = z.infer<
  typeof extendedWarrantySendPurchaseLinkResultSchema
>;
export type PaymentProviderAccount = z.infer<
  typeof paymentProviderAccountSchema
>;

import { z } from "zod";

export const DEALER_OPERATION_ORG_UNIT_TYPES = [
  "DEALER",
  "SUB_DEALER",
] as const;
export const DEALER_DOCUMENT_KINDS = [
  "BUSINESS_REGISTRATION",
  "GST_CERTIFICATE",
  "PAN_CARD",
  "IDENTITY_PROOF",
  "ADDRESS_PROOF",
  "BANK_PROOF",
  "DEALERSHIP_AGREEMENT",
  "SHOWROOM_PHOTO",
  "SERVICE_FACILITY_PHOTO",
  "OTHER",
] as const;
export const DEALER_DOCUMENT_STATUSES = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
] as const;
export const DEALER_UPLOAD_PURPOSES = [
  "APPLICATION_DOCUMENT",
  "DEALER_DOCUMENT",
  "AUDIO_NOTE",
] as const;
export const DEALER_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
] as const;

const uuidSchema = z.uuid();
const nullableText = z.string().nullable();
const dateTime = z.iso.datetime({ offset: true });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
const safeText = z.string().trim().min(1).max(500);

const httpsUrl = z
  .url()
  .refine(
    (value) => new URL(value).protocol === "https:",
    "A secure HTTPS URL is required.",
  );

const idempotencyKey = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9:_./@-]+$/u);

export const dealerLocationSummarySchema = z
  .object({ city: nullableText, district: nullableText, state: nullableText })
  .strict();

export const dealerOperationListItemSchema = z
  .object({
    dealerOrgUnitId: uuidSchema,
    parentOrgUnitId: uuidSchema.nullable(),
    parentName: nullableText,
    orgUnitType: z.enum(DEALER_OPERATION_ORG_UNIT_TYPES),
    code: z.string().min(1).max(80),
    name: z.string().min(1).max(160),
    isActive: z.boolean(),
    location: dealerLocationSummarySchema,
    administratorCount: z.number().int().nonnegative(),
    activeMarginCount: z.number().int().nonnegative(),
    documentCount: z.number().int().nonnegative(),
    updatedAt: dateTime,
  })
  .strict();

export const dealerOperationPageSchema = z
  .object({
    items: z.array(dealerOperationListItemSchema).max(100),
    pagination: z
      .object({
        limit: z.number().int().min(1).max(100),
        hasMore: z.boolean(),
        nextCursor: z.string().max(2048).nullable(),
      })
      .strict(),
  })
  .strict();

export const dealerOperationUserSchema = z
  .object({
    userId: uuidSchema,
    displayName: nullableText,
    status: z.string().min(1).max(80),
    email: z.email().nullable(),
    phoneMasked: nullableText,
    title: nullableText,
    roleNames: z.array(z.string().min(1).max(100)).max(50),
    updatedAt: dateTime,
  })
  .strict();

export const dealerMarginSchema = z
  .object({
    marginId: uuidSchema,
    modelId: uuidSchema.nullable(),
    modelName: nullableText,
    variantId: uuidSchema.nullable(),
    variantName: nullableText,
    valueType: z.string().min(1).max(40),
    value: z.number().nonnegative(),
    effectiveFrom: date,
    effectiveTo: date.nullable(),
    updatedAt: dateTime,
  })
  .strict();

export const dealerDocumentSchema = z
  .object({
    dealerDocumentId: uuidSchema,
    fileId: uuidSchema,
    fileName: z.string().min(1).max(255),
    mimeType: nullableText,
    sizeBytes: z.number().int().nonnegative().nullable(),
    kind: z.enum(DEALER_DOCUMENT_KINDS),
    status: z.enum(DEALER_DOCUMENT_STATUSES),
    expiresAt: date.nullable(),
    note: nullableText,
    reviewNote: nullableText,
    createdAt: dateTime,
    updatedAt: dateTime,
    rowVersion: z.number().int().positive(),
  })
  .strict();

export const dealerOperationDetailSchema = z
  .object({
    dealerOrgUnitId: uuidSchema,
    parentOrgUnitId: uuidSchema.nullable(),
    parentName: nullableText,
    orgUnitType: z.enum(DEALER_OPERATION_ORG_UNIT_TYPES),
    code: z.string().min(1).max(80),
    name: z.string().min(1).max(160),
    isActive: z.boolean(),
    locationId: uuidSchema.nullable(),
    location: z
      .object({
        addressLine1: nullableText,
        addressLine2: nullableText,
        city: nullableText,
        district: nullableText,
        state: nullableText,
        postalCode: nullableText,
        latitude: z.number().min(-90).max(90).nullable(),
        longitude: z.number().min(-180).max(180).nullable(),
      })
      .strict(),
    users: z.array(dealerOperationUserSchema).max(200),
    margins: z.array(dealerMarginSchema).max(1000),
    documents: z.array(dealerDocumentSchema).max(500),
    createdAt: dateTime,
    updatedAt: dateTime,
  })
  .strict();

export const directOnboardingPreflightResultSchema = z.discriminatedUnion(
  "outcome",
  [
    z
      .object({
        outcome: z.literal("APPLICATION_FOUND"),
        applicationId: uuidSchema,
        applicationNumber: nullableText,
      })
      .strict(),
    z
      .object({
        outcome: z.literal("DEALER_FOUND"),
        dealerOrgUnitId: uuidSchema,
        dealerCode: z.string().min(1).max(80),
        dealerName: z.string().min(1).max(160),
      })
      .strict(),
    z
      .object({
        outcome: z.literal("ELIGIBLE"),
        preflightToken: z.string().min(40).max(256),
        expiresAt: dateTime,
      })
      .strict(),
  ],
);

export const directOnboardingResultSchema = z
  .object({
    applicationId: uuidSchema,
    applicationNumber: z.string().min(1).max(80),
    dealerOrgUnitId: uuidSchema,
    dealerCode: z.string().min(1).max(80),
    dealerUserId: uuidSchema,
    activeMarginCount: z.number().int().positive(),
  })
  .strict();

export const dealerUploadIntentResultSchema = z
  .object({
    uploadId: uuidSchema,
    fileId: uuidSchema,
    uploadUrl: httpsUrl,
    method: z.literal("PUT"),
    requiredHeaders: z.record(z.string(), z.string()),
    expiresAt: dateTime,
  })
  .strict();

export const dealerFileStatusSchema = z
  .object({
    fileId: uuidSchema,
    fileName: z.string().min(1).max(255),
    mimeType: nullableText,
    sizeBytes: z.number().int().nonnegative().nullable(),
    storageStatus: z.string().min(1).max(80),
    scanStatus: z
      .enum(["PENDING", "SCANNING", "CLEAN", "INFECTED", "REJECTED", "ERROR"])
      .nullable(),
    failureCode: nullableText,
  })
  .strict();

export const dealerDocumentDownloadSchema = z
  .object({
    url: httpsUrl,
    expiresAt: dateTime,
    fileName: z.string().min(1).max(255),
  })
  .strict();

export const dealerMarginMutationResultSchema = z
  .object({
    activeMarginCount: z.number().int().positive(),
    effectiveFrom: date,
  })
  .strict();

export const dealerCancelledUploadSchema = z
  .object({ cancelled: z.literal(true) })
  .strict();

export const dealerOperationsSearchParamsSchema = z
  .object({
    q: z.string().trim().max(100).default(""),
    orgUnitType: z.enum(DEALER_OPERATION_ORG_UNIT_TYPES).optional(),
    active: z.enum(["true", "false"]).optional(),
    cursor: z.string().trim().max(2048).optional(),
    limit: z.coerce.number().int().min(10).max(100).default(40),
  })
  .strict();

export type DealerOperationsRawSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

export function parseDealerOperationsSearchParams(
  raw: DealerOperationsRawSearchParams,
) {
  const singleton = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
  return dealerOperationsSearchParamsSchema.safeParse(singleton);
}

export const dealerUserCreateActionInputSchema = z
  .object({
    dealerOrgUnitId: uuidSchema,
    displayName: safeText.max(120),
    email: z.email().max(254),
    phoneE164: z.string().regex(/^\+91[6-9][0-9]{9}$/u),
    roleName: z.literal("dealer_admin"),
    title: z.string().trim().max(120).nullable(),
    idempotencyKey,
  })
  .strict();

export const dealerUserUpdateActionInputSchema = z
  .object({
    dealerOrgUnitId: uuidSchema,
    dealerUserId: uuidSchema,
    expectedUpdatedAt: dateTime,
    displayName: safeText.max(120),
    roleName: z.literal("dealer_admin"),
    title: z.string().trim().max(120).nullable(),
    status: z.enum(["ACTIVE", "DISABLED"]),
    reason: safeText,
    idempotencyKey,
  })
  .strict();

export const dealerProfileActionInputSchema = z
  .object({
    dealerOrgUnitId: uuidSchema,
    expectedUpdatedAt: dateTime,
    name: safeText.max(120),
    isActive: z.boolean(),
    addressLine1: safeText.max(240),
    addressLine2: z.string().trim().max(240).nullable(),
    city: safeText.max(100),
    district: safeText.max(100),
    state: safeText.max(100),
    postalCode: z.string().regex(/^[1-9][0-9]{5}$/u),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    reason: safeText,
  })
  .strict();

export const dealerMarginActionInputSchema = z
  .object({
    dealerOrgUnitId: uuidSchema,
    effectiveFrom: date,
    reason: safeText,
    margins: z
      .array(
        z
          .object({
            modelId: uuidSchema.nullable(),
            variantId: uuidSchema.nullable(),
            valueType: z.enum(["FIXED", "PERCENTAGE"]),
            value: z.number().nonnegative().max(10_000_000),
          })
          .strict()
          .superRefine((margin, context) => {
            if (margin.variantId !== null && margin.modelId === null) {
              context.addIssue({
                code: "custom",
                path: ["modelId"],
                message: "modelId is required when variantId is provided.",
              });
            }

            if (margin.valueType === "PERCENTAGE" && margin.value > 100) {
              context.addIssue({
                code: "custom",
                path: ["value"],
                message: "Percentage margins cannot exceed 100.",
              });
            }
          }),
      )
      .min(1)
      .max(500),
    idempotencyKey,
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>();

    value.margins.forEach((margin, index) => {
      const key = `${margin.modelId ?? "*"}:${margin.variantId ?? "*"}`;

      if (seen.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["margins", index],
          message: "Duplicate model and variant scope.",
        });
      }

      seen.add(key);
    });
  });

export const dealerDocumentBindActionInputSchema = z
  .object({
    dealerOrgUnitId: uuidSchema,
    fileId: uuidSchema,
    kind: z.enum(DEALER_DOCUMENT_KINDS),
    expiresAt: date.nullable().optional(),
    note: z.string().trim().max(500).nullable().optional(),
    idempotencyKey,
  })
  .strict();

export const dealerDocumentReviewActionInputSchema = z
  .object({
    dealerOrgUnitId: uuidSchema,
    dealerDocumentId: uuidSchema,
    status: z.enum(["APPROVED", "REJECTED"]),
    expectedRowVersion: z.number().int().positive(),
    reviewNote: safeText,
  })
  .strict();

export const directOnboardingPreflightActionInputSchema = z
  .object({
    dealerName: safeText.max(120),
    mobileE164: z.string().regex(/^\+91[6-9][0-9]{9}$/u),
    email: z.email().max(254),
    district: safeText.max(100),
    state: safeText.max(100),
  })
  .strict();

export const directOnboardingActionInputSchema = z
  .object({
    preflightToken: z.string().min(40).max(256),
    parentOrgUnitId: uuidSchema,
    orgUnitType: z.enum(DEALER_OPERATION_ORG_UNIT_TYPES),
    dealerName: safeText.max(120),
    loginDisplayName: safeText.max(120),
    loginEmail: z.email().max(254),
    loginPhoneE164: z.string().regex(/^\+91[6-9][0-9]{9}$/u),
    roleName: z.literal("dealer_admin"),
    marginSourceOrgUnitId: uuidSchema.nullable(),
    addressLine1: safeText.max(240),
    addressLine2: z.string().trim().max(240).nullable(),
    city: safeText.max(100),
    district: safeText.max(100),
    state: safeText.max(100),
    postalCode: z.string().regex(/^[1-9][0-9]{5}$/u),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    idempotencyKey,
  })
  .strict();

export const dealerUploadIntentActionInputSchema = z
  .object({
    resourceKind: z.enum(["APPLICATION", "DEALER"]),
    resourceId: uuidSchema,
    purpose: z.enum(DEALER_UPLOAD_PURPOSES),
    fileName: z.string().trim().min(1).max(160),
    mimeType: z.enum(DEALER_UPLOAD_MIME_TYPES),
    sizeBytes: z
      .number()
      .int()
      .min(1)
      .max(25 * 1024 * 1024),
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  })
  .strict()
  .superRefine((value, context) => {
    const isAudio = value.mimeType.startsWith("audio/");

    if ((value.purpose === "AUDIO_NOTE") !== isAudio) {
      context.addIssue({
        code: "custom",
        path: ["mimeType"],
        message: "Audio-note uploads require an approved audio MIME type.",
      });
    }

    if (
      value.purpose === "DEALER_DOCUMENT" &&
      value.resourceKind !== "DEALER"
    ) {
      context.addIssue({
        code: "custom",
        path: ["resourceKind"],
        message: "Dealer documents require a DEALER resource.",
      });
    }

    if (
      (value.purpose === "APPLICATION_DOCUMENT" ||
        value.purpose === "AUDIO_NOTE") &&
      value.resourceKind !== "APPLICATION"
    ) {
      context.addIssue({
        code: "custom",
        path: ["resourceKind"],
        message:
          "Application documents and audio notes require an APPLICATION resource.",
      });
    }
  });

export const dealerUploadFinalizeActionInputSchema = z
  .object({
    uploadId: uuidSchema,
    checksumSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    sizeBytes: z
      .number()
      .int()
      .min(1)
      .max(25 * 1024 * 1024),
  })
  .strict();

export const dealerUploadCancelActionInputSchema = z
  .object({ uploadId: uuidSchema })
  .strict();
export const dealerFileStatusActionInputSchema = z
  .object({ fileId: uuidSchema })
  .strict();
export const dealerDocumentDownloadActionInputSchema = z
  .object({ dealerOrgUnitId: uuidSchema, dealerDocumentId: uuidSchema })
  .strict();

export type DealerOperationsSearchParams = z.output<
  typeof dealerOperationsSearchParamsSchema
>;
export type DealerOperationPage = z.output<typeof dealerOperationPageSchema>;
export type DealerOperationDetail = z.output<
  typeof dealerOperationDetailSchema
>;
export type DealerDocument = z.output<typeof dealerDocumentSchema>;
export type DealerFileStatus = z.output<typeof dealerFileStatusSchema>;
export type DirectOnboardingPreflightResult = z.output<
  typeof directOnboardingPreflightResultSchema
>;
export type DirectOnboardingResult = z.output<
  typeof directOnboardingResultSchema
>;
export type DealerUploadIntentResult = z.output<
  typeof dealerUploadIntentResultSchema
>;
export type DealerOperationUser = z.output<typeof dealerOperationUserSchema>;
export type DealerUserCreateActionInput = z.input<
  typeof dealerUserCreateActionInputSchema
>;
export type DealerUserUpdateActionInput = z.input<
  typeof dealerUserUpdateActionInputSchema
>;
export type DealerProfileActionInput = z.input<
  typeof dealerProfileActionInputSchema
>;
export type DealerMarginActionInput = z.input<
  typeof dealerMarginActionInputSchema
>;
export type DealerDocumentBindActionInput = z.input<
  typeof dealerDocumentBindActionInputSchema
>;
export type DealerDocumentReviewActionInput = z.input<
  typeof dealerDocumentReviewActionInputSchema
>;
export type DirectOnboardingPreflightActionInput = z.input<
  typeof directOnboardingPreflightActionInputSchema
>;
export type DirectOnboardingActionInput = z.input<
  typeof directOnboardingActionInputSchema
>;
export type DealerUploadIntentActionInput = z.input<
  typeof dealerUploadIntentActionInputSchema
>;
export type DealerUploadFinalizeActionInput = z.input<
  typeof dealerUploadFinalizeActionInputSchema
>;

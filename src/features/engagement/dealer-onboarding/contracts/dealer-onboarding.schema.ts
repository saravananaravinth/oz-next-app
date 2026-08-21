// oz-next-app/src/features/engagement/dealer-onboarding/contracts/dealer-onboarding.schema.ts
import { z } from "zod";

import { erpUuidSchema } from "@/features/erp-core/contracts/erp-common.schema";

export const DEALER_ONBOARDING_ORIGINS = ["APPLICATION", "DIRECT"] as const;
export const DEALER_ONBOARDING_TYPES = ["DEALER", "SUB_DEALER"] as const;
export const DEALER_ONBOARDING_PREFLIGHT_OUTCOMES = [
  "EXISTING_DEALER",
  "APPLICATION_FOUND",
  "LEGAL_ENTITY_FOUND",
  "ELIGIBLE_DIRECT",
  "AMBIGUOUS",
] as const;
export const DEALER_GST_TREATMENTS = [
  "REGISTERED",
  "COMPOSITION",
  "UNREGISTERED",
  "SEZ",
  "OVERSEAS",
] as const;
export const DEALER_TAX_PREFERENCES = ["TAXABLE", "EXEMPT", "NON_GST"] as const;
export const DEALER_COMMUNICATION_CHANNELS = ["EMAIL", "WHATSAPP"] as const;
export const DEALER_ONBOARDING_LANGUAGES = ["en", "ta", "hi"] as const;
export const DEALER_LEGAL_ENTITY_MODES = ["CREATE", "LINK_EXISTING"] as const;
export const DEALER_MARGIN_VALUE_TYPES = ["AMOUNT", "PERCENT"] as const;
export const DEALER_DOCUMENT_KINDS = [
  "KYC",
  "GST_CERTIFICATE",
  "PAN_CARD",
  "ADDRESS_PROOF",
  "BANK_PROOF",
  "DEALER_AGREEMENT",
  "OTHER",
] as const;
export const DEALER_DOCUMENT_STATUSES = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;
export const DEALER_FILE_SCAN_STATUSES = [
  "PENDING",
  "SCANNING",
  "CLEAN",
  "INFECTED",
  "REJECTED",
  "ERROR",
] as const;

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/u;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/u;
const UIN_PATTERN = /^[A-Z0-9]{15}$/u;
const CURRENCY_PATTERN = /^[A-Z]{3}$/u;
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/u;
const SAFE_IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:/+-]+$/u;
const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/u;

const boundedText = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum);
const optionalTaxId = (pattern: RegExp, label: string) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(pattern, `Invalid ${label} format.`)
    .optional();
const nullableText = (maximum: number) =>
  z.string().trim().max(maximum).nullable();
const currencySchema = z.string().trim().toUpperCase().regex(CURRENCY_PATTERN);

export const dealerOnboardingOriginSchema = z.enum(DEALER_ONBOARDING_ORIGINS);
export const dealerOnboardingTypeSchema = z.enum(DEALER_ONBOARDING_TYPES);
export const dealerOnboardingIdempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(200)
  .regex(SAFE_IDEMPOTENCY_KEY_PATTERN, "Invalid idempotency key.");

export const dealerOnboardingPreflightBodySchema = z
  .object({
    origin: dealerOnboardingOriginSchema,
    applicationId: erpUuidSchema.optional(),
    businessName: boundedText(2, 200),
    phone: boundedText(8, 32),
    email: z.email().trim().toLowerCase().max(254),
    gstin: optionalTaxId(GSTIN_PATTERN, "GSTIN"),
    uin: optionalTaxId(UIN_PATTERN, "UIN"),
    pan: optionalTaxId(PAN_PATTERN, "PAN"),
    stateId: erpUuidSchema.optional(),
    districtId: erpUuidSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.origin === "APPLICATION" && value.applicationId === undefined) {
      context.addIssue({
        code: "custom",
        path: ["applicationId"],
        message: "Application origin requires an application ID.",
      });
    }
    if (value.origin === "DIRECT" && value.applicationId !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["applicationId"],
        message: "Direct origin must not include an application ID.",
      });
    }
    if (value.gstin !== undefined && value.uin !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["uin"],
        message: "GSTIN and UIN cannot both be supplied.",
      });
    }
    if (
      value.gstin !== undefined &&
      value.pan !== undefined &&
      value.gstin.slice(2, 12) !== value.pan
    ) {
      context.addIssue({
        code: "custom",
        path: ["pan"],
        message: "PAN must match the PAN embedded in GSTIN.",
      });
    }
    if (value.districtId !== undefined && value.stateId === undefined) {
      context.addIssue({
        code: "custom",
        path: ["stateId"],
        message: "State is required when district is supplied.",
      });
    }
  });

export const dealerOnboardingGstinPrefillBodySchema = z
  .object({
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(GSTIN_PATTERN, "Invalid GSTIN format."),
  })
  .strict();

export const dealerOnboardingOptionsQuerySchema = z
  .object({
    dealerType: dealerOnboardingTypeSchema,
    stateId: erpUuidSchema.optional(),
    currency: currencySchema.default("INR"),
  })
  .strict();

export const dealerOnboardingMarginsQuerySchema = z
  .object({
    priceBookId: erpUuidSchema,
    marginTemplateId: erpUuidSchema,
    limit: z.coerce.number().int().min(1).max(500).default(500),
    afterVariantId: erpUuidSchema.optional(),
  })
  .strict();

export const dealerOnboardingLocationSchema = z
  .object({
    addressLine1: boundedText(3, 240),
    addressLine2: boundedText(1, 240).optional(),
    city: boundedText(2, 120),
    stateId: erpUuidSchema,
    districtId: erpUuidSchema,
    postalCode: z
      .string()
      .trim()
      .regex(PINCODE_PATTERN, "A valid six-digit Indian pincode is required."),
    countryCode: z.literal("IN").default("IN"),
  })
  .strict();

export const dealerOnboardingOperatingLocationSchema =
  dealerOnboardingLocationSchema
    .extend({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      captureSource: z.enum(["DEVICE", "MAP_PIN", "VERIFIED_ADDRESS"]),
      accuracyMeters: z.number().positive().max(100_000).optional(),
    })
    .strict();

export const dealerOnboardingShippingLocationSchema = z.discriminatedUnion(
  "sameAsBilling",
  [
    z.object({ sameAsBilling: z.literal(true) }).strict(),
    z
      .object({
        sameAsBilling: z.literal(false),
        location: dealerOnboardingLocationSchema,
      })
      .strict(),
  ],
);

const communicationChannelsSchema = z
  .array(z.enum(DEALER_COMMUNICATION_CHANNELS))
  .min(1)
  .max(DEALER_COMMUNICATION_CHANNELS.length)
  .superRefine((channels, context) => {
    if (new Set(channels).size !== channels.length) {
      context.addIssue({
        code: "custom",
        message: "Communication channels must be unique.",
      });
    }
  });

const marginOverrideSchema = z
  .object({
    variantId: erpUuidSchema,
    value: z.number().min(0).max(10_000_000),
  })
  .strict();

export const dealerOnboardingProvisionBodySchema = z
  .object({
    origin: dealerOnboardingOriginSchema,
    applicationId: erpUuidSchema.optional(),
    preflightToken: z.string().trim().min(32).max(256),
    dealerType: dealerOnboardingTypeSchema,
    parentOrgUnitId: erpUuidSchema.optional(),
    legalEntityMode: z.enum(DEALER_LEGAL_ENTITY_MODES),
    legalEntityId: erpUuidSchema.optional(),
    business: z
      .object({
        companyName: boundedText(2, 200),
        displayName: boundedText(2, 200),
        legalName: boundedText(2, 240),
        tradeName: boundedText(1, 240).optional(),
        gstTreatment: z.enum(DEALER_GST_TREATMENTS),
        gstin: optionalTaxId(GSTIN_PATTERN, "GSTIN"),
        uin: optionalTaxId(UIN_PATTERN, "UIN"),
        pan: optionalTaxId(PAN_PATTERN, "PAN"),
        placeOfSupplyStateId: erpUuidSchema,
        taxPreference: z.enum(DEALER_TAX_PREFERENCES),
        currency: currencySchema.default("INR"),
      })
      .strict(),
    primaryContact: z
      .object({
        displayName: boundedText(2, 160),
        email: z.email().trim().toLowerCase().max(254),
        phone: boundedText(8, 32),
        preferredLanguage: z.enum(DEALER_ONBOARDING_LANGUAGES).default("en"),
        communicationChannels: communicationChannelsSchema,
      })
      .strict(),
    operatingLocation: dealerOnboardingOperatingLocationSchema,
    billingLocation: dealerOnboardingLocationSchema,
    shippingLocation: dealerOnboardingShippingLocationSchema,
    priceBookId: erpUuidSchema.optional(),
    marginTemplateId: erpUuidSchema.optional(),
    marginOverrides: z.array(marginOverrideSchema).max(500).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.origin === "APPLICATION" && value.applicationId === undefined) {
      context.addIssue({
        code: "custom",
        path: ["applicationId"],
        message: "Application ID is required.",
      });
    }
    if (value.origin === "DIRECT" && value.applicationId !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["applicationId"],
        message: "Direct onboarding cannot include an application ID.",
      });
    }
    if (
      value.dealerType === "SUB_DEALER" &&
      value.parentOrgUnitId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["parentOrgUnitId"],
        message: "A parent dealer is required for a sub-dealer.",
      });
    }
    if (value.dealerType === "DEALER" && value.parentOrgUnitId !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["parentOrgUnitId"],
        message: "A dealer cannot have a dealer parent.",
      });
    }
    if (
      value.legalEntityMode === "LINK_EXISTING" &&
      value.legalEntityId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["legalEntityId"],
        message: "Existing legal entity ID is required.",
      });
    }
    if (
      value.legalEntityMode === "CREATE" &&
      value.legalEntityId !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["legalEntityId"],
        message:
          "A new legal entity must not include an existing legal entity ID.",
      });
    }
    if (
      value.business.gstin !== undefined &&
      value.business.uin !== undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["business", "uin"],
        message: "GSTIN and UIN cannot both be supplied.",
      });
    }
    if (
      (value.business.gstTreatment === "REGISTERED" ||
        value.business.gstTreatment === "COMPOSITION") &&
      value.business.gstin === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["business", "gstin"],
        message: "GSTIN is required for registered or composition treatment.",
      });
    }
    if (
      value.business.gstin !== undefined &&
      value.business.pan !== undefined &&
      value.business.gstin.slice(2, 12) !== value.business.pan
    ) {
      context.addIssue({
        code: "custom",
        path: ["business", "pan"],
        message: "PAN must match the PAN embedded in GSTIN.",
      });
    }
    if (
      (value.priceBookId === undefined) !==
      (value.marginTemplateId === undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["priceBookId"],
        message:
          "Legacy price book and margin template must be supplied together.",
      });
    }
    const overrideIds = (value.marginOverrides ?? []).map(
      (item) => item.variantId,
    );
    if (new Set(overrideIds).size !== overrideIds.length) {
      context.addIssue({
        code: "custom",
        path: ["marginOverrides"],
        message: "Each variant may be overridden only once.",
      });
    }
  });

const matchEvidenceSchema = z
  .object({
    matchedBy: z.array(
      z.enum(["GSTIN", "UIN", "PAN", "PHONE", "EMAIL", "BUSINESS_NAME"]),
    ),
  })
  .strict();

const preflightDealerSchema = z
  .object({
    dealerOrgUnitId: erpUuidSchema,
    dealerType: dealerOnboardingTypeSchema,
    dealerCode: boundedText(1, 128),
    displayName: boundedText(1, 200),
    isActive: z.boolean(),
    evidence: matchEvidenceSchema,
  })
  .strict();

export const dealerPreflightApplicationSchema = z
  .object({
    applicationId: erpUuidSchema,
    applicationNo: z.string().trim().max(128).nullable(),
    phase: z.string().trim().min(1).max(128),
    status: z.string().trim().min(1).max(128),
    dealerOrgUnitId: erpUuidSchema.nullable(),
    submittedEmailHash: z.string().trim().max(256).nullable(),
    submittedMobileHash: z.string().trim().max(256).nullable(),
  })
  .strict();

const preflightLegalEntitySchema = z
  .object({
    legalEntityId: erpUuidSchema,
    legalName: boundedText(1, 240),
    tradeName: z.string().trim().max(240).nullable(),
    verificationState: z.string().trim().min(1).max(128),
  })
  .strict();

export const dealerOnboardingPreflightResultSchema = z
  .object({
    outcome: z.enum(DEALER_ONBOARDING_PREFLIGHT_OUTCOMES),
    nextAction: z.enum([
      "OPEN_EXISTING_DEALER",
      "CONTINUE_APPLICATION",
      "LINK_OR_CREATE_OUTLET",
      "START_DIRECT_ONBOARDING",
      "ADMIN_RESOLUTION_REQUIRED",
    ]),
    preflightToken: z.string().trim().min(32).max(256).nullable(),
    expiresAt: z.iso.datetime({ offset: true }).nullable(),
    dealer: preflightDealerSchema.nullable(),
    application: dealerPreflightApplicationSchema.nullable(),
    applications: z.array(dealerPreflightApplicationSchema).max(16),
    legalEntity: preflightLegalEntitySchema.nullable(),
    warnings: z.array(z.string().trim().min(1).max(500)).max(16),
  })
  .strict();

const parentOptionSchema = z
  .object({
    orgUnitId: erpUuidSchema,
    code: boundedText(1, 128),
    name: boundedText(1, 200),
    district: z.string().trim().max(160).nullable(),
    state: z.string().trim().max(160).nullable(),
    childCount: z.number().int().nonnegative(),
  })
  .strict();
const stateOptionSchema = z
  .object({ stateId: erpUuidSchema, name: boundedText(1, 160) })
  .strict();
const districtOptionSchema = z
  .object({
    districtId: erpUuidSchema,
    stateId: erpUuidSchema,
    name: boundedText(1, 160),
  })
  .strict();
const currencyOptionSchema = z
  .object({
    code: currencySchema,
    name: boundedText(1, 120),
    symbol: z.string().trim().max(12).nullable(),
  })
  .strict();
const priceBookOptionSchema = z
  .object({
    priceBookId: erpUuidSchema,
    name: boundedText(1, 180),
    stateId: erpUuidSchema.nullable(),
    currency: currencySchema,
    effectiveFrom: z.string().trim().min(1).max(32),
    effectiveTo: z.string().trim().max(32).nullable(),
    isDefault: z.boolean(),
    variantCoverage: z.number().int().nonnegative(),
  })
  .strict();
const marginTemplateOptionSchema = z
  .object({
    marginTemplateId: erpUuidSchema,
    name: boundedText(1, 180),
    version: z.number().int().positive(),
    dealerType: dealerOnboardingTypeSchema,
    stateId: erpUuidSchema.nullable(),
    currency: currencySchema,
    valueType: z.enum(DEALER_MARGIN_VALUE_TYPES),
    effectiveFrom: z.string().trim().min(1).max(32),
    effectiveTo: z.string().trim().max(32).nullable(),
    isDefault: z.boolean(),
    variantCoverage: z.number().int().nonnegative(),
  })
  .strict();

export const dealerOnboardingOptionsSchema = z
  .object({
    parents: z.array(parentOptionSchema),
    states: z.array(stateOptionSchema),
    districts: z.array(districtOptionSchema),
    currencies: z.array(currencyOptionSchema),
    priceBooks: z.array(priceBookOptionSchema),
    marginTemplates: z.array(marginTemplateOptionSchema),
  })
  .strict();

const marginGridRowSchema = z
  .object({
    sequence: z.number().int().positive(),
    modelId: erpUuidSchema,
    modelName: boundedText(1, 200),
    variantId: erpUuidSchema,
    variantName: boundedText(1, 200),
    batteryType: z.string().trim().max(120).nullable(),
    batteryPowerKw: z.string().trim().max(120).nullable(),
    exShowroom: z.string().trim().max(64).nullable(),
    mrp: z.string().trim().max(64).nullable(),
    defaultMargin: z.string().trim().max(64).nullable(),
    valueType: z.enum(DEALER_MARGIN_VALUE_TYPES),
    missingPrice: z.boolean(),
    missingTemplateMargin: z.boolean(),
  })
  .strict();

export const dealerOnboardingMarginGridSchema = z
  .object({
    priceBookId: erpUuidSchema,
    marginTemplateId: erpUuidSchema,
    rows: z.array(marginGridRowSchema).max(500),
    hasMore: z.boolean(),
  })
  .strict();

export const dealerOnboardingGstinPrefillResultSchema = z
  .object({
    providerReference: z.string().trim().min(1).max(180),
    status: z.enum(["ACTIVE", "INACTIVE", "UNKNOWN"]),
    fetchedAt: z.iso.datetime({ offset: true }),
    legalName: boundedText(1, 240),
    tradeName: z.string().trim().max(240).nullable(),
    pan: z.string().trim().toUpperCase().regex(PAN_PATTERN).nullable(),
    stateId: erpUuidSchema.nullable(),
    registeredAddress: z
      .object({
        addressLine1: boundedText(1, 240),
        addressLine2: nullableText(240),
        city: boundedText(1, 120),
        district: z.string().trim().max(160).nullable(),
        state: boundedText(1, 160),
        postalCode: z.string().trim().max(16),
        latitude: z.number().min(-90).max(90).nullable(),
        longitude: z.number().min(-180).max(180).nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export const dealerOnboardingProvisionResultSchema = z
  .object({
    applicationId: erpUuidSchema,
    applicationNo: z.string().trim().max(128).nullable(),
    onboardingOrigin: dealerOnboardingOriginSchema,
    dealerOrgUnitId: erpUuidSchema,
    dealerCode: boundedText(1, 128),
    dicCode: z.string().trim().length(2),
    dealerProfileId: erpUuidSchema,
    legalEntityId: erpUuidSchema,
    dealerUserId: erpUuidSchema,
    storeId: erpUuidSchema,
    priceBookAssignmentId: erpUuidSchema.nullable(),
    activeMarginCount: z.number().int().nonnegative(),
    replayed: z.boolean(),
  })
  .strict();

export const dealerDirectoryListQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    dealerType: dealerOnboardingTypeSchema.optional(),
    active: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).default(40),
    cursor: z.string().trim().min(1).max(2048).optional(),
  })
  .strict();

const dealerDirectorySourceSchema = z
  .object({
    kind: boundedText(1, 64),
    code: boundedText(1, 128),
    name: boundedText(1, 180),
  })
  .strict();

const dealerDirectoryWalletBalanceSchema = z
  .object({
    currency: currencySchema,
    walletCount: z.number().int().nonnegative(),
    postedBalance: z.string().trim().min(1).max(64),
    availableBalance: z.string().trim().min(1).max(64),
    reservedBalance: z.string().trim().min(1).max(64),
    pendingCredit: z.string().trim().min(1).max(64),
  })
  .strict();

const dealerDirectoryListItemSchema = z
  .object({
    dealerOrgUnitId: erpUuidSchema,
    dealerType: dealerOnboardingTypeSchema,
    dealerCode: boundedText(1, 128),
    dicCode: z.string().trim().length(2).nullable(),
    companyName: boundedText(1, 200),
    displayName: boundedText(1, 200),
    isActive: z.boolean(),
    parentOrgUnitId: erpUuidSchema.nullable(),
    parentDealerName: z.string().trim().max(200).nullable(),
    primaryContactName: boundedText(1, 160),
    primaryEmail: z.string().trim().max(254).nullable(),
    primaryPhone: z.string().trim().max(64).nullable(),
    primaryEmailMasked: z.string().trim().max(254),
    primaryPhoneMasked: z.string().trim().max(64),
    city: z.string().trim().max(120).nullable(),
    district: z.string().trim().max(160).nullable(),
    state: z.string().trim().max(160).nullable(),
    onboardingOrigin: dealerOnboardingOriginSchema,
    applicationId: erpUuidSchema.nullable(),
    applicationNo: z.string().trim().max(128).nullable(),
    gstinMasked: z.string().trim().max(32).nullable(),
    placeOfSupply: z.string().trim().max(160).nullable(),
    source: dealerDirectorySourceSchema,
    walletBalance: dealerDirectoryWalletBalanceSchema.nullable(),
    priceBookName: z.string().trim().max(180).nullable(),
    activeMarginCount: z.number().int().nonnegative(),
    documentCount: z.number().int().nonnegative(),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const dealerDirectoryPageSchema = z
  .object({
    items: z.array(dealerDirectoryListItemSchema),
    pagination: z
      .object({
        limit: z.number().int().positive(),
        hasMore: z.boolean(),
        nextCursor: z.string().trim().min(1).max(2048).nullable(),
      })
      .strict(),
  })
  .strict();

export const dealerDirectoryLocationSchema = z
  .object({
    addressLine1: boundedText(1, 240),
    addressLine2: nullableText(240),
    city: boundedText(1, 120),
    stateId: erpUuidSchema,
    state: boundedText(1, 160),
    districtId: erpUuidSchema,
    district: boundedText(1, 160),
    postalCode: z.string().trim().max(16),
    countryCode: z.literal("IN"),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
  })
  .strict();

const dealerDirectoryMarginSchema = z
  .object({
    marginId: erpUuidSchema,
    modelId: erpUuidSchema,
    modelName: boundedText(1, 200),
    variantId: erpUuidSchema,
    variantName: boundedText(1, 200),
    batteryType: z.string().trim().max(120).nullable(),
    batteryPowerKw: z.string().trim().max(120).nullable(),
    existingPrice: z.string().trim().max(64).nullable(),
    valueType: z.enum(DEALER_MARGIN_VALUE_TYPES),
    value: z.string().trim().min(1).max(64),
    effectiveFrom: z.string().trim().min(1).max(32),
  })
  .strict();

export const dealerDocumentSchema = z
  .object({
    dealerDocumentId: erpUuidSchema,
    fileId: erpUuidSchema,
    fileName: boundedText(1, 160),
    mimeType: z.string().trim().max(160).nullable(),
    sizeBytes: z.number().int().nonnegative().nullable(),
    kind: z.enum(DEALER_DOCUMENT_KINDS),
    status: z.enum(DEALER_DOCUMENT_STATUSES),
    expiresAt: z.string().trim().max(32).nullable(),
    note: z.string().trim().max(500).nullable(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
    rowVersion: z.number().int().positive(),
  })
  .strict();

const dealerWalletSchema = z
  .object({
    walletId: erpUuidSchema,
    walletType: boundedText(1, 80),
    currency: currencySchema,
    status: boundedText(1, 80),
    postedBalance: z.string().trim().min(1).max(64),
    availableBalance: z.string().trim().min(1).max(64),
    reservedBalance: z.string().trim().min(1).max(64),
    pendingCredit: z.string().trim().min(1).max(64),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

const dealerContactSchema = z
  .object({
    userId: erpUuidSchema,
    displayName: boundedText(1, 160),
    email: z.string().trim().max(254).nullable(),
    phone: z.string().trim().max(64).nullable(),
    title: z.string().trim().max(160).nullable(),
    isPrimary: z.boolean(),
    lastLoginAt: z.iso.datetime({ offset: true }).nullable(),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

const dealerWelfareAccrualSchema = z
  .object({
    accrualId: erpUuidSchema,
    invoiceId: erpUuidSchema,
    walletId: erpUuidSchema.nullable(),
    ratePercentage: z.string().trim().max(64).nullable(),
    totalBasePrice: z.string().trim().min(1).max(64),
    welfareAmount: z.string().trim().min(1).max(64),
    currency: currencySchema,
    status: boundedText(1, 80),
    blockedReason: z.string().trim().max(500).nullable(),
    invoiceCreatedAt: z.iso.datetime({ offset: true }),
    creditDueAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

const dealerWelfareSummarySchema = z
  .object({
    currentRatePercentage: z.string().trim().max(64).nullable(),
    accrualCount: z.number().int().nonnegative(),
    totalAccruedAmount: z.string().trim().min(1).max(64),
    statusBreakdown: z
      .array(
        z
          .object({
            status: boundedText(1, 80),
            count: z.number().int().nonnegative(),
            amount: z.string().trim().min(1).max(64),
          })
          .strict(),
      )
      .max(64),
    recentAccruals: z.array(dealerWelfareAccrualSchema).max(25),
  })
  .strict();

export const dealerDirectoryDetailSchema = z
  .object({
    dealerOrgUnitId: erpUuidSchema,
    dealerType: dealerOnboardingTypeSchema,
    dealerCode: boundedText(1, 128),
    dicCode: z.string().trim().length(2).nullable(),
    companyName: boundedText(1, 200),
    displayName: boundedText(1, 200),
    isActive: z.boolean(),
    parentOrgUnitId: erpUuidSchema.nullable(),
    parentDealerName: z.string().trim().max(200).nullable(),
    primaryContactName: boundedText(1, 160),
    primaryEmail: z.string().trim().max(254).nullable(),
    primaryPhone: z.string().trim().max(64).nullable(),
    primaryEmailMasked: z.string().trim().max(254),
    primaryPhoneMasked: z.string().trim().max(64),
    preferredLanguage: z.enum(DEALER_ONBOARDING_LANGUAGES),
    communicationChannels: communicationChannelsSchema,
    onboardingOrigin: dealerOnboardingOriginSchema,
    applicationId: erpUuidSchema.nullable(),
    applicationNo: z.string().trim().max(128).nullable(),
    currency: currencySchema,
    legalEntity: z
      .object({
        legalEntityId: erpUuidSchema,
        legalName: boundedText(1, 240),
        tradeName: z.string().trim().max(240).nullable(),
        gstTreatment: z.enum(DEALER_GST_TREATMENTS),
        gstinMasked: z.string().trim().max(32).nullable(),
        panMasked: z.string().trim().max(32).nullable(),
        placeOfSupplyStateId: erpUuidSchema,
        taxPreference: z.enum(DEALER_TAX_PREFERENCES),
        verificationState: boundedText(1, 128),
        placeOfSupply: boundedText(1, 160),
      })
      .strict(),
    source: dealerDirectorySourceSchema,
    financialAccess: z
      .object({ wallet: z.boolean(), welfare: z.boolean() })
      .strict(),
    wallets: z.array(dealerWalletSchema).max(100),
    welfare: dealerWelfareSummarySchema.nullable(),
    contacts: z.array(dealerContactSchema).max(100),
    operatingLocation: dealerDirectoryLocationSchema,
    billingLocation: dealerDirectoryLocationSchema,
    shippingLocation: dealerDirectoryLocationSchema,
    priceBook: z
      .object({ priceBookId: erpUuidSchema, name: boundedText(1, 180) })
      .strict()
      .nullable(),
    margins: z.array(dealerDirectoryMarginSchema).max(500),
    documents: z.array(dealerDocumentSchema).max(500),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

const profileLocationSchema = dealerOnboardingLocationSchema;
export const dealerProfileUpdateBodySchema = z
  .object({
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
    companyName: boundedText(2, 200),
    displayName: boundedText(2, 200),
    isActive: z.boolean(),
    parentOrgUnitId: erpUuidSchema.nullable(),
    primaryContact: z
      .object({
        displayName: boundedText(2, 160),
        replacementEmail: z.email().trim().toLowerCase().max(254).optional(),
        replacementPhone: boundedText(8, 32).optional(),
        preferredLanguage: z.enum(DEALER_ONBOARDING_LANGUAGES),
        communicationChannels: communicationChannelsSchema,
      })
      .strict(),
    business: z
      .object({
        legalName: boundedText(2, 240),
        tradeName: z.string().trim().max(240).nullable(),
        gstTreatment: z.enum(DEALER_GST_TREATMENTS),
        replacementGstin: z
          .string()
          .trim()
          .toUpperCase()
          .regex(GSTIN_PATTERN, "Invalid GSTIN format.")
          .nullable()
          .optional(),
        replacementPan: z
          .string()
          .trim()
          .toUpperCase()
          .regex(PAN_PATTERN, "Invalid PAN format.")
          .nullable()
          .optional(),
        placeOfSupplyStateId: erpUuidSchema,
        taxPreference: z.enum(DEALER_TAX_PREFERENCES),
        currency: currencySchema,
      })
      .strict(),
    operatingLocation: profileLocationSchema
      .extend({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        captureSource: z.enum(["DEVICE", "MAP_PIN", "VERIFIED_ADDRESS"]),
        accuracyMeters: z.number().positive().max(100_000).optional(),
      })
      .strict(),
    billingLocation: profileLocationSchema,
    shippingLocation: dealerOnboardingShippingLocationSchema,
    priceBookId: erpUuidSchema.optional(),
    reason: boundedText(3, 500),
  })
  .strict();

export const dealerMarginUpdateBodySchema = z
  .object({
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
    reason: boundedText(3, 500),
    margins: z
      .array(
        z
          .object({
            modelId: erpUuidSchema,
            variantId: erpUuidSchema,
            valueType: z.enum(DEALER_MARGIN_VALUE_TYPES),
            value: z.number().min(0).max(10_000_000),
          })
          .strict(),
      )
      .min(1)
      .max(500),
  })
  .strict();

export const dealerContactCreateBodySchema = z
  .object({
    displayName: boundedText(2, 160),
    email: z.email().trim().toLowerCase().max(254),
    phone: boundedText(8, 32),
    title: z.string().trim().max(160).nullable().default(null),
  })
  .strict();

export const dealerContactUpdateBodySchema = z
  .object({
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
    displayName: boundedText(2, 160),
    replacementEmail: z.email().trim().toLowerCase().max(254).optional(),
    replacementPhone: boundedText(8, 32).optional(),
    title: z.string().trim().max(160).nullable(),
  })
  .strict();

export const dealerUploadIntentBodySchema = z
  .object({
    dealerOrgUnitId: erpUuidSchema,
    fileName: z.string().trim().min(1).max(160),
    mimeType: z.enum([
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]),
    sizeBytes: z
      .number()
      .int()
      .min(1)
      .max(25 * 1024 * 1024),
    checksumSha256: z.string().trim().toLowerCase().regex(CHECKSUM_PATTERN),
  })
  .strict();

export const dealerUploadIntentResultSchema = z
  .object({
    uploadId: erpUuidSchema,
    fileId: erpUuidSchema,
    uploadUrl: z.url(),
    method: z.literal("PUT"),
    requiredHeaders: z.record(z.string(), z.string()),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const dealerUploadFinalizeBodySchema = z
  .object({
    uploadId: erpUuidSchema,
    checksumSha256: z.string().trim().toLowerCase().regex(CHECKSUM_PATTERN),
    sizeBytes: z
      .number()
      .int()
      .min(1)
      .max(25 * 1024 * 1024),
  })
  .strict();

export const dealerUploadCancelResultSchema = z
  .object({ cancelled: z.literal(true) })
  .strict();

export const dealerFileStatusSchema = z
  .object({
    fileId: erpUuidSchema,
    fileName: boundedText(1, 160),
    mimeType: z.string().trim().max(160).nullable(),
    sizeBytes: z.number().int().nonnegative().nullable(),
    storageStatus: z.string().trim().min(1).max(128),
    scanStatus: z.enum(DEALER_FILE_SCAN_STATUSES).nullable(),
    failureCode: z.string().trim().max(128).nullable(),
  })
  .strict();

export const dealerDocumentBindBodySchema = z
  .object({
    dealerOrgUnitId: erpUuidSchema,
    fileId: erpUuidSchema,
    kind: z.enum(DEALER_DOCUMENT_KINDS),
    expiresAt: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/u)
      .nullable()
      .optional(),
    note: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const dealerDocumentDownloadResultSchema = z
  .object({
    url: z.url(),
    expiresAt: z.iso.datetime({ offset: true }),
    fileName: boundedText(1, 160),
  })
  .strict();

const rawSingleSearchValueSchema = z.union([
  z.string(),
  z
    .array(z.string())
    .length(1)
    .transform(([value]) => value ?? ""),
]);

export const dealerDirectoryRawSearchParamsSchema = z
  .object({
    q: rawSingleSearchValueSchema.optional(),
    dealerType: rawSingleSearchValueSchema.optional(),
    active: rawSingleSearchValueSchema.optional(),
    cursor: rawSingleSearchValueSchema.optional(),
  })
  .strict();

export const dealerDirectorySearchParamsSchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    dealerType: dealerOnboardingTypeSchema.optional(),
    active: z.enum(["true", "false"]).optional(),
    cursor: z.string().trim().min(1).max(2048).optional(),
  })
  .strict();

export const dealerOnboardingPreflightActionInputSchema =
  dealerOnboardingPreflightBodySchema;
export const dealerOnboardingGstinPrefillActionInputSchema =
  dealerOnboardingGstinPrefillBodySchema;
export const dealerOnboardingOptionsActionInputSchema =
  dealerOnboardingOptionsQuerySchema;
export const dealerOnboardingMarginsActionInputSchema =
  dealerOnboardingMarginsQuerySchema;
export const dealerOnboardingProvisionActionInputSchema = z
  .object({
    body: dealerOnboardingProvisionBodySchema,
    idempotencyKey: dealerOnboardingIdempotencyKeySchema,
  })
  .strict();
export const dealerProfileUpdateActionInputSchema = z
  .object({
    dealerOrgUnitId: erpUuidSchema,
    body: dealerProfileUpdateBodySchema,
  })
  .strict();
export const dealerMarginUpdateActionInputSchema = z
  .object({
    dealerOrgUnitId: erpUuidSchema,
    body: dealerMarginUpdateBodySchema,
  })
  .strict();
export const dealerContactCreateActionInputSchema = z
  .object({
    dealerOrgUnitId: erpUuidSchema,
    body: dealerContactCreateBodySchema,
  })
  .strict();
export const dealerContactUpdateActionInputSchema = z
  .object({
    dealerOrgUnitId: erpUuidSchema,
    userId: erpUuidSchema,
    body: dealerContactUpdateBodySchema,
  })
  .strict();
export const dealerFileStatusActionInputSchema = z
  .object({ fileId: erpUuidSchema })
  .strict();
export const dealerDocumentDownloadActionInputSchema = z
  .object({ dealerOrgUnitId: erpUuidSchema, dealerDocumentId: erpUuidSchema })
  .strict();

export type DealerOnboardingOrigin = z.output<
  typeof dealerOnboardingOriginSchema
>;
export type DealerOnboardingType = z.output<typeof dealerOnboardingTypeSchema>;
export type DealerOnboardingPreflightBody = z.output<
  typeof dealerOnboardingPreflightBodySchema
>;
export type DealerOnboardingPreflightResult = z.output<
  typeof dealerOnboardingPreflightResultSchema
>;
export type DealerPreflightApplication = z.output<
  typeof dealerPreflightApplicationSchema
>;
export type DealerOnboardingGstinPrefillBody = z.output<
  typeof dealerOnboardingGstinPrefillBodySchema
>;
export type DealerOnboardingGstinPrefillResult = z.output<
  typeof dealerOnboardingGstinPrefillResultSchema
>;
export type DealerOnboardingOptionsQuery = z.output<
  typeof dealerOnboardingOptionsQuerySchema
>;
export type DealerOnboardingOptions = z.output<
  typeof dealerOnboardingOptionsSchema
>;
export type DealerOnboardingMarginsQuery = z.output<
  typeof dealerOnboardingMarginsQuerySchema
>;
export type DealerOnboardingMarginGrid = z.output<
  typeof dealerOnboardingMarginGridSchema
>;
export type DealerOnboardingProvisionBody = z.output<
  typeof dealerOnboardingProvisionBodySchema
>;
export type DealerOnboardingProvisionResult = z.output<
  typeof dealerOnboardingProvisionResultSchema
>;
export type DealerDirectoryListQuery = z.output<
  typeof dealerDirectoryListQuerySchema
>;
export type DealerDirectoryPage = z.output<typeof dealerDirectoryPageSchema>;
export type DealerDirectoryDetail = z.output<
  typeof dealerDirectoryDetailSchema
>;
export type DealerContact = z.output<typeof dealerContactSchema>;
export type DealerContactCreateBody = z.output<
  typeof dealerContactCreateBodySchema
>;
export type DealerContactUpdateBody = z.output<
  typeof dealerContactUpdateBodySchema
>;
export type DealerProfileUpdateBody = z.output<
  typeof dealerProfileUpdateBodySchema
>;
export type DealerMarginUpdateBody = z.output<
  typeof dealerMarginUpdateBodySchema
>;
export type DealerUploadIntentBody = z.output<
  typeof dealerUploadIntentBodySchema
>;
export type DealerUploadIntentResult = z.output<
  typeof dealerUploadIntentResultSchema
>;
export type DealerUploadFinalizeBody = z.output<
  typeof dealerUploadFinalizeBodySchema
>;
export type DealerFileStatus = z.output<typeof dealerFileStatusSchema>;
export type DealerDocument = z.output<typeof dealerDocumentSchema>;
export type DealerDocumentKind = (typeof DEALER_DOCUMENT_KINDS)[number];
export type DealerDocumentBindBody = z.output<
  typeof dealerDocumentBindBodySchema
>;
export type DealerDocumentDownloadResult = z.output<
  typeof dealerDocumentDownloadResultSchema
>;
export type DealerDirectoryRawSearchParams = z.input<
  typeof dealerDirectoryRawSearchParamsSchema
>;
export type DealerDirectorySearchParams = z.output<
  typeof dealerDirectorySearchParamsSchema
>;

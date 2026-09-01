// oz-next-app/src/features/wallet/contracts/wallet.schema.ts
import { z } from "zod";

const MONEY_PATTERN = /^(?:0|[1-9][0-9]{0,15})(?:\.[0-9]{1,2})?$/u;
const SIGNED_MONEY_PATTERN = /^-?(?:0|[1-9][0-9]{0,15})(?:\.[0-9]{1,2})?$/u;
const CURRENCY_PATTERN = /^[A-Z]{3}$/u;
const SAFE_CURSOR_PATTERN = /^[A-Za-z0-9_-]{16,2048}$/u;

export const WALLET_TABLE_PAGE_SIZE = 20;

export const walletTypeSchema = z.enum(["WELFARE_FUND", "CREDIT_NOTE"]);
export const walletStatusSchema = z.enum([
  "ACTIVE",
  "RESTRICTED",
  "FROZEN",
  "CLOSED",
]);
export const walletOwnerOrgUnitTypeSchema = z.enum(["DEALER", "SUB_DEALER"]);

export const walletSummarySchema = z
  .object({
    walletId: z.uuid(),
    ownerOrgUnitId: z.uuid(),
    ownerOrgUnitName: z.string().trim().min(1).max(256),
    ownerOrgUnitType: walletOwnerOrgUnitTypeSchema,
    walletType: walletTypeSchema,
    currency: z.string().trim().regex(CURRENCY_PATTERN),
    status: walletStatusSchema,
    postedBalance: z.string().trim().regex(MONEY_PATTERN),
    availableBalance: z.string().trim().regex(MONEY_PATTERN),
    reservedBalance: z.string().trim().regex(MONEY_PATTERN),
    pendingCredit: z.string().trim().regex(MONEY_PATTERN),
    rowVersion: z.number().int().positive(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const walletEntryTypeSchema = z.enum([
  "WELFARE_SALE_CREDIT",
  "WELFARE_INVOICE_CANCELLATION_REVERSAL",
  "CREDIT_NOTE_ENTITLEMENT",
  "CREDIT_NOTE_SETTLEMENT",
  "TRANSFER_DEBIT",
  "TRANSFER_CREDIT",
  "ADMIN_ADJUSTMENT_CREDIT",
  "ADMIN_ADJUSTMENT_DEBIT",
]);

export const walletEntrySchema = z
  .object({
    walletEntryId: z.uuid(),
    entryType: walletEntryTypeSchema,
    direction: z.enum(["CREDIT", "DEBIT"]),
    amount: z.string().trim().regex(MONEY_PATTERN),
    signedAmount: z.string().trim().regex(SIGNED_MONEY_PATTERN),
    currency: z.string().trim().regex(CURRENCY_PATTERN),
    sourceType: z.enum([
      "WELFARE_ACCRUAL",
      "CREDIT_NOTE_ACCOUNT",
      "INTERNAL_TRANSFER",
      "ADMIN_ADJUSTMENT",
    ]),
    sourceId: z.uuid(),
    reversalOfEntryId: z.uuid().nullable(),
    effectiveAt: z.iso.datetime({ offset: true }),
    postedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const welfareAccrualStatusSchema = z.enum([
  "PENDING",
  "BLOCKED",
  "CANCELLED",
  "CREDITED",
  "REVERSED",
]);

export const welfareAccrualSchema = z
  .object({
    accrualId: z.uuid(),
    invoiceId: z.uuid(),
    invoiceNumber: z.string().trim().min(1).max(256),
    dealerOrgUnitId: z.uuid(),
    dealerName: z.string().trim().min(1).max(256),
    walletId: z.uuid().nullable(),
    welfareRateId: z.uuid().nullable(),
    ratePercentageSnapshot: z
      .string()
      .trim()
      .regex(/^(?:0|[1-9][0-9]?|100)(?:\.[0-9]{1,4})?$/u)
      .nullable(),
    totalBasePrice: z.string().trim().regex(MONEY_PATTERN),
    welfareAmount: z.string().trim().regex(MONEY_PATTERN),
    currency: z.string().trim().regex(CURRENCY_PATTERN),
    invoiceCreatedAt: z.iso.datetime({ offset: true }),
    creditDueAt: z.iso.datetime({ offset: true }),
    status: welfareAccrualStatusSchema,
    blockedReason: z.string().trim().max(512).nullable(),
    creditEntryId: z.uuid().nullable(),
    reversalEntryId: z.uuid().nullable(),
    settlementTaskId: z.string().trim().min(1).max(512).nullable(),
    settlementTaskEnqueuedAt: z.iso.datetime({ offset: true }).nullable(),
    rowVersion: z.number().int().positive(),
    createdAt: z.iso.datetime({ offset: true }),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const creditNoteOfferStatusSchema = z.enum([
  "PENDING_QUALIFICATION",
  "QUALIFIED",
  "ACTIVE",
  "NOT_QUALIFIED",
  "EXPIRED",
  "FINALIZED",
]);

export const creditNoteSettlementStatusSchema = z.enum([
  "NOT_DUE",
  "PENDING",
  "POSTING",
  "SETTLED",
  "BLOCKED_PROVIDER_CONFIGURATION",
  "RECONCILIATION_REQUIRED",
  "ADJUSTMENT_REQUIRED",
  "NO_BENEFIT",
]);

export const creditNoteApprovalStatusSchema = z.enum([
  "APPROVED",
  "PENDING",
  "REJECTED",
  "NOT_REQUIRED",
  "UNKNOWN",
]);

const creditNotePeriodSchema = z
  .object({
    start: z.iso.date(),
    endExclusive: z.iso.date(),
    label: z.string().trim().min(1).max(64),
  })
  .strict();

export const creditNoteOverviewSchema = z
  .object({
    cycleId: z.uuid(),
    dealerOrgUnitId: z.uuid(),
    dealerName: z.string().trim().min(1).max(256),
    currency: z.string().trim().regex(CURRENCY_PATTERN),
    policy: z
      .object({
        policyId: z.uuid(),
        version: z.number().int().positive(),
        retailTargetCount: z.number().int().positive().max(10_000),
        purchaseCreditAmount: z.string().trim().regex(MONEY_PATTERN),
        currency: z.string().trim().regex(CURRENCY_PATTERN),
      })
      .strict(),
    performance: z
      .object({
        period: creditNotePeriodSchema,
        eligibleRetailVehicleCount: z.number().int().nonnegative(),
        targetRetailVehicleCount: z.number().int().positive(),
        vehiclesRemaining: z.number().int().nonnegative(),
        progressPercent: z.number().int().min(0).max(100),
        targetAchieved: z.boolean(),
        finalized: z.boolean(),
        finalizedAt: z.iso.datetime({ offset: true }).nullable(),
      })
      .strict(),
    offer: z
      .object({
        period: creditNotePeriodSchema,
        status: creditNoteOfferStatusSchema,
        isActive: z.boolean(),
        creditPerApprovedPurchaseVehicle: z
          .string()
          .trim()
          .regex(MONEY_PATTERN),
        approvedPurchaseVehicleCount: z.number().int().nonnegative(),
        projectedAmount: z.string().trim().regex(MONEY_PATTERN),
        accruedAmount: z.string().trim().regex(MONEY_PATTERN),
        closesAt: z.iso.date(),
        purchaseLastReconciledAt: z.iso.datetime({ offset: true }).nullable(),
      })
      .strict(),
    settlement: z
      .object({
        period: creditNotePeriodSchema,
        status: creditNoteSettlementStatusSchema,
        finalPurchaseVehicleCount: z.number().int().nonnegative().nullable(),
        finalAmount: z.string().trim().regex(MONEY_PATTERN).nullable(),
        zohoCreditNoteId: z.string().trim().min(1).max(256).nullable(),
        zohoCreditNoteNumber: z.string().trim().min(1).max(256).nullable(),
        settledAt: z.iso.datetime({ offset: true }).nullable(),
      })
      .strict(),
    opportunityMessage: z
      .object({
        tone: z.enum(["INFO", "SUCCESS", "WARNING"]),
        title: z.string().trim().min(1).max(160),
        description: z.string().trim().min(1).max(1_024),
        hypotheticalMissedAmount: z
          .string()
          .trim()
          .regex(MONEY_PATTERN)
          .nullable(),
      })
      .strict(),
    unsettledCreditNoteBalance: z.string().trim().regex(MONEY_PATTERN),
    lifetimeSettledAmount: z.string().trim().regex(MONEY_PATTERN),
    dataFreshness: z
      .object({
        generatedAt: z.iso.datetime({ offset: true }),
        zohoInvoiceLastFetchedAt: z.iso.datetime({ offset: true }).nullable(),
      })
      .strict(),
  })
  .strict();

export const creditNotePurchaseInvoiceSchema = z
  .object({
    invoiceProjectionId: z.uuid(),
    providerInvoiceId: z.string().trim().min(1).max(256),
    invoiceNumber: z.string().trim().min(1).max(256).nullable(),
    invoiceDate: z.iso.date().nullable(),
    providerStatus: z.string().trim().min(1).max(128).nullable(),
    approvalStatus: creditNoteApprovalStatusSchema,
    total: z.string().trim().regex(MONEY_PATTERN).nullable(),
    currency: z.string().trim().regex(CURRENCY_PATTERN).nullable(),
    shipmentId: z.uuid(),
    shipmentNumber: z.string().trim().min(1).max(256),
    vehicleCount: z.number().int().nonnegative(),
    countedVehicleCount: z.number().int().nonnegative(),
    providerLastFetchedAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();

export const creditNotePurchaseInvoicePageSchema = z
  .object({
    items: z.array(creditNotePurchaseInvoiceSchema).readonly(),
    nextCursor: z.string().trim().regex(SAFE_CURSOR_PATTERN).nullable(),
  })
  .strict();

function cursorPageSchema<TItem extends z.ZodType>(itemSchema: TItem) {
  return z
    .object({
      items: z.array(itemSchema).readonly(),
      nextCursor: z.string().trim().min(16).max(2048).nullable(),
    })
    .strict();
}

export const walletPageSchema = cursorPageSchema(walletSummarySchema);
export const walletEntryPageSchema = cursorPageSchema(walletEntrySchema);
export const welfareAccrualPageSchema = cursorPageSchema(welfareAccrualSchema);

const optionalUuidQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === "") {
    return undefined;
  }
  return value;
}, z.uuid().optional());

const optionalCursorQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === "") {
    return undefined;
  }
  return value;
}, z.string().trim().regex(SAFE_CURSOR_PATTERN).optional());

export const walletSearchParamsSchema = z
  .object({
    tab: z.enum(["welfare-fund", "credit-note"]).optional(),
    walletId: optionalUuidQuerySchema,
    entryCursor: optionalCursorQuerySchema,
    accrualCursor: optionalCursorQuerySchema,
    accrualStatus: welfareAccrualStatusSchema.optional(),
    creditNoteInvoiceCursor: optionalCursorQuerySchema,
  })
  .strict();

export type WalletType = z.infer<typeof walletTypeSchema>;
export type WalletStatus = z.infer<typeof walletStatusSchema>;
export type WalletSummary = z.infer<typeof walletSummarySchema>;
export type WalletEntry = z.infer<typeof walletEntrySchema>;
export type WalletEntryType = z.infer<typeof walletEntryTypeSchema>;
export type WelfareAccrual = z.infer<typeof welfareAccrualSchema>;
export type WelfareAccrualStatus = z.infer<typeof welfareAccrualStatusSchema>;
export type WalletPageData = z.infer<typeof walletPageSchema>;
export type WalletEntryPageData = z.infer<typeof walletEntryPageSchema>;
export type WelfareAccrualPageData = z.infer<typeof welfareAccrualPageSchema>;
export type WalletSearchParams = z.infer<typeof walletSearchParamsSchema>;
export type CreditNoteOfferStatus = z.infer<typeof creditNoteOfferStatusSchema>;
export type CreditNoteSettlementStatus = z.infer<
  typeof creditNoteSettlementStatusSchema
>;
export type CreditNoteApprovalStatus = z.infer<
  typeof creditNoteApprovalStatusSchema
>;
export type CreditNoteOverview = z.infer<typeof creditNoteOverviewSchema>;
export type CreditNotePurchaseInvoice = z.infer<
  typeof creditNotePurchaseInvoiceSchema
>;
export type CreditNotePurchaseInvoicePage = z.infer<
  typeof creditNotePurchaseInvoicePageSchema
>;
export type WalletRawSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

export type WalletWorkspaceData = Readonly<{
  welfareWallets: readonly WalletSummary[];
  creditNoteWalletCount: number;
  selectedWallet: WalletSummary | null;
  entries: WalletEntryPageData | null;
  accruals: WelfareAccrualPageData | null;
  creditNoteOverview: CreditNoteOverview | null;
  creditNotePurchaseInvoices: CreditNotePurchaseInvoicePage | null;
}>;

function singleSearchParam(
  value: string | readonly string[] | undefined,
): string | readonly string[] | undefined {
  if (typeof value === "string" || value === undefined) {
    return value;
  }

  return value.length === 1 ? value[0] : value;
}

export function parseWalletSearchParams(raw: WalletRawSearchParams) {
  return walletSearchParamsSchema.safeParse({
    tab: singleSearchParam(raw["tab"]),
    walletId: singleSearchParam(raw["walletId"]),
    entryCursor: singleSearchParam(raw["entryCursor"]),
    accrualCursor: singleSearchParam(raw["accrualCursor"]),
    accrualStatus: singleSearchParam(raw["accrualStatus"]),
    creditNoteInvoiceCursor: singleSearchParam(raw["creditNoteInvoiceCursor"]),
  });
}

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
    walletId: optionalUuidQuerySchema,
    entryCursor: optionalCursorQuerySchema,
    accrualCursor: optionalCursorQuerySchema,
    accrualStatus: welfareAccrualStatusSchema.optional(),
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
export type WalletRawSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

export type WalletWorkspaceData = Readonly<{
  welfareWallets: readonly WalletSummary[];
  creditNoteWalletCount: number;
  selectedWallet: WalletSummary | null;
  entries: WalletEntryPageData | null;
  accruals: WelfareAccrualPageData | null;
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
    walletId: singleSearchParam(raw["walletId"]),
    entryCursor: singleSearchParam(raw["entryCursor"]),
    accrualCursor: singleSearchParam(raw["accrualCursor"]),
    accrualStatus: singleSearchParam(raw["accrualStatus"]),
  });
}

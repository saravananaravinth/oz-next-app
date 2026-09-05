import { z } from "zod";

const money = z.string().regex(/^\d+(?:\.\d+)?$/u);
const currency = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/u);

export const purchaseSourceSchema = z.enum(["ZOHO", "D2D"]);
const purchaseOfferStatusSchema = z.enum([
  "PENDING_QUALIFICATION",
  "QUALIFIED",
  "ACTIVE",
  "NOT_QUALIFIED",
  "EXPIRED",
  "FINALIZED",
]);
const purchaseSettlementStatusSchema = z.enum([
  "NOT_DUE",
  "PENDING",
  "POSTING",
  "SETTLED",
  "BLOCKED_PROVIDER_CONFIGURATION",
  "RECONCILIATION_REQUIRED",
  "ADJUSTMENT_REQUIRED",
  "NO_BENEFIT",
]);

export const purchaseInvoiceSchema = z
  .object({
    source: purchaseSourceSchema,
    invoiceId: z.uuid(),
    sourceInvoiceIdentifier: z.string().trim().min(1).max(256),
    invoiceNumber: z.string().nullable(),
    invoiceDate: z.iso.date(),
    seller: z.string().nullable(),
    status: z.string().nullable(),
    total: money.nullable(),
    currency,
    vehicleCount: z.number().int().nonnegative().nullable(),
    approvedVehicleCount: z.number().int().nonnegative(),
    contribution: money,
    exclusionReason: z.string().nullable(),
    pdfAvailable: z.boolean(),
    sourceAvailable: z.boolean(),
  })
  .strict();

export const purchaseCycleSchema = z
  .object({
    cycleId: z.uuid(),
    performanceStart: z.iso.date(),
    performanceEndExclusive: z.iso.date(),
    offerStart: z.iso.date(),
    offerEndExclusive: z.iso.date(),
    settlementStart: z.iso.date(),
    settlementEndExclusive: z.iso.date(),
    currency,
    retailSaleCount: z.number().int().nonnegative(),
    retailTargetCount: z.number().int().positive(),
    qualified: z.boolean(),
    creditPerVehicle: money,
    approvedVehicleCount: z.number().int().nonnegative(),
    amount: money,
    offerStatus: purchaseOfferStatusSchema,
    settlementStatus: purchaseSettlementStatusSchema,
    finalized: z.boolean(),
    settledAt: z.iso.datetime({ offset: true }).nullable(),
    reconciledAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();

export const purchasesPageSchema = z
  .object({
    cycle: purchaseCycleSchema.nullable(),
    cycles: z.array(
      z.object({ cycleId: z.uuid(), offerStart: z.iso.date() }).strict(),
    ),
    evidenceVehicleCount: z.number().int().nonnegative(),
    evidenceAmount: money,
    evidenceConsistent: z.boolean(),
    items: z.array(purchaseInvoiceSchema),
    nextCursor: z.string().nullable(),
  })
  .strict();

export const purchaseDetailSchema = z
  .object({
    cycle: purchaseCycleSchema,
    invoice: purchaseInvoiceSchema,
    vehicles: z.array(
      z
        .object({
          vin: z.string().nullable(),
          contribution: money,
          finalized: z.boolean(),
        })
        .strict(),
    ),
  })
  .strict();

export type PurchaseInvoice = z.infer<typeof purchaseInvoiceSchema>;
export type PurchasePage = z.infer<typeof purchasesPageSchema>;
export type PurchaseDetail = z.infer<typeof purchaseDetailSchema>;

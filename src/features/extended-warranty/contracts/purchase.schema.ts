// oz-next-app/src/features/extended-warranty/contracts/purchase.schema.ts
import { z } from "zod";

const minorAmountSchema = z.string().regex(/^\d{1,20}$/u);
const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
const publicTokenSchema = z
  .string()
  .trim()
  .min(32)
  .max(256)
  .regex(/^[A-Za-z0-9._~-]+$/u);
const basisPointsSchema = z.number().int().min(0).max(10_000);

const purchaseAddressSchema = z
  .object({
    lines: z.array(z.string().trim().min(1).max(256)).min(1).max(8).readonly(),
  })
  .strict();

const warrantyCoverageSchema = z
  .object({
    coverageStartDate: calendarDateSchema,
    coverageEndDate: calendarDateSchema.nullable(),
    durationMonths: z.number().int().min(0).max(1_200).nullable(),
    distanceLimitKm: z.number().int().min(0).max(10_000_000).nullable(),
    cycleLimit: z.number().int().min(0).max(10_000_000).nullable(),
    sohThresholdPercent: z
      .string()
      .regex(/^\d{1,3}(?:\.\d{1,2})?$/u)
      .nullable(),
  })
  .strict();

const warrantyCoverageGroupSchema = z
  .object({
    componentCount: z.number().int().min(1).max(64),
    standard: warrantyCoverageSchema,
    extended: warrantyCoverageSchema.nullable(),
    total: z
      .object({
        coverageStartDate: calendarDateSchema,
        coverageEndDate: calendarDateSchema.nullable(),
        durationMonths: z.number().int().min(0).max(2_400).nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();

const purchaseTaxSchema = z
  .object({
    kind: z.enum(["CGST_SGST", "IGST", "GST"]),
    totalAmountMinor: minorAmountSchema,
    cgstRateBps: basisPointsSchema.nullable(),
    cgstAmountMinor: minorAmountSchema.nullable(),
    sgstRateBps: basisPointsSchema.nullable(),
    sgstAmountMinor: minorAmountSchema.nullable(),
    igstRateBps: basisPointsSchema.nullable(),
    igstAmountMinor: minorAmountSchema.nullable(),
  })
  .strict();

export const extendedWarrantyPurchaseOptionSchema = z
  .object({
    offerOptionId: z.uuid(),
    kitProductId: z.uuid(),
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2_000).nullable(),
    imageAvailable: z.boolean(),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/u),
    unitAmountMinor: minorAmountSchema,
    taxRateBps: basisPointsSchema,
    tax: purchaseTaxSchema,
    shippingAmountMinor: minorAmountSchema,
    paymentGatewayFeeMinor: minorAmountSchema,
    totalAmountMinor: minorAmountSchema,
    warranty: z
      .object({
        componentType: z.literal("BATTERY"),
        coverageGroups: z.array(warrantyCoverageGroupSchema).max(16).readonly(),
      })
      .strict(),
  })
  .strict();

export const extendedWarrantyPublicOrderSchema = z
  .object({
    orderId: z.uuid(),
    orderNumber: z.string().trim().min(1).max(128),
    offerOptionId: z.uuid(),
    status: z.string().trim().min(1).max(64),
  })
  .strict();

export const extendedWarrantyPurchaseSchema = z
  .object({
    offerId: z.uuid(),
    status: z.string().trim().min(1).max(64),
    expiresAt: z.iso.datetime({ offset: true }),
    linkExpiresAt: z.iso.datetime({ offset: true }),
    vehicleLabel: z.string().trim().min(1).max(256),
    buyer: z
      .object({
        name: z.string().trim().min(1).max(256),
        maskedPhone: z.string().trim().min(1).max(64).nullable(),
        customerType: z.string().trim().min(1).max(64),
        gstin: z.string().trim().min(1).max(32).nullable(),
        addressesAreSame: z.boolean(),
        billingAddress: purchaseAddressSchema.nullable(),
        shippingAddress: purchaseAddressSchema.nullable(),
      })
      .strict(),
    order: extendedWarrantyPublicOrderSchema.nullable(),
    options: z
      .array(extendedWarrantyPurchaseOptionSchema)
      .min(1)
      .max(16)
      .readonly(),
  })
  .strict();

export const extendedWarrantyCheckoutSchema = z
  .object({
    orderId: z.uuid(),
    orderNumber: z.string().trim().min(1).max(128),
    orderStatus: z.string().trim().min(1).max(64),
    checkout: z
      .object({
        provider: z.literal("RAZORPAY"),
        clientKeyId: z.string().trim().min(1).max(256),
        providerOrderId: z.string().trim().min(1).max(256),
        amountMinor: minorAmountSchema,
        currency: z
          .string()
          .trim()
          .regex(/^[A-Z]{3}$/u),
      })
      .strict(),
  })
  .strict();

export const extendedWarrantyPaymentStatusSchema = z
  .object({
    order: extendedWarrantyPublicOrderSchema.nullable(),
    payment: z
      .object({
        intentStatus: z.string().trim().min(1).max(64),
        checkoutStatus: z.string().trim().min(1).max(64).nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export type ExtendedWarrantyPurchase = z.infer<
  typeof extendedWarrantyPurchaseSchema
>;
export type ExtendedWarrantyPurchaseOption = z.infer<
  typeof extendedWarrantyPurchaseOptionSchema
>;
export type ExtendedWarrantyCheckout = z.infer<
  typeof extendedWarrantyCheckoutSchema
>;
export type ExtendedWarrantyPaymentStatus = z.infer<
  typeof extendedWarrantyPaymentStatusSchema
>;

export function buildExtendedWarrantyPurchasePath(
  token: string,
): `/erp/extended-warranty/public/purchase/${string}` {
  const parsed = publicTokenSchema.parse(token);
  return `/erp/extended-warranty/public/purchase/${encodeURIComponent(parsed)}`;
}

export function buildExtendedWarrantyPurchaseDetailsPath(
  token: string,
): `/erp/extended-warranty/public/purchase/${string}/details` {
  return `${buildExtendedWarrantyPurchasePath(token)}/details`;
}

export function buildExtendedWarrantyPurchaseOptionImageEdgePath(
  token: string,
  offerOptionId: string,
): `/erp/extended-warranty/public/purchase/${string}/options/${string}/image` {
  const parsedToken = publicTokenSchema.parse(token);
  const parsedOfferOptionId = z.uuid().parse(offerOptionId);
  return `/erp/extended-warranty/public/purchase/${encodeURIComponent(parsedToken)}/options/${encodeURIComponent(parsedOfferOptionId)}/image`;
}

export function buildExtendedWarrantyCheckoutPath(
  token: string,
): `/erp/extended-warranty/public/purchase/${string}/checkout` {
  return `${buildExtendedWarrantyPurchasePath(token)}/checkout`;
}

export function buildExtendedWarrantyPaymentStatusPath(
  token: string,
): `/erp/extended-warranty/public/purchase/${string}/payment-status` {
  return `${buildExtendedWarrantyPurchasePath(token)}/payment-status`;
}

export { publicTokenSchema as extendedWarrantyPublicTokenSchema };

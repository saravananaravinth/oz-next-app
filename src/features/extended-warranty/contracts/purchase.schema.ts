// oz-next-app/src/features/extended-warranty/contracts/purchase.schema.ts
import { z } from "zod";

const minorAmountSchema = z.string().regex(/^\d{1,20}$/u);
const publicTokenSchema = z
  .string()
  .trim()
  .min(32)
  .max(256)
  .regex(/^[A-Za-z0-9._~-]+$/u);

export const extendedWarrantyPurchaseOptionSchema = z
  .object({
    offerOptionId: z.uuid(),
    kitProductId: z.uuid(),
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2_000).nullable(),
    coverageSummary: z.string().trim().max(2_000).nullable(),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/u),
    unitAmountMinor: minorAmountSchema,
    taxAmountMinor: minorAmountSchema,
    totalAmountMinor: minorAmountSchema,
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
    vehicleLabel: z.string().trim().min(1).max(256),
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

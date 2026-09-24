// oz-next-app/src/features/extended-warranty/contracts/order-status.schema.ts
import { z } from "zod";

export const EXTENDED_WARRANTY_INSTALLATION_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
] as const;
export const EXTENDED_WARRANTY_INSTALLATION_VIDEO_MAX_BYTES = 20 * 1024 * 1024;

const publicOrderTokenSchema = z
  .string()
  .trim()
  .min(43)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);
const nullableBoundedText = z.string().trim().min(1).max(256).nullable();
const nullableDateTime = z.iso.datetime({ offset: true }).nullable();

export const extendedWarrantyOrderStatusSchema = z
  .object({
    orderId: z.uuid(),
    orderNumber: z.string().trim().min(1).max(128),
    orderStatus: z.string().trim().min(1).max(64),
    vehicleLabel: z.string().trim().min(1).max(256),
    kitName: z.string().trim().min(1).max(256),
    payment: z
      .object({
        confirmed: z.boolean(),
        confirmedAt: nullableDateTime,
      })
      .strict(),
    zoho: z
      .object({
        salesOrderNumber: nullableBoundedText,
        invoiceNumber: nullableBoundedText,
      })
      .strict(),
    shipment: z
      .object({
        status: nullableBoundedText,
        shipmentNumber: nullableBoundedText,
        carrierName: nullableBoundedText,
        trackingNumber: nullableBoundedText,
        trackingUrl: z
          .url()
          .refine((value: string) => value.startsWith("https://"))
          .nullable(),
        estimatedDeliveryAt: nullableDateTime,
        deliveredAt: nullableDateTime,
      })
      .strict(),
    installation: z
      .object({
        status: z
          .enum([
            "UPLOADED",
            "SCANNING",
            "READY_FOR_REVIEW",
            "APPROVED",
            "REJECTED",
            "SUPERSEDED",
            "QUARANTINED",
          ])
          .nullable(),
        submittedAt: nullableDateTime,
        canUpload: z.boolean(),
      })
      .strict(),
    approval: z
      .object({
        status: z.enum(["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"]),
        reviewedAt: nullableDateTime,
      })
      .strict(),
    certificate: z
      .object({
        available: z.boolean(),
        downloadUrl: z
          .url()
          .refine((value: string) => value.startsWith("https://"))
          .nullable(),
        downloadUrlExpiresAt: nullableDateTime,
      })
      .strict(),
  })
  .strict();

export const extendedWarrantyInstallationUploadIntentSchema = z
  .object({
    uploadId: z.uuid(),
    fileId: z.uuid(),
    uploadUrl: z.url(),
    method: z.literal("PUT"),
    requiredHeaders: z.record(z.string(), z.string()),
    expiresAt: z.iso.datetime({ offset: true }),
    maxBytes: z
      .number()
      .int()
      .positive()
      .max(EXTENDED_WARRANTY_INSTALLATION_VIDEO_MAX_BYTES),
  })
  .strict();

export const extendedWarrantyInstallationFinalizeSchema = z
  .object({
    fileId: z.uuid(),
    installationStatus: z.string().trim().min(1).max(64),
    orderStatus: z.string().trim().min(1).max(64),
  })
  .strict();

export type ExtendedWarrantyOrderStatus = z.infer<
  typeof extendedWarrantyOrderStatusSchema
>;
export type ExtendedWarrantyInstallationUploadIntent = z.infer<
  typeof extendedWarrantyInstallationUploadIntentSchema
>;
export type ExtendedWarrantyInstallationFinalize = z.infer<
  typeof extendedWarrantyInstallationFinalizeSchema
>;

export function buildExtendedWarrantyOrderStatusPath(
  token: string,
): `/erp/extended-warranty/public/order/${string}` {
  const parsed = publicOrderTokenSchema.parse(token);
  return `/erp/extended-warranty/public/order/${encodeURIComponent(parsed)}`;
}

export function buildExtendedWarrantyInstallationUploadPath(
  token: string,
): `/erp/extended-warranty/public/order/${string}/installation-upload` {
  return `${buildExtendedWarrantyOrderStatusPath(token)}/installation-upload`;
}

export function buildExtendedWarrantyInstallationFinalizePath(
  token: string,
  uploadId: string,
): `/erp/extended-warranty/public/order/${string}/installation-upload/${string}/finalize` {
  const parsedUploadId = z.uuid().parse(uploadId);
  return `${buildExtendedWarrantyInstallationUploadPath(token)}/${encodeURIComponent(parsedUploadId)}/finalize`;
}

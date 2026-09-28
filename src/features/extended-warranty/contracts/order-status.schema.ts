// oz-next-app/src/features/extended-warranty/contracts/order-status.schema.ts
import { z } from "zod";

export const EXTENDED_WARRANTY_INSTALLATION_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
] as const;
export const EXTENDED_WARRANTY_INSTALLATION_VIDEO_MAX_BYTES = 20 * 1024 * 1024;
export const EXTENDED_WARRANTY_INSTALLATION_VIDEO_MAX_DURATION_MS = 60_000;

const publicOrderTokenSchema = z
  .string()
  .trim()
  .min(43)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);
const nullableBoundedText = z.string().trim().min(1).max(256).nullable();
const nullableDateTime = z.iso.datetime({ offset: true }).nullable();
const evidenceStatusSchema = z.enum([
  "UPLOADED",
  "SCANNING",
  "READY_FOR_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUPERSEDED",
  "QUARANTINED",
]);

const providerResourceSchema = z
  .object({
    number: nullableBoundedText,
    status: nullableBoundedText,
    updatedAt: nullableDateTime,
  })
  .strict();

const installationHistoryItemSchema = z
  .object({
    evidenceId: z.uuid(),
    revisionNo: z.number().int().min(1),
    status: evidenceStatusSchema,
    submittedAt: z.iso.datetime({ offset: true }),
    review: z
      .object({
        decision: z.enum(["APPROVED", "REJECTED"]),
        reviewedAt: z.iso.datetime({ offset: true }),
      })
      .strict()
      .nullable(),
  })
  .strict();

const timelineItemSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    occurredAt: z.iso.datetime({ offset: true }),
    eventType: z.string().trim().min(1).max(128),
  })
  .strict();

export const extendedWarrantyOrderStatusSchema = z
  .object({
    orderId: z.uuid(),
    orderNumber: z.string().trim().min(1).max(128),
    orderStatus: z.string().trim().min(1).max(64),
    orderCreatedAt: z.iso.datetime({ offset: true }),
    vehicleLabel: z.string().trim().min(1).max(256),
    kitName: z.string().trim().min(1).max(256),
    payment: z
      .object({
        confirmed: z.boolean(),
        confirmedAt: nullableDateTime,
        currency: z.string().trim().length(3),
        totalAmountMinor: z.string().regex(/^\d+$/u),
      })
      .strict(),
    salesOrder: providerResourceSchema,
    invoice: providerResourceSchema,
    packages: z.array(providerResourceSchema).max(50),
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
        status: evidenceStatusSchema.nullable(),
        submittedAt: nullableDateTime,
        revisionNo: z.number().int().min(1).nullable(),
        canUpload: z.boolean(),
      })
      .strict(),
    installationHistory: z.array(installationHistoryItemSchema).max(20),
    approval: z
      .object({
        status: z.enum(["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"]),
        reviewedAt: nullableDateTime,
      })
      .strict(),
    certificate: z
      .object({
        available: z.boolean(),
        certificateNumber: nullableBoundedText,
        downloadUrl: z
          .url()
          .refine((value: string) => value.startsWith("https://"))
          .nullable(),
        downloadUrlExpiresAt: nullableDateTime,
      })
      .strict(),
    timeline: z.array(timelineItemSchema).max(100),
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

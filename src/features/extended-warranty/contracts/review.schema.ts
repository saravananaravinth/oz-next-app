// oz-next-app/src/features/extended-warranty/contracts/review.schema.ts
import { z } from "zod";

const nullableText = z.string().trim().min(1).max(512).nullable();
const nullableDate = z.iso.datetime({ offset: true }).nullable();

export const extendedWarrantyReviewQueueItemSchema = z
  .object({
    orderId: z.uuid(),
    orderNumber: z.string().trim().min(1).max(128),
    orderStatus: z.string().trim().min(1).max(64),
    orderRowVersion: z.number().int().min(1),
    evidenceId: z.uuid(),
    evidenceStatus: z.string().trim().min(1).max(64),
    evidenceRowVersion: z.number().int().min(1),
    revisionNo: z.number().int().min(1),
    submittedAt: z.iso.datetime({ offset: true }),
    activityAt: z.iso.datetime({ offset: true }),
    pending: z.boolean(),
    customerName: z.string().trim().min(1).max(256),
    vehicleVin: nullableText,
    kitName: z.string().trim().min(1).max(256),
    decision: z.enum(["APPROVED", "REJECTED"]).nullable(),
    reasonCode: nullableText,
    reviewedAt: nullableDate,
  })
  .strict();

export const extendedWarrantyReviewQueueSchema = z
  .object({
    items: z.array(extendedWarrantyReviewQueueItemSchema).max(100),
    pageInfo: z
      .object({
        limit: z.number().int().min(1).max(100),
        hasNextPage: z.boolean(),
        nextCursor: z.string().trim().min(1).max(1024).nullable(),
      })
      .strict(),
  })
  .strict();

export const extendedWarrantyReviewDetailSchema =
  extendedWarrantyReviewQueueItemSchema
    .extend({
      tenantId: z.uuid(),
      fileId: z.uuid(),
      fileName: z.string().trim().min(1).max(512),
      fileMimeType: nullableText,
      fileSizeBytes: z.string().regex(/^\d+$/u).nullable(),
      clientRecordedAt: nullableDate,
      mediaRecordedAt: nullableDate,
      locationCapturedAt: z.iso.datetime({ offset: true }),
      latitude: z
        .string()
        .trim()
        .regex(/^-?\d+(?:\.\d+)?$/u),
      longitude: z
        .string()
        .trim()
        .regex(/^-?\d+(?:\.\d+)?$/u),
      accuracyMeters: z
        .string()
        .trim()
        .regex(/^\d+(?:\.\d+)?$/u)
        .nullable(),
      locationSource: z.string().trim().min(1).max(64),
      reviewId: z.uuid().nullable(),
      reviewerUserId: z.uuid().nullable(),
      notes: z.string().max(2000).nullable(),
      activationId: z.uuid().nullable(),
      activationStatus: nullableText,
      extendedVehicleEntitlementId: z.uuid().nullable(),
      certificateId: z.uuid().nullable(),
      certificateNumber: nullableText,
      certificateStatus: nullableText,
      certificateFileId: z.uuid().nullable(),
      videoUrl: z.url().refine((value) => value.startsWith("https://")),
      videoUrlExpiresAt: z.iso.datetime({ offset: true }),
    })
    .strict();

export const extendedWarrantyReviewDecisionInputSchema = z
  .object({
    orderId: z.uuid(),
    decision: z.enum(["APPROVED", "REJECTED"]),
    reasonCode: z.string().trim().min(2).max(64),
    notes: z.string().trim().max(2000).nullable(),
    orderRowVersion: z.number().int().min(1),
    evidenceRowVersion: z.number().int().min(1),
    idempotencyKey: z
      .string()
      .trim()
      .min(16)
      .max(200)
      .regex(/^[A-Za-z0-9._:@/-]+$/u),
  })
  .strict();

export const extendedWarrantyReviewDecisionResultSchema = z
  .object({
    reviewId: z.uuid(),
    activationId: z.uuid().nullable(),
  })
  .strict();

export type ExtendedWarrantyReviewQueue = z.infer<
  typeof extendedWarrantyReviewQueueSchema
>;
export type ExtendedWarrantyReviewQueueItem = z.infer<
  typeof extendedWarrantyReviewQueueItemSchema
>;
export type ExtendedWarrantyReviewDetail = z.infer<
  typeof extendedWarrantyReviewDetailSchema
>;
export type ExtendedWarrantyReviewDecisionInput = z.infer<
  typeof extendedWarrantyReviewDecisionInputSchema
>;

export function buildExtendedWarrantyReviewsPath(
  input: Readonly<{
    filter: "PENDING" | "HISTORY" | "ALL";
    limit: number;
    cursor?: string | null;
  }>,
): string {
  const query = new URLSearchParams({
    filter: input.filter,
    limit: String(input.limit),
  });
  if (input.cursor !== undefined && input.cursor !== null)
    query.set("cursor", input.cursor);
  return `/erp/extended-warranty/reviews?${query.toString()}`;
}

export function buildExtendedWarrantyReviewOrderPath(orderId: string): string {
  return `/erp/extended-warranty/orders/${encodeURIComponent(z.uuid().parse(orderId))}/review`;
}

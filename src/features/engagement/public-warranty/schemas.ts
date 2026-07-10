// oz-next-app/src/features/engagement/public-warranty/schemas.ts
import { z } from "zod";

const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9._~:-]+$/u;
const INDIAN_MOBILE_DIGITS_PATTERN = /^[6-9][0-9]{9}$/u;
const INDIAN_MOBILE_E164_PATTERN = /^\+91[6-9][0-9]{9}$/u;
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/u;
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{11,17}$/u;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9_.:/@-]+$/u;

export const WARRANTY_APPLICATION_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const WARRANTY_APPLICATION_MAX_SERVICE_INVOICE_FILES = 10;

export const WARRANTY_APPLICATION_ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const WARRANTY_APPLICATION_ALLOWED_UPLOAD_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
] as const;

export const WARRANTY_APPLICATION_UPLOAD_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp";

const emailSchema = z.string().trim().max(320).pipe(z.email());

const requiredText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} is too long.`);

export const publicWarrantyTokenSchema = z
  .string()
  .trim()
  .min(32)
  .max(256)
  .regex(SAFE_TOKEN_PATTERN);

export const warrantyApplicationFilePurposeSchema = z.enum([
  "PURCHASE_INVOICE",
  "SERVICE_INVOICE",
]);

export type WarrantyApplicationFilePurpose = z.infer<
  typeof warrantyApplicationFilePurposeSchema
>;

export const warrantyApplicationFormSchema = z
  .object({
    name: requiredText(256, "Customer name"),
    mobileNumber: z
      .string()
      .trim()
      .regex(
        INDIAN_MOBILE_DIGITS_PATTERN,
        "Enter a valid 10-digit mobile number.",
      ),
    email: z.union([z.literal(""), emailSchema]).optional(),

    addressLine1: requiredText(512, "Address line 1"),
    addressLine2: optionalText(512, "Address line 2"),
    city: requiredText(128, "City"),
    postalCode: z
      .string()
      .trim()
      .regex(PINCODE_PATTERN, "Enter a valid 6-digit PIN code."),
    district: requiredText(128, "District"),
    state: requiredText(128, "State"),

    vinNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(VIN_PATTERN, "Enter a valid VIN or serial number."),
    componentDetails: requiredText(4_000, "Component details"),
  })
  .strict();

export type WarrantyApplicationFormValues = z.infer<
  typeof warrantyApplicationFormSchema
>;

export const warrantyApplicationSubmitRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(256),
    mobileNumber: z.string().trim().regex(INDIAN_MOBILE_E164_PATTERN),
    email: emailSchema.optional(),

    addressLine1: z.string().trim().min(1).max(512),
    addressLine2: z.string().trim().max(512).optional(),
    city: z.string().trim().min(1).max(128),
    district: z.string().trim().min(1).max(128),
    state: z.string().trim().min(1).max(128),
    postalCode: z.string().trim().regex(PINCODE_PATTERN),

    vinNumber: z.string().trim().toUpperCase().regex(VIN_PATTERN),
    componentDetails: z.string().trim().min(1).max(4_000),
    purchaseInvoiceFileId: z.string().trim().regex(UUID_PATTERN),
    serviceInvoiceFileIds: z
      .array(z.string().trim().regex(UUID_PATTERN))
      .min(1)
      .max(WARRANTY_APPLICATION_MAX_SERVICE_INVOICE_FILES),
  })
  .strict();

export type WarrantyApplicationSubmitRequest = z.infer<
  typeof warrantyApplicationSubmitRequestSchema
>;

export const warrantyApplicationSubmitResponseSchema = z
  .object({
    accepted: z.literal(true),
    tenantId: z.uuid(),
    leadId: z.uuid(),
    formSubmissionId: z.uuid(),
  })
  .strict();

export type WarrantyApplicationSubmitResponse = z.infer<
  typeof warrantyApplicationSubmitResponseSchema
>;

export const warrantyApplicationUploadedFileSchema = z
  .object({
    fileId: z.uuid(),
    fileName: z.string().trim().min(1).max(512),
    mimeType: z.enum(WARRANTY_APPLICATION_ALLOWED_UPLOAD_MIME_TYPES),
    sizeBytes: z
      .number()
      .int()
      .min(1)
      .max(WARRANTY_APPLICATION_UPLOAD_MAX_BYTES),
  })
  .strict();

export type WarrantyApplicationUploadedFile = z.infer<
  typeof warrantyApplicationUploadedFileSchema
>;

export const warrantyApplicationUploadFileEnvelopeSchema = z
  .object({
    success: z.literal(true),
    data: warrantyApplicationUploadedFileSchema,
    request_id: z.string().trim().min(1).max(128).regex(SAFE_REFERENCE_PATTERN),
    timestamp: z.string().trim().min(1).max(128),
  })
  .strict();

export type WarrantyApplicationUploadFileEnvelope = z.infer<
  typeof warrantyApplicationUploadFileEnvelopeSchema
>;

const warrantyApplicationProblemFieldSchema = z
  .object({
    path: z.string().trim().min(1).max(512),
    message: z.string().trim().min(1).max(1_024),
  })
  .strict();

export const warrantyApplicationProblemEnvelopeSchema = z
  .object({
    type: z.string().trim().min(1).max(2_048),
    title: z.string().trim().min(1).max(256),
    status: z.number().int().min(400).max(599),
    detail: z.string().trim().max(4_096),
    code: z.union([z.string().trim().min(1).max(160), z.number().int()]),
    request_id: z.string().trim().min(1).max(128).regex(SAFE_REFERENCE_PATTERN),
    timestamp: z.string().trim().min(1).max(128),
    invalid_params: z.array(warrantyApplicationProblemFieldSchema).optional(),
  })
  .strict();

export type WarrantyApplicationProblemEnvelope = z.infer<
  typeof warrantyApplicationProblemEnvelopeSchema
>;

export function buildPublicWarrantyApplicationSubmitPath(
  token: string,
): `/erp/engagement/public/forms/warranty/${string}` {
  const parsedToken = publicWarrantyTokenSchema.parse(token);

  return `/erp/engagement/public/forms/warranty/${encodeURIComponent(parsedToken)}`;
}

export function buildPublicWarrantyApplicationFileUploadPath(
  token: string,
): `/erp/engagement/public/forms/warranty/${string}/files` {
  const parsedToken = publicWarrantyTokenSchema.parse(token);

  return `/erp/engagement/public/forms/warranty/${encodeURIComponent(parsedToken)}/files`;
}

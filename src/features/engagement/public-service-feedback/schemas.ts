// oz-next-app/src/features/engagement/public-service-feedback/schemas.ts
import { z } from "zod";

const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9._~:-]+$/u;
const MOBILE_PATTERN = /^\+?[1-9][0-9]{7,14}$/u;
const INDIAN_MOBILE_PATTERN = /^[6-9][0-9]{9}$/u;
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/u;

const emailValueSchema = z.string().trim().max(320).pipe(z.email());

function requiredText(maxLength: number, label: string): z.ZodString {
  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(maxLength, `${label} is too long.`);
}

function optionalText(maxLength: number, label: string): z.ZodString {
  return z.string().trim().max(maxLength, `${label} is too long.`);
}

export const publicServiceFeedbackTokenSchema = z
  .string()
  .trim()
  .min(32)
  .max(256)
  .regex(SAFE_TOKEN_PATTERN);

export const serviceFeedbackIssueCategorySchema = z.enum([
  "GENERAL_SERVICE",
  "BATTERY",
  "MOTOR_CONTROLLER",
  "CHARGER",
  "BRAKE_TYRE",
  "SPARE_PARTS",
  "DEALER_EXPERIENCE",
  "WARRANTY",
  "OTHER",
]);

export type ServiceFeedbackIssueCategory = z.infer<
  typeof serviceFeedbackIssueCategorySchema
>;

export const serviceFeedbackFormSchema = z
  .object({
    name: requiredText(256, "Name"),
    mobileNumber: z
      .string()
      .trim()
      .regex(INDIAN_MOBILE_PATTERN, "Enter a valid 10-digit mobile number."),
    email: z
      .string()
      .trim()
      .max(320, "Email is too long.")
      .refine(
        (value) =>
          value.length === 0 || emailValueSchema.safeParse(value).success,
        "Enter a valid email address.",
      ),
    issueCategory: serviceFeedbackIssueCategorySchema,
    feedback: requiredText(8_000, "Feedback"),
    addressLine1: requiredText(512, "Address line 1"),
    addressLine2: optionalText(512, "Address line 2"),
    city: requiredText(128, "City"),
    district: requiredText(128, "District"),
    state: requiredText(128, "State"),
    postalCode: z
      .string()
      .trim()
      .regex(PINCODE_PATTERN, "Enter a valid 6-digit PIN code."),
  })
  .strict();

export type ServiceFeedbackFormValues = z.infer<
  typeof serviceFeedbackFormSchema
>;

export const serviceFeedbackSubmitRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(256),
    mobileNumber: z.string().trim().regex(MOBILE_PATTERN),
    email: emailValueSchema.optional(),
    issueCategory: z.string().trim().min(1).max(128),
    feedback: z.string().trim().min(1).max(8_000),
    addressLine1: z.string().trim().min(1).max(512),
    addressLine2: z.string().trim().max(512).optional(),
    city: z.string().trim().min(1).max(128),
    district: z.string().trim().min(1).max(128),
    state: z.string().trim().min(1).max(128),
    postalCode: z.string().trim().regex(PINCODE_PATTERN),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .strict();

export type ServiceFeedbackSubmitRequest = z.infer<
  typeof serviceFeedbackSubmitRequestSchema
>;

export const serviceFeedbackSubmitResponseSchema = z
  .object({
    accepted: z.literal(true),
    tenantId: z.uuid(),
    leadId: z.uuid(),
    formSubmissionId: z.uuid(),
  })
  .strict();

export type ServiceFeedbackSubmitResponse = z.infer<
  typeof serviceFeedbackSubmitResponseSchema
>;

export function buildPublicServiceFeedbackSubmitPath(
  token: string,
): `/erp/engagement/public/forms/service-feedback/${string}` {
  const parsedToken = publicServiceFeedbackTokenSchema.parse(token);

  return `/erp/engagement/public/forms/service-feedback/${encodeURIComponent(
    parsedToken,
  )}`;
}

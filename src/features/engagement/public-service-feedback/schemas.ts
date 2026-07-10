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

const optionalPostalCodeSchema = z
  .string()
  .trim()
  .max(6, "PIN code is too long.")
  .refine(
    (value) => value.length === 0 || PINCODE_PATTERN.test(value),
    "Enter a valid 6-digit PIN code.",
  );

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

export const serviceFeedbackLocationModeSchema = z.enum(["GPS", "MANUAL"]);

export type ServiceFeedbackIssueCategory = z.infer<
  typeof serviceFeedbackIssueCategorySchema
>;
export type ServiceFeedbackLocationMode = z.infer<
  typeof serviceFeedbackLocationModeSchema
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
    feedback: requiredText(8_000, "Feedback or complaint"),

    locationMode: serviceFeedbackLocationModeSchema,
    addressLine1: optionalText(512, "Address line 1"),
    addressLine2: optionalText(512, "Address line 2"),
    city: optionalText(128, "City"),
    district: optionalText(128, "District"),
    state: optionalText(128, "State"),
    postalCode: optionalPostalCodeSchema,
  })
  .strict()
  .superRefine((values, context) => {
    if (values.locationMode !== "MANUAL") {
      return;
    }

    const requiredManualFields = [
      ["addressLine1", values.addressLine1, "Address line 1"],
      ["city", values.city, "City"],
      ["district", values.district, "District"],
      ["state", values.state, "State"],
      ["postalCode", values.postalCode, "PIN code"],
    ] as const;

    for (const [field, value, label] of requiredManualFields) {
      if (value.trim().length === 0) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${label} is required.`,
        });
      }
    }
  });

export type ServiceFeedbackFormValues = z.infer<
  typeof serviceFeedbackFormSchema
>;

const serviceFeedbackCommonRequestShape = {
  name: z.string().trim().min(1).max(256),
  mobileNumber: z.string().trim().regex(MOBILE_PATTERN),
  email: emailValueSchema.optional(),
  issueCategory: serviceFeedbackIssueCategorySchema,
  feedback: z.string().trim().min(1).max(8_000),
} as const;

const serviceFeedbackGpsSubmitRequestSchema = z
  .object({
    ...serviceFeedbackCommonRequestShape,
    locationMode: z.literal("GPS"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .strict();

const serviceFeedbackManualSubmitRequestSchema = z
  .object({
    ...serviceFeedbackCommonRequestShape,
    locationMode: z.literal("MANUAL"),
    addressLine1: z.string().trim().min(1).max(512),
    addressLine2: z.string().trim().max(512).optional(),
    city: z.string().trim().min(1).max(128),
    district: z.string().trim().min(1).max(128),
    state: z.string().trim().min(1).max(128),
    postalCode: z.string().trim().regex(PINCODE_PATTERN),
  })
  .strict();

export const serviceFeedbackSubmitRequestSchema = z.discriminatedUnion(
  "locationMode",
  [
    serviceFeedbackGpsSubmitRequestSchema,
    serviceFeedbackManualSubmitRequestSchema,
  ],
);

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

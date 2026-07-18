// oz-next-app/src/features/engagement/public-dealership/schemas.ts
import { z } from "zod";

const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9._~:-]+$/u;
const SAFE_IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]+$/u;
const INDIA_MOBILE_LOCAL_PATTERN = /^[6-9][0-9]{9}$/u;
const INDIA_MOBILE_E164_PATTERN = /^\+91[6-9][0-9]{9}$/u;
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/u;

export const INVESTMENT_TIMELINE_VALUES = [
  "IMMEDIATE",
  "WITHIN_1_MONTH",
  "WITHIN_2_MONTHS",
] as const;

export const INVESTMENT_BUDGET_VALUES = [
  "BELOW_10_LAKHS",
  "TEN_TO_20_LAKHS",
  "ABOVE_20_LAKHS",
] as const;

export const RUNNING_EV_BUSINESS_VALUES = ["YES", "NO"] as const;
export const DEALERSHIP_LOCATION_MODE_VALUES = ["GPS", "MANUAL"] as const;

export const investmentTimelineSchema = z.enum(INVESTMENT_TIMELINE_VALUES);
export const investmentBudgetSchema = z.enum(INVESTMENT_BUDGET_VALUES);
export const runningEvBusinessSchema = z.enum(RUNNING_EV_BUSINESS_VALUES);
export const dealershipLocationModeSchema = z.enum(
  DEALERSHIP_LOCATION_MODE_VALUES,
);

export type InvestmentTimeline = z.infer<typeof investmentTimelineSchema>;
export type InvestmentBudget = z.infer<typeof investmentBudgetSchema>;
export type RunningEvBusiness = z.infer<typeof runningEvBusinessSchema>;
export type DealershipLocationMode = z.infer<
  typeof dealershipLocationModeSchema
>;

const requiredText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} is too long.`);

const optionalPostalCodeSchema = z
  .string()
  .trim()
  .max(6, "PIN code is too long.")
  .refine(
    (value) => value.length === 0 || PINCODE_PATTERN.test(value),
    "Enter a valid 6-digit PIN code.",
  );

export const publicDealershipTokenSchema = z
  .string()
  .trim()
  .min(32, "The dealership application link is invalid.")
  .max(256, "The dealership application link is invalid.")
  .regex(SAFE_TOKEN_PATTERN, "The dealership application link is invalid.");

export const dealershipSubmissionIdempotencyKeySchema = z
  .string()
  .trim()
  .min(8, "The submission key is invalid.")
  .max(128, "The submission key is invalid.")
  .regex(SAFE_IDEMPOTENCY_KEY_PATTERN, "The submission key is invalid.");

export const dealershipInterestFormSchema = z
  .object({
    investmentTimeline: investmentTimelineSchema,
    investmentBudget: investmentBudgetSchema,
    alreadyRunningEvBusiness: runningEvBusinessSchema,

    applicantName: requiredText(256, "Applicant name"),
    businessName: optionalText(256, "Business name"),
    mobileNumber: z
      .string()
      .trim()
      .regex(
        INDIA_MOBILE_LOCAL_PATTERN,
        "Enter a valid 10-digit mobile number.",
      ),
    email: z
      .string()
      .trim()
      .max(320)
      .pipe(z.email("Enter a valid email address.")),

    locationMode: dealershipLocationModeSchema,
    addressLine1: optionalText(512, "Address line 1"),
    addressLine2: optionalText(512, "Address line 2"),
    city: optionalText(128, "City"),
    district: optionalText(128, "District"),
    state: optionalText(128, "State"),
    postalCode: optionalPostalCodeSchema,

    notes: optionalText(1_200, "Notes"),
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

export type DealershipInterestFormValues = z.infer<
  typeof dealershipInterestFormSchema
>;

const dealershipApplicationCommonRequestShape = {
  applicantName: z.string().trim().min(1).max(256),
  businessName: z.string().trim().min(1).max(256).optional(),
  mobileNumber: z.string().trim().regex(INDIA_MOBILE_E164_PATTERN),
  email: z.string().trim().max(320).pipe(z.email()),
  notes: z.string().trim().max(2_000).optional(),
} as const;

const dealershipGpsSubmitRequestSchema = z
  .object({
    ...dealershipApplicationCommonRequestShape,
    locationMode: z.literal("GPS"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracyMeters: z.number().min(0).max(100_000).optional(),
  })
  .strict();

const dealershipManualAddressSubmitRequestSchema = z
  .object({
    ...dealershipApplicationCommonRequestShape,
    locationMode: z.literal("MANUAL"),
    addressLine1: z.string().trim().min(1).max(512),
    addressLine2: z.string().trim().max(512).optional(),
    city: z.string().trim().min(1).max(128),
    district: z.string().trim().min(1).max(128),
    state: z.string().trim().min(1).max(128),
    postalCode: z.string().trim().regex(PINCODE_PATTERN),
  })
  .strict();

export const dealershipApplicationSubmitRequestSchema = z.discriminatedUnion(
  "locationMode",
  [
    dealershipGpsSubmitRequestSchema,
    dealershipManualAddressSubmitRequestSchema,
  ],
);

export type DealershipApplicationSubmitRequest = z.infer<
  typeof dealershipApplicationSubmitRequestSchema
>;

export const dealershipApplicationSubmitResponseSchema = z
  .object({
    accepted: z.literal(true),
    tenantId: z.uuid(),
    leadId: z.uuid(),
    formSubmissionId: z.uuid(),
  })
  .strict();

export type DealershipApplicationSubmitResponse = z.infer<
  typeof dealershipApplicationSubmitResponseSchema
>;

export function buildPublicDealershipApplicationSubmitPath(
  token: string,
): `/erp/engagement/public/forms/dealership/${string}` {
  const parsedToken = publicDealershipTokenSchema.parse(token);

  return `/erp/engagement/public/forms/dealership/${encodeURIComponent(
    parsedToken,
  )}`;
}

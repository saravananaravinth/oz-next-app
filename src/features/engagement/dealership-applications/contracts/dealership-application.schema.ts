// oz-next-app/src/features/engagement/dealership-applications/contracts/dealership-application.schema.ts
import { z } from "zod";

const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9._~:-]+$/u;
const SAFE_IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]+$/u;
const INDIA_MOBILE_LOCAL_PATTERN = /^[6-9][0-9]{9}$/u;
const INDIA_MOBILE_E164_PATTERN = /^\+91[6-9][0-9]{9}$/u;
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/u;
const EMAIL_ADDRESS_SCHEMA = z.email("Enter a valid email address.");

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
export const DEALERSHIP_LOCATION_MODE_VALUES = [
  "GPS",
  "PINCODE",
  "REGION",
] as const;

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

const optionalEmailInputSchema = z
  .string()
  .trim()
  .max(320, "Email address is too long.")
  .refine(
    (value) =>
      value.length === 0 || EMAIL_ADDRESS_SCHEMA.safeParse(value).success,
    "Enter a valid email address.",
  );

const optionalPostalCodeSchema = z
  .string()
  .trim()
  .max(6, "PIN code is too long.")
  .refine(
    (value) => value.length === 0 || PINCODE_PATTERN.test(value),
    "Enter a valid 6-digit PIN code.",
  );

const draftInvestmentTimelineSchema = z
  .union([z.literal(""), investmentTimelineSchema])
  .refine((value): boolean => value !== "", "Choose when you plan to start.");

const draftInvestmentBudgetSchema = z
  .union([z.literal(""), investmentBudgetSchema])
  .refine(
    (value): boolean => value !== "",
    "Choose your planned investment range.",
  );

const draftRunningEvBusinessSchema = z
  .union([z.literal(""), runningEvBusinessSchema])
  .refine(
    (value): boolean => value !== "",
    "Choose whether you currently run an automobile or EV business.",
  );

const dealershipContactShape = {
  applicantName: requiredText(256, "Full name"),
  businessName: optionalText(256, "Business name"),
  mobileNumber: z
    .string()
    .trim()
    .regex(INDIA_MOBILE_LOCAL_PATTERN, "Enter a valid 10-digit mobile number."),
  email: optionalEmailInputSchema,
} as const;

const dealershipFallbackLocationShape = {
  locationMode: dealershipLocationModeSchema,
  postalCode: optionalPostalCodeSchema,
  district: optionalText(128, "District"),
  state: optionalText(128, "State"),
} as const;

function addFallbackLocationIssues(
  values: Readonly<{
    locationMode: DealershipLocationMode;
    postalCode: string;
    district: string;
    state: string;
  }>,
  context: z.RefinementCtx,
): void {
  if (values.locationMode === "PINCODE" && values.postalCode.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["postalCode"],
      message: "PIN code is required.",
    });
  }

  if (values.locationMode !== "REGION") {
    return;
  }

  if (values.district.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["district"],
      message: "District is required.",
    });
  }

  if (values.state.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["state"],
      message: "State is required.",
    });
  }
}

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

/**
 * Browser draft contract. Qualification answers remain intentionally empty
 * until the applicant selects them. GPS is the default submission method;
 * PIN-code and district/state fields are activated only after a browser-level
 * geolocation failure.
 */
export const dealershipInterestDraftSchema = z
  .object({
    investmentTimeline: draftInvestmentTimelineSchema,
    investmentBudget: draftInvestmentBudgetSchema,
    alreadyRunningEvBusiness: draftRunningEvBusinessSchema,
    ...dealershipContactShape,
    ...dealershipFallbackLocationShape,
  })
  .strict()
  .superRefine(addFallbackLocationIssues);

export type DealershipInterestDraftValues = z.infer<
  typeof dealershipInterestDraftSchema
>;

export const dealershipInterestFormSchema = z
  .object({
    investmentTimeline: investmentTimelineSchema,
    investmentBudget: investmentBudgetSchema,
    alreadyRunningEvBusiness: runningEvBusinessSchema,
    ...dealershipContactShape,
    ...dealershipFallbackLocationShape,
  })
  .strict()
  .superRefine(addFallbackLocationIssues);

export type DealershipInterestFormValues = z.infer<
  typeof dealershipInterestFormSchema
>;

const dealershipApplicationCommonRequestShape = {
  applicantName: z.string().trim().min(1).max(256),
  businessName: z.string().trim().min(1).max(256).optional(),
  mobileNumber: z.string().trim().regex(INDIA_MOBILE_E164_PATTERN),
  email: z.string().trim().max(320).pipe(EMAIL_ADDRESS_SCHEMA).optional(),
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

const dealershipPincodeSubmitRequestSchema = z
  .object({
    ...dealershipApplicationCommonRequestShape,
    locationMode: z.literal("PINCODE"),
    postalCode: z.string().trim().regex(PINCODE_PATTERN),
  })
  .strict();

const dealershipRegionSubmitRequestSchema = z
  .object({
    ...dealershipApplicationCommonRequestShape,
    locationMode: z.literal("REGION"),
    district: z.string().trim().min(1).max(128),
    state: z.string().trim().min(1).max(128),
  })
  .strict();

export const dealershipApplicationSubmitRequestSchema = z.discriminatedUnion(
  "locationMode",
  [
    dealershipGpsSubmitRequestSchema,
    dealershipPincodeSubmitRequestSchema,
    dealershipRegionSubmitRequestSchema,
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

// oz-next-app/src/features/engagement/dealership-applications/ui/dealership-application-flow.ts
import type {
  DealershipInterestDraftValues,
  InvestmentBudget,
  InvestmentTimeline,
  RunningEvBusiness,
} from "@/features/engagement/dealership-applications/contracts/dealership-application.schema";

export type ChoiceOption<TValue extends string> = Readonly<{
  value: TValue;
  label: string;
  description?: string;
}>;

export type DealershipApplicationStepId =
  | "investmentTimeline"
  | "investmentBudget"
  | "alreadyRunningEvBusiness"
  | "contactDetails";

export type DealershipPlanAutoAdvanceStepId = Extract<
  DealershipApplicationStepId,
  "investmentTimeline" | "investmentBudget" | "alreadyRunningEvBusiness"
>;

export type DealershipApplicationStepMeta = Readonly<{
  stage: "Your plan" | "Contact details";
  title: string;
  description?: string;
}>;

export const INVESTMENT_TIMELINE_OPTIONS = [
  { value: "IMMEDIATE", label: "Immediately" },
  { value: "WITHIN_1_MONTH", label: "Within 1 month" },
  { value: "WITHIN_2_MONTHS", label: "Within 2 months" },
] as const satisfies ReadonlyArray<ChoiceOption<InvestmentTimeline>>;

export const INVESTMENT_BUDGET_OPTIONS = [
  { value: "BELOW_10_LAKHS", label: "Below ₹10 lakh" },
  { value: "TEN_TO_20_LAKHS", label: "₹10–20 lakh" },
  { value: "ABOVE_20_LAKHS", label: "Above ₹20 lakh" },
] as const satisfies ReadonlyArray<ChoiceOption<InvestmentBudget>>;

export const RUNNING_EV_BUSINESS_OPTIONS = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
] as const satisfies ReadonlyArray<ChoiceOption<RunningEvBusiness>>;

export const DEALERSHIP_APPLICATION_STEPS = [
  "investmentTimeline",
  "investmentBudget",
  "alreadyRunningEvBusiness",
  "contactDetails",
] as const satisfies readonly DealershipApplicationStepId[];

export const DEALERSHIP_APPLICATION_AUTO_ADVANCE_STEPS = [
  "investmentTimeline",
  "investmentBudget",
  "alreadyRunningEvBusiness",
] as const satisfies readonly DealershipPlanAutoAdvanceStepId[];

export function isDealershipApplicationAutoAdvanceStep(
  value: DealershipApplicationStepId,
): value is DealershipPlanAutoAdvanceStepId {
  return DEALERSHIP_APPLICATION_AUTO_ADVANCE_STEPS.some(
    (step) => step === value,
  );
}

export const DEALERSHIP_APPLICATION_STEP_META = {
  investmentTimeline: {
    stage: "Your plan",
    title: "When would you like to start?",
  },
  investmentBudget: {
    stage: "Your plan",
    title: "How much are you planning to invest?",
  },
  alreadyRunningEvBusiness: {
    stage: "Your plan",
    title: "Do you currently run an automobile or EV business?",
  },
  contactDetails: {
    stage: "Contact details",
    title: "How can our dealership team contact you?",
    description: "Enter your primary contact details. Email is optional.",
  },
} as const satisfies Record<
  DealershipApplicationStepId,
  DealershipApplicationStepMeta
>;

export const DEALERSHIP_APPLICATION_FIELD_TO_STEP = {
  investmentTimeline: "investmentTimeline",
  investmentBudget: "investmentBudget",
  alreadyRunningEvBusiness: "alreadyRunningEvBusiness",
  applicantName: "contactDetails",
  businessName: "contactDetails",
  mobileNumber: "contactDetails",
  email: "contactDetails",
  locationMode: "contactDetails",
  postalCode: "contactDetails",
  district: "contactDetails",
  state: "contactDetails",
} as const satisfies Record<
  keyof DealershipInterestDraftValues,
  DealershipApplicationStepId
>;

export const DEALERSHIP_APPLICATION_SERVER_FIELD_NAMES = [
  "investmentTimeline",
  "investmentBudget",
  "alreadyRunningEvBusiness",
  "applicantName",
  "businessName",
  "mobileNumber",
  "email",
  "locationMode",
  "postalCode",
  "district",
  "state",
] as const satisfies ReadonlyArray<keyof DealershipInterestDraftValues>;

export const DEFAULT_DEALERSHIP_APPLICATION_VALUES = {
  investmentTimeline: "",
  investmentBudget: "",
  alreadyRunningEvBusiness: "",
  applicantName: "",
  businessName: "",
  mobileNumber: "",
  email: "",
  locationMode: "GPS",
  postalCode: "",
  district: "",
  state: "",
} as const satisfies DealershipInterestDraftValues;

export const CONTACT_DETAIL_FIELDS = [
  "applicantName",
  "businessName",
  "mobileNumber",
  "email",
] as const satisfies ReadonlyArray<keyof DealershipInterestDraftValues>;

export const PINCODE_LOCATION_FIELDS = [
  "locationMode",
  "postalCode",
] as const satisfies ReadonlyArray<keyof DealershipInterestDraftValues>;

export const REGION_LOCATION_FIELDS = [
  "locationMode",
  "district",
  "state",
] as const satisfies ReadonlyArray<keyof DealershipInterestDraftValues>;

export function isDealershipApplicationDraftFieldName(
  value: string,
): value is keyof DealershipInterestDraftValues {
  return DEALERSHIP_APPLICATION_SERVER_FIELD_NAMES.some(
    (field) => field === value,
  );
}

export function labelForDealershipChoice<TValue extends string>(
  options: ReadonlyArray<ChoiceOption<TValue>>,
  value: TValue,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

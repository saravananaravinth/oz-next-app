// oz-next-app/src/features/engagement/dealership-applications/ui/dealership-application-page.tsx
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Send,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";

import {
  ContentFormActions,
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NetworkError } from "@/lib/api/network-error";
import { isApiHttpError } from "@/lib/api/problem";
import { idempotencyKey as createIdempotencyKey } from "@/lib/security/request-identifiers";
import { cn } from "@/lib/utils";

import { submitPublicDealershipApplication } from "@/features/engagement/dealership-applications/api/dealership-application.client";
import {
  dealershipInterestDraftSchema,
  dealershipInterestFormSchema,
  publicDealershipTokenSchema,
  type DealershipApplicationSubmitRequest,
  type DealershipInterestDraftValues,
  type DealershipInterestFormValues,
} from "@/features/engagement/dealership-applications/contracts/dealership-application.schema";
import {
  type ChoiceOption,
  CONTACT_DETAIL_FIELDS,
  DEFAULT_DEALERSHIP_APPLICATION_VALUES as DEFAULT_VALUES,
  DEALERSHIP_APPLICATION_FIELD_TO_STEP as FIELD_TO_STEP,
  DEALERSHIP_APPLICATION_SERVER_FIELD_NAMES as SERVER_FIELD_NAMES,
  DEALERSHIP_APPLICATION_STEP_META as STEP_META,
  DEALERSHIP_APPLICATION_STEPS as STEPS,
  type DealershipApplicationStepId as StepId,
  type DealershipApplicationStepMeta as StepMeta,
  type DealershipPlanAutoAdvanceStepId,
  GPS_LOCATION_FIELDS,
  INVESTMENT_BUDGET_OPTIONS,
  INVESTMENT_TIMELINE_OPTIONS,
  isDealershipApplicationDraftFieldName as isDraftFieldName,
  labelForDealershipChoice as labelFor,
  LOCATION_MODE_OPTIONS,
  MANUAL_LOCATION_FIELDS,
  RUNNING_EV_BUSINESS_OPTIONS,
} from "@/features/engagement/dealership-applications/ui/dealership-application-flow";
import { PublicDealershipShell } from "@/features/engagement/dealership-applications/ui/dealership-application-shell";
import { PublicFormStatusEmblem } from "@/features/engagement/shared/ui/public-form-status-emblem";

export type PublicDealershipApplicationPageProps = Readonly<{
  token: string;
}>;

type SubmitState =
  | "idle"
  | "locating"
  | "submitting"
  | "success"
  | "invalid-link"
  | "unsupported-browser"
  | "permission-denied"
  | "location-unavailable"
  | "timeout"
  | "api-error"
  | "unexpected-error";

type UserFacingError = Readonly<{
  title: string;
  description: string;
  requestId?: string;
}>;

type CapturedLocation = Readonly<{
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}>;

type SubmissionIntent = Readonly<{
  idempotencyKey: string;
  serializedApplication: string;
}>;

const FORM_ID = "public-dealership-application-form";
const PAGE_TITLE_ID = "dealership-application-title";
const GEOLOCATION_TIMEOUT_MS = 15_000;
const PLAN_AUTO_ADVANCE_DELAY_MS = 180;
const MAX_GEOLOCATION_ACCURACY_METERS = 100_000;
const GEO_PERMISSION_DENIED = 1;
const GEO_POSITION_UNAVAILABLE = 2;
const GEO_TIMEOUT = 3;
const MAX_NOTES_LENGTH = 2_000;
const MAX_SERVER_FIELD_MESSAGE_LENGTH = 180;
const INDIA_DIAL_CODE = "+91";
const INDIA_MOBILE_MAX_LENGTH = 10;
const NON_DIGIT_PATTERN = /\D/gu;
const CONTROL_CHARACTER_MAX_CODE_POINT = 0x1f;
const DELETE_CHARACTER_CODE_POINT = 0x7f;
const MANUAL_ADDRESS_ONLY_FIELDS = [
  "addressLine1",
  "addressLine2",
  "city",
  "district",
  "state",
  "postalCode",
] as const satisfies ReadonlyArray<keyof DealershipInterestDraftValues>;

const STATE_COPY: Record<
  SubmitState,
  Readonly<{ title: string; description: string }>
> = {
  idle: {
    title: "Dealership application",
    description:
      "Answer three quick questions, then provide your contact and location details.",
  },
  locating: {
    title: "Confirming your location",
    description: "Keep this page open while your device confirms the position.",
  },
  submitting: {
    title: "Sending your application",
    description: "Your request is being sent securely.",
  },
  success: {
    title: "Application received",
    description:
      "Thank you. The Ozotec EV dealership team will review your request.",
  },
  "invalid-link": {
    title: "Application link unavailable",
    description:
      "This link is invalid, inactive, expired or already completed. Open the original campaign or invitation again.",
  },
  "unsupported-browser": {
    title: "Location is not supported",
    description:
      "Use an updated browser, or choose Enter the address to continue manually.",
  },
  "permission-denied": {
    title: "Location permission is blocked",
    description:
      "Allow location access for this site, or choose Enter the address.",
  },
  "location-unavailable": {
    title: "Location unavailable",
    description:
      "Check GPS and network access, try again, or enter the address manually.",
  },
  timeout: {
    title: "Location request timed out",
    description:
      "Try again with a stronger GPS signal, or enter the address manually.",
  },
  "api-error": {
    title: "Application could not be sent",
    description:
      "Your answers remain on this page. Check them and try again shortly.",
  },
  "unexpected-error": {
    title: "Something went wrong",
    description: "Your answers remain on this page. Please try again.",
  },
};

function subscribeOnlineStatus(onStoreChange: () => void): () => void {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);

  return (): void => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getOnlineSnapshot(): boolean {
  return navigator.onLine;
}

function getServerOnlineSnapshot(): boolean {
  return true;
}

function safeRequestId(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (
    normalized === undefined ||
    normalized.length === 0 ||
    normalized.length > 128 ||
    !/^[A-Za-z0-9_.:/@-]+$/u.test(normalized)
  ) {
    return undefined;
  }

  return normalized;
}

function safeServerFieldMessage(value: string): string {
  const normalized = value.trim();

  return normalized.length === 0
    ? "Review this answer and try again."
    : normalized.slice(0, MAX_SERVER_FIELD_MESSAGE_LENGTH);
}

function isGeolocationError(error: unknown): error is GeolocationPositionError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
  );
}

function geolocationErrorState(error: GeolocationPositionError): SubmitState {
  switch (error.code) {
    case GEO_PERMISSION_DENIED:
      return "permission-denied";
    case GEO_POSITION_UNAVAILABLE:
      return "location-unavailable";
    case GEO_TIMEOUT:
      return "timeout";
    default:
      return "unexpected-error";
  }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("geolocation_unsupported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: GEOLOCATION_TIMEOUT_MS,
    });
  });
}

function retryAfterDescription(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) {
    return "Please wait briefly before trying again.";
  }

  const roundedSeconds = Math.max(1, Math.ceil(seconds));

  if (roundedSeconds < 60) {
    return `Please wait about ${String(roundedSeconds)} seconds before trying again.`;
  }

  const roundedMinutes = Math.ceil(roundedSeconds / 60);

  return `Please wait about ${String(roundedMinutes)} minute${roundedMinutes === 1 ? "" : "s"} before trying again.`;
}

function errorFromUnknown(error: unknown): UserFacingError {
  if (error instanceof NetworkError) {
    return {
      title: "Check your internet connection",
      description:
        "Your answers remain on this page. Reconnect and try sending the application again.",
    };
  }

  if (isApiHttpError(error)) {
    const code = error.code.toUpperCase();
    const requestId = safeRequestId(error.requestId);
    let baseError: Omit<UserFacingError, "requestId">;

    if (
      error.status === 401 ||
      error.status === 403 ||
      error.status === 404 ||
      error.status === 410 ||
      code.includes("EXPIRED") ||
      code.includes("USED") ||
      code.includes("NOT_FOUND")
    ) {
      baseError = STATE_COPY["invalid-link"];
    } else if (error.status === 409) {
      baseError = {
        title: "Submission details changed",
        description:
          "Review the application and send it again to start a new protected attempt.",
      };
    } else if (error.status === 400 || error.status === 422) {
      baseError = {
        title: "Review the highlighted answer",
        description:
          "Some information was not accepted. Correct the highlighted answer and try again.",
      };
    } else if (error.status === 429) {
      baseError = {
        title: "Please wait before trying again",
        description: retryAfterDescription(error.retryAfterSeconds),
      };
    } else if (error.status >= 500) {
      baseError = {
        title: "Service temporarily unavailable",
        description:
          "Your answers remain on this page. Try sending the same application again shortly.",
      };
    } else {
      baseError = STATE_COPY["api-error"];
    }

    return requestId === undefined ? baseError : { ...baseError, requestId };
  }

  return STATE_COPY["unexpected-error"];
}

function optionalNonEmpty(value: string): string | undefined {
  const normalized = value.trim();

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeIndianMobileInput(value: string): string {
  const digits = value.replace(NON_DIGIT_PATTERN, "");

  if (digits.startsWith("91") && digits.length > INDIA_MOBILE_MAX_LENGTH) {
    return digits.slice(2, 2 + INDIA_MOBILE_MAX_LENGTH);
  }

  return digits.slice(0, INDIA_MOBILE_MAX_LENGTH);
}

function normalizePostalCodeInput(value: string): string {
  return value.replace(NON_DIGIT_PATTERN, "").slice(0, 6);
}

function truncateText(value: string, maxLength: number): string {
  const normalized = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0);

    return codePoint !== undefined &&
      (codePoint <= CONTROL_CHARACTER_MAX_CODE_POINT ||
        codePoint === DELETE_CHARACTER_CODE_POINT)
      ? " "
      : character;
  })
    .join("")
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function buildNotes(values: DealershipInterestFormValues): string {
  return truncateText(
    [
      "Dealership qualification details",
      `Investment timeline: ${labelFor(INVESTMENT_TIMELINE_OPTIONS, values.investmentTimeline)}`,
      `Prepared investment: ${labelFor(INVESTMENT_BUDGET_OPTIONS, values.investmentBudget)}`,
      `Existing automobile or EV business: ${labelFor(RUNNING_EV_BUSINESS_OPTIONS, values.alreadyRunningEvBusiness)}`,
    ].join("\n"),
    MAX_NOTES_LENGTH,
  );
}

function toSubmitRequest(
  values: DealershipInterestFormValues,
  location: CapturedLocation | null,
): DealershipApplicationSubmitRequest {
  const businessName = optionalNonEmpty(values.businessName);
  const email = optionalNonEmpty(values.email);
  const common = {
    applicantName: values.applicantName.trim(),
    ...(businessName === undefined ? {} : { businessName }),
    mobileNumber: `${INDIA_DIAL_CODE}${values.mobileNumber.trim()}`,
    ...(email === undefined ? {} : { email }),
    notes: buildNotes(values),
  } as const;

  if (values.locationMode === "GPS") {
    if (location === null) {
      throw new Error("gps_location_required");
    }

    return {
      ...common,
      locationMode: "GPS",
      latitude: location.latitude,
      longitude: location.longitude,
      ...(location.accuracyMeters === undefined
        ? {}
        : { accuracyMeters: location.accuracyMeters }),
    };
  }

  const addressLine2 = optionalNonEmpty(values.addressLine2);

  return {
    ...common,
    locationMode: "MANUAL",
    addressLine1: values.addressLine1.trim(),
    ...(addressLine2 === undefined ? {} : { addressLine2 }),
    city: values.city.trim(),
    district: values.district.trim(),
    state: values.state.trim(),
    postalCode: values.postalCode.trim(),
  };
}

function resolveServerFieldName(
  path: string,
): keyof DealershipInterestDraftValues | null {
  const segments = path
    .split(/[.[\]]/u)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  const candidate = segments.at(-1);

  if (candidate === undefined) {
    return null;
  }

  return SERVER_FIELD_NAMES.find((field) => field === candidate) ?? null;
}

function isChoiceValue<TValue extends string>(
  options: ReadonlyArray<ChoiceOption<TValue>>,
  value: string,
): value is TValue {
  return options.some((option) => option.value === value);
}

function choiceOptionId(name: string, value: string): string {
  return `${name}-${value.toLocaleLowerCase("en-US").replaceAll("_", "-")}`;
}

function focusIdForStep(stepId: StepId): string {
  switch (stepId) {
    case "investmentTimeline":
      return choiceOptionId("investment-timeline", "IMMEDIATE");
    case "investmentBudget":
      return choiceOptionId("investment-budget", "BELOW_10_LAKHS");
    case "alreadyRunningEvBusiness":
      return choiceOptionId("running-business", "YES");
    case "contactDetails":
      return "applicant-name";
    case "dealershipLocation":
      return choiceOptionId("location-mode", "GPS");
  }
}

function focusIdForField(
  field: keyof DealershipInterestDraftValues,
): string | null {
  switch (field) {
    case "investmentTimeline":
      return choiceOptionId("investment-timeline", "IMMEDIATE");
    case "investmentBudget":
      return choiceOptionId("investment-budget", "BELOW_10_LAKHS");
    case "alreadyRunningEvBusiness":
      return choiceOptionId("running-business", "YES");
    case "applicantName":
      return "applicant-name";
    case "businessName":
      return "business-name";
    case "mobileNumber":
      return "mobile-number";
    case "email":
      return "email";
    case "locationMode":
    case "notes":
      return choiceOptionId("location-mode", "GPS");
    case "addressLine1":
      return "address-line-1";
    case "addressLine2":
      return "address-line-2";
    case "city":
      return "city";
    case "district":
      return "district";
    case "state":
      return "state";
    case "postalCode":
      return "postal-code";
  }
}

function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function ChoiceCards<TValue extends string>({
  name,
  value,
  options,
  disabled,
  onValueChange,
  columns = "one",
}: Readonly<{
  name: string;
  value: TValue | "";
  options: ReadonlyArray<ChoiceOption<TValue>>;
  disabled: boolean;
  onValueChange: (value: TValue) => void;
  columns?: "one" | "two";
}>): React.ReactElement {
  return (
    <RadioGroup
      value={value}
      onValueChange={(nextValue) => {
        if (isChoiceValue(options, nextValue)) {
          onValueChange(nextValue);
        }
      }}
      disabled={disabled}
      required
      className={cn("grid gap-2.5", columns === "two" && "sm:grid-cols-2")}
    >
      {options.map((option) => {
        const id = choiceOptionId(name, option.value);
        const selected = value === option.value;

        return (
          <label
            key={option.value}
            htmlFor={id}
            onClick={() => {
              if (!disabled && selected) {
                onValueChange(option.value);
              }
            }}
            onKeyDown={(event) => {
              if (!disabled && selected && event.key === "Enter") {
                event.preventDefault();
                onValueChange(option.value);
              }
            }}
            className={cn(
              [
                "group flex min-h-14 cursor-pointer touch-manipulation items-center",
                "gap-3 rounded-2xl border px-4 py-3 outline-none",
                "transition-colors motion-reduce:transition-none",
              ].join(" "),
              selected
                ? "border-primary bg-primary/8 shadow-sm ring-1 ring-primary/20"
                : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <RadioGroupItem id={id} value={option.value} className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm font-semibold text-foreground">
                {option.label}
              </span>
              {option.description === undefined ? null : (
                <span className="mt-0.5 block text-caption text-muted-readable">
                  {option.description}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

function StepProgress({
  current,
  total,
  stage,
}: Readonly<{
  current: number;
  total: number;
  stage: StepMeta["stage"];
}>): React.ReactElement {
  const progress = Math.min(100, Math.max(0, (current / total) * 100));

  return (
    <div
      className="grid gap-2.5"
      role="status"
      aria-live="polite"
      aria-label={`Step ${String(current)} of ${String(total)}`}
    >
      <div className="flex items-center justify-between gap-3 text-caption">
        <span className="text-muted-readable">
          Step {current} of {total}
        </span>
        <span className="font-medium text-foreground">{stage}</span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );
}

function FormErrorAlert({
  error,
}: Readonly<{ error: UserFacingError }>): React.ReactElement {
  return (
    <ContentStatus
      variant="destructive"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      icon={<AlertTriangle aria-hidden="true" />}
      title={error.title}
      description={
        <>
          {error.description}
          {error.requestId === undefined ? null : (
            <span className="mt-2 block text-caption">
              Reference: <code>{error.requestId}</code>
            </span>
          )}
        </>
      }
    />
  );
}

function StatusNextStep({
  number,
  title,
  description,
}: Readonly<{
  number: "1" | "2" | "3";
  title: string;
  description: string;
}>): React.ReactElement {
  return (
    <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-3">
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-xl border border-success/20 bg-success/8 text-body-sm font-semibold text-success"
      >
        {number}
      </span>
      <div className="grid min-w-0 gap-0.5 pt-0.5">
        <p className="text-body-sm font-semibold text-foreground">{title}</p>
        <p className="text-caption text-muted-readable text-pretty">
          {description}
        </p>
      </div>
    </li>
  );
}

function StatusScreen({
  state,
}: Readonly<{ state: "success" | "invalid-link" }>): React.ReactElement {
  const success = state === "success";
  const copy = STATE_COPY[state];

  return (
    <PublicDealershipShell
      mainLabelledBy="dealership-status-title"
      mainClassName="items-start sm:items-center"
    >
      <ContentRoot
        width="narrow"
        density="compact"
        className="w-full max-w-xl py-2 sm:py-6"
      >
        <ContentSection
          padded={false}
          className={cn(
            "overflow-hidden bg-card/95 shadow-xl",
            success
              ? "border-success/20 shadow-success/5"
              : "border-destructive/20 shadow-destructive/5",
          )}
        >
          <div
            aria-hidden="true"
            className={cn(
              "h-1 w-full",
              success ? "bg-success" : "bg-destructive",
            )}
          />

          <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8">
            <div
              role={success ? "status" : "alert"}
              aria-live={success ? "polite" : "assertive"}
              aria-atomic="true"
              className="grid justify-items-center gap-4 text-center"
            >
              <PublicFormStatusEmblem
                status={success ? "success" : "error"}
                className="size-20 rounded-[1.75rem] shadow-sm [&_svg]:size-9"
              />

              <div className="grid max-w-md gap-2">
                <p
                  className={cn(
                    "text-overline",
                    success ? "text-success" : "text-destructive",
                  )}
                >
                  {success ? "Submission complete" : "Link unavailable"}
                </p>
                <h1
                  id="dealership-status-title"
                  className="text-page-title text-foreground text-balance"
                >
                  {copy.title}
                </h1>
                <p className="text-body-sm text-muted-readable text-pretty">
                  {copy.description}
                </p>
              </div>
            </div>

            {success ? (
              <>
                <section
                  aria-labelledby="dealership-next-steps-title"
                  className="rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5"
                >
                  <div className="grid gap-1">
                    <h2
                      id="dealership-next-steps-title"
                      className="text-card-title text-foreground"
                    >
                      What happens next
                    </h2>
                    <p className="text-caption text-muted-readable">
                      No further action is required right now.
                    </p>
                  </div>

                  <ol className="mt-4 grid gap-4">
                    <StatusNextStep
                      number="1"
                      title="Application review"
                      description="Our dealership team will review the information you submitted."
                    />
                    <StatusNextStep
                      number="2"
                      title="Phone follow-up"
                      description="Keep the submitted mobile number available for a call from our team."
                    />
                    <StatusNextStep
                      number="3"
                      title="Next-step guidance"
                      description="We will contact you if additional details or a site discussion are required."
                    />
                  </ol>
                </section>

                <div className="flex items-start gap-2.5 rounded-xl border border-success/20 bg-success/8 px-3.5 py-3 text-caption text-muted-readable">
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-success"
                  />
                  <p>
                    <span className="font-medium text-foreground">
                      Application recorded.
                    </span>{" "}
                    You can safely close this page.
                  </p>
                </div>
              </>
            ) : (
              <section
                aria-labelledby="dealership-link-help-title"
                className="grid gap-3 rounded-2xl border border-destructive/15 bg-destructive/5 p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-destructive/15 bg-background text-destructive">
                    <AlertTriangle aria-hidden="true" className="size-5" />
                  </span>
                  <div className="grid min-w-0 gap-1">
                    <h2
                      id="dealership-link-help-title"
                      className="text-card-title text-foreground"
                    >
                      What to do next
                    </h2>
                    <p className="text-body-sm text-muted-readable text-pretty">
                      Open the original campaign or invitation link again. If it
                      remains unavailable, request a fresh link from the Ozotec
                      dealership team.
                    </p>
                  </div>
                </div>

                <p className="rounded-xl border border-border/70 bg-background/70 px-3.5 py-3 text-caption text-muted-readable">
                  This page did not create a new dealership application.
                </p>
              </section>
            )}
          </div>
        </ContentSection>
      </ContentRoot>
    </PublicDealershipShell>
  );
}

function FieldMessage({
  message,
}: Readonly<{ message: string | undefined }>): React.ReactElement | null {
  return message === undefined ? null : <FieldError>{message}</FieldError>;
}

export function PublicDealershipApplicationPage({
  token,
}: PublicDealershipApplicationPageProps): React.ReactElement {
  const tokenResult = React.useMemo(
    () => publicDealershipTokenSchema.safeParse(token),
    [token],
  );
  const parsedToken = tokenResult.success ? tokenResult.data : null;
  const isOnline = React.useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );
  const form = useForm<DealershipInterestDraftValues>({
    resolver: zodResolver(dealershipInterestDraftSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
    reValidateMode: "onChange",
    shouldUnregister: false,
  });
  const [alreadyRunningEvBusiness, locationMode] = useWatch({
    control: form.control,
    name: ["alreadyRunningEvBusiness", "locationMode"],
  });
  const [stepId, setStepId] = React.useState<StepId>("investmentTimeline");
  const [submitState, setSubmitState] = React.useState<SubmitState>(
    tokenResult.success ? "idle" : "invalid-link",
  );
  const [formError, setFormError] = React.useState<UserFacingError | null>(
    null,
  );
  const [actionPending, setActionPending] = React.useState(false);
  const [locationConfirmationOpen, setLocationConfirmationOpen] =
    React.useState(false);
  const [capturedLocation, setCapturedLocation] =
    React.useState<CapturedLocation | null>(null);
  const lifecycleControllerRef = React.useRef<AbortController | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const locationLockRef = React.useRef(false);
  const submissionLockRef = React.useRef(false);
  const submissionIntentRef = React.useRef<SubmissionIntent | null>(null);
  const planAutoAdvanceTimerRef = React.useRef<number | null>(null);
  const currentStepRef = React.useRef<StepId>(stepId);
  const planAutoAdvanceLockRef = React.useRef(false);

  React.useEffect(() => {
    const lifecycleController = new AbortController();
    lifecycleControllerRef.current = lifecycleController;

    return () => {
      lifecycleController.abort();
      lifecycleControllerRef.current = null;
      abortControllerRef.current?.abort();

      if (planAutoAdvanceTimerRef.current !== null) {
        window.clearTimeout(planAutoAdvanceTimerRef.current);
        planAutoAdvanceTimerRef.current = null;
      }
    };
  }, []);

  function isComponentActive(): boolean {
    const lifecycleController = lifecycleControllerRef.current;

    return lifecycleController !== null && !lifecycleController.signal.aborted;
  }

  if (!tokenResult.success || submitState === "invalid-link") {
    return <StatusScreen state="invalid-link" />;
  }

  if (submitState === "success") {
    return <StatusScreen state="success" />;
  }

  const stepIndex = Math.max(0, STEPS.indexOf(stepId));
  const currentStep = STEPS[stepIndex] ?? "investmentTimeline";
  const meta: StepMeta = STEP_META[currentStep];
  const networkBusy =
    submitState === "locating" || submitState === "submitting";
  const busy = actionPending || networkBusy;
  const disabled = busy || parsedToken === null;
  const isFirstStep = stepIndex === 0;
  const isLocationStep = currentStep === "dealershipLocation";

  function clearPlanAutoAdvanceTimer(): void {
    if (planAutoAdvanceTimerRef.current === null) {
      return;
    }

    window.clearTimeout(planAutoAdvanceTimerRef.current);
    planAutoAdvanceTimerRef.current = null;
  }

  async function advanceAfterPlanChoice(
    sourceStep: DealershipPlanAutoAdvanceStepId,
  ): Promise<void> {
    if (
      !isComponentActive() ||
      planAutoAdvanceLockRef.current ||
      currentStepRef.current !== sourceStep
    ) {
      return;
    }

    planAutoAdvanceLockRef.current = true;
    setActionPending(true);
    setFormError(null);

    try {
      const valid = await form.trigger(sourceStep, { shouldFocus: false });

      if (
        !isComponentActive() ||
        !valid ||
        currentStepRef.current !== sourceStep
      ) {
        return;
      }

      const sourceIndex = STEPS.indexOf(sourceStep);
      const nextStep = STEPS[sourceIndex + 1];

      if (nextStep !== undefined) {
        moveToStep(nextStep);
      }
    } finally {
      planAutoAdvanceLockRef.current = false;

      if (isComponentActive()) {
        setActionPending(false);
      }
    }
  }

  function schedulePlanAutoAdvance(
    sourceStep: DealershipPlanAutoAdvanceStepId,
  ): void {
    clearPlanAutoAdvanceTimer();

    planAutoAdvanceTimerRef.current = window.setTimeout(() => {
      planAutoAdvanceTimerRef.current = null;
      void advanceAfterPlanChoice(sourceStep);
    }, PLAN_AUTO_ADVANCE_DELAY_MS);
  }

  function focusElement(id: string): void {
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.focus({ preventScroll: true });
      document.getElementById(PAGE_TITLE_ID)?.scrollIntoView({
        block: "start",
        behavior: preferredScrollBehavior(),
      });
    });
  }

  function moveToStep(nextStep: StepId, focusId?: string): void {
    clearPlanAutoAdvanceTimer();
    setFormError(null);
    currentStepRef.current = nextStep;
    setStepId(nextStep);
    focusElement(focusId ?? focusIdForStep(nextStep));
  }

  function moveToField(field: keyof DealershipInterestDraftValues): void {
    const targetStep = FIELD_TO_STEP[field];
    const targetFocus = focusIdForField(field) ?? focusIdForStep(targetStep);
    moveToStep(targetStep, targetFocus);
  }

  function applyServerFieldErrors(error: unknown): StepId | null {
    if (!isApiHttpError(error)) {
      return null;
    }

    const invalidParameters = error.problem?.invalid_params;

    if (invalidParameters === undefined || invalidParameters.length === 0) {
      return null;
    }

    let firstStep: StepId | null = null;

    for (const invalidParameter of invalidParameters) {
      const field = resolveServerFieldName(invalidParameter.path);

      if (field === null) {
        continue;
      }

      form.setError(field, {
        type: "server",
        message: safeServerFieldMessage(invalidParameter.message),
      });
      firstStep ??= FIELD_TO_STEP[field];
    }

    return firstStep;
  }

  async function submitApplication(
    location: CapturedLocation | null,
  ): Promise<void> {
    if (
      parsedToken === null ||
      submissionLockRef.current ||
      submitState === "submitting"
    ) {
      return;
    }

    if (!isOnline) {
      setFormError({
        title: "You are offline",
        description:
          "Reconnect to the internet, then send the application. Your answers remain on this page.",
      });
      return;
    }

    submissionLockRef.current = true;
    setActionPending(true);
    setFormError(null);
    let completed = false;

    try {
      const valid = await form.trigger(undefined, { shouldFocus: false });
      const parsedValues = dealershipInterestFormSchema.safeParse(
        form.getValues(),
      );

      if (!isComponentActive()) {
        return;
      }

      if (!valid || !parsedValues.success) {
        const firstIssue = parsedValues.success
          ? undefined
          : parsedValues.error.issues.find(
              (issue) => typeof issue.path[0] === "string",
            );
        const issueField = firstIssue?.path[0];

        if (typeof issueField === "string" && isDraftFieldName(issueField)) {
          moveToField(issueField);
        } else {
          const firstErrorField = SERVER_FIELD_NAMES.find(
            (field) => form.formState.errors[field] !== undefined,
          );

          if (firstErrorField !== undefined) {
            moveToField(firstErrorField);
          }
        }
        return;
      }

      const application = toSubmitRequest(parsedValues.data, location);
      const serializedApplication = JSON.stringify(application);
      const existingIntent = submissionIntentRef.current;
      const submissionIntent =
        existingIntent?.serializedApplication === serializedApplication
          ? existingIntent
          : {
              idempotencyKey: createIdempotencyKey("dealership"),
              serializedApplication,
            };
      submissionIntentRef.current = submissionIntent;

      const controller = new AbortController();
      abortControllerRef.current?.abort();
      abortControllerRef.current = controller;
      setSubmitState("submitting");

      await submitPublicDealershipApplication({
        token: parsedToken,
        idempotencyKey: submissionIntent.idempotencyKey,
        application,
        signal: controller.signal,
      });

      completed = true;

      if (isComponentActive()) {
        setSubmitState("success");
      }
    } catch (caught) {
      if (!isComponentActive()) {
        return;
      }

      if (caught instanceof DOMException && caught.name === "AbortError") {
        return;
      }

      const serverStep = applyServerFieldErrors(caught);
      const nextError = errorFromUnknown(caught);
      setSubmitState(
        nextError.title === STATE_COPY["invalid-link"].title
          ? "invalid-link"
          : "api-error",
      );

      if (serverStep !== null) {
        moveToStep(serverStep);
      }

      setFormError(nextError);
    } finally {
      submissionLockRef.current = false;

      if (isComponentActive() && !completed) {
        setActionPending(false);
        setSubmitState((current) =>
          current === "submitting" ? "idle" : current,
        );
      }
    }
  }

  async function captureCurrentLocationAndSubmit(): Promise<void> {
    if (locationLockRef.current || disabled) {
      return;
    }

    locationLockRef.current = true;
    setFormError(null);

    try {
      let location = capturedLocation;

      if (location === null) {
        setSubmitState("locating");
        const position = await getCurrentPosition();
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        if (
          !Number.isFinite(latitude) ||
          latitude < -90 ||
          latitude > 90 ||
          !Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180
        ) {
          throw new Error("invalid_geolocation_coordinates");
        }

        const accuracy =
          Number.isFinite(position.coords.accuracy) &&
          position.coords.accuracy >= 0 &&
          position.coords.accuracy <= MAX_GEOLOCATION_ACCURACY_METERS
            ? position.coords.accuracy
            : undefined;

        location = {
          latitude,
          longitude,
          ...(accuracy === undefined ? {} : { accuracyMeters: accuracy }),
        };

        if (!isComponentActive()) {
          return;
        }

        setCapturedLocation(location);
        setSubmitState("idle");
      }

      await submitApplication(location);
    } catch (caught) {
      if (!isComponentActive()) {
        return;
      }

      if (isGeolocationError(caught)) {
        const nextState = geolocationErrorState(caught);
        setSubmitState(nextState);
        setFormError(STATE_COPY[nextState]);
        return;
      }

      if (
        caught instanceof Error &&
        caught.message === "geolocation_unsupported"
      ) {
        setSubmitState("unsupported-browser");
        setFormError(STATE_COPY["unsupported-browser"]);
        return;
      }

      setSubmitState("unexpected-error");
      setFormError(errorFromUnknown(caught));
    } finally {
      locationLockRef.current = false;
    }
  }

  async function validateCurrentStep(): Promise<boolean> {
    switch (currentStep) {
      case "investmentTimeline":
        return await form.trigger("investmentTimeline", {
          shouldFocus: true,
        });
      case "investmentBudget":
        return await form.trigger("investmentBudget", { shouldFocus: true });
      case "alreadyRunningEvBusiness":
        return await form.trigger("alreadyRunningEvBusiness", {
          shouldFocus: true,
        });
      case "contactDetails":
        return await form.trigger([...CONTACT_DETAIL_FIELDS], {
          shouldFocus: true,
        });
      case "dealershipLocation":
        return await form.trigger(
          locationMode === "MANUAL"
            ? [...MANUAL_LOCATION_FIELDS]
            : [...GPS_LOCATION_FIELDS],
          { shouldFocus: true },
        );
    }
  }

  async function handlePrimaryAction(): Promise<void> {
    clearPlanAutoAdvanceTimer();

    if (disabled) {
      return;
    }

    setActionPending(true);
    setFormError(null);

    try {
      const valid = await validateCurrentStep();

      if (!isComponentActive() || !valid) {
        return;
      }

      if (isLocationStep) {
        if (locationMode === "GPS") {
          setLocationConfirmationOpen(true);
          return;
        }

        await submitApplication(null);
        return;
      }

      const nextStep = STEPS[stepIndex + 1];

      if (nextStep !== undefined) {
        moveToStep(nextStep);
      }
    } finally {
      if (isComponentActive()) {
        setActionPending(false);
      }
    }
  }

  function handleBack(): void {
    clearPlanAutoAdvanceTimer();

    if (busy || isFirstStep) {
      return;
    }

    const previousStep = STEPS[stepIndex - 1];

    if (previousStep !== undefined) {
      moveToStep(previousStep);
    }
  }

  function switchToManualAddress(): void {
    form.setValue("locationMode", "MANUAL", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setCapturedLocation(null);
    setLocationConfirmationOpen(false);
    moveToStep("dealershipLocation", "address-line-1");
  }

  function renderPlanQuestion(): React.ReactNode {
    switch (currentStep) {
      case "investmentTimeline":
        return (
          <Controller
            control={form.control}
            name="investmentTimeline"
            render={({ field }) => (
              <ChoiceCards
                name="investment-timeline"
                value={field.value}
                options={INVESTMENT_TIMELINE_OPTIONS}
                disabled={disabled}
                onValueChange={(value) => {
                  form.setValue("investmentTimeline", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                  form.clearErrors("investmentTimeline");
                  schedulePlanAutoAdvance("investmentTimeline");
                }}
              />
            )}
          />
        );
      case "investmentBudget":
        return (
          <Controller
            control={form.control}
            name="investmentBudget"
            render={({ field }) => (
              <ChoiceCards
                name="investment-budget"
                value={field.value}
                options={INVESTMENT_BUDGET_OPTIONS}
                disabled={disabled}
                onValueChange={(value) => {
                  form.setValue("investmentBudget", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                  form.clearErrors("investmentBudget");
                  schedulePlanAutoAdvance("investmentBudget");
                }}
              />
            )}
          />
        );
      case "alreadyRunningEvBusiness":
        return (
          <Controller
            control={form.control}
            name="alreadyRunningEvBusiness"
            render={({ field }) => (
              <ChoiceCards
                name="running-business"
                value={field.value}
                options={RUNNING_EV_BUSINESS_OPTIONS}
                disabled={disabled}
                columns="two"
                onValueChange={(value) => {
                  form.setValue("alreadyRunningEvBusiness", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });

                  if (value === "NO") {
                    form.setValue("businessName", "", {
                      shouldDirty: true,
                      shouldValidate: false,
                    });
                    form.clearErrors("businessName");
                  }

                  form.clearErrors("alreadyRunningEvBusiness");
                  schedulePlanAutoAdvance("alreadyRunningEvBusiness");
                }}
              />
            )}
          />
        );
      case "contactDetails":
      case "dealershipLocation":
        return null;
    }
  }

  function renderContactDetails(): React.ReactElement {
    const errors = form.formState.errors;

    return (
      <div className="grid gap-5">
        <Field
          {...(errors.applicantName === undefined
            ? {}
            : { "data-invalid": true })}
        >
          <FieldLabel htmlFor="applicant-name">Full name</FieldLabel>
          <Input
            id="applicant-name"
            type="text"
            autoComplete="name"
            enterKeyHint="next"
            maxLength={256}
            required
            autoFocus
            aria-invalid={errors.applicantName === undefined ? undefined : true}
            disabled={disabled}
            placeholder="Your full name"
            className="min-h-12 text-base"
            {...form.register("applicantName")}
          />
          <FieldMessage message={errors.applicantName?.message} />
        </Field>

        {alreadyRunningEvBusiness === "YES" ? (
          <Field
            {...(errors.businessName === undefined
              ? {}
              : { "data-invalid": true })}
          >
            <FieldLabel htmlFor="business-name">
              Business name
              <span className="ml-1 font-normal text-muted-readable">
                (optional)
              </span>
            </FieldLabel>
            <Input
              id="business-name"
              type="text"
              autoComplete="organization"
              enterKeyHint="next"
              maxLength={256}
              aria-invalid={
                errors.businessName === undefined ? undefined : true
              }
              disabled={disabled}
              placeholder="Business or company name"
              className="min-h-12 text-base"
              {...form.register("businessName")}
            />
            <FieldMessage message={errors.businessName?.message} />
          </Field>
        ) : null}

        <Field
          {...(errors.mobileNumber === undefined
            ? {}
            : { "data-invalid": true })}
        >
          <FieldLabel htmlFor="mobile-number">Mobile number</FieldLabel>
          <div
            className={cn(
              "flex min-h-12 overflow-hidden rounded-xl border",
              "border-input bg-background focus-within:border-ring",
              "focus-within:ring-3 focus-within:ring-ring/50",
            )}
          >
            <span className="flex shrink-0 items-center border-r border-border/70 px-3 text-body-sm text-muted-readable">
              {INDIA_DIAL_CODE}
            </span>
            <Controller
              control={form.control}
              name="mobileNumber"
              render={({ field }) => (
                <Input
                  id="mobile-number"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  enterKeyHint="next"
                  maxLength={INDIA_MOBILE_MAX_LENGTH}
                  required
                  aria-invalid={
                    errors.mobileNumber === undefined ? undefined : true
                  }
                  disabled={disabled}
                  placeholder="9876543210"
                  className="min-h-12 rounded-none border-0 text-base shadow-none focus-visible:ring-0"
                  value={field.value}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  onChange={(event) => {
                    field.onChange(
                      normalizeIndianMobileInput(event.target.value),
                    );
                  }}
                />
              )}
            />
          </div>
          <FieldDescription>
            We will use this number for dealership follow-up.
          </FieldDescription>
          <FieldMessage message={errors.mobileNumber?.message} />
        </Field>

        <Field
          {...(errors.email === undefined ? {} : { "data-invalid": true })}
        >
          <FieldLabel htmlFor="email">
            Email address
            <span className="ml-1 font-normal text-muted-readable">
              (optional)
            </span>
          </FieldLabel>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="done"
            maxLength={320}
            aria-invalid={errors.email === undefined ? undefined : true}
            disabled={disabled}
            placeholder="you@example.com"
            className="min-h-12 text-base"
            {...form.register("email")}
          />
          <FieldMessage message={errors.email?.message} />
        </Field>
      </div>
    );
  }

  function renderManualAddress(): React.ReactElement {
    const errors = form.formState.errors;

    return (
      <div className="grid gap-5 rounded-2xl border border-border/80 bg-muted/15 p-4 sm:p-5">
        <div className="grid gap-1">
          <p className="text-body-sm font-semibold text-foreground">
            Proposed dealership address
          </p>
          <p className="text-caption text-muted-readable">
            Enter the complete address used for initial dealership evaluation.
          </p>
        </div>

        <Field
          {...(errors.addressLine1 === undefined
            ? {}
            : { "data-invalid": true })}
        >
          <FieldLabel htmlFor="address-line-1">Address</FieldLabel>
          <Input
            id="address-line-1"
            type="text"
            autoComplete="address-line1"
            enterKeyHint="next"
            maxLength={512}
            required
            aria-invalid={errors.addressLine1 === undefined ? undefined : true}
            disabled={disabled}
            placeholder="Door number, street and area"
            className="min-h-12 text-base"
            {...form.register("addressLine1")}
          />
          <FieldMessage message={errors.addressLine1?.message} />
        </Field>

        <Field
          {...(errors.addressLine2 === undefined
            ? {}
            : { "data-invalid": true })}
        >
          <FieldLabel htmlFor="address-line-2">
            Landmark
            <span className="ml-1 font-normal text-muted-readable">
              (optional)
            </span>
          </FieldLabel>
          <Input
            id="address-line-2"
            type="text"
            autoComplete="address-line2"
            enterKeyHint="next"
            maxLength={512}
            aria-invalid={errors.addressLine2 === undefined ? undefined : true}
            disabled={disabled}
            placeholder="Nearby landmark"
            className="min-h-12 text-base"
            {...form.register("addressLine2")}
          />
          <FieldMessage message={errors.addressLine2?.message} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            {...(errors.city === undefined ? {} : { "data-invalid": true })}
          >
            <FieldLabel htmlFor="city">City</FieldLabel>
            <Input
              id="city"
              type="text"
              autoComplete="address-level2"
              enterKeyHint="next"
              maxLength={128}
              required
              aria-invalid={errors.city === undefined ? undefined : true}
              disabled={disabled}
              placeholder="City"
              className="min-h-12 text-base"
              {...form.register("city")}
            />
            <FieldMessage message={errors.city?.message} />
          </Field>

          <Field
            {...(errors.district === undefined ? {} : { "data-invalid": true })}
          >
            <FieldLabel htmlFor="district">District</FieldLabel>
            <Input
              id="district"
              type="text"
              enterKeyHint="next"
              maxLength={128}
              required
              aria-invalid={errors.district === undefined ? undefined : true}
              disabled={disabled}
              placeholder="District"
              className="min-h-12 text-base"
              {...form.register("district")}
            />
            <FieldMessage message={errors.district?.message} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <Field
            {...(errors.state === undefined ? {} : { "data-invalid": true })}
          >
            <FieldLabel htmlFor="state">State</FieldLabel>
            <Input
              id="state"
              type="text"
              autoComplete="address-level1"
              enterKeyHint="next"
              maxLength={128}
              required
              aria-invalid={errors.state === undefined ? undefined : true}
              disabled={disabled}
              placeholder="State"
              className="min-h-12 text-base"
              {...form.register("state")}
            />
            <FieldMessage message={errors.state?.message} />
          </Field>

          <Field
            {...(errors.postalCode === undefined
              ? {}
              : { "data-invalid": true })}
          >
            <FieldLabel htmlFor="postal-code">PIN code</FieldLabel>
            <Controller
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <Input
                  id="postal-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  enterKeyHint="done"
                  maxLength={6}
                  required
                  aria-invalid={
                    errors.postalCode === undefined ? undefined : true
                  }
                  disabled={disabled}
                  placeholder="641659"
                  className="min-h-12 text-base"
                  value={field.value}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  onChange={(event) => {
                    field.onChange(
                      normalizePostalCodeInput(event.target.value),
                    );
                  }}
                />
              )}
            />
            <FieldMessage message={errors.postalCode?.message} />
          </Field>
        </div>
      </div>
    );
  }

  function renderLocationDetails(): React.ReactElement {
    const errors = form.formState.errors;

    return (
      <div className="grid gap-5">
        <Field
          {...(errors.locationMode === undefined
            ? {}
            : { "data-invalid": true })}
          className="gap-3"
        >
          <FieldLabel>Location method</FieldLabel>
          <Controller
            control={form.control}
            name="locationMode"
            render={({ field }) => (
              <ChoiceCards
                name="location-mode"
                value={field.value}
                options={LOCATION_MODE_OPTIONS}
                disabled={disabled}
                columns="two"
                onValueChange={(value) => {
                  field.onChange(value);
                  setFormError(null);

                  if (value === "MANUAL") {
                    setCapturedLocation(null);
                    focusElement("address-line-1");
                    return;
                  }

                  form.clearErrors([...MANUAL_ADDRESS_ONLY_FIELDS]);
                }}
              />
            )}
          />
          <FieldMessage message={errors.locationMode?.message} />
        </Field>

        {locationMode === "MANUAL" ? (
          renderManualAddress()
        ) : (
          <div className="grid gap-3 rounded-2xl border border-primary/20 bg-primary/8 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <LocateFixed aria-hidden="true" className="size-5" />
              </span>
              <div className="grid min-w-0 gap-1">
                <p className="text-body-sm font-semibold text-foreground">
                  Share the proposed site location
                </p>
                <p className="text-caption text-muted-readable">
                  We will ask for confirmation before your browser requests GPS
                  permission. The application is submitted automatically after a
                  successful capture.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2.5 text-caption text-muted-readable">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-primary"
          />
          <p>
            Your contact and location details are sent only through the Ozotec
            ERP gateway for dealership evaluation and follow-up.
          </p>
        </div>
      </div>
    );
  }

  const planField =
    currentStep === "investmentTimeline" ||
    currentStep === "investmentBudget" ||
    currentStep === "alreadyRunningEvBusiness"
      ? currentStep
      : null;
  const planError =
    planField === null ? undefined : form.formState.errors[planField]?.message;
  const primaryLabel = isLocationStep
    ? locationMode === "GPS"
      ? "Share current location"
      : "Send application"
    : "Continue";
  const primaryIcon =
    submitState === "locating" || submitState === "submitting" ? (
      <LoaderCircle
        aria-hidden="true"
        className="animate-spin motion-reduce:animate-none"
      />
    ) : isLocationStep && locationMode === "GPS" ? (
      <LocateFixed aria-hidden="true" />
    ) : isLocationStep ? (
      <Send aria-hidden="true" />
    ) : (
      <ChevronRight aria-hidden="true" />
    );
  const footerActions =
    planField !== null ? (
      isFirstStep ? undefined : (
        <ContentFormActions className="mx-auto grid w-full max-w-xl grid-cols-1 border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={busy}
            className="min-h-12 w-full touch-manipulation sm:w-auto sm:justify-self-start"
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>
        </ContentFormActions>
      )
    ) : (
      <ContentFormActions
        className={cn(
          [
            "mx-auto grid w-full max-w-xl border-0 bg-transparent p-0",
            "shadow-none supports-[backdrop-filter]:bg-transparent",
          ].join(" "),
          isFirstStep ? "grid-cols-1" : "grid-cols-[auto_minmax(0,1fr)]",
        )}
      >
        {isFirstStep ? null : (
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={busy}
            className="min-h-12 min-w-24 touch-manipulation"
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>
        )}
        <Button
          type="button"
          form={FORM_ID}
          onClick={() => {
            void handlePrimaryAction();
          }}
          disabled={disabled}
          className="min-h-12 w-full touch-manipulation"
        >
          {primaryIcon}
          {submitState === "locating"
            ? "Confirming location"
            : submitState === "submitting"
              ? "Sending application"
              : primaryLabel}
        </Button>
      </ContentFormActions>
    );

  return (
    <>
      <PublicDealershipShell
        footerActions={footerActions}
        mainLabelledBy={PAGE_TITLE_ID}
      >
        <ContentRoot width="narrow" density="compact" className="max-w-xl">
          <header className="grid gap-3 px-1">
            <div className="grid gap-1">
              <h1
                id={PAGE_TITLE_ID}
                className="text-section-title text-foreground"
              >
                Apply for an Ozotec EV dealership
              </h1>
              <p className="text-body-sm text-muted-readable">
                Three quick questions, followed by contact and location details.
              </p>
            </div>
            <StepProgress
              current={stepIndex + 1}
              total={STEPS.length}
              stage={meta.stage}
            />
          </header>

          {!isOnline ? (
            <ContentStatus
              variant="warning"
              role="status"
              aria-live="polite"
              icon={<WifiOff aria-hidden="true" />}
              title="You are offline"
              description="Your answers remain on this page until you reconnect and submit."
            />
          ) : null}

          {formError === null ? null : <FormErrorAlert error={formError} />}

          <ContentSection
            className="border-primary/15 bg-card/95 shadow-lg shadow-primary/5"
            contentClassName="grid gap-5"
          >
            <form
              id={FORM_ID}
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void handlePrimaryAction();
              }}
            >
              <FieldSet className="grid gap-5" disabled={disabled}>
                <div className="grid gap-1.5">
                  <FieldLegend className="text-section-title">
                    {meta.title}
                  </FieldLegend>
                  {meta.description === undefined ? null : (
                    <FieldDescription className="text-body-sm">
                      {meta.description}
                    </FieldDescription>
                  )}
                </div>

                {planField === null ? null : (
                  <Field
                    {...(planError === undefined
                      ? {}
                      : { "data-invalid": true })}
                    className="gap-3"
                  >
                    {renderPlanQuestion()}
                    <p
                      className="text-caption text-muted-readable"
                      role="status"
                      aria-live="polite"
                    >
                      Select an option to continue automatically.
                    </p>
                    <FieldMessage message={planError} />
                  </Field>
                )}

                {currentStep === "contactDetails"
                  ? renderContactDetails()
                  : null}

                {currentStep === "dealershipLocation"
                  ? renderLocationDetails()
                  : null}

                {currentStep === "dealershipLocation" ? (
                  <div className="flex items-start gap-2.5 text-caption text-muted-readable">
                    <MapPin
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-primary"
                    />
                    <p>
                      GPS coordinates are submitted only after your explicit
                      confirmation.
                    </p>
                  </div>
                ) : null}
              </FieldSet>
            </form>
          </ContentSection>
        </ContentRoot>
      </PublicDealershipShell>

      <AlertDialog
        open={locationConfirmationOpen}
        onOpenChange={(open) => {
          if (!busy) {
            setLocationConfirmationOpen(open);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-primary/10 text-primary">
              <LocateFixed aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Are you currently at the proposed dealership site?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select Yes only when you are physically at the location where you
              plan to open the dealership. We will capture this device’s current
              location and submit your application automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              type="button"
              onClick={switchToManualAddress}
              disabled={busy}
              className="min-h-11"
            >
              No, enter address
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => {
                setLocationConfirmationOpen(false);
                void captureCurrentLocationAndSubmit();
              }}
              disabled={busy}
              className="min-h-11"
            >
              Yes, use this location
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// oz-next-app/src/features/engagement/service-feedback/ui/service-feedback-page.tsx
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  LoaderCircle,
  LocateFixed,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";

import {
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentForm,
  ContentFormActions,
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isApiHttpError } from "@/lib/api/problem";
import { idempotencyKey as createIdempotencyKey } from "@/lib/security/request-identifiers";
import { cn } from "@/lib/utils";

import { submitPublicServiceFeedback } from "@/features/engagement/service-feedback/api/service-feedback.client";
import {
  publicServiceFeedbackTokenSchema,
  serviceFeedbackFormSchema,
  type ServiceFeedbackFormValues,
  type ServiceFeedbackIssueCategory,
  type ServiceFeedbackLocationMode,
  type ServiceFeedbackSubmitRequest,
} from "@/features/engagement/service-feedback/contracts/service-feedback.schema";
import { PublicServiceFeedbackShell } from "@/features/engagement/service-feedback/ui/service-feedback-shell";
import { PublicFormStatusEmblem } from "@/features/engagement/shared/ui/public-form-status-emblem";

export type PublicServiceFeedbackPageProps = Readonly<{
  token: string;
}>;

type GeolocationFailureState =
  | "unsupported-browser"
  | "permission-denied"
  | "location-unavailable"
  | "timeout"
  | "unexpected-error";

type SubmitState =
  | "idle"
  | "locating"
  | "submitting"
  | "success"
  | "invalid-link"
  | GeolocationFailureState
  | "api-error";

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

type ChoiceOption<TValue extends string> = Readonly<{
  value: TValue;
  label: string;
  description: string;
}>;

type StepMeta = Readonly<{
  title: string;
  description: string;
  shortLabel: string;
}>;

type StepIndex = 0 | 1 | 2 | 3;
type FeedbackFieldPath = FieldPath<ServiceFeedbackFormValues>;

type SubmissionIntent = Readonly<{
  idempotencyKey: string;
  serializedFeedback: string;
}>;

const FORM_ID = "public-service-feedback-form";
const FINAL_STEP: StepIndex = 3;
const GEOLOCATION_TIMEOUT_MS = 15_000;
const GEO_PERMISSION_DENIED = 1;
const GEO_POSITION_UNAVAILABLE = 2;
const GEO_TIMEOUT = 3;
const MAX_ACCURACY_METERS = 100_000;
const MAX_REQUEST_ID_LENGTH = 128;
const MAX_RETRY_AFTER_SECONDS = 86_400;
const INDIA_DIAL_CODE = "+91";
const INDIA_MOBILE_MAX_LENGTH = 10;
const NON_DIGIT_PATTERN = /\D/gu;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:/@-]+$/u;

const STEPS = [
  {
    title: "How can we contact you?",
    description:
      "Provide the contact details Ozotec EV should use for this request.",
    shortLabel: "Contact",
  },
  {
    title: "What needs attention?",
    description: "Choose the category that most closely matches the concern.",
    shortLabel: "Category",
  },
  {
    title: "Tell us what happened",
    description:
      "Share the important facts so the support team can route the request correctly.",
    shortLabel: "Details",
  },
  {
    title: "Where should we follow up?",
    description:
      "Choose a current GPS position or enter the relevant address manually.",
    shortLabel: "Location",
  },
] as const satisfies readonly StepMeta[];

const ISSUE_CATEGORY_OPTIONS = [
  {
    value: "GENERAL_SERVICE",
    label: "General support",
    description: "Workshop appointment, delay, or general service concern.",
  },
  {
    value: "BATTERY",
    label: "Battery",
    description: "Battery backup, health, charging, or range concern.",
  },
  {
    value: "MOTOR_CONTROLLER",
    label: "Motor / controller",
    description: "Motor performance, controller, wiring, or ride issue.",
  },
  {
    value: "CHARGER",
    label: "Charger",
    description: "Home charger, charging failure, or adapter concern.",
  },
  {
    value: "BRAKE_TYRE",
    label: "Brake / tyre",
    description: "Brake, tyre, wheel, suspension, or safety concern.",
  },
  {
    value: "SPARE_PARTS",
    label: "Spare parts",
    description: "Part availability, replacement, or fitment support.",
  },
  {
    value: "DEALER_EXPERIENCE",
    label: "Dealer experience",
    description: "Dealer response, service quality, or escalation concern.",
  },
  {
    value: "WARRANTY",
    label: "Warranty",
    description: "Warranty support or claim-related concern.",
  },
  {
    value: "OTHER",
    label: "Other",
    description: "A concern that does not match the available categories.",
  },
] as const satisfies ReadonlyArray<ChoiceOption<ServiceFeedbackIssueCategory>>;

const LOCATION_MODE_OPTIONS = [
  {
    value: "GPS",
    label: "Use current location",
    description: "Fastest when you are at the relevant service location.",
  },
  {
    value: "MANUAL",
    label: "Enter address",
    description: "Use this when location permission is unavailable.",
  },
] as const satisfies ReadonlyArray<ChoiceOption<ServiceFeedbackLocationMode>>;

const STATE_COPY = {
  success: {
    title: "Feedback received",
    description:
      "Thank you. Ozotec EV has received your feedback or complaint.",
  },
  "invalid-link": {
    title: "Feedback link unavailable",
    description:
      "This secure link is invalid, inactive, expired, or already completed. Use the latest link from Ozotec EV.",
  },
  "unsupported-browser": {
    title: "Location is not supported",
    description:
      "This browser cannot request a secure location. Enter the address manually or open the link in an updated browser.",
  },
  "permission-denied": {
    title: "Location permission is blocked",
    description:
      "Allow location access for this site or continue with manual address entry.",
  },
  "location-unavailable": {
    title: "Location unavailable",
    description:
      "Check GPS and network signal, move to an open area, or enter the address manually.",
  },
  timeout: {
    title: "Location request timed out",
    description:
      "The device took too long to confirm its position. Try again or enter the address manually.",
  },
  "api-error": {
    title: "Feedback could not be submitted",
    description:
      "Your entered details remain on this page. Review them and try again using the same secure link.",
  },
  "unexpected-error": {
    title: "Something went wrong",
    description:
      "The request could not be completed safely. Refresh the page and try again.",
  },
} as const satisfies Record<
  Exclude<SubmitState, "idle" | "locating" | "submitting">,
  Readonly<{ title: string; description: string }>
>;

const OFFLINE_ERROR = {
  title: "Connect to the internet",
  description:
    "Your details remain on this page. Reconnect before submitting the feedback.",
} as const satisfies UserFacingError;

const DEFAULT_VALUES = {
  name: "",
  mobileNumber: "",
  email: "",
  issueCategory: "GENERAL_SERVICE",
  feedback: "",
  locationMode: "GPS",
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  state: "Tamil Nadu",
  postalCode: "",
} as const satisfies ServiceFeedbackFormValues;

const STEP_FIELDS = [
  ["name", "mobileNumber", "email"],
  ["issueCategory"],
  ["feedback"],
  [
    "locationMode",
    "addressLine1",
    "addressLine2",
    "city",
    "district",
    "state",
    "postalCode",
  ],
] as const satisfies ReadonlyArray<readonly FeedbackFieldPath[]>;

function subscribeToOnlineStatus(onStoreChange: () => void): () => void {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);

  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getOnlineStatus(): boolean {
  return navigator.onLine;
}

function getServerOnlineStatus(): boolean {
  return true;
}

function safeRequestId(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (
    normalized === undefined ||
    normalized.length === 0 ||
    normalized.length > MAX_REQUEST_ID_LENGTH ||
    !SAFE_REQUEST_ID_PATTERN.test(normalized)
  ) {
    return undefined;
  }

  return normalized;
}

function normalizeRetryAfterSeconds(value: number | undefined): number | null {
  if (
    value === undefined ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_RETRY_AFTER_SECONDS
  ) {
    return null;
  }

  return value;
}

function retryAfterDescription(seconds: number | null): string {
  if (seconds === null || seconds === 0) {
    return "Please wait briefly before trying to submit this feedback again.";
  }

  if (seconds < 60) {
    return `Please wait about ${String(seconds)} seconds before trying again.`;
  }

  const minutes = Math.max(1, Math.ceil(seconds / 60));

  return `Please wait about ${String(minutes)} minute${
    minutes === 1 ? "" : "s"
  } before trying again.`;
}

function isGeolocationError(error: unknown): error is GeolocationPositionError {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const code = error.code;

  return (
    typeof code === "number" &&
    (code === GEO_PERMISSION_DENIED ||
      code === GEO_POSITION_UNAVAILABLE ||
      code === GEO_TIMEOUT)
  );
}

function geolocationErrorState(
  error: GeolocationPositionError,
): Exclude<GeolocationFailureState, "unsupported-browser"> {
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
    if (!window.isSecureContext || !("geolocation" in navigator)) {
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

function locationFromPosition(
  position: GeolocationPosition,
): CapturedLocation | null {
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
    return null;
  }

  const rawAccuracy = position.coords.accuracy;
  const accuracyMeters =
    Number.isFinite(rawAccuracy) &&
    rawAccuracy >= 0 &&
    rawAccuracy <= MAX_ACCURACY_METERS
      ? rawAccuracy
      : undefined;

  return {
    latitude,
    longitude,
    ...(accuracyMeters === undefined ? {} : { accuracyMeters }),
  };
}

function isTerminalLinkError(error: unknown): boolean {
  if (!isApiHttpError(error)) {
    return false;
  }

  const code = error.code.toUpperCase();

  return (
    error.status === 401 ||
    error.status === 403 ||
    error.status === 404 ||
    error.status === 410 ||
    code.includes("EXPIRED") ||
    code.includes("USED") ||
    code.includes("CONSUMED") ||
    code.includes("NOT_FOUND") ||
    code.includes("INVALID_TOKEN")
  );
}

function errorFromUnknown(error: unknown): UserFacingError {
  if (isApiHttpError(error)) {
    const requestId = safeRequestId(error.requestId);
    let baseError: Omit<UserFacingError, "requestId">;

    if (error.status === 409) {
      baseError = {
        title: "Submission details changed",
        description:
          "A previous protected attempt used different details. Review the form and submit again to create a fresh attempt.",
      };
    } else if (error.status === 400 || error.status === 422) {
      baseError = {
        title: "Some details were not accepted",
        description:
          "Review every required field and submit again. Your entered information remains on this page.",
      };
    } else if (error.status === 429) {
      baseError = {
        title: "Too many submission attempts",
        description: retryAfterDescription(
          normalizeRetryAfterSeconds(error.retryAfterSeconds),
        ),
      };
    } else if (error.status >= 500) {
      baseError = {
        title: "Service temporarily unavailable",
        description:
          "Your entered details remain on this page. Keep the page open and try again shortly.",
      };
    } else {
      baseError = STATE_COPY["api-error"];
    }

    return requestId === undefined ? baseError : { ...baseError, requestId };
  }

  if (error instanceof Error && error.name === "NetworkError") {
    return {
      title: "Network request failed",
      description:
        "Check the internet connection and try again. Your entered details remain on this page.",
    };
  }

  return STATE_COPY["unexpected-error"];
}

function firstErrorStep(
  errors: Readonly<Partial<Record<FeedbackFieldPath, unknown>>>,
): StepIndex {
  for (let index = 0; index < STEP_FIELDS.length; index += 1) {
    const fields = STEP_FIELDS[index] ?? [];

    if (fields.some((field) => errors[field] !== undefined)) {
      return index as StepIndex;
    }
  }

  return 0;
}

function choiceOptionId(name: string, value: string): string {
  return `${name}-${value.toLocaleLowerCase("en-US").replaceAll("_", "-")}`;
}

function focusTargetIdForStep(step: StepIndex): string {
  switch (step) {
    case 0:
      return "service-feedback-name";
    case 1:
      return "service-feedback-category";
    case 2:
      return "service-feedback-message";
    case 3:
      return "service-feedback-location-mode-gps";
  }
}

function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
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

function labelFor<TValue extends string>(
  options: ReadonlyArray<ChoiceOption<TValue>>,
  value: TValue,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function descriptionFor<TValue extends string>(
  options: ReadonlyArray<ChoiceOption<TValue>>,
  value: TValue,
): string {
  return options.find((option) => option.value === value)?.description ?? "";
}

function toSubmitRequest(
  values: ServiceFeedbackFormValues,
  location: CapturedLocation | null,
): ServiceFeedbackSubmitRequest {
  const email = optionalNonEmpty(values.email)?.toLocaleLowerCase("en-US");
  const common = {
    name: values.name.trim(),
    mobileNumber: `${INDIA_DIAL_CODE}${values.mobileNumber.trim()}`,
    ...(email === undefined ? {} : { email }),
    issueCategory: values.issueCategory,
    feedback: values.feedback.trim(),
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

function ChoiceCards<TValue extends string>({
  name,
  value,
  options,
  disabled,
  onChange,
}: Readonly<{
  name: string;
  value: TValue;
  options: ReadonlyArray<ChoiceOption<TValue>>;
  disabled: boolean;
  onChange: (value: TValue) => void;
}>): React.ReactElement {
  return (
    <RadioGroup
      value={value}
      onValueChange={(nextValue) => {
        const selected = options.find((option) => option.value === nextValue);

        if (selected !== undefined) {
          onChange(selected.value);
        }
      }}
      disabled={disabled}
      className="grid gap-3 sm:grid-cols-2"
    >
      {options.map((option) => {
        const id = choiceOptionId(name, option.value);
        const checked = value === option.value;

        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              "group flex min-h-20 touch-manipulation cursor-pointer items-start gap-3 rounded-2xl border bg-card px-3.5 py-3.5 text-left shadow-xs transition-[border-color,background-color,box-shadow] duration-150 ease-out sm:px-4",
              "hover:border-primary/35 hover:bg-primary/4 hover:shadow-md focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 motion-reduce:transition-none",
              checked
                ? "border-primary/55 bg-primary/8 shadow-primary/10"
                : "border-border/80",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <RadioGroupItem
              id={id}
              value={option.value}
              aria-label={option.label}
              className="mt-0.5 size-5"
            />

            <span className="grid min-w-0 flex-1 gap-1">
              <span className="text-body text-foreground [font-weight:var(--typography-emphasis-weight)]">
                {option.label}
              </span>

              <span className="text-body-sm leading-relaxed text-muted-readable">
                {option.description}
              </span>
            </span>

            <ChevronRight
              aria-hidden="true"
              className={cn(
                "mt-0.5 size-4 shrink-0 text-muted-readable transition-transform duration-150 motion-reduce:transition-none",
                checked && "translate-x-0.5 text-primary",
              )}
            />
          </label>
        );
      })}
    </RadioGroup>
  );
}

function feedbackPreview(value: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return "Not provided";
  }

  return normalized.length <= 180
    ? normalized
    : `${normalized.slice(0, 179).trimEnd()}…`;
}

function SubmissionReview({
  values,
  locationCaptured,
}: Readonly<{
  values: ServiceFeedbackFormValues;
  locationCaptured: boolean;
}>): React.ReactElement {
  const mobile =
    values.mobileNumber.trim().length === INDIA_MOBILE_MAX_LENGTH
      ? `${INDIA_DIAL_CODE} ${values.mobileNumber.trim()}`
      : "Not provided";

  const proposedLocation =
    values.locationMode === "GPS"
      ? locationCaptured
        ? "Current GPS location captured"
        : "GPS permission will be requested before submission"
      : [
          values.addressLine1,
          values.addressLine2,
          values.city,
          values.district,
          values.state,
          values.postalCode,
        ]
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
          .join(", ") || "Manual address not completed";

  return (
    <ContentSection
      size="sm"
      title="Review before submitting"
      description="Use Back to correct any information."
      className="bg-muted/25"
    >
      <ContentDescriptionList columns="two">
        <ContentDescriptionItem term="Contact">
          <span className="break-words">
            {values.name.trim() || "Not provided"} · {mobile}
          </span>
        </ContentDescriptionItem>

        <ContentDescriptionItem term="Email">
          <span className="break-all">
            {values.email.trim() || "Not provided"}
          </span>
        </ContentDescriptionItem>

        <ContentDescriptionItem term="Category">
          {labelFor(ISSUE_CATEGORY_OPTIONS, values.issueCategory)}
        </ContentDescriptionItem>

        <ContentDescriptionItem term="Feedback">
          <span className="break-words">
            {feedbackPreview(values.feedback)}
          </span>
        </ContentDescriptionItem>

        <ContentDescriptionItem term="Follow-up location">
          <span className="break-words">{proposedLocation}</span>
        </ContentDescriptionItem>
      </ContentDescriptionList>
    </ContentSection>
  );
}

function FormErrorStatus({
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
              Reference:{" "}
              <code className="break-all text-tabular">{error.requestId}</code>
            </span>
          )}
        </>
      }
    />
  );
}

function StepProgress({
  step,
}: Readonly<{ step: StepIndex }>): React.ReactElement {
  const percentage = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex min-w-0 items-center justify-between gap-3 text-caption text-muted-readable">
        <span>
          Step {String(step + 1)} of {String(STEPS.length)}
        </span>

        <span className="text-tabular">
          {String(Math.round(percentage))}% complete
        </span>
      </div>

      <Progress
        value={percentage}
        aria-label="Feedback form progress"
        aria-valuetext={`Step ${String(step + 1)} of ${String(STEPS.length)}`}
      />

      <ol
        className="hidden grid-cols-4 gap-2 sm:grid"
        aria-label="Feedback form steps"
      >
        {STEPS.map((item, index) => {
          const complete = index < step;
          const current = index === step;

          return (
            <li
              key={item.shortLabel}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2",
                current
                  ? "border-primary/30 bg-primary/6"
                  : "border-border/60 bg-background/55",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-caption [font-weight:var(--typography-emphasis-weight)]",
                  complete
                    ? "bg-success text-success-foreground"
                    : current
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-readable",
                )}
              >
                {complete ? (
                  <CheckCircle2 aria-hidden="true" className="size-3.5" />
                ) : (
                  index + 1
                )}
              </span>

              <span className="min-w-0 truncate text-caption [font-weight:var(--typography-emphasis-weight)]">
                {item.shortLabel}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function StatusScreen({
  state,
}: Readonly<{
  state: "success" | "invalid-link";
}>): React.ReactElement {
  const copy = STATE_COPY[state];
  const success = state === "success";

  return (
    <PublicServiceFeedbackShell
      mainLabelledBy="service-feedback-status-title"
      mainClassName="items-center"
    >
      <ContentRoot
        width="narrow"
        density="compact"
        className="max-w-2xl px-3 py-8 sm:px-0 sm:py-6"
      >
        <div className="grid justify-items-center">
          <PublicFormStatusEmblem status={success ? "success" : "error"} />
        </div>

        <ContentSection
          className={cn(
            "bg-card/96 text-center shadow-xl shadow-foreground/5",
            success ? "border-success/25" : "border-destructive/20",
          )}
          title={<span id="service-feedback-status-title">{copy.title}</span>}
          description={copy.description}
        >
          <ContentStatus
            variant={success ? "success" : "destructive"}
            role="status"
            aria-live="polite"
            icon={
              success ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <AlertTriangle aria-hidden="true" />
              )
            }
            title={
              success
                ? "No further action is required"
                : "No feedback can be submitted from this link"
            }
            description={
              success
                ? "The support team can now review the submitted information. You may close this page."
                : "Open the latest Ozotec EV feedback link before trying again."
            }
          />

          <p className="mt-4 text-center text-caption leading-relaxed text-muted-readable">
            This public page does not expose internal ERP records or diagnostic
            data.
          </p>
        </ContentSection>
      </ContentRoot>
    </PublicServiceFeedbackShell>
  );
}

export function PublicServiceFeedbackPage({
  token,
}: PublicServiceFeedbackPageProps): React.ReactElement {
  const tokenResult = React.useMemo(
    () => publicServiceFeedbackTokenSchema.safeParse(token),
    [token],
  );

  const online = React.useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineStatus,
    getServerOnlineStatus,
  );

  const [step, setStep] = React.useState<StepIndex>(0);
  const [submitState, setSubmitState] = React.useState<SubmitState>("idle");
  const [formError, setFormError] = React.useState<UserFacingError | null>(
    null,
  );
  const [location, setLocation] = React.useState<CapturedLocation | null>(null);
  const [actionPending, setActionPending] = React.useState(false);

  const stepHeadingRef = React.useRef<HTMLHeadingElement | null>(null);
  const focusStepControlRef = React.useRef<StepIndex | null>(null);
  const mountedRef = React.useRef(true);
  const submissionLockRef = React.useRef(false);
  const locationLockRef = React.useRef(false);
  const submissionIntentRef = React.useRef<SubmissionIntent | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const errorStatusRef = React.useRef<HTMLDivElement | null>(null);

  const form = useForm<ServiceFeedbackFormValues>({
    resolver: zodResolver(serviceFeedbackFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const locationMode = useWatch({
    control: form.control,
    name: "locationMode",
  });

  const issueCategory = useWatch({
    control: form.control,
    name: "issueCategory",
  });

  const feedbackValue = useWatch({
    control: form.control,
    name: "feedback",
  });

  useWatch({
    control: form.control,
    name: [
      "addressLine1",
      "addressLine2",
      "city",
      "district",
      "state",
      "postalCode",
    ],
  });

  React.useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  React.useEffect(() => {
    if (formError === null) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      errorStatusRef.current?.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: "start",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [formError]);

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const shouldFocusControl = focusStepControlRef.current === step;

      const target = shouldFocusControl
        ? document.getElementById(focusTargetIdForStep(step))
        : null;

      const scrollTarget = target ?? stepHeadingRef.current;

      scrollTarget?.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: target === null ? "start" : "center",
      });

      if (target instanceof HTMLElement) {
        target.focus({ preventScroll: true });
      } else {
        stepHeadingRef.current?.focus({ preventScroll: true });
      }

      focusStepControlRef.current = null;
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [step]);

  const parsedToken = tokenResult.success ? tokenResult.data : null;
  const networkBusy =
    submitState === "locating" || submitState === "submitting";
  const busy = actionPending || networkBusy;
  const success = submitState === "success";
  const disabled = busy || success || parsedToken === null;
  const currentStep = STEPS[step];
  const reviewValues = form.getValues();

  const canUseManualRecovery =
    step === FINAL_STEP &&
    locationMode === "GPS" &&
    (submitState === "unsupported-browser" ||
      submitState === "permission-denied" ||
      submitState === "location-unavailable" ||
      submitState === "timeout");

  async function captureLocation(): Promise<CapturedLocation | null> {
    if (locationLockRef.current) {
      return null;
    }

    locationLockRef.current = true;
    setFormError(null);
    setSubmitState("locating");

    try {
      const position = await getCurrentPosition();

      if (!mountedRef.current) {
        return null;
      }

      const nextLocation = locationFromPosition(position);

      if (nextLocation === null) {
        setSubmitState("location-unavailable");
        setFormError(STATE_COPY["location-unavailable"]);
        return null;
      }

      setLocation(nextLocation);
      setSubmitState("idle");

      return nextLocation;
    } catch (caught: unknown) {
      if (!mountedRef.current) {
        return null;
      }

      if (isGeolocationError(caught)) {
        const nextState = geolocationErrorState(caught);

        setSubmitState(nextState);
        setFormError(STATE_COPY[nextState]);

        return null;
      }

      if (
        caught instanceof Error &&
        caught.message === "geolocation_unsupported"
      ) {
        setSubmitState("unsupported-browser");
        setFormError(STATE_COPY["unsupported-browser"]);

        return null;
      }

      setSubmitState("unexpected-error");
      setFormError(errorFromUnknown(caught));

      return null;
    } finally {
      locationLockRef.current = false;
    }
  }

  async function handleNext(): Promise<void> {
    if (disabled || step >= FINAL_STEP) {
      return;
    }

    setActionPending(true);
    setFormError(null);

    try {
      const valid = await form.trigger([...STEP_FIELDS[step]], {
        shouldFocus: true,
      });

      if (!valid) {
        return;
      }

      const nextStep = Math.min(step + 1, FINAL_STEP) as StepIndex;

      focusStepControlRef.current = nextStep;
      setStep(nextStep);
    } finally {
      setActionPending(false);
    }
  }

  function handleBack(): void {
    if (busy || step === 0) {
      return;
    }

    const previousStep = Math.max(step - 1, 0) as StepIndex;

    setFormError(null);
    focusStepControlRef.current = previousStep;
    setStep(previousStep);
  }

  function useManualAddress(): void {
    form.setValue("locationMode", "MANUAL", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    setLocation(null);
    setFormError(null);
    setSubmitState("idle");

    window.requestAnimationFrame(() => {
      document.getElementById("service-feedback-address-1")?.focus();
    });
  }

  async function handleSubmit(): Promise<void> {
    if (
      step !== FINAL_STEP ||
      parsedToken === null ||
      busy ||
      success ||
      submissionLockRef.current
    ) {
      return;
    }

    if (!online) {
      setFormError(OFFLINE_ERROR);
      return;
    }

    submissionLockRef.current = true;
    setActionPending(true);
    setFormError(null);

    let completed = false;

    try {
      const valid = await form.trigger(undefined, {
        shouldFocus: true,
      });

      if (!valid) {
        const errorStep = firstErrorStep(form.formState.errors);

        focusStepControlRef.current = errorStep;
        setStep(errorStep);

        return;
      }

      const values = serviceFeedbackFormSchema.parse(form.getValues());

      const resolvedLocation =
        values.locationMode === "GPS"
          ? (location ?? (await captureLocation()))
          : null;

      if (values.locationMode === "GPS" && resolvedLocation === null) {
        focusStepControlRef.current = FINAL_STEP;
        setStep(FINAL_STEP);

        return;
      }

      const feedback = toSubmitRequest(values, resolvedLocation);

      const serializedFeedback = JSON.stringify(feedback);
      const existingIntent = submissionIntentRef.current;

      const submissionIntent =
        existingIntent?.serializedFeedback === serializedFeedback
          ? existingIntent
          : {
              idempotencyKey: createIdempotencyKey("service-feedback"),
              serializedFeedback,
            };

      submissionIntentRef.current = submissionIntent;

      const controller = new AbortController();

      abortControllerRef.current?.abort();
      abortControllerRef.current = controller;

      setSubmitState("submitting");

      await submitPublicServiceFeedback({
        token: parsedToken,
        idempotencyKey: submissionIntent.idempotencyKey,
        feedback,
        signal: controller.signal,
      });

      if (controller.signal.aborted || !mountedRef.current) {
        return;
      }

      completed = true;
      setSubmitState("success");
    } catch (caught: unknown) {
      if (!mountedRef.current) {
        return;
      }

      if (caught instanceof DOMException && caught.name === "AbortError") {
        return;
      }

      if (isTerminalLinkError(caught)) {
        submissionIntentRef.current = null;
        setSubmitState("invalid-link");

        return;
      }

      if (isApiHttpError(caught) && caught.status === 409) {
        submissionIntentRef.current = null;
      }

      setSubmitState("api-error");
      setFormError(errorFromUnknown(caught));
    } finally {
      abortControllerRef.current = null;
      setActionPending(false);

      if (!completed) {
        submissionLockRef.current = false;
      }
    }
  }

  if (!tokenResult.success || submitState === "invalid-link") {
    return <StatusScreen state="invalid-link" />;
  }

  if (success) {
    return <StatusScreen state="success" />;
  }

  const footerActions = (
    <ContentFormActions className="mx-auto w-full max-w-3xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent sm:justify-between">
      <div className="hidden min-w-0 flex-1 sm:block" aria-hidden="true">
        <p className="truncate text-caption text-muted-readable">
          Step {String(step + 1)} of {String(STEPS.length)}
        </p>

        <p className="truncate text-body-sm text-foreground [font-weight:var(--typography-emphasis-weight)]">
          {currentStep.shortLabel}
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-80">
        <Button
          type="button"
          variant="outline"
          disabled={busy || step === 0}
          onClick={handleBack}
          className="min-h-12 w-full touch-manipulation"
        >
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>

        {step < FINAL_STEP ? (
          <Button
            type="button"
            disabled={disabled}
            onClick={() => {
              void handleNext();
            }}
            className="min-h-12 w-full touch-manipulation"
            aria-busy={actionPending}
          >
            {actionPending ? (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
              />
            ) : null}
            Continue
            <ChevronRight aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="submit"
            form={FORM_ID}
            disabled={disabled || !online}
            className="min-h-12 w-full touch-manipulation"
            aria-busy={busy}
            aria-describedby="service-feedback-submit-hint"
          >
            {submitState === "locating" || submitState === "submitting" ? (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
              />
            ) : !online ? (
              <WifiOff aria-hidden="true" />
            ) : (
              <ClipboardCheck aria-hidden="true" />
            )}

            {submitState === "locating"
              ? "Finding location…"
              : submitState === "submitting"
                ? "Submitting…"
                : !online
                  ? "Connect to submit"
                  : "Submit feedback"}
          </Button>
        )}
      </div>
    </ContentFormActions>
  );

  return (
    <PublicServiceFeedbackShell
      footerActions={footerActions}
      mainLabelledBy="service-feedback-form-title"
    >
      <ContentRoot
        width="narrow"
        density="compact"
        className="max-w-3xl px-3 py-4 sm:px-0 sm:py-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <Badge variant="outline">
            <ShieldCheck aria-hidden="true" />
            Official feedback request
          </Badge>

          <span className="inline-flex items-center gap-1.5 text-caption text-muted-readable">
            <Clock3 aria-hidden="true" className="size-3.5" />
            Usually 2–3 minutes
          </span>
        </div>

        <ContentSection
          aria-busy={busy}
          className="overflow-hidden border-primary/20 bg-card/96 shadow-xl shadow-primary/5"
          contentClassName="min-w-0"
        >
          <div className="grid gap-5 border-b border-border/70 pb-5">
            <StepProgress step={step} />

            <div className="grid gap-2">
              <h1
                ref={stepHeadingRef}
                id="service-feedback-form-title"
                tabIndex={-1}
                className="scroll-mt-24 text-page-title text-balance outline-none"
              >
                {currentStep.title}
              </h1>

              <p className="max-w-2xl text-body-sm leading-relaxed text-muted-readable text-pretty sm:text-body">
                {currentStep.description}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5">
            <div ref={errorStatusRef} className="scroll-mt-24">
              {!online ? (
                <ContentStatus
                  variant="warning"
                  role="status"
                  aria-live="polite"
                  icon={<WifiOff aria-hidden="true" />}
                  title="You are offline"
                  description="Continue filling the form. Reconnect before submitting."
                />
              ) : formError === null ? null : (
                <FormErrorStatus error={formError} />
              )}
            </div>

            {canUseManualRecovery ? (
              <ContentSection
                size="sm"
                title="Continue without GPS"
                description="Manual address entry does not require browser location permission."
                actions={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={useManualAddress}
                  >
                    <MapPin aria-hidden="true" />
                    Use manual address
                  </Button>
                }
              />
            ) : null}

            <ContentForm
              id={FORM_ID}
              noValidate
              className="[&_input]:text-base [&_textarea]:text-base sm:[&_input]:text-body-sm sm:[&_textarea]:text-body-sm"
              onSubmit={(event) => {
                event.preventDefault();

                if (step !== FINAL_STEP) {
                  return;
                }

                void handleSubmit();
              }}
            >
              <FieldGroup className="gap-5">
                {step === 0 ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      data-invalid={
                        form.formState.errors.name === undefined
                          ? undefined
                          : true
                      }
                    >
                      <FieldLabel htmlFor="service-feedback-name">
                        Name
                      </FieldLabel>

                      <Input
                        id="service-feedback-name"
                        type="text"
                        autoComplete="name"
                        enterKeyHint="next"
                        placeholder="Your full name"
                        aria-invalid={
                          form.formState.errors.name === undefined
                            ? undefined
                            : true
                        }
                        disabled={disabled}
                        {...form.register("name")}
                      />

                      {form.formState.errors.name?.message ===
                      undefined ? null : (
                        <FieldError>
                          {form.formState.errors.name.message}
                        </FieldError>
                      )}
                    </Field>

                    <Field
                      data-invalid={
                        form.formState.errors.mobileNumber === undefined
                          ? undefined
                          : true
                      }
                    >
                      <FieldLabel htmlFor="service-feedback-mobile">
                        Mobile number
                      </FieldLabel>

                      <Controller
                        control={form.control}
                        name="mobileNumber"
                        render={({ field }) => (
                          <div className="relative">
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-body-sm text-muted-readable"
                            >
                              {INDIA_DIAL_CODE}
                            </span>

                            <Input
                              id="service-feedback-mobile"
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel-national"
                              enterKeyHint="next"
                              maxLength={INDIA_MOBILE_MAX_LENGTH}
                              placeholder="9876543210"
                              className="pl-16"
                              aria-invalid={
                                form.formState.errors.mobileNumber === undefined
                                  ? undefined
                                  : true
                              }
                              disabled={disabled}
                              value={field.value}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              onChange={(event) => {
                                field.onChange(
                                  normalizeIndianMobileInput(
                                    event.target.value,
                                  ),
                                );
                              }}
                            />
                          </div>
                        )}
                      />

                      {form.formState.errors.mobileNumber?.message ===
                      undefined ? null : (
                        <FieldError>
                          {form.formState.errors.mobileNumber.message}
                        </FieldError>
                      )}
                    </Field>

                    <Field
                      className="sm:col-span-2"
                      data-invalid={
                        form.formState.errors.email === undefined
                          ? undefined
                          : true
                      }
                    >
                      <FieldLabel htmlFor="service-feedback-email">
                        Email{" "}
                        <span className="text-muted-readable">(optional)</span>
                      </FieldLabel>

                      <Input
                        id="service-feedback-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        enterKeyHint="done"
                        placeholder="name@example.com"
                        aria-invalid={
                          form.formState.errors.email === undefined
                            ? undefined
                            : true
                        }
                        disabled={disabled}
                        {...form.register("email")}
                      />

                      <FieldDescription>
                        Used only when email follow-up is appropriate.
                      </FieldDescription>

                      {form.formState.errors.email?.message ===
                      undefined ? null : (
                        <FieldError>
                          {form.formState.errors.email.message}
                        </FieldError>
                      )}
                    </Field>

                    <ContentStatus
                      className="sm:col-span-2"
                      variant="info"
                      role="note"
                      icon={<ShieldCheck aria-hidden="true" />}
                      title="Contact details are used for follow-up"
                      description="Do not enter OTPs, passwords, payment information, Aadhaar, PAN, or unrelated identity-document details."
                    />
                  </div>
                ) : null}

                {step === 1 ? (
                  <Controller
                    control={form.control}
                    name="issueCategory"
                    render={({ field }) => (
                      <Field
                        data-invalid={
                          form.formState.errors.issueCategory === undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="service-feedback-category">
                          Issue category
                        </FieldLabel>

                        <Select
                          value={field.value}
                          disabled={disabled}
                          onValueChange={(nextValue) => {
                            const selected = ISSUE_CATEGORY_OPTIONS.find(
                              (option) => option.value === nextValue,
                            );

                            if (selected !== undefined) {
                              field.onChange(selected.value);
                              field.onBlur();
                            }
                          }}
                        >
                          <SelectTrigger
                            id="service-feedback-category"
                            className="min-h-12 w-full"
                            aria-invalid={
                              form.formState.errors.issueCategory === undefined
                                ? undefined
                                : true
                            }
                          >
                            <SelectValue placeholder="Choose a category" />
                          </SelectTrigger>

                          <SelectContent>
                            {ISSUE_CATEGORY_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <FieldDescription>
                          {descriptionFor(
                            ISSUE_CATEGORY_OPTIONS,
                            issueCategory,
                          )}
                        </FieldDescription>

                        {form.formState.errors.issueCategory?.message ===
                        undefined ? null : (
                          <FieldError>
                            {form.formState.errors.issueCategory.message}
                          </FieldError>
                        )}
                      </Field>
                    )}
                  />
                ) : null}

                {step === 2 ? (
                  <div className="grid gap-5">
                    <Field
                      data-invalid={
                        form.formState.errors.feedback === undefined
                          ? undefined
                          : true
                      }
                    >
                      <FieldLabel htmlFor="service-feedback-message">
                        Feedback or complaint
                      </FieldLabel>

                      <Textarea
                        id="service-feedback-message"
                        rows={8}
                        maxLength={8_000}
                        placeholder="Describe the issue, when it happened, vehicle symptoms, previous service visits, and the support you need."
                        aria-invalid={
                          form.formState.errors.feedback === undefined
                            ? undefined
                            : true
                        }
                        aria-describedby="service-feedback-message-help service-feedback-message-count"
                        disabled={disabled}
                        className="min-h-48 resize-y"
                        {...form.register("feedback")}
                      />

                      <div className="flex flex-col gap-1 text-caption text-muted-readable sm:flex-row sm:items-center sm:justify-between">
                        <span id="service-feedback-message-help">
                          Include dates and symptoms when known. Avoid sensitive
                          financial or identity information.
                        </span>

                        <span
                          id="service-feedback-message-count"
                          className="shrink-0 text-tabular"
                        >
                          {String(feedbackValue.length)}/8000
                        </span>
                      </div>

                      {form.formState.errors.feedback?.message ===
                      undefined ? null : (
                        <FieldError>
                          {form.formState.errors.feedback.message}
                        </FieldError>
                      )}
                    </Field>

                    <ContentStatus
                      variant="info"
                      role="note"
                      icon={<MessageSquareText aria-hidden="true" />}
                      title="Clear details improve routing"
                      description="Explain what happened, when it happened, previous service action, and the resolution you expect."
                    />
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="grid gap-5">
                    <FieldSet disabled={disabled}>
                      <FieldLegend>Choose a location method</FieldLegend>

                      <FieldDescription>
                        Provide either one current GPS position or one manual
                        address.
                      </FieldDescription>

                      <Controller
                        control={form.control}
                        name="locationMode"
                        render={({ field }) => (
                          <ChoiceCards
                            name="service-feedback-location-mode"
                            value={field.value}
                            options={LOCATION_MODE_OPTIONS}
                            disabled={disabled}
                            onChange={(nextMode) => {
                              field.onChange(nextMode);
                              field.onBlur();
                              setLocation(null);
                              setFormError(null);
                              setSubmitState("idle");
                            }}
                          />
                        )}
                      />
                    </FieldSet>

                    {locationMode === "GPS" ? (
                      <div className="grid gap-4 rounded-3xl border border-border/70 bg-muted/30 p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                            <LocateFixed
                              aria-hidden="true"
                              className="size-5"
                            />
                          </span>

                          <div className="grid min-w-0 gap-1">
                            <p className="text-card-title">
                              Current GPS location
                            </p>

                            <p className="text-body-sm leading-relaxed text-muted-readable">
                              Capture the position while you are at the relevant
                              service or follow-up location.
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant={location === null ? "default" : "outline"}
                          disabled={disabled}
                          onClick={() => {
                            void captureLocation();
                          }}
                          className="min-h-12 w-full touch-manipulation"
                        >
                          {submitState === "locating" ? (
                            <LoaderCircle
                              aria-hidden="true"
                              className="animate-spin motion-reduce:animate-none"
                            />
                          ) : (
                            <LocateFixed aria-hidden="true" />
                          )}

                          {location === null
                            ? "Capture current location"
                            : "Refresh current location"}
                        </Button>

                        {location === null ? (
                          <p className="text-caption leading-relaxed text-muted-readable">
                            The browser asks for permission before any location
                            is captured. Submission can also request the
                            location automatically.
                          </p>
                        ) : (
                          <ContentStatus
                            variant="success"
                            role="status"
                            aria-live="polite"
                            icon={<CheckCircle2 aria-hidden="true" />}
                            title="Location ready"
                            description={
                              location.accuracyMeters === undefined
                                ? "The current position is ready for secure submission."
                                : `The current position is ready with approximately ${String(
                                    Math.round(location.accuracyMeters),
                                  )} metres accuracy.`
                            }
                          />
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-5">
                        <ContentStatus
                          variant="info"
                          role="note"
                          icon={<MapPin aria-hidden="true" />}
                          title="Manual follow-up address"
                          description="Manual entry does not require browser location permission."
                        />

                        <div className="grid gap-5 sm:grid-cols-2">
                          <Field
                            className="sm:col-span-2"
                            data-invalid={
                              form.formState.errors.addressLine1 === undefined
                                ? undefined
                                : true
                            }
                          >
                            <FieldLabel htmlFor="service-feedback-address-1">
                              Address line 1
                            </FieldLabel>

                            <Input
                              id="service-feedback-address-1"
                              type="text"
                              autoComplete="address-line1"
                              enterKeyHint="next"
                              placeholder="House / shop number, street, area"
                              aria-invalid={
                                form.formState.errors.addressLine1 === undefined
                                  ? undefined
                                  : true
                              }
                              disabled={disabled}
                              {...form.register("addressLine1")}
                            />

                            {form.formState.errors.addressLine1?.message ===
                            undefined ? null : (
                              <FieldError>
                                {form.formState.errors.addressLine1.message}
                              </FieldError>
                            )}
                          </Field>

                          <Field className="sm:col-span-2">
                            <FieldLabel htmlFor="service-feedback-address-2">
                              Address line 2{" "}
                              <span className="text-muted-readable">
                                (optional)
                              </span>
                            </FieldLabel>

                            <Input
                              id="service-feedback-address-2"
                              type="text"
                              autoComplete="address-line2"
                              enterKeyHint="next"
                              placeholder="Landmark or nearby location"
                              disabled={disabled}
                              {...form.register("addressLine2")}
                            />
                          </Field>

                          <Field
                            data-invalid={
                              form.formState.errors.city === undefined
                                ? undefined
                                : true
                            }
                          >
                            <FieldLabel htmlFor="service-feedback-city">
                              City
                            </FieldLabel>

                            <Input
                              id="service-feedback-city"
                              type="text"
                              autoComplete="address-level2"
                              enterKeyHint="next"
                              aria-invalid={
                                form.formState.errors.city === undefined
                                  ? undefined
                                  : true
                              }
                              disabled={disabled}
                              {...form.register("city")}
                            />

                            {form.formState.errors.city?.message ===
                            undefined ? null : (
                              <FieldError>
                                {form.formState.errors.city.message}
                              </FieldError>
                            )}
                          </Field>

                          <Field
                            data-invalid={
                              form.formState.errors.district === undefined
                                ? undefined
                                : true
                            }
                          >
                            <FieldLabel htmlFor="service-feedback-district">
                              District
                            </FieldLabel>

                            <Input
                              id="service-feedback-district"
                              type="text"
                              enterKeyHint="next"
                              aria-invalid={
                                form.formState.errors.district === undefined
                                  ? undefined
                                  : true
                              }
                              disabled={disabled}
                              {...form.register("district")}
                            />

                            {form.formState.errors.district?.message ===
                            undefined ? null : (
                              <FieldError>
                                {form.formState.errors.district.message}
                              </FieldError>
                            )}
                          </Field>

                          <Field
                            data-invalid={
                              form.formState.errors.state === undefined
                                ? undefined
                                : true
                            }
                          >
                            <FieldLabel htmlFor="service-feedback-state">
                              State
                            </FieldLabel>

                            <Input
                              id="service-feedback-state"
                              type="text"
                              autoComplete="address-level1"
                              enterKeyHint="next"
                              aria-invalid={
                                form.formState.errors.state === undefined
                                  ? undefined
                                  : true
                              }
                              disabled={disabled}
                              {...form.register("state")}
                            />

                            {form.formState.errors.state?.message ===
                            undefined ? null : (
                              <FieldError>
                                {form.formState.errors.state.message}
                              </FieldError>
                            )}
                          </Field>

                          <Field
                            data-invalid={
                              form.formState.errors.postalCode === undefined
                                ? undefined
                                : true
                            }
                          >
                            <FieldLabel htmlFor="service-feedback-postal-code">
                              PIN code
                            </FieldLabel>

                            <Controller
                              control={form.control}
                              name="postalCode"
                              render={({ field }) => (
                                <Input
                                  id="service-feedback-postal-code"
                                  type="text"
                                  inputMode="numeric"
                                  autoComplete="postal-code"
                                  enterKeyHint="done"
                                  maxLength={6}
                                  aria-invalid={
                                    form.formState.errors.postalCode ===
                                    undefined
                                      ? undefined
                                      : true
                                  }
                                  disabled={disabled}
                                  value={field.value}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  ref={field.ref}
                                  onChange={(event) => {
                                    field.onChange(
                                      normalizePostalCodeInput(
                                        event.target.value,
                                      ),
                                    );
                                  }}
                                />
                              )}
                            />

                            {form.formState.errors.postalCode?.message ===
                            undefined ? null : (
                              <FieldError>
                                {form.formState.errors.postalCode.message}
                              </FieldError>
                            )}
                          </Field>
                        </div>
                      </div>
                    )}

                    <SubmissionReview
                      values={reviewValues}
                      locationCaptured={location !== null}
                    />

                    <ContentStatus
                      variant="info"
                      role="note"
                      icon={<ShieldCheck aria-hidden="true" />}
                      title="Secure support submission"
                      description="Your response is sent through the Ozotec ERP gateway for support evaluation and follow-up."
                    />

                    <p
                      id="service-feedback-submit-hint"
                      className="text-caption leading-relaxed text-muted-readable"
                    >
                      By submitting, you confirm that the information is
                      accurate and authorize Ozotec EV to contact you about this
                      request.
                    </p>
                  </div>
                ) : null}
              </FieldGroup>
            </ContentForm>
          </div>
        </ContentSection>

        <p className="px-3 text-center text-caption leading-relaxed text-muted-readable text-pretty">
          Safe retry protection prevents duplicate submissions when the same
          completed feedback is retried.
        </p>
      </ContentRoot>
    </PublicServiceFeedbackShell>
  );
}

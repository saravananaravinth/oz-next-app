// oz-next-app/src/features/engagement/public-service-feedback/public-service-feedback-page.tsx
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
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { useParams } from "next/navigation";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { idempotencyKey as createIdempotencyKey } from "@/lib/uuid";

import { submitPublicServiceFeedback } from "./client";
import { PublicServiceFeedbackShell } from "./public-service-feedback-shell";
import {
  publicServiceFeedbackTokenSchema,
  serviceFeedbackFormSchema,
  type ServiceFeedbackFormValues,
  type ServiceFeedbackIssueCategory,
  type ServiceFeedbackLocationMode,
  type ServiceFeedbackSubmitRequest,
} from "./schemas";

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

type ChoiceOption<TValue extends string> = Readonly<{
  value: TValue;
  label: string;
  description?: string;
}>;

type StepMeta = Readonly<{
  title: string;
  description: string;
}>;

type StepIndex = 0 | 1 | 2;
type FeedbackFieldPath = FieldPath<ServiceFeedbackFormValues>;

const FORM_ID = "public-service-feedback-form";
const FINAL_STEP: StepIndex = 2;
const GEOLOCATION_TIMEOUT_MS = 15_000;
const GEO_PERMISSION_DENIED = 1;
const GEO_POSITION_UNAVAILABLE = 2;
const GEO_TIMEOUT = 3;
const INDIA_DIAL_CODE = "+91";
const INDIA_MOBILE_MAX_LENGTH = 10;
const NON_DIGIT_PATTERN = /\D/gu;

const STEPS = [
  {
    title: "Contact details",
    description: "Provide the best contact for follow-up on this request.",
  },
  {
    title: "Feedback details",
    description: "Tell us what happened and select the closest category.",
  },
  {
    title: "Location and review",
    description: "Choose GPS capture or enter the follow-up address manually.",
  },
] as const satisfies readonly StepMeta[];

const ISSUE_CATEGORY_OPTIONS = [
  {
    value: "GENERAL_SERVICE",
    label: "General support",
    description: "Workshop appointment, delay, or support concern.",
  },
  {
    value: "BATTERY",
    label: "Battery",
    description: "Battery backup, charging, health, or range concern.",
  },
  {
    value: "MOTOR_CONTROLLER",
    label: "Motor / controller",
    description: "Motor performance, controller, wiring, or ride issue.",
  },
  {
    value: "CHARGER",
    label: "Charger",
    description: "Home charger, charging failure, or adapter issue.",
  },
  {
    value: "BRAKE_TYRE",
    label: "Brake / tyre",
    description: "Brake, tyre, wheel, suspension, or road-safety issue.",
  },
  {
    value: "SPARE_PARTS",
    label: "Spare parts",
    description: "Parts availability, replacement, or fitment support.",
  },
  {
    value: "DEALER_EXPERIENCE",
    label: "Dealer experience",
    description: "Dealer response, support quality, or escalation.",
  },
  {
    value: "WARRANTY",
    label: "Warranty",
    description: "Warranty support or claim-related concern.",
  },
  {
    value: "OTHER",
    label: "Other",
    description: "Anything not listed above.",
  },
] as const satisfies ReadonlyArray<ChoiceOption<ServiceFeedbackIssueCategory>>;

const LOCATION_MODE_OPTIONS = [
  {
    value: "GPS",
    label: "Use current GPS location",
    description: "Fastest when you are at the relevant service location.",
  },
  {
    value: "MANUAL",
    label: "Enter address manually",
    description: "Use this when location permission is unavailable.",
  },
] as const satisfies ReadonlyArray<ChoiceOption<ServiceFeedbackLocationMode>>;

const STATE_COPY: Record<
  SubmitState,
  Readonly<{ title: string; description: string }>
> = {
  idle: {
    title: "Feedback / complaints",
    description:
      "Share your concern securely so Ozotec EV can review and follow up.",
  },
  locating: {
    title: "Finding your location",
    description:
      "Keep this page open while your device confirms the follow-up location.",
  },
  submitting: {
    title: "Submitting securely",
    description: "Your feedback is being sent through the secure ERP gateway.",
  },
  success: {
    title: "Feedback received",
    description:
      "Thank you. Ozotec EV has received your feedback or complaint.",
  },
  "invalid-link": {
    title: "Invalid feedback link",
    description:
      "This feedback link is invalid. Please use the latest link from Ozotec EV.",
  },
  "unsupported-browser": {
    title: "Location is not supported",
    description:
      "This browser cannot share a secure location. Use manual address entry or open the link in an updated browser.",
  },
  "permission-denied": {
    title: "Location permission is blocked",
    description:
      "Allow location access for this site or choose manual address entry.",
  },
  "location-unavailable": {
    title: "Location unavailable",
    description:
      "Your device could not determine its location. Check GPS and network access or enter the address manually.",
  },
  timeout: {
    title: "Location request timed out",
    description:
      "Your device took too long to provide a location. Try again or enter the address manually.",
  },
  "api-error": {
    title: "Feedback could not be submitted",
    description:
      "We could not submit your feedback right now. Review the details and try again using the same link.",
  },
  "unexpected-error": {
    title: "Something went wrong",
    description:
      "The feedback request could not be completed. Refresh the page and try again.",
  },
};

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
  ["issueCategory", "feedback"],
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

function isGeolocationError(error: unknown): error is GeolocationPositionError {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  return typeof error.code === "number";
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

function errorFromUnknown(error: unknown): UserFacingError {
  if (isApiHttpError(error)) {
    const code = error.code.toUpperCase();
    const requestId = safeRequestId(error.requestId);
    let baseError: Omit<UserFacingError, "requestId">;

    if (
      error.status === 404 ||
      error.status === 409 ||
      code.includes("EXPIRED") ||
      code.includes("USED") ||
      code.includes("NOT_FOUND")
    ) {
      baseError = {
        title: "Link expired or already used",
        description:
          "This feedback link is no longer active. Please use the latest link from Ozotec EV.",
      };
    } else if (error.status === 429) {
      baseError = {
        title: "Too many submission attempts",
        description:
          "Please wait briefly before trying to submit this feedback again.",
      };
    } else if (error.status >= 500) {
      baseError = {
        title: "Service temporarily unavailable",
        description:
          "The feedback service is temporarily unavailable. Your entered details remain on this page; try again shortly.",
      };
    } else {
      baseError = STATE_COPY["api-error"];
    }

    return requestId === undefined ? baseError : { ...baseError, requestId };
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

function toSubmitRequest(
  values: ServiceFeedbackFormValues,
  location: CapturedLocation | null,
): ServiceFeedbackSubmitRequest {
  const email = optionalNonEmpty(values.email);
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
        const id = `${name}-${option.value.toLowerCase().replace(/_/gu, "-")}`;
        const checked = value === option.value;

        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              "group flex min-h-20 cursor-pointer items-start gap-3 rounded-2xl border bg-card px-4 py-3.5 text-left shadow-xs transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out",
              "hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/4 hover:shadow-md focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 motion-reduce:transform-none motion-reduce:transition-none",
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
              {option.description === undefined ? null : (
                <span className="text-body-sm leading-relaxed text-muted-readable">
                  {option.description}
                </span>
              )}
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

function FormErrorAlert({
  error,
}: Readonly<{ error: UserFacingError }>): React.ReactElement {
  return (
    <Alert
      variant="destructive"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <AlertTriangle aria-hidden="true" />
      <AlertTitle>{error.title}</AlertTitle>
      <AlertDescription>
        <p>{error.description}</p>
        {error.requestId === undefined ? null : (
          <p className="mt-1 text-caption">
            Reference:{" "}
            <code className="break-all text-tabular">{error.requestId}</code>
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}

function StepProgress({
  step,
}: Readonly<{ step: StepIndex }>): React.ReactElement {
  const percentage = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3 text-caption text-muted-readable">
        <span>
          Step {String(step + 1)} of {String(STEPS.length)}
        </span>
        <span>{String(Math.round(percentage))}% complete</span>
      </div>

      <div
        role="progressbar"
        aria-label="Feedback form progress"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out motion-reduce:transition-none"
          style={{ width: `${String(percentage)}%` }}
        />
      </div>
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
      <section className="w-full max-w-xl px-4 sm:px-0">
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
          <CardHeader className="items-center gap-5 px-5 pt-7 text-center sm:px-8 sm:pt-9">
            <div
              className={cn(
                "flex size-16 items-center justify-center rounded-3xl border shadow-xs",
                success
                  ? "border-success/25 bg-success/10 text-success"
                  : "border-destructive/20 bg-destructive/8 text-destructive",
              )}
            >
              {success ? (
                <CheckCircle2 aria-hidden="true" className="size-8" />
              ) : (
                <AlertTriangle aria-hidden="true" className="size-8" />
              )}
            </div>

            <div className="grid gap-2">
              <p className="text-overline text-muted-readable">Ozotec EV</p>
              <h1
                id="service-feedback-status-title"
                className="text-section-title text-balance"
              >
                {copy.title}
              </h1>
              <CardDescription className="mx-auto max-w-md text-body-sm text-pretty text-muted-readable">
                {copy.description}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-5 sm:px-8">
            <Alert
              variant={success ? "success" : "destructive"}
              role="status"
              aria-live="polite"
            >
              {success ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <AlertTriangle aria-hidden="true" />
              )}
              <AlertTitle>
                {success ? "Submitted successfully" : "Link unavailable"}
              </AlertTitle>
              <AlertDescription>
                {success
                  ? "You may close this page. No further action is required."
                  : "Request a new secure feedback link before trying again."}
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="justify-center border-t border-border/70 bg-muted/30 px-5 py-4 text-center text-caption text-muted-readable sm:px-8">
            <p>No internal ERP records or diagnostics are exposed here.</p>
          </CardFooter>
        </Card>
      </section>
    </PublicServiceFeedbackShell>
  );
}

export function PublicServiceFeedbackPage(): React.ReactElement {
  const params = useParams<{ token?: string | string[] }>();
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const tokenResult = React.useMemo(
    () => publicServiceFeedbackTokenSchema.safeParse(rawToken ?? ""),
    [rawToken],
  );

  const [step, setStep] = React.useState<StepIndex>(0);
  const [submitState, setSubmitState] = React.useState<SubmitState>("idle");
  const [formError, setFormError] = React.useState<UserFacingError | null>(
    null,
  );
  const [location, setLocation] = React.useState<CapturedLocation | null>(null);
  const [actionPending, setActionPending] = React.useState(false);

  const mainRef = React.useRef<HTMLElement | null>(null);
  const stepHeadingRef = React.useRef<HTMLHeadingElement | null>(null);
  const mountedRef = React.useRef(false);
  const submissionLockRef = React.useRef(false);
  const locationLockRef = React.useRef(false);
  const idempotencyKeyRef = React.useRef<string | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

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

  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  React.useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const parsedToken = tokenResult.success ? tokenResult.data : null;
  const networkBusy =
    submitState === "locating" || submitState === "submitting";
  const busy = actionPending || networkBusy;
  const success = submitState === "success";
  const disabled = busy || success || parsedToken === null;
  const currentStep = STEPS[step];
  const selectedIssueDescription =
    ISSUE_CATEGORY_OPTIONS.find((option) => option.value === issueCategory)
      ?.description ?? "Select the closest category.";

  async function captureLocation(): Promise<CapturedLocation | null> {
    if (locationLockRef.current) {
      return null;
    }

    locationLockRef.current = true;
    setFormError(null);
    setSubmitState("locating");

    try {
      const position = await getCurrentPosition();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("invalid_geolocation_coordinates");
      }

      const accuracy =
        Number.isFinite(position.coords.accuracy) &&
        position.coords.accuracy >= 0
          ? position.coords.accuracy
          : undefined;
      const nextLocation: CapturedLocation = {
        latitude,
        longitude,
        ...(accuracy === undefined ? {} : { accuracyMeters: accuracy }),
      };

      setLocation(nextLocation);
      setSubmitState("idle");
      return nextLocation;
    } catch (caught) {
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

  async function handleNext(
    event: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (disabled || step >= FINAL_STEP) {
      return;
    }

    setActionPending(true);
    setFormError(null);

    try {
      const fields = STEP_FIELDS[step];
      const valid = await form.trigger([...fields], { shouldFocus: true });

      if (valid) {
        setStep((current) => Math.min(current + 1, FINAL_STEP) as StepIndex);
      }
    } finally {
      setActionPending(false);
    }
  }

  function handleBack(): void {
    if (busy) {
      return;
    }

    setFormError(null);
    setStep((current) => Math.max(current - 1, 0) as StepIndex);
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

    submissionLockRef.current = true;
    setActionPending(true);
    setFormError(null);
    let completed = false;

    try {
      const valid = await form.trigger(undefined, { shouldFocus: true });

      if (!valid) {
        setStep(firstErrorStep(form.formState.errors));
        return;
      }

      const values = serviceFeedbackFormSchema.parse(form.getValues());
      const resolvedLocation =
        values.locationMode === "GPS"
          ? (location ?? (await captureLocation()))
          : null;

      if (values.locationMode === "GPS" && resolvedLocation === null) {
        setStep(FINAL_STEP);
        return;
      }

      const idempotencyKey =
        idempotencyKeyRef.current ?? createIdempotencyKey("service-feedback");
      idempotencyKeyRef.current = idempotencyKey;

      const controller = new AbortController();
      abortControllerRef.current?.abort();
      abortControllerRef.current = controller;
      setSubmitState("submitting");

      const feedback = toSubmitRequest(values, resolvedLocation);

      await submitPublicServiceFeedback({
        token: parsedToken,
        idempotencyKey,
        feedback,
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      completed = true;
      setSubmitState("success");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        return;
      }

      setSubmitState("api-error");
      setFormError(errorFromUnknown(caught));
    } finally {
      setActionPending(false);

      if (!completed) {
        submissionLockRef.current = false;
      }
    }
  }

  if (!tokenResult.success) {
    return <StatusScreen state="invalid-link" />;
  }

  if (success) {
    return <StatusScreen state="success" />;
  }

  const footerActions = (
    <div className="mx-auto grid w-full max-w-3xl gap-2.5">
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={busy || step === 0}
          onClick={handleBack}
          className="h-12 rounded-2xl"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back
        </Button>

        {step < FINAL_STEP ? (
          <Button
            key="service-feedback-continue"
            type="button"
            disabled={disabled}
            onClick={(event) => {
              void handleNext(event);
            }}
            className="h-12 rounded-2xl"
          >
            {actionPending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            ) : null}
            Continue
          </Button>
        ) : (
          <Button
            key="service-feedback-submit"
            type="submit"
            form={FORM_ID}
            disabled={disabled}
            className="h-12 rounded-2xl"
          >
            {busy ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <ShieldCheck aria-hidden="true" className="size-4" />
            )}
            {submitState === "locating"
              ? "Capturing…"
              : submitState === "submitting"
                ? "Submitting…"
                : "Submit feedback"}
          </Button>
        )}
      </div>

      <p className="text-center text-[0.6875rem] leading-relaxed text-muted-readable sm:text-caption">
        Review the information before submission. This secure link may expire or
        allow only one completed response.
      </p>
    </div>
  );

  return (
    <PublicServiceFeedbackShell
      footerActions={footerActions}
      mainLabelledBy="service-feedback-form-title"
      mainRef={mainRef}
    >
      <section className="flex w-full max-w-3xl sm:px-0">
        <Card
          aria-busy={busy}
          className="w-full gap-0 overflow-hidden rounded-none border-x-0 border-y-0 border-border/70 bg-card/96 py-0 shadow-xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl sm:rounded-3xl sm:border"
        >
          <CardHeader className="gap-5 px-4 py-5 sm:px-7 sm:py-7">
            <div className="min-w-0">
              <p className="text-overline text-primary">
                Feedback / complaints
              </p>
              <h1
                ref={stepHeadingRef}
                id="service-feedback-form-title"
                tabIndex={-1}
                className="mt-1 text-section-title text-balance outline-none"
              >
                {currentStep.title}
              </h1>
              <CardDescription className="mt-1.5 max-w-2xl text-body-sm text-pretty text-muted-readable">
                {currentStep.description}
              </CardDescription>
            </div>

            <StepProgress step={step} />
          </CardHeader>

          <CardContent className="grid gap-5 px-4 pb-6 sm:px-7 sm:pb-7">
            {formError === null ? null : <FormErrorAlert error={formError} />}

            <form
              id={FORM_ID}
              noValidate
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
                      {form.formState.errors.email?.message ===
                      undefined ? null : (
                        <FieldError>
                          {form.formState.errors.email.message}
                        </FieldError>
                      )}
                    </Field>
                  </div>
                ) : null}

                {step === 1 ? (
                  <div className="grid gap-5">
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
                      <Controller
                        control={form.control}
                        name="issueCategory"
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={disabled}
                          >
                            <SelectTrigger
                              id="service-feedback-category"
                              className="h-11 w-full rounded-2xl"
                              aria-invalid={
                                form.formState.errors.issueCategory ===
                                undefined
                                  ? undefined
                                  : true
                              }
                            >
                              <SelectValue placeholder="Select issue category" />
                            </SelectTrigger>
                            <SelectContent
                              align="start"
                              className="max-h-[min(18rem,var(--radix-select-content-available-height))] rounded-2xl"
                            >
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
                        )}
                      />
                      <FieldDescription>
                        {selectedIssueDescription}
                      </FieldDescription>
                      {form.formState.errors.issueCategory?.message ===
                      undefined ? null : (
                        <FieldError>
                          {form.formState.errors.issueCategory.message}
                        </FieldError>
                      )}
                    </Field>

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
                        placeholder="Describe the issue, vehicle concern, dealer interaction, or support required."
                        aria-invalid={
                          form.formState.errors.feedback === undefined
                            ? undefined
                            : true
                        }
                        disabled={disabled}
                        {...form.register("feedback")}
                      />
                      <FieldDescription>
                        Do not include OTPs, passwords, payment information, or
                        unrelated identity documents.
                      </FieldDescription>
                      {form.formState.errors.feedback?.message ===
                      undefined ? null : (
                        <FieldError>
                          {form.formState.errors.feedback.message}
                        </FieldError>
                      )}
                    </Field>

                    <div className="flex items-start gap-3 rounded-2xl border border-info/20 bg-info/5 p-4 text-info dark:border-info/30 dark:bg-info/10">
                      <MessageSquareText
                        aria-hidden="true"
                        className="mt-0.5 size-5 shrink-0"
                      />
                      <p className="text-body-sm leading-relaxed">
                        Clear dates, symptoms, and service history help the team
                        route your request accurately.
                      </p>
                    </div>
                  </div>
                ) : null}

                {step === 2 ? (
                  <>
                    <FieldSet disabled={disabled}>
                      <FieldLegend>
                        How would you like to provide the location?
                      </FieldLegend>
                      <FieldDescription>
                        Choose one method. You do not need to provide both GPS
                        and a manual address.
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
                              setFormError(null);
                              setSubmitState("idle");
                            }}
                          />
                        )}
                      />
                    </FieldSet>

                    {locationMode === "GPS" ? (
                      <div className="grid gap-4 rounded-2xl border border-border/70 bg-muted/30 p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                            <LocateFixed
                              aria-hidden="true"
                              className="size-5"
                            />
                          </span>
                          <div className="grid min-w-0 gap-1">
                            <p className="text-card-title">
                              Capture current location
                            </p>
                            <p className="text-body-sm leading-relaxed text-muted-readable">
                              Use this while present at the relevant service or
                              follow-up location.
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
                          className="h-12 rounded-2xl"
                        >
                          {submitState === "locating" ? (
                            <LoaderCircle
                              aria-hidden="true"
                              className="size-4 animate-spin motion-reduce:animate-none"
                            />
                          ) : (
                            <LocateFixed
                              aria-hidden="true"
                              className="size-4"
                            />
                          )}
                          {location === null
                            ? "Capture current GPS location"
                            : "Refresh GPS location"}
                        </Button>

                        {location === null ? (
                          <p className="text-caption text-muted-readable">
                            Your browser will request permission. Coordinates
                            are submitted only with this feedback.
                          </p>
                        ) : (
                          <Alert
                            variant="success"
                            role="status"
                            aria-live="polite"
                          >
                            <CheckCircle2 aria-hidden="true" />
                            <AlertTitle>GPS location captured</AlertTitle>
                            <AlertDescription>
                              The position is ready for secure submission
                              {location.accuracyMeters === undefined
                                ? "."
                                : ` with approximately ${String(
                                    Math.round(location.accuracyMeters),
                                  )} metres accuracy.`}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-5">
                        <div className="flex items-start gap-3 rounded-2xl border border-info/20 bg-info/5 p-4 text-info dark:border-info/30 dark:bg-info/10">
                          <MapPin
                            aria-hidden="true"
                            className="mt-0.5 size-5 shrink-0"
                          />
                          <p className="text-body-sm leading-relaxed">
                            Manual entry avoids location permission. The PIN
                            code may be used for approximate territory routing.
                          </p>
                        </div>

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

                    <div className="flex items-start gap-3 rounded-2xl border border-info/20 bg-info/5 p-4 text-info dark:border-info/30 dark:bg-info/10">
                      <ShieldCheck
                        aria-hidden="true"
                        className="mt-0.5 size-5 shrink-0"
                      />
                      <p className="text-body-sm leading-relaxed">
                        Your response is sent only through the Ozotec ERP
                        gateway and is used for support evaluation and
                        follow-up.
                      </p>
                    </div>
                  </>
                ) : null}
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </section>
    </PublicServiceFeedbackShell>
  );
}

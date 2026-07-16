// oz-next-app/src/features/engagement/public-dealership/public-dealership-application-page.tsx
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
  ShieldCheck,
} from "lucide-react";
import { useParams } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";

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
import { Textarea } from "@/components/ui/textarea";
import { isApiHttpError } from "@/lib/api/problem";
import { cn } from "@/lib/utils";
import { idempotencyKey as createIdempotencyKey } from "@/lib/uuid";

import { PublicFormStatusEmblem } from "../public-form-status-emblem";
import { submitPublicDealershipApplication } from "./client";
import { PublicDealershipShell } from "./public-dealership-shell";
import {
  dealershipInterestFormSchema,
  publicDealershipTokenSchema,
  type DealershipApplicationSubmitRequest,
  type DealershipInterestFormValues,
  type DealershipLocationMode,
  type InvestmentBudget,
  type InvestmentTimeline,
  type RunningEvBusiness,
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

const FORM_ID = "public-dealership-application-form";
const GEOLOCATION_TIMEOUT_MS = 15_000;
const GEO_PERMISSION_DENIED = 1;
const GEO_POSITION_UNAVAILABLE = 2;
const GEO_TIMEOUT = 3;
const MAX_NOTES_LENGTH = 2_000;
const INDIA_DIAL_CODE = "+91";
const INDIA_MOBILE_MAX_LENGTH = 10;
const NON_DIGIT_PATTERN = /\D/gu;
const CONTROL_CHARACTER_MAX_CODE_POINT = 0x1f;
const DELETE_CHARACTER_CODE_POINT = 0x7f;

const STEP_META = [
  {
    title: "Investment timeline",
    description: "Tell us when you are planning to begin the partnership.",
  },
  {
    title: "Investment readiness",
    description: "Share your planned investment and current EV experience.",
  },
  {
    title: "Contact details",
    description: "Provide the primary contact for this dealership request.",
  },
  {
    title: "Location and review",
    description:
      "Choose GPS capture or enter the proposed dealership address manually.",
  },
] as const satisfies readonly StepMeta[];

const FINAL_STEP_INDEX = STEP_META.length - 1;

const INVESTMENT_TIMELINE_OPTIONS = [
  {
    value: "IMMEDIATE",
    label: "Immediate",
    description: "Ready to start the dealership discussion now.",
  },
  {
    value: "WITHIN_1_MONTH",
    label: "Within 1 month",
    description: "Planning to proceed after a short evaluation.",
  },
  {
    value: "WITHIN_2_MONTHS",
    label: "Within 2 months",
    description: "Exploring options for a near-term investment.",
  },
] as const satisfies ReadonlyArray<ChoiceOption<InvestmentTimeline>>;

const INVESTMENT_BUDGET_OPTIONS = [
  {
    value: "BELOW_10_LAKHS",
    label: "Below ₹10 lakh",
    description: "Initial investment below ₹10 lakh.",
  },
  {
    value: "TEN_TO_20_LAKHS",
    label: "₹10 lakh to ₹20 lakh",
    description: "Planned investment between ₹10 lakh and ₹20 lakh.",
  },
  {
    value: "ABOVE_20_LAKHS",
    label: "Above ₹20 lakh",
    description: "Planned investment above ₹20 lakh.",
  },
] as const satisfies ReadonlyArray<ChoiceOption<InvestmentBudget>>;

const RUNNING_EV_BUSINESS_OPTIONS = [
  {
    value: "YES",
    label: "Yes",
    description: "I currently operate an EV-related business.",
  },
  {
    value: "NO",
    label: "No",
    description: "This would be my first EV business.",
  },
] as const satisfies ReadonlyArray<ChoiceOption<RunningEvBusiness>>;

const LOCATION_MODE_OPTIONS = [
  {
    value: "GPS",
    label: "Use current GPS location",
    description: "Fastest option when you are at the proposed dealership site.",
  },
  {
    value: "MANUAL",
    label: "Enter address manually",
    description:
      "Use this when you are elsewhere or location access is unavailable.",
  },
] as const satisfies ReadonlyArray<ChoiceOption<DealershipLocationMode>>;

const STATE_COPY: Record<
  SubmitState,
  Readonly<{ title: string; description: string }>
> = {
  idle: {
    title: "Dealership application",
    description:
      "Complete the application to help Ozotec EV evaluate your dealership request.",
  },
  locating: {
    title: "Finding your location",
    description:
      "Keep this page open while your device confirms the proposed dealership position.",
  },
  submitting: {
    title: "Submitting securely",
    description:
      "Your dealership application is being sent through the secure ERP gateway.",
  },
  success: {
    title: "Application received",
    description:
      "Thank you. Ozotec EV has received your dealership application for evaluation.",
  },
  "invalid-link": {
    title: "Invalid application link",
    description:
      "This dealership application link is invalid. Please use the latest link sent by Ozotec EV.",
  },
  "unsupported-browser": {
    title: "Location is not supported",
    description:
      "This browser cannot share a secure location. Open the link in an updated version of Chrome, Safari, Edge, or Firefox.",
  },
  "permission-denied": {
    title: "Location permission is blocked",
    description:
      "Allow location access for this site in your browser settings, then try capturing the location again.",
  },
  "location-unavailable": {
    title: "Location unavailable",
    description:
      "Your device could not determine its location. Check GPS and network access, move to an open area, and try again.",
  },
  timeout: {
    title: "Location request timed out",
    description:
      "Your device took too long to provide a location. Check GPS and network signal, then try again.",
  },
  "api-error": {
    title: "Application could not be submitted",
    description:
      "We could not submit your dealership application right now. Review the details and try again using the same link.",
  },
  "unexpected-error": {
    title: "Something went wrong",
    description:
      "The dealership application could not be completed. Refresh the page and try again.",
  },
};

const DEFAULT_VALUES = {
  investmentTimeline: "IMMEDIATE",
  investmentBudget: "BELOW_10_LAKHS",
  alreadyRunningEvBusiness: "NO",
  applicantName: "",
  businessName: "",
  mobileNumber: "",
  email: "",
  locationMode: "GPS",
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  state: "",
  postalCode: "",
  notes: "",
} as const satisfies DealershipInterestFormValues;

const STEP_FIELDS = [
  ["investmentTimeline"],
  ["investmentBudget", "alreadyRunningEvBusiness"],
  ["applicantName", "mobileNumber", "email"],
  ["locationMode", "addressLine1", "city", "district", "state", "postalCode"],
] as const satisfies ReadonlyArray<
  ReadonlyArray<keyof DealershipInterestFormValues>
>;

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
          "This dealership application link is no longer active. Please use the latest link from Ozotec EV.",
      };
    } else if (error.status === 429) {
      baseError = {
        title: "Too many submission attempts",
        description:
          "Please wait briefly before trying to submit this application again.",
      };
    } else if (error.status >= 500) {
      baseError = {
        title: "Service temporarily unavailable",
        description:
          "The application service is temporarily unavailable. Your entered details remain on this page; try again shortly.",
      };
    } else {
      baseError = {
        title: STATE_COPY["api-error"].title,
        description: STATE_COPY["api-error"].description,
      };
    }

    return requestId === undefined ? baseError : { ...baseError, requestId };
  }

  return {
    title: STATE_COPY["unexpected-error"].title,
    description: STATE_COPY["unexpected-error"].description,
  };
}

function firstErrorStep(
  errors: Readonly<
    Partial<Record<keyof DealershipInterestFormValues, unknown>>
  >,
): number {
  for (let index = 0; index < STEP_FIELDS.length; index += 1) {
    const fields = STEP_FIELDS[index] ?? [];

    if (fields.some((field) => errors[field] !== undefined)) {
      return index;
    }
  }

  return 0;
}

function labelFor<TValue extends string>(
  options: ReadonlyArray<ChoiceOption<TValue>>,
  value: TValue,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
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

function buildNotes(
  values: DealershipInterestFormValues,
  location: CapturedLocation | null,
): string {
  const parts = [
    "Dealership intake details",
    `Investment timeline: ${labelFor(INVESTMENT_TIMELINE_OPTIONS, values.investmentTimeline)}`,
    `Prepared investment: ${labelFor(INVESTMENT_BUDGET_OPTIONS, values.investmentBudget)}`,
    `Already running EV business: ${labelFor(RUNNING_EV_BUSINESS_OPTIONS, values.alreadyRunningEvBusiness)}`,
    `Location method: ${labelFor(LOCATION_MODE_OPTIONS, values.locationMode)}`,
    location?.accuracyMeters === undefined
      ? null
      : `GPS accuracy: ${String(Math.round(location.accuracyMeters))} meters`,
    optionalNonEmpty(values.notes) === undefined
      ? null
      : `Additional notes: ${truncateText(values.notes, 1_000)}`,
  ].filter((value): value is string => value !== null);

  return truncateText(parts.join("\n"), MAX_NOTES_LENGTH);
}

function toSubmitRequest(
  values: DealershipInterestFormValues,
  location: CapturedLocation | null,
): DealershipApplicationSubmitRequest {
  const businessName = optionalNonEmpty(values.businessName);
  const common = {
    applicantName: values.applicantName.trim(),
    ...(businessName === undefined ? {} : { businessName }),
    mobileNumber: `${INDIA_DIAL_CODE}${values.mobileNumber.trim()}`,
    email: values.email.trim(),
    notes: buildNotes(values, location),
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

function ChoiceCards<TValue extends string>({
  name,
  value,
  options,
  disabled,
  onChange,
  columns = 1,
}: Readonly<{
  name: string;
  value: TValue;
  options: ReadonlyArray<ChoiceOption<TValue>>;
  disabled: boolean;
  onChange: (value: TValue) => void;
  columns?: 1 | 2;
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
      className={cn(
        "grid gap-3",
        columns === 2 ? "sm:grid-cols-2" : "grid-cols-1",
      )}
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
}: Readonly<{ step: number }>): React.ReactElement {
  const percentage = ((step + 1) / STEP_META.length) * 100;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3 text-caption text-muted-readable">
        <span>
          Step {String(step + 1)} of {String(STEP_META.length)}
        </span>
        <span>{String(Math.round(percentage))}% complete</span>
      </div>

      <div
        role="progressbar"
        aria-label="Dealership application progress"
        aria-valuemin={1}
        aria-valuemax={STEP_META.length}
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
  error,
}: Readonly<{
  state: "success" | "invalid-link";
  error?: UserFacingError;
}>): React.ReactElement {
  const copy = STATE_COPY[state];
  const success = state === "success";

  return (
    <PublicDealershipShell
      mainLabelledBy="dealership-status-title"
      mainClassName="items-center"
    >
      <section className="w-full max-w-xl px-4 sm:px-0">
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
          <CardHeader className="items-center gap-5 px-5 pt-7 text-center sm:px-8 sm:pt-9">
            <PublicFormStatusEmblem status={success ? "success" : "error"} />

            <div className="grid gap-2">
              <p className="text-overline text-muted-readable">Ozotec EV</p>
              <h1
                id="dealership-status-title"
                className="text-section-title text-balance"
              >
                {copy.title}
              </h1>
              <CardDescription className="mx-auto max-w-md text-body-sm text-pretty text-muted-readable">
                {copy.description}
              </CardDescription>
            </div>
          </CardHeader>

          {error === undefined ? null : (
            <CardContent className="px-5 sm:px-8">
              <FormErrorAlert error={error} />
            </CardContent>
          )}

          <CardFooter className="justify-center border-t border-border/70 bg-muted/30 px-5 py-4 text-center text-caption text-muted-readable sm:px-8">
            <p>
              This public page never exposes internal ERP records or diagnostic
              details.
            </p>
          </CardFooter>
        </Card>
      </section>
    </PublicDealershipShell>
  );
}

export function PublicDealershipApplicationPage(): React.ReactElement {
  const params = useParams<{ token?: string | string[] }>();
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const tokenResult = React.useMemo(
    () => publicDealershipTokenSchema.safeParse(rawToken ?? ""),
    [rawToken],
  );

  const [step, setStep] = React.useState(0);
  const [submitState, setSubmitState] = React.useState<SubmitState>("idle");
  const [formError, setFormError] = React.useState<UserFacingError | null>(
    null,
  );
  const [location, setLocation] = React.useState<CapturedLocation | null>(null);
  const [actionPending, setActionPending] = React.useState(false);

  const stepHeadingRef = React.useRef<HTMLHeadingElement | null>(null);
  const scrollContainerRef = React.useRef<HTMLElement | null>(null);
  const mountedRef = React.useRef(false);
  const submissionLockRef = React.useRef(false);
  const locationLockRef = React.useRef(false);
  const idempotencyKeyRef = React.useRef<string | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const form = useForm<DealershipInterestFormValues>({
    resolver: zodResolver(dealershipInterestFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });
  const locationMode = useWatch({
    control: form.control,
    name: "locationMode",
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

    const frameId = window.requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({
        top: 0,
        behavior: "auto",
      });
      stepHeadingRef.current?.focus({
        preventScroll: true,
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [step]);

  const parsedToken = tokenResult.success ? tokenResult.data : null;
  const networkBusy =
    submitState === "locating" || submitState === "submitting";
  const busy = actionPending || networkBusy;
  const success = submitState === "success";
  const disabled = busy || success || parsedToken === null;

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
        setFormError({
          title: STATE_COPY[nextState].title,
          description: STATE_COPY[nextState].description,
        });
        return null;
      }

      if (
        caught instanceof Error &&
        caught.message === "geolocation_unsupported"
      ) {
        setSubmitState("unsupported-browser");
        setFormError({
          title: STATE_COPY["unsupported-browser"].title,
          description: STATE_COPY["unsupported-browser"].description,
        });
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
    if (disabled) {
      return;
    }

    setActionPending(true);
    setFormError(null);

    try {
      const fields = STEP_FIELDS[step] ?? [];
      const valid = await form.trigger([...fields], { shouldFocus: true });

      if (valid) {
        setStep((current) => Math.min(current + 1, FINAL_STEP_INDEX));
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
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit(): Promise<void> {
    if (
      step !== FINAL_STEP_INDEX ||
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

      const values = dealershipInterestFormSchema.parse(form.getValues());
      const resolvedLocation =
        values.locationMode === "GPS"
          ? (location ?? (await captureLocation()))
          : null;

      if (values.locationMode === "GPS" && resolvedLocation === null) {
        setStep(FINAL_STEP_INDEX);
        return;
      }

      const idempotencyKey =
        idempotencyKeyRef.current ?? createIdempotencyKey("dealership");
      idempotencyKeyRef.current = idempotencyKey;

      const controller = new AbortController();
      abortControllerRef.current?.abort();
      abortControllerRef.current = controller;
      setSubmitState("submitting");

      const application = toSubmitRequest(values, resolvedLocation);

      await submitPublicDealershipApplication({
        token: parsedToken,
        idempotencyKey,
        application,
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

  const currentStep = STEP_META[step] ?? STEP_META[0];
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

        {step < FINAL_STEP_INDEX ? (
          <Button
            key="continue-action"
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void handleNext();
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
            key="submit-action"
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
            ) : null}
            {submitState === "locating"
              ? "Capturing…"
              : submitState === "submitting"
                ? "Submitting…"
                : "Submit application"}
          </Button>
        )}
      </div>

      <p className="text-center text-[0.6875rem] leading-relaxed text-muted-readable sm:text-caption">
        Review each detail before submission. This link may expire or be limited
        to one completed application.
      </p>
    </div>
  );

  return (
    <PublicDealershipShell
      footerActions={footerActions}
      mainLabelledBy="dealership-form-title"
      mainRef={scrollContainerRef}
    >
      <section className="w-full max-w-3xl self-start sm:px-0">
        <Card
          aria-busy={busy}
          className="w-full gap-0 overflow-hidden rounded-none border-x-0 border-y-0 border-border/70 bg-card/96 py-0 shadow-xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl sm:rounded-3xl sm:border"
        >
          <CardHeader className="gap-5 px-4 py-5 sm:px-7 sm:py-7">
            <div className="flex items-start">
              <div className="min-w-0 flex-1">
                <p className="text-overline text-primary">
                  Dealership application
                </p>
                <h1
                  ref={stepHeadingRef}
                  id="dealership-form-title"
                  tabIndex={-1}
                  className="mt-1 text-section-title text-balance outline-none"
                >
                  {currentStep.title}
                </h1>
                <CardDescription className="mt-1.5 max-w-2xl text-body-sm text-pretty text-muted-readable">
                  {currentStep.description}
                </CardDescription>
              </div>
            </div>

            <StepProgress step={step} />
          </CardHeader>

          <CardContent className="grid flex-1 gap-5 px-4 pb-6 sm:px-7 sm:pb-7">
            {formError === null ? null : <FormErrorAlert error={formError} />}

            <form
              id={FORM_ID}
              noValidate
              onSubmit={(event) => {
                event.preventDefault();

                if (step !== FINAL_STEP_INDEX) {
                  return;
                }

                void handleSubmit();
              }}
            >
              <FieldGroup className="gap-5">
                {step === 0 ? (
                  <FieldSet disabled={disabled}>
                    <FieldLegend>When are you planning to invest?</FieldLegend>
                    <FieldDescription>
                      Select the option that best reflects your current plan.
                    </FieldDescription>

                    <Controller
                      control={form.control}
                      name="investmentTimeline"
                      render={({ field }) => (
                        <ChoiceCards
                          name="investment-timeline"
                          value={field.value}
                          options={INVESTMENT_TIMELINE_OPTIONS}
                          disabled={disabled}
                          onChange={field.onChange}
                        />
                      )}
                    />

                    {form.formState.errors.investmentTimeline?.message ===
                    undefined ? null : (
                      <FieldError>
                        {form.formState.errors.investmentTimeline.message}
                      </FieldError>
                    )}
                  </FieldSet>
                ) : null}

                {step === 1 ? (
                  <>
                    <FieldSet disabled={disabled}>
                      <FieldLegend>
                        How much are you prepared to invest?
                      </FieldLegend>
                      <FieldDescription>
                        Choose the closest planned investment range.
                      </FieldDescription>

                      <Controller
                        control={form.control}
                        name="investmentBudget"
                        render={({ field }) => (
                          <ChoiceCards
                            name="investment-budget"
                            value={field.value}
                            options={INVESTMENT_BUDGET_OPTIONS}
                            disabled={disabled}
                            onChange={field.onChange}
                          />
                        )}
                      />

                      {form.formState.errors.investmentBudget?.message ===
                      undefined ? null : (
                        <FieldError>
                          {form.formState.errors.investmentBudget.message}
                        </FieldError>
                      )}
                    </FieldSet>

                    <FieldSet disabled={disabled}>
                      <FieldLegend>
                        Do you already operate an EV business?
                      </FieldLegend>

                      <Controller
                        control={form.control}
                        name="alreadyRunningEvBusiness"
                        render={({ field }) => (
                          <ChoiceCards
                            name="running-ev-business"
                            value={field.value}
                            options={RUNNING_EV_BUSINESS_OPTIONS}
                            disabled={disabled}
                            onChange={field.onChange}
                            columns={2}
                          />
                        )}
                      />

                      {form.formState.errors.alreadyRunningEvBusiness
                        ?.message === undefined ? null : (
                        <FieldError>
                          {
                            form.formState.errors.alreadyRunningEvBusiness
                              .message
                          }
                        </FieldError>
                      )}
                    </FieldSet>
                  </>
                ) : null}

                {step === 2 ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      data-invalid={
                        form.formState.errors.applicantName === undefined
                          ? undefined
                          : true
                      }
                    >
                      <FieldLabel htmlFor="applicant-name">
                        Applicant name
                      </FieldLabel>
                      <Input
                        id="applicant-name"
                        type="text"
                        autoComplete="name"
                        enterKeyHint="next"
                        placeholder="Your full name"
                        aria-invalid={
                          form.formState.errors.applicantName === undefined
                            ? undefined
                            : true
                        }
                        disabled={disabled}
                        {...form.register("applicantName")}
                      />
                      {form.formState.errors.applicantName?.message ===
                      undefined ? null : (
                        <FieldError>
                          {form.formState.errors.applicantName.message}
                        </FieldError>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="business-name">
                        Business name{" "}
                        <span className="text-muted-readable">(optional)</span>
                      </FieldLabel>
                      <Input
                        id="business-name"
                        type="text"
                        autoComplete="organization"
                        enterKeyHint="next"
                        placeholder="Existing business or company"
                        disabled={disabled}
                        {...form.register("businessName")}
                      />
                      <FieldDescription>
                        Leave blank when applying as an individual.
                      </FieldDescription>
                    </Field>

                    <Field
                      data-invalid={
                        form.formState.errors.mobileNumber === undefined
                          ? undefined
                          : true
                      }
                    >
                      <FieldLabel htmlFor="mobile-number">
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
                              id="mobile-number"
                              type="tel"
                              autoComplete="tel-national"
                              inputMode="numeric"
                              enterKeyHint="next"
                              placeholder="9876543210"
                              maxLength={INDIA_MOBILE_MAX_LENGTH}
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
                              className="pl-16"
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
                      data-invalid={
                        form.formState.errors.email === undefined
                          ? undefined
                          : true
                      }
                    >
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        enterKeyHint="done"
                        placeholder="you@example.com"
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

                {step === 3 ? (
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
                            name="location-mode"
                            value={field.value}
                            options={LOCATION_MODE_OPTIONS}
                            disabled={disabled}
                            onChange={(nextMode) => {
                              field.onChange(nextMode);
                              setFormError(null);
                              setSubmitState("idle");
                            }}
                            columns={2}
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
                              Capture the proposed site
                            </p>
                            <p className="text-body-sm leading-relaxed text-muted-readable">
                              Use this while physically present at the proposed
                              dealership location for the most accurate result.
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
                            are submitted only with this application.
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
                            Manual address entry avoids location permission. PIN
                            code data may be used for approximate territory
                            evaluation and can be verified during follow-up.
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
                            <FieldLabel htmlFor="address-line-1">
                              Address line 1
                            </FieldLabel>
                            <Input
                              id="address-line-1"
                              type="text"
                              autoComplete="address-line1"
                              enterKeyHint="next"
                              placeholder="Door number, street, area"
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
                            <FieldLabel htmlFor="address-line-2">
                              Address line 2{" "}
                              <span className="text-muted-readable">
                                (optional)
                              </span>
                            </FieldLabel>
                            <Input
                              id="address-line-2"
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
                            <FieldLabel htmlFor="city">City</FieldLabel>
                            <Input
                              id="city"
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
                            <FieldLabel htmlFor="district">District</FieldLabel>
                            <Input
                              id="district"
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
                            <FieldLabel htmlFor="state">State</FieldLabel>
                            <Input
                              id="state"
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
                            <FieldLabel htmlFor="postal-code">
                              PIN code
                            </FieldLabel>
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

                    <Field>
                      <FieldLabel htmlFor="notes">
                        Additional notes{" "}
                        <span className="text-muted-readable">(optional)</span>
                      </FieldLabel>
                      <Textarea
                        id="notes"
                        rows={4}
                        maxLength={1_200}
                        placeholder="Preferred area, showroom plan, relevant experience, or other context"
                        disabled={disabled}
                        {...form.register("notes")}
                      />
                      <FieldDescription>
                        Do not enter identity documents, bank information, or
                        other sensitive personal data.
                      </FieldDescription>
                    </Field>

                    <div className="flex items-start gap-3 rounded-2xl border border-info/20 bg-info/5 p-4 text-info dark:border-info/30 dark:bg-info/10">
                      <ShieldCheck
                        aria-hidden="true"
                        className="mt-0.5 size-5 shrink-0"
                      />
                      <p className="text-body-sm leading-relaxed">
                        Your details are sent only through the Ozotec ERP
                        gateway and are used for dealership evaluation and
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
    </PublicDealershipShell>
  );
}

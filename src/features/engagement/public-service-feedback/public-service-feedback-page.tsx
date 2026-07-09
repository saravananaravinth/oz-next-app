// oz-next-app/src/features/engagement/public-service-feedback/public-service-feedback-page.tsx
"use client";

import Image from "next/image";
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  LoaderCircle,
  LocateFixed,
  MapPinned,
  ShieldCheck,
} from "lucide-react";
import { useParams } from "next/navigation";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiHttpError } from "@/lib/api/problem";
import { cn } from "@/lib/utils";

import { submitPublicServiceFeedback } from "./client";
import {
  publicServiceFeedbackTokenSchema,
  serviceFeedbackFormSchema,
  type ServiceFeedbackFormValues,
  type ServiceFeedbackIssueCategory,
  type ServiceFeedbackSubmitRequest,
} from "./schemas";

type SubmitState =
  | "checking-device"
  | "idle"
  | "locating"
  | "submitting"
  | "success"
  | "invalid-link"
  | "desktop-device"
  | "unsupported-browser"
  | "permission-denied"
  | "location-unavailable"
  | "timeout"
  | "api-error"
  | "unexpected-error";

type AddressEntryMode = "choice" | "location" | "manual";

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

type StepDefinition = Readonly<{
  title: string;
  description: string;
}>;

type StepIndex = 0 | 1 | 2;
type FeedbackFieldPath = FieldPath<ServiceFeedbackFormValues>;

type IssueCategoryOption = Readonly<{
  value: ServiceFeedbackIssueCategory;
  label: string;
  description: string;
}>;

const MOBILE_DEVICE_QUERY = "(max-width: 767px) and (pointer: coarse)";
const GEOLOCATION_TIMEOUT_MS = 15_000;
const GEO_PERMISSION_DENIED = 1;
const GEO_POSITION_UNAVAILABLE = 2;
const GEO_TIMEOUT = 3;
const MAX_STEP_INDEX = 2;

const STATE_COPY: Record<
  SubmitState,
  Readonly<{ title: string; description: string }>
> = {
  "checking-device": {
    title: "Preparing secure form",
    description: "Checking your device before opening Feedback/Complaints.",
  },
  idle: {
    title: "Feedback/Complaints",
    description:
      "Share your feedback or complaint securely so Ozotec EV can follow up.",
  },
  locating: {
    title: "Finding your location",
    description: "Keep this page open while your phone confirms your position.",
  },
  submitting: {
    title: "Submitting securely",
    description:
      "Your feedback or complaint is being sent through the secure ERP gateway.",
  },
  success: {
    title: "Feedback/Complaint received",
    description:
      "Thank you. Ozotec EV has received your feedback or complaint.",
  },
  "invalid-link": {
    title: "Invalid Feedback/Complaints link",
    description:
      "This Feedback/Complaints link is invalid. Please use the latest link from Ozotec EV.",
  },
  "desktop-device": {
    title: "Open this link on your phone",
    description:
      "This public Feedback/Complaints form is designed for mobile devices.",
  },
  "unsupported-browser": {
    title: "Location is not supported",
    description:
      "Your browser does not support secure location sharing. Please open the link in Chrome, Safari, or your phone browser.",
  },
  "permission-denied": {
    title: "Location permission is blocked",
    description:
      "Please allow location access for this page in your browser settings and try again.",
  },
  "location-unavailable": {
    title: "Location unavailable",
    description:
      "Your phone could not determine your location. Move to an open area and try again.",
  },
  timeout: {
    title: "Location timed out",
    description:
      "Your phone took too long to provide a location. Check GPS/network signal and try again.",
  },
  "api-error": {
    title: "Feedback/Complaint could not be submitted",
    description:
      "We could not submit your feedback or complaint right now. Please try again using the same link.",
  },
  "unexpected-error": {
    title: "Something went wrong",
    description:
      "The Feedback/Complaints form could not be completed. Please refresh the page and try again.",
  },
};

const STEPS = [
  {
    title: "Contact",
    description: "Your basic contact details.",
  },
  {
    title: "Feedback/Complaint",
    description: "Tell us what happened.",
  },
  {
    title: "Location",
    description: "Choose how you want to share your follow-up location.",
  },
] as const satisfies readonly StepDefinition[];

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
] as const satisfies readonly IssueCategoryOption[];

const STEP_FIELDS = [
  ["name", "mobileNumber", "email"],
  ["issueCategory", "feedback"],
  ["addressLine1", "addressLine2", "city", "postalCode", "district", "state"],
] as const satisfies ReadonlyArray<readonly FeedbackFieldPath[]>;

const DEFAULT_VALUES = {
  name: "",
  mobileNumber: "",
  email: "",
  issueCategory: "GENERAL_SERVICE",
  feedback: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  state: "Tamil Nadu",
  postalCode: "",
} as const satisfies ServiceFeedbackFormValues;

function nextStepIndex(current: StepIndex): StepIndex {
  if (current === 0) return 1;
  if (current === 1) return 2;
  return 2;
}

function previousStepIndex(current: StepIndex): StepIndex {
  if (current === 2) return 1;
  if (current === 1) return 0;
  return 0;
}

function createIdempotencyKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `feedback-complaints:${crypto.randomUUID()}`;
  }

  const timestamp = Date.now().toString(36);
  const random = Math.random()
    .toString(36)
    .slice(2)
    .padEnd(18, "0")
    .slice(0, 18);

  return `feedback-complaints:${timestamp}:${random}`;
}

function useMobileDevice(): boolean | null {
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const media = window.matchMedia(MOBILE_DEVICE_QUERY);

    const update = (): void => {
      setIsMobile(media.matches);
    };

    update();
    media.addEventListener("change", update);

    return () => {
      media.removeEventListener("change", update);
    };
  }, []);

  return isMobile;
}

function normalizeMobileInput(value: string): string {
  return value.replace(/\D/gu, "").slice(-10);
}

function toIndianMobileE164(value: string): string {
  return `+91${normalizeMobileInput(value)}`;
}

function optionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized === undefined || normalized.length === 0
    ? undefined
    : normalized;
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

function isGeolocationError(error: unknown): error is GeolocationPositionError {
  return typeof error === "object" && error !== null && "code" in error;
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

function formatLocationStatus(location: CapturedLocation | null): string {
  if (location === null) {
    return "Allow location access so we can route your feedback or complaint accurately.";
  }

  if (location.accuracyMeters === undefined) {
    return "GPS is ready.";
  }

  const roundedAccuracyMeters = Math.round(
    location.accuracyMeters,
  ).toLocaleString("en-IN");

  return `GPS is ready with ~${roundedAccuracyMeters}m accuracy.`;
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
    const expiredOrUsed =
      error.status === 404 ||
      error.status === 409 ||
      code.includes("EXPIRED") ||
      code.includes("USED") ||
      code.includes("NOT_FOUND");

    const requestId = safeRequestId(error.requestId);
    const baseError = {
      title: expiredOrUsed
        ? "Link expired or already used"
        : STATE_COPY["api-error"].title,
      description: expiredOrUsed
        ? "This Feedback/Complaints link is no longer active. Please use the latest link from Ozotec EV."
        : STATE_COPY["api-error"].description,
    } satisfies Omit<UserFacingError, "requestId">;

    return requestId === undefined ? baseError : { ...baseError, requestId };
  }

  return {
    title: STATE_COPY["unexpected-error"].title,
    description: STATE_COPY["unexpected-error"].description,
  };
}

function firstErrorStep(errors: Readonly<Record<string, unknown>>): StepIndex {
  for (let index = 0; index < STEP_FIELDS.length; index += 1) {
    const fields = STEP_FIELDS[index] ?? [];

    if (fields.some((field) => errors[field] !== undefined)) {
      return index as StepIndex;
    }
  }

  return 0;
}

function toSubmitRequest(
  values: ServiceFeedbackFormValues,
  location: CapturedLocation,
): ServiceFeedbackSubmitRequest {
  const email = optionalString(values.email);
  const addressLine2 = optionalString(values.addressLine2);

  return {
    name: values.name,
    mobileNumber: toIndianMobileE164(values.mobileNumber),
    ...(email === undefined ? {} : { email }),
    issueCategory: values.issueCategory,
    feedback: values.feedback,
    addressLine1: values.addressLine1,
    ...(addressLine2 === undefined ? {} : { addressLine2 }),
    city: values.city,
    district: values.district,
    state: values.state,
    postalCode: values.postalCode,
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

function FieldMessage({
  message,
}: Readonly<{ message: string | undefined }>): React.ReactElement | null {
  if (message === undefined) {
    return null;
  }

  return <FieldError>{message}</FieldError>;
}

function BrandIcon({
  className,
  priority = false,
}: Readonly<{
  className?: string;
  priority?: boolean;
}>): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl",
        className,
      )}
    >
      <Image
        src="/icon-light.svg"
        alt=""
        width={40}
        height={40}
        priority={priority}
        className="block h-8 w-auto dark:hidden"
      />
      <Image
        src="/icon-dark.svg"
        alt=""
        width={40}
        height={40}
        priority={priority}
        className="hidden h-8 w-auto dark:block"
      />
    </span>
  );
}

function BlockingStatusCard({
  state,
  error,
}: Readonly<{
  state: SubmitState;
  error?: UserFacingError;
}>): React.ReactElement {
  const copy = STATE_COPY[state];

  return (
    <main
      className="dark min-h-svh bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.16),_transparent_30rem),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.34))] px-4 py-5 text-foreground"
      style={{ colorScheme: "dark" }}
    >
      <section
        aria-labelledby="feedback-complaints-status-title"
        className="mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-md flex-col justify-center"
      >
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-2xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
          <CardHeader className="items-center gap-5 px-5 pt-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-3xl border border-border/70 bg-background/75 shadow-xs">
              <BrandIcon className="size-10" priority />
            </div>

            <div className="grid gap-2">
              <p className="text-overline text-muted-readable">Ozotec EV</p>
              <CardTitle
                id="feedback-complaints-status-title"
                className="text-section-title"
              >
                {copy.title}
              </CardTitle>
              <p className="text-body-sm text-muted-readable text-pretty">
                {copy.description}
              </p>
            </div>
          </CardHeader>

          {error === undefined ? null : (
            <CardContent>
              <Alert variant="destructive" role="alert">
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>{error.title}</AlertTitle>
                <AlertDescription>
                  <p>{error.description}</p>
                  {error.requestId === undefined ? null : (
                    <p className="mt-1 text-caption">
                      Reference:{" "}
                      <code className="break-all text-tabular">
                        {error.requestId}
                      </code>
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
          )}

          <CardFooter className="justify-center text-center text-caption text-muted-readable">
            <p>
              For your security, this page does not expose internal ERP data.
            </p>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}

export function PublicServiceFeedbackPage(): React.ReactElement {
  const params = useParams<{ token?: string | string[] }>();
  const isMobile = useMobileDevice();

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
  const [addressEntryMode, setAddressEntryMode] =
    React.useState<AddressEntryMode>("choice");
  const idempotencyKeyRef = React.useRef<string | null>(null);

  const form = useForm<ServiceFeedbackFormValues>({
    resolver: zodResolver(serviceFeedbackFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const busy = submitState === "locating" || submitState === "submitting";
  const success = submitState === "success";
  const disabled = busy || success || !tokenResult.success || isMobile !== true;
  const progressValue = ((step + 1) / STEPS.length) * 100;
  const currentStep = STEPS[step];
  const currentStepFields = STEP_FIELDS[step];
  const selectedIssueCategory = useWatch({
    control: form.control,
    name: "issueCategory",
  });

  const selectedIssueCategoryDescription =
    ISSUE_CATEGORY_OPTIONS.find(
      (option) => option.value === selectedIssueCategory,
    )?.description ?? "Select the closest feedback or complaint category.";

  async function captureLocation(): Promise<CapturedLocation | null> {
    setFormError(null);
    setSubmitState("locating");

    try {
      const position = await getCurrentPosition();
      const accuracy = Number.isFinite(position.coords.accuracy)
        ? position.coords.accuracy
        : undefined;

      const nextLocation: CapturedLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
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
    }
  }

  async function chooseCurrentLocation(): Promise<void> {
    setAddressEntryMode("location");
    await captureLocation();
  }

  function chooseManualAddress(): void {
    setFormError(null);
    setAddressEntryMode("manual");
  }

  async function goNext(): Promise<void> {
    if (disabled) {
      return;
    }

    const valid = await form.trigger([...currentStepFields], {
      shouldFocus: true,
    });

    if (!valid) {
      return;
    }

    setFormError(null);
    setStep(nextStepIndex);
  }

  function goBack(): void {
    setFormError(null);
    setStep(previousStepIndex);
  }

  async function submitFeedback(): Promise<void> {
    if (busy || success || isMobile !== true) {
      return;
    }

    if (!tokenResult.success) {
      return;
    }

    setFormError(null);

    if (addressEntryMode === "choice") {
      setStep(2);
      setFormError({
        title: "Choose location option",
        description:
          "Use your current location or add the address before submitting Feedback/Complaints.",
      });
      return;
    }

    const fieldsToValidate =
      addressEntryMode === "location"
        ? ([
            "name",
            "mobileNumber",
            "email",
            "issueCategory",
            "feedback",
          ] as const)
        : undefined;

    const valid = await form.trigger(fieldsToValidate, {
      shouldFocus: true,
    });

    if (!valid) {
      setStep(firstErrorStep(form.formState.errors));
      return;
    }

    if (addressEntryMode === "location") {
      setFormError({
        title: "Address is required by the current API",
        description:
          "The screen now keeps location and address separate, but the current backend still requires address fields and GPS coordinates for Feedback/Complaints submission. Update the backend contract to support GPS-only submissions before enabling this path.",
      });
      setSubmitState("idle");
      return;
    }

    if (location === null) {
      setFormError({
        title: "Location is required by the current API",
        description:
          "The screen now keeps address and location separate, but the current backend still requires GPS coordinates for Feedback/Complaints submission. Update the backend contract to support address-only submissions before enabling this path.",
      });
      setSubmitState("idle");
      return;
    }

    const resolvedLocation = location;

    const idempotencyKey = idempotencyKeyRef.current ?? createIdempotencyKey();
    idempotencyKeyRef.current = idempotencyKey;

    setSubmitState("submitting");

    try {
      const values = form.getValues();

      await submitPublicServiceFeedback({
        token: tokenResult.data,
        idempotencyKey,
        feedback: toSubmitRequest(values, resolvedLocation),
      });

      setSubmitState("success");
    } catch (caught) {
      setSubmitState("api-error");
      setFormError(errorFromUnknown(caught));
    }
  }

  if (!tokenResult.success) {
    return <BlockingStatusCard state="invalid-link" />;
  }

  if (isMobile === null) {
    return <BlockingStatusCard state="checking-device" />;
  }

  if (!isMobile) {
    return <BlockingStatusCard state="desktop-device" />;
  }

  if (success) {
    return <BlockingStatusCard state="success" />;
  }

  return (
    <main
      className="dark min-h-svh bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.14),_transparent_30rem),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))] px-3 py-4 text-foreground"
      style={{ colorScheme: "dark" }}
    >
      <section
        aria-labelledby="feedback-complaints-form-title"
        className="mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-md flex-col justify-center"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitFeedback();
          }}
        >
          <Card className="overflow-hidden border-border/70 bg-card/95 shadow-2xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
            <CardHeader className="gap-4 px-5 pt-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-3xl border border-border/70 bg-background/75 shadow-xs">
                    <BrandIcon className="size-8" priority />
                  </div>

                  <div className="min-w-0">
                    <p className="text-overline text-muted-readable">
                      Ozotec EV
                    </p>
                    <CardTitle
                      id="feedback-complaints-form-title"
                      className="text-card-title"
                    >
                      Feedback/Complaints
                    </CardTitle>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-caption text-muted-readable">
                  <ShieldCheck aria-hidden="true" className="size-3.5" />
                  Secure
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-caption text-muted-readable">
                      Step {step + 1} of {STEPS.length}
                    </p>
                    <h1 className="text-section-title text-foreground">
                      {currentStep.title}
                    </h1>
                  </div>
                </div>

                <p className="text-body-sm text-muted-readable">
                  {currentStep.description}
                </p>

                <Progress value={progressValue} aria-label="Form progress" />
              </div>
            </CardHeader>

            <CardContent className="grid gap-5 px-5">
              {formError === null ? null : (
                <Alert variant="destructive" role="alert">
                  <AlertTriangle aria-hidden="true" />
                  <AlertTitle>{formError.title}</AlertTitle>
                  <AlertDescription>
                    <p>{formError.description}</p>
                    {formError.requestId === undefined ? null : (
                      <p className="mt-1 text-caption">
                        Reference:{" "}
                        <code className="break-all text-tabular">
                          {formError.requestId}
                        </code>
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {step === 0 ? (
                <div className="grid gap-4">
                  <Field
                    data-invalid={
                      form.formState.errors.name === undefined
                        ? undefined
                        : true
                    }
                  >
                    <FieldLabel htmlFor="feedback-complaints-name">
                      Name
                    </FieldLabel>
                    <Input
                      id="feedback-complaints-name"
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
                    <FieldMessage
                      message={form.formState.errors.name?.message}
                    />
                  </Field>

                  <Field
                    data-invalid={
                      form.formState.errors.mobileNumber === undefined
                        ? undefined
                        : true
                    }
                  >
                    <FieldLabel htmlFor="feedback-complaints-mobile">
                      Mobile number
                    </FieldLabel>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-body-sm text-muted-readable">
                        +91
                      </span>
                      <Input
                        id="feedback-complaints-mobile"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        enterKeyHint="next"
                        maxLength={10}
                        placeholder="9876543210"
                        className="pl-12"
                        aria-invalid={
                          form.formState.errors.mobileNumber === undefined
                            ? undefined
                            : true
                        }
                        disabled={disabled}
                        onInput={(event) => {
                          event.currentTarget.value = normalizeMobileInput(
                            event.currentTarget.value,
                          );
                        }}
                        {...form.register("mobileNumber")}
                      />
                    </div>
                    <FieldMessage
                      message={form.formState.errors.mobileNumber?.message}
                    />
                  </Field>

                  <Field
                    data-invalid={
                      form.formState.errors.email === undefined
                        ? undefined
                        : true
                    }
                  >
                    <FieldLabel htmlFor="feedback-complaints-email">
                      Email{" "}
                      <span className="text-muted-readable">(optional)</span>
                    </FieldLabel>
                    <Input
                      id="feedback-complaints-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      enterKeyHint="next"
                      placeholder="name@example.com"
                      aria-invalid={
                        form.formState.errors.email === undefined
                          ? undefined
                          : true
                      }
                      disabled={disabled}
                      {...form.register("email")}
                    />
                    <FieldMessage
                      message={form.formState.errors.email?.message}
                    />
                  </Field>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="grid gap-4">
                  <Field
                    data-invalid={
                      form.formState.errors.issueCategory === undefined
                        ? undefined
                        : true
                    }
                  >
                    <FieldLabel htmlFor="feedback-complaints-category">
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
                            id="feedback-complaints-category"
                            className="h-11 w-full rounded-2xl"
                            aria-invalid={
                              form.formState.errors.issueCategory === undefined
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
                      {selectedIssueCategoryDescription}
                    </FieldDescription>

                    <FieldMessage
                      message={form.formState.errors.issueCategory?.message}
                    />
                  </Field>

                  <Field
                    data-invalid={
                      form.formState.errors.feedback === undefined
                        ? undefined
                        : true
                    }
                  >
                    <FieldLabel htmlFor="feedback-complaints-message">
                      Feedback/Complaint
                    </FieldLabel>
                    <Textarea
                      id="feedback-complaints-message"
                      rows={7}
                      enterKeyHint="next"
                      placeholder="Describe your feedback, complaint, vehicle concern, dealer interaction, or support required."
                      aria-invalid={
                        form.formState.errors.feedback === undefined
                          ? undefined
                          : true
                      }
                      disabled={disabled}
                      {...form.register("feedback")}
                    />
                    <FieldDescription>
                      Do not include OTPs, passwords, payment details, or
                      unrelated personal documents.
                    </FieldDescription>
                    <FieldMessage
                      message={form.formState.errors.feedback?.message}
                    />
                  </Field>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-4">
                  {addressEntryMode === "choice" ? (
                    <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/35 p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                          <LocateFixed aria-hidden="true" className="size-5" />
                        </div>

                        <div className="grid gap-1">
                          <p className="text-card-title">
                            Share follow-up location
                          </p>
                          <p className="text-body-sm text-muted-readable text-pretty">
                            Use your current phone location or add the address
                            manually.
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          void chooseCurrentLocation();
                        }}
                      >
                        <LocateFixed aria-hidden="true" className="size-4" />
                        Use my current location
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        onClick={chooseManualAddress}
                      >
                        <MapPinned aria-hidden="true" className="size-4" />
                        Add Address
                      </Button>
                    </div>
                  ) : null}

                  {addressEntryMode === "location" ? (
                    <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/35 p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border",
                            location === null
                              ? "border-primary/20 bg-primary/10 text-primary"
                              : "border-success/25 bg-success/10 text-success",
                          )}
                        >
                          {location === null ? (
                            <LocateFixed
                              aria-hidden="true"
                              className="size-5"
                            />
                          ) : (
                            <CheckCircle2
                              aria-hidden="true"
                              className="size-5"
                            />
                          )}
                        </div>

                        <div className="grid gap-1">
                          <p className="text-card-title">
                            {location === null
                              ? "Current location required"
                              : "Current location captured"}
                          </p>
                          <p className="text-body-sm text-muted-readable text-pretty">
                            {formatLocationStatus(location)}
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
                      >
                        {submitState === "locating" ? (
                          <LoaderCircle
                            aria-hidden="true"
                            className="size-4 animate-spin motion-reduce:animate-none"
                          />
                        ) : (
                          <LocateFixed aria-hidden="true" className="size-4" />
                        )}
                        {location === null
                          ? "Use my current location"
                          : "Refresh current location"}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          setLocation(null);
                          setFormError(null);
                          setAddressEntryMode("choice");
                        }}
                      >
                        Choose another option
                      </Button>
                    </div>
                  ) : null}

                  {addressEntryMode === "manual" ? (
                    <div className="grid gap-4">
                      <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/35 p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                            <MapPinned aria-hidden="true" className="size-5" />
                          </div>

                          <div className="grid gap-1">
                            <p className="text-card-title">
                              Add address manually
                            </p>
                            <p className="text-body-sm text-muted-readable text-pretty">
                              Enter the follow-up address carefully.
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            setFormError(null);
                            setAddressEntryMode("choice");
                          }}
                        >
                          Choose another option
                        </Button>
                      </div>

                      <Field
                        data-invalid={
                          form.formState.errors.addressLine1 === undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="feedback-complaints-address-line-1">
                          Address line 1
                        </FieldLabel>
                        <Input
                          id="feedback-complaints-address-line-1"
                          type="text"
                          autoComplete="address-line1"
                          enterKeyHint="next"
                          placeholder="House / shop number, street"
                          aria-invalid={
                            form.formState.errors.addressLine1 === undefined
                              ? undefined
                              : true
                          }
                          disabled={disabled}
                          {...form.register("addressLine1")}
                        />
                        <FieldMessage
                          message={form.formState.errors.addressLine1?.message}
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="feedback-complaints-address-line-2">
                          Address line 2{" "}
                          <span className="text-muted-readable">
                            (optional)
                          </span>
                        </FieldLabel>
                        <Input
                          id="feedback-complaints-address-line-2"
                          type="text"
                          autoComplete="address-line2"
                          enterKeyHint="next"
                          placeholder="Area, landmark"
                          disabled={disabled}
                          {...form.register("addressLine2")}
                        />
                        <FieldMessage
                          message={form.formState.errors.addressLine2?.message}
                        />
                      </Field>

                      <Field
                        data-invalid={
                          form.formState.errors.city === undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="feedback-complaints-city">
                          City
                        </FieldLabel>
                        <Input
                          id="feedback-complaints-city"
                          type="text"
                          autoComplete="address-level2"
                          enterKeyHint="next"
                          placeholder="City"
                          aria-invalid={
                            form.formState.errors.city === undefined
                              ? undefined
                              : true
                          }
                          disabled={disabled}
                          {...form.register("city")}
                        />
                        <FieldMessage
                          message={form.formState.errors.city?.message}
                        />
                      </Field>

                      <Field
                        data-invalid={
                          form.formState.errors.postalCode === undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="feedback-complaints-postal-code">
                          PIN code
                        </FieldLabel>
                        <Input
                          id="feedback-complaints-postal-code"
                          type="text"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          enterKeyHint="next"
                          maxLength={6}
                          placeholder="641001"
                          aria-invalid={
                            form.formState.errors.postalCode === undefined
                              ? undefined
                              : true
                          }
                          disabled={disabled}
                          onInput={(event) => {
                            event.currentTarget.value =
                              event.currentTarget.value
                                .replace(/\D/gu, "")
                                .slice(0, 6);
                          }}
                          {...form.register("postalCode")}
                        />
                        <FieldMessage
                          message={form.formState.errors.postalCode?.message}
                        />
                      </Field>

                      <Field
                        data-invalid={
                          form.formState.errors.district === undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="feedback-complaints-district">
                          District
                        </FieldLabel>
                        <Input
                          id="feedback-complaints-district"
                          type="text"
                          enterKeyHint="next"
                          placeholder="District"
                          aria-invalid={
                            form.formState.errors.district === undefined
                              ? undefined
                              : true
                          }
                          disabled={disabled}
                          {...form.register("district")}
                        />
                        <FieldMessage
                          message={form.formState.errors.district?.message}
                        />
                      </Field>

                      <Field
                        data-invalid={
                          form.formState.errors.state === undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="feedback-complaints-state">
                          State
                        </FieldLabel>
                        <Input
                          id="feedback-complaints-state"
                          type="text"
                          autoComplete="address-level1"
                          enterKeyHint="done"
                          placeholder="Tamil Nadu"
                          aria-invalid={
                            form.formState.errors.state === undefined
                              ? undefined
                              : true
                          }
                          disabled={disabled}
                          {...form.register("state")}
                        />
                        <FieldMessage
                          message={form.formState.errors.state?.message}
                        />
                      </Field>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>

            <CardFooter className="grid gap-3 border-t border-border/70 bg-muted/30 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || step === 0}
                  onClick={goBack}
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  Back
                </Button>

                {step < MAX_STEP_INDEX ? (
                  <Button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      void goNext();
                    }}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button type="submit" disabled={disabled}>
                    {busy ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="size-4 animate-spin motion-reduce:animate-none"
                      />
                    ) : (
                      <ShieldCheck aria-hidden="true" className="size-4" />
                    )}
                    Submit
                  </Button>
                )}
              </div>

              <p className="text-center text-caption text-muted-readable">
                Your response is linked only to this secure Feedback/Complaints
                link.
              </p>
            </CardFooter>
          </Card>
        </form>
      </section>
    </main>
  );
}

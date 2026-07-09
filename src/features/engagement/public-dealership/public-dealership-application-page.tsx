// oz-next-app/src/features/engagement/public-dealership/public-dealership-application-page.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  LocateFixed,
  ShieldCheck,
} from "lucide-react";
import { useParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

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

import { submitPublicDealershipApplication } from "./client";
import {
  dealershipInterestFormSchema,
  publicDealershipTokenSchema,
  type DealershipApplicationSubmitRequest,
  type DealershipInterestFormValues,
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
  | "desktop-device"
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

type AddressEntryMode = "location" | "manual";

type ChoiceOption<TValue extends string> = Readonly<{
  value: TValue;
  label: string;
  description?: string;
}>;

const MOBILE_DEVICE_QUERY = "(max-width: 767px), (pointer: coarse)";
const GEOLOCATION_TIMEOUT_MS = 15_000;
const GEO_PERMISSION_DENIED = 1;
const GEO_POSITION_UNAVAILABLE = 2;
const GEO_TIMEOUT = 3;
const MAX_NOTES_LENGTH = 2_000;
const BRAND_ICON_SIZE = 28;
const BRAND_ICON_CLASS_NAME = "h-7 w-auto";
const INDIA_DIAL_CODE = "+91";
const INDIA_MOBILE_MAX_LENGTH = 10;
const NON_DIGIT_PATTERN = /\D/gu;
const CONTROL_CHARACTER_MAX_CODE_POINT = 0x1f;
const DELETE_CHARACTER_CODE_POINT = 0x7f;

const STEP_TITLES = [
  "Investment timeline",
  "Investment readiness",
  "Contact details",
  "Location and review",
] as const;

const INVESTMENT_TIMELINE_OPTIONS = [
  {
    value: "IMMEDIATE",
    label: "Immediate",
    description: "Ready to start the dealership discussion now.",
  },
  {
    value: "WITHIN_1_MONTH",
    label: "Within 1 month",
    description: "Planning to proceed after short evaluation.",
  },
  {
    value: "WITHIN_2_MONTHS",
    label: "Within 2 months",
    description: "Exploring options for near-term investment.",
  },
] as const satisfies ReadonlyArray<ChoiceOption<InvestmentTimeline>>;

const INVESTMENT_BUDGET_OPTIONS = [
  {
    value: "BELOW_10_LAKHS",
    label: "Below 10 Lakhs",
  },
  {
    value: "TEN_TO_20_LAKHS",
    label: "10 Lakhs to 20 Lakhs",
  },
  {
    value: "ABOVE_20_LAKHS",
    label: "Above 20 Lakhs",
  },
] as const satisfies ReadonlyArray<ChoiceOption<InvestmentBudget>>;

const RUNNING_EV_BUSINESS_OPTIONS = [
  {
    value: "YES",
    label: "Yes",
  },
  {
    value: "NO",
    label: "No",
  },
] as const satisfies ReadonlyArray<ChoiceOption<RunningEvBusiness>>;

const STATE_COPY: Record<
  SubmitState,
  Readonly<{ title: string; description: string }>
> = {
  idle: {
    title: "Dealership application",
    description:
      "Complete a few details to help Ozotec EV evaluate your dealership request.",
  },
  locating: {
    title: "Finding your location",
    description: "Keep this page open while your phone confirms your position.",
  },
  submitting: {
    title: "Submitting securely",
    description:
      "Your dealership application is being sent through the secure ERP gateway.",
  },
  success: {
    title: "Application received",
    description:
      "Thank you. Ozotec EV has received your dealership application.",
  },
  "invalid-link": {
    title: "Invalid application link",
    description:
      "This dealership application link is invalid. Please use the latest link sent by Ozotec EV.",
  },
  "desktop-device": {
    title: "Open this link on your phone",
    description:
      "This public dealership form is designed for mobile devices so we can capture accurate GPS location.",
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
    title: "Application could not be submitted",
    description:
      "We could not submit your dealership application right now. Please try again using the same link.",
  },
  "unexpected-error": {
    title: "Something went wrong",
    description:
      "The dealership application could not be completed. Please refresh the page and try again.",
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
  ["addressLine1", "city", "district", "state", "postalCode"],
] as const satisfies ReadonlyArray<
  ReadonlyArray<keyof DealershipInterestFormValues>
>;

function createIdempotencyKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `dealership:${crypto.randomUUID()}`;
  }

  const timestamp = Date.now().toString(36);
  const random = Math.random()
    .toString(36)
    .slice(2)
    .padEnd(18, "0")
    .slice(0, 18);

  return `dealership:${timestamp}:${random}`;
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
        : "Application could not be submitted",
      description: expiredOrUsed
        ? "This dealership application link is no longer active. Please use the latest link from Ozotec EV."
        : "We could not submit your dealership application right now. Please try again.",
    } satisfies Omit<UserFacingError, "requestId">;

    return requestId === undefined ? baseError : { ...baseError, requestId };
  }

  return {
    title: STATE_COPY["unexpected-error"].title,
    description: STATE_COPY["unexpected-error"].description,
  };
}

function firstErrorStep(errors: Readonly<Record<string, unknown>>): number {
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
  location: CapturedLocation,
): string {
  const parts = [
    "Dealership intake details",
    `Investment timeline: ${labelFor(INVESTMENT_TIMELINE_OPTIONS, values.investmentTimeline)}`,
    `Prepared investment: ${labelFor(INVESTMENT_BUDGET_OPTIONS, values.investmentBudget)}`,
    `Already running EV business: ${labelFor(RUNNING_EV_BUSINESS_OPTIONS, values.alreadyRunningEvBusiness)}`,
    location.accuracyMeters === undefined
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
  location: CapturedLocation,
): DealershipApplicationSubmitRequest {
  const businessName = optionalNonEmpty(values.businessName);
  const addressLine2 = optionalNonEmpty(values.addressLine2);

  return {
    applicantName: values.applicantName.trim(),
    ...(businessName === undefined ? {} : { businessName }),
    mobileNumber: `${INDIA_DIAL_CODE}${values.mobileNumber.trim()}`,
    email: values.email.trim(),
    addressLine1: values.addressLine1.trim(),
    ...(addressLine2 === undefined ? {} : { addressLine2 }),
    city: values.city.trim(),
    district: values.district.trim(),
    state: values.state.trim(),
    postalCode: values.postalCode.trim(),
    latitude: location.latitude,
    longitude: location.longitude,
    notes: buildNotes(values, location),
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
        onChange(nextValue as TValue);
      }}
      disabled={disabled}
      className={cn(columns === 2 ? "grid-cols-2" : "grid-cols-1", "gap-3")}
    >
      {options.map((option) => {
        const id = `${name}-${option.value.toLowerCase().replace(/_/gu, "-")}`;
        const checked = value === option.value;

        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              "flex min-h-16 cursor-pointer items-center gap-3 rounded-3xl border bg-card/80 px-4 py-3 text-left shadow-sm transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out",
              "hover:border-primary/40 hover:bg-primary/5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 motion-reduce:transition-none",
              checked
                ? "border-primary/55 bg-primary/10 shadow-primary/10"
                : "border-border/80",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <RadioGroupItem
              id={id}
              value={option.value}
              aria-label={option.label}
              className="size-5"
            />

            <span className="grid min-w-0 gap-0.5">
              <span className="text-body text-foreground [font-weight:var(--typography-emphasis-weight)]">
                {option.label}
              </span>

              {option.description === undefined ? null : (
                <span className="text-caption text-muted-readable">
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

function BrandIcon({
  className,
}: Readonly<{ className?: string }>): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex size-7 items-center justify-center",
        className,
      )}
    >
      <Image
        src="/icon-light.svg"
        alt=""
        width={BRAND_ICON_SIZE}
        height={BRAND_ICON_SIZE}
        className={`block ${BRAND_ICON_CLASS_NAME} dark:hidden`}
        priority
      />
      <Image
        src="/icon-dark.svg"
        alt=""
        width={BRAND_ICON_SIZE}
        height={BRAND_ICON_SIZE}
        className={`hidden ${BRAND_ICON_CLASS_NAME} dark:block`}
        priority
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
        aria-labelledby="dealership-status-title"
        className="mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-md flex-col justify-center"
      >
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-2xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
          <CardHeader className="items-center gap-5 px-5 pt-6 text-center">
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-3xl border shadow-xs",
                state === "success"
                  ? "border-success/25 bg-success/10 text-success"
                  : "border-primary/15 bg-primary/10 text-primary",
              )}
            >
              <BrandIcon className="size-8" />
            </div>

            <div className="grid gap-2">
              <p className="text-overline text-muted-readable">Ozotec EV</p>
              <CardTitle
                id="dealership-status-title"
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

export function PublicDealershipApplicationPage(): React.ReactElement {
  const params = useParams<{ token?: string | string[] }>();
  const isMobile = useMobileDevice();

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
  const [addressEntryMode, setAddressEntryMode] =
    React.useState<AddressEntryMode>("location");
  const idempotencyKeyRef = React.useRef<string | null>(null);

  const form = useForm<DealershipInterestFormValues>({
    resolver: zodResolver(dealershipInterestFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const parsedToken = tokenResult.success ? tokenResult.data : null;
  const busy = submitState === "locating" || submitState === "submitting";
  const success = submitState === "success";
  const disabled = busy || success || parsedToken === null || isMobile !== true;

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

  async function handleNext(): Promise<void> {
    if (disabled) {
      return;
    }

    setFormError(null);

    const fields = STEP_FIELDS[step] ?? [];
    const valid = await form.trigger([...fields], { shouldFocus: true });

    if (!valid) {
      return;
    }

    setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1));
  }

  function handleBack(): void {
    setFormError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit(): Promise<void> {
    if (parsedToken === null || busy || success || isMobile !== true) {
      return;
    }

    setFormError(null);

    const valid = await form.trigger(undefined, { shouldFocus: true });

    if (!valid) {
      const nextStep = firstErrorStep(form.formState.errors);

      setStep(nextStep);

      if (nextStep === 3) {
        setAddressEntryMode("manual");
      }

      return;
    }

    const resolvedLocation = location ?? (await captureLocation());

    if (resolvedLocation === null) {
      setStep(3);
      setAddressEntryMode("location");
      return;
    }

    const idempotencyKey = idempotencyKeyRef.current ?? createIdempotencyKey();
    idempotencyKeyRef.current = idempotencyKey;

    setSubmitState("submitting");

    try {
      const values = dealershipInterestFormSchema.parse(form.getValues());
      const application = toSubmitRequest(values, resolvedLocation);

      await submitPublicDealershipApplication({
        token: parsedToken,
        idempotencyKey,
        application,
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

  if (isMobile === false) {
    return <BlockingStatusCard state="desktop-device" />;
  }

  if (success) {
    return <BlockingStatusCard state="success" />;
  }

  const progress = [String(step + 1), "of", String(STEP_TITLES.length)].join(
    " ",
  );
  const currentTitle = STEP_TITLES[step] ?? STEP_TITLES[0];

  return (
    <main
      className="dark min-h-svh bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.16),_transparent_30rem),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.34))] px-3 py-4 text-foreground"
      style={{ colorScheme: "dark" }}
    >
      <section
        aria-labelledby="dealership-form-title"
        className="mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-md flex-col justify-center"
      >
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-2xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
          <CardHeader className="gap-4 px-5 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-3xl border border-primary/15 bg-primary/10 text-primary shadow-xs">
                  <BrandIcon className="size-7" />
                </div>

                <div className="grid gap-0.5">
                  <p className="text-overline text-muted-readable">Ozotec EV</p>
                  <CardTitle
                    id="dealership-form-title"
                    className="text-subsection-title"
                  >
                    Dealership application
                  </CardTitle>
                </div>
              </div>

              <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-caption text-muted-readable">
                {progress}
              </span>
            </div>

            <div className="grid gap-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out motion-reduce:transition-none"
                  style={{
                    width: `${String(((step + 1) / STEP_TITLES.length) * 100)}%`,
                  }}
                />
              </div>

              <p className="text-body-sm text-muted-readable">{currentTitle}</p>
            </div>
          </CardHeader>

          <CardContent className="grid gap-5 px-5">
            {formError === null ? null : (
              <Alert variant="destructive" role="alert" aria-live="assertive">
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

            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <FieldGroup>
                {step === 0 ? (
                  <FieldSet disabled={disabled || busy}>
                    <FieldLegend>When are you planning to invest?</FieldLegend>

                    <Controller
                      control={form.control}
                      name="investmentTimeline"
                      render={({ field }) => (
                        <ChoiceCards
                          name="investment-timeline"
                          value={field.value}
                          options={INVESTMENT_TIMELINE_OPTIONS}
                          disabled={disabled || busy}
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
                    <FieldSet disabled={disabled || busy}>
                      <FieldLegend>
                        How much are you prepared to invest?
                      </FieldLegend>

                      <Controller
                        control={form.control}
                        name="investmentBudget"
                        render={({ field }) => (
                          <ChoiceCards
                            name="investment-budget"
                            value={field.value}
                            options={INVESTMENT_BUDGET_OPTIONS}
                            disabled={disabled || busy}
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

                    <FieldSet disabled={disabled || busy}>
                      <FieldLegend>Already running an EV business?</FieldLegend>

                      <Controller
                        control={form.control}
                        name="alreadyRunningEvBusiness"
                        render={({ field }) => (
                          <ChoiceCards
                            name="running-ev-business"
                            value={field.value}
                            options={RUNNING_EV_BUSINESS_OPTIONS}
                            disabled={disabled || busy}
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
                  <>
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
                        disabled={disabled || busy}
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
                        placeholder="Existing business or company name"
                        disabled={disabled || busy}
                        {...form.register("businessName")}
                      />
                      <FieldDescription>
                        Leave blank if you are applying as an individual.
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
                              disabled={disabled || busy}
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
                        enterKeyHint="next"
                        placeholder="you@example.com"
                        aria-invalid={
                          form.formState.errors.email === undefined
                            ? undefined
                            : true
                        }
                        disabled={disabled || busy}
                        {...form.register("email")}
                      />
                      {form.formState.errors.email?.message ===
                      undefined ? null : (
                        <FieldError>
                          {form.formState.errors.email.message}
                        </FieldError>
                      )}
                    </Field>
                  </>
                ) : null}

                {step === 3 ? (
                  <>
                    {addressEntryMode === "location" ? (
                      <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/35 p-4">
                        <div className="flex gap-3">
                          <ShieldCheck
                            aria-hidden="true"
                            className="mt-0.5 size-5 shrink-0 text-primary"
                          />

                          <div className="grid gap-1">
                            <p className="text-card-title">
                              Private and secure
                            </p>
                            <p className="text-body-sm text-muted-readable">
                              Use your current GPS location, or add the address
                              manually.
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Button
                            type="button"
                            variant={location === null ? "default" : "outline"}
                            disabled={disabled || busy}
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
                              ? "Use my current location"
                              : "Refresh current location"}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            disabled={disabled || busy}
                            onClick={() => {
                              setFormError(null);
                              setAddressEntryMode("manual");
                            }}
                            className="h-12 rounded-2xl"
                          >
                            Add Address
                          </Button>
                        </div>

                        {location === null ? null : (
                          <Alert variant="success" role="status">
                            <CheckCircle2 aria-hidden="true" />
                            <AlertTitle>Location captured</AlertTitle>
                            <AlertDescription>
                              GPS is ready for secure submission.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/35 p-4">
                          <div className="flex gap-3">
                            <ShieldCheck
                              aria-hidden="true"
                              className="mt-0.5 size-5 shrink-0 text-primary"
                            />

                            <div className="grid gap-1">
                              <p className="text-card-title">
                                Add address manually
                              </p>
                              <p className="text-body-sm text-muted-readable">
                                Enter the dealership location details carefully.
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            disabled={disabled || busy}
                            onClick={() => {
                              setFormError(null);
                              setAddressEntryMode("location");
                            }}
                            className="h-12 rounded-2xl"
                          >
                            <LocateFixed
                              aria-hidden="true"
                              className="size-4"
                            />
                            Use current location instead
                          </Button>
                        </div>

                        <Field
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
                            placeholder="Door no, street, area"
                            aria-invalid={
                              form.formState.errors.addressLine1 === undefined
                                ? undefined
                                : true
                            }
                            disabled={disabled || busy}
                            {...form.register("addressLine1")}
                          />
                          {form.formState.errors.addressLine1?.message ===
                          undefined ? null : (
                            <FieldError>
                              {form.formState.errors.addressLine1.message}
                            </FieldError>
                          )}
                        </Field>

                        <Field>
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
                            disabled={disabled || busy}
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
                            disabled={disabled || busy}
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
                            form.formState.errors.postalCode === undefined
                              ? undefined
                              : true
                          }
                        >
                          <FieldLabel htmlFor="postal-code">
                            PIN code
                          </FieldLabel>
                          <Input
                            id="postal-code"
                            type="text"
                            inputMode="numeric"
                            autoComplete="postal-code"
                            enterKeyHint="next"
                            maxLength={6}
                            aria-invalid={
                              form.formState.errors.postalCode === undefined
                                ? undefined
                                : true
                            }
                            disabled={disabled || busy}
                            {...form.register("postalCode")}
                          />
                          {form.formState.errors.postalCode?.message ===
                          undefined ? null : (
                            <FieldError>
                              {form.formState.errors.postalCode.message}
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
                            disabled={disabled || busy}
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
                            enterKeyHint="done"
                            aria-invalid={
                              form.formState.errors.state === undefined
                                ? undefined
                                : true
                            }
                            disabled={disabled || busy}
                            {...form.register("state")}
                          />
                          {form.formState.errors.state?.message ===
                          undefined ? null : (
                            <FieldError>
                              {form.formState.errors.state.message}
                            </FieldError>
                          )}
                        </Field>
                      </>
                    )}

                    <Field>
                      <FieldLabel htmlFor="notes">
                        Additional notes{" "}
                        <span className="text-muted-readable">(optional)</span>
                      </FieldLabel>
                      <Textarea
                        id="notes"
                        rows={3}
                        maxLength={1_200}
                        placeholder="Tell us about your preferred area, showroom plan, or experience."
                        disabled={disabled || busy}
                        {...form.register("notes")}
                      />
                    </Field>
                  </>
                ) : null}
              </FieldGroup>
            </form>
          </CardContent>

          <CardFooter className="grid gap-3 border-t border-border/70 bg-muted/35 px-5 py-4">
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

              {step < STEP_TITLES.length - 1 ? (
                <Button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => {
                    void handleNext();
                  }}
                  className="h-12 rounded-2xl"
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => {
                    void handleSubmit();
                  }}
                  className="h-12 rounded-2xl"
                >
                  {busy ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 animate-spin motion-reduce:animate-none"
                    />
                  ) : null}
                  Submit
                </Button>
              )}
            </div>

            <p className="text-center text-caption text-muted-readable">
              By submitting, you allow Ozotec EV to use these details only for
              dealership evaluation and follow-up.
            </p>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}

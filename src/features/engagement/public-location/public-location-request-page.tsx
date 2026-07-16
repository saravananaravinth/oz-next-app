// oz-next-app/src/features/engagement/public-location/public-location-request-page.tsx
"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  LocateFixed,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useParams } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { isApiHttpError } from "@/lib/api/problem";
import { idempotencyKey as createIdempotencyKey } from "@/lib/uuid";

import { PublicFormStatusEmblem } from "../public-form-status-emblem";
import { submitPublicLocation } from "./client";
import { PublicLocationShell } from "./public-location-shell";
import {
  publicLocationTokenSchema,
  type PublicLocationSubmitRequest,
} from "./schemas";

type CaptureState =
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

const GEOLOCATION_TIMEOUT_MS = 15_000;
const GEO_PERMISSION_DENIED = 1;
const GEO_POSITION_UNAVAILABLE = 2;
const GEO_TIMEOUT = 3;
const MAX_REQUEST_ID_LENGTH = 128;
const MAX_ACCURACY_METERS = 100_000;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:/@-]+$/u;

const STATE_COPY: Record<
  CaptureState,
  Readonly<{ title: string; description: string }>
> = {
  idle: {
    title: "Share your current location",
    description:
      "Use this secure page to share your current GPS position with Ozotec EV.",
  },
  locating: {
    title: "Finding your location",
    description:
      "Keep this page open while your device confirms its current position.",
  },
  submitting: {
    title: "Sending your location",
    description:
      "Your validated position is being submitted through the secure ERP gateway.",
  },
  success: {
    title: "Location shared",
    description:
      "Thank you. Ozotec EV has received your location for this request.",
  },
  "invalid-link": {
    title: "Invalid location link",
    description:
      "This location request link is invalid. Use the latest link sent by Ozotec EV.",
  },
  "unsupported-browser": {
    title: "Location is not supported",
    description:
      "This browser cannot provide secure geolocation. Open the link in an updated version of Chrome, Safari, Edge, or Firefox.",
  },
  "permission-denied": {
    title: "Location permission is blocked",
    description:
      "Allow location access for this site in your browser settings, then try again.",
  },
  "location-unavailable": {
    title: "Location unavailable",
    description:
      "Your device could not determine a valid position. Check GPS and network access, move to an open area, and try again.",
  },
  timeout: {
    title: "Location request timed out",
    description:
      "Your device took too long to provide a position. Check GPS and network signal, then try again.",
  },
  "api-error": {
    title: "Location could not be submitted",
    description:
      "We could not submit your location right now. Try again using the same link.",
  },
  "unexpected-error": {
    title: "Something went wrong",
    description:
      "The location request could not be completed. Refresh the page and try again.",
  },
};

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

function geolocationErrorState(error: GeolocationPositionError): CaptureState {
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

function locationFromPosition(
  position: GeolocationPosition,
): PublicLocationSubmitRequest | null {
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
      code.includes("CONSUMED") ||
      code.includes("NOT_FOUND")
    ) {
      baseError = {
        title: "Link expired or already used",
        description:
          "This location request link is no longer active. Use the latest link from Ozotec EV.",
      };
    } else if (error.status === 429) {
      baseError = {
        title: "Too many attempts",
        description:
          "Please wait briefly before trying to share this location again.",
      };
    } else if (error.status >= 500) {
      baseError = {
        title: "Service temporarily unavailable",
        description:
          "The location service is temporarily unavailable. Keep this page open and try again shortly.",
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

function actionLabel(state: CaptureState): string {
  switch (state) {
    case "locating":
      return "Finding location…";
    case "submitting":
      return "Sending securely…";
    case "success":
      return "Location shared";
    case "permission-denied":
    case "location-unavailable":
    case "timeout":
    case "api-error":
    case "unexpected-error":
      return "Try again";
    case "unsupported-browser":
      return "Location unavailable";
    case "idle":
    case "invalid-link":
      return "Share current location";
  }
}

function actionHint(state: CaptureState): string {
  switch (state) {
    case "locating":
      return "Keep this page open while your device determines its position.";
    case "submitting":
      return "Do not refresh or close this page until confirmation appears.";
    case "success":
      return "The location was submitted successfully. You may close this page.";
    case "unsupported-browser":
      return "Open this link in a current browser that supports secure geolocation.";
    case "permission-denied":
      return "Enable location permission for this site before trying again.";
    case "location-unavailable":
    case "timeout":
      return "Check GPS and network signal, then try the request again.";
    case "api-error":
    case "unexpected-error":
      return "Your link remains on this page. Retry when you are ready.";
    case "idle":
    case "invalid-link":
      return "Your browser will ask for permission. Keep this page open until confirmation.";
  }
}

function StatusScreen({
  state,
}: Readonly<{ state: "success" | "invalid-link" }>): React.ReactElement {
  const success = state === "success";
  const copy = STATE_COPY[state];
  const footerActions = success ? (
    <div className="mx-auto grid w-full max-w-2xl gap-2.5">
      <Button type="button" disabled className="h-12 w-full rounded-2xl">
        <CheckCircle2 aria-hidden="true" className="size-4" />
        Location shared
      </Button>
      <p className="text-center text-[0.6875rem] leading-relaxed text-muted-readable sm:text-caption">
        The location was submitted successfully. You may close this page.
      </p>
    </div>
  ) : undefined;

  return (
    <PublicLocationShell
      footerActions={footerActions}
      mainLabelledBy="public-location-status-title"
      mainClassName="items-stretch sm:items-center"
    >
      <section className="flex w-full max-w-2xl sm:block">
        <Card className="min-h-full w-full gap-0 overflow-hidden rounded-none border-x-0 border-y-0 border-border/70 bg-card/96 py-0 shadow-xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl sm:min-h-0 sm:rounded-3xl sm:border">
          <CardHeader className="items-center gap-5 px-5 py-8 text-center sm:px-8 sm:py-10">
            <PublicFormStatusEmblem status={success ? "success" : "error"} />

            <div className="grid max-w-lg gap-2">
              <p className="text-overline text-primary">Location request</p>
              <h1
                id="public-location-status-title"
                className="text-section-title text-balance"
              >
                {copy.title}
              </h1>
              <CardDescription className="text-body-sm text-pretty text-muted-readable">
                {copy.description}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 px-5 pb-8 sm:px-8 sm:pb-10">
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-center text-body-sm leading-relaxed text-muted-readable">
              {success
                ? "No further action is required for this location request."
                : "No location was captured or submitted from this invalid link."}
            </div>
          </CardContent>
        </Card>
      </section>
    </PublicLocationShell>
  );
}

export function PublicLocationRequestPage(): React.ReactElement {
  const params = useParams<{ token?: string | string[] }>();
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const tokenResult = React.useMemo(
    () => publicLocationTokenSchema.safeParse(rawToken ?? ""),
    [rawToken],
  );

  const [captureState, setCaptureState] = React.useState<CaptureState>("idle");
  const [error, setError] = React.useState<UserFacingError | null>(null);
  const mainRef = React.useRef<HTMLElement | null>(null);
  const mountedRef = React.useRef<boolean>(true);
  const actionLockRef = React.useRef(false);
  const idempotencyKeyRef = React.useRef<string | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  React.useEffect(() => {
    if (error !== null || captureState === "success") {
      mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [captureState, error]);

  const parsedToken = tokenResult.success ? tokenResult.data : null;
  const busy = captureState === "locating" || captureState === "submitting";
  const success = captureState === "success";
  const unsupported = captureState === "unsupported-browser";
  const disabled = parsedToken === null || busy || success || unsupported;
  const copy = STATE_COPY[captureState];

  async function handleShareLocation(): Promise<void> {
    if (
      parsedToken === null ||
      busy ||
      success ||
      unsupported ||
      actionLockRef.current
    ) {
      return;
    }

    actionLockRef.current = true;
    setError(null);
    setCaptureState("locating");

    try {
      const position = await getCurrentPosition();

      if (!mountedRef.current) {
        return;
      }

      const location = locationFromPosition(position);

      if (location === null) {
        setCaptureState("location-unavailable");
        setError({
          title: STATE_COPY["location-unavailable"].title,
          description: STATE_COPY["location-unavailable"].description,
        });
        return;
      }

      const idempotencyKey =
        idempotencyKeyRef.current ?? createIdempotencyKey("location");
      idempotencyKeyRef.current = idempotencyKey;

      const controller = new AbortController();
      abortControllerRef.current?.abort();
      abortControllerRef.current = controller;
      setCaptureState("submitting");

      await submitPublicLocation({
        token: parsedToken,
        idempotencyKey,
        location,
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      setCaptureState("success");
    } catch (caught) {
      if (!mountedRef.current) {
        return;
      }

      if (caught instanceof DOMException && caught.name === "AbortError") {
        return;
      }

      if (isGeolocationError(caught)) {
        const nextState = geolocationErrorState(caught);
        setCaptureState(nextState);
        setError({
          title: STATE_COPY[nextState].title,
          description: STATE_COPY[nextState].description,
        });
        return;
      }

      if (
        caught instanceof Error &&
        caught.message === "geolocation_unsupported"
      ) {
        setCaptureState("unsupported-browser");
        setError({
          title: STATE_COPY["unsupported-browser"].title,
          description: STATE_COPY["unsupported-browser"].description,
        });
        return;
      }

      setCaptureState("api-error");
      setError(errorFromUnknown(caught));
    } finally {
      actionLockRef.current = false;
    }
  }

  if (!tokenResult.success) {
    return <StatusScreen state="invalid-link" />;
  }

  if (success) {
    return <StatusScreen state="success" />;
  }

  const footerActions = (
    <div className="mx-auto grid w-full max-w-2xl gap-2.5">
      <Button
        type="button"
        disabled={disabled}
        onClick={() => {
          void handleShareLocation();
        }}
        className="h-12 w-full rounded-2xl"
      >
        {busy ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <LocateFixed aria-hidden="true" className="size-4" />
        )}
        {actionLabel(captureState)}
      </Button>

      <p className="text-center text-[0.6875rem] leading-relaxed text-muted-readable sm:text-caption">
        {actionHint(captureState)}
      </p>
    </div>
  );

  return (
    <PublicLocationShell
      footerActions={footerActions}
      mainLabelledBy="public-location-title"
      mainRef={mainRef}
    >
      <section className="flex w-full max-w-2xl">
        <Card
          aria-busy={busy}
          className="min-h-full w-full gap-0 overflow-hidden rounded-none border-x-0 border-y-0 border-border/70 bg-card/96 py-0 shadow-xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl sm:min-h-0 sm:rounded-3xl sm:border"
        >
          <CardHeader className="gap-5 px-4 py-5 sm:px-7 sm:py-7">
            <div className="min-w-0">
              <p className="text-overline text-primary">Location request</p>
              <h1
                id="public-location-title"
                className="mt-1 text-section-title text-balance"
              >
                {copy.title}
              </h1>
              <CardDescription className="mt-1.5 max-w-xl text-body-sm text-pretty text-muted-readable">
                {copy.description}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="grid gap-5 px-4 pb-7 sm:px-7 sm:pb-8">
            {error === null ? null : <FormErrorAlert error={error} />}

            <section
              aria-labelledby="location-process-title"
              className="grid gap-4 rounded-2xl border border-border/70 bg-muted/30 p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                  <MapPin aria-hidden="true" className="size-5" />
                </span>

                <div className="grid min-w-0 gap-1">
                  <h2 id="location-process-title" className="text-card-title">
                    Before you continue
                  </h2>
                  <p className="text-body-sm leading-relaxed text-muted-readable">
                    Be at the location you want to share and make sure GPS and
                    network access are enabled on your device.
                  </p>
                </div>
              </div>

              <ol className="grid gap-3 text-body-sm text-muted-readable">
                <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-caption text-primary [font-weight:var(--typography-emphasis-weight)]">
                    1
                  </span>
                  <span>Tap the location-sharing button below.</span>
                </li>
                <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-caption text-primary [font-weight:var(--typography-emphasis-weight)]">
                    2
                  </span>
                  <span>Allow location access when your browser asks.</span>
                </li>
                <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-caption text-primary [font-weight:var(--typography-emphasis-weight)]">
                    3
                  </span>
                  <span>Keep this page open until confirmation appears.</span>
                </li>
              </ol>
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
                <LocateFixed
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-primary"
                />
                <div className="grid gap-1">
                  <h2 className="text-card-title">High-accuracy capture</h2>
                  <p className="text-body-sm leading-relaxed text-muted-readable">
                    Your browser requests the current coordinates directly from
                    the device.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-primary"
                />
                <div className="grid gap-1">
                  <h2 className="text-card-title">Private submission</h2>
                  <p className="text-body-sm leading-relaxed text-muted-readable">
                    Coordinates are sent only after you explicitly approve the
                    browser permission.
                  </p>
                </div>
              </div>
            </div>

            <Alert variant="info" role="note">
              <ShieldCheck aria-hidden="true" />
              <AlertTitle>Used only for this request</AlertTitle>
              <AlertDescription>
                Ozotec EV uses the submitted location to process this request
                and coordinate the relevant follow-up. The page does not track
                your movement after submission.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>
    </PublicLocationShell>
  );
}

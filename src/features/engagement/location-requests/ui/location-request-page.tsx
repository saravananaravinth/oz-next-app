// oz-next-app/src/features/engagement/location-requests/ui/location-request-page.tsx
"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  ShieldCheck,
  WifiOff,
} from "lucide-react";

import {
  ContentFormActions,
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";
import { isApiHttpError } from "@/lib/api/problem";
import { idempotencyKey as createIdempotencyKey } from "@/lib/security/request-identifiers";
import { cn } from "@/lib/utils";

import { submitPublicLocation } from "@/features/engagement/location-requests/api/location-request.client";
import {
  publicLocationTokenSchema,
  type PublicLocationSubmitRequest,
} from "@/features/engagement/location-requests/contracts/location-request.schema";
import { PublicLocationShell } from "@/features/engagement/location-requests/ui/location-request-shell";
import { PublicFormStatusEmblem } from "@/features/engagement/shared/ui/public-form-status-emblem";

export type PublicLocationRequestPageProps = Readonly<{
  token: string;
}>;

type CaptureState =
  | "idle"
  | "locating"
  | "submitting"
  | "success"
  | "invalid-link"
  | "offline"
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

type StatusScreenState = "success" | "invalid-link";

const GEOLOCATION_TIMEOUT_MS = 15_000;
const GEO_PERMISSION_DENIED = 1;
const GEO_POSITION_UNAVAILABLE = 2;
const GEO_TIMEOUT = 3;
const MAX_REQUEST_ID_LENGTH = 128;
const MAX_ACCURACY_METERS = 100_000;
const MAX_RETRY_AFTER_SECONDS = 86_400;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:/@-]+$/u;

const STATE_COPY = {
  idle: {
    title: "Share the requested location",
    description:
      "Send one current GPS position to Ozotec EV after your browser asks for permission.",
  },
  locating: {
    title: "Finding your location",
    description:
      "Keep this page open while your device confirms its current position.",
  },
  submitting: {
    title: "Sending your location",
    description:
      "Your confirmed position is being submitted through the secure Ozotec gateway.",
  },
  success: {
    title: "Location shared",
    description:
      "Thank you. Ozotec EV has received the location for this request.",
  },
  "invalid-link": {
    title: "Location link unavailable",
    description:
      "This request link is invalid, expired, or already completed. Open the latest link sent by Ozotec EV.",
  },
  offline: {
    title: "Connect to the internet",
    description:
      "A network connection is required to send the location securely. Reconnect, then continue.",
  },
  "unsupported-browser": {
    title: "Location is not supported",
    description:
      "Open this link in a current version of Chrome, Safari, Edge, or Firefox on a device with location services.",
  },
  "permission-denied": {
    title: "Location permission is blocked",
    description:
      "Allow location access for this site in your browser settings, then try again.",
  },
  "location-unavailable": {
    title: "Location unavailable",
    description:
      "Turn on GPS, check the network signal, move to an open area, and try again.",
  },
  timeout: {
    title: "Location request timed out",
    description:
      "Your device took too long to confirm a position. Check GPS and network signal, then try again.",
  },
  "api-error": {
    title: "Location could not be sent",
    description:
      "The location remains ready on this page. Try again without closing or refreshing it.",
  },
  "unexpected-error": {
    title: "Something went wrong",
    description:
      "The request could not be completed safely. Refresh the page and try again.",
  },
} as const satisfies Record<
  CaptureState,
  Readonly<{ title: string; description: string }>
>;

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
    return "Please wait briefly before trying to share this location again.";
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

function isTerminalLinkError(error: unknown): boolean {
  if (!isApiHttpError(error)) {
    return false;
  }

  const code = error.code.toUpperCase();

  return (
    error.status === 401 ||
    error.status === 403 ||
    error.status === 404 ||
    error.status === 409 ||
    error.status === 410 ||
    code.includes("EXPIRED") ||
    code.includes("USED") ||
    code.includes("CONSUMED") ||
    code.includes("NOT_FOUND") ||
    code.includes("INVALID_TOKEN")
  );
}

function shouldDiscardCapturedLocation(error: unknown): boolean {
  return isApiHttpError(error) && error.status === 422;
}

function errorFromUnknown(error: unknown): UserFacingError {
  if (isApiHttpError(error)) {
    const requestId = safeRequestId(error.requestId);
    let baseError: Omit<UserFacingError, "requestId">;

    if (error.status === 422) {
      baseError = {
        title: "Location could not be accepted",
        description:
          "The device returned a position that could not be validated. Move to an open area and capture the location again.",
      };
    } else if (error.status === 429) {
      baseError = {
        title: "Too many attempts",
        description: retryAfterDescription(
          normalizeRetryAfterSeconds(error.retryAfterSeconds),
        ),
      };
    } else if (error.status >= 500) {
      baseError = {
        title: "Service temporarily unavailable",
        description:
          "The confirmed location remains ready on this page. Keep the page open and try again shortly.",
      };
    } else {
      baseError = {
        title: STATE_COPY["api-error"].title,
        description: STATE_COPY["api-error"].description,
      };
    }

    return requestId === undefined ? baseError : { ...baseError, requestId };
  }

  if (error instanceof Error && error.name === "NetworkError") {
    return {
      title: "Network request failed",
      description:
        "Check the internet connection and try again. The confirmed location remains ready on this page.",
    };
  }

  return {
    title: STATE_COPY["unexpected-error"].title,
    description: STATE_COPY["unexpected-error"].description,
  };
}

function actionLabel(state: CaptureState): string {
  switch (state) {
    case "locating":
      return "Finding location…";

    case "submitting":
      return "Sending securely…";

    case "success":
      return "Location shared";

    case "offline":
      return "Connect to continue";

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
      return "Keep this page open while the device determines its position.";

    case "submitting":
      return "Do not refresh or close the page until confirmation appears.";

    case "success":
      return "The request is complete. You may close this page.";

    case "offline":
      return "Reconnect to the internet before continuing.";

    case "unsupported-browser":
      return "Use a current browser on a device with location services.";

    case "permission-denied":
      return "Enable location permission for this site before retrying.";

    case "location-unavailable":
    case "timeout":
      return "Check GPS and network signal, then retry.";

    case "api-error":
    case "unexpected-error":
      return "The secure request remains available for another attempt.";

    case "idle":
    case "invalid-link":
      return "Your browser will ask for permission before anything is sent.";
  }
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

function RequestStep({
  number,
  title,
  description,
}: Readonly<{
  number: number;
  title: string;
  description: string;
}>): React.ReactElement {
  return (
    <li className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-3">
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 text-caption text-primary [font-weight:var(--typography-emphasis-weight)]"
      >
        {number}
      </span>

      <div className="min-w-0">
        <p className="text-body-sm text-foreground [font-weight:var(--typography-emphasis-weight)]">
          {title}
        </p>

        <p className="mt-0.5 text-caption leading-relaxed text-muted-readable">
          {description}
        </p>
      </div>
    </li>
  );
}

function TrustItem({
  icon,
  label,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
}>): React.ReactElement {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-border/70 bg-muted/30 px-2 py-3 text-center">
      <span className="text-primary">{icon}</span>
      <span className="text-caption text-foreground">{label}</span>
    </div>
  );
}

function StatusScreen({
  state,
}: Readonly<{ state: StatusScreenState }>): React.ReactElement {
  const success = state === "success";
  const copy = STATE_COPY[state];

  return (
    <PublicLocationShell
      mainLabelledBy="public-location-status-title"
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
            "border-border/70 bg-card/96 text-center shadow-xl shadow-foreground/5",
            success ? "border-success/25" : "border-destructive/20",
          )}
          title={<span id="public-location-status-title">{copy.title}</span>}
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
                : "No location was captured or submitted"
            }
            description={
              success
                ? "This page does not continue accessing or tracking your location after completion."
                : "Use the newest Ozotec EV location request link before trying again."
            }
          />

          <p className="mt-4 text-center text-caption leading-relaxed text-muted-readable">
            This public page does not expose internal ERP records or diagnostic
            data.
          </p>
        </ContentSection>
      </ContentRoot>
    </PublicLocationShell>
  );
}

export function PublicLocationRequestPage({
  token,
}: PublicLocationRequestPageProps): React.ReactElement {
  const tokenResult = React.useMemo(
    () => publicLocationTokenSchema.safeParse(token),
    [token],
  );

  const online = React.useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineStatus,
    getServerOnlineStatus,
  );

  const [captureState, setCaptureState] = React.useState<CaptureState>("idle");
  const [error, setError] = React.useState<UserFacingError | null>(null);

  const mountedRef = React.useRef(true);
  const actionLockRef = React.useRef(false);
  const idempotencyKeyRef = React.useRef<string | null>(null);
  const pendingLocationRef = React.useRef<PublicLocationSubmitRequest | null>(
    null,
  );
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const statusRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  React.useEffect(() => {
    if (error === null) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      statusRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [error]);

  const parsedToken = tokenResult.success ? tokenResult.data : null;
  const busy = captureState === "locating" || captureState === "submitting";
  const success = captureState === "success";
  const unsupported = captureState === "unsupported-browser";

  const effectiveState: CaptureState =
    captureState === "invalid-link" || busy || success || online
      ? captureState
      : "offline";

  const disabled =
    parsedToken === null || busy || success || unsupported || !online;

  const copy = STATE_COPY[effectiveState];

  async function handleShareLocation(): Promise<void> {
    if (
      parsedToken === null ||
      busy ||
      success ||
      unsupported ||
      !online ||
      actionLockRef.current
    ) {
      return;
    }

    actionLockRef.current = true;
    setError(null);

    try {
      let location = pendingLocationRef.current;

      if (location === null) {
        setCaptureState("locating");

        const position = await getCurrentPosition();

        if (!mountedRef.current) {
          return;
        }

        location = locationFromPosition(position);

        if (location === null) {
          setCaptureState("location-unavailable");
          setError({
            title: STATE_COPY["location-unavailable"].title,
            description: STATE_COPY["location-unavailable"].description,
          });
          return;
        }

        pendingLocationRef.current = location;
      }

      const requestIdempotencyKey =
        idempotencyKeyRef.current ?? createIdempotencyKey("location");

      idempotencyKeyRef.current = requestIdempotencyKey;

      const controller = new AbortController();

      abortControllerRef.current?.abort();
      abortControllerRef.current = controller;

      setCaptureState("submitting");

      await submitPublicLocation({
        token: parsedToken,
        idempotencyKey: requestIdempotencyKey,
        location,
        signal: controller.signal,
      });

      if (controller.signal.aborted || !mountedRef.current) {
        return;
      }

      pendingLocationRef.current = null;
      setCaptureState("success");
    } catch (caught: unknown) {
      if (!mountedRef.current) {
        return;
      }

      if (caught instanceof DOMException && caught.name === "AbortError") {
        return;
      }

      if (isGeolocationError(caught)) {
        const nextState = geolocationErrorState(caught);

        pendingLocationRef.current = null;
        idempotencyKeyRef.current = null;

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
        pendingLocationRef.current = null;
        idempotencyKeyRef.current = null;

        setCaptureState("unsupported-browser");
        setError({
          title: STATE_COPY["unsupported-browser"].title,
          description: STATE_COPY["unsupported-browser"].description,
        });

        return;
      }

      if (isTerminalLinkError(caught)) {
        pendingLocationRef.current = null;
        idempotencyKeyRef.current = null;

        setCaptureState("invalid-link");
        return;
      }

      if (shouldDiscardCapturedLocation(caught)) {
        pendingLocationRef.current = null;
        idempotencyKeyRef.current = null;
      }

      setCaptureState("api-error");
      setError(errorFromUnknown(caught));
    } finally {
      abortControllerRef.current = null;
      actionLockRef.current = false;
    }
  }

  if (!tokenResult.success || captureState === "invalid-link") {
    return <StatusScreen state="invalid-link" />;
  }

  if (success) {
    return <StatusScreen state="success" />;
  }

  const footerActions = (
    <ContentFormActions className="mx-auto w-full max-w-3xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent sm:justify-between">
      <p
        id="public-location-action-hint"
        className="sr-only"
        aria-live="polite"
      >
        {actionHint(effectiveState)}
      </p>

      <div className="hidden min-w-0 flex-1 sm:block" aria-hidden="true">
        <p className="truncate text-caption text-muted-readable">
          One-time location request
        </p>

        <p className="truncate text-body-sm text-foreground [font-weight:var(--typography-emphasis-weight)]">
          {actionHint(effectiveState)}
        </p>
      </div>

      <Button
        type="button"
        disabled={disabled}
        aria-busy={busy}
        aria-describedby="public-location-action-hint"
        onClick={() => {
          void handleShareLocation();
        }}
        className="min-h-12 w-full touch-manipulation sm:w-auto sm:min-w-64"
      >
        {busy ? (
          <LoaderCircle
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
        ) : effectiveState === "offline" ? (
          <WifiOff aria-hidden="true" />
        ) : (
          <LocateFixed aria-hidden="true" />
        )}

        {actionLabel(effectiveState)}
      </Button>
    </ContentFormActions>
  );

  return (
    <PublicLocationShell
      footerActions={footerActions}
      mainLabelledBy="public-location-title"
    >
      <ContentRoot
        width="narrow"
        density="compact"
        className="max-w-2xl px-3 py-4 sm:px-0 sm:py-2"
      >
        <ContentSection
          aria-busy={busy}
          className="overflow-hidden border-primary/20 bg-card/96 shadow-xl shadow-primary/5"
        >
          <div className="grid gap-6">
            <div className="grid justify-items-center gap-4 text-center">
              <span
                className={cn(
                  "flex size-20 items-center justify-center rounded-[1.75rem] border shadow-xs transition-colors motion-reduce:transition-none",
                  busy
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : effectiveState === "offline"
                      ? "border-warning/30 bg-warning/10 text-warning-foreground dark:text-warning"
                      : "border-primary/20 bg-primary/8 text-primary",
                )}
              >
                {effectiveState === "locating" ? (
                  <Navigation
                    aria-hidden="true"
                    className="size-9 animate-pulse motion-reduce:animate-none"
                  />
                ) : effectiveState === "submitting" ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-9 animate-spin motion-reduce:animate-none"
                  />
                ) : effectiveState === "offline" ? (
                  <WifiOff aria-hidden="true" className="size-9" />
                ) : (
                  <MapPin aria-hidden="true" className="size-9" />
                )}
              </span>

              <div className="grid max-w-xl gap-2">
                <h1
                  id="public-location-title"
                  className="text-page-title text-balance"
                >
                  {copy.title}
                </h1>

                <p className="text-body-sm leading-relaxed text-muted-readable text-pretty sm:text-body">
                  {copy.description}
                </p>
              </div>
            </div>

            <div
              className="sr-only"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {busy ? `${copy.title}. ${copy.description}` : null}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <TrustItem
                icon={<Clock3 aria-hidden="true" className="size-4" />}
                label="Usually under 30 sec"
              />

              <TrustItem
                icon={<ShieldCheck aria-hidden="true" className="size-4" />}
                label="Permission required"
              />

              <TrustItem
                icon={<Navigation aria-hidden="true" className="size-4" />}
                label="No background tracking"
              />
            </div>

            <div ref={statusRef} className="scroll-mt-24">
              {effectiveState === "offline" ? (
                <ContentStatus
                  variant="warning"
                  role="status"
                  aria-live="polite"
                  icon={<WifiOff aria-hidden="true" />}
                  title="You are offline"
                  description="Reconnect to the internet. The action becomes available automatically when the connection returns."
                />
              ) : error === null ? null : (
                <FormErrorStatus error={error} />
              )}
            </div>

            <div className="rounded-3xl border border-border/70 bg-muted/30 p-4 sm:p-5">
              <h2 className="text-card-title">Before you continue</h2>

              <ol className="mt-4 grid gap-4">
                <RequestStep
                  number={1}
                  title="Stand at the requested place"
                  description="Share the location connected to this Ozotec request."
                />

                <RequestStep
                  number={2}
                  title="Turn on GPS and internet"
                  description="A clear GPS and network signal improves accuracy and speed."
                />

                <RequestStep
                  number={3}
                  title="Tap the button and allow access"
                  description="Nothing is sent until you approve the browser permission."
                />
              </ol>
            </div>

            <ContentStatus
              variant="info"
              role="note"
              icon={<ShieldCheck aria-hidden="true" />}
              title="You remain in control"
              description="This page requests one current position and submits it only after permission. It does not continuously track movement or access internal ERP data."
            />
          </div>
        </ContentSection>

        <p className="px-3 text-center text-caption leading-relaxed text-muted-readable text-pretty">
          By continuing, you authorize this one-time location submission for the
          request associated with this secure link.
        </p>
      </ContentRoot>
    </PublicLocationShell>
  );
}

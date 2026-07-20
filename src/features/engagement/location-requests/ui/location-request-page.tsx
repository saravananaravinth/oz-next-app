// oz-next-app/src/features/engagement/location-requests/ui/location-request-page.tsx
"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Info,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Menu,
  Navigation,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import {
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentFormActions,
  ContentHeader,
  ContentRoot,
  ContentSection,
  ContentSplit,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
      "Approve one secure browser request to send your current GPS position to Ozotec EV.",
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
    title: "Location link unavailable",
    description:
      "This location request link is invalid. Open the latest link sent by Ozotec EV.",
  },
  "unsupported-browser": {
    title: "Location is not supported",
    description:
      "This browser cannot provide secure geolocation. Open the link in a current version of Chrome, Safari, Edge, or Firefox.",
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
      "We could not submit your location right now. Your secure link remains on this page so you can retry.",
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
      error.status === 410 ||
      code.includes("EXPIRED") ||
      code.includes("USED") ||
      code.includes("CONSUMED") ||
      code.includes("NOT_FOUND")
    ) {
      baseError = {
        title: "Link expired or already used",
        description:
          "This location request link is no longer active. Open the latest link sent by Ozotec EV.",
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
      return "Check GPS and network signal, then retry the request.";
    case "api-error":
    case "unexpected-error":
      return "Your secure link remains available on this page for another attempt.";
    case "idle":
    case "invalid-link":
      return "Your browser will ask for permission. Keep this page open until confirmation.";
  }
}

function LocationGuideContent(): React.ReactElement {
  return (
    <div className="grid min-w-0 gap-4">
      <ContentDescriptionList columns="one">
        <ContentDescriptionItem term="Before you start">
          Stand at the place you want to share and turn on GPS and mobile data
          or Wi-Fi.
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Browser permission">
          Choose Allow only when your browser asks for access to this site.
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Expected time">
          A strong GPS and network signal normally completes this request within
          30 seconds.
        </ContentDescriptionItem>
      </ContentDescriptionList>

      <ContentStatus
        variant="info"
        role="note"
        icon={<ShieldCheck aria-hidden="true" />}
        title="No continuous tracking"
        description="This page requests one current position. It does not keep tracking your movement after submission."
      />
    </div>
  );
}

function MobileLocationGuideSheet(): React.ReactElement {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="lg:hidden">
          <Menu aria-hidden="true" />
          How it works
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[min(88dvh,40rem)]">
        <SheetHeader>
          <SheetTitle>Before sharing your location</SheetTitle>
          <SheetDescription>
            Prepare the device for a fast and accurate location request.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 sm:px-5">
          <LocationGuideContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatusScreen({
  state,
}: Readonly<{ state: "success" | "invalid-link" }>): React.ReactElement {
  const success = state === "success";
  const copy = STATE_COPY[state];
  const footerActions = success ? (
    <ContentFormActions className="mx-auto w-full max-w-2xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent">
      <Button type="button" disabled className="min-h-11 w-full">
        <CheckCircle2 aria-hidden="true" />
        Location shared
      </Button>
    </ContentFormActions>
  ) : undefined;

  return (
    <PublicLocationShell
      footerActions={footerActions}
      mainLabelledBy="public-location-status-title"
      mainClassName="items-center"
    >
      <ContentRoot
        width="narrow"
        density="compact"
        className="px-3 py-8 sm:px-0 sm:py-4"
      >
        <div className="grid justify-items-center">
          <PublicFormStatusEmblem status={success ? "success" : "error"} />
        </div>

        <ContentSection
          className={cn(
            "shadow-lg",
            success
              ? "border-success/20 shadow-success/5"
              : "border-destructive/20 shadow-destructive/5",
          )}
          title={<span id="public-location-status-title">{copy.title}</span>}
          description={copy.description}
        >
          <ContentStatus
            variant={success ? "success" : "destructive"}
            role="status"
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
                ? "The request is complete. This page does not continue accessing your location."
                : "Open the newest Ozotec EV location link before trying again."
            }
          />

          <p className="mt-4 text-center text-caption text-muted-readable">
            This public page does not expose internal ERP records or diagnostic
            details.
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
  const [captureState, setCaptureState] = React.useState<CaptureState>("idle");
  const [error, setError] = React.useState<UserFacingError | null>(null);
  const mountedRef = React.useRef(true);
  const actionLockRef = React.useRef(false);
  const idempotencyKeyRef = React.useRef<string | null>(null);
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
    } catch (caught: unknown) {
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
    <ContentFormActions className="mx-auto w-full max-w-7xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent sm:justify-between">
      <div className="hidden min-w-0 flex-1 sm:block">
        <p className="truncate text-caption text-muted-readable">
          Secure location request
        </p>
        <p className="truncate text-body-sm font-medium text-foreground">
          {actionHint(captureState)}
        </p>
      </div>

      <Button
        type="button"
        disabled={disabled}
        aria-busy={busy}
        onClick={() => {
          void handleShareLocation();
        }}
        className="min-h-11 w-full touch-manipulation sm:w-auto sm:min-w-64"
      >
        {busy ? (
          <LoaderCircle
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
        ) : (
          <LocateFixed aria-hidden="true" />
        )}
        {actionLabel(captureState)}
      </Button>
    </ContentFormActions>
  );

  return (
    <PublicLocationShell
      footerActions={footerActions}
      mainLabelledBy="public-location-title"
    >
      <ContentRoot
        width="wide"
        density="compact"
        className="px-3 py-3 sm:px-0 sm:py-0"
      >
        <ContentHeader
          variant="compact"
          eyebrow={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Location request</Badge>
              <Badge variant="secondary">One secure action</Badge>
            </div>
          }
          title={<span id="public-location-title">{copy.title}</span>}
          description={copy.description}
          actions={<MobileLocationGuideSheet />}
          meta={
            <div className="grid w-full min-w-0 gap-2 sm:grid-cols-3">
              <div className="flex min-w-0 items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                <Clock3
                  aria-hidden="true"
                  className="size-4 shrink-0 text-primary"
                />
                <span className="text-caption text-foreground">
                  Usually under 30 seconds
                </span>
              </div>

              <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
                <Smartphone
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-readable"
                />
                <span className="text-caption text-foreground">
                  Explicit browser permission
                </span>
              </div>

              <div className="hidden min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 sm:flex">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-4 shrink-0 text-success"
                />
                <span className="text-caption text-foreground">
                  No continuous tracking
                </span>
              </div>
            </div>
          }
          cardClassName="border-primary/20 bg-card/92 shadow-lg shadow-primary/5"
        />

        <ContentSplit
          variant="main-context"
          className="gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem]"
        >
          <div className="grid min-w-0 gap-4">
            <div ref={statusRef} className="scroll-mt-24">
              {error === null ? null : <FormErrorStatus error={error} />}
            </div>

            <ContentSection
              aria-busy={busy}
              className="border-primary/15 bg-card/94 shadow-md"
              title="Share the correct place"
              description="Stand at the location connected to this request before starting the capture."
            >
              <div className="grid gap-5">
                <div className="flex min-w-0 flex-col items-center gap-4 rounded-3xl border border-primary/20 bg-primary/5 px-4 py-6 text-center sm:px-6 sm:py-8">
                  <span className="flex size-16 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
                    {busy ? (
                      <Navigation
                        aria-hidden="true"
                        className="size-8 animate-pulse motion-reduce:animate-none"
                      />
                    ) : (
                      <MapPin aria-hidden="true" className="size-8" />
                    )}
                  </span>

                  <div className="grid max-w-xl gap-2">
                    <h2 className="text-section-title text-balance">
                      {busy
                        ? captureState === "locating"
                          ? "Confirming the device position"
                          : "Submitting the confirmed position"
                        : "Ready when you are at the location"}
                    </h2>
                    <p className="text-body-sm leading-relaxed text-muted-readable text-pretty">
                      {busy
                        ? actionHint(captureState)
                        : "Tap Share current location below, approve the browser permission, and keep this page open until confirmation appears."}
                    </p>
                  </div>
                </div>

                <ContentDescriptionList columns="three">
                  <ContentDescriptionItem term="1. Prepare">
                    Turn on GPS and a stable network connection.
                  </ContentDescriptionItem>
                  <ContentDescriptionItem term="2. Approve">
                    Allow location access only for this Ozotec EV page.
                  </ContentDescriptionItem>
                  <ContentDescriptionItem term="3. Confirm">
                    Keep the page open until the success message appears.
                  </ContentDescriptionItem>
                </ContentDescriptionList>

                <ContentStatus
                  variant="info"
                  role="note"
                  icon={<Info aria-hidden="true" />}
                  title="Used only for this request"
                  description="The current coordinates are submitted only after your approval. This page does not continue tracking movement after the request finishes."
                />
              </div>
            </ContentSection>

            <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
              <ContentSection
                size="sm"
                title="High-accuracy capture"
                description="The browser requests the current coordinates directly from your device."
              >
                <LocateFixed
                  aria-hidden="true"
                  className="size-5 text-primary"
                />
              </ContentSection>

              <ContentSection
                size="sm"
                title="Private submission"
                description="Coordinates are sent through the Ozotec ERP gateway after explicit permission."
              >
                <ShieldCheck
                  aria-hidden="true"
                  className="size-5 text-success"
                />
              </ContentSection>
            </div>
          </div>

          <aside
            className="hidden min-w-0 lg:sticky lg:top-20 lg:block"
            aria-label="Location request guidance"
          >
            <ContentSection
              title="Before sharing"
              description="Prepare the device for a faster, more accurate request."
              className="bg-card/90 shadow-md"
            >
              <LocationGuideContent />
            </ContentSection>
          </aside>
        </ContentSplit>
      </ContentRoot>
    </PublicLocationShell>
  );
}

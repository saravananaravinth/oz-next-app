// oz-next-app/src/features/engagement/public-location/public-location-request-page.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  LocateFixed,
  ShieldCheck,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isApiHttpError } from "@/lib/api/problem";

import { submitPublicLocation } from "./client";
import { publicLocationTokenSchema } from "./schemas";

type CaptureState =
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

const MOBILE_DEVICE_QUERY = "(max-width: 767px), (pointer: coarse)";
const GEOLOCATION_TIMEOUT_MS = 15_000;
const GEO_PERMISSION_DENIED = 1;
const GEO_POSITION_UNAVAILABLE = 2;
const GEO_TIMEOUT = 3;
const BRAND_LOGO_WIDTH = 154;
const BRAND_LOGO_HEIGHT = 40;
const MAX_REQUEST_ID_LENGTH = 128;
const SAFE_REQUEST_ID_RE = /^[A-Za-z0-9_.:/@-]+$/u;

const STATE_COPY: Record<
  CaptureState,
  Readonly<{ title: string; description: string }>
> = {
  idle: {
    title: "Share your location",
    description:
      "Tap the button below to securely share your current location with Ozotec EV.",
  },
  locating: {
    title: "Finding your location",
    description: "Keep this page open while your phone confirms your position.",
  },
  submitting: {
    title: "Sending securely",
    description:
      "Your location is being submitted through the secure ERP gateway.",
  },
  success: {
    title: "Location shared",
    description:
      "Thank you. We have received your location and will continue with your request.",
  },
  "invalid-link": {
    title: "Invalid location link",
    description:
      "This location request link is invalid. Please use the latest link sent by Ozotec EV.",
  },
  "desktop-device": {
    title: "Open this link on your phone",
    description:
      "This location request is designed for mobile devices so we can capture the correct GPS location.",
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
    title: "Location could not be submitted",
    description:
      "We could not submit your location right now. Please try again using the same link.",
  },
  "unexpected-error": {
    title: "Something went wrong",
    description:
      "The location request could not be completed. Please refresh the page and try again.",
  },
};

function createIdempotencyKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `location:${crypto.randomUUID()}`;
  }

  const timestamp = Date.now().toString(36);
  const random = Math.random()
    .toString(36)
    .slice(2)
    .padEnd(18, "0")
    .slice(0, 18);

  return `location:${timestamp}:${random}`;
}

function isGeolocationError(error: unknown): error is GeolocationPositionError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as Partial<GeolocationPositionError>;

  return (
    typeof candidate.code === "number" &&
    typeof candidate.message === "string" &&
    (candidate.code === GEO_PERMISSION_DENIED ||
      candidate.code === GEO_POSITION_UNAVAILABLE ||
      candidate.code === GEO_TIMEOUT)
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

function readMobileDeviceSnapshot(): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.matchMedia(MOBILE_DEVICE_QUERY).matches;
}

function readMobileDeviceServerSnapshot(): boolean | null {
  return null;
}

function noopMobileDeviceSubscription(): void {
  // No browser media listener is registered during server rendering.
}

function subscribeToMobileDeviceChanges(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return noopMobileDeviceSubscription;
  }

  const media = window.matchMedia(MOBILE_DEVICE_QUERY);

  media.addEventListener("change", onStoreChange);

  return (): void => {
    media.removeEventListener("change", onStoreChange);
  };
}

function useMobileDevice(): boolean | null {
  return React.useSyncExternalStore(
    subscribeToMobileDeviceChanges,
    readMobileDeviceSnapshot,
    readMobileDeviceServerSnapshot,
  );
}

function safeRequestId(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (
    normalized === undefined ||
    normalized.length === 0 ||
    normalized.length > MAX_REQUEST_ID_LENGTH ||
    !SAFE_REQUEST_ID_RE.test(normalized)
  ) {
    return undefined;
  }

  return normalized;
}

function errorFromUnknown(error: unknown): UserFacingError {
  if (isApiHttpError(error)) {
    const errorCode = error.code.toUpperCase();
    const expiredOrUsed =
      error.status === 404 ||
      error.status === 409 ||
      errorCode.includes("EXPIRED") ||
      errorCode.includes("USED");

    const requestId = safeRequestId(error.requestId);

    return {
      title: expiredOrUsed
        ? "Link expired or already used"
        : "Location could not be submitted",
      description: expiredOrUsed
        ? "This location request link is no longer active. Please use the latest link from Ozotec EV."
        : "We could not submit your location right now. Please try again.",
      ...(requestId === undefined ? {} : { requestId }),
    };
  }

  return {
    title: STATE_COPY["unexpected-error"].title,
    description: STATE_COPY["unexpected-error"].description,
  };
}

function BrandTrustHeader(): React.ReactElement {
  return (
    <div className="flex justify-center" aria-label="Ozotec EV">
      <div className="inline-flex items-center justify-center rounded-3xl border border-border/70 bg-background/70 px-4 py-3 shadow-xs ring-1 ring-foreground/5 supports-[backdrop-filter]:backdrop-blur-md">
        <Image
          src="/logo-light.svg"
          alt="Ozotec EV"
          width={BRAND_LOGO_WIDTH}
          height={BRAND_LOGO_HEIGHT}
          priority
          className="block h-8 w-auto dark:hidden"
        />
        <Image
          src="/logo-dark.svg"
          alt="Ozotec EV"
          width={BRAND_LOGO_WIDTH}
          height={BRAND_LOGO_HEIGHT}
          priority
          className="hidden h-8 w-auto dark:block"
        />
      </div>
    </div>
  );
}

export function PublicLocationRequestPage(): React.ReactElement {
  const params = useParams<{ token?: string | string[] }>();
  const isMobile = useMobileDevice();
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;

  const tokenResult = React.useMemo(
    () => publicLocationTokenSchema.safeParse(rawToken ?? ""),
    [rawToken],
  );

  const [captureState, setCaptureState] = React.useState<CaptureState>("idle");
  const [error, setError] = React.useState<UserFacingError | null>(null);
  const idempotencyKeyRef = React.useRef<string | null>(null);

  const invalidToken = !tokenResult.success;
  const guardedState: CaptureState | null = invalidToken
    ? "invalid-link"
    : isMobile === false
      ? "desktop-device"
      : null;
  const state = guardedState ?? captureState;
  const busy = state === "locating" || state === "submitting";
  const success = state === "success";
  const disabled =
    invalidToken ||
    isMobile !== true ||
    busy ||
    success ||
    state === "unsupported-browser";
  const copy = STATE_COPY[state];

  async function handleShareLocation(): Promise<void> {
    if (!tokenResult.success) {
      return;
    }

    if (
      isMobile !== true ||
      busy ||
      success ||
      state === "unsupported-browser"
    ) {
      return;
    }

    const token = tokenResult.data;
    const idempotencyKey = (idempotencyKeyRef.current ??=
      createIdempotencyKey());

    setError(null);
    setCaptureState("locating");

    try {
      if (!("geolocation" in navigator)) {
        setCaptureState("unsupported-browser");
        setError({
          title: STATE_COPY["unsupported-browser"].title,
          description: STATE_COPY["unsupported-browser"].description,
        });
        return;
      }

      const position = await getCurrentPosition();
      const accuracy = Number.isFinite(position.coords.accuracy)
        ? position.coords.accuracy
        : undefined;

      setCaptureState("submitting");

      await submitPublicLocation({
        token,
        idempotencyKey,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          ...(accuracy === undefined ? {} : { accuracyMeters: accuracy }),
        },
      });

      setCaptureState("success");
    } catch (caught) {
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
    }
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.10),_transparent_34rem),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.45))] px-4 py-5 text-foreground">
      <section
        aria-labelledby="location-request-title"
        className="mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-md flex-col justify-center"
      >
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-2xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
          <CardHeader className="items-center gap-5 px-5 pt-6 text-center">
            <div className="grid justify-items-center gap-3">
              <BrandTrustHeader />

              <CardTitle
                id="location-request-title"
                className="text-section-title"
              >
                {copy.title}
              </CardTitle>

              <p className="text-body-sm text-muted-readable text-pretty">
                {copy.description}
              </p>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 px-5">
            {error !== null ? (
              <Alert
                variant={state === "success" ? "success" : "destructive"}
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
              >
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>{error.title}</AlertTitle>
                <AlertDescription>
                  <p>{error.description}</p>
                  {error.requestId !== undefined ? (
                    <p className="mt-1 text-caption">
                      Reference:{" "}
                      <code className="break-all text-tabular">
                        {error.requestId}
                      </code>
                    </p>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}

            {success ? (
              <Alert
                variant="success"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <CheckCircle2 aria-hidden="true" />
                <AlertTitle>Received successfully</AlertTitle>
                <AlertDescription>
                  You may now close this page. No further action is required.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/35 p-4">
              <div className="flex gap-3">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-primary"
                />
                <div className="grid gap-1">
                  <p className="text-card-title">Private and secure</p>
                  <p className="text-body-sm text-muted-readable">
                    Your location is used only to process this request and
                    assign the nearest relevant support or dealership workflow.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <LocateFixed
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-primary"
                />
                <div className="grid gap-1">
                  <p className="text-card-title">One-tap GPS capture</p>
                  <p className="text-body-sm text-muted-readable">
                    We request your current location directly from your phone.
                    Please allow location access when prompted.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="grid gap-3 border-t border-border/70 bg-muted/30 px-5 py-5">
            <Button
              type="button"
              size="lg"
              className="h-12 rounded-2xl"
              disabled={disabled}
              onClick={handleShareLocation}
            >
              {busy ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin motion-reduce:animate-none"
                />
              ) : (
                <LocateFixed aria-hidden="true" className="size-4" />
              )}
              {state === "locating"
                ? "Finding location"
                : state === "submitting"
                  ? "Submitting"
                  : success
                    ? "Location shared"
                    : "Share my location"}
            </Button>

            <p className="text-center text-caption text-muted-readable">
              Works best on mobile browsers with GPS enabled.
            </p>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}

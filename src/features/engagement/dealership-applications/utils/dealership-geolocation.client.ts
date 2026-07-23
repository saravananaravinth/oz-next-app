// oz-next-app/src/features/engagement/dealership-applications/utils/dealership-geolocation.client.ts
"use client";

export type DealershipLocationFallbackReason =
  | "insecure-context"
  | "unsupported-browser"
  | "permission-denied"
  | "location-unavailable"
  | "timeout"
  | "invalid-position";

export type CapturedDealershipLocation = Readonly<{
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}>;

export class DealershipLocationCaptureError extends Error {
  readonly reason: DealershipLocationFallbackReason;

  constructor(reason: DealershipLocationFallbackReason) {
    super(reason);
    this.name = "DealershipLocationCaptureError";
    this.reason = reason;
  }
}

const QUICK_GEOLOCATION_TIMEOUT_MS = 6_000;
const PRECISE_GEOLOCATION_TIMEOUT_MS = 8_000;
const QUICK_GEOLOCATION_MAX_AGE_MS = 2 * 60_000;
const PRECISE_GEOLOCATION_MAX_AGE_MS = 0;
const MAX_GEOLOCATION_ACCURACY_METERS = 100_000;
const GEO_PERMISSION_DENIED = 1;
const GEO_POSITION_UNAVAILABLE = 2;
const GEO_TIMEOUT = 3;

function isGeolocationError(error: unknown): error is GeolocationPositionError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
  );
}

function geolocationFailureReason(
  error: GeolocationPositionError,
): DealershipLocationFallbackReason {
  switch (error.code) {
    case GEO_PERMISSION_DENIED:
      return "permission-denied";
    case GEO_POSITION_UNAVAILABLE:
      return "location-unavailable";
    case GEO_TIMEOUT:
      return "timeout";
    default:
      return "location-unavailable";
  }
}

async function readGeolocationPermissionState(): Promise<PermissionState | null> {
  if (!("permissions" in navigator)) {
    return null;
  }

  try {
    const permission = await navigator.permissions.query({
      name: "geolocation",
    });

    return permission.state;
  } catch {
    return null;
  }
}

function getCurrentPosition(
  options: PositionOptions,
): Promise<GeolocationPosition> {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function getBestAvailablePosition(): Promise<GeolocationPosition> {
  if (!window.isSecureContext) {
    throw new DealershipLocationCaptureError("insecure-context");
  }

  if (!("geolocation" in navigator)) {
    throw new DealershipLocationCaptureError("unsupported-browser");
  }

  const permissionState = await readGeolocationPermissionState();

  if (permissionState === "denied") {
    throw new DealershipLocationCaptureError("permission-denied");
  }

  try {
    return await getCurrentPosition({
      enableHighAccuracy: false,
      maximumAge: QUICK_GEOLOCATION_MAX_AGE_MS,
      timeout: QUICK_GEOLOCATION_TIMEOUT_MS,
    });
  } catch (error: unknown) {
    if (isGeolocationError(error) && error.code !== GEO_PERMISSION_DENIED) {
      try {
        return await getCurrentPosition({
          enableHighAccuracy: true,
          maximumAge: PRECISE_GEOLOCATION_MAX_AGE_MS,
          timeout: PRECISE_GEOLOCATION_TIMEOUT_MS,
        });
      } catch (fallbackError: unknown) {
        if (isGeolocationError(fallbackError)) {
          throw new DealershipLocationCaptureError(
            geolocationFailureReason(fallbackError),
          );
        }

        throw fallbackError;
      }
    }

    if (isGeolocationError(error)) {
      throw new DealershipLocationCaptureError(geolocationFailureReason(error));
    }

    throw error;
  }
}

function capturedLocationFromPosition(
  position: GeolocationPosition,
): CapturedDealershipLocation {
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
    throw new DealershipLocationCaptureError("invalid-position");
  }

  const accuracy =
    Number.isFinite(position.coords.accuracy) &&
    position.coords.accuracy >= 0 &&
    position.coords.accuracy <= MAX_GEOLOCATION_ACCURACY_METERS
      ? position.coords.accuracy
      : undefined;

  return {
    latitude,
    longitude,
    ...(accuracy === undefined ? {} : { accuracyMeters: accuracy }),
  };
}

export async function captureBestAvailableDealershipLocation(): Promise<CapturedDealershipLocation> {
  return capturedLocationFromPosition(await getBestAvailablePosition());
}

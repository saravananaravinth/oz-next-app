// oz-next-app/src/features/engagement/operations-dashboard/utils/google-maps-loader.client.ts
import { clientGoogleMapsPublicEnv } from "@/lib/env/client-public-env";

const GOOGLE_MAPS_SCRIPT_ID = "oz-google-maps-javascript-api";
const GOOGLE_MAPS_CALLBACK = "__ozGoogleMapsBootstrapReady";
const GOOGLE_MAPS_BASE_URL = "https://maps.googleapis.com/maps/api/js";
const GOOGLE_MAPS_LOAD_TIMEOUT_MS = 15_000;

export type GoogleMapsClientConfig = Readonly<{
  browserKey: string;
  mapId: string;
}>;

export type GoogleMapsClientConfigResult =
  | Readonly<{ status: "ready"; config: GoogleMapsClientConfig }>
  | Readonly<{ status: "unavailable" }>;

export type GoogleMapsLoaderFailureCode =
  | "AUTHENTICATION"
  | "REFERRER_RESTRICTION"
  | "BILLING_OR_API_DISABLED"
  | "INVALID_MAP_ID"
  | "TIMEOUT"
  | "NETWORK"
  | "CAPABILITY_UNAVAILABLE"
  | "UNKNOWN";

export class GoogleMapsLoaderError extends Error {
  constructor(
    readonly code: GoogleMapsLoaderFailureCode,
    cause?: unknown,
  ) {
    super(`Google Maps loader failed: ${code}`, { cause });
    this.name = "GoogleMapsLoaderError";
  }
}

export type GoogleMapsEventListener = Readonly<{
  remove: () => void;
}>;

export type GoogleLatLng = Readonly<{
  lat: () => number;
  lng: () => number;
}>;

export type GoogleLatLngBounds = Readonly<{
  getNorthEast: () => GoogleLatLng;
  getSouthWest: () => GoogleLatLng;
}>;

export type GoogleMap = Readonly<{
  fitBounds: (
    bounds: Readonly<{
      south: number;
      west: number;
      north: number;
      east: number;
    }>,
    padding?: number,
  ) => void;
  getBounds: () => GoogleLatLngBounds | undefined;
  getZoom: () => number | undefined;
  setCenter: (position: Readonly<{ lat: number; lng: number }>) => void;
  setZoom: (zoom: number) => void;
  addListener: (
    eventName: "idle" | "zoom_changed",
    listener: () => void,
  ) => GoogleMapsEventListener;
}>;

export type GoogleAdvancedMarker = Readonly<{
  addEventListener: (eventName: "gmp-click", listener: EventListener) => void;
  removeEventListener: (
    eventName: "gmp-click",
    listener: EventListener,
  ) => void;
}> & {
  map: GoogleMap | null;
};

export type GoogleMapsApi = Readonly<{
  Map: new (
    element: HTMLElement,
    options: Readonly<{
      center: Readonly<{ lat: number; lng: number }>;
      zoom: number;
      mapId: string;
      clickableIcons: boolean;
      mapTypeControl: boolean;
      streetViewControl: boolean;
      fullscreenControl: boolean;
      gestureHandling: "cooperative";
    }>,
  ) => GoogleMap;
  marker: Readonly<{
    AdvancedMarkerElement: new (
      options: Readonly<{
        map: GoogleMap;
        position: Readonly<{ lat: number; lng: number }>;
        title: string;
        content: Node;
        gmpClickable: boolean;
      }>,
    ) => GoogleAdvancedMarker;
  }>;
}>;

type GoogleMapsGlobal = Readonly<{
  maps?: Readonly<{
    Map?: GoogleMapsApi["Map"];
    marker?: GoogleMapsApi["marker"];
    importLibrary?: (name: "maps" | "marker") => Promise<unknown>;
  }>;
}>;

type GoogleMapsWindow = Window & {
  google?: GoogleMapsGlobal;
  __ozGoogleMapsBootstrapReady?: () => void;
  gm_authFailure?: () => void;
};

let loaderPromise: Promise<GoogleMapsApi> | null = null;

function getGoogleMapsWindow(): GoogleMapsWindow {
  return window;
}

export function readGoogleMapsClientConfig(): GoogleMapsClientConfigResult {
  const { browserKey, mapId } = clientGoogleMapsPublicEnv;
  if (browserKey === undefined || mapId === undefined) {
    return { status: "unavailable" };
  }

  return {
    status: "ready",
    config: {
      browserKey,
      mapId,
    },
  };
}

function readLoadedGoogleMapsApi(): GoogleMapsApi | null {
  const maps = getGoogleMapsWindow().google?.maps;
  if (
    maps?.Map === undefined ||
    maps.marker?.AdvancedMarkerElement === undefined
  ) {
    return null;
  }

  return {
    Map: maps.Map,
    marker: maps.marker,
  };
}

function googleMapsScriptUrl(config: GoogleMapsClientConfig): string {
  const url = new URL(GOOGLE_MAPS_BASE_URL);
  url.searchParams.set("key", config.browserKey);
  url.searchParams.set("loading", "async");
  url.searchParams.set("callback", GOOGLE_MAPS_CALLBACK);
  url.searchParams.set("v", "weekly");
  url.searchParams.set("auth_referrer_policy", "origin");
  url.searchParams.set("map_ids", config.mapId);
  return url.toString();
}

export function loadGoogleMaps(
  config: GoogleMapsClientConfig,
): Promise<GoogleMapsApi> {
  const loaded = readLoadedGoogleMapsApi();
  if (loaded !== null) return Promise.resolve(loaded);
  if (loaderPromise !== null) return loaderPromise;

  loaderPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const browserWindow = getGoogleMapsWindow();
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    let settled = false;
    const previousAuthFailure = browserWindow.gm_authFailure;
    const restoreAuthFailure = (): void => {
      if (previousAuthFailure === undefined)
        delete browserWindow.gm_authFailure;
      else browserWindow.gm_authFailure = previousAuthFailure;
    };
    const timeout = browserWindow.setTimeout((): void => {
      if (settled) return;
      settled = true;
      delete browserWindow.__ozGoogleMapsBootstrapReady;
      restoreAuthFailure();
      loaderPromise = null;
      reject(new GoogleMapsLoaderError("TIMEOUT"));
    }, GOOGLE_MAPS_LOAD_TIMEOUT_MS);
    const fail = (code: GoogleMapsLoaderFailureCode, cause?: unknown): void => {
      if (settled) return;
      settled = true;
      browserWindow.clearTimeout(timeout);
      delete browserWindow.__ozGoogleMapsBootstrapReady;
      restoreAuthFailure();
      loaderPromise = null;
      reject(new GoogleMapsLoaderError(code, cause));
    };
    const complete = (): void => {
      if (settled) return;
      const importLibrary = browserWindow.google?.maps?.importLibrary;
      if (importLibrary === undefined) {
        fail("CAPABILITY_UNAVAILABLE");
        return;
      }
      void Promise.all([importLibrary("maps"), importLibrary("marker")])
        .then(() => {
          const api = readLoadedGoogleMapsApi();
          if (api === null) {
            fail("CAPABILITY_UNAVAILABLE");
            return;
          }
          settled = true;
          browserWindow.clearTimeout(timeout);
          delete browserWindow.__ozGoogleMapsBootstrapReady;
          restoreAuthFailure();
          resolve(api);
        })
        .catch((error: unknown) => {
          fail(classifyGoogleMapsFailure(error), error);
        });
    };

    browserWindow.__ozGoogleMapsBootstrapReady = complete;
    browserWindow.gm_authFailure = (): void => {
      fail("AUTHENTICATION");
    };

    if (existing !== null) {
      existing.addEventListener(
        "error",
        (): void => {
          fail("NETWORK");
        },
        { once: true },
      );
      if (browserWindow.google?.maps?.importLibrary !== undefined) complete();
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = googleMapsScriptUrl(config);
    script.async = true;
    script.defer = true;
    script.referrerPolicy = "strict-origin-when-cross-origin";
    script.addEventListener(
      "error",
      (): void => {
        script.remove();
        fail("NETWORK");
      },
      { once: true },
    );
    document.head.append(script);
  });

  return loaderPromise;
}

function classifyGoogleMapsFailure(
  error: unknown,
): GoogleMapsLoaderFailureCode {
  const message =
    error instanceof Error ? error.message.toLocaleLowerCase("en-US") : "";
  if (message.includes("referer") || message.includes("referrer"))
    return "REFERRER_RESTRICTION";
  if (
    message.includes("billing") ||
    message.includes("api project") ||
    message.includes("disabled")
  )
    return "BILLING_OR_API_DISABLED";
  if (message.includes("map id") || message.includes("mapid"))
    return "INVALID_MAP_ID";
  if (message.includes("auth") || message.includes("api key"))
    return "AUTHENTICATION";
  if (message.includes("network") || message.includes("fetch"))
    return "NETWORK";
  return "UNKNOWN";
}

export function googleMapsFailureMessage(
  code: GoogleMapsLoaderFailureCode,
): string {
  switch (code) {
    case "AUTHENTICATION":
      return "Google Maps rejected the browser key. Verify that the key is valid and belongs to the Map ID project.";
    case "REFERRER_RESTRICTION":
      return "This origin is not permitted by the Google Maps browser key restrictions.";
    case "BILLING_OR_API_DISABLED":
      return "Enable billing and the Maps JavaScript API for the Google Cloud project.";
    case "INVALID_MAP_ID":
      return "The Map ID is invalid or is not a JavaScript vector map in the browser key project.";
    case "TIMEOUT":
      return "Google Maps did not respond in time. Check connectivity and try again.";
    case "NETWORK":
      return "Google Maps could not be reached from this browser.";
    case "CAPABILITY_UNAVAILABLE":
      return "The loaded Google Maps runtime does not provide the required maps and marker libraries.";
    default:
      return "Google Maps could not be initialized. Check the browser console and Cloud configuration.";
  }
}

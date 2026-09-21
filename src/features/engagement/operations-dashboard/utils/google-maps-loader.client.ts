// oz-next-app/src/features/engagement/operations-dashboard/utils/google-maps-loader.client.ts
import { clientGoogleMapsPublicEnv } from "@/lib/env/client-public-env";

const GOOGLE_MAPS_SCRIPT_ID = "oz-google-maps-javascript-api";
const GOOGLE_MAPS_CALLBACK = "__ozGoogleMapsReady";
const GOOGLE_MAPS_BASE_URL = "https://maps.googleapis.com/maps/api/js";
const GOOGLE_MAPS_LOAD_TIMEOUT_MS = 15_000;

export type GoogleMapsClientConfig = Readonly<{
  browserKey: string;
  mapId: string;
}>;

export type GoogleMapsClientConfigResult =
  | Readonly<{ status: "ready"; config: GoogleMapsClientConfig }>
  | Readonly<{ status: "unavailable" }>;

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
  }>;
}>;

type GoogleMapsWindow = Window & {
  google?: GoogleMapsGlobal;
  __ozGoogleMapsReady?: () => void;
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
  url.searchParams.set("libraries", "marker");
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
    const timeout = browserWindow.setTimeout((): void => {
      if (settled) return;
      settled = true;
      delete browserWindow.__ozGoogleMapsReady;
      loaderPromise = null;
      reject(new Error("google_maps_script_timeout"));
    }, GOOGLE_MAPS_LOAD_TIMEOUT_MS);
    const fail = (code: string): void => {
      if (settled) return;
      settled = true;
      browserWindow.clearTimeout(timeout);
      delete browserWindow.__ozGoogleMapsReady;
      loaderPromise = null;
      reject(new Error(code));
    };
    const complete = (): void => {
      if (settled) return;
      const api = readLoadedGoogleMapsApi();
      if (api === null) {
        fail("google_maps_api_unavailable");
        return;
      }
      settled = true;
      browserWindow.clearTimeout(timeout);
      delete browserWindow.__ozGoogleMapsReady;
      resolve(api);
    };

    browserWindow.__ozGoogleMapsReady = complete;

    if (existing !== null) {
      existing.addEventListener(
        "error",
        (): void => {
          fail("google_maps_script_failed");
        },
        { once: true },
      );
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
        fail("google_maps_script_failed");
      },
      { once: true },
    );
    document.head.append(script);
  });

  return loaderPromise;
}

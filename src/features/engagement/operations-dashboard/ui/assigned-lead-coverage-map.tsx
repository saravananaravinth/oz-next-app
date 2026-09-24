// oz-next-app/src/features/engagement/operations-dashboard/ui/assigned-lead-coverage-map.tsx
"use client";

import * as React from "react";
import { MapPinned, TriangleAlert } from "lucide-react";

import { ContentStatus } from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { readCoverageMap } from "@/features/engagement/operations-dashboard/api/coverage-map.client";
import type {
  CoverageMapResponse,
  CoverageMapViewport,
} from "@/features/engagement/operations-dashboard/contracts/coverage-map.schema";
import type { EngagementDashboardSearchParams } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import {
  clusterCoverageMapPoints,
  coverageMapCompatibility,
  coverageMapViewportEqual,
  normalizeCoverageMapViewport,
  type CoverageClusterPoint,
  type CoverageMarkerCluster,
} from "@/features/engagement/operations-dashboard/utils/coverage-map";
import {
  loadGoogleMaps,
  googleMapsFailureMessage,
  GoogleMapsLoaderError,
  readGoogleMapsClientConfig,
  type GoogleAdvancedMarker,
  type GoogleMap,
  type GoogleMapsApi,
  type GoogleMapsEventListener,
} from "@/features/engagement/operations-dashboard/utils/google-maps-loader.client";
import {
  formatDashboardInteger,
  formatDashboardPercentage,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import { isApiHttpError } from "@/lib/api/problem";
import { useDebounce } from "@/shared/hooks";

export type AssignedLeadCoverageMapProps = Readonly<{
  query: EngagementDashboardSearchParams;
  initialViewport: CoverageMapViewport;
  size?: "dashboard" | "coverage";
}>;

type MapDataState =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "ready"; data: CoverageMapResponse }>
  | Readonly<{ status: "failed" }>;

type MarkerBinding = Readonly<{
  marker: GoogleAdvancedMarker;
  listener: EventListener;
}>;

const MAX_INTERACTIVE_ZOOM = 18;
const VIEWPORT_DEBOUNCE_MS = 350;
const VIEWPORT_MAX_WAIT_MS = 1_000;

function demandPoints(
  data: CoverageMapResponse,
): readonly CoverageClusterPoint[] {
  return data.demandCells
    .filter((cell) => cell.assignedLeadCount > 0)
    .map((cell) => ({
      id: `demand:${cell.cellKey}`,
      latitude: cell.centerLatitude,
      longitude: cell.centerLongitude,
      weight: Math.max(cell.assignedLeadCount, 1),
      label: `${formatDashboardInteger(cell.assignedLeadCount)} assigned located leads`,
    }));
}

function dealerPoints(
  data: CoverageMapResponse,
): readonly CoverageClusterPoint[] {
  return data.dealers.map((dealer) => ({
    id: `dealer:${dealer.dealerOrgUnitId}`,
    latitude: dealer.latitude,
    longitude: dealer.longitude,
    weight: 1,
    label: `${dealer.name} (${dealer.code}) — ${dealer.routingState.replaceAll("_", " ").toLowerCase()}`,
  }));
}

function markerContent(
  kind: "demand" | "dealer",
  cluster: CoverageMarkerCluster,
): HTMLElement {
  const element = document.createElement("div");
  const isCluster = cluster.pointCount > 1;
  const value = kind === "demand" ? cluster.weight : cluster.pointCount;
  element.className =
    kind === "demand"
      ? "grid min-h-9 min-w-9 place-items-center rounded-full border-2 border-background bg-primary px-2 text-xs font-semibold text-primary-foreground shadow-lg"
      : "grid min-h-8 min-w-8 place-items-center rounded-xl border-2 border-background bg-card px-2 text-xs font-semibold text-foreground shadow-lg ring-1 ring-border";
  element.textContent = formatDashboardInteger(value);
  element.setAttribute("aria-hidden", "true");
  if (isCluster) element.dataset["cluster"] = "true";
  return element;
}

function clusterTitle(
  kind: "demand" | "dealer",
  cluster: CoverageMarkerCluster,
): string {
  if (cluster.pointCount === 1) {
    return cluster.points[0]?.label ?? "Coverage marker";
  }

  return kind === "demand"
    ? `${formatDashboardInteger(cluster.weight)} assigned located leads across ${formatDashboardInteger(cluster.pointCount)} privacy-grid cells`
    : `${formatDashboardInteger(cluster.pointCount)} configured dealers`;
}

function clearMarkers(bindings: readonly MarkerBinding[]): void {
  for (const binding of bindings) {
    binding.marker.removeEventListener("gmp-click", binding.listener);
    binding.marker.map = null;
  }
}

function renderClusterSet(
  api: GoogleMapsApi,
  map: GoogleMap,
  kind: "demand" | "dealer",
  points: readonly CoverageClusterPoint[],
  zoom: number,
): readonly MarkerBinding[] {
  const clusters = clusterCoverageMapPoints(points, zoom);

  return clusters.map((cluster) => {
    const marker = new api.marker.AdvancedMarkerElement({
      map,
      position: { lat: cluster.latitude, lng: cluster.longitude },
      title: clusterTitle(kind, cluster),
      content: markerContent(kind, cluster),
      gmpClickable: true,
    });
    const listener: EventListener = (): void => {
      map.setCenter({ lat: cluster.latitude, lng: cluster.longitude });
      const currentZoom = map.getZoom() ?? zoom;
      const increment = cluster.pointCount > 1 ? 2 : 1;
      map.setZoom(Math.min(currentZoom + increment, MAX_INTERACTIVE_ZOOM));
    };
    marker.addEventListener("gmp-click", listener);
    return { marker, listener };
  });
}

function viewportFromMap(map: GoogleMap): CoverageMapViewport | null {
  const bounds = map.getBounds();
  const zoom = map.getZoom();
  if (bounds === undefined || zoom === undefined) return null;

  const northEast = bounds.getNorthEast();
  const southWest = bounds.getSouthWest();
  return normalizeCoverageMapViewport({
    north: northEast.lat(),
    east: northEast.lng(),
    south: southWest.lat(),
    west: southWest.lng(),
    zoom,
  });
}

function LoadingBadges(): React.ReactElement {
  return (
    <>
      <Skeleton className="h-7 w-44 rounded-full" />
      <Skeleton className="h-7 w-52 rounded-full" />
      <Skeleton className="h-7 w-32 rounded-full" />
    </>
  );
}

export function AssignedLeadCoverageMap({
  query,
  initialViewport,
  size = "coverage",
}: AssignedLeadCoverageMapProps): React.ReactElement {
  const compatibility = coverageMapCompatibility(query);
  const configResult = React.useMemo(() => readGoogleMapsClientConfig(), []);
  const mapContainerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<GoogleMap | null>(null);
  const apiRef = React.useRef<GoogleMapsApi | null>(null);
  const markerBindingsRef = React.useRef<readonly MarkerBinding[]>([]);
  const activeRequestRef = React.useRef<AbortController | null>(null);
  const requestSequenceRef = React.useRef(0);
  const [viewport, setViewport] = React.useState(initialViewport);
  const debouncedViewport = useDebounce(viewport, VIEWPORT_DEBOUNCE_MS, {
    maxWait: VIEWPORT_MAX_WAIT_MS,
    equals: coverageMapViewportEqual,
  });
  const [dataState, setDataState] = React.useState<MapDataState>({
    status: "loading",
  });
  const [mapReady, setMapReady] = React.useState(false);
  const [mapRuntimeFailure, setMapRuntimeFailure] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    if (
      !compatibility.supported ||
      configResult.status !== "ready" ||
      mapContainerRef.current === null
    ) {
      return;
    }

    let disposed = false;
    let idleListener: GoogleMapsEventListener | null = null;
    const container = mapContainerRef.current;
    setMapRuntimeFailure(null);
    setMapReady(false);

    void loadGoogleMaps(configResult.config)
      .then((api) => {
        if (disposed) return;

        const map = new api.Map(container, {
          center: {
            lat: (initialViewport.north + initialViewport.south) / 2,
            lng: (initialViewport.east + initialViewport.west) / 2,
          },
          zoom: initialViewport.zoom,
          mapId: configResult.config.mapId,
          clickableIcons: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: "cooperative",
        });
        map.fitBounds(initialViewport, 28);
        mapRef.current = map;
        apiRef.current = api;
        idleListener = map.addListener("idle", () => {
          const nextViewport = viewportFromMap(map);
          if (nextViewport !== null) {
            setViewport((current) =>
              coverageMapViewportEqual(current, nextViewport)
                ? current
                : nextViewport,
            );
          }
        });
        setMapReady(true);
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setMapRuntimeFailure(
            error instanceof GoogleMapsLoaderError
              ? googleMapsFailureMessage(error.code)
              : googleMapsFailureMessage("UNKNOWN"),
          );
        }
      });

    return (): void => {
      disposed = true;
      idleListener?.remove();
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
      clearMarkers(markerBindingsRef.current);
      markerBindingsRef.current = [];
      mapRef.current = null;
      apiRef.current = null;
    };
  }, [compatibility.supported, configResult, initialViewport]);

  React.useEffect(() => {
    if (!compatibility.supported || configResult.status !== "ready") return;

    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const sequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = sequence;

    void readCoverageMap({
      query,
      viewport: debouncedViewport,
      signal: controller.signal,
    })
      .then((data) => {
        if (
          controller.signal.aborted ||
          requestSequenceRef.current !== sequence
        ) {
          return;
        }
        setDataState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (
          isApiHttpError(error) &&
          error.code === "request_timeout" &&
          requestSequenceRef.current !== sequence
        ) {
          return;
        }
        setDataState((current) =>
          current.status === "ready" ? current : { status: "failed" },
        );
      });

    return (): void => {
      controller.abort();
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
    };
  }, [compatibility.supported, configResult.status, debouncedViewport, query]);

  React.useEffect(() => {
    if (dataState.status !== "ready" || !mapReady) return;
    const map = mapRef.current;
    const api = apiRef.current;
    if (map === null || api === null) return;

    clearMarkers(markerBindingsRef.current);
    const zoom = map.getZoom() ?? dataState.data.viewport.zoom;
    markerBindingsRef.current = [
      ...renderClusterSet(
        api,
        map,
        "demand",
        demandPoints(dataState.data),
        zoom,
      ),
      ...renderClusterSet(
        api,
        map,
        "dealer",
        dealerPoints(dataState.data),
        zoom,
      ),
    ];

    return (): void => {
      clearMarkers(markerBindingsRef.current);
      markerBindingsRef.current = [];
    };
  }, [dataState, mapReady]);

  if (!compatibility.supported) {
    return (
      <ContentStatus
        variant="warning"
        title="Map unavailable for the active filter set"
        description={compatibility.reason}
        icon={<TriangleAlert aria-hidden="true" />}
      />
    );
  }

  if (configResult.status !== "ready") {
    return (
      <ContentStatus
        variant="warning"
        title="Google Maps is not configured"
        description="The operational coverage table remains available. Configure the public Maps browser key and Map ID to enable this visualization."
        icon={<MapPinned aria-hidden="true" />}
      />
    );
  }

  if (mapRuntimeFailure !== null) {
    return (
      <ContentStatus
        variant="warning"
        title="Google Maps configuration needs attention"
        description={`${mapRuntimeFailure} The ranked coverage list remains available.`}
        icon={<TriangleAlert aria-hidden="true" />}
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-border/70 bg-muted/15 shadow-inner ${size === "dashboard" ? "min-h-[22rem]" : "min-h-[36rem]"}`}
    >
      <div
        ref={mapContainerRef}
        role="region"
        aria-label="Assigned vehicle enquiry lead and dealer coverage map"
        className="absolute inset-0"
      />
      <div
        aria-live="polite"
        className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-card/92 p-3 shadow-sm supports-[backdrop-filter]:backdrop-blur-md"
      >
        {dataState.status === "loading" ? <LoadingBadges /> : null}
        {dataState.status === "failed" ? (
          <Badge variant="warning">Viewport data temporarily unavailable</Badge>
        ) : null}
        {dataState.status === "ready" ? (
          <>
            <Badge variant="outline">
              {formatDashboardInteger(
                dataState.data.cohort.assignedLocatedLeadCount,
              )}{" "}
              assigned leads in cohort
            </Badge>
            <Badge variant="outline">
              {formatDashboardInteger(
                dataState.data.represented.assignedLocatedLeadCount,
              )}{" "}
              represented in current viewport
            </Badge>
            <Badge variant="outline">
              {formatDashboardInteger(dataState.data.represented.dealerCount)}{" "}
              mapped dealers
            </Badge>
            <Badge variant="outline">
              {formatDashboardPercentage(
                dataState.data.cohort.unassignedRatePct,
              )}{" "}
              unassigned cohort demand
            </Badge>
            <Badge variant="secondary">Privacy-grid demand</Badge>
            {dataState.data.limits.demandCellsTruncated ||
            dataState.data.limits.dealersTruncated ? (
              <Badge variant="warning">Zoom in for full viewport detail</Badge>
            ) : null}
          </>
        ) : null}
      </div>
      {dataState.status === "ready" &&
      dataState.data.represented.assignedLocatedLeadCount === 0 &&
      dataState.data.represented.dealerCount === 0 ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-2xl border border-border/70 bg-card/92 p-3 text-caption text-muted-readable shadow-sm supports-[backdrop-filter]:backdrop-blur-md">
          No assigned privacy-grid demand or configured dealer coordinates are
          represented in this viewport. Pan or zoom the map, or use the coverage
          table below.
        </div>
      ) : null}
      <p className="sr-only">
        Customer demand coordinates are privacy-grid centers, not exact customer
        locations. Dealer markers use configured dealer coordinates. Viewport
        requests are debounced and replace only the current map projection. The
        table following this map remains the accessible operational
        representation.
      </p>
    </div>
  );
}

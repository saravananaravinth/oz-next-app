// oz-next-app/src/features/engagement/operations-dashboard/utils/coverage-map.ts
import type {
  CoverageMapFilters,
  CoverageMapViewport,
} from "@/features/engagement/operations-dashboard/contracts/coverage-map.schema";
import type {
  EngagementCoverageResult,
  EngagementDashboardSearchParams,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";

const WEB_MERCATOR_MAX_LATITUDE = 85.051_128_78;
const MAP_VIEWPORT_MAX_LATITUDE = 85;
const WORLD_TILE_SIZE_PX = 256;
const DEFAULT_CLUSTER_GRID_PX = 72;
const VIEWPORT_PRECISION = 6;

export const DEFAULT_COVERAGE_MAP_VIEWPORT: CoverageMapViewport = {
  south: 6,
  west: 68,
  north: 37.5,
  east: 97.5,
  zoom: 4,
};

export type CoverageMapCompatibility =
  | Readonly<{ supported: true }>
  | Readonly<{ supported: false; reason: string }>;

export type CoverageClusterPoint = Readonly<{
  id: string;
  latitude: number;
  longitude: number;
  weight: number;
  label: string;
}>;

export type CoverageMarkerCluster = Readonly<{
  id: string;
  latitude: number;
  longitude: number;
  pointCount: number;
  weight: number;
  points: readonly CoverageClusterPoint[];
}>;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function chooseInitialZoom(
  latitudeSpan: number,
  longitudeSpan: number,
): number {
  const span = Math.max(latitudeSpan, longitudeSpan);
  if (span >= 24) return 4;
  if (span >= 12) return 5;
  if (span >= 6) return 6;
  if (span >= 3) return 7;
  if (span >= 1.5) return 8;
  if (span >= 0.75) return 9;
  return 10;
}

export function deriveInitialCoverageMapViewport(
  items: EngagementCoverageResult["items"],
): CoverageMapViewport {
  const located = items.filter(
    (item) => item.centroidLatitude !== null && item.centroidLongitude !== null,
  );

  if (located.length === 0) {
    return DEFAULT_COVERAGE_MAP_VIEWPORT;
  }

  const latitudes = located.map((item) => item.centroidLatitude ?? 0);
  const longitudes = located.map((item) => item.centroidLongitude ?? 0);
  const minimumLatitude = Math.min(...latitudes);
  const maximumLatitude = Math.max(...latitudes);
  const minimumLongitude = Math.min(...longitudes);
  const maximumLongitude = Math.max(...longitudes);
  const rawLatitudeSpan = maximumLatitude - minimumLatitude;
  const rawLongitudeSpan = maximumLongitude - minimumLongitude;
  const latitudePadding = Math.max(rawLatitudeSpan * 0.15, 0.75);
  const longitudePadding = Math.max(rawLongitudeSpan * 0.15, 0.75);
  const south = clamp(
    minimumLatitude - latitudePadding,
    -MAP_VIEWPORT_MAX_LATITUDE,
    MAP_VIEWPORT_MAX_LATITUDE,
  );
  const north = clamp(
    maximumLatitude + latitudePadding,
    -MAP_VIEWPORT_MAX_LATITUDE,
    MAP_VIEWPORT_MAX_LATITUDE,
  );
  const west = clamp(minimumLongitude - longitudePadding, -180, 180);
  const east = clamp(maximumLongitude + longitudePadding, -180, 180);

  if (south >= north || west >= east) {
    return DEFAULT_COVERAGE_MAP_VIEWPORT;
  }

  return {
    south,
    west,
    north,
    east,
    zoom: chooseInitialZoom(north - south, east - west),
  };
}

export function coverageMapCompatibility(
  query: EngagementDashboardSearchParams,
): CoverageMapCompatibility {
  if (query.q !== undefined && query.q.trim().length > 0) {
    return {
      supported: false,
      reason:
        "The map projection does not yet support free-text filtering. The coverage table below remains authoritative for this filtered view.",
    };
  }

  if (query.followUpStates.length > 0) {
    return {
      supported: false,
      reason:
        "The map projection does not yet support follow-up-state filtering. The coverage table below remains authoritative for this filtered view.",
    };
  }

  if (query.ivrFlowCodes.some((flowCode) => flowCode !== "VEHICLE_ENQUIRIES")) {
    return {
      supported: false,
      reason:
        "The current geospatial contract supports the Vehicle Enquiries journey only. The coverage table below remains authoritative for the selected IVR flow.",
    };
  }

  return { supported: true };
}

export function toCoverageMapFilters(
  query: EngagementDashboardSearchParams,
): CoverageMapFilters {
  return {
    from: query.from,
    to: query.to,
    leadSourceIds: query.leadSourceIds,
    ivrFlowCodes: query.ivrFlowCodes.length === 0 ? [] : ["VEHICLE_ENQUIRIES"],
    statuses: query.statuses,
    dealerOrgUnitIds: query.dealerOrgUnitIds,
    districts: query.districts,
    cities: query.cities,
    assignmentStates: query.assignmentStates,
    conversionStates: query.conversionStates,
  };
}

function sorted(values: readonly string[]): readonly string[] {
  return [...values].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

export function serializeCoverageMapFilters(
  filters: CoverageMapFilters,
): string {
  return JSON.stringify({
    from: filters.from,
    to: filters.to,
    timezone: "Asia/Kolkata",
    leadSourceIds: sorted(filters.leadSourceIds),
    ivrFlowCodes:
      filters.ivrFlowCodes.length === 0
        ? ["VEHICLE_ENQUIRIES"]
        : sorted(filters.ivrFlowCodes),
    leadTypes: ["VEHICLE_SALES"],
    statuses: sorted(filters.statuses),
    dealerOrgUnitIds: sorted(filters.dealerOrgUnitIds),
    districts: sorted(filters.districts),
    cities: sorted(filters.cities),
    assignmentStates: sorted(filters.assignmentStates),
    conversionStates: sorted(filters.conversionStates),
  });
}

function roundViewportCoordinate(value: number): number {
  const scale = 10 ** VIEWPORT_PRECISION;
  return Math.round(value * scale) / scale;
}

export function normalizeCoverageMapViewport(
  input: Readonly<{
    south: number;
    west: number;
    north: number;
    east: number;
    zoom: number;
  }>,
): CoverageMapViewport | null {
  const south = roundViewportCoordinate(
    clamp(input.south, -MAP_VIEWPORT_MAX_LATITUDE, MAP_VIEWPORT_MAX_LATITUDE),
  );
  const north = roundViewportCoordinate(
    clamp(input.north, -MAP_VIEWPORT_MAX_LATITUDE, MAP_VIEWPORT_MAX_LATITUDE),
  );
  const west = roundViewportCoordinate(clamp(input.west, -180, 180));
  const east = roundViewportCoordinate(clamp(input.east, -180, 180));
  const zoom = Math.min(Math.max(Math.round(input.zoom), 3), 20);

  if (south >= north || west >= east) return null;

  return { south, west, north, east, zoom };
}

export function coverageMapViewportEqual(
  left: CoverageMapViewport,
  right: CoverageMapViewport,
): boolean {
  return (
    left.south === right.south &&
    left.west === right.west &&
    left.north === right.north &&
    left.east === right.east &&
    left.zoom === right.zoom
  );
}

function projectToWorldPixels(
  latitude: number,
  longitude: number,
  zoom: number,
): Readonly<{ x: number; y: number }> {
  const clampedLatitude = clamp(
    latitude,
    -WEB_MERCATOR_MAX_LATITUDE,
    WEB_MERCATOR_MAX_LATITUDE,
  );
  const latitudeRadians = (clampedLatitude * Math.PI) / 180;
  const sinLatitude = Math.sin(latitudeRadians);
  const scale = WORLD_TILE_SIZE_PX * 2 ** zoom;
  const x = ((longitude + 180) / 360) * scale;
  const y =
    (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) *
    scale;

  return { x, y };
}

export function clusterCoverageMapPoints(
  points: readonly CoverageClusterPoint[],
  zoom: number,
  gridSizePx: number = DEFAULT_CLUSTER_GRID_PX,
): readonly CoverageMarkerCluster[] {
  if (points.length === 0) return [];

  const safeZoom = Math.min(Math.max(Math.floor(zoom), 3), 20);
  const safeGridSize = Math.min(Math.max(Math.floor(gridSizePx), 32), 192);
  const buckets = new Map<string, CoverageClusterPoint[]>();

  for (const point of points) {
    const world = projectToWorldPixels(
      point.latitude,
      point.longitude,
      safeZoom,
    );
    const bucketKey = `${String(Math.floor(world.x / safeGridSize))}:${String(Math.floor(world.y / safeGridSize))}`;
    const bucket = buckets.get(bucketKey);
    if (bucket === undefined) {
      buckets.set(bucketKey, [point]);
    } else {
      bucket.push(point);
    }
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([bucketKey, bucketPoints]) => {
      const weight = bucketPoints.reduce(
        (total, point) => total + Math.max(point.weight, 1),
        0,
      );
      const latitude =
        bucketPoints.reduce(
          (total, point) => total + point.latitude * Math.max(point.weight, 1),
          0,
        ) / weight;
      const longitude =
        bucketPoints.reduce(
          (total, point) => total + point.longitude * Math.max(point.weight, 1),
          0,
        ) / weight;

      return {
        id: bucketKey,
        latitude,
        longitude,
        pointCount: bucketPoints.length,
        weight,
        points: bucketPoints,
      };
    });
}

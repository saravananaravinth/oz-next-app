// oz-next-app/src/features/engagement/operations-dashboard/api/coverage-map.client.ts
import {
  coverageMapResponseSchema,
  type CoverageMapResponse,
  type CoverageMapViewport,
} from "@/features/engagement/operations-dashboard/contracts/coverage-map.schema";
import type { EngagementDashboardSearchParams } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import {
  coverageMapViewportEqual,
  serializeCoverageMapFilters,
  toCoverageMapFilters,
} from "@/features/engagement/operations-dashboard/utils/coverage-map";
import { sameOriginFetch } from "@/lib/api/same-origin-client";
import { ApiHttpError } from "@/lib/api/problem";
import { HTTP_STATUS } from "@/lib/api/http-contract";

const COVERAGE_MAP_ENDPOINT = "/api/engagement/coverage/map";

function appendMany(
  search: URLSearchParams,
  key: string,
  values: readonly string[],
): void {
  for (const value of [...new Set(values)].sort((left, right) =>
    left.localeCompare(right),
  )) {
    search.append(key, value);
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function buildCoverageMapPath(
  query: EngagementDashboardSearchParams,
  viewport: CoverageMapViewport,
): Promise<Readonly<{ path: string; filterFingerprint: string }>> {
  const filters = toCoverageMapFilters(query);
  const filterFingerprint = await sha256Hex(
    serializeCoverageMapFilters(filters),
  );
  const search = new URLSearchParams({
    north: String(viewport.north),
    south: String(viewport.south),
    east: String(viewport.east),
    west: String(viewport.west),
    zoom: String(viewport.zoom),
    from: query.from,
    to: query.to,
    filterFingerprint,
  });

  appendMany(search, "leadSourceId", query.leadSourceIds);
  appendMany(search, "ivrFlowCode", query.ivrFlowCodes);
  appendMany(search, "status", query.statuses);
  appendMany(search, "dealerOrgUnitId", query.dealerOrgUnitIds);
  appendMany(search, "district", query.districts);
  appendMany(search, "city", query.cities);
  appendMany(search, "assignmentState", query.assignmentStates);
  appendMany(search, "conversionState", query.conversionStates);

  return {
    path: `${COVERAGE_MAP_ENDPOINT}?${search.toString()}`,
    filterFingerprint,
  };
}

export async function readCoverageMap(
  input: Readonly<{
    query: EngagementDashboardSearchParams;
    viewport: CoverageMapViewport;
    signal?: AbortSignal;
  }>,
): Promise<CoverageMapResponse> {
  const request = await buildCoverageMapPath(input.query, input.viewport);
  const response = await sameOriginFetch(request.path, {
    schema: coverageMapResponseSchema,
    ...(input.signal === undefined ? {} : { signal: input.signal }),
  });

  if (
    response.filterFingerprint !== request.filterFingerprint ||
    !coverageMapViewportEqual(response.viewport, input.viewport)
  ) {
    throw new ApiHttpError({
      message: "Coverage map response does not match the active map snapshot.",
      status: HTTP_STATUS.CONFLICT,
      code: "coverage_map_snapshot_mismatch",
    });
  }

  return response;
}

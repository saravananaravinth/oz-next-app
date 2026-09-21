// oz-next-app/src/app/api/engagement/coverage/map/route.ts
import "server-only";

import type { NextRequest } from "next/server";

import { getAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  coverageMapResponseSchema,
  coverageMapRouteRequestSchema,
} from "@/features/engagement/operations-dashboard/contracts/coverage-map.schema";
import { resolveEngagementDashboardAccess } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { readEngagementCoverageViewport } from "@/features/engagement/operations-dashboard/server/engagement-dashboard.server";
import { CT, HTTP_STATUS } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const NO_STORE = "private, no-store, no-cache, must-revalidate";
const ALLOWED_QUERY_KEYS = new Set([
  "north",
  "south",
  "east",
  "west",
  "zoom",
  "from",
  "to",
  "leadSourceId",
  "ivrFlowCode",
  "status",
  "dealerOrgUnitId",
  "district",
  "city",
  "assignmentState",
  "conversionState",
]);

function readSingleValue(
  request: NextRequest,
  key: string,
): string | undefined {
  const values = request.nextUrl.searchParams.getAll(key);
  if (values.length === 0) return undefined;
  if (values.length !== 1) return "__duplicate__";
  return values[0] ?? undefined;
}

function readNumberValue(request: NextRequest, key: string): number {
  const raw = readSingleValue(request, key);
  return raw === undefined ? Number.NaN : Number(raw);
}

function readManyValues(request: NextRequest, key: string): readonly string[] {
  return request.nextUrl.searchParams
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function problemResponse(
  status: number,
  code: string,
  title: string,
  detail: string,
  retryAfterSeconds?: number,
): Response {
  const headers = new Headers({
    "Cache-Control": NO_STORE,
    "Content-Type": CT.PROBLEM_JSON,
    "X-Content-Type-Options": "nosniff",
  });
  if (retryAfterSeconds !== undefined) {
    headers.set("Retry-After", String(retryAfterSeconds));
  }

  return Response.json(
    {
      type: "about:blank",
      title,
      status,
      detail,
      code,
      request_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    },
    { status, headers },
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  for (const key of request.nextUrl.searchParams.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      return problemResponse(
        HTTP_STATUS.BAD_REQUEST,
        "ENGAGEMENT_COVERAGE_MAP_VALIDATION_FAILED",
        "Coverage map request invalid",
        "The map request contains unsupported parameters.",
      );
    }
  }

  const parsedRequest = coverageMapRouteRequestSchema.safeParse({
    viewport: {
      north: readNumberValue(request, "north"),
      south: readNumberValue(request, "south"),
      east: readNumberValue(request, "east"),
      west: readNumberValue(request, "west"),
      zoom: readNumberValue(request, "zoom"),
    },
    filters: {
      from: readSingleValue(request, "from"),
      to: readSingleValue(request, "to"),
      leadSourceIds: readManyValues(request, "leadSourceId"),
      ivrFlowCodes: readManyValues(request, "ivrFlowCode"),
      statuses: readManyValues(request, "status"),
      dealerOrgUnitIds: readManyValues(request, "dealerOrgUnitId"),
      districts: readManyValues(request, "district"),
      cities: readManyValues(request, "city"),
      assignmentStates: readManyValues(request, "assignmentState"),
      conversionStates: readManyValues(request, "conversionState"),
    },
  });

  if (!parsedRequest.success) {
    return problemResponse(
      HTTP_STATUS.BAD_REQUEST,
      "ENGAGEMENT_COVERAGE_MAP_VALIDATION_FAILED",
      "Coverage map request invalid",
      "Provide a valid bounded viewport and supported engagement filters.",
    );
  }

  try {
    const me = await getAuthenticatedMe();
    if (me === null) {
      return problemResponse(
        HTTP_STATUS.UNAUTHORIZED,
        "ENGAGEMENT_COVERAGE_MAP_AUTHENTICATION_REQUIRED",
        "Authentication required",
        "Your ERP session is no longer available for protected coverage mapping.",
      );
    }

    const access = resolveEngagementDashboardAccess(me);
    if (
      access.kind !== "resolved" ||
      !access.capabilities.canReadDealerPerformance
    ) {
      return problemResponse(
        HTTP_STATUS.FORBIDDEN,
        "ENGAGEMENT_COVERAGE_MAP_FORBIDDEN",
        "Coverage map forbidden",
        access.kind === "resolved"
          ? "Your current ERP permissions do not allow dealer coverage analysis."
          : access.kind === "forbidden"
            ? access.reason
            : "Select an authorized tenant context before loading the coverage map.",
      );
    }

    const source = await readEngagementCoverageViewport({
      access,
      filters: parsedRequest.data.filters,
      viewport: parsedRequest.data.viewport,
    });
    const response = coverageMapResponseSchema.safeParse(source);

    if (!response.success) {
      return problemResponse(
        HTTP_STATUS.BAD_GATEWAY,
        "ENGAGEMENT_COVERAGE_MAP_RESPONSE_INVALID",
        "Coverage map unavailable",
        "The protected coverage projection returned an invalid response.",
      );
    }

    return Response.json(response.data, {
      status: HTTP_STATUS.OK,
      headers: {
        "Cache-Control": NO_STORE,
        "Content-Type": CT.JSON,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    if (isApiHttpError(error)) {
      const status =
        error.status === HTTP_STATUS.UNAUTHORIZED ||
        error.status === HTTP_STATUS.FORBIDDEN ||
        error.status === HTTP_STATUS.UNPROCESSABLE_ENTITY ||
        error.status === HTTP_STATUS.TOO_MANY_REQUESTS
          ? error.status
          : HTTP_STATUS.BAD_GATEWAY;
      return problemResponse(
        status,
        "ENGAGEMENT_COVERAGE_MAP_UPSTREAM_FAILED",
        status === HTTP_STATUS.TOO_MANY_REQUESTS
          ? "Coverage map rate limited"
          : "Coverage map unavailable",
        status === HTTP_STATUS.TOO_MANY_REQUESTS
          ? "The protected coverage endpoint is rate limited. Retry shortly."
          : "The protected coverage projection could not be completed safely.",
        status === HTTP_STATUS.TOO_MANY_REQUESTS
          ? error.retryAfterSeconds
          : undefined,
      );
    }

    return problemResponse(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "ENGAGEMENT_COVERAGE_MAP_FAILED",
      "Coverage map unavailable",
      "The server could not complete the protected coverage map request.",
    );
  }
}

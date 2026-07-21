// oz-next-app/src/app/api/inventory/vehicles/export/route.ts
import "server-only";

import type { NextRequest } from "next/server";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  parseVehicleInventorySearchParams,
  readVehicleInventoryExportResponse,
  resolveVehicleInventoryAccess,
  type VehicleInventoryRawSearchParams,
} from "@/features/inventory/vehicles";
import { CT, HTTP_STATUS } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const SAFE_CONTENT_DISPOSITION_PATTERN =
  /^attachment; filename="[A-Za-z0-9._-]{1,160}"$/u;
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/u;
const SAFE_INTEGER_PATTERN = /^\d{1,10}$/u;
const NO_STORE = "private, no-store, no-cache, must-revalidate";

function rawSearchParams(
  request: NextRequest,
): VehicleInventoryRawSearchParams {
  const raw: Record<string, string | readonly string[]> = {};

  for (const key of new Set(request.nextUrl.searchParams.keys())) {
    const values = request.nextUrl.searchParams.getAll(key);
    raw[key] = values.length === 1 ? (values[0] ?? "") : values;
  }

  return raw;
}

function problemResponse(
  input: Readonly<{
    status: number;
    code: string;
    title: string;
    detail: string;
    requestId?: string;
    invalidParams?: ReadonlyArray<
      Readonly<{
        path: string;
        message: string;
      }>
    >;
  }>,
): Response {
  const requestId =
    input.requestId !== undefined &&
    SAFE_REFERENCE_PATTERN.test(input.requestId)
      ? input.requestId
      : crypto.randomUUID();

  return Response.json(
    {
      type: "about:blank",
      title: input.title,
      status: input.status,
      detail: input.detail,
      code: input.code,
      request_id: requestId,
      timestamp: new Date().toISOString(),
      ...(input.invalidParams === undefined
        ? {}
        : { invalid_params: input.invalidParams }),
    },
    {
      status: input.status,
      headers: {
        "Cache-Control": NO_STORE,
        "Content-Type": CT.PROBLEM_JSON,
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function safeHeader(
  response: Response,
  name: string,
  pattern: RegExp,
): string | null {
  const value = response.headers.get(name)?.trim() ?? "";

  return pattern.test(value) ? value : null;
}

export async function GET(request: NextRequest): Promise<Response> {
  const me = await requireAuthenticatedMe();
  const parsedQuery = parseVehicleInventorySearchParams(
    rawSearchParams(request),
  );

  if (!parsedQuery.success) {
    return problemResponse({
      status: HTTP_STATUS.BAD_REQUEST,
      code: "INVENTORY_VALIDATION_FAILED",
      title: "Inventory export request invalid",
      detail:
        "The CSV export query contains invalid or unsupported parameters.",
      invalidParams: parsedQuery.error.issues.slice(0, 16).map((issue) => ({
        path: issue.path.length === 0 ? "$" : issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const access = resolveVehicleInventoryAccess(me, parsedQuery.data);

  if (access.kind !== "dealer" && access.kind !== "contextual") {
    return problemResponse({
      status: HTTP_STATUS.FORBIDDEN,
      code: "INVENTORY_FORBIDDEN",
      title: "Inventory export forbidden",
      detail:
        access.kind === "forbidden"
          ? access.reason
          : "An explicit authorized tenant and dealer context is required.",
    });
  }

  if (!access.capabilities.canExport) {
    return problemResponse({
      status: HTTP_STATUS.FORBIDDEN,
      code: "INVENTORY_EXPORT_FORBIDDEN",
      title: "Inventory export forbidden",
      detail: "Missing permission: report:export.",
    });
  }

  try {
    const upstream = await readVehicleInventoryExportResponse({
      query: parsedQuery.data,
      access,
    });
    const contentType =
      upstream.headers.get("content-type")?.toLowerCase() ?? "";

    if (!contentType.startsWith("text/csv") || upstream.body === null) {
      return problemResponse({
        status: HTTP_STATUS.BAD_GATEWAY,
        code: "INVENTORY_EXPORT_CONTRACT_INVALID",
        title: "Inventory export unavailable",
        detail: "The private ERP API returned an invalid CSV export contract.",
      });
    }

    const contentDisposition = safeHeader(
      upstream,
      "content-disposition",
      SAFE_CONTENT_DISPOSITION_PATTERN,
    );
    const asOf = safeHeader(
      upstream,
      "x-inventory-as-of",
      /^\d{4}-\d{2}-\d{2}T[0-9:.+-]+Z?$/u,
    );
    const rowCount = safeHeader(
      upstream,
      "x-inventory-row-count",
      SAFE_INTEGER_PATTERN,
    );
    const requestId = safeHeader(
      upstream,
      "x-request-id",
      SAFE_REFERENCE_PATTERN,
    );
    const headers = new Headers({
      "Cache-Control": NO_STORE,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        contentDisposition ?? 'attachment; filename="vehicle-inventory.csv"',
      "X-Content-Type-Options": "nosniff",
    });

    if (asOf !== null) {
      headers.set("X-Inventory-As-Of", asOf);
    }

    if (rowCount !== null) {
      headers.set("X-Inventory-Row-Count", rowCount);
    }

    if (requestId !== null) {
      headers.set("X-Request-ID", requestId);
    }

    return new Response(upstream.body, {
      status: HTTP_STATUS.OK,
      headers,
    });
  } catch (error: unknown) {
    if (isApiHttpError(error)) {
      return problemResponse({
        status: error.status,
        code: error.code,
        title:
          error.status === HTTP_STATUS.UNPROCESSABLE_ENTITY
            ? "Inventory export too large"
            : error.status === HTTP_STATUS.TOO_MANY_REQUESTS
              ? "Inventory export rate limited"
              : "Inventory export failed",
        detail:
          error.status === HTTP_STATUS.UNPROCESSABLE_ENTITY
            ? "Narrow the inventory filters and retry the CSV export."
            : error.status === HTTP_STATUS.TOO_MANY_REQUESTS
              ? "The protected export rate limit was reached. Retry later."
              : "The edge gateway or private ERP API could not stream the export safely.",
        ...(error.requestId === undefined
          ? {}
          : { requestId: error.requestId }),
      });
    }

    return problemResponse({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: "INVENTORY_EXPORT_FAILED",
      title: "Inventory export failed",
      detail: "The server could not complete the protected CSV export.",
    });
  }
}

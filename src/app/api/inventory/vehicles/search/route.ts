// oz-next-app/src/app/api/inventory/vehicles/search/route.ts
import "server-only";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { getAuthenticatedMe } from "@/features/auth/server/require-auth";
import { vehicleInventorySearchParamsSchema } from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
import { resolveVehicleInventoryAccess } from "@/features/inventory/vehicles/policies/vehicle-inventory.policy";
import { searchVehicleInventory } from "@/features/inventory/vehicles/server/vehicle-inventory.server";
import { vehicleInventoryPageHref } from "@/features/inventory/vehicles/utils/vehicle-inventory-url";
import { CT, HTTP_STATUS } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const NO_STORE = "private, no-store, no-cache, must-revalidate";
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/u;
const MAX_RESULTS = 8;
const ALLOWED_QUERY_KEYS = new Set([
  "q",
  "tenantId",
  "dealerOrgUnitId",
  "includeMyStock",
  "includeSubDealerStock",
]);

const booleanQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  return value;
}, z.boolean().optional());

const liveSearchQuerySchema = z
  .object({
    q: z.string().trim().min(3).max(100),
    tenantId: z.uuid().optional(),
    dealerOrgUnitId: z.uuid().optional(),
    includeMyStock: booleanQuerySchema.default(true),
    includeSubDealerStock: booleanQuerySchema.default(false),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.includeMyStock && !value.includeSubDealerStock) {
      context.addIssue({
        code: "custom",
        path: ["includeMyStock"],
        message: "Select my stock, sub-dealer stock, or both.",
      });
    }
  });

function readSingleQueryValue(
  request: NextRequest,
  key: string,
): string | undefined {
  const values = request.nextUrl.searchParams.getAll(key);

  if (values.length === 0) {
    return undefined;
  }

  if (values.length !== 1) {
    return "__duplicate__";
  }

  return values[0] ?? undefined;
}

function rawQuery(request: NextRequest): Readonly<Record<string, unknown>> {
  return {
    q: readSingleQueryValue(request, "q"),
    tenantId: readSingleQueryValue(request, "tenantId"),
    dealerOrgUnitId: readSingleQueryValue(request, "dealerOrgUnitId"),
    includeMyStock: readSingleQueryValue(request, "includeMyStock"),
    includeSubDealerStock: readSingleQueryValue(
      request,
      "includeSubDealerStock",
    ),
  };
}

function hasUnsupportedQueryKey(request: NextRequest): boolean {
  for (const key of request.nextUrl.searchParams.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      return true;
    }
  }

  return false;
}

function problemResponse(
  input: Readonly<{
    status: number;
    code: string;
    title: string;
    detail: string;
    requestId?: string;
    retryAfterSeconds?: number;
    invalidParams?: ReadonlyArray<Readonly<{ path: string; message: string }>>;
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
      ...(input.retryAfterSeconds === undefined
        ? {}
        : { retry_after: input.retryAfterSeconds }),
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
        ...(input.retryAfterSeconds === undefined
          ? {}
          : { "Retry-After": String(input.retryAfterSeconds) }),
      },
    },
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  if (hasUnsupportedQueryKey(request)) {
    return problemResponse({
      status: HTTP_STATUS.BAD_REQUEST,
      code: "INVENTORY_LIVE_SEARCH_VALIDATION_FAILED",
      title: "Inventory search request invalid",
      detail: "The live-search query contains unsupported parameters.",
    });
  }

  const parsed = liveSearchQuerySchema.safeParse(rawQuery(request));

  if (!parsed.success) {
    return problemResponse({
      status: HTTP_STATUS.BAD_REQUEST,
      code: "INVENTORY_LIVE_SEARCH_VALIDATION_FAILED",
      title: "Inventory search request invalid",
      detail: "Enter at least three valid search characters and retry.",
      invalidParams: parsed.error.issues.slice(0, 16).map((issue) => ({
        path: issue.path.length === 0 ? "$" : issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const baseQuery = vehicleInventorySearchParamsSchema.parse({
    tenantId: parsed.data.tenantId,
    dealerOrgUnitId: parsed.data.dealerOrgUnitId,
    includeMyStock: parsed.data.includeMyStock,
    includeSubDealerStock: parsed.data.includeSubDealerStock,
  });
  try {
    const me = await getAuthenticatedMe();

    if (me === null) {
      return problemResponse({
        status: HTTP_STATUS.UNAUTHORIZED,
        code: "INVENTORY_AUTHENTICATION_REQUIRED",
        title: "Authentication required",
        detail:
          "Your ERP session is no longer available for protected inventory search.",
      });
    }

    const access = resolveVehicleInventoryAccess(me, baseQuery);

    if (access.kind === "forbidden") {
      return problemResponse({
        status: HTTP_STATUS.FORBIDDEN,
        code: "INVENTORY_FORBIDDEN",
        title: "Inventory search forbidden",
        detail: access.reason,
      });
    }

    const result = await searchVehicleInventory({
      access,
      query: parsed.data.q,
      includeMyStock: parsed.data.includeMyStock,
      includeSubDealerStock: parsed.data.includeSubDealerStock,
      limit: MAX_RESULTS,
    });

    return Response.json(
      {
        asOf: result.asOf,
        truncated: result.truncated,
        items: result.items.map((item) => ({
          id: item.entryKey,
          unitId: item.unitId,
          href: vehicleInventoryPageHref(baseQuery, {
            q: parsed.data.q,
            unitId: item.unitId,
            entryKey: item.entryKey,
            cursor: undefined,
          }),
          category: "vehicle" as const,
          vin: item.vin,
          modelName: item.modelName,
          variantName: item.variantName,
          colorName: item.colorName,
          storeName: item.storeName,
          dealerName: item.orgUnitName,
          inventoryStatus: item.inventoryStatus,
          matchedComponentSerials: item.matchedComponentSerials.slice(0, 5),
        })),
      },
      {
        status: HTTP_STATUS.OK,
        headers: {
          "Cache-Control": NO_STORE,
          "Content-Type": CT.JSON,
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error: unknown) {
    if (isApiHttpError(error)) {
      return problemResponse({
        status: error.status,
        code: error.code,
        title:
          error.status === HTTP_STATUS.FORBIDDEN
            ? "Inventory search access denied"
            : error.status === HTTP_STATUS.TOO_MANY_REQUESTS
              ? "Inventory search rate limited"
              : "Inventory search unavailable",
        detail:
          error.status === HTTP_STATUS.FORBIDDEN
            ? "The authenticated actor cannot search this inventory scope."
            : error.status === HTTP_STATUS.TOO_MANY_REQUESTS
              ? "The protected inventory search rate limit was reached. Retry shortly."
              : "The live inventory lookup could not be completed safely.",
        ...(error.requestId === undefined
          ? {}
          : { requestId: error.requestId }),
        ...(error.retryAfterSeconds === undefined
          ? {}
          : { retryAfterSeconds: error.retryAfterSeconds }),
      });
    }

    return problemResponse({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: "INVENTORY_LIVE_SEARCH_FAILED",
      title: "Inventory search unavailable",
      detail: "The server could not complete the protected inventory search.",
    });
  }
}

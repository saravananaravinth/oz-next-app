// oz-next-app/src/app/api/inventory/components/search/route.ts
import "server-only";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { getAuthenticatedMe } from "@/features/auth/server/require-auth";
import { componentInventorySearchParamsSchema } from "@/features/inventory/components/contracts/component-inventory.schema";
import { resolveComponentInventoryAccess } from "@/features/inventory/components/policies/component-inventory.policy";
import { searchComponentInventory } from "@/features/inventory/components/server/component-inventory.server";
import { componentInventoryPageHref } from "@/features/inventory/components/utils/component-inventory-url";
import { CT, HTTP_STATUS } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const NO_STORE = "private, no-store, no-cache, must-revalidate";
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/u;
const MAX_RESULTS = 8;
const ALLOWED_QUERY_KEYS = new Set(["q"]);

const liveSearchQuerySchema = z
  .object({
    q: z.string().trim().min(3).max(100),
  })
  .strict();

function readSingleQueryValue(
  request: NextRequest,
  key: string,
): string | undefined {
  const values = request.nextUrl.searchParams.getAll(key);
  if (values.length === 0) return undefined;
  if (values.length !== 1) return "__duplicate__";
  return values[0] ?? undefined;
}

function hasUnsupportedQueryKey(request: NextRequest): boolean {
  for (const key of request.nextUrl.searchParams.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) return true;
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
      code: "COMPONENT_LIVE_SEARCH_VALIDATION_FAILED",
      title: "Component search request invalid",
      detail:
        "The component live-search query contains unsupported parameters.",
    });
  }

  const parsed = liveSearchQuerySchema.safeParse({
    q: readSingleQueryValue(request, "q"),
  });

  if (!parsed.success) {
    return problemResponse({
      status: HTTP_STATUS.BAD_REQUEST,
      code: "COMPONENT_LIVE_SEARCH_VALIDATION_FAILED",
      title: "Component search request invalid",
      detail: "Enter at least three valid search characters and retry.",
      invalidParams: parsed.error.issues.slice(0, 16).map((issue) => ({
        path: issue.path.length === 0 ? "$" : issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const baseQuery = componentInventorySearchParamsSchema.parse({});

  try {
    const me = await getAuthenticatedMe();
    if (me === null) {
      return problemResponse({
        status: HTTP_STATUS.UNAUTHORIZED,
        code: "COMPONENT_AUTHENTICATION_REQUIRED",
        title: "Authentication required",
        detail:
          "Your ERP session is no longer available for protected component search.",
      });
    }

    const access = resolveComponentInventoryAccess(me);
    if (access.kind === "forbidden") {
      return problemResponse({
        status: HTTP_STATUS.FORBIDDEN,
        code: "COMPONENT_FORBIDDEN",
        title: "Component search forbidden",
        detail: access.reason,
      });
    }
    if (access.kind === "context_required") {
      return problemResponse({
        status: HTTP_STATUS.FORBIDDEN,
        code: "COMPONENT_TENANT_CONTEXT_REQUIRED",
        title: "Tenant context required",
        detail:
          "Choose the active tenant in the global application header before searching components.",
      });
    }

    const result = await searchComponentInventory({
      access,
      query: parsed.data.q,
      limit: MAX_RESULTS,
    });

    return Response.json(
      {
        asOf: result.asOf,
        truncated: result.nextCursor !== null,
        items: result.items.map((item) => ({
          id: item.componentInventoryId,
          href: componentInventoryPageHref(baseQuery, {
            q: parsed.data.q,
            focusComponentInventoryId: item.componentInventoryId,
            state: undefined,
            operationalState: undefined,
            includeAllStates: true,
            componentType: undefined,
            orgUnitId: item.store?.orgUnitId,
            storeId: item.store?.storeId,
            componentId: undefined,
            cursor: undefined,
          }),
          category: "component" as const,
          componentName: item.component.name,
          componentCode: item.component.code,
          componentType: item.component.type,
          serialNumber: item.serialNumber,
          lotNumber: item.lotNumber,
          state: item.operationalState,
          storeName: item.store?.name ?? null,
          orgUnitName: item.store?.orgUnitName ?? null,
          vin: item.vehicle?.vin ?? null,
          integrityWarnings: item.integrityWarnings,
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
            ? "Component search access denied"
            : error.status === HTTP_STATUS.TOO_MANY_REQUESTS
              ? "Component search rate limited"
              : "Component search unavailable",
        detail:
          error.status === HTTP_STATUS.FORBIDDEN
            ? "The authenticated actor cannot search this component scope."
            : error.status === HTTP_STATUS.TOO_MANY_REQUESTS
              ? "The protected component search rate limit was reached. Retry shortly."
              : "The component lookup could not be completed safely.",
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
      code: "COMPONENT_LIVE_SEARCH_FAILED",
      title: "Component search unavailable",
      detail: "The server could not complete the protected component search.",
    });
  }
}

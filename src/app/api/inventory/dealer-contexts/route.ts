// oz-next-app/src/app/api/inventory/dealer-contexts/route.ts
import "server-only";

import type { NextRequest } from "next/server";

import {
  readVehicleInventoryDealerContexts,
  vehicleInventoryDealerContextQuerySchema,
} from "@/features/inventory/vehicles";
import { CT, HTTP_STATUS } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const NO_STORE = "private, no-store, no-cache, must-revalidate";
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/u;

function rawQuery(request: NextRequest): Readonly<Record<string, unknown>> {
  const raw: Record<string, unknown> = {};

  for (const key of new Set(request.nextUrl.searchParams.keys())) {
    const values = request.nextUrl.searchParams.getAll(key);
    raw[key] = values.length === 1 ? values[0] : values;
  }

  const limit = raw["limit"];

  if (typeof limit === "string" && /^\d+$/u.test(limit)) {
    raw["limit"] = Number(limit);
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

export async function GET(request: NextRequest): Promise<Response> {
  const parsed = vehicleInventoryDealerContextQuerySchema.safeParse(
    rawQuery(request),
  );

  if (!parsed.success) {
    return problemResponse({
      status: HTTP_STATUS.BAD_REQUEST,
      code: "INVENTORY_VALIDATION_FAILED",
      title: "Dealer context request invalid",
      detail: "The dealer context query contains invalid parameters.",
      invalidParams: parsed.error.issues.slice(0, 16).map((issue) => ({
        path: issue.path.length === 0 ? "$" : issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const result = await readVehicleInventoryDealerContexts(parsed.data);

    return Response.json(result, {
      status: HTTP_STATUS.OK,
      headers: {
        "Cache-Control": NO_STORE,
        "Content-Type": CT.JSON,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    if (isApiHttpError(error)) {
      return problemResponse({
        status: error.status,
        code: error.code,
        title:
          error.status === HTTP_STATUS.FORBIDDEN
            ? "Dealer context access denied"
            : "Dealer contexts unavailable",
        detail:
          error.status === HTTP_STATUS.FORBIDDEN
            ? "The authenticated actor cannot list dealers for this tenant."
            : "The dealer context lookup could not be completed.",
        ...(error.requestId === undefined
          ? {}
          : { requestId: error.requestId }),
      });
    }

    return problemResponse({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: "INVENTORY_DEALER_CONTEXT_LOOKUP_FAILED",
      title: "Dealer contexts unavailable",
      detail: "The server could not complete the dealer context lookup.",
    });
  }
}

// oz-next-app/src/app/api/engagement/dealers/search/route.ts
import "server-only";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { getAuthenticatedMe } from "@/features/auth/server/require-auth";
import { resolveDealerOnboardingAccess } from "@/features/engagement/dealer-onboarding/policies/dealer-onboarding.policy";
import { readDealerDirectory } from "@/features/engagement/dealer-onboarding/server/dealer-onboarding.server";
import { dealerDetailHref } from "@/features/engagement/dealer-onboarding/utils/dealer-onboarding-url";
import { CT, HTTP_STATUS } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const NO_STORE = "private, no-store, no-cache, must-revalidate";
const MAX_RESULTS = 8;
const ALLOWED_QUERY_KEYS = new Set(["q", "dealerType", "active"]);

const liveSearchQuerySchema = z
  .object({
    q: z.string().trim().min(3).max(100),
    dealerType: z.enum(["DEALER", "SUB_DEALER"]).optional(),
    active: z.enum(["true", "false", "all"]).default("true"),
  })
  .strict();

function readSingleValue(
  request: NextRequest,
  key: string,
): string | undefined {
  const values = request.nextUrl.searchParams.getAll(key);
  if (values.length === 0) return undefined;
  if (values.length !== 1) return "__duplicate__";
  return values[0] ?? undefined;
}

function problemResponse(
  status: number,
  code: string,
  title: string,
  detail: string,
): Response {
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
    {
      status,
      headers: {
        "Cache-Control": NO_STORE,
        "Content-Type": CT.PROBLEM_JSON,
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  for (const key of request.nextUrl.searchParams.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      return problemResponse(
        HTTP_STATUS.BAD_REQUEST,
        "DEALER_LIVE_SEARCH_VALIDATION_FAILED",
        "Dealer search request invalid",
        "The live-search query contains unsupported parameters.",
      );
    }
  }

  const parsed = liveSearchQuerySchema.safeParse({
    q: readSingleValue(request, "q"),
    dealerType: readSingleValue(request, "dealerType"),
    active: readSingleValue(request, "active") ?? "true",
  });
  if (!parsed.success) {
    return problemResponse(
      HTTP_STATUS.BAD_REQUEST,
      "DEALER_LIVE_SEARCH_VALIDATION_FAILED",
      "Dealer search request invalid",
      "Enter at least three valid search characters and retry.",
    );
  }

  try {
    const me = await getAuthenticatedMe();
    if (me === null) {
      return problemResponse(
        HTTP_STATUS.UNAUTHORIZED,
        "DEALER_AUTHENTICATION_REQUIRED",
        "Authentication required",
        "Your ERP session is no longer available for protected dealer search.",
      );
    }

    const access = resolveDealerOnboardingAccess(me);
    if (access.kind !== "resolved") {
      return problemResponse(
        HTTP_STATUS.FORBIDDEN,
        "DEALER_SEARCH_FORBIDDEN",
        "Dealer search forbidden",
        access.reason,
      );
    }

    const data = await readDealerDirectory({
      access,
      query: {
        q: parsed.data.q,
        ...(parsed.data.dealerType === undefined
          ? {}
          : { dealerType: parsed.data.dealerType }),
        ...(parsed.data.active === "all"
          ? {}
          : { active: parsed.data.active === "true" }),
        includeSummary: false,
        sortBy: "DISPLAY_NAME",
        sortDirection: "ASC",
        limit: MAX_RESULTS,
      },
    });

    return Response.json(
      {
        asOf: new Date().toISOString(),
        truncated: data.pagination.hasMore,
        items: data.items.map((dealer) => ({
          id: dealer.dealerOrgUnitId,
          href: dealerDetailHref(dealer.dealerOrgUnitId),
          category: "dealer" as const,
          dealerCode: dealer.dealerCode,
          displayName: dealer.displayName,
          companyName: dealer.companyName,
          dealerType: dealer.dealerType,
          city: dealer.city,
          district: dealer.district,
          state: dealer.state,
          sourceName:
            dealer.source.name.trim().toLowerCase() === "unknown source"
              ? "Direct"
              : dealer.source.name,
          isActive: dealer.isActive,
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
      return problemResponse(
        error.status,
        error.code,
        error.status === HTTP_STATUS.TOO_MANY_REQUESTS
          ? "Dealer search rate limited"
          : "Dealer search unavailable",
        error.status === HTTP_STATUS.TOO_MANY_REQUESTS
          ? "The protected dealer search rate limit was reached. Retry shortly."
          : "The dealer lookup could not be completed safely.",
      );
    }

    return problemResponse(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "DEALER_LIVE_SEARCH_FAILED",
      "Dealer search unavailable",
      "The server could not complete the protected dealer search.",
    );
  }
}

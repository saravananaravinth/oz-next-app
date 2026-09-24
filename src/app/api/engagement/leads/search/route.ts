// oz-next-app/src/app/api/engagement/leads/search/route.ts
import "server-only";

import type { NextRequest } from "next/server";

import { getAuthenticatedMe } from "@/features/auth/server/require-auth";
import { resolveEngagementDashboardAccess } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { searchEngagementDashboardLeads } from "@/features/engagement/operations-dashboard/server/engagement-dashboard.server";
import { CT, HTTP_STATUS } from "@/lib/api/http-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 3 || query.length > 100) {
    return Response.json(
      { error: "Enter at least three search characters." },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }
  const me = await getAuthenticatedMe();
  if (me === null)
    return Response.json(
      { error: "Authentication required." },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  const access = resolveEngagementDashboardAccess(me);
  if (access.kind !== "resolved" || !access.capabilities.canReadLeads) {
    return Response.json(
      { error: "Lead search is unavailable." },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }
  const result = await searchEngagementDashboardLeads({ query, access });
  return Response.json(
    {
      items: result.items.slice(0, 8).map((lead) => ({
        id: lead.leadId,
        href: `/engagement/dashboard/leads/${encodeURIComponent(lead.leadId)}`,
        title: lead.leadNo,
        description: `${lead.customer.name ?? "New Customer"} · ${lead.customer.contactMasked ?? "Contact unavailable"}`,
      })),
    },
    {
      status: HTTP_STATUS.OK,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": CT.JSON,
      },
    },
  );
}

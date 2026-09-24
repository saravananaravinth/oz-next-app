// oz-next-app/src/app/api/extended-warranty/search/route.ts
import "server-only";
import type { NextRequest } from "next/server";
import { getAuthenticatedMe } from "@/features/auth/server/require-auth";
import { resolveTenantAccess } from "@/features/tenant-context";
import { extendedWarrantyWorkspaceQuerySchema } from "@/features/extended-warranty/contracts/admin.schema";
import { loadExtendedWarrantyWorkspace } from "@/features/extended-warranty/api/admin.server";
import { isApiHttpError } from "@/lib/api/problem";
export const dynamic = "force-dynamic";
export const revalidate = 0;
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const me = await getAuthenticatedMe();
    if (!me)
      return Response.json(
        { error: "Unauthenticated" },
        { status: 401, headers },
      );
    if (!me.permissions.includes("extended-warranty:order:read"))
      return Response.json({ error: "Forbidden" }, { status: 403, headers });
    const access = resolveTenantAccess(me);
    if (access.kind !== "resolved")
      return Response.json({ error: access.reason }, { status: 403, headers });
    const raw: Record<string, string> = {};
    for (const [key, value] of request.nextUrl.searchParams) {
      if (key in raw)
        return Response.json(
          { error: "Duplicate query" },
          { status: 422, headers },
        );
      raw[key] = value;
    }
    const parsed = extendedWarrantyWorkspaceQuerySchema.safeParse({
      ...raw,
      limit: 10,
    });
    if (!parsed.success || parsed.data.q.length < 3)
      return Response.json(
        { error: "Invalid search query" },
        { status: 422, headers },
      );
    const result = await loadExtendedWarrantyWorkspace(access, parsed.data);
    return Response.json(
      {
        items: result.items.slice(0, 8),
        truncated: result.pageInfo.totalCount > 8,
      },
      { headers },
    );
  } catch (error) {
    return Response.json(
      { error: "Warranty search unavailable" },
      { status: isApiHttpError(error) ? error.status : 500, headers },
    );
  }
}

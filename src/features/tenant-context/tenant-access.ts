// oz-next-app/src/features/tenant-context/tenant-access.ts
import { z } from "zod";
import { erpActorScopeFromMe } from "@/features/erp-core/queries/erp-query-scope";
import type { MeResponse } from "@/lib/api/contracts";
import type { ServerActorContextHeaders } from "@/server/api/request-context-headers";

export type ResolvedTenantAccess = Readonly<{
  kind: "resolved";
  tenantId: string;
  actorContext?: ServerActorContextHeaders;
}>;
export type TenantAccess =
  | ResolvedTenantAccess
  | Readonly<{
      kind: "context_required" | "forbidden";
      reason: string;
    }>;

export function resolveTenantAccess(me: MeResponse): TenantAccess {
  const scope = erpActorScopeFromMe(me);
  const actorKind = me.auth?.actor.actorKind ?? scope.actorKind;
  const tenantId = me.tenant_id ?? scope.tenantId;
  if (tenantId === null)
    return {
      kind: "context_required",
      reason:
        "Select a tenant using the global tenant context before continuing.",
    };
  if (!z.uuid().safeParse(tenantId).success)
    return {
      kind: "forbidden",
      reason: "The selected tenant context is invalid.",
    };
  if (actorKind !== "SUPER_ADMIN" && scope.tenantId !== tenantId)
    return {
      kind: "forbidden",
      reason:
        "The selected tenant does not match the authenticated actor tenant.",
    };
  return {
    kind: "resolved",
    tenantId,
    ...(actorKind === "SUPER_ADMIN" ? { actorContext: { tenantId } } : {}),
  };
}

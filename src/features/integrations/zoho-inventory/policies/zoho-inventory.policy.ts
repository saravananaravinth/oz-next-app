// oz-next-app/src/features/integrations/zoho-inventory/policies/zoho-inventory.policy.ts
import type { ActorKind, MeResponse } from "@/lib/api/contracts";
import type { ServerActorContextHeaders } from "@/server/api/request-context-headers";

import type { ErpActorScope } from "@/features/erp-core/contracts/erp-common.schema";
import { erpActorScopeFromMe } from "@/features/erp-core/queries/erp-query-scope";

const PERMISSION = {
  READ: "integration:read",
  CONFIGURE: "integration:configure",
  SYNC_RUN: "integration:sync:run",
} as const;

export type ZohoInventoryCapabilities = Readonly<{
  canRead: boolean;
  canConfigure: boolean;
  canRunSync: boolean;
}>;

export type ResolvedZohoInventoryAccess = Readonly<{
  kind: "resolved";
  actorKind: ActorKind;
  tenantId: string;
  scope: ErpActorScope;
  actorContext?: ServerActorContextHeaders;
  capabilities: ZohoInventoryCapabilities;
}>;

export type ZohoInventoryAccess =
  | ResolvedZohoInventoryAccess
  | Readonly<{
      kind: "context_required";
      actorKind: ActorKind;
      scope: ErpActorScope;
      capabilities: ZohoInventoryCapabilities;
      reason: string;
    }>
  | Readonly<{
      kind: "forbidden";
      actorKind: ActorKind;
      scope: ErpActorScope;
      capabilities: ZohoInventoryCapabilities;
      reason: string;
    }>;

const NO_CAPABILITIES = {
  canRead: false,
  canConfigure: false,
  canRunSync: false,
} as const satisfies ZohoInventoryCapabilities;

function normalized(values: readonly string[]): ReadonlySet<string> {
  return new Set(
    values
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0),
  );
}

function effectivePermissions(me: MeResponse): ReadonlySet<string> {
  return normalized(
    me.auth?.permissionResolution?.effectivePermissions ??
      me.auth?.effectivePermissions ??
      me.permissions,
  );
}

function forbidden(
  actorKind: ActorKind,
  scope: ErpActorScope,
  reason: string,
): ZohoInventoryAccess {
  return {
    kind: "forbidden",
    actorKind,
    scope,
    capabilities: NO_CAPABILITIES,
    reason,
  };
}

export function resolveZohoInventoryAccess(
  me: MeResponse,
): ZohoInventoryAccess {
  const scope = erpActorScopeFromMe(me);
  const actorKind = me.auth?.actor.actorKind ?? scope.actorKind;
  const permissions = effectivePermissions(me);
  const globallySelectedTenantId = me.tenant_id ?? scope.tenantId;

  if (globallySelectedTenantId === null) {
    return {
      kind: "context_required",
      actorKind,
      scope,
      capabilities: NO_CAPABILITIES,
      reason:
        actorKind === "SUPER_ADMIN"
          ? "Select a tenant using the global tenant context before configuring external integrations."
          : "A tenant context is required for external integrations.",
    };
  }

  if (
    actorKind !== "SUPER_ADMIN" &&
    scope.tenantId !== null &&
    scope.tenantId !== globallySelectedTenantId
  ) {
    return forbidden(
      actorKind,
      scope,
      "The selected tenant does not match the authenticated actor tenant.",
    );
  }

  const canRead = permissions.has(PERMISSION.READ);
  const canConfigure = permissions.has(PERMISSION.CONFIGURE);
  const canRunSync = permissions.has(PERMISSION.SYNC_RUN);

  if (!canRead) {
    return forbidden(
      actorKind,
      scope,
      "The active actor does not have integration:read permission for this tenant.",
    );
  }

  const actorContext: ServerActorContextHeaders | undefined =
    actorKind === "SUPER_ADMIN"
      ? { tenantId: globallySelectedTenantId }
      : undefined;

  return {
    kind: "resolved",
    actorKind,
    tenantId: globallySelectedTenantId,
    scope: { ...scope, tenantId: globallySelectedTenantId },
    ...(actorContext === undefined ? {} : { actorContext }),
    capabilities: {
      canRead,
      canConfigure,
      canRunSync,
    },
  };
}

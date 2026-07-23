// oz-next-app/src/features/inventory/vehicles/policies/vehicle-inventory.policy.ts
import type { ActorKind, MeResponse } from "@/lib/api/contracts";
import type { ServerActorContextHeaders } from "@/server/api/request-context-headers";

import { erpActorScopeFromMe } from "@/features/erp-core/queries/erp-query-scope";
import type { ErpActorScope } from "@/features/erp-core/contracts/erp-common.schema";

import type { VehicleInventorySearchParams } from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";

const PERMISSION = {
  INVENTORY_READ: "inventory:stock:read",
  INVENTORY_UPDATE: "inventory:item:update",
  REPORT_EXPORT: "report:export",
} as const;

const ROLE = {
  TENANT_ADMIN: "tenant_admin",
  DEALER_ADMIN: "dealer_admin",
  DEALER_STAFF: "dealer_staff",
} as const;

export type VehicleInventoryCapabilities = Readonly<{
  canRead: boolean;
  canExport: boolean;
  canRemediateDataQuality: boolean;
}>;

export type VehicleInventoryContext = Readonly<{
  tenantId: string;
  dealerOrgUnitId: string;
}>;

type VehicleInventoryResolvedAccessBase = Readonly<{
  actorKind: ActorKind;
  role: string | null;
  scope: ErpActorScope;
  context: VehicleInventoryContext;
  capabilities: VehicleInventoryCapabilities;
}>;

export type ResolvedVehicleInventoryAccess =
  | (VehicleInventoryResolvedAccessBase &
      Readonly<{
        kind: "dealer";
      }>)
  | (VehicleInventoryResolvedAccessBase &
      Readonly<{
        kind: "contextual";
        actorContext: ServerActorContextHeaders;
      }>);

export type VehicleInventoryAccess =
  | ResolvedVehicleInventoryAccess
  | Readonly<{
      kind: "context_required";
      actorKind: Extract<ActorKind, "SUPER_ADMIN" | "ADMIN">;
      role: string | null;
      scope: ErpActorScope;
      capabilities: VehicleInventoryCapabilities;
    }>
  | Readonly<{
      kind: "forbidden";
      actorKind: ActorKind;
      role: string | null;
      scope: ErpActorScope;
      capabilities: VehicleInventoryCapabilities;
      reason: string;
    }>;

const NO_CAPABILITIES = {
  canRead: false,
  canExport: false,
  canRemediateDataQuality: false,
} as const satisfies VehicleInventoryCapabilities;

function normalizeValues(values: readonly string[]): ReadonlySet<string> {
  return new Set(values.map((value) => value.trim().toLowerCase()));
}

function effectivePermissions(me: MeResponse): ReadonlySet<string> {
  return normalizeValues(
    me.auth?.permissionResolution?.effectivePermissions ??
      me.auth?.effectivePermissions ??
      me.permissions,
  );
}

function roles(me: MeResponse): ReadonlySet<string> {
  return normalizeValues(me.auth?.actor.roles ?? me.roles);
}

function primaryRole(me: MeResponse): string | null {
  return me.primary_role ?? me.auth?.actor.roles[0] ?? me.roles[0] ?? null;
}

function hasPermission(
  permissions: ReadonlySet<string>,
  permission: string,
): boolean {
  return permissions.has(permission);
}

function forbidden(
  input: Readonly<{
    actorKind: ActorKind;
    role: string | null;
    scope: ErpActorScope;
    reason: string;
  }>,
): VehicleInventoryAccess {
  return {
    kind: "forbidden",
    actorKind: input.actorKind,
    role: input.role,
    scope: input.scope,
    capabilities: NO_CAPABILITIES,
    reason: input.reason,
  };
}

export function resolveVehicleInventoryAccess(
  me: MeResponse,
  query: Pick<VehicleInventorySearchParams, "tenantId" | "dealerOrgUnitId">,
): VehicleInventoryAccess {
  const scope = erpActorScopeFromMe(me);
  const actorKind = me.auth?.actor.actorKind ?? scope.actorKind;
  const role = primaryRole(me);
  const effectiveRoles = roles(me);
  const permissions = effectivePermissions(me);

  if (!hasPermission(permissions, PERMISSION.INVENTORY_READ)) {
    return forbidden({
      actorKind,
      role,
      scope,
      reason: "The active actor does not have inventory:stock:read.",
    });
  }

  const capabilities = {
    canRead: true,
    canExport: hasPermission(permissions, PERMISSION.REPORT_EXPORT),
    canRemediateDataQuality: hasPermission(
      permissions,
      PERMISSION.INVENTORY_UPDATE,
    ),
  } as const satisfies VehicleInventoryCapabilities;

  if (actorKind === "DEALER") {
    const hasDealerRole =
      effectiveRoles.has(ROLE.DEALER_ADMIN) ||
      effectiveRoles.has(ROLE.DEALER_STAFF);

    if (
      !hasDealerRole ||
      scope.tenantId === null ||
      scope.dealerOrgUnitId === null
    ) {
      return forbidden({
        actorKind,
        role,
        scope,
        reason:
          "Dealer inventory requires a complete dealer actor scope and the dealer_admin or dealer_staff role.",
      });
    }

    return {
      kind: "dealer",
      actorKind,
      role,
      scope,
      context: {
        tenantId: scope.tenantId,
        dealerOrgUnitId: scope.dealerOrgUnitId,
      },
      capabilities,
    };
  }

  if (actorKind === "ADMIN") {
    if (!effectiveRoles.has(ROLE.TENANT_ADMIN) || scope.tenantId === null) {
      return forbidden({
        actorKind,
        role,
        scope,
        reason:
          "Tenant inventory context requires the tenant_admin role and a resolved tenant.",
      });
    }

    if (query.tenantId === undefined || query.dealerOrgUnitId === undefined) {
      return {
        kind: "context_required",
        actorKind,
        role,
        scope,
        capabilities,
      };
    }

    if (query.tenantId !== scope.tenantId) {
      return forbidden({
        actorKind,
        role,
        scope,
        reason:
          "The selected tenant does not match the authenticated tenant scope.",
      });
    }

    return {
      kind: "contextual",
      actorKind,
      role,
      scope,
      context: {
        tenantId: query.tenantId,
        dealerOrgUnitId: query.dealerOrgUnitId,
      },
      actorContext: {
        dealerOrgUnitId: query.dealerOrgUnitId,
      },
      capabilities,
    };
  }

  if (actorKind === "SUPER_ADMIN") {
    if (query.tenantId === undefined || query.dealerOrgUnitId === undefined) {
      return {
        kind: "context_required",
        actorKind,
        role,
        scope,
        capabilities,
      };
    }

    return {
      kind: "contextual",
      actorKind,
      role,
      scope,
      context: {
        tenantId: query.tenantId,
        dealerOrgUnitId: query.dealerOrgUnitId,
      },
      actorContext: {
        tenantId: query.tenantId,
        dealerOrgUnitId: query.dealerOrgUnitId,
      },
      capabilities,
    };
  }

  return forbidden({
    actorKind,
    role,
    scope,
    reason: "This actor kind cannot access dealer vehicle inventory.",
  });
}

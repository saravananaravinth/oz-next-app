// oz-next-app/src/features/inventory/components/policies/component-inventory.policy.ts
import type { ActorKind, MeResponse } from "@/lib/api/contracts";
import type { ServerActorContextHeaders } from "@/server/api/request-context-headers";
import {
  canonicalErpRoleSet,
  canonicalizeErpRoleName,
  ERP_ROLE,
} from "@/lib/auth/roles";

import type { ErpActorScope } from "@/features/erp-core/contracts/erp-common.schema";
import { erpActorScopeFromMe } from "@/features/erp-core/queries/erp-query-scope";

const PERMISSION = {
  READ: "inventory:component:read",
  CREATE: "inventory:component:create",
  UPDATE: "inventory:component:update",
  ATTACH: "inventory:component:attach",
  REPLACE: "inventory:component:replace",
  TRANSFER: "inventory:component:transfer",
  QUARANTINE: "inventory:component:quarantine",
  RECONCILE: "inventory:component:reconcile",
  AUDIT_READ: "inventory:component:audit:read",
  VEHICLE_SEARCH: "inventory:stock:read",
} as const;

const ROLE = {
  DEALER_ADMIN: ERP_ROLE.DEALER_ADMIN,
  DEALER_STAFF: ERP_ROLE.DEALER_STAFF,
} as const;

export type ComponentInventoryCapabilities = Readonly<{
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canUpdateDefinition: boolean;
  canAttach: boolean;
  canSearchVehicles: boolean;
  canReplace: boolean;
  canModifySoldVehicleComponents: boolean;
  canTransfer: boolean;
  canQuarantine: boolean;
  canReconcile: boolean;
  canReadAudit: boolean;
}>;

export type ResolvedComponentInventoryAccess = Readonly<{
  kind: "resolved";
  actorKind: ActorKind;
  role: string | null;
  scope: ErpActorScope;
  tenantId: string;
  actorContext?: ServerActorContextHeaders;
  capabilities: ComponentInventoryCapabilities;
}>;

export type ComponentInventoryAccess =
  | ResolvedComponentInventoryAccess
  | Readonly<{
      kind: "context_required";
      actorKind: "SUPER_ADMIN";
      role: string | null;
      scope: ErpActorScope;
      capabilities: ComponentInventoryCapabilities;
    }>
  | Readonly<{
      kind: "forbidden";
      actorKind: ActorKind;
      role: string | null;
      scope: ErpActorScope;
      capabilities: ComponentInventoryCapabilities;
      reason: string;
    }>;

const NO_CAPABILITIES = {
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canUpdateDefinition: false,
  canAttach: false,
  canSearchVehicles: false,
  canReplace: false,
  canModifySoldVehicleComponents: false,
  canTransfer: false,
  canQuarantine: false,
  canReconcile: false,
  canReadAudit: false,
} as const satisfies ComponentInventoryCapabilities;

function normalizeValues(values: readonly string[]): ReadonlySet<string> {
  return new Set(values.map((value) => value.trim().toLowerCase()));
}

function permissions(me: MeResponse): ReadonlySet<string> {
  return normalizeValues(
    me.auth?.permissionResolution?.effectivePermissions ??
      me.auth?.effectivePermissions ??
      me.permissions,
  );
}

function roles(me: MeResponse): ReadonlySet<string> {
  return canonicalErpRoleSet(me.auth?.actor.roles ?? me.roles);
}

function primaryRole(me: MeResponse): string | null {
  return canonicalizeErpRoleName(
    me.primary_role ?? me.auth?.actor.roles[0] ?? me.roles[0],
  );
}

function hasPermission(
  effectivePermissions: ReadonlySet<string>,
  permission: string,
): boolean {
  return effectivePermissions.has(permission);
}

function forbidden(
  input: Readonly<{
    actorKind: ActorKind;
    role: string | null;
    scope: ErpActorScope;
    reason: string;
  }>,
): ComponentInventoryAccess {
  return {
    kind: "forbidden",
    actorKind: input.actorKind,
    role: input.role,
    scope: input.scope,
    capabilities: NO_CAPABILITIES,
    reason: input.reason,
  };
}

function capabilitiesFor(
  actorKind: ActorKind,
  effectivePermissions: ReadonlySet<string>,
): ComponentInventoryCapabilities {
  const administrator = actorKind === "ADMIN" || actorKind === "SUPER_ADMIN";

  return {
    canRead: true,
    canCreate:
      administrator && hasPermission(effectivePermissions, PERMISSION.CREATE),
    canUpdate: hasPermission(effectivePermissions, PERMISSION.UPDATE),
    canUpdateDefinition:
      administrator && hasPermission(effectivePermissions, PERMISSION.UPDATE),
    canAttach: hasPermission(effectivePermissions, PERMISSION.ATTACH),
    canSearchVehicles: hasPermission(
      effectivePermissions,
      PERMISSION.VEHICLE_SEARCH,
    ),
    canReplace: hasPermission(effectivePermissions, PERMISSION.REPLACE),
    canModifySoldVehicleComponents: administrator,
    canTransfer: hasPermission(effectivePermissions, PERMISSION.TRANSFER),
    canQuarantine: hasPermission(effectivePermissions, PERMISSION.QUARANTINE),
    canReconcile:
      administrator &&
      hasPermission(effectivePermissions, PERMISSION.RECONCILE),
    canReadAudit: hasPermission(effectivePermissions, PERMISSION.AUDIT_READ),
  };
}

export function resolveComponentInventoryAccess(
  me: MeResponse,
): ComponentInventoryAccess {
  const scope = erpActorScopeFromMe(me);
  const actorKind = me.auth?.actor.actorKind ?? scope.actorKind;
  const role = primaryRole(me);
  const effectivePermissions = permissions(me);
  const effectiveRoles = roles(me);

  if (!hasPermission(effectivePermissions, PERMISSION.READ)) {
    return forbidden({
      actorKind,
      role,
      scope,
      reason: "The active actor does not have inventory:component:read.",
    });
  }

  const capabilities = capabilitiesFor(actorKind, effectivePermissions);

  if (actorKind === "SUPER_ADMIN") {
    if (scope.tenantId === null) {
      return {
        kind: "context_required",
        actorKind,
        role,
        scope,
        capabilities,
      };
    }

    return {
      kind: "resolved",
      actorKind,
      role,
      scope,
      tenantId: scope.tenantId,
      actorContext: { tenantId: scope.tenantId },
      capabilities,
    };
  }

  if (actorKind === "ADMIN") {
    if (scope.tenantId === null) {
      return forbidden({
        actorKind,
        role,
        scope,
        reason:
          "Administrator component inventory requires the globally selected tenant scope.",
      });
    }

    return {
      kind: "resolved",
      actorKind,
      role,
      scope,
      tenantId: scope.tenantId,
      capabilities,
    };
  }

  if (actorKind === "STAFF") {
    if (scope.tenantId === null || scope.orgUnitId === null) {
      return forbidden({
        actorKind,
        role,
        scope,
        reason:
          "Staff component inventory requires tenant and organization-unit scope.",
      });
    }

    return {
      kind: "resolved",
      actorKind,
      role,
      scope,
      tenantId: scope.tenantId,
      capabilities,
    };
  }

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
          "Dealer component inventory requires a complete dealer actor scope and the dealer or dealer_staff role.",
      });
    }

    return {
      kind: "resolved",
      actorKind,
      role,
      scope,
      tenantId: scope.tenantId,
      capabilities,
    };
  }

  return forbidden({
    actorKind,
    role,
    scope,
    reason: "This actor kind cannot access component inventory.",
  });
}

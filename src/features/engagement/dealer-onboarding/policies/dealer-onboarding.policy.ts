// oz-next-app/src/features/engagement/dealer-onboarding/policies/dealer-onboarding.policy.ts
import type { ActorKind, MeResponse } from "@/lib/api/contracts";
import type { ServerActorContextHeaders } from "@/server/api/request-context-headers";

import type { ErpActorScope } from "@/features/erp-core/contracts/erp-common.schema";
import { erpActorScopeFromMe } from "@/features/erp-core/queries/erp-query-scope";

const PERMISSION = {
  DEALER_READ: "dealer:read",
  DEALER_CREATE: "dealer:create",
  DEALER_UPDATE: "dealer:update",
  DEALER_DISABLE: "dealer:disable",
  DEALER_USER_READ: "dealer:user:read",
  DEALER_USER_CREATE: "dealer:user:create",
  DEALER_USER_UPDATE: "dealer:user:update",
  ORGANIZATION_UNIT_READ: "organization:unit:read",
  ORGANIZATION_UNIT_CREATE: "organization:unit:create",
  ORGANIZATION_UNIT_UPDATE: "organization:unit:update",
  AUTH_USER_CREATE: "auth:user:create",
  AUTH_USER_UPDATE: "auth:user:update",
  AUTH_ROLE_ASSIGN: "auth:role:assign",
  FILE_READ: "file:read",
  FILE_UPLOAD: "file:upload",
  FILE_SIGNED_URL_CREATE: "file:signed-url:create",
  WALLET_READ: "wallet:read",
  WELFARE_ACCRUAL_READ: "welfare:accrual:read",
} as const;

const ROLE = {
  TENANT_ADMIN: "tenant_admin",
  ORG_ADMIN: "org_admin",
  STAFF_MANAGER: "staff_manager",
} as const;

export type DealerAdministrationCapabilities = Readonly<{
  canReadDirectory: boolean;
  canOnboard: boolean;
  canProvision: boolean;
  canUseGstinPrefill: boolean;
  canUpdateDealer: boolean;
  canUpdateMargins: boolean;
  canManageContacts: boolean;
  canReadWallets: boolean;
  canReadWelfare: boolean;
  canReadDocuments: boolean;
  canManageDocuments: boolean;
}>;

export type ResolvedDealerAdministrationAccess = Readonly<{
  kind: "resolved";
  actorKind: Extract<ActorKind, "SUPER_ADMIN" | "ADMIN" | "STAFF">;
  role: string | null;
  scope: ErpActorScope;
  tenantId: string;
  actorContext?: ServerActorContextHeaders;
  capabilities: DealerAdministrationCapabilities;
}>;

export type DealerAdministrationAccess =
  | ResolvedDealerAdministrationAccess
  | Readonly<{
      kind: "context_required";
      actorKind: "SUPER_ADMIN";
      role: string | null;
      scope: ErpActorScope;
      capabilities: DealerAdministrationCapabilities;
      reason: string;
    }>
  | Readonly<{
      kind: "forbidden";
      actorKind: ActorKind;
      role: string | null;
      scope: ErpActorScope;
      capabilities: DealerAdministrationCapabilities;
      reason: string;
    }>;

const NO_CAPABILITIES = {
  canReadDirectory: false,
  canOnboard: false,
  canProvision: false,
  canUseGstinPrefill: false,
  canUpdateDealer: false,
  canUpdateMargins: false,
  canManageContacts: false,
  canReadWallets: false,
  canReadWelfare: false,
  canReadDocuments: false,
  canManageDocuments: false,
} as const satisfies DealerAdministrationCapabilities;

function normalized(values: readonly string[]): ReadonlySet<string> {
  return new Set(
    values.map((value) => value.trim().toLowerCase()).filter(Boolean),
  );
}

function effectivePermissions(me: MeResponse): ReadonlySet<string> {
  return normalized(
    me.auth?.permissionResolution?.effectivePermissions ??
      me.auth?.effectivePermissions ??
      me.permissions,
  );
}

function effectiveRoles(me: MeResponse): ReadonlySet<string> {
  return normalized(me.auth?.actor.roles ?? me.roles);
}

function primaryRole(me: MeResponse): string | null {
  return me.primary_role ?? me.auth?.actor.roles[0] ?? me.roles[0] ?? null;
}

function hasPermission(
  actorKind: ActorKind,
  permissions: ReadonlySet<string>,
  permission: string,
): boolean {
  return actorKind === "SUPER_ADMIN" || permissions.has(permission);
}

function hasAll(
  actorKind: ActorKind,
  permissions: ReadonlySet<string>,
  required: readonly string[],
): boolean {
  return required.every((permission) =>
    hasPermission(actorKind, permissions, permission),
  );
}

function isPrivileged(
  actorKind: ActorKind,
  roles: ReadonlySet<string>,
): boolean {
  if (actorKind === "SUPER_ADMIN") return true;
  if (actorKind === "ADMIN") {
    return roles.has(ROLE.TENANT_ADMIN) || roles.has(ROLE.ORG_ADMIN);
  }
  return actorKind === "STAFF" && roles.has(ROLE.STAFF_MANAGER);
}

function forbidden(
  actorKind: ActorKind,
  role: string | null,
  scope: ErpActorScope,
  reason: string,
): DealerAdministrationAccess {
  return {
    kind: "forbidden",
    actorKind,
    role,
    scope,
    capabilities: NO_CAPABILITIES,
    reason,
  };
}

export function resolveDealerOnboardingAccess(
  me: MeResponse,
): DealerAdministrationAccess {
  const scope = erpActorScopeFromMe(me);
  const actorKind = me.auth?.actor.actorKind ?? scope.actorKind;
  const role = primaryRole(me);
  const permissions = effectivePermissions(me);
  const roles = effectiveRoles(me);

  if (
    actorKind !== "SUPER_ADMIN" &&
    actorKind !== "ADMIN" &&
    actorKind !== "STAFF"
  ) {
    return forbidden(
      actorKind,
      role,
      scope,
      "Dealer administration is restricted to authorized administrators and staff managers.",
    );
  }

  if (!isPrivileged(actorKind, roles)) {
    return forbidden(
      actorKind,
      role,
      scope,
      "Dealer administration requires super-admin, tenant/org-admin, or staff-manager authority.",
    );
  }

  const globallySelectedTenantId = me.tenant_id ?? scope.tenantId;
  if (globallySelectedTenantId === null) {
    if (actorKind === "SUPER_ADMIN") {
      return {
        kind: "context_required",
        actorKind,
        role,
        scope,
        capabilities: NO_CAPABILITIES,
        reason:
          "Select a tenant using the global tenant switcher before opening dealer administration.",
      };
    }
    return forbidden(
      actorKind,
      role,
      scope,
      "Dealer administration requires a globally selected tenant context.",
    );
  }

  if (
    actorKind !== "SUPER_ADMIN" &&
    scope.tenantId !== null &&
    globallySelectedTenantId !== scope.tenantId
  ) {
    return forbidden(
      actorKind,
      role,
      scope,
      "The globally selected tenant does not match the authenticated actor tenant.",
    );
  }

  const canReadDirectory = hasAll(actorKind, permissions, [
    PERMISSION.DEALER_READ,
    PERMISSION.ORGANIZATION_UNIT_READ,
    PERMISSION.DEALER_USER_READ,
  ]);
  const canOnboard = hasPermission(
    actorKind,
    permissions,
    PERMISSION.DEALER_CREATE,
  );
  const canProvision = hasAll(actorKind, permissions, [
    PERMISSION.DEALER_CREATE,
    PERMISSION.DEALER_USER_CREATE,
    PERMISSION.ORGANIZATION_UNIT_CREATE,
    PERMISSION.AUTH_USER_CREATE,
    PERMISSION.AUTH_ROLE_ASSIGN,
  ]);
  const canUpdateDealer =
    canReadDirectory &&
    hasAll(actorKind, permissions, [
      PERMISSION.DEALER_UPDATE,
      PERMISSION.DEALER_DISABLE,
      PERMISSION.ORGANIZATION_UNIT_UPDATE,
      PERMISSION.AUTH_USER_UPDATE,
    ]);
  const canUpdateMargins =
    canReadDirectory &&
    hasPermission(actorKind, permissions, PERMISSION.DEALER_UPDATE);
  const canManageContacts =
    canReadDirectory &&
    hasAll(actorKind, permissions, [
      PERMISSION.DEALER_USER_CREATE,
      PERMISSION.DEALER_USER_UPDATE,
      PERMISSION.AUTH_USER_CREATE,
      PERMISSION.AUTH_USER_UPDATE,
    ]);
  const canReadWallets =
    canReadDirectory &&
    hasPermission(actorKind, permissions, PERMISSION.WALLET_READ);
  const canReadWelfare =
    canReadWallets &&
    hasPermission(actorKind, permissions, PERMISSION.WELFARE_ACCRUAL_READ);
  const canReadDocuments =
    canReadDirectory &&
    hasPermission(actorKind, permissions, PERMISSION.FILE_READ);
  const canManageDocuments =
    canReadDocuments &&
    hasAll(actorKind, permissions, [
      PERMISSION.DEALER_UPDATE,
      PERMISSION.FILE_UPLOAD,
      PERMISSION.FILE_SIGNED_URL_CREATE,
    ]);

  if (!canReadDirectory) {
    return forbidden(
      actorKind,
      role,
      scope,
      "The active actor does not have the complete dealer-directory read permission set required by this workspace.",
    );
  }

  const actorContext: ServerActorContextHeaders | undefined =
    actorKind === "SUPER_ADMIN"
      ? { tenantId: globallySelectedTenantId }
      : undefined;

  return {
    kind: "resolved",
    actorKind,
    role,
    tenantId: globallySelectedTenantId,
    scope: { ...scope, tenantId: globallySelectedTenantId },
    ...(actorContext === undefined ? {} : { actorContext }),
    capabilities: {
      canReadDirectory,
      canOnboard,
      canProvision,
      canUseGstinPrefill: canOnboard,
      canUpdateDealer,
      canUpdateMargins,
      canManageContacts,
      canReadWallets,
      canReadWelfare,
      canReadDocuments,
      canManageDocuments,
    },
  };
}

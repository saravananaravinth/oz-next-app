// oz-next-app/src/features/engagement/dealership-application-operations/policies/dealership-application.policy.ts
import type { ActorKind, MeResponse } from "@/lib/api/contracts";
import type { ServerActorContextHeaders } from "@/server/api/request-context-headers";

import type { ErpActorScope } from "@/features/erp-core/contracts/erp-common.schema";
import { erpActorScopeFromMe } from "@/features/erp-core/queries/erp-query-scope";

const PERMISSION = {
  DASHBOARD_READ: "engagement:dealership-application:dashboard:read",
  APPLICATION_READ: "engagement:dealership-application:read",
  ASSIGN: "engagement:dealership-application:assign",
  EVALUATE: "engagement:dealership-application:evaluate",
  ACTIVITY_MANAGE: "engagement:dealership-application:activity:manage",
  DOCUMENT_MANAGE: "engagement:dealership-application:document:manage",
  APPROVE: "engagement:dealership-application:approve",
  ONBOARDING_MANAGE: "engagement:dealership-onboarding:manage",
  DEALER_PROVISION: "engagement:dealership-onboarding:dealer:provision",
  EXIT_MANAGE: "engagement:dealership-exit:manage",
  COMMUNICATION_SEND: "engagement:dealership-application:communication:send",
  CUSTOMER_CONTACT_READ: "engagement:customer-contact:read",
  COMMUNICATION_CORE_SEND: "communication:send",
  DEALER_CREATE: "dealer:create",
  DEALER_DISABLE: "dealer:disable",
  DEALER_USER_READ: "dealer:user:read",
  DEALER_USER_CREATE: "dealer:user:create",
  DEALER_USER_UPDATE: "dealer:user:update",
  AUTH_USER_CREATE: "auth:user:create",
  AUTH_USER_UPDATE: "auth:user:update",
  AUTH_USER_DISABLE: "auth:user:disable",
  AUTH_ROLE_ASSIGN: "auth:role:assign",
  AUTH_SESSION_REVOKE: "auth:session:revoke",
  ORGANIZATION_UNIT_CREATE: "organization:unit:create",
  ORGANIZATION_UNIT_UPDATE: "organization:unit:update",
  ORGANIZATION_UNIT_READ: "organization:unit:read",
  DEALER_READ: "dealer:read",
  DEALER_UPDATE: "dealer:update",
  FILE_READ: "file:read",
  FILE_UPLOAD: "file:upload",
  FILE_SIGNED_URL_CREATE: "file:signed-url:create",
} as const;

const ROLE = {
  STAFF: "staff",
  STAFF_MANAGER: "staff_manager",
} as const;

export type DealershipApplicationCapabilities = Readonly<{
  canReadDashboard: boolean;
  canReadApplications: boolean;
  canAssign: boolean;
  canManageDistrictAssignments: boolean;
  canEvaluate: boolean;
  canManageActivities: boolean;
  canManageDocuments: boolean;
  canApprove: boolean;
  canManageOnboarding: boolean;
  canProvisionDealer: boolean;
  canManageExit: boolean;
  canCommunicate: boolean;
  canReadDealers: boolean;
  canUpdateDealers: boolean;
  canManageDealerUsers: boolean;
  canManageDealerMargins: boolean;
  canDirectOnboard: boolean;
  canUploadDealerFiles: boolean;
}>;

export type ResolvedDealershipApplicationAccess = Readonly<{
  kind: "resolved";
  actorKind: Extract<ActorKind, "SUPER_ADMIN" | "ADMIN" | "STAFF">;
  role: string | null;
  tenantId: string;
  scope: ErpActorScope;
  capabilities: DealershipApplicationCapabilities;
  actorContext?: ServerActorContextHeaders;
}>;

export type DealershipApplicationAccess =
  | ResolvedDealershipApplicationAccess
  | Readonly<{
      kind: "context_required";
      actorKind: "SUPER_ADMIN";
      role: string | null;
      scope: ErpActorScope;
      capabilities: DealershipApplicationCapabilities;
    }>
  | Readonly<{
      kind: "forbidden";
      actorKind: ActorKind;
      role: string | null;
      scope: ErpActorScope;
      capabilities: DealershipApplicationCapabilities;
      reason: string;
    }>;

const NO_CAPABILITIES = {
  canReadDashboard: false,
  canReadApplications: false,
  canAssign: false,
  canManageDistrictAssignments: false,
  canEvaluate: false,
  canManageActivities: false,
  canManageDocuments: false,
  canApprove: false,
  canManageOnboarding: false,
  canProvisionDealer: false,
  canManageExit: false,
  canCommunicate: false,
  canReadDealers: false,
  canUpdateDealers: false,
  canManageDealerUsers: false,
  canManageDealerMargins: false,
  canDirectOnboard: false,
  canUploadDealerFiles: false,
} as const satisfies DealershipApplicationCapabilities;

function normalized(values: readonly string[]): ReadonlySet<string> {
  return new Set(values.map((value) => value.trim().toLowerCase()));
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

function hasAllPermissions(
  actorKind: ActorKind,
  permissions: ReadonlySet<string>,
  required: readonly string[],
): boolean {
  return required.every((permission) =>
    hasPermission(actorKind, permissions, permission),
  );
}

function forbidden(
  actorKind: ActorKind,
  role: string | null,
  scope: ErpActorScope,
  reason: string,
): DealershipApplicationAccess {
  return {
    kind: "forbidden",
    actorKind,
    role,
    scope,
    capabilities: NO_CAPABILITIES,
    reason,
  };
}

export function resolveDealershipApplicationAccess(
  me: MeResponse,
): DealershipApplicationAccess {
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
      "Dealership applications are restricted to authorized administrators and staff.",
    );
  }

  if (
    actorKind === "STAFF" &&
    !roles.has(ROLE.STAFF) &&
    !roles.has(ROLE.STAFF_MANAGER)
  ) {
    return forbidden(
      actorKind,
      role,
      scope,
      "Staff access requires the staff or staff_manager role.",
    );
  }

  if (!hasPermission(actorKind, permissions, PERMISSION.DASHBOARD_READ)) {
    return forbidden(
      actorKind,
      role,
      scope,
      "The active actor does not have dealership-application dashboard access.",
    );
  }

  const selectedTenantId = me.tenant_id ?? scope.tenantId;

  if (selectedTenantId === null) {
    if (actorKind === "SUPER_ADMIN") {
      return {
        kind: "context_required",
        actorKind,
        role,
        scope,
        capabilities: NO_CAPABILITIES,
      };
    }

    return forbidden(
      actorKind,
      role,
      scope,
      "A selected tenant context is required.",
    );
  }

  if (
    actorKind !== "SUPER_ADMIN" &&
    scope.tenantId !== null &&
    selectedTenantId !== scope.tenantId
  ) {
    return forbidden(
      actorKind,
      role,
      scope,
      "The selected tenant does not match the authenticated tenant scope.",
    );
  }

  const canReadApplications = hasAllPermissions(actorKind, permissions, [
    PERMISSION.APPLICATION_READ,
    PERMISSION.CUSTOMER_CONTACT_READ,
  ]);
  const canManageOnboarding = hasPermission(
    actorKind,
    permissions,
    PERMISSION.ONBOARDING_MANAGE,
  );
  const canManageExit = hasAllPermissions(actorKind, permissions, [
    PERMISSION.EXIT_MANAGE,
    PERMISSION.DEALER_DISABLE,
    PERMISSION.AUTH_USER_DISABLE,
    PERMISSION.AUTH_SESSION_REVOKE,
    PERMISSION.ORGANIZATION_UNIT_UPDATE,
  ]);
  const canProvisionDealer = hasAllPermissions(actorKind, permissions, [
    PERMISSION.DEALER_PROVISION,
    PERMISSION.DEALER_CREATE,
    PERMISSION.DEALER_USER_CREATE,
    PERMISSION.ORGANIZATION_UNIT_CREATE,
    PERMISSION.AUTH_USER_CREATE,
    PERMISSION.AUTH_ROLE_ASSIGN,
  ]);
  const canCommunicate = hasAllPermissions(actorKind, permissions, [
    PERMISSION.COMMUNICATION_SEND,
    PERMISSION.COMMUNICATION_CORE_SEND,
    PERMISSION.CUSTOMER_CONTACT_READ,
  ]);
  const canReadDealers = hasAllPermissions(actorKind, permissions, [
    PERMISSION.DEALER_READ,
    PERMISSION.ORGANIZATION_UNIT_READ,
    PERMISSION.DEALER_USER_READ,
  ]);
  const canUpdateDealers = hasAllPermissions(actorKind, permissions, [
    PERMISSION.DEALER_READ,
    PERMISSION.DEALER_UPDATE,
    PERMISSION.DEALER_DISABLE,
    PERMISSION.ORGANIZATION_UNIT_READ,
    PERMISSION.ORGANIZATION_UNIT_UPDATE,
  ]);
  const canManageDealerUsers = hasAllPermissions(actorKind, permissions, [
    PERMISSION.DEALER_READ,
    PERMISSION.DEALER_USER_READ,
    PERMISSION.DEALER_USER_CREATE,
    PERMISSION.DEALER_USER_UPDATE,
    PERMISSION.AUTH_USER_CREATE,
    PERMISSION.AUTH_USER_UPDATE,
    PERMISSION.AUTH_USER_DISABLE,
    PERMISSION.AUTH_ROLE_ASSIGN,
    PERMISSION.AUTH_SESSION_REVOKE,
    PERMISSION.ORGANIZATION_UNIT_READ,
  ]);
  const canUploadDealerFiles = hasAllPermissions(actorKind, permissions, [
    PERMISSION.FILE_READ,
    PERMISSION.FILE_UPLOAD,
    PERMISSION.FILE_SIGNED_URL_CREATE,
  ]);
  const canDirectOnboard =
    canReadDealers &&
    canProvisionDealer &&
    canManageOnboarding &&
    (actorKind !== "STAFF" || roles.has(ROLE.STAFF_MANAGER));
  const actorContext: ServerActorContextHeaders | undefined =
    actorKind === "SUPER_ADMIN" ? { tenantId: selectedTenantId } : undefined;

  return {
    kind: "resolved",
    actorKind,
    role,
    tenantId: selectedTenantId,
    scope: { ...scope, tenantId: selectedTenantId },
    ...(actorContext === undefined ? {} : { actorContext }),
    capabilities: {
      canReadDashboard: true,
      canReadApplications,
      canAssign: hasPermission(actorKind, permissions, PERMISSION.ASSIGN),
      canManageDistrictAssignments:
        hasPermission(actorKind, permissions, PERMISSION.ASSIGN) &&
        (actorKind !== "STAFF" || roles.has(ROLE.STAFF_MANAGER)),
      canEvaluate: hasPermission(actorKind, permissions, PERMISSION.EVALUATE),
      canManageActivities: hasPermission(
        actorKind,
        permissions,
        PERMISSION.ACTIVITY_MANAGE,
      ),
      canManageDocuments: hasPermission(
        actorKind,
        permissions,
        PERMISSION.DOCUMENT_MANAGE,
      ),
      canApprove: hasPermission(actorKind, permissions, PERMISSION.APPROVE),
      canManageOnboarding,
      canProvisionDealer,
      canManageExit,
      canCommunicate,
      canReadDealers,
      canUpdateDealers,
      canManageDealerUsers,
      canManageDealerMargins: canUpdateDealers,
      canDirectOnboard,
      canUploadDealerFiles,
    },
  };
}

// oz-next-app/src/features/engagement/dealer-dashboard/access.ts
import type { ActorKind, MeResponse } from "@/lib/api/schemas";
import type { ServerActorContextHeaders } from "@/server/api/request-context";
import { erpActorScopeFromMe } from "@/features/erp/shared/queries/erp-query-scope";
import type { ErpActorScope } from "@/features/erp/shared/schemas/erp-common.schema";

import {
  DEALER_DASHBOARD_ROLE,
  dealerDashboardContextSchema,
  type DealerDashboardContext,
} from "./schemas";

const PERMISSION = {
  DASHBOARD_READ: "engagement:dashboard:read",
  OWNER_GUIDE_READ: "engagement:owner-guide:read",
  OWNER_GUIDE_CREATE: "engagement:owner-guide:create",
  OWNER_GUIDE_UPDATE: "engagement:owner-guide:update",
  OWNER_GUIDE_DISABLE: "engagement:owner-guide:disable",
} as const;

export type DealerDashboardCapabilities = Readonly<{
  canViewDashboard: boolean;
  canReadOwnerGuides: boolean;
  canCreateOwnerGuide: boolean;
  canUpdateOwnerGuide: boolean;
  canDisableOwnerGuide: boolean;
  canSendOwnerGuideAppLink: boolean;
  canReadOwnerGuideSettings: boolean;
  canUpdateOwnerGuideSettings: boolean;
}>;

export type ResolvedDealerDashboardAccess = Readonly<{
  kind: "dealer" | "contextual";
  actorKind: ActorKind;
  role: string | null;
  scope: ErpActorScope;
  actorContext?: ServerActorContextHeaders;
  context: DealerDashboardContext;
  capabilities: DealerDashboardCapabilities;
}>;

export type DealerDashboardAccess =
  | ResolvedDealerDashboardAccess
  | Readonly<{
      kind: "context_required";
      actorKind: Extract<ActorKind, "SUPER_ADMIN" | "ADMIN" | "STAFF">;
      role: string | null;
      scope: ErpActorScope;
      capabilities: DealerDashboardCapabilities;
    }>
  | Readonly<{
      kind: "unsupported";
      actorKind: ActorKind;
      role: string | null;
      scope: ErpActorScope;
      capabilities: DealerDashboardCapabilities;
    }>;

const NO_CAPABILITIES = {
  canViewDashboard: false,
  canReadOwnerGuides: false,
  canCreateOwnerGuide: false,
  canUpdateOwnerGuide: false,
  canDisableOwnerGuide: false,
  canSendOwnerGuideAppLink: false,
  canReadOwnerGuideSettings: false,
  canUpdateOwnerGuideSettings: false,
} as const satisfies DealerDashboardCapabilities;

const DEALER_STAFF_CAPABILITIES = {
  ...NO_CAPABILITIES,
  canViewDashboard: true,
  canReadOwnerGuides: true,
} as const satisfies DealerDashboardCapabilities;

const DEALER_ADMIN_CAPABILITIES = {
  ...DEALER_STAFF_CAPABILITIES,
  canCreateOwnerGuide: true,
  canUpdateOwnerGuide: true,
  canDisableOwnerGuide: true,
  canSendOwnerGuideAppLink: true,
} as const satisfies DealerDashboardCapabilities;

const SUPER_ADMIN_CAPABILITIES = {
  canViewDashboard: true,
  canReadOwnerGuides: true,
  canCreateOwnerGuide: true,
  canUpdateOwnerGuide: true,
  canDisableOwnerGuide: true,
  canSendOwnerGuideAppLink: true,
  canReadOwnerGuideSettings: true,
  canUpdateOwnerGuideSettings: true,
} as const satisfies DealerDashboardCapabilities;

function normalizedRoles(me: MeResponse): ReadonlySet<string> {
  const canonicalRoles = me.auth?.actor.roles ?? [];

  return new Set(
    [...me.roles, ...canonicalRoles].map((role) => role.trim().toLowerCase()),
  );
}

function effectivePermissions(me: MeResponse): ReadonlySet<string> {
  const canonicalPermissions = me.auth?.effectivePermissions ?? [];

  return new Set(
    [...me.permissions, ...canonicalPermissions].map((permission) =>
      permission.trim().toLowerCase(),
    ),
  );
}

function actorKind(me: MeResponse, scope: ErpActorScope): ActorKind {
  return me.auth?.actor.actorKind ?? scope.actorKind;
}

function primaryRole(me: MeResponse): string | null {
  return me.primary_role ?? me.roles[0] ?? me.auth?.actor.roles[0] ?? null;
}

function hasPermission(
  permissions: ReadonlySet<string>,
  permission: string,
): boolean {
  return permissions.has(permission);
}

function permissionCapabilities(
  permissions: ReadonlySet<string>,
): DealerDashboardCapabilities {
  const canUpdateOwnerGuide = hasPermission(
    permissions,
    PERMISSION.OWNER_GUIDE_UPDATE,
  );

  return {
    canViewDashboard: hasPermission(permissions, PERMISSION.DASHBOARD_READ),
    canReadOwnerGuides: hasPermission(permissions, PERMISSION.OWNER_GUIDE_READ),
    canCreateOwnerGuide: hasPermission(
      permissions,
      PERMISSION.OWNER_GUIDE_CREATE,
    ),
    canUpdateOwnerGuide,
    canDisableOwnerGuide: hasPermission(
      permissions,
      PERMISSION.OWNER_GUIDE_DISABLE,
    ),
    canSendOwnerGuideAppLink: canUpdateOwnerGuide,
    canReadOwnerGuideSettings: hasPermission(
      permissions,
      PERMISSION.OWNER_GUIDE_READ,
    ),
    canUpdateOwnerGuideSettings: canUpdateOwnerGuide,
  };
}

function selectedContextOrNull(
  selectedContext: DealerDashboardContext | undefined,
): DealerDashboardContext | null {
  if (selectedContext === undefined) {
    return null;
  }

  const parsed = dealerDashboardContextSchema.safeParse(selectedContext);
  return parsed.success ? parsed.data : null;
}

export function resolveDealerDashboardAccess(
  me: MeResponse,
  selectedContext?: DealerDashboardContext,
): DealerDashboardAccess {
  const scope = erpActorScopeFromMe(me);
  const resolvedActorKind = actorKind(me, scope);
  const role = primaryRole(me);
  const roles = normalizedRoles(me);

  if (resolvedActorKind === "DEALER") {
    const tenantId = scope.tenantId;
    const dealerOrgUnitId = scope.dealerOrgUnitId;
    const isDealerAdmin = roles.has(DEALER_DASHBOARD_ROLE.DEALER_ADMIN);
    const isDealerStaff = roles.has(DEALER_DASHBOARD_ROLE.DEALER_STAFF);

    if (
      tenantId === null ||
      dealerOrgUnitId === null ||
      (!isDealerAdmin && !isDealerStaff)
    ) {
      return {
        kind: "unsupported",
        actorKind: resolvedActorKind,
        role,
        scope,
        capabilities: NO_CAPABILITIES,
      };
    }

    return {
      kind: "dealer",
      actorKind: resolvedActorKind,
      role,
      scope,
      context: { tenantId, dealerOrgUnitId },
      capabilities: isDealerAdmin
        ? DEALER_ADMIN_CAPABILITIES
        : DEALER_STAFF_CAPABILITIES,
    };
  }

  if (resolvedActorKind === "SUPER_ADMIN") {
    const context = selectedContextOrNull(selectedContext);

    if (context === null) {
      return {
        kind: "context_required",
        actorKind: resolvedActorKind,
        role,
        scope,
        capabilities: NO_CAPABILITIES,
      };
    }

    return {
      kind: "contextual",
      actorKind: resolvedActorKind,
      role,
      scope,
      actorContext: {
        tenantId: context.tenantId,
        dealerOrgUnitId: context.dealerOrgUnitId,
      },
      context,
      capabilities: SUPER_ADMIN_CAPABILITIES,
    };
  }

  if (resolvedActorKind === "ADMIN" || resolvedActorKind === "STAFF") {
    const context = selectedContextOrNull(selectedContext);
    const tenantId = scope.tenantId;
    const capabilities = permissionCapabilities(effectivePermissions(me));

    if (tenantId === null || context?.tenantId !== tenantId) {
      return {
        kind: "context_required",
        actorKind: resolvedActorKind,
        role,
        scope,
        capabilities: NO_CAPABILITIES,
      };
    }

    if (!capabilities.canViewDashboard) {
      return {
        kind: "unsupported",
        actorKind: resolvedActorKind,
        role,
        scope,
        capabilities: NO_CAPABILITIES,
      };
    }

    return {
      kind: "contextual",
      actorKind: resolvedActorKind,
      role,
      scope,
      actorContext: {
        tenantId,
        dealerOrgUnitId: context.dealerOrgUnitId,
      },
      context,
      capabilities,
    };
  }

  return {
    kind: "unsupported",
    actorKind: resolvedActorKind,
    role,
    scope,
    capabilities: NO_CAPABILITIES,
  };
}

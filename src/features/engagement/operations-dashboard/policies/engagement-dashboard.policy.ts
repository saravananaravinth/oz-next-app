// oz-next-app/src/features/engagement/operations-dashboard/policies/engagement-dashboard.policy.ts
import type { ActorKind, MeResponse } from "@/lib/api/contracts";
import type { ServerActorContextHeaders } from "@/server/api/request-context-headers";

import type { ErpActorScope } from "@/features/erp-core/contracts/erp-common.schema";
import { erpActorScopeFromMe } from "@/features/erp-core/queries/erp-query-scope";

const PERMISSION = {
  DASHBOARD_READ: "engagement:dashboard:read",
  DEALER_PERFORMANCE_READ: "engagement:dealer-performance:read",
  LEAD_READ: "engagement:lead:read",
  CUSTOMER_CONTACT_READ: "engagement:customer-contact:read",
  LEAD_UPDATE: "engagement:lead:update",
  SUPPORT_READ: "engagement:support:read",
  SUPPORT_INTERVENE: "engagement:support:intervene",
  LEAD_REASSIGN: "engagement:lead:reassign",
  CRM_LEAD_UPDATE: "crm:lead:update",
  CRM_LEAD_ASSIGN: "crm:lead:assign",
  DELIVERY_RETRY: "engagement:delivery:retry",
  TASK_RETRY: "task:retry",
  DEALER_SETTINGS_UPDATE: "engagement:dealer-settings:update",
  DEALER_UPDATE: "dealer:update",
  ORGANIZATION_UNIT_UPDATE: "organization:unit:update",
  VIDEO_SEQUENCE_READ: "engagement:video-sequence:read",
  VIDEO_SEQUENCE_UPDATE: "engagement:video-sequence:update",
} as const;

const ROLE = {
  STAFF: "staff",
  STAFF_MANAGER: "staff_manager",
} as const;

export type EngagementDashboardCapabilities = Readonly<{
  canReadDashboard: boolean;
  canReadDealerPerformance: boolean;
  canReadLeads: boolean;
  canReadCustomerContact: boolean;
  canUpdateLeads: boolean;
  canReadIssues: boolean;
  canIntervene: boolean;
  canReassignLead: boolean;
  canRetryDelivery: boolean;
  canUpdateDealerSettings: boolean;
  canUpdateDealerLocation: boolean;
  canReadVideoSequences: boolean;
  canUpdateVideoSequences: boolean;
}>;

export type ResolvedEngagementDashboardAccess = Readonly<{
  kind: "resolved";
  actorKind: Extract<ActorKind, "SUPER_ADMIN" | "ADMIN" | "STAFF">;
  role: string | null;
  tenantId: string;
  scope: ErpActorScope;
  capabilities: EngagementDashboardCapabilities;
  actorContext?: ServerActorContextHeaders;
}>;

export type EngagementDashboardAccess =
  | ResolvedEngagementDashboardAccess
  | Readonly<{
      kind: "context_required";
      actorKind: "SUPER_ADMIN";
      role: string | null;
      scope: ErpActorScope;
      capabilities: EngagementDashboardCapabilities;
    }>
  | Readonly<{
      kind: "forbidden";
      actorKind: ActorKind;
      role: string | null;
      scope: ErpActorScope;
      capabilities: EngagementDashboardCapabilities;
      reason: string;
    }>;

const NO_CAPABILITIES = {
  canReadDashboard: false,
  canReadDealerPerformance: false,
  canReadLeads: false,
  canReadCustomerContact: false,
  canUpdateLeads: false,
  canReadIssues: false,
  canIntervene: false,
  canReassignLead: false,
  canRetryDelivery: false,
  canUpdateDealerSettings: false,
  canUpdateDealerLocation: false,
  canReadVideoSequences: false,
  canUpdateVideoSequences: false,
} as const satisfies EngagementDashboardCapabilities;

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

function forbidden(
  actorKind: ActorKind,
  role: string | null,
  scope: ErpActorScope,
  reason: string,
): EngagementDashboardAccess {
  return {
    kind: "forbidden",
    actorKind,
    role,
    scope,
    capabilities: NO_CAPABILITIES,
    reason,
  };
}

export function resolveEngagementDashboardAccess(
  me: MeResponse,
): EngagementDashboardAccess {
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
      "Vehicle-sales engagement operations are restricted to authorized staff and administrators.",
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
      "The active actor does not have engagement:dashboard:read.",
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
      };
    }

    return forbidden(
      actorKind,
      role,
      scope,
      "The application does not have a globally selected tenant context.",
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
      "The globally selected tenant does not match the authenticated tenant scope.",
    );
  }

  const canReadDealerPerformance = hasPermission(
    actorKind,
    permissions,
    PERMISSION.DEALER_PERFORMANCE_READ,
  );
  const canReadIssues = hasPermission(
    actorKind,
    permissions,
    PERMISSION.SUPPORT_READ,
  );
  const canIntervene =
    canReadIssues &&
    hasPermission(actorKind, permissions, PERMISSION.SUPPORT_INTERVENE);
  const canUpdateLeads =
    canIntervene &&
    hasPermission(actorKind, permissions, PERMISSION.LEAD_UPDATE) &&
    hasPermission(actorKind, permissions, PERMISSION.CRM_LEAD_UPDATE);
  const canReadVideoSequences = hasPermission(
    actorKind,
    permissions,
    PERMISSION.VIDEO_SEQUENCE_READ,
  );
  const actorContext: ServerActorContextHeaders | undefined =
    actorKind === "SUPER_ADMIN"
      ? { tenantId: globallySelectedTenantId }
      : undefined;
  const resolvedScope: ErpActorScope = {
    ...scope,
    tenantId: globallySelectedTenantId,
  };

  return {
    kind: "resolved",
    actorKind,
    role,
    tenantId: globallySelectedTenantId,
    scope: resolvedScope,
    ...(actorContext !== undefined ? { actorContext } : {}),
    capabilities: {
      canReadDashboard: true,
      canReadDealerPerformance,
      canReadLeads: hasPermission(actorKind, permissions, PERMISSION.LEAD_READ),
      canReadCustomerContact: hasPermission(
        actorKind,
        permissions,
        PERMISSION.CUSTOMER_CONTACT_READ,
      ),
      canUpdateLeads,
      canReadIssues,
      canIntervene,
      canReassignLead:
        canIntervene &&
        hasPermission(actorKind, permissions, PERMISSION.LEAD_REASSIGN) &&
        hasPermission(actorKind, permissions, PERMISSION.CRM_LEAD_ASSIGN),
      canRetryDelivery:
        canIntervene &&
        hasPermission(actorKind, permissions, PERMISSION.DELIVERY_RETRY) &&
        hasPermission(actorKind, permissions, PERMISSION.TASK_RETRY),
      canUpdateDealerSettings:
        canReadDealerPerformance &&
        hasPermission(
          actorKind,
          permissions,
          PERMISSION.DEALER_SETTINGS_UPDATE,
        ) &&
        hasPermission(actorKind, permissions, PERMISSION.DEALER_UPDATE),
      canUpdateDealerLocation:
        canReadDealerPerformance &&
        hasPermission(
          actorKind,
          permissions,
          PERMISSION.DEALER_SETTINGS_UPDATE,
        ) &&
        hasPermission(
          actorKind,
          permissions,
          PERMISSION.ORGANIZATION_UNIT_UPDATE,
        ),
      canReadVideoSequences,
      canUpdateVideoSequences:
        canReadVideoSequences &&
        hasPermission(actorKind, permissions, PERMISSION.VIDEO_SEQUENCE_UPDATE),
    },
  };
}

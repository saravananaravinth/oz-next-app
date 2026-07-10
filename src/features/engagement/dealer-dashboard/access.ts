// oz-next-app/src/features/engagement/dealer-dashboard/access.ts
import type { MeResponse } from "@/lib/api/schemas";
import type { ServerActorContextHeaders } from "@/server/api/request-context";
import { erpActorScopeFromMe } from "@/features/erp/shared/queries/erp-query-scope";
import type { ErpActorScope } from "@/features/erp/shared/schemas/erp-common.schema";

import {
  DEALER_DASHBOARD_ROLE,
  dealerDashboardContextSchema,
  type DealerDashboardContext,
} from "./schemas";

export type DealerDashboardCapabilities = Readonly<{
  canView: boolean;
  canManageOwnerGuides: boolean;
}>;

export type DealerDashboardAccess =
  | Readonly<{
      kind: "dealer";
      role:
        | typeof DEALER_DASHBOARD_ROLE.DEALER_ADMIN
        | typeof DEALER_DASHBOARD_ROLE.DEALER_STAFF;
      scope: ErpActorScope;
      actorContext: undefined;
      context: DealerDashboardContext;
      capabilities: DealerDashboardCapabilities;
    }>
  | Readonly<{
      kind: "super_admin";
      role: typeof DEALER_DASHBOARD_ROLE.SUPER_ADMIN;
      scope: ErpActorScope;
      actorContext: ServerActorContextHeaders;
      context: DealerDashboardContext;
      capabilities: DealerDashboardCapabilities;
    }>
  | Readonly<{
      kind: "super_admin_context_required";
      role: typeof DEALER_DASHBOARD_ROLE.SUPER_ADMIN;
      scope: ErpActorScope;
      capabilities: DealerDashboardCapabilities;
    }>
  | Readonly<{
      kind: "unsupported";
      role: null;
      scope: ErpActorScope;
      capabilities: DealerDashboardCapabilities;
    }>;

const NO_CAPABILITIES = {
  canView: false,
  canManageOwnerGuides: false,
} as const satisfies DealerDashboardCapabilities;

const DEALER_STAFF_CAPABILITIES = {
  canView: true,
  canManageOwnerGuides: false,
} as const satisfies DealerDashboardCapabilities;

const FULL_CAPABILITIES = {
  canView: true,
  canManageOwnerGuides: true,
} as const satisfies DealerDashboardCapabilities;

function normalizedRoles(me: MeResponse): ReadonlySet<string> {
  return new Set(me.roles.map((role) => role.trim().toLowerCase()));
}

function resolveRole(me: MeResponse): DealerDashboardAccess["role"] {
  const roles = normalizedRoles(me);

  if (roles.has(DEALER_DASHBOARD_ROLE.SUPER_ADMIN)) {
    return DEALER_DASHBOARD_ROLE.SUPER_ADMIN;
  }

  if (roles.has(DEALER_DASHBOARD_ROLE.DEALER_ADMIN)) {
    return DEALER_DASHBOARD_ROLE.DEALER_ADMIN;
  }

  if (roles.has(DEALER_DASHBOARD_ROLE.DEALER_STAFF)) {
    return DEALER_DASHBOARD_ROLE.DEALER_STAFF;
  }

  return null;
}

export function resolveDealerDashboardAccess(
  me: MeResponse,
  selectedContext?: DealerDashboardContext,
): DealerDashboardAccess {
  const scope = erpActorScopeFromMe(me);
  const role = resolveRole(me);

  if (role === DEALER_DASHBOARD_ROLE.SUPER_ADMIN) {
    const parsedContext =
      selectedContext === undefined
        ? null
        : dealerDashboardContextSchema.safeParse(selectedContext);

    if (parsedContext?.success !== true) {
      return {
        kind: "super_admin_context_required",
        role,
        scope,
        capabilities: NO_CAPABILITIES,
      };
    }

    return {
      kind: "super_admin",
      role,
      scope,
      actorContext: {
        tenantId: parsedContext.data.tenantId,
        dealerOrgUnitId: parsedContext.data.dealerOrgUnitId,
      },
      context: parsedContext.data,
      capabilities: FULL_CAPABILITIES,
    };
  }

  if (
    role === DEALER_DASHBOARD_ROLE.DEALER_ADMIN ||
    role === DEALER_DASHBOARD_ROLE.DEALER_STAFF
  ) {
    const tenantId = scope.tenantId;
    const dealerOrgUnitId = scope.dealerOrgUnitId;

    if (tenantId === null || dealerOrgUnitId === null) {
      return {
        kind: "unsupported",
        role: null,
        scope,
        capabilities: NO_CAPABILITIES,
      };
    }

    return {
      kind: "dealer",
      role,
      scope,
      actorContext: undefined,
      context: {
        tenantId,
        dealerOrgUnitId,
      },
      capabilities:
        role === DEALER_DASHBOARD_ROLE.DEALER_ADMIN
          ? FULL_CAPABILITIES
          : DEALER_STAFF_CAPABILITIES,
    };
  }

  return {
    kind: "unsupported",
    role: null,
    scope,
    capabilities: NO_CAPABILITIES,
  };
}

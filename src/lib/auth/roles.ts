// oz-next-app/src/lib/auth/roles.ts
export const ERP_ROLE = {
  SUPER_ADMIN: "super_admin",

  TENANT_ADMIN: "tenant_admin",
  ORG_ADMIN: "org_admin",

  STAFF_MANAGER: "staff_manager",
  AREA_SALES_MANAGER: "area_sales_manager",
  STAFF: "staff",

  PRODUCTION_MANAGER: "production_manager",
  PRODUCTION_OPERATOR: "production_operator",
  WAREHOUSE_MANAGER: "warehouse_manager",
  WAREHOUSE_OPERATOR: "warehouse_operator",
  FULFILLMENT_MANAGER: "fulfillment_manager",
  FULFILLMENT_OPERATOR: "fulfillment_operator",
  LOGISTICS_OPERATOR: "logistics_operator",
  COMMERCIAL_OPERATOR: "commercial_operator",

  DEALER_ADMIN: "dealer",
  DEALER_STAFF: "dealer_staff",

  FINANCIER_ADMIN: "financier_admin",
  FINANCIER_STAFF: "financier_staff",

  CUSTOMER: "customer",
  HAPPY_CUSTOMER: "happy_customer",

  SYSTEM_TASK: "system_task",
  SYSTEM_INTEGRATION: "system_integration",
} as const;

export type ErpRole = (typeof ERP_ROLE)[keyof typeof ERP_ROLE];

export const ERP_ROLES = [
  ERP_ROLE.SUPER_ADMIN,
  ERP_ROLE.TENANT_ADMIN,
  ERP_ROLE.ORG_ADMIN,
  ERP_ROLE.STAFF_MANAGER,
  ERP_ROLE.AREA_SALES_MANAGER,
  ERP_ROLE.STAFF,
  ERP_ROLE.PRODUCTION_MANAGER,
  ERP_ROLE.PRODUCTION_OPERATOR,
  ERP_ROLE.WAREHOUSE_MANAGER,
  ERP_ROLE.WAREHOUSE_OPERATOR,
  ERP_ROLE.FULFILLMENT_MANAGER,
  ERP_ROLE.FULFILLMENT_OPERATOR,
  ERP_ROLE.LOGISTICS_OPERATOR,
  ERP_ROLE.COMMERCIAL_OPERATOR,
  ERP_ROLE.DEALER_ADMIN,
  ERP_ROLE.DEALER_STAFF,
  ERP_ROLE.FINANCIER_ADMIN,
  ERP_ROLE.FINANCIER_STAFF,
  ERP_ROLE.CUSTOMER,
  ERP_ROLE.HAPPY_CUSTOMER,
  ERP_ROLE.SYSTEM_TASK,
  ERP_ROLE.SYSTEM_INTEGRATION,
] as const satisfies readonly ErpRole[];

export const LEGACY_ERP_ROLE = {
  DEALER_ADMIN: "dealer_admin",
} as const;

export type LegacyErpRole =
  (typeof LEGACY_ERP_ROLE)[keyof typeof LEGACY_ERP_ROLE];

const LEGACY_ROLE_ALIASES = {
  [LEGACY_ERP_ROLE.DEALER_ADMIN]: ERP_ROLE.DEALER_ADMIN,
} as const satisfies Readonly<Record<LegacyErpRole, ErpRole>>;

function normalizeRoleName(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

export function canonicalizeErpRoleName(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = normalizeRoleName(value);

  if (normalized.length === 0) {
    return null;
  }

  if (normalized === LEGACY_ERP_ROLE.DEALER_ADMIN) {
    return LEGACY_ROLE_ALIASES[LEGACY_ERP_ROLE.DEALER_ADMIN];
  }

  return normalized;
}

export function canonicalErpRoleSet(
  values: readonly string[],
): ReadonlySet<string> {
  const roles = new Set<string>();

  for (const value of values) {
    const canonical = canonicalizeErpRoleName(value);

    if (canonical !== null) {
      roles.add(canonical);
    }
  }

  return roles;
}

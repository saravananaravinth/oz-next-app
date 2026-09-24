// oz-next-app/src/features/extended-warranty/contracts/route-access.ts
export const EXTENDED_WARRANTY_ROUTE_PERMISSION = {
  OVERVIEW: "extended-warranty:read",
  ORDERS: "extended-warranty:order:read",
  REVIEWS: "extended-warranty:review",
  PAYMENTS: "payment:read",
  RECONCILIATION: "payment:read",
  PAYMENT_SETTINGS: "payment:configure",
} as const;

export type ExtendedWarrantyRoutePermission =
  (typeof EXTENDED_WARRANTY_ROUTE_PERMISSION)[keyof typeof EXTENDED_WARRANTY_ROUTE_PERMISSION];

export function hasRequiredExtendedWarrantyPermissions(
  effectivePermissions: readonly string[],
  requiredPermissions: readonly ExtendedWarrantyRoutePermission[],
): boolean {
  if (requiredPermissions.length === 0) return false;
  const effective = new Set(effectivePermissions);
  return requiredPermissions.every((permission) => effective.has(permission));
}

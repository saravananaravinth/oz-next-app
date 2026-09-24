// oz-next-app/src/features/extended-warranty/server/route-access.ts
import "server-only";

import { notFound } from "next/navigation";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  hasRequiredExtendedWarrantyPermissions,
  type ExtendedWarrantyRoutePermission,
} from "@/features/extended-warranty/contracts/route-access";
import {
  resolveTenantAccess,
  type TenantAccess,
} from "@/features/tenant-context";

export async function requireExtendedWarrantyRouteAccess(
  requiredPermissions: readonly ExtendedWarrantyRoutePermission[],
): Promise<TenantAccess> {
  const me = await requireAuthenticatedMe();
  if (
    !hasRequiredExtendedWarrantyPermissions(me.permissions, requiredPermissions)
  ) {
    notFound();
  }
  return resolveTenantAccess(me);
}

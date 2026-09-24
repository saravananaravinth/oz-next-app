// oz-next-app/src/features/extended-warranty/server/erp-workspace-shell.tsx
import "server-only";

import { notFound } from "next/navigation";
import type { ReactElement, ReactNode } from "react";

import type { ExtendedWarrantyRoutePermission } from "@/features/extended-warranty/contracts/route-access";
import { hasRequiredExtendedWarrantyPermissions } from "@/features/extended-warranty/contracts/route-access";
import { SidebarWrapper } from "@/features/app-shell/ui/sidebar-wrapper";
import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { erpActorScopeFromMe } from "@/features/erp-core/queries/erp-query-scope";
import { ErpActorScopeCacheBoundary } from "@/features/erp-core/ui/erp-actor-scope-cache-boundary";

const WORKSPACE_BRAND = {
  name: "Ozotec EV",
  tagline: "Enterprise workspace",
  logoLight: "/icon-light.svg",
  logoDark: "/icon-dark.svg",
} as const;

const EMPTY_NOTIFICATIONS = [] as const;

export async function ExtendedWarrantyErpWorkspaceShell({
  children,
  requiredPermissions,
}: Readonly<{
  children: ReactNode;
  requiredPermissions: readonly ExtendedWarrantyRoutePermission[];
}>): Promise<ReactElement> {
  const me = await requireAuthenticatedMe();
  if (
    !hasRequiredExtendedWarrantyPermissions(me.permissions, requiredPermissions)
  ) {
    notFound();
  }

  const actorScope = erpActorScopeFromMe(me);

  return (
    <ErpActorScopeCacheBoundary scope={actorScope}>
      <SidebarWrapper
        me={me}
        brandName={WORKSPACE_BRAND.name}
        brandTagline={WORKSPACE_BRAND.tagline}
        brandLogoLight={WORKSPACE_BRAND.logoLight}
        brandLogoDark={WORKSPACE_BRAND.logoDark}
        notifications={EMPTY_NOTIFICATIONS}
      >
        {children}
      </SidebarWrapper>
    </ErpActorScopeCacheBoundary>
  );
}

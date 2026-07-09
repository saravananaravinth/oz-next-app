// oz-next-app/src/components/app-shell/sidebar-wrapper.tsx
import type { ReactElement, ReactNode } from "react";

import { AppSidebar, type AuthInfo } from "@/components/app-shell/app-sidebar";
import { HeaderBar } from "@/components/app-shell/header-bar";
import type { NotificationItem } from "@/components/app-shell/notifications";
import type { SearchResult } from "@/components/app-shell/nav-search";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { MeResponse, MenuItem, TenantMembership } from "@/lib/api/schemas";

export type SidebarWrapperProps = Readonly<{
  children: ReactNode;
  me: MeResponse;
  brandName?: string;
  brandTagline?: string;
  brandLogoLight?: string;
  brandLogoDark?: string;
  searchResults?: readonly SearchResult[];
  notifications?: readonly NotificationItem[];
  onSignOut?: (() => void | Promise<void>) | undefined;
  signOutPending?: boolean | undefined;
  signOutDisabled?: boolean | undefined;
}>;

const FALLBACK_MENU_ITEM = {
  menuid: "dashboard",
  title: "Dashboard",
  url: "/dashboard",
  menugroup: "Workspace",
  sortorder: 0,
  isvisible: true,
  isactive: true,
  icon: "LayoutDashboard",
  description: "Workspace overview",
} satisfies MenuItem;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeText(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim().replace(/\s+/gu, " ") ?? "";

  return normalized.length > 0 ? normalized : fallback;
}

function normalizeRoles(values: readonly string[]): readonly string[] {
  const roles: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = value.trim().replace(/\s+/gu, " ");

    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    roles.push(normalized);
  }

  return roles;
}

function authInfoFromMe(me: MeResponse): AuthInfo {
  const displayName = safeText(me.display_name, "ERP User");
  const roles = normalizeRoles(me.roles);
  const primaryRole = safeText(me.primary_role, roles[0] ?? "Workspace user");

  return {
    id: safeText(me.user_id, "unknown"),
    name: displayName,
    email: me.primary_email ?? null,
    avatar: me.picture_url ?? null,
    roles,
    primaryRole,
    activeRole: primaryRole,
  };
}

function isMenuItem(value: unknown): value is MenuItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value["menuid"] === "string" &&
    typeof value["title"] === "string" &&
    typeof value["url"] === "string" &&
    typeof value["menugroup"] === "string" &&
    typeof value["sortorder"] === "number" &&
    typeof value["isvisible"] === "boolean" &&
    typeof value["isactive"] === "boolean"
  );
}

function isTenantMembership(value: unknown): value is TenantMembership {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value["tenant_id"] === "string" &&
    typeof value["tenant_name"] === "string"
  );
}

function menusFromMe(me: MeResponse): readonly MenuItem[] {
  const rawMenus: unknown = me.menus;

  if (Array.isArray(rawMenus) && rawMenus.length > 0) {
    const menus = rawMenus.filter(isMenuItem);

    if (menus.length > 0) {
      return menus;
    }
  }

  return [FALLBACK_MENU_ITEM];
}

function tenantsFromMe(me: MeResponse): readonly TenantMembership[] {
  const rawTenants: unknown = me.tenants;

  if (!Array.isArray(rawTenants)) {
    return [];
  }

  return rawTenants.filter(isTenantMembership);
}

export function SidebarWrapper({
  children,
  me,
  brandName,
  brandTagline,
  brandLogoLight,
  brandLogoDark,
  searchResults,
  notifications,
  onSignOut,
  signOutPending,
  signOutDisabled,
}: SidebarWrapperProps): ReactElement {
  const auth = authInfoFromMe(me);
  const tenants = tenantsFromMe(me);

  return (
    <SidebarProvider>
      <AppSidebar
        auth={auth}
        menus={menusFromMe(me)}
        {...(onSignOut !== undefined ? { onSignOut } : {})}
        {...(signOutPending !== undefined ? { signOutPending } : {})}
        {...(signOutDisabled !== undefined ? { signOutDisabled } : {})}
        {...(brandName !== undefined ? { brandName } : {})}
        {...(brandTagline !== undefined ? { brandTagline } : {})}
        {...(brandLogoLight !== undefined ? { brandLogoLight } : {})}
        {...(brandLogoDark !== undefined ? { brandLogoDark } : {})}
      />

      <SidebarInset>
        <HeaderBar
          {...(searchResults !== undefined ? { searchResults } : {})}
          {...(notifications !== undefined ? { notifications } : {})}
          tenants={tenants}
          currentTenantId={me.tenant_id}
        />
        <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

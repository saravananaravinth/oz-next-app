// oz-next-app/src/features/app-shell/ui/sidebar-wrapper.tsx
import type { ReactElement, ReactNode } from "react";

import { AppSidebar, type AuthInfo } from "@/features/app-shell/ui/app-sidebar";
import { HeaderBar } from "@/features/app-shell/ui/header-bar";
import type { NotificationItem } from "@/features/app-shell/ui/notifications";
import type { SearchResult } from "@/features/app-shell/ui/nav-search";
import {
  cleanDisplayText,
  formatRoleLabel,
  formatUniqueRoleLabels,
} from "@/components/common/display-label";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type {
  MeResponse,
  MenuItem,
  TenantMembership,
} from "@/lib/api/contracts";

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

const MAX_ID_LENGTH = 160;
const MAX_TENANT_COUNT = 100;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function authInfoFromMe(me: MeResponse): AuthInfo {
  const displayName = cleanDisplayText(me.display_name, "ERP User");
  const roles = formatUniqueRoleLabels(me.roles);
  const primaryRole = formatRoleLabel(
    me.primary_role,
    roles[0] ?? "Workspace user",
  );

  return {
    id: cleanDisplayText(me.user_id, "unknown", MAX_ID_LENGTH),
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
    (value["menugroup"] === undefined ||
      value["menugroup"] === null ||
      typeof value["menugroup"] === "string") &&
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

  return rawTenants.filter(isTenantMembership).slice(0, MAX_TENANT_COUNT);
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
    <SidebarProvider className="h-dvh min-h-0 overflow-hidden print:h-auto print:overflow-visible">
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

      <SidebarInset
        aria-label="Application workspace"
        className="min-h-0 overflow-hidden print:overflow-visible"
      >
        <HeaderBar
          {...(searchResults !== undefined ? { searchResults } : {})}
          {...(notifications !== undefined ? { notifications } : {})}
          tenants={tenants}
          currentTenantId={me.tenant_id ?? null}
        />
        <div
          id="main-content"
          tabIndex={-1}
          data-slot="app-shell-content"
          className="scrollbar-compact min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/35 print:overflow-visible sm:px-6 lg:px-8"
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

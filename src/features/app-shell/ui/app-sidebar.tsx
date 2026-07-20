// oz-next-app/src/features/app-shell/ui/app-sidebar.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  NavMain,
  type Item as NavItem,
} from "@/features/app-shell/ui/nav-main";
import { NavUser } from "@/features/app-shell/ui/nav-user";
import {
  cleanDisplayText,
  formatRoleLabel,
  formatUniqueRoleLabels,
} from "@/components/common/display-label";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import type { MenuItem } from "@/lib/api/contracts";
import { safeAssetPath, safeInternalHref } from "@/lib/security/navigation";
import { cn } from "@/lib/utils";

export type AuthInfo = Readonly<{
  id: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
  roles: readonly string[];
  activeRole?: string;
  primaryRole?: string | null;
}>;

export type AppSidebarProps = React.ComponentProps<typeof Sidebar> &
  Readonly<{
    auth: AuthInfo;
    menus: readonly MenuItem[];
    isLoadingNav?: boolean;
    onSignOut?: (() => void | Promise<void>) | undefined;
    signOutPending?: boolean | undefined;
    signOutDisabled?: boolean | undefined;
    brandName?: string;
    brandTagline?: string;
    brandLogoLight?: string;
    brandLogoDark?: string;
  }>;

type NavGroup = Readonly<{
  label: string;
  items: readonly NavItem[];
}>;

type NormalizedBrand = Readonly<{
  name: string;
  tagline: string;
  logoLight: `/${string}`;
  logoDark: `/${string}`;
}>;

type BrandInput = Readonly<{
  brandName: string | undefined;
  brandTagline: string | undefined;
  brandLogoLight: string | undefined;
  brandLogoDark: string | undefined;
}>;

const DEFAULT_BRAND = {
  name: "Ozotec EV",
  tagline: "Enterprise workspace",
  logoLight: "/icon-light.svg",
  logoDark: "/icon-dark.svg",
} as const satisfies NormalizedBrand;

const MAX_MENU_COUNT = 700;
const MAX_TEXT_LENGTH = 160;
const MAX_QUERY_LENGTH = 80;

const ASCII_CONTROL_MAX_CODE_POINT = 0x1f;
const ASCII_DELETE_CODE_POINT = 0x7f;
const WHITESPACE_RE = /\s+/gu;

function replaceControlCharacters(value: string): string {
  let output = "";
  let changed = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? "";
    const codePoint = value.charCodeAt(index);

    if (
      codePoint <= ASCII_CONTROL_MAX_CODE_POINT ||
      codePoint === ASCII_DELETE_CODE_POINT
    ) {
      output += " ";
      changed = true;
      continue;
    }

    output += character;
  }

  return changed ? output : value;
}

function cleanText(value: string | null | undefined, fallback = ""): string {
  const normalized = replaceControlCharacters(value ?? "")
    .trim()
    .replace(WHITESPACE_RE, " ");

  if (normalized.length === 0) {
    return fallback;
  }

  return normalized.length <= MAX_TEXT_LENGTH
    ? normalized
    : `${normalized.slice(0, MAX_TEXT_LENGTH - 1).trimEnd()}…`;
}

function normalizeBrand(input: BrandInput): NormalizedBrand {
  return {
    name: cleanDisplayText(
      input.brandName,
      DEFAULT_BRAND.name,
      MAX_TEXT_LENGTH,
    ),
    tagline: cleanDisplayText(
      input.brandTagline,
      DEFAULT_BRAND.tagline,
      MAX_TEXT_LENGTH,
    ),
    logoLight: safeAssetPath(input.brandLogoLight, DEFAULT_BRAND.logoLight),
    logoDark: safeAssetPath(input.brandLogoDark, DEFAULT_BRAND.logoDark),
  };
}

function safeSortOrder(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isVisibleMenu(menu: MenuItem): boolean {
  return menu.isvisible && menu.isactive;
}

function normalizeNavItem(menu: MenuItem): NavItem | null {
  const title = cleanText(menu.title, "Untitled");
  const menuid = cleanText(menu.menuid);

  if (menuid.length === 0) {
    return null;
  }

  const description = cleanText(menu.description ?? undefined);
  const icon = cleanText(menu.icon ?? undefined);
  const badgeText = cleanText(menu.badgeconfig?.text);
  const badgeColor = menu.badgeconfig?.color;
  const children = Array.isArray(menu.children)
    ? menu.children
        .filter(isVisibleMenu)
        .map(normalizeNavItem)
        .filter((item): item is NavItem => item !== null)
    : [];

  return {
    menuid,
    title,
    url: safeInternalHref(menu.url),
    ...(description.length > 0 ? { description } : {}),
    ...(icon.length > 0 ? { icon } : {}),
    ...(badgeText.length > 0
      ? {
          badge: {
            text: badgeText,
            variant:
              badgeColor === "success" ||
              badgeColor === "warning" ||
              badgeColor === "error"
                ? badgeColor
                : "default",
          },
        }
      : {}),
    ...(children.length > 0 ? { children } : {}),
  };
}

function buildGroups(menus: readonly MenuItem[]): readonly NavGroup[] {
  const groups = new Map<string, { order: number; items: NavItem[] }>();

  for (const menu of menus.slice(0, MAX_MENU_COUNT)) {
    if (!isVisibleMenu(menu)) {
      continue;
    }

    const item = normalizeNavItem(menu);

    if (item === null) {
      continue;
    }

    const label = cleanText(menu.menugroup, "Workspace");
    const existing = groups.get(label);

    if (existing === undefined) {
      groups.set(label, {
        order: safeSortOrder(menu.sortorder),
        items: [item],
      });
      continue;
    }

    existing.items.push(item);
    existing.order = Math.min(existing.order, safeSortOrder(menu.sortorder));
  }

  return [...groups.entries()]
    .map(([label, group]) => ({
      label,
      items: group.items,
      order: group.order,
    }))
    .sort(
      (left, right) =>
        left.order - right.order || left.label.localeCompare(right.label),
    )
    .map((group) => ({
      label: group.label,
      items: group.items,
    }));
}

function itemMatchesQuery(item: NavItem, query: string): boolean {
  if (query.length === 0) {
    return true;
  }

  const haystack = `${item.title} ${item.description ?? ""}`.toLocaleLowerCase(
    "en-US",
  );

  return haystack.includes(query.toLocaleLowerCase("en-US"));
}

function filterNavItems(
  items: readonly NavItem[],
  query: string,
): readonly NavItem[] {
  const normalizedQuery = cleanText(query).slice(0, MAX_QUERY_LENGTH);

  if (normalizedQuery.length === 0) {
    return items;
  }

  return items
    .map((item) => {
      const children =
        item.children === undefined
          ? undefined
          : filterNavItems(item.children, normalizedQuery);
      const ownMatch = itemMatchesQuery(item, normalizedQuery);

      if (!ownMatch && (children === undefined || children.length === 0)) {
        return null;
      }

      return {
        ...item,
        ...(children !== undefined ? { children } : {}),
      };
    })
    .filter((item): item is NavItem => item !== null);
}

function normalizeAuth(auth: AuthInfo): AuthInfo {
  const roles = formatUniqueRoleLabels(auth.roles);
  const roleFallback = roles[0] ?? "Workspace user";
  const activeRole = formatRoleLabel(
    auth.activeRole ?? auth.primaryRole ?? auth.roles[0],
    roleFallback,
  );
  const primaryRole = formatRoleLabel(
    auth.primaryRole ?? auth.roles[0],
    activeRole,
  );

  return {
    id: cleanText(auth.id, "unknown"),
    name: cleanDisplayText(auth.name, "ERP User", MAX_TEXT_LENGTH),
    ...(auth.email !== undefined ? { email: auth.email } : {}),
    ...(auth.avatar !== undefined ? { avatar: auth.avatar } : {}),
    roles,
    ...(activeRole.length > 0 ? { activeRole } : {}),
    ...(primaryRole.length > 0 ? { primaryRole } : {}),
  };
}

function BrandLogo({
  brand,
}: Readonly<{ brand: NormalizedBrand }>): React.ReactElement {
  const [lightFailed, setLightFailed] = React.useState(false);
  const [darkFailed, setDarkFailed] = React.useState(false);
  const initial = brand.name.slice(0, 1).toLocaleUpperCase("en-US") || "O";

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-sidebar-border/70 bg-background/75 text-card-title shadow-xs ring-1 ring-foreground/5">
      {lightFailed ? (
        <span className="block dark:hidden">{initial}</span>
      ) : (
        <Image
          src={brand.logoLight}
          alt=""
          width={32}
          height={32}
          className="block h-8 w-auto dark:hidden"
          onError={() => {
            setLightFailed(true);
          }}
          priority
        />
      )}

      {darkFailed ? (
        <span className="hidden dark:block">{initial}</span>
      ) : (
        <Image
          src={brand.logoDark}
          alt=""
          width={32}
          height={32}
          className="hidden h-8 w-auto dark:block"
          onError={() => {
            setDarkFailed(true);
          }}
          priority
        />
      )}
    </span>
  );
}

function NavigationSkeleton(): React.ReactElement {
  return (
    <SidebarGroup className="px-2 py-2">
      <SidebarGroupLabel className="px-3 text-[0.6875rem] uppercase tracking-[0.12em] text-sidebar-foreground/55">
        Workspace
      </SidebarGroupLabel>
      <SidebarGroupContent className="grid gap-1">
        {Array.from({ length: 6 }, (_, index) => (
          <SidebarMenuSkeleton key={index} showIcon />
        ))}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar({
  auth,
  menus,
  isLoadingNav = false,
  onSignOut,
  signOutPending,
  signOutDisabled,
  brandName,
  brandTagline,
  brandLogoLight,
  brandLogoDark,
  className,
  ...props
}: AppSidebarProps): React.ReactElement {
  const pathname = usePathname();
  const sidebar = useSidebar();
  const [query, setQuery] = React.useState("");
  const brand = normalizeBrand({
    brandName,
    brandTagline,
    brandLogoLight,
    brandLogoDark,
  });
  const normalizedAuth = normalizeAuth(auth);
  const groups = buildGroups(menus);
  const filteredGroups = groups
    .map((group) => ({
      ...group,
      items: filterNavItems(group.items, query),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar
      collapsible="icon"
      className={cn("border-r border-sidebar-border/80 bg-sidebar", className)}
      {...props}
    >
      <SidebarHeader className="gap-3 border-b border-sidebar-border/70 px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip={`${brand.name} home`}
              className="rounded-2xl px-2.5 hover:bg-sidebar-accent/80"
            >
              <Link
                href="/dashboard"
                prefetch
                aria-label={`${brand.name} dashboard`}
              >
                <BrandLogo brand={brand} />

                <span className="grid min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-card-title text-sidebar-foreground">
                    {brand.name}
                  </span>
                  <span className="truncate text-caption text-sidebar-foreground/65">
                    {brand.tagline}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="relative group-data-[collapsible=icon]:hidden">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-sidebar-foreground/45"
          />
          <SidebarInput
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value.slice(0, MAX_QUERY_LENGTH));
            }}
            placeholder="Search navigation"
            className="h-10 rounded-2xl border-sidebar-border/70 bg-background/55 pl-9 shadow-xs placeholder:text-sidebar-foreground/45 focus-visible:ring-sidebar-ring/35 dark:bg-background/20"
            aria-label="Search navigation"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-0 py-2">
        {isLoadingNav ? (
          <NavigationSkeleton />
        ) : filteredGroups.length === 0 ? (
          <SidebarGroup className="px-2 py-2">
            <SidebarGroupLabel className="px-3 text-[0.6875rem] uppercase tracking-[0.12em] text-sidebar-foreground/55">
              Workspace
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <p className="rounded-2xl border border-sidebar-border/70 bg-background/40 px-3 py-3 text-body-sm text-sidebar-foreground/65 group-data-[collapsible=icon]:hidden">
                No navigation items available for this actor.
              </p>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          filteredGroups.map((group) => (
            <NavMain
              key={group.label}
              label={group.label}
              items={group.items}
              currentPath={pathname}
              collapsed={sidebar.state === "collapsed"}
            />
          ))
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 p-2">
        <NavUser
          user={normalizedAuth}
          {...(onSignOut !== undefined ? { onSignOut } : {})}
          {...(signOutPending !== undefined ? { signOutPending } : {})}
          {...(signOutDisabled !== undefined ? { signOutDisabled } : {})}
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

// oz-next-app/src/features/app-shell/ui/app-sidebar.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  NavMain,
  resolveNavigationIconKey,
  type Item as NavItem,
} from "@/features/app-shell/ui/nav-main";
import { NavUser } from "@/features/app-shell/ui/nav-user";
import {
  cleanDisplayText,
  formatRoleLabel,
  formatUniqueRoleLabels,
} from "@/components/common/display-label";
import {
  BRAND_ICON_INTRINSIC_HEIGHT,
  BRAND_ICON_INTRINSIC_WIDTH,
} from "@/components/common/brand-assets";
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
  tagline: "Innovation to Serve Society",
  logoLight: "/icon-light.svg",
  logoDark: "/icon-dark.svg",
} as const satisfies NormalizedBrand;

const MAX_MENU_COUNT = 700;
const MAX_NAV_NODE_COUNT = 1_000;
const MAX_MENU_DEPTH = 8;
const MAX_CHILDREN_PER_MENU = 100;
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

function uniqueNavItems(items: readonly NavItem[]): readonly NavItem[] {
  const unique: NavItem[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.menuid)) {
      continue;
    }

    seen.add(item.menuid);
    unique.push(item);
  }

  return unique;
}

type NavigationBudget = {
  remaining: number;
};

function normalizeNavItem(
  menu: MenuItem,
  depth: number,
  budget: NavigationBudget,
): NavItem | null {
  if (depth > MAX_MENU_DEPTH || budget.remaining <= 0) {
    return null;
  }

  const title = cleanText(menu.title, "Untitled");
  const menuid = cleanText(menu.menuid);

  if (menuid.length === 0) {
    return null;
  }

  budget.remaining -= 1;

  const itemKey = cleanText(menu.itemkey);
  const description = cleanText(menu.description ?? undefined);
  const configuredIcon = cleanText(menu.icon ?? undefined);
  const icon = resolveNavigationIconKey(configuredIcon);

  const badgeText = cleanText(menu.badgeconfig?.text);
  const badgeVariant = menu.badgeconfig?.variant ?? menu.badgeconfig?.color;
  const children = uniqueNavItems(
    menu.children === undefined
      ? []
      : menu.children
          .slice(0, MAX_CHILDREN_PER_MENU)
          .filter(isVisibleMenu)
          .map((child) => normalizeNavItem(child, depth + 1, budget))
          .filter((item): item is NavItem => item !== null),
  );

  return {
    menuid,
    ...(itemKey.length > 0 ? { itemKey } : {}),
    title,
    url: safeInternalHref(menu.url),
    ...(description.length > 0 ? { description } : {}),
    icon,
    ...(badgeText.length > 0
      ? {
          badge: {
            text: badgeText,
            variant:
              badgeVariant === "success"
                ? "success"
                : badgeVariant === "warning"
                  ? "warning"
                  : badgeVariant === "error" || badgeVariant === "destructive"
                    ? "error"
                    : "default",
          },
        }
      : {}),
    ...(children.length > 0 ? { children } : {}),
  };
}

function buildGroups(menus: readonly MenuItem[]): readonly NavGroup[] {
  const groups = new Map<string, { order: number; items: NavItem[] }>();
  const budget: NavigationBudget = { remaining: MAX_NAV_NODE_COUNT };

  for (const menu of menus.slice(0, MAX_MENU_COUNT)) {
    if (budget.remaining <= 0) {
      break;
    }

    if (!isVisibleMenu(menu)) {
      continue;
    }

    const item = normalizeNavItem(menu, 0, budget);

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

    if (!existing.items.some((candidate) => candidate.menuid === item.menuid)) {
      existing.items.push(item);
    }

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

  return haystack.includes(query);
}

function filterNavItems(
  items: readonly NavItem[],
  query: string,
): readonly NavItem[] {
  if (query.length === 0) {
    return items;
  }

  return items
    .map((item) => {
      const children =
        item.children === undefined
          ? undefined
          : filterNavItems(item.children, query);
      const ownMatch = itemMatchesQuery(item, query);

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
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-sidebar-border/70 bg-background text-card-title shadow-xs ring-1 ring-foreground/5 group-data-[collapsible=icon]:size-8">
      {lightFailed ? (
        <span className="block dark:hidden">{initial}</span>
      ) : (
        <Image
          src={brand.logoLight}
          alt=""
          width={BRAND_ICON_INTRINSIC_WIDTH}
          height={BRAND_ICON_INTRINSIC_HEIGHT}
          className="block h-8 w-auto dark:hidden group-data-[collapsible=icon]:h-7"
          onError={() => {
            setLightFailed(true);
          }}
        />
      )}

      {darkFailed ? (
        <span className="hidden dark:block">{initial}</span>
      ) : (
        <Image
          src={brand.logoDark}
          alt=""
          width={BRAND_ICON_INTRINSIC_WIDTH}
          height={BRAND_ICON_INTRINSIC_HEIGHT}
          className="hidden h-8 w-auto dark:block group-data-[collapsible=icon]:h-7"
          onError={() => {
            setDarkFailed(true);
          }}
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
  const deferredQuery = React.useDeferredValue(query);
  const brand = normalizeBrand({
    brandName,
    brandTagline,
    brandLogoLight,
    brandLogoDark,
  });
  const normalizedAuth = normalizeAuth(auth);
  const groups = React.useMemo(() => buildGroups(menus), [menus]);
  const filteredGroups = React.useMemo(() => {
    const normalizedQuery = cleanText(deferredQuery)
      .slice(0, MAX_QUERY_LENGTH)
      .toLocaleLowerCase("en-US");

    return groups
      .map((group) => ({
        ...group,
        items: filterNavItems(group.items, normalizedQuery),
      }))
      .filter((group) => group.items.length > 0);
  }, [deferredQuery, groups]);

  return (
    <Sidebar
      collapsible="icon"
      className={cn("bg-sidebar", className)}
      {...props}
    >
      <SidebarHeader className="h-16 shrink-0 justify-center border-b border-sidebar-border/70 px-2 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip={`${brand.name} home`}
              className="rounded-2xl px-2.5 hover:bg-sidebar-accent/80 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-xl"
            >
              <Link
                href="/dashboard"
                prefetch
                aria-label={`${brand.name} dashboard`}
              >
                <BrandLogo brand={brand} />

                <span className="grid min-w-0 flex-1 text-start group-data-[collapsible=icon]:hidden">
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
      </SidebarHeader>

      <div className="shrink-0 border-b border-sidebar-border/70 px-3 py-3 group-data-[collapsible=icon]:hidden">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-sidebar-foreground/45"
          />
          <SidebarInput
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value.slice(0, MAX_QUERY_LENGTH));
            }}
            placeholder="Search navigation"
            autoComplete="off"
            enterKeyHint="search"
            spellCheck={false}
            className="h-10 rounded-xl border-sidebar-border/70 bg-background ps-9 shadow-xs placeholder:text-sidebar-foreground/45 focus-visible:ring-sidebar-ring/35"
            aria-label="Search navigation"
          />
        </div>
      </div>

      <SidebarContent
        role="navigation"
        aria-label="Primary navigation"
        className="scrollbar-compact overflow-x-hidden overscroll-contain px-0 py-2"
      >
        {isLoadingNav ? (
          <NavigationSkeleton />
        ) : filteredGroups.length === 0 ? (
          <SidebarGroup className="px-2 py-2">
            <SidebarGroupLabel className="px-3 text-[0.6875rem] uppercase tracking-[0.12em] text-sidebar-foreground/55">
              Workspace
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <p className="rounded-xl border border-sidebar-border/70 bg-background px-3 py-3 text-body-sm text-sidebar-foreground/65 group-data-[collapsible=icon]:hidden">
                {query.trim().length > 0
                  ? "No navigation items match your search."
                  : "No navigation items are available for this account."}
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

      <SidebarRail className="group-data-[collapsible=icon]:hidden" />
    </Sidebar>
  );
}

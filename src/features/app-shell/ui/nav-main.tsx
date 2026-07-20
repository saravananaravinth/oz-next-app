// oz-next-app/src/features/app-shell/ui/nav-main.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronRight,
  ClipboardList,
  FileText,
  Headset,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type NavigationBadge = Readonly<{
  text: string;
  variant?: "default" | "success" | "warning" | "error";
}>;

export type NavCommon = Readonly<{
  menuid: string;
  title: string;
  url: Route;
  description?: string;
  icon?: string;
  badge?: NavigationBadge;
}>;

export type Item = NavCommon &
  Readonly<{
    children?: readonly Item[];
  }>;

export type NavMainProps = Readonly<{
  label: string;
  items: readonly Item[];
  currentPath: string;
  collapsed?: boolean;
}>;

type NavIconKey =
  | "Analytics"
  | "Bell"
  | "Boxes"
  | "Claims"
  | "ClipboardList"
  | "Customer"
  | "Customers"
  | "Dashboard"
  | "Dealer"
  | "Dealers"
  | "FileText"
  | "Headset"
  | "Inventory"
  | "LayoutDashboard"
  | "Orders"
  | "Package"
  | "Production"
  | "Reports"
  | "Sales"
  | "Service"
  | "Settings"
  | "Shipment"
  | "Users"
  | "Warehouse"
  | "Warranty"
  | "Wrench";

type NavIconProps = React.ComponentPropsWithoutRef<typeof LayoutDashboard> &
  Readonly<{
    item: Item;
  }>;

const NAV_ICON_KEYS = {
  Analytics: true,
  Bell: true,
  Boxes: true,
  Claims: true,
  ClipboardList: true,
  Customer: true,
  Customers: true,
  Dashboard: true,
  Dealer: true,
  Dealers: true,
  FileText: true,
  Headset: true,
  Inventory: true,
  LayoutDashboard: true,
  Orders: true,
  Package: true,
  Production: true,
  Reports: true,
  Sales: true,
  Service: true,
  Settings: true,
  Shipment: true,
  Users: true,
  Warehouse: true,
  Warranty: true,
  Wrench: true,
} as const satisfies Readonly<Record<NavIconKey, true>>;

function isNavIconKey(value: string): value is NavIconKey {
  return Object.prototype.hasOwnProperty.call(NAV_ICON_KEYS, value);
}

function navIconKeyFor(item: Item): NavIconKey {
  const requested = item.icon?.trim();

  if (
    requested !== undefined &&
    requested.length > 0 &&
    isNavIconKey(requested)
  ) {
    return requested;
  }

  return isNavIconKey(item.title) ? item.title : "LayoutDashboard";
}

function NavIcon({ item, ...props }: NavIconProps): React.ReactElement {
  const iconKey = navIconKeyFor(item);

  switch (iconKey) {
    case "Analytics":
      return <BarChart3 {...props} />;
    case "Bell":
      return <Bell {...props} />;
    case "Boxes":
    case "Production":
      return <Boxes {...props} />;
    case "Claims":
    case "Warranty":
      return <Shield {...props} />;
    case "ClipboardList":
      return <ClipboardList {...props} />;
    case "Customer":
    case "Customers":
    case "Users":
      return <Users {...props} />;
    case "Dashboard":
    case "LayoutDashboard":
      return <LayoutDashboard {...props} />;
    case "Dealer":
    case "Dealers":
      return <Store {...props} />;
    case "FileText":
    case "Reports":
      return <FileText {...props} />;
    case "Headset":
      return <Headset {...props} />;
    case "Inventory":
    case "Warehouse":
      return <Warehouse {...props} />;
    case "Orders":
    case "Sales":
      return <ShoppingCart {...props} />;
    case "Package":
      return <Package {...props} />;
    case "Service":
    case "Wrench":
      return <Wrench {...props} />;
    case "Settings":
      return <Settings {...props} />;
    case "Shipment":
      return <Truck {...props} />;
  }
}

function normalizePath(value: string): string {
  const pathname = value.split(/[?#]/u, 1)[0] ?? value;

  if (pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/u, "") || "/";
}

function isActive(currentPath: string, href: string): boolean {
  const current = normalizePath(currentPath);
  const target = normalizePath(href);

  return (
    current === target || (target !== "/" && current.startsWith(`${target}/`))
  );
}

function isItemActive(item: Item, currentPath: string): boolean {
  return (
    isActive(currentPath, item.url) ||
    item.children?.some((child) => isItemActive(child, currentPath)) === true
  );
}

function badgeVariantFor(
  value: NavigationBadge["variant"],
): BadgeProps["variant"] {
  switch (value) {
    case "error":
      return "destructive";
    case "success":
    case "warning":
    case "default":
    case undefined:
      return "outline";
  }
}

function badgeClassNameFor(value: NavigationBadge["variant"]): string {
  switch (value) {
    case "success":
      return "border-success/25 bg-success/10 text-success dark:border-success/35";
    case "warning":
      return "border-warning/30 bg-warning/10 text-warning-foreground dark:border-warning/35 dark:text-warning";
    case "error":
      return "border-destructive/25 bg-destructive/10 text-destructive dark:border-destructive/35";
    case "default":
    case undefined:
      return "border-sidebar-border/70 bg-background/70 text-sidebar-foreground/75 dark:bg-background/25";
  }
}

function NavBadge({
  badge,
}: Readonly<{
  badge: NavigationBadge | undefined;
}>): React.ReactElement | null {
  if (badge === undefined || badge.text.trim().length === 0) {
    return null;
  }

  return (
    <Badge
      variant={badgeVariantFor(badge.variant)}
      className={cn(
        "ml-auto h-5 max-w-[4.5rem] shrink-0 rounded-full px-2 text-[0.625rem] leading-none shadow-none",
        badgeClassNameFor(badge.variant),
      )}
    >
      <span className="truncate">{badge.text}</span>
    </Badge>
  );
}

function LeafNavItem({
  item,
  currentPath,
  subItem = false,
}: Readonly<{
  item: Item;
  currentPath: string;
  subItem?: boolean;
}>): React.ReactElement {
  const active = isItemActive(item, currentPath);

  if (subItem) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          asChild
          isActive={active}
          className="h-8 rounded-xl px-2.5 text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
        >
          <Link
            href={item.url}
            prefetch
            aria-current={active ? "page" : undefined}
          >
            <NavIcon item={item} aria-hidden="true" className="size-3.5" />
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            <NavBadge badge={item.badge} />
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.title}
        className="h-10 rounded-2xl px-3 text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:shadow-xs"
      >
        <Link
          href={item.url}
          prefetch
          aria-current={active ? "page" : undefined}
        >
          <NavIcon item={item} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{item.title}</span>
          <NavBadge badge={item.badge} />
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function ParentNavItem({
  item,
  currentPath,
}: Readonly<{
  item: Item;
  currentPath: string;
}>): React.ReactElement {
  const children = item.children ?? [];
  const active = isItemActive(item, currentPath);
  const [userOpen, setUserOpen] = React.useState(false);
  const open = active || userOpen;

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    setUserOpen(nextOpen);
  }, []);

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange} asChild>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={active}
            tooltip={item.title}
            className="h-10 rounded-2xl px-3 text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:shadow-xs"
          >
            <NavIcon item={item} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            <NavBadge badge={item.badge} />
            <ChevronRight
              aria-hidden="true"
              className={cn(
                "ml-1 size-4 shrink-0 text-sidebar-foreground/45 transition-transform duration-200 motion-reduce:transition-none",
                open ? "rotate-90" : "rotate-0",
              )}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub className="mx-4 my-1 gap-1 border-sidebar-border/60 px-2 py-1">
            {children.map((child) => (
              <LeafNavItem
                key={child.menuid}
                item={child}
                currentPath={currentPath}
                subItem
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function NavMain({
  label,
  items,
  currentPath,
  collapsed = false,
}: NavMainProps): React.ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <SidebarGroup
      data-collapsed={collapsed ? "true" : undefined}
      className="gap-1 px-2 py-2"
      aria-label={label}
    >
      <SidebarGroupLabel className="h-7 px-3 text-[0.6875rem] uppercase tracking-[0.12em] text-sidebar-foreground/55">
        {label}
      </SidebarGroupLabel>
      <SidebarMenu className="gap-1">
        {items.map((item) =>
          item.children !== undefined && item.children.length > 0 ? (
            <ParentNavItem
              key={item.menuid}
              item={item}
              currentPath={currentPath}
            />
          ) : (
            <LeafNavItem
              key={item.menuid}
              item={item}
              currentPath={currentPath}
            />
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}

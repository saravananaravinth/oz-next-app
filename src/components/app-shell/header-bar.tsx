// oz-next-app/src/components/app-shell/header-bar.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import {
  NotificationsSheet,
  type NotificationItem,
} from "@/components/app-shell/notifications";
import {
  GlobalSearch,
  type SearchResult,
} from "@/components/app-shell/nav-search";
import { ThemeMenu } from "@/components/app-shell/nav-theme";
import { TenantSelection } from "@/components/tenant";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { TenantMembership } from "@/lib/api/schemas";

export type HeaderBarProps = Readonly<{
  searchResults?: readonly SearchResult[];
  notifications?: readonly NotificationItem[];
  tenants?: readonly TenantMembership[];
  currentTenantId?: string | null;
}>;

type Crumb = Readonly<{
  label: string;
  href: Route;
  isLast: boolean;
}>;

const TITLE_MAP: Readonly<Record<string, string>> = {
  analytics: "Analytics",
  assembly: "Assembly",
  claims: "Claims",
  customers: "Customers",
  dashboard: "Dashboard",
  dealer: "Dealer",
  dealers: "Dealers",
  financials: "Financials",
  inventory: "Inventory",
  orders: "Orders",
  policies: "Policies",
  pricing: "Pricing",
  production: "Production",
  products: "Products",
  reports: "Reports",
  roles: "Roles",
  sales: "Sales",
  service: "Service",
  settings: "Settings",
  shipment: "Shipment",
  users: "Users",
  warranty: "Warranty",
};

const MAX_SEGMENTS = 8;
const MAX_SEGMENT_LABEL_LENGTH = 48;
const MAX_RAW_SEGMENT_LENGTH = 160;

const ASCII_CONTROL_MAX_CODE_POINT = 0x1f;
const ASCII_DELETE_CODE_POINT = 0x7f;
const UNSAFE_ENCODED_PATH_RE = /%(?:00|2e|2f|5c)/iu;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);

    if (
      codePoint <= ASCII_CONTROL_MAX_CODE_POINT ||
      codePoint === ASCII_DELETE_CODE_POINT
    ) {
      return true;
    }
  }

  return false;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function titleCase(value: string): string {
  const mapped = TITLE_MAP[value.toLocaleLowerCase("en-US")];

  if (mapped !== undefined) {
    return mapped;
  }

  return value
    .replace(/[-_]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/\b\p{L}/gu, (match) => match.toLocaleUpperCase("en-US"));
}

function safeSegmentLabel(segment: string): string {
  const decoded = decodeSegment(segment).trim();

  if (
    decoded.length === 0 ||
    decoded.length > MAX_RAW_SEGMENT_LENGTH ||
    hasControlCharacter(decoded) ||
    UNSAFE_ENCODED_PATH_RE.test(segment)
  ) {
    return "Details";
  }

  const label = titleCase(decoded);

  return label.length <= MAX_SEGMENT_LABEL_LENGTH
    ? label
    : `${label.slice(0, MAX_SEGMENT_LABEL_LENGTH - 1).trimEnd()}…`;
}

function breadcrumbsFromPath(pathname: string): readonly Crumb[] {
  const segments = pathname
    .split("/")
    .filter((segment) => segment.length > 0)
    .slice(0, MAX_SEGMENTS);

  if (segments.length === 0) {
    return [
      {
        label: "Dashboard",
        href: "/dashboard",
        isLast: true,
      },
    ];
  }

  return segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}` as Route;

    return {
      label: safeSegmentLabel(segment),
      href,
      isLast: index === segments.length - 1,
    };
  });
}

export function HeaderBar({
  searchResults,
  notifications,
  tenants,
  currentTenantId,
}: HeaderBarProps): React.ReactElement {
  const pathname = usePathname();
  const breadcrumbs = React.useMemo(
    () => breadcrumbsFromPath(pathname),
    [pathname],
  );

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border/70 bg-background/90 px-4 supports-[backdrop-filter]:backdrop-blur-xl">
      <SidebarTrigger className="size-10 rounded-2xl border border-border/60 bg-background/70 text-muted-readable shadow-xs hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/35" />

      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.href}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage className="max-w-64 truncate text-body-lg text-foreground [font-weight:var(--typography-emphasis-weight)]">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href} prefetch>
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden md:block">
          <TenantSelection
            tenants={tenants ?? []}
            currentTenantId={currentTenantId ?? null}
          />
        </div>
        <GlobalSearch results={searchResults ?? []} />
        <NotificationsSheet initialNotifications={notifications ?? []} />
        <ThemeMenu />
      </div>
    </header>
  );
}

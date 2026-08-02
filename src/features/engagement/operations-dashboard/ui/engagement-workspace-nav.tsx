// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-workspace-nav.tsx
"use client";
import type * as React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChartNoAxesCombined,
  CircleAlert,
  MapPinned,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { EngagementDashboardSearchParams } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { ResolvedEngagementDashboardAccess } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import {
  ENGAGEMENT_DASHBOARD_ROUTES,
  engagementWorkspaceHref,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type EngagementWorkspaceNavProps = Readonly<{
  query: EngagementDashboardSearchParams;
  access: ResolvedEngagementDashboardAccess;
}>;

export function EngagementWorkspaceNav({
  query,
  access,
}: EngagementWorkspaceNavProps): React.ReactElement {
  const pathname = usePathname();
  const items = [
    {
      label: "Overview",
      href: engagementWorkspaceHref(
        ENGAGEMENT_DASHBOARD_ROUTES.overview,
        query,
      ),
      icon: ChartNoAxesCombined,
      visible: true,
      exact: true,
      help: "Executive KPIs, source trends, lifecycle funnel, and lead operations.",
    },
    {
      label: "Dealers",
      href: engagementWorkspaceHref(ENGAGEMENT_DASHBOARD_ROUTES.dealers, query),
      icon: Building2,
      visible: access.capabilities.canReadDealerPerformance,
      exact: false,
      help: "Dealer assignment load, response, follow-up, conversion, and configuration health.",
    },
    {
      label: "Support",
      href: engagementWorkspaceHref(ENGAGEMENT_DASHBOARD_ROUTES.issues, query),
      icon: CircleAlert,
      visible: access.capabilities.canReadIssues,
      exact: false,
      help: "Prioritized operational exceptions and permission-gated recovery actions.",
    },
    {
      label: "Coverage",
      href: engagementWorkspaceHref(
        ENGAGEMENT_DASHBOARD_ROUTES.coverage,
        query,
      ),
      icon: MapPinned,
      visible: access.capabilities.canReadDealerPerformance,
      exact: false,
      help: "District demand, dealer readiness, distance risk, and assignment coverage.",
    },
    {
      label: "Video schedule",
      href: engagementWorkspaceHref(
        ENGAGEMENT_DASHBOARD_ROUTES.videoSequences,
        query,
      ),
      icon: Video,
      visible: access.capabilities.canReadVideoSequences,
      exact: false,
      help: "Configure the customer video schedule and monitor pending delivery.",
    },
  ] as const;

  return (
    <nav
      aria-label="Vehicle sales engagement"
      className="flex min-w-0 gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items
        .filter((item) => item.visible)
        .map((item) => {
          const itemPath = item.href.split("?")[0] ?? item.href;
          const active = item.exact
            ? pathname === itemPath
            : pathname === itemPath || pathname.startsWith(`${itemPath}/`);
          const Icon = item.icon;

          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  size="sm"
                  variant={active ? "secondary" : "ghost"}
                  className={cn("shrink-0 rounded-xl", active && "shadow-xs")}
                >
                  <Link
                    href={item.href}
                    prefetch
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {item.label}
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{item.help}</TooltipContent>
            </Tooltip>
          );
        })}
    </nav>
  );
}

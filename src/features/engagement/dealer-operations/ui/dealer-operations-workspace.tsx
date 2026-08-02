"use client";

import type * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardList, UserRoundPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ResolvedDealershipApplicationAccess } from "@/features/engagement/dealership-application-operations/policies/dealership-application.policy";
import type { DealershipDistrictAssignmentCatalog } from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";
import { DealershipDistrictAssignmentsDialog } from "@/features/engagement/dealership-application-operations/ui/dealership-district-assignments-dialog";
import { DEALER_OPERATIONS_ROUTES } from "@/features/engagement/dealer-operations/utils/dealer-operations-url";
import { cn } from "@/lib/utils";

export type DealerOperationsWorkspaceProps = Readonly<{
  access: ResolvedDealershipApplicationAccess;
  districtAssignments?: DealershipDistrictAssignmentCatalog | null;
  children: React.ReactNode;
}>;

export function DealerOperationsWorkspace({
  access,
  districtAssignments = null,
  children,
}: DealerOperationsWorkspaceProps): React.ReactElement {
  const pathname = usePathname();
  const items = [
    {
      label: "Applications",
      href: DEALER_OPERATIONS_ROUTES.applications,
      icon: ClipboardList,
      visible: access.capabilities.canReadDashboard,
      exact: true,
      detailPrefix: `${DEALER_OPERATIONS_ROUTES.applications}/`,
      excludePrefixes: [
        `${DEALER_OPERATIONS_ROUTES.dealers}/`,
        DEALER_OPERATIONS_ROUTES.directOnboarding,
      ],
      help: "Application intake, evaluation, onboarding, activation, and controlled exit.",
    },
    {
      label: "Dealers & sub-dealers",
      href: DEALER_OPERATIONS_ROUTES.dealers,
      icon: Building2,
      visible: access.capabilities.canReadDealers,
      exact: false,
      detailPrefix: `${DEALER_OPERATIONS_ROUTES.dealers}/`,
      excludePrefixes: [],
      help: "Existing dealer profiles, ERP users, margins, documents, and operational status.",
    },
    {
      label: "Direct onboarding",
      href: DEALER_OPERATIONS_ROUTES.directOnboarding,
      icon: UserRoundPlus,
      visible: access.capabilities.canDirectOnboard,
      exact: true,
      detailPrefix: DEALER_OPERATIONS_ROUTES.directOnboarding,
      excludePrefixes: [],
      help: "Create a new dealer only after the backend confirms no application or dealer exists.",
    },
  ] as const;

  return (
    <div className="grid min-w-0 gap-4">
      <section
        aria-label="Dealership operations navigation"
        className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-xs shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl"
      >
        <div className="flex min-w-0 flex-col @4xl/content-root:flex-row @4xl/content-root:items-center">
          <div className="hidden shrink-0 px-4 @4xl/content-root:block">
            <p className="text-overline text-muted-readable">Engagement</p>
            <p className="text-body-sm font-medium text-foreground">
              Dealership operations
            </p>
          </div>
          <nav
            aria-label="Dealership operations"
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {items
              .filter((item) => item.visible)
              .map((item) => {
                const excluded = item.excludePrefixes.some((prefix) =>
                  pathname.startsWith(prefix),
                );
                const active =
                  !excluded &&
                  (item.exact
                    ? pathname === item.href ||
                      (item.detailPrefix.endsWith("/") &&
                        pathname.startsWith(item.detailPrefix))
                    : pathname === item.href ||
                      pathname.startsWith(item.detailPrefix));
                const Icon = item.icon;
                return (
                  <Tooltip key={item.label}>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        size="sm"
                        variant={active ? "secondary" : "ghost"}
                        className={cn(
                          "shrink-0 rounded-xl",
                          active && "shadow-xs",
                        )}
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
          {access.capabilities.canManageDistrictAssignments &&
          districtAssignments !== null ? (
            <div className="shrink-0 border-t border-border/70 px-2 py-2 @4xl/content-root:border-t-0 @4xl/content-root:border-s">
              <DealershipDistrictAssignmentsDialog
                catalog={districtAssignments}
              />
            </div>
          ) : null}
        </div>
      </section>
      {children}
    </div>
  );
}

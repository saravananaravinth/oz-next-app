// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-workspace-shell.tsx
import type * as React from "react";

import { ContentRoot } from "@/components/common/content-shell";

import type {
  EngagementDashboardSearchParams,
  EngagementFilterOptions,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDashboardSectionResult } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.types";
import type { ResolvedEngagementDashboardAccess } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { EngagementDashboardFilters } from "@/features/engagement/operations-dashboard/ui/engagement-dashboard-filters";
import { EngagementWorkspaceNav } from "@/features/engagement/operations-dashboard/ui/engagement-workspace-nav";
import type { EngagementDashboardRoute } from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type EngagementWorkspaceShellProps = Readonly<{
  access: ResolvedEngagementDashboardAccess;
  query: EngagementDashboardSearchParams;
  route: EngagementDashboardRoute;
  filterOptions?: EngagementDashboardSectionResult<EngagementFilterOptions>;
  showFilters?: boolean;
  children: React.ReactNode;
}>;

export function EngagementWorkspaceShell({
  access,
  query,
  route,
  filterOptions,
  showFilters = true,
  children,
}: EngagementWorkspaceShellProps): React.ReactElement {
  return (
    <ContentRoot
      width="full"
      gutter="none"
      density="compact"
      className="max-w-none gap-4"
    >
      <section
        aria-label="Vehicle-sales engagement navigation and controls"
        className="min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-xs shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 p-2">
          <div className="hidden shrink-0 px-2 @4xl/content-root:block">
            <p className="text-overline text-muted-readable">Vehicle sales</p>
            <p className="text-body-sm font-medium text-foreground">
              Engagement workspace
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <EngagementWorkspaceNav access={access} query={query} />
          </div>
          {showFilters ? (
            <div className="ml-auto min-w-0 max-w-full shrink-0">
              <EngagementDashboardFilters
                route={route}
                query={query}
                {...(filterOptions === undefined ? {} : { filterOptions })}
              />
            </div>
          ) : null}
        </div>
      </section>
      {children}
    </ContentRoot>
  );
}

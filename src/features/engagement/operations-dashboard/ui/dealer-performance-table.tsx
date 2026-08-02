// oz-next-app/src/features/engagement/operations-dashboard/ui/dealer-performance-table.tsx
"use client";

import type * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  ENGAGEMENT_DASHBOARD_DEALER_SORT_FIELDS,
  ENGAGEMENT_DASHBOARD_PAGE_LIMITS,
  type EngagementDashboardDealerSortField,
  type EngagementDashboardSearchParams,
  type EngagementDealerPerformanceItem,
  type EngagementDealerPerformanceResult,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDashboardCapabilities } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { DealerWorkspaceDialogs } from "@/features/engagement/operations-dashboard/ui/dealer-workspace-dialogs";
import {
  formatDashboardDateTime,
  formatDashboardDuration,
  formatDashboardInteger,
  formatDashboardPercentage,
  titleCaseDashboardToken,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import {
  ENGAGEMENT_DASHBOARD_ROUTES,
  engagementWorkspaceHref,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type DealerPerformanceControlsProps = Readonly<{
  query: EngagementDashboardSearchParams;
}>;

export type DealerPerformanceTableProps = Readonly<{
  result: EngagementDealerPerformanceResult;
  query: EngagementDashboardSearchParams;
  capabilities: Pick<
    EngagementDashboardCapabilities,
    | "canReadDealerPerformance"
    | "canUpdateDealerSettings"
    | "canUpdateDealerLocation"
  >;
}>;

const HEALTH_VARIANTS = {
  HEALTHY: "success",
  WATCH: "warning",
  AT_RISK: "destructive",
  CONFIGURATION_ISSUE: "destructive",
  INACTIVE: "outline",
} as const satisfies Readonly<
  Record<
    EngagementDealerPerformanceItem["health"]["status"],
    BadgeProps["variant"]
  >
>;

const DEALER_ENGAGEMENT_STATES = ["ACTIVE", "INACTIVE", "ALL"] as const;

function isDealerSortField(
  value: string,
): value is EngagementDashboardDealerSortField {
  return ENGAGEMENT_DASHBOARD_DEALER_SORT_FIELDS.some((item) => item === value);
}

function isPageLimit(value: number): value is 25 | 50 | 100 {
  return ENGAGEMENT_DASHBOARD_PAGE_LIMITS.some((item) => item === value);
}

function dealerEngagementStateLabel(
  state: (typeof DEALER_ENGAGEMENT_STATES)[number],
): string {
  switch (state) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "ALL":
      return "All";
  }
}

function MetricCell({
  value,
  detail,
}: Readonly<{ value: number; detail?: string }>): React.ReactElement {
  return (
    <div className="grid min-w-20 gap-1 text-right">
      <span className="text-body font-medium text-tabular text-foreground">
        {formatDashboardInteger(value)}
      </span>
      {detail !== undefined ? (
        <span className="text-caption text-muted-readable">{detail}</span>
      ) : null}
    </div>
  );
}

function HealthBadge({
  dealer,
}: Readonly<{
  dealer: EngagementDealerPerformanceItem;
}>): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={HEALTH_VARIANTS[dealer.health.status]}
          className="cursor-help"
        >
          {titleCaseDashboardToken(dealer.health.status)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <p className="font-medium">Operational status</p>
        <ul className="mt-2 list-disc space-y-1 ps-4 text-caption">
          {dealer.health.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

export function DealerPerformanceControls({
  query,
}: DealerPerformanceControlsProps): React.ReactElement {
  const router = useRouter();
  const nextDirection = query.dealerSortDirection === "DESC" ? "ASC" : "DESC";
  const directionLabel =
    query.dealerSortDirection === "DESC"
      ? "Sorted descending. Change to ascending."
      : "Sorted ascending. Change to descending.";

  return (
    <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
      <nav
        aria-label="Dealer engagement status"
        className="inline-flex items-center gap-1 rounded-2xl border border-border/70 bg-muted/45 p-1"
      >
        {DEALER_ENGAGEMENT_STATES.map((state) => {
          const active = query.dealerEngagementState === state;

          return (
            <Button
              key={state}
              variant={active ? "secondary" : "ghost"}
              size="sm"
              className="rounded-xl"
              asChild
            >
              <Link
                href={engagementWorkspaceHref(
                  ENGAGEMENT_DASHBOARD_ROUTES.dealers,
                  query,
                  {
                    dealerEngagementState: state,
                    dealerCursor: null,
                  },
                )}
                scroll={false}
                aria-current={active ? "page" : undefined}
              >
                {dealerEngagementStateLabel(state)}
              </Link>
            </Button>
          );
        })}
      </nav>

      <div
        role="group"
        aria-label="Dealer table sorting"
        className="flex min-w-0 items-center gap-1 rounded-2xl border border-border/70 bg-background p-1 shadow-xs"
      >
        <span className="hidden px-2 text-caption text-muted-readable xl:inline">
          Sort by
        </span>

        <Select
          value={query.dealerSortBy}
          onValueChange={(value) => {
            if (!isDealerSortField(value)) {
              return;
            }

            router.push(
              engagementWorkspaceHref(
                ENGAGEMENT_DASHBOARD_ROUTES.dealers,
                query,
                {
                  dealerSortBy: value,
                  dealerCursor: null,
                },
              ),
              { scroll: false },
            );
          }}
        >
          <SelectTrigger
            aria-label="Sort dealers by"
            className="h-8 w-44 border-0 bg-transparent shadow-none sm:w-48"
          >
            <SelectValue placeholder="Select dealer sort order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ASSIGNED_COUNT">Assigned leads</SelectItem>
            <SelectItem value="DEALER_NAME">Dealer name</SelectItem>
            <SelectItem value="RESPONSE_SLA_RATE">Response SLA</SelectItem>
            <SelectItem value="CONVERSION_RATE">Conversion rate</SelectItem>
            <SelectItem value="OPEN_LEAD_COUNT">Open leads</SelectItem>
            <SelectItem value="OVERDUE_FOLLOW_UP_COUNT">
              Overdue follow-up
            </SelectItem>
            <SelectItem value="ISSUE_COUNT">Issues</SelectItem>
            <SelectItem value="LAST_ACTIVITY_AT">Last activity</SelectItem>
          </SelectContent>
        </Select>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" asChild>
              <Link
                href={engagementWorkspaceHref(
                  ENGAGEMENT_DASHBOARD_ROUTES.dealers,
                  query,
                  {
                    dealerSortDirection: nextDirection,
                    dealerCursor: null,
                  },
                )}
                scroll={false}
                aria-label={directionLabel}
              >
                {query.dealerSortDirection === "DESC" ? (
                  <ArrowDown aria-hidden="true" />
                ) : (
                  <ArrowUp aria-hidden="true" />
                )}
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{directionLabel}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function DealerTablePagination({
  result,
  query,
  nextHref,
}: Readonly<{
  result: EngagementDealerPerformanceResult;
  query: EngagementDashboardSearchParams;
  nextHref: ReturnType<typeof engagementWorkspaceHref> | null;
}>): React.ReactElement {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/25 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption text-muted-readable">Rows per page</span>

        <Select
          value={String(query.dealerLimit)}
          onValueChange={(value) => {
            const numeric = Number(value);

            if (!isPageLimit(numeric)) {
              return;
            }

            router.push(
              engagementWorkspaceHref(
                ENGAGEMENT_DASHBOARD_ROUTES.dealers,
                query,
                {
                  dealerLimit: numeric,
                  dealerCursor: null,
                },
              ),
              { scroll: false },
            );
          }}
        >
          <SelectTrigger aria-label="Rows per page" className="h-9 w-20">
            <SelectValue placeholder="Select rows per page" />
          </SelectTrigger>
          <SelectContent align="start">
            {ENGAGEMENT_DASHBOARD_PAGE_LIMITS.map((limit) => (
              <SelectItem key={limit} value={String(limit)}>
                {limit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-caption text-muted-readable" aria-live="polite">
          {formatDashboardInteger(result.items.length)} dealers shown
        </span>
      </div>

      {result.pagination.hasMore && nextHref !== null ? (
        <Pagination className="mx-0 w-auto justify-start sm:justify-end">
          <PaginationContent>
            <PaginationItem>
              <Button variant="outline" size="sm" asChild>
                <Link href={nextHref} scroll={false}>
                  Next page
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : (
        <span className="text-caption text-muted-readable">End of results</span>
      )}
    </div>
  );
}

export function DealerPerformanceTable({
  result,
  query,
  capabilities,
}: DealerPerformanceTableProps): React.ReactElement {
  const nextHref =
    result.pagination.nextCursor === null
      ? null
      : engagementWorkspaceHref(ENGAGEMENT_DASHBOARD_ROUTES.dealers, query, {
          dealerCursor: result.pagination.nextCursor,
        });

  return (
    <div className="grid gap-4">
      {result.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-body-sm text-muted-readable">
          No dealers match the current engagement status and filters.
        </p>
      ) : (
        <div
          role="region"
          aria-label="Dealer performance table"
          tabIndex={0}
          className="scrollbar-compact scrollbar-stable max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-border/70 outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/45"
        >
          <Table className="min-w-[1240px]">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 min-w-64 bg-card">
                  Dealer
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">Dealer responded</TableHead>
                <TableHead className="text-right">Closed</TableHead>
                <TableHead className="text-right">Follow-up</TableHead>
                <TableHead className="text-right">To dealer</TableHead>
                <TableHead className="text-right">To flow</TableHead>
                <TableHead className="text-right">Booked</TableHead>
                <TableHead className="text-right">Converted</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="w-20 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {result.items.map((dealer) => (
                <TableRow key={dealer.dealerOrgUnitId}>
                  <TableCell className="sticky left-0 z-10 bg-card">
                    <div className="grid gap-1">
                      <span className="font-medium text-foreground">
                        {dealer.dealerName}
                      </span>
                      <span className="text-caption text-muted-readable">
                        {dealer.dealerCode} ·{" "}
                        {[dealer.city, dealer.district]
                          .filter((value): value is string => value !== null)
                          .join(", ") || "Location unavailable"}
                      </span>
                      <span className="text-caption text-muted-readable">
                        Last activity:{" "}
                        {formatDashboardDateTime(dealer.lastActivityAt)}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={dealer.engagementActive ? "success" : "outline"}
                    >
                      {dealer.engagementActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <MetricCell
                      value={dealer.assignedCount}
                      detail={`${formatDashboardInteger(dealer.openLeadCount)} open`}
                    />
                  </TableCell>

                  <TableCell>
                    <MetricCell
                      value={dealer.respondedCount}
                      detail={`${formatDashboardPercentage(dealer.responseSlaRatePct)} SLA`}
                    />
                  </TableCell>

                  <TableCell>
                    <MetricCell value={dealer.closedCount} />
                  </TableCell>

                  <TableCell>
                    <MetricCell
                      value={dealer.followUpAvailableCount}
                      detail={`${formatDashboardInteger(dealer.overdueFollowUpCount)} overdue`}
                    />
                  </TableCell>

                  <TableCell>
                    <MetricCell value={dealer.forwardedToDealerCount} />
                  </TableCell>

                  <TableCell>
                    <MetricCell value={dealer.forwardedToFlowCount} />
                  </TableCell>

                  <TableCell>
                    <MetricCell value={dealer.bookedCount} />
                  </TableCell>

                  <TableCell>
                    <MetricCell
                      value={dealer.convertedCount}
                      detail={formatDashboardPercentage(
                        dealer.conversionRatePct,
                      )}
                    />
                  </TableCell>

                  <TableCell>
                    <div className="grid gap-1">
                      <HealthBadge dealer={dealer} />
                      <span className="text-caption text-muted-readable">
                        Median response{" "}
                        {formatDashboardDuration(
                          dealer.medianFirstResponseMinutes,
                        )}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="w-20">
                    <DealerWorkspaceDialogs
                      dealer={dealer}
                      query={query}
                      capabilities={capabilities}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DealerTablePagination
        result={result}
        query={query}
        nextHref={nextHref}
      />
    </div>
  );
}

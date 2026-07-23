// oz-next-app/src/features/engagement/operations-dashboard/ui/dealer-performance-table.tsx
"use client";

import type * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  MapPin,
  MoreHorizontal,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  formatDashboardDateTime,
  formatDashboardDuration,
  formatDashboardInteger,
  formatDashboardPercentage,
  titleCaseDashboardToken,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import {
  engagementDashboardHref,
  engagementDealerDetailHref,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type DealerPerformanceTableProps = Readonly<{
  result: EngagementDealerPerformanceResult;
  query: EngagementDashboardSearchParams;
  capabilities: Pick<
    EngagementDashboardCapabilities,
    "canUpdateDealerSettings" | "canUpdateDealerLocation"
  >;
}>;

const HEALTH_VARIANTS = {
  HEALTHY: "secondary",
  WATCH: "outline",
  AT_RISK: "destructive",
  CONFIGURATION_ISSUE: "destructive",
  INACTIVE: "outline",
} as const;

function supportedFlows(
  dealer: EngagementDealerPerformanceItem,
): readonly string[] {
  const flows: string[] = [];
  if (dealer.supportsVehicleEnquiries) flows.push("Vehicle");
  if (dealer.supportsServiceEnquiries) flows.push("Service");
  if (dealer.supportsWarranty) flows.push("Warranty");
  return flows;
}

function isDealerSortField(
  value: string,
): value is EngagementDashboardDealerSortField {
  return ENGAGEMENT_DASHBOARD_DEALER_SORT_FIELDS.some((item) => item === value);
}

function isPageLimit(value: number): value is 25 | 50 | 100 {
  return ENGAGEMENT_DASHBOARD_PAGE_LIMITS.some((item) => item === value);
}

function sortLabel(value: EngagementDashboardDealerSortField): string {
  return titleCaseDashboardToken(value);
}

function HealthBadge({
  dealer,
}: Readonly<{ dealer: EngagementDealerPerformanceItem }>) {
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
        <p className="font-medium">Why this dealer is classified this way</p>
        {dealer.health.reasons.length === 0 ? (
          <p className="mt-1 text-caption">
            No health exceptions were returned.
          </p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-caption">
            {dealer.health.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function SortLink({
  field,
  label,
  query,
}: Readonly<{
  field: EngagementDashboardDealerSortField;
  label: string;
  query: EngagementDashboardSearchParams;
}>) {
  const active = query.dealerSortBy === field;
  const nextDirection =
    active && query.dealerSortDirection === "DESC" ? "ASC" : "DESC";
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-3 h-8">
      <Link
        href={engagementDashboardHref(query, {
          dealerSortBy: field,
          dealerSortDirection: nextDirection,
          dealerCursor: null,
        })}
        scroll={false}
      >
        {label}
        {active ? (
          query.dealerSortDirection === "ASC" ? (
            <ArrowUp aria-hidden="true" className="size-3.5" />
          ) : (
            <ArrowDown aria-hidden="true" className="size-3.5" />
          )
        ) : null}
      </Link>
    </Button>
  );
}

function DealerActions({
  dealer,
  query,
  capabilities,
}: Readonly<{
  dealer: EngagementDealerPerformanceItem;
  query: EngagementDashboardSearchParams;
  capabilities: DealerPerformanceTableProps["capabilities"];
}>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${dealer.dealerName}`}
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link
            href={engagementDealerDetailHref(dealer.dealerOrgUnitId, query)}
          >
            View dealer details
          </Link>
        </DropdownMenuItem>
        {capabilities.canUpdateDealerSettings ||
        capabilities.canUpdateDealerLocation ? (
          <DropdownMenuItem asChild>
            <Link
              href={engagementDealerDetailHref(dealer.dealerOrgUnitId, query)}
            >
              Configure engagement
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link
            href={engagementDashboardHref(
              query,
              {
                dealerOrgUnitIds: [dealer.dealerOrgUnitId],
                dealerCursor: null,
                issueCursor: null,
              },
              "issues",
            )}
          >
            View assigned activity
          </Link>
        </DropdownMenuItem>
        {dealer.googleMapsUrl !== null ? (
          <DropdownMenuItem asChild>
            <a
              href={dealer.googleMapsUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open in Google Maps
            </a>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DealerPerformanceTable({
  result,
  query,
  capabilities,
}: DealerPerformanceTableProps): React.ReactElement {
  const router = useRouter();
  if (result.items.length === 0) {
    return (
      <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed p-6 text-center">
        <div>
          <ShieldAlert
            aria-hidden="true"
            className="mx-auto size-8 text-muted-readable"
          />
          <p className="mt-3 text-card-title">No dealers match this view</p>
          <p className="mt-1 text-body-sm text-muted-readable">
            Reset or broaden the dashboard filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-caption text-muted-readable">
          <Badge variant="outline">
            As of {formatDashboardDateTime(result.asOf)}
          </Badge>
          <span>Opaque keyset cursor · deterministic ordering</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={query.dealerSortBy}
            onValueChange={(value) => {
              if (isDealerSortField(value)) {
                router.push(
                  engagementDashboardHref(query, {
                    dealerSortBy: value,
                    dealerCursor: null,
                  }),
                );
              }
            }}
          >
            <SelectTrigger className="w-52 lg:hidden">
              <SelectValue placeholder="Dealer sort" />
            </SelectTrigger>
            <SelectContent>
              {ENGAGEMENT_DASHBOARD_DEALER_SORT_FIELDS.map((field) => (
                <SelectItem key={field} value={field}>
                  {sortLabel(field)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(query.dealerLimit)}
            onValueChange={(value) => {
              const limit = Number(value);
              if (isPageLimit(limit)) {
                router.push(
                  engagementDashboardHref(query, {
                    dealerLimit: limit,
                    dealerCursor: null,
                  }),
                );
              }
            }}
          >
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Rows" />
            </SelectTrigger>
            <SelectContent>
              {ENGAGEMENT_DASHBOARD_PAGE_LIMITS.map((limit) => (
                <SelectItem key={limit} value={String(limit)}>
                  {limit} rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-64">
                <SortLink field="DEALER_NAME" label="Dealer" query={query} />
              </TableHead>
              <TableHead className="min-w-44">Readiness</TableHead>
              <TableHead>
                <SortLink
                  field="ASSIGNED_COUNT"
                  label="Assigned"
                  query={query}
                />
              </TableHead>
              <TableHead>
                <SortLink
                  field="RESPONSE_SLA_RATE"
                  label="Response SLA"
                  query={query}
                />
              </TableHead>
              <TableHead>
                <SortLink
                  field="OVERDUE_FOLLOW_UP_COUNT"
                  label="Follow-ups"
                  query={query}
                />
              </TableHead>
              <TableHead>
                <SortLink
                  field="CONVERSION_RATE"
                  label="Conversion"
                  query={query}
                />
              </TableHead>
              <TableHead>
                <SortLink
                  field="OPEN_LEAD_COUNT"
                  label="Backlog"
                  query={query}
                />
              </TableHead>
              <TableHead>
                <SortLink field="ISSUE_COUNT" label="Health" query={query} />
              </TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((dealer) => {
              const flows = supportedFlows(dealer);
              return (
                <TableRow key={dealer.dealerOrgUnitId}>
                  <TableCell>
                    <div className="grid gap-1">
                      <Link
                        href={engagementDealerDetailHref(
                          dealer.dealerOrgUnitId,
                          query,
                        )}
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                      >
                        {dealer.dealerName}
                      </Link>
                      <span className="text-caption text-muted-readable">
                        {dealer.dealerCode}
                      </span>
                      <span className="text-caption text-muted-readable">
                        {[dealer.district, dealer.city]
                          .filter(Boolean)
                          .join(" · ") || "Location not classified"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant={dealer.orgUnitActive ? "secondary" : "outline"}
                      >
                        {dealer.orgUnitActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge
                        variant={
                          dealer.engagementActive ? "secondary" : "outline"
                        }
                      >
                        {dealer.engagementActive
                          ? "Engagement on"
                          : "Engagement off"}
                      </Badge>
                      <Badge
                        variant={
                          dealer.locationStatus === "READY"
                            ? "outline"
                            : "destructive"
                        }
                      >
                        <MapPin aria-hidden="true" className="size-3" />
                        {titleCaseDashboardToken(dealer.locationStatus)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-caption text-muted-readable">
                      {flows.length > 0
                        ? flows.join(" · ")
                        : "No supported flow"}
                    </p>
                  </TableCell>
                  <TableCell className="text-tabular">
                    <p>{formatDashboardInteger(dealer.assignedCount)}</p>
                    <p className="text-caption text-muted-readable">
                      {formatDashboardInteger(dealer.openLeadCount)} open
                    </p>
                  </TableCell>
                  <TableCell className="text-tabular">
                    <p>
                      {formatDashboardPercentage(dealer.responseSlaRatePct)}
                    </p>
                    <p className="text-caption text-muted-readable">
                      Median{" "}
                      {formatDashboardDuration(
                        dealer.medianFirstResponseMinutes,
                      )}
                    </p>
                  </TableCell>
                  <TableCell className="text-tabular">
                    <p>
                      {formatDashboardInteger(dealer.overdueFollowUpCount)}{" "}
                      overdue
                    </p>
                    <p className="text-caption text-muted-readable">
                      {formatDashboardInteger(dealer.followUpsDueCount)} due
                    </p>
                  </TableCell>
                  <TableCell className="text-tabular">
                    <p>{formatDashboardPercentage(dealer.conversionRatePct)}</p>
                    <p className="text-caption text-muted-readable">
                      {formatDashboardInteger(dealer.convertedCount)} converted
                      · {formatDashboardInteger(dealer.bookedCount)} booked
                    </p>
                  </TableCell>
                  <TableCell className="text-tabular">
                    <p>{formatDashboardInteger(dealer.openLeadCount)} open</p>
                    <p className="text-caption text-muted-readable">
                      Oldest{" "}
                      {formatDashboardDateTime(dealer.oldestUntouchedLeadAt)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <HealthBadge dealer={dealer} />
                    <p className="mt-2 text-caption text-muted-readable">
                      {formatDashboardInteger(dealer.issueCount)} issues ·{" "}
                      {formatDashboardInteger(dealer.failedCommunicationCount)}{" "}
                      comm failures
                    </p>
                  </TableCell>
                  <TableCell>
                    <DealerActions
                      dealer={dealer}
                      query={query}
                      capabilities={capabilities}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {result.items.map((dealer) => (
          <article
            key={dealer.dealerOrgUnitId}
            className="grid gap-3 rounded-2xl border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={engagementDealerDetailHref(
                    dealer.dealerOrgUnitId,
                    query,
                  )}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {dealer.dealerName}
                </Link>
                <p className="text-caption text-muted-readable">
                  {dealer.dealerCode}
                </p>
              </div>
              <HealthBadge dealer={dealer} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-body-sm">
              <div>
                <p className="text-caption text-muted-readable">Assigned</p>
                <p className="text-tabular">
                  {formatDashboardInteger(dealer.assignedCount)}
                </p>
              </div>
              <div>
                <p className="text-caption text-muted-readable">Response SLA</p>
                <p className="text-tabular">
                  {formatDashboardPercentage(dealer.responseSlaRatePct)}
                </p>
              </div>
              <div>
                <p className="text-caption text-muted-readable">Overdue</p>
                <p className="text-tabular">
                  {formatDashboardInteger(dealer.overdueFollowUpCount)}
                </p>
              </div>
              <div>
                <p className="text-caption text-muted-readable">Conversion</p>
                <p className="text-tabular">
                  {formatDashboardPercentage(dealer.conversionRatePct)}
                </p>
              </div>
            </div>
            <Button variant="outline" asChild className="justify-between">
              <Link
                href={engagementDealerDetailHref(dealer.dealerOrgUnitId, query)}
              >
                Open dealer workspace{" "}
                <ChevronRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        {query.dealerCursor !== undefined ? (
          <Button variant="outline" asChild>
            <Link
              href={engagementDashboardHref(
                query,
                { dealerCursor: null },
                "dealers",
              )}
              scroll={false}
            >
              First page
            </Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            First page
          </Button>
        )}
        <p className="text-caption text-muted-readable">
          Showing up to {result.pagination.limit} dealers
        </p>
        {result.pagination.hasMore && result.pagination.nextCursor !== null ? (
          <Button asChild>
            <Link
              href={engagementDashboardHref(
                query,
                { dealerCursor: result.pagination.nextCursor },
                "dealers",
              )}
              scroll={false}
            >
              Next page <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button disabled>Next page</Button>
        )}
      </div>
    </div>
  );
}

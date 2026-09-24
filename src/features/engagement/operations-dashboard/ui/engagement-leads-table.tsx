// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-leads-table.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Info, UserRound } from "lucide-react";

import {
  ContentDataSurface,
  ContentEmptyState,
} from "@/components/common/content-shell";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import type {
  EngagementDashboardLeadListItem,
  EngagementDashboardLeadListResult,
  EngagementDashboardSearchParams,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDashboardCapabilities } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { EngagementLeadDialog } from "@/features/engagement/operations-dashboard/ui/engagement-lead-dialog";
import {
  formatDashboardDateTime,
  formatDashboardInteger,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import {
  ENGAGEMENT_DASHBOARD_ROUTES,
  engagementWorkspaceHref,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";
import { truncateDisplayName } from "@/features/engagement/operations-dashboard/utils/display-text";

export type EngagementLeadsTableProps = Readonly<{
  result: EngagementDashboardLeadListResult;
  query: EngagementDashboardSearchParams;
  capabilities: Pick<
    EngagementDashboardCapabilities,
    "canReadCustomerContact" | "canReassignLead" | "canUpdateLeads"
  >;
}>;

function HeaderHelp({
  label,
  help,
}: Readonly<{ label: string; help: string }>): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex size-5 items-center justify-center rounded-md text-muted-readable"
            tabIndex={0}
          >
            <Info aria-hidden="true" className="size-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent>{help}</TooltipContent>
      </Tooltip>
    </span>
  );
}

function label(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll("_", " ")
    .replace(/\b\p{L}/gu, (character) => character.toLocaleUpperCase("en-US"));
}

function displaySource(lead: EngagementDashboardLeadListItem): string {
  return /telecmi|incoming.?call|phone/i.test(
    `${lead.source.code} ${lead.source.name}`,
  )
    ? "Incoming Call"
    : lead.source.name;
}

function displayStatus(lead: EngagementDashboardLeadListItem): Readonly<{
  label: string;
  detail: string;
  variant: BadgeProps["variant"];
}> {
  if (lead.convertedAt !== null)
    return {
      label: "Converted",
      detail: `Invoice recorded ${formatDashboardDateTime(lead.convertedAt)}`,
      variant: "success",
    };
  if (lead.bookedAt !== null)
    return {
      label: "Booked",
      detail: `Booking recorded ${formatDashboardDateTime(lead.bookedAt)}`,
      variant: "success",
    };
  if (lead.status === "NO_RESPONSE")
    return {
      label: "No Response",
      detail: `Last updated ${formatDashboardDateTime(lead.updatedAt)}`,
      variant: "warning",
    };
  if (
    ["LOST", "CANCELLED", "DISQUALIFIED"].includes(lead.status) ||
    lead.closedAt !== null
  )
    return { label: "Closed", detail: label(lead.status), variant: "outline" };
  if (lead.firstResponseAt !== null)
    return {
      label: "Contacted",
      detail: `Dealer activity ${formatDashboardDateTime(lead.firstResponseAt)}`,
      variant: "info",
    };
  if (lead.ownerAssignedAt !== null)
    return {
      label: "Assigned",
      detail: `Assigned ${formatDashboardDateTime(lead.ownerAssignedAt)}`,
      variant: "secondary",
    };
  if (lead.location.district === null)
    return {
      label: "Location Pending",
      detail: "Customer location is awaited",
      variant: "warning",
    };
  if (/call/i.test(`${lead.source.code} ${lead.source.name}`))
    return {
      label: "New Lead",
      detail: "Incoming call received",
      variant: "info",
    };
  return {
    label: "Pending",
    detail: "Awaiting the next engagement step",
    variant: "outline",
  };
}

export function EngagementLeadsTable({
  result,
  query,
  capabilities,
}: EngagementLeadsTableProps): React.ReactElement {
  const [selectedLead, setSelectedLead] =
    React.useState<EngagementDashboardLeadListItem | null>(null);
  const nextHref =
    result.pagination.nextCursor === null
      ? null
      : engagementWorkspaceHref(ENGAGEMENT_DASHBOARD_ROUTES.overview, query, {
          leadCursor: result.pagination.nextCursor,
        });

  return (
    <>
      <ContentDataSurface
        title="Vehicle-sales engagement queue"
        description="Priority queue for new and re-engaged vehicle-sales opportunities in the selected period. The backend owns engagement ordering while original acquisition history remains immutable."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {formatDashboardInteger(result.items.length)} shown
            </Badge>
            <Badge variant="secondary">Re-engagements prioritized</Badge>
            <Badge variant="outline">Select a row for details</Badge>
          </div>
        }
        contentClassName="px-[var(--card-spacing)] pb-[var(--card-spacing)]"
        footer={
          result.pagination.hasMore && nextHref !== null ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-caption text-muted-readable">
                Results use stable cursor pagination.
              </p>
              <Button variant="outline" asChild>
                <Link href={nextHref} prefetch={false}>
                  Next page
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </div>
          ) : null
        }
      >
        {result.items.length === 0 ? (
          <ContentEmptyState
            icon={<UserRound aria-hidden="true" />}
            title="No leads match the current view"
            description="Adjust the date range, global search, or advanced filters."
          />
        ) : (
          <div
            role="region"
            aria-label="Vehicle-sales engagement queue table"
            tabIndex={0}
            className="scrollbar-compact scrollbar-stable max-w-full overflow-x-auto overscroll-x-contain rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/45"
          >
            <Table className="table-fixed min-w-[70rem]">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[15%]" />
                <col className="w-[16%]" />
                <col className="w-[22%]" />
                <col className="w-[19%]" />
                <col className="w-[12%]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>Leads</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <HeaderHelp
                      label="Latest activity"
                      help="Most recent recorded lead activity. Queue priority is determined by the backend engagement order; original acquisition time is retained separately."
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((lead) => {
                  const contact =
                    lead.customer.contactMasked ?? lead.customer.contact;
                  const status = displayStatus(lead);

                  return (
                    <TableRow
                      key={lead.leadId}
                      tabIndex={0}
                      aria-label={`View details for lead ${lead.leadNo}`}
                      className="cursor-pointer outline-none transition-colors hover:bg-muted/45 focus-visible:bg-muted/55 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/45"
                      onClick={() => {
                        setSelectedLead(lead);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedLead(lead);
                        }
                      }}
                    >
                      <TableCell className="align-top">
                        <div className="grid min-w-44 gap-1">
                          <button
                            type="button"
                            className="w-fit font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedLead(lead);
                            }}
                          >
                            {lead.leadNo}
                          </button>
                          <span className="whitespace-nowrap text-caption text-muted-readable text-tabular">
                            {formatDashboardDateTime(lead.createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="grid min-w-40 gap-1">
                          <span className="font-medium text-foreground">
                            {lead.customer.name ?? "New Customer"}
                          </span>
                          <span className="text-caption text-muted-readable text-tabular">
                            {contact ?? "Contact unavailable"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="grid min-w-40 gap-1">
                          <span className="font-medium text-foreground">
                            {displaySource(lead)}
                          </span>
                          <span className="text-caption text-muted-readable">
                            {[lead.location.district, lead.location.state]
                              .filter(
                                (value): value is string => value !== null,
                              )
                              .join(", ") || "Location Unavailable"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0 max-w-0 align-top">
                        {lead.dealer === null ? (
                          <Badge
                            variant="warning"
                            className="dark:border-amber-400/50 dark:bg-amber-400/20 dark:text-amber-100"
                          >
                            Unassigned
                          </Badge>
                        ) : (
                          <div className="grid min-w-0 max-w-full gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="block min-w-0 truncate font-medium text-foreground"
                                  title={lead.dealer.name}
                                  aria-label={lead.dealer.name}
                                >
                                  {truncateDisplayName(lead.dealer.name, 24)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {lead.dealer.name}
                              </TooltipContent>
                            </Tooltip>
                            <span className="whitespace-nowrap text-caption text-muted-readable text-tabular">
                              {lead.assignmentDistanceKm === null
                                ? "Distance unavailable"
                                : `${lead.assignmentDistanceKm.toFixed(1)} km away`}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="min-w-0 align-top">
                        <Badge
                          variant={status.variant}
                          className={
                            status.variant === "warning"
                              ? "dark:border-amber-400/50 dark:bg-amber-400/20 dark:text-amber-100"
                              : undefined
                          }
                        >
                          {status.label}
                        </Badge>
                        <p
                          className="mt-1 max-w-full truncate text-caption text-muted-readable"
                          title={status.detail}
                        >
                          {status.detail}
                        </p>
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap text-caption text-muted-readable text-tabular">
                        {formatDashboardDateTime(lead.lastActivityAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </ContentDataSurface>

      <EngagementLeadDialog
        lead={selectedLead}
        capabilities={capabilities}
        open={selectedLead !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedLead(null);
        }}
      />
    </>
  );
}

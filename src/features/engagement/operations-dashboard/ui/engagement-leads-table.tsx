// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-leads-table.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CircleCheck,
  CircleDashed,
  ClockAlert,
  Eye,
  Info,
  UserRound,
} from "lucide-react";

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

function responseBadge(
  state: EngagementDashboardLeadListItem["responseSlaState"],
): Readonly<{
  variant: BadgeProps["variant"];
  text: string;
  icon: React.ReactNode;
}> {
  switch (state) {
    case "WITHIN_SLA":
      return {
        variant: "success",
        text: "Within SLA",
        icon: <CircleCheck aria-hidden="true" />,
      };
    case "BREACHED":
      return {
        variant: "destructive",
        text: "Breached",
        icon: <ClockAlert aria-hidden="true" />,
      };
    case "PENDING":
      return {
        variant: "warning",
        text: "Pending",
        icon: <CircleDashed aria-hidden="true" />,
      };
    case "NOT_ASSIGNED":
      return {
        variant: "outline",
        text: "Not assigned",
        icon: <UserRound aria-hidden="true" />,
      };
  }
}

function followUpVariant(
  state: EngagementDashboardLeadListItem["followUpState"],
): BadgeProps["variant"] {
  switch (state) {
    case "OVERDUE":
      return "destructive";
    case "DUE_TODAY":
      return "warning";
    case "SCHEDULED":
      return "info";
    case "CLOSED":
      return "success";
    case "NONE":
      return "outline";
  }
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
        title="Vehicle-sales leads"
        description="Operational lead queue for assignment, response, follow-up, booking, conversion, and authorized interventions."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {formatDashboardInteger(result.items.length)} shown
            </Badge>
            <Badge variant="secondary">Select a row for details</Badge>
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
                <Link href={nextHref}>
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
            aria-label="Vehicle-sales leads table"
            tabIndex={0}
            className="scrollbar-compact scrollbar-stable max-w-full overflow-x-auto overscroll-x-contain rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/45"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead>
                    <HeaderHelp
                      label="Response"
                      help="Compares the first recorded dealer response with the configured response SLA."
                    />
                  </TableHead>
                  <TableHead>
                    <HeaderHelp
                      label="Follow-up"
                      help="Shows whether a next action is missing, scheduled, due today, overdue, or closed."
                    />
                  </TableHead>
                  <TableHead>
                    <HeaderHelp
                      label="Outcome"
                      help="Displays the strongest verified lifecycle outcome: converted, booked, closed, or current status."
                    />
                  </TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead className="w-14">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((lead) => {
                  const response = responseBadge(lead.responseSlaState);
                  const contact =
                    lead.customer.contactMasked ?? lead.customer.contact;
                  const outcome =
                    lead.convertedAt !== null
                      ? "Converted"
                      : lead.bookedAt !== null
                        ? "Booked"
                        : lead.closedAt !== null
                          ? "Closed"
                          : label(lead.status);

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
                      <TableCell>
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
                          <span className="text-caption text-muted-readable">
                            {lead.source.name} ·{" "}
                            {formatDashboardDateTime(lead.createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="grid min-w-40 gap-1">
                          <span className="font-medium text-foreground">
                            {lead.customer.name ?? "Unnamed customer"}
                          </span>
                          <span className="text-caption text-muted-readable text-tabular">
                            {contact ?? "Contact unavailable"}
                          </span>
                          <span className="text-caption text-muted-readable">
                            {[lead.location.city, lead.location.district]
                              .filter(
                                (value): value is string => value !== null,
                              )
                              .join(", ") || "Location unavailable"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.dealer === null ? (
                          <Badge variant="warning">Unassigned</Badge>
                        ) : (
                          <div className="grid min-w-40 gap-1">
                            <span className="font-medium text-foreground">
                              {lead.dealer.name}
                            </span>
                            <span className="text-caption text-muted-readable">
                              {lead.dealer.code}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={response.variant}>
                          {response.icon}
                          {response.text}
                        </Badge>
                        {lead.firstResponseAt !== null ? (
                          <p className="mt-1 text-caption text-muted-readable">
                            {formatDashboardDateTime(lead.firstResponseAt)}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={followUpVariant(lead.followUpState)}>
                          <CalendarClock aria-hidden="true" />
                          {label(lead.followUpState)}
                        </Badge>
                        {lead.nextFollowUpAt !== null ? (
                          <p className="mt-1 text-caption text-muted-readable">
                            {formatDashboardDateTime(lead.nextFollowUpAt)}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            lead.convertedAt !== null ? "success" : "outline"
                          }
                        >
                          {outcome}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-caption text-muted-readable">
                        {formatDashboardDateTime(lead.lastActivityAt)}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`View details for ${lead.leadNo}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedLead(lead);
                              }}
                            >
                              <Eye aria-hidden="true" className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View lead details</TooltipContent>
                        </Tooltip>
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

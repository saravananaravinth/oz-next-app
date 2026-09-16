// oz-next-app/src/features/engagement/vehicle-enquiries/ui/vehicle-enquiries-lead-monitor.tsx
"use client";

import * as React from "react";
import {
  CalendarClock,
  CircleCheck,
  CircleDashed,
  ClockAlert,
  Eye,
  UserRound,
} from "lucide-react";

import { ContentEmptyState } from "@/components/common/content-shell";
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
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDashboardCapabilities } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { EngagementLeadDialog } from "@/features/engagement/operations-dashboard/ui/engagement-lead-dialog";
import {
  formatDashboardDateTime,
  titleCaseDashboardToken,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";

export type VehicleEnquiriesLeadMonitorProps = Readonly<{
  result: EngagementDashboardLeadListResult;
  capabilities: Pick<
    EngagementDashboardCapabilities,
    "canReadCustomerContact" | "canReassignLead" | "canUpdateLeads"
  >;
}>;

function responseState(
  state: EngagementDashboardLeadListItem["responseSlaState"],
): Readonly<{
  variant: BadgeProps["variant"];
  label: string;
  icon: React.ReactNode;
}> {
  switch (state) {
    case "WITHIN_SLA":
      return {
        variant: "success",
        label: "Within SLA",
        icon: <CircleCheck aria-hidden="true" />,
      };
    case "BREACHED":
      return {
        variant: "destructive",
        label: "Breached",
        icon: <ClockAlert aria-hidden="true" />,
      };
    case "PENDING":
      return {
        variant: "warning",
        label: "Pending",
        icon: <CircleDashed aria-hidden="true" />,
      };
    case "NOT_ASSIGNED":
      return {
        variant: "outline",
        label: "Not assigned",
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

export function VehicleEnquiriesLeadMonitor({
  result,
  capabilities,
}: VehicleEnquiriesLeadMonitorProps): React.ReactElement {
  const [selectedLead, setSelectedLead] =
    React.useState<EngagementDashboardLeadListItem | null>(null);

  if (result.items.length === 0) {
    return (
      <ContentEmptyState
        icon={<UserRound aria-hidden="true" />}
        title="No Vehicle Enquiries leads match this view"
        description="Use the command-center search or filters to locate a lead by the fields supported by the engagement dashboard API."
      />
    );
  }

  return (
    <>
      <div
        role="region"
        aria-label="Vehicle Enquiries lead monitor"
        tabIndex={0}
        className="scrollbar-compact scrollbar-stable max-w-full overflow-x-auto overscroll-x-contain rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/45"
      >
        <Table className="min-w-[72rem]">
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Dealer</TableHead>
              <TableHead>Response</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Latest activity</TableHead>
              <TableHead>
                <span className="sr-only">Inspect</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((lead) => {
              const response = responseState(lead.responseSlaState);
              const outcome =
                lead.convertedAt !== null
                  ? "Converted"
                  : lead.bookedAt !== null
                    ? "Booked"
                    : lead.closedAt !== null
                      ? "Closed"
                      : titleCaseDashboardToken(lead.status);
              const contact =
                lead.customer.contactMasked ??
                (capabilities.canReadCustomerContact
                  ? lead.customer.contact
                  : null);

              return (
                <TableRow
                  key={lead.leadId}
                  className="cursor-pointer"
                  tabIndex={0}
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
                      <span className="font-medium text-foreground">
                        {lead.leadNo}
                      </span>
                      <span className="text-caption text-muted-readable">
                        {lead.source.name} ·{" "}
                        {formatDashboardDateTime(lead.createdAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="grid min-w-44 gap-1">
                      <span className="font-medium text-foreground">
                        {lead.customer.name ?? "Unnamed customer"}
                      </span>
                      <span className="text-caption text-muted-readable text-tabular">
                        {contact ?? "Contact unavailable"}
                      </span>
                      <span className="text-caption text-muted-readable">
                        {[lead.location.city, lead.location.district]
                          .filter((value): value is string => value !== null)
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
                      {response.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={followUpVariant(lead.followUpState)}>
                      <CalendarClock aria-hidden="true" />
                      {titleCaseDashboardToken(lead.followUpState)}
                    </Badge>
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
                          aria-label={`Inspect ${lead.leadNo}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedLead(lead);
                          }}
                        >
                          <Eye aria-hidden="true" className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Open the existing Lead 360 journey and timeline
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <EngagementLeadDialog
        lead={selectedLead}
        capabilities={capabilities}
        open={selectedLead !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLead(null);
          }
        }}
      />
    </>
  );
}

// oz-next-app/src/features/engagement/vehicle-enquiries/ui/vehicle-enquiries-incident-queue.tsx
"use client";

import * as React from "react";
import { Clock3, Eye, ShieldCheck, TriangleAlert } from "lucide-react";

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
  EngagementDashboardIssue,
  EngagementDashboardIssueResult,
  EngagementDashboardLeadListItem,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDashboardCapabilities } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { EngagementLeadDialog } from "@/features/engagement/operations-dashboard/ui/engagement-lead-dialog";
import { EngagementIssueActions } from "@/features/engagement/operations-dashboard/ui/issue-actions";
import {
  formatDashboardAge,
  formatDashboardDateTime,
  titleCaseDashboardToken,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";

export type VehicleEnquiriesIncidentQueueProps = Readonly<{
  result: EngagementDashboardIssueResult;
  capabilities: Pick<
    EngagementDashboardCapabilities,
    | "canIntervene"
    | "canReadCustomerContact"
    | "canReassignLead"
    | "canRetryDelivery"
    | "canUpdateLeads"
  >;
}>;

const SEVERITY_VARIANT = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "outline",
} as const satisfies Readonly<
  Record<EngagementDashboardIssue["severity"], BadgeProps["variant"]>
>;

export function VehicleEnquiriesIncidentQueue({
  result,
  capabilities,
}: VehicleEnquiriesIncidentQueueProps): React.ReactElement {
  const [selectedLead, setSelectedLead] = React.useState<Pick<
    EngagementDashboardLeadListItem,
    "leadId" | "leadNo"
  > | null>(null);

  if (result.items.length === 0) {
    return (
      <ContentEmptyState
        icon={<ShieldCheck aria-hidden="true" />}
        title="No support incidents match this view"
        description="No deterministic Vehicle Enquiries support issue is visible for the active filters. This does not imply that upstream provider or task telemetry is healthy."
      />
    );
  }

  return (
    <>
      <div
        role="region"
        aria-label="Vehicle Enquiries incident queue"
        tabIndex={0}
        className="scrollbar-compact scrollbar-stable max-w-full overflow-x-auto overscroll-x-contain rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/45"
      >
        <Table className="min-w-[78rem] table-fixed">
          <colgroup>
            <col className="w-[10rem]" />
            <col className="w-[18rem]" />
            <col className="w-[15rem]" />
            <col className="w-[9rem]" />
            <col className="w-[26rem]" />
            <col className="w-[10rem]" />
            <col className="w-[5rem]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Priority</TableHead>
              <TableHead>Incident</TableHead>
              <TableHead>Lead / dealer</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Recommended action</TableHead>
              <TableHead>State</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((issue) => (
              <TableRow key={issue.issueKey}>
                <TableCell className="align-top whitespace-normal">
                  <div className="grid gap-1.5">
                    <Badge variant={SEVERITY_VARIANT[issue.severity]}>
                      {issue.severity}
                    </Badge>
                    <span className="text-caption text-muted-readable">
                      {titleCaseDashboardToken(issue.category)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="align-top whitespace-normal">
                  <div className="grid gap-1.5">
                    <span className="font-medium text-foreground">
                      {issue.title}
                    </span>
                    <span className="line-clamp-3 text-caption leading-5 text-muted-readable">
                      {issue.detail}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="align-top whitespace-normal">
                  <div className="grid gap-1.5">
                    {issue.leadId !== null && issue.leadNo !== null ? (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto w-fit justify-start p-0"
                        onClick={() => {
                          if (issue.leadId === null || issue.leadNo === null) {
                            return;
                          }

                          setSelectedLead({
                            leadId: issue.leadId,
                            leadNo: issue.leadNo,
                          });
                        }}
                      >
                        <Eye aria-hidden="true" className="size-3.5" />
                        {issue.leadNo}
                      </Button>
                    ) : (
                      <span className="text-body-sm text-muted-readable">
                        Not lead-specific
                      </span>
                    )}
                    <span className="text-caption text-muted-readable">
                      {issue.dealerName ?? "Dealer not assigned"}
                    </span>
                    <span className="text-caption text-muted-readable">
                      {issue.customerName ?? "Customer unavailable"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="grid gap-1.5 text-tabular">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Clock3 aria-hidden="true" className="size-3.5" />
                      {formatDashboardAge(issue.issueAgeMinutes)}
                    </span>
                    <span className="text-caption text-muted-readable">
                      {formatDashboardDateTime(issue.occurredAt)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="align-top whitespace-normal">
                  <div className="rounded-xl border border-primary/15 bg-primary/[0.035] p-3 text-body-sm leading-5">
                    {issue.recommendedAction}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Badge
                    variant={
                      issue.state === "RESOLVED"
                        ? "success"
                        : issue.state === "ACKNOWLEDGED"
                          ? "info"
                          : "outline"
                    }
                  >
                    {titleCaseDashboardToken(issue.state)}
                  </Badge>
                </TableCell>
                <TableCell className="align-top">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <EngagementIssueActions
                          issue={issue}
                          capabilities={capabilities}
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Audited support actions are permission-gated and validated
                      by the backend.
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {result.pagination.hasMore ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/[0.04] px-3 py-2 text-caption text-muted-readable">
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
          This command center shows one deterministic incident page. Use the
          Support workspace for cursor pagination across the complete queue.
        </div>
      ) : null}

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

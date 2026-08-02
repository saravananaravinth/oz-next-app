// oz-next-app/src/features/engagement/dealership-application-operations/ui/dealership-applications-table.tsx
import type * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CircleAlert,
  Inbox,
  MapPin,
  UserRound,
} from "lucide-react";

import { ContentEmptyState } from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
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
  DealershipApplicationListItem,
  DealershipApplicationPage,
  DealershipApplicationSearchParams,
} from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";
import {
  formatDealershipDateTime,
  formatDealershipInteger,
  titleCaseDealershipToken,
} from "@/features/engagement/dealership-application-operations/utils/dealership-application-format";
import {
  dealershipApplicationDashboardHref,
  dealershipApplicationDetailHref,
} from "@/features/engagement/dealership-application-operations/utils/dealership-application-url";

export type DealershipApplicationsTableProps = Readonly<{
  result: DealershipApplicationPage;
  query: DealershipApplicationSearchParams;
}>;

function priorityVariant(
  priority: DealershipApplicationListItem["priority"],
): "default" | "secondary" | "outline" | "destructive" {
  if (priority === "URGENT") return "destructive";
  if (priority === "HIGH") return "default";
  if (priority === "LOW") return "outline";
  return "secondary";
}

function statusVariant(
  item: DealershipApplicationListItem,
): "default" | "secondary" | "outline" | "destructive" {
  if (item.status === "REJECTED" || item.overdue) return "destructive";
  if (item.status === "ACTIVE") return "default";
  if (item.phase === "ONBOARDING" || item.phase === "EXIT") return "secondary";
  return "outline";
}

function location(item: DealershipApplicationListItem): string {
  return (
    [item.city, item.district, item.state].filter(Boolean).join(", ") ||
    "Not captured"
  );
}

export function DealershipApplicationsTable({
  result,
  query,
}: DealershipApplicationsTableProps): React.ReactElement {
  if (result.items.length === 0) {
    return (
      <ContentEmptyState
        icon={<Inbox aria-hidden="true" />}
        title="No applications match this view"
        description="Adjust the lifecycle, ownership, source, or date filters. No records were rendered outside the active actor scope."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application</TableHead>
              <TableHead>Source and location</TableHead>
              <TableHead>Lifecycle</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Next action</TableHead>
              <TableHead>Workload</TableHead>
              <TableHead className="text-end">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((item) => (
              <TableRow key={item.applicationId}>
                <TableCell className="min-w-60 align-top">
                  <div className="grid gap-1">
                    <Link
                      href={dealershipApplicationDetailHref(
                        item.applicationId,
                        query,
                      )}
                      className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.applicantName}
                    </Link>
                    <span className="text-caption text-muted-readable">
                      {item.applicationNo ?? item.leadNo}
                    </span>
                    <span className="text-caption text-muted-readable">
                      Received {formatDealershipDateTime(item.createdAt)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="min-w-56 align-top">
                  <div className="grid gap-1.5">
                    <span className="text-body-sm">
                      {item.sourceName ??
                        item.sourceCode ??
                        "Unattributed source"}
                    </span>
                    <span className="flex items-center gap-1.5 text-caption text-muted-readable">
                      <MapPin aria-hidden="true" className="size-3.5" />
                      {location(item)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="min-w-48 align-top">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant={statusVariant(item)}>
                      {titleCaseDealershipToken(item.status)}
                    </Badge>
                    <Badge variant={priorityVariant(item.priority)}>
                      {titleCaseDealershipToken(item.priority)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-caption text-muted-readable">
                    {titleCaseDealershipToken(item.phase)}
                  </p>
                </TableCell>
                <TableCell className="min-w-52 align-top">
                  <div className="flex items-start gap-2">
                    <UserRound
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-muted-readable"
                    />
                    <div className="grid gap-0.5">
                      <span className="text-body-sm">
                        {item.ownerName ?? "Unassigned"}
                      </span>
                      <span className="text-caption text-muted-readable">
                        {item.ownerOrgUnitName ?? "Root work queue"}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="min-w-48 align-top">
                  <div className="flex items-start gap-2">
                    <CalendarClock
                      aria-hidden="true"
                      className={
                        item.overdue
                          ? "mt-0.5 size-4 shrink-0 text-destructive"
                          : "mt-0.5 size-4 shrink-0 text-muted-readable"
                      }
                    />
                    <div className="grid gap-0.5">
                      <span
                        className={
                          item.overdue
                            ? "text-body-sm font-medium text-destructive"
                            : "text-body-sm"
                        }
                      >
                        {formatDealershipDateTime(item.nextActionAt)}
                      </span>
                      {item.overdue ? (
                        <span className="text-caption text-destructive">
                          Overdue
                        </span>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="min-w-44 align-top">
                  <div className="flex flex-wrap gap-1.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline">
                          {formatDealershipInteger(item.openActivityCount)}{" "}
                          activities
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Open activities and scheduled actions.
                      </TooltipContent>
                    </Tooltip>
                    {item.pendingMandatoryChecklistCount > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="destructive">
                            <CircleAlert
                              aria-hidden="true"
                              className="size-3"
                            />
                            {formatDealershipInteger(
                              item.pendingMandatoryChecklistCount,
                            )}{" "}
                            blockers
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Mandatory checklist items still pending.
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-end align-top">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={dealershipApplicationDetailHref(
                        item.applicationId,
                        query,
                      )}
                    >
                      Open
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-muted-readable">
          Showing {formatDealershipInteger(result.items.length)} records ·
          Snapshot {formatDealershipDateTime(result.asOf)}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link
              href={dealershipApplicationDashboardHref(query, { cursor: null })}
            >
              First page
            </Link>
          </Button>
          {result.pagination.hasMore &&
          result.pagination.nextCursor !== null ? (
            <Button asChild>
              <Link
                href={dealershipApplicationDashboardHref(query, {
                  cursor: result.pagination.nextCursor,
                })}
              >
                Next page
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button disabled>End of queue</Button>
          )}
        </div>
      </div>
    </div>
  );
}

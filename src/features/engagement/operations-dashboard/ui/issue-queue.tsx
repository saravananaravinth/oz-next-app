// oz-next-app/src/features/engagement/operations-dashboard/ui/issue-queue.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronsLeft,
  ClockAlert,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldAlert,
  UserRound,
} from "lucide-react";

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
  ENGAGEMENT_DASHBOARD_PAGE_LIMITS,
  type EngagementDashboardIssue,
  type EngagementDashboardIssueResult,
  type EngagementDashboardSearchParams,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDashboardCapabilities } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { EngagementIssueActions } from "@/features/engagement/operations-dashboard/ui/issue-actions";
import { EngagementLeadDialog } from "@/features/engagement/operations-dashboard/ui/engagement-lead-dialog";
import { EngagementMetricGrid } from "@/features/engagement/operations-dashboard/ui/engagement-metric-grid";
import {
  formatDashboardAge,
  formatDashboardDateTime,
  formatDashboardInteger,
  titleCaseDashboardToken,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import {
  ENGAGEMENT_DASHBOARD_ROUTES,
  engagementWorkspaceHref,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type IssueQueueProps = Readonly<{
  result: EngagementDashboardIssueResult;
  query: EngagementDashboardSearchParams;
  capabilities: Pick<
    EngagementDashboardCapabilities,
    | "canIntervene"
    | "canReadCustomerContact"
    | "canReassignLead"
    | "canRetryDelivery"
    | "canUpdateLeads"
  >;
}>;

type EngagementDashboardPageLimit =
  (typeof ENGAGEMENT_DASHBOARD_PAGE_LIMITS)[number];

const SEVERITY_VARIANT = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "outline",
} as const satisfies Readonly<
  Record<EngagementDashboardIssue["severity"], BadgeProps["variant"]>
>;

function isPageLimit(value: number): value is EngagementDashboardPageLimit {
  return ENGAGEMENT_DASHBOARD_PAGE_LIMITS.some(
    (candidate) => candidate === value,
  );
}

function IssuePriorityBadge({
  issue,
}: Readonly<{
  issue: EngagementDashboardIssue;
}>): React.ReactElement {
  const categoryLabel = titleCaseDashboardToken(issue.category);

  return (
    <div className="grid min-w-0 gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="w-fit rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
            aria-label={`View issue details: ${issue.title}`}
          >
            <Badge
              variant={SEVERITY_VARIANT[issue.severity]}
              className="cursor-help"
            >
              {issue.severity}
            </Badge>
          </button>
        </TooltipTrigger>

        <TooltipContent
          side="right"
          align="start"
          sideOffset={10}
          collisionPadding={16}
          className="block w-80 whitespace-normal p-3 text-start"
        >
          <p className="text-body-sm leading-5 font-medium">{issue.title}</p>

          <p className="mt-1.5 text-caption leading-5 opacity-75">
            {issue.detail}
          </p>
        </TooltipContent>
      </Tooltip>

      <span className="whitespace-normal break-words text-caption text-muted-readable">
        {categoryLabel}
      </span>
    </div>
  );
}

function CustomerContactControl({
  issue,
  canReadCustomerContact,
}: Readonly<{
  issue: EngagementDashboardIssue;
  canReadCustomerContact: boolean;
}>): React.ReactElement {
  const [revealed, setRevealed] = React.useState(false);

  const authorizedContact = canReadCustomerContact
    ? issue.customerContact
    : null;

  const hiddenContact =
    issue.customerContactMasked ??
    (authorizedContact === null
      ? "Contact unavailable"
      : "Mobile number hidden");

  const visibleContact =
    revealed && authorizedContact !== null ? authorizedContact : hiddenContact;

  if (authorizedContact === null) {
    return (
      <span className="truncate text-caption text-muted-readable text-tabular">
        {hiddenContact}
      </span>
    );
  }

  const actionLabel = revealed
    ? "Hide customer mobile number"
    : "Show customer mobile number";

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span
        aria-live="polite"
        className="min-w-0 truncate text-caption text-muted-readable text-tabular"
      >
        {visibleContact}
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0"
            aria-label={actionLabel}
            aria-pressed={revealed}
            onClick={() => {
              setRevealed((current) => !current);
            }}
          >
            {revealed ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
          </Button>
        </TooltipTrigger>

        <TooltipContent side="top">{actionLabel}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function IssueQueuePagination({
  result,
  query,
  nextHref,
}: Readonly<{
  result: EngagementDashboardIssueResult;
  query: EngagementDashboardSearchParams;
  nextHref: ReturnType<typeof engagementWorkspaceHref> | null;
}>): React.ReactElement {
  const router = useRouter();

  const firstPageHref =
    query.issueCursor === undefined
      ? null
      : engagementWorkspaceHref(ENGAGEMENT_DASHBOARD_ROUTES.issues, query, {
          issueCursor: null,
        });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/25 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-caption text-muted-readable">
            Rows per page
          </span>

          <Select
            value={String(query.issueLimit)}
            onValueChange={(value) => {
              const numericValue = Number(value);

              if (!isPageLimit(numericValue)) {
                return;
              }

              router.push(
                engagementWorkspaceHref(
                  ENGAGEMENT_DASHBOARD_ROUTES.issues,
                  query,
                  {
                    issueLimit: numericValue,
                    issueCursor: null,
                  },
                ),
                {
                  scroll: false,
                },
              );
            }}
          >
            <SelectTrigger
              aria-label="Support issues per page"
              className="h-9 w-20"
            >
              <SelectValue placeholder="Select issues per page" />
            </SelectTrigger>

            <SelectContent align="start">
              {ENGAGEMENT_DASHBOARD_PAGE_LIMITS.map((limit) => (
                <SelectItem key={limit} value={String(limit)}>
                  {limit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-caption text-muted-readable" aria-live="polite">
          {formatDashboardInteger(result.items.length)} issues shown
        </span>

        <span className="hidden text-caption text-muted-readable lg:inline">
          Data as of {formatDashboardDateTime(result.asOf)}
        </span>
      </div>

      <Pagination
        aria-label="Support work queue pagination"
        className="mx-0 w-auto justify-start sm:justify-end"
      >
        <PaginationContent className="flex-wrap justify-start sm:justify-end">
          {firstPageHref !== null ? (
            <PaginationItem>
              <Button variant="outline" size="sm" asChild>
                <Link href={firstPageHref} scroll={false}>
                  <ChevronsLeft aria-hidden="true" className="size-4" />
                  First page
                </Link>
              </Button>
            </PaginationItem>
          ) : null}

          <PaginationItem>
            <span className="inline-flex h-9 items-center rounded-xl px-3 text-caption text-muted-readable">
              {query.issueCursor === undefined
                ? "First page"
                : "Continued results"}
            </span>
          </PaginationItem>

          {result.pagination.hasMore && nextHref !== null ? (
            <PaginationItem>
              <Button variant="outline" size="sm" asChild>
                <Link href={nextHref} scroll={false}>
                  Next page
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </PaginationItem>
          ) : (
            <PaginationItem>
              <span className="inline-flex h-9 items-center rounded-xl px-3 text-caption text-muted-readable">
                End of results
              </span>
            </PaginationItem>
          )}
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export function IssueQueue({
  result,
  query,
  capabilities,
}: IssueQueueProps): React.ReactElement {
  const [selectedLead, setSelectedLead] = React.useState<Readonly<{
    leadId: string;
    leadNo: string;
  }> | null>(null);

  const counts = result.items.reduce(
    (current, issue) => ({
      critical: current.critical + (issue.severity === "CRITICAL" ? 1 : 0),
      high: current.high + (issue.severity === "HIGH" ? 1 : 0),
      open: current.open + (issue.state === "OPEN" ? 1 : 0),
      retryEligible: current.retryEligible + (issue.retryEligible ? 1 : 0),
      oldestMinutes: Math.max(current.oldestMinutes, issue.issueAgeMinutes),
    }),
    {
      critical: 0,
      high: 0,
      open: 0,
      retryEligible: 0,
      oldestMinutes: 0,
    },
  );

  const nextHref =
    result.pagination.nextCursor === null
      ? null
      : engagementWorkspaceHref(ENGAGEMENT_DASHBOARD_ROUTES.issues, query, {
          issueCursor: result.pagination.nextCursor,
        });

  return (
    <>
      <div className="grid min-w-0 gap-4">
        <EngagementMetricGrid
          columns={5}
          metrics={[
            {
              id: "open",
              label: "Open in queue",
              value: formatDashboardInteger(counts.open),
              description: "Unacknowledged issues in this deterministic page",
              icon: <ShieldAlert aria-hidden="true" className="size-5" />,
              tone: counts.open > 0 ? "warning" : "success",
            },
            {
              id: "critical",
              label: "Critical",
              value: formatDashboardInteger(counts.critical),
              description: "Immediate operational intervention",
              icon: <ClockAlert aria-hidden="true" className="size-5" />,
              tone: counts.critical > 0 ? "destructive" : "success",
            },
            {
              id: "high",
              label: "High priority",
              value: formatDashboardInteger(counts.high),
              description: "Requires same-shift ownership",
              icon: <ShieldAlert aria-hidden="true" className="size-5" />,
              tone: counts.high > 0 ? "warning" : "success",
            },
            {
              id: "retry",
              label: "Retry eligible",
              value: formatDashboardInteger(counts.retryEligible),
              description: "Bounded idempotent retry is available",
              icon: <RefreshCw aria-hidden="true" className="size-5" />,
              tone: "info",
            },
            {
              id: "oldest",
              label: "Oldest issue",
              value: formatDashboardAge(counts.oldestMinutes),
              description: "Age of the oldest visible exception",
              icon: <ClockAlert aria-hidden="true" className="size-5" />,
              tone: counts.oldestMinutes >= 240 ? "warning" : "default",
            },
          ]}
        />

        {result.items.length === 0 ? (
          <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-border/70 p-6 text-center">
            <div>
              <UserRound
                aria-hidden="true"
                className="mx-auto size-8 text-muted-readable"
              />

              <p className="mt-3 text-card-title">
                No operational issues match this view
              </p>

              <p className="mt-1 text-body-sm text-muted-readable">
                This is a filtered result, not a guarantee that every workflow
                is healthy.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div
              role="region"
              aria-label="Support work queue table"
              className="max-w-full overflow-hidden rounded-2xl border border-border/70 [&_[data-slot=table-container]]:scrollbar-compact [&_[data-slot=table-container]]:overscroll-x-contain"
            >
              <Table className="min-w-[95rem] table-fixed">
                <colgroup>
                  <col className="w-[11rem]" />
                  <col className="w-[17rem]" />
                  <col className="w-[14rem]" />
                  <col className="w-[10rem]" />
                  <col className="w-[33rem]" />
                  <col className="w-[10rem]" />
                  <col className="w-[5rem]" />
                </colgroup>

                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead>Lead / customer</TableHead>
                    <TableHead>Dealer / flow</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Recommended action</TableHead>
                    <TableHead>Status</TableHead>

                    <TableHead className="text-center">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {result.items.map((issue) => (
                    <TableRow key={issue.issueKey}>
                      <TableCell className="align-top whitespace-normal">
                        <IssuePriorityBadge issue={issue} />
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="grid min-w-0 gap-1.5">
                          {issue.leadId !== null && issue.leadNo !== null ? (
                            <button
                              type="button"
                              className="w-fit max-w-full truncate text-start font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                              onClick={() => {
                                if (
                                  issue.leadId === null ||
                                  issue.leadNo === null
                                ) {
                                  return;
                                }

                                setSelectedLead({
                                  leadId: issue.leadId,
                                  leadNo: issue.leadNo,
                                });
                              }}
                            >
                              {issue.leadNo}
                            </button>
                          ) : (
                            <span className="font-medium">
                              Not lead-specific
                            </span>
                          )}

                          <span className="truncate text-caption text-muted-readable">
                            {issue.customerName ?? "Customer unavailable"}
                          </span>

                          <CustomerContactControl
                            issue={issue}
                            canReadCustomerContact={
                              capabilities.canReadCustomerContact
                            }
                          />
                        </div>
                      </TableCell>

                      <TableCell className="align-top whitespace-normal">
                        <div className="grid min-w-0 gap-1.5">
                          <span className="break-words font-medium">
                            {issue.dealerName ?? "Not assigned"}
                          </span>

                          <span className="break-words text-caption text-muted-readable">
                            {issue.flowCode ?? "Vehicle sales"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="grid min-w-0 gap-1.5">
                          <span className="font-medium text-tabular">
                            {formatDashboardAge(issue.issueAgeMinutes)}
                          </span>

                          <span className="whitespace-normal text-caption text-muted-readable">
                            {formatDashboardDateTime(issue.occurredAt)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="align-top whitespace-normal">
                        <div className="min-w-0 overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.04] p-3">
                          <p className="whitespace-normal break-words text-body-sm leading-5 [overflow-wrap:anywhere]">
                            {issue.recommendedAction}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="flex min-w-0 items-start">
                          <Badge
                            variant={
                              issue.state === "RESOLVED"
                                ? "success"
                                : issue.state === "ACKNOWLEDGED"
                                  ? "info"
                                  : "outline"
                            }
                            className="max-w-full"
                          >
                            {titleCaseDashboardToken(issue.state)}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="align-top">
                        <div className="flex min-w-0 justify-center">
                          <EngagementIssueActions
                            issue={issue}
                            capabilities={capabilities}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <IssueQueuePagination
              result={result}
              query={query}
              nextHref={nextHref}
            />
          </>
        )}
      </div>

      <EngagementLeadDialog
        lead={selectedLead}
        capabilities={capabilities}
        open={selectedLead !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedLead(null);
          }
        }}
      />
    </>
  );
}

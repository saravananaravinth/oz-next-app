// oz-next-app/src/features/engagement/operations-dashboard/ui/issue-queue.tsx
"use client";

import type * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Clock3, ShieldAlert, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  ENGAGEMENT_DASHBOARD_PAGE_LIMITS,
  type EngagementDashboardIssue,
  type EngagementDashboardIssueResult,
  type EngagementDashboardSearchParams,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDashboardCapabilities } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { EngagementIssueActions } from "@/features/engagement/operations-dashboard/ui/issue-actions";
import {
  formatDashboardAge,
  formatDashboardDateTime,
  titleCaseDashboardToken,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import {
  engagementDashboardHref,
  engagementDealerDetailHref,
  engagementLeadDetailHref,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type EngagementIssueQueueProps = Readonly<{
  result: EngagementDashboardIssueResult;
  query: EngagementDashboardSearchParams;
  capabilities: Pick<
    EngagementDashboardCapabilities,
    "canIntervene" | "canReassignLead" | "canRetryDelivery" | "canReadLeads"
  >;
}>;

const SEVERITY_VARIANT = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
} as const;

function isPageLimit(value: number): value is 25 | 50 | 100 {
  return ENGAGEMENT_DASHBOARD_PAGE_LIMITS.some((item) => item === value);
}

function RelatedEntities({
  issue,
  query,
  canReadLeads,
}: Readonly<{
  issue: EngagementDashboardIssue;
  query: EngagementDashboardSearchParams;
  canReadLeads: boolean;
}>) {
  return (
    <div className="grid gap-1 text-caption">
      {issue.leadId !== null && issue.leadNo !== null && canReadLeads ? (
        <Link
          href={engagementLeadDetailHref(issue.leadId, query)}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Lead {issue.leadNo}
        </Link>
      ) : issue.leadNo !== null ? (
        <span>Lead {issue.leadNo}</span>
      ) : null}
      {issue.dealerOrgUnitId !== null && issue.dealerName !== null ? (
        <Link
          href={engagementDealerDetailHref(issue.dealerOrgUnitId, query)}
          className="text-muted-readable underline-offset-4 hover:text-foreground hover:underline"
        >
          {issue.dealerName}
        </Link>
      ) : null}
      {issue.customerName !== null || issue.customerContactMasked !== null ? (
        <span className="flex items-center gap-1 text-muted-readable">
          <UserRound aria-hidden="true" className="size-3" />
          {[issue.customerName, issue.customerContactMasked]
            .filter(Boolean)
            .join(" · ")}
        </span>
      ) : null}
    </div>
  );
}

export function EngagementIssueQueue({
  result,
  query,
  capabilities,
}: EngagementIssueQueueProps): React.ReactElement {
  const router = useRouter();
  if (result.items.length === 0) {
    return (
      <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed p-6 text-center">
        <div>
          <ShieldAlert
            aria-hidden="true"
            className="mx-auto size-8 text-muted-readable"
          />
          <p className="mt-3 text-card-title">No operational issues match</p>
          <p className="mt-1 text-body-sm text-muted-readable">
            The selected scope has no issue records in the current queue.
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
          <span>Severity-aware opaque keyset cursor</span>
        </div>
        <Select
          value={String(query.issueLimit)}
          onValueChange={(value) => {
            const limit = Number(value);
            if (isPageLimit(limit)) {
              router.push(
                engagementDashboardHref(
                  query,
                  { issueLimit: limit, issueCursor: null },
                  "issues",
                ),
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

      <div className="hidden overflow-x-auto rounded-2xl border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-40">Severity</TableHead>
              <TableHead className="min-w-80">Issue</TableHead>
              <TableHead className="min-w-52">Context</TableHead>
              <TableHead className="min-w-48">Recommended action</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((issue) => (
              <TableRow key={issue.issueKey}>
                <TableCell className="align-top">
                  <div className="grid gap-2">
                    <Badge
                      variant={SEVERITY_VARIANT[issue.severity]}
                      className="w-fit"
                    >
                      {titleCaseDashboardToken(issue.severity)}
                    </Badge>
                    <Badge variant="outline" className="w-fit">
                      {titleCaseDashboardToken(issue.state)}
                    </Badge>
                    <span className="flex items-center gap-1 text-caption text-muted-readable">
                      <Clock3 aria-hidden="true" className="size-3" />
                      {formatDashboardAge(issue.issueAgeMinutes)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <p className="font-medium">{issue.title}</p>
                  <p className="mt-1 max-w-xl text-body-sm text-muted-readable">
                    {issue.detail}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">
                      {titleCaseDashboardToken(issue.category)}
                    </Badge>
                    {issue.flowCode !== null ? (
                      <Badge variant="outline">{issue.flowCode}</Badge>
                    ) : null}
                    {issue.retryEligible ? (
                      <Badge variant="outline">Retry eligible</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <RelatedEntities
                    issue={issue}
                    query={query}
                    canReadLeads={capabilities.canReadLeads}
                  />
                  <p className="mt-2 text-caption text-muted-readable">
                    Occurred {formatDashboardDateTime(issue.occurredAt)}
                  </p>
                  {issue.lastSuccessfulAt !== null ? (
                    <p className="text-caption text-muted-readable">
                      Last success{" "}
                      {formatDashboardDateTime(issue.lastSuccessfulAt)}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="align-top text-body-sm text-muted-readable">
                  {issue.recommendedAction}
                </TableCell>
                <TableCell className="align-top">
                  <EngagementIssueActions
                    issue={issue}
                    tenantId={query.tenantId}
                    capabilities={capabilities}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {result.items.map((issue) => (
          <article
            key={issue.issueKey}
            className="grid gap-3 rounded-2xl border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={SEVERITY_VARIANT[issue.severity]}>
                  {titleCaseDashboardToken(issue.severity)}
                </Badge>
                <Badge variant="outline">
                  {titleCaseDashboardToken(issue.state)}
                </Badge>
              </div>
              <EngagementIssueActions
                issue={issue}
                tenantId={query.tenantId}
                capabilities={capabilities}
              />
            </div>
            <div>
              <p className="font-medium">{issue.title}</p>
              <p className="mt-1 text-body-sm text-muted-readable">
                {issue.detail}
              </p>
            </div>
            <RelatedEntities
              issue={issue}
              query={query}
              canReadLeads={capabilities.canReadLeads}
            />
            <div className="rounded-xl bg-muted/50 p-3 text-body-sm">
              <p className="text-caption text-muted-readable">
                Recommended next action
              </p>
              <p className="mt-1">{issue.recommendedAction}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        {query.issueCursor !== undefined ? (
          <Button variant="outline" asChild>
            <Link
              href={engagementDashboardHref(
                query,
                { issueCursor: null },
                "issues",
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
          Showing up to {result.pagination.limit} issues
        </p>
        {result.pagination.hasMore && result.pagination.nextCursor !== null ? (
          <Button asChild>
            <Link
              href={engagementDashboardHref(
                query,
                { issueCursor: result.pagination.nextCursor },
                "issues",
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

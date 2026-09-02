// oz-next-app/src/features/integrations/zoho-inventory/ui/zoho-sync-history.tsx
import type { ReactElement } from "react";
import { Activity, History } from "lucide-react";

import { ContentEmptyState } from "@/components/common/content-shell";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type {
  ZohoSyncJob,
  ZohoSyncJobStatus,
} from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";

const MAX_VISIBLE_SYNC_JOBS = 10;

function statusVariant(
  status: ZohoSyncJobStatus,
): NonNullable<BadgeProps["variant"]> {
  if (status === "SUCCEEDED") return "success";
  if (status === "FAILED") return "destructive";
  if (status === "OUTCOME_UNKNOWN") return "warning";
  if (status === "RUNNING") return "info";
  if (status === "QUEUED") return "secondary";
  return "outline";
}

function sourceVariant(
  source: ZohoSyncJob["triggerSource"],
): NonNullable<BadgeProps["variant"]> {
  if (source === "WEBHOOK") return "info";
  if (source === "SCHEDULED") return "secondary";
  if (source === "MANUAL") return "outline";
  return "default";
}

function humanizeToken(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/_/gu, " ")
    .replace(/^\p{L}/u, (character) => character.toLocaleUpperCase("en-US"));
}

function formatDateTime(value: string | null): string {
  if (value === null) return "—";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function resultLabel(job: ZohoSyncJob): ReactElement {
  if (job.lastErrorCode !== null) {
    return (
      <code className="max-w-64 break-all text-caption text-destructive">
        {job.lastErrorCode}
      </code>
    );
  }

  if (job.status === "SUCCEEDED") {
    return <span className="text-caption text-success">Completed</span>;
  }

  if (job.status === "RUNNING" || job.status === "QUEUED") {
    return (
      <span className="text-caption text-muted-readable">In progress</span>
    );
  }

  if (job.outcome !== null) {
    return (
      <span className="text-caption text-muted-readable">Result recorded</span>
    );
  }

  return <span className="text-muted-readable">—</span>;
}

export function ZohoSyncHistory({
  jobs,
}: Readonly<{
  jobs: readonly ZohoSyncJob[];
}>): ReactElement {
  const visibleJobs = jobs.slice(0, MAX_VISIBLE_SYNC_JOBS);

  if (visibleJobs.length === 0) {
    return (
      <ContentEmptyState
        icon={<History aria-hidden="true" />}
        title="No Zoho synchronization jobs yet"
        description="Manual, scheduled, webhook, and internal synchronization work will appear here."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <Table>
        <TableHeader className="bg-muted/20">
          <TableRow>
            <TableHead>Operation</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Attempts</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleJobs.map((job) => (
            <TableRow key={job.syncJobId}>
              <TableCell>
                <div className="grid gap-0.5">
                  <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                    <Activity
                      aria-hidden="true"
                      className="size-3.5 text-info"
                    />
                    {humanizeToken(job.operation)}
                  </span>
                  <span className="text-caption text-muted-readable">
                    {humanizeToken(job.resourceType)}
                    {job.resourceKey === null ? "" : ` · ${job.resourceKey}`}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(job.status)}>
                  {humanizeToken(job.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={sourceVariant(job.triggerSource)}>
                  {humanizeToken(job.triggerSource)}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-tabular">
                {job.attemptCount.toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="text-muted-readable">
                {formatDateTime(job.createdAt)}
              </TableCell>
              <TableCell className="text-muted-readable">
                {formatDateTime(job.completedAt)}
              </TableCell>
              <TableCell>{resultLabel(job)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="border-t border-border/65 bg-muted/15 px-4 py-2.5 text-caption text-muted-readable">
        Showing the latest {visibleJobs.length.toLocaleString("en-IN")}{" "}
        synchronization record{visibleJobs.length === 1 ? "" : "s"}. Older
        records remain available in the authoritative audit store.
      </div>
    </div>
  );
}

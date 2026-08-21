// oz-next-app/src/features/integrations/zoho-inventory/ui/zoho-sync-history.tsx
import type { ReactElement } from "react";
import { History } from "lucide-react";

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

function statusLabel(status: ZohoSyncJobStatus): string {
  return status
    .toLowerCase()
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

export function ZohoSyncHistory({
  jobs,
}: Readonly<{
  jobs: readonly ZohoSyncJob[];
}>): ReactElement {
  if (jobs.length === 0) {
    return (
      <ContentEmptyState
        icon={<History aria-hidden="true" />}
        title="No Zoho synchronization jobs yet"
        description="Run a reconciliation after connecting Zoho Inventory. Organization reconciliation is the only synchronization operation enabled in this foundation release."
      />
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Operation</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Attempts</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.syncJobId}>
              <TableCell>
                <div className="grid gap-0.5">
                  <span className="text-body-sm text-foreground [font-weight:var(--typography-emphasis-weight)]">
                    {job.operation}
                  </span>
                  <span className="text-caption text-muted-readable">
                    {job.resourceType}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(job.status)}>
                  {statusLabel(job.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-tabular">
                {job.attemptCount.toLocaleString("en-IN")}
              </TableCell>
              <TableCell>{formatDateTime(job.createdAt)}</TableCell>
              <TableCell>{formatDateTime(job.completedAt)}</TableCell>
              <TableCell>
                {job.lastErrorCode === null ? (
                  <span className="text-muted-readable">—</span>
                ) : (
                  <code className="max-w-64 break-all text-caption text-destructive">
                    {job.lastErrorCode}
                  </code>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

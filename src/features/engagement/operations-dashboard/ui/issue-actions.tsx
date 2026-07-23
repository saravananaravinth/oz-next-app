// oz-next-app/src/features/engagement/operations-dashboard/ui/issue-actions.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/shared/hooks/use-toast";

import {
  reassignEngagementLeadAction,
  retryEngagementDeliveryAction,
  updateEngagementIssueAction,
  type EngagementDashboardActionResult,
} from "@/features/engagement/operations-dashboard/actions/engagement-dashboard.actions";
import type { EngagementDashboardIssue } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDashboardCapabilities } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";

type PendingOperation = "RESOLVE" | "REASSIGN" | "RETRY_OUTBOX" | "RETRY_VIDEO";

export type EngagementIssueActionsProps = Readonly<{
  issue: EngagementDashboardIssue;
  tenantId: string | undefined;
  capabilities: Pick<
    EngagementDashboardCapabilities,
    "canIntervene" | "canReassignLead" | "canRetryDelivery"
  >;
}>;

function idempotencyKey(): string {
  return `engagement:${crypto.randomUUID()}`;
}

function resourceIdFromIssueKey(issueKey: string): string | null {
  const value = issueKey.split(":").at(-1);
  return value === undefined || value.length === 0 ? null : value;
}

export function EngagementIssueActions({
  issue,
  tenantId,
  capabilities,
}: EngagementIssueActionsProps): React.ReactElement | null {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const [operation, setOperation] = React.useState<PendingOperation | null>(
    null,
  );
  const [reason, setReason] = React.useState("");
  const [intentKey, setIntentKey] = React.useState("");
  const acknowledgeIntentKeyRef = React.useRef(idempotencyKey());
  const resourceId = resourceIdFromIssueKey(issue.issueKey);

  const complete = React.useCallback(
    (result: EngagementDashboardActionResult): boolean => {
      if (result.ok) {
        toast.success({ title: result.message });
        router.refresh();
        return true;
      }

      toast.error({
        title: "Engagement operation failed",
        description:
          result.requestId === undefined
            ? result.message
            : `${result.message} Reference: ${result.requestId}`,
      });
      return false;
    },
    [router, toast],
  );

  const acknowledge = React.useCallback((): void => {
    startTransition(async () => {
      const result = await updateEngagementIssueAction({
        ...(tenantId !== undefined ? { tenantId } : {}),
        values: {
          issueKey: issue.issueKey,
          state: "ACKNOWLEDGED",
          rowVersion: issue.rowVersion,
          idempotencyKey: acknowledgeIntentKeyRef.current,
        },
      });
      if (complete(result)) {
        acknowledgeIntentKeyRef.current = idempotencyKey();
      }
    });
  }, [complete, issue.issueKey, issue.rowVersion, tenantId]);

  const openOperation = React.useCallback(
    (nextOperation: PendingOperation): void => {
      setReason("");
      setIntentKey(idempotencyKey());
      setOperation(nextOperation);
    },
    [],
  );

  const submitOperation = React.useCallback((): void => {
    if (
      operation === null ||
      reason.trim().length < 5 ||
      intentKey.length < 16
    ) {
      return;
    }

    startTransition(async () => {
      let result: EngagementDashboardActionResult;

      if (operation === "RESOLVE") {
        result = await updateEngagementIssueAction({
          ...(tenantId !== undefined ? { tenantId } : {}),
          values: {
            issueKey: issue.issueKey,
            state: "RESOLVED",
            resolutionNote: reason,
            rowVersion: issue.rowVersion,
            idempotencyKey: intentKey,
          },
        });
      } else if (operation === "REASSIGN" && issue.leadId !== null) {
        result = await reassignEngagementLeadAction({
          ...(tenantId !== undefined ? { tenantId } : {}),
          values: {
            resourceId: issue.leadId,
            reason,
            idempotencyKey: intentKey,
          },
        });
      } else if (operation === "RETRY_OUTBOX" && resourceId !== null) {
        result = await retryEngagementDeliveryAction({
          ...(tenantId !== undefined ? { tenantId } : {}),
          kind: "OUTBOX",
          values: { resourceId, reason, idempotencyKey: intentKey },
        });
      } else if (operation === "RETRY_VIDEO" && resourceId !== null) {
        result = await retryEngagementDeliveryAction({
          ...(tenantId !== undefined ? { tenantId } : {}),
          kind: "VIDEO_MESSAGE",
          values: { resourceId, reason, idempotencyKey: intentKey },
        });
      } else {
        return;
      }

      if (complete(result)) {
        setOperation(null);
      }
    });
  }, [complete, intentKey, issue, operation, reason, resourceId, tenantId]);

  if (!capabilities.canIntervene) {
    return null;
  }

  const canReassign = capabilities.canReassignLead && issue.leadId !== null;
  const canRetryOutbox =
    capabilities.canRetryDelivery &&
    issue.retryEligible &&
    issue.category === "OUTBOX_FAILED" &&
    resourceId !== null;
  const canRetryVideo =
    capabilities.canRetryDelivery &&
    issue.retryEligible &&
    issue.category === "VIDEO_MESSAGE_FAILED" &&
    resourceId !== null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${issue.title}`}
            disabled={pending}
          >
            {pending ? (
              <RefreshCw aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <MoreHorizontal aria-hidden="true" className="size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {issue.state === "OPEN" ? (
            <DropdownMenuItem onSelect={acknowledge}>
              <ShieldCheck aria-hidden="true" className="size-4" />
              Acknowledge issue
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onSelect={() => {
              openOperation("RESOLVE");
            }}
          >
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Resolve with note
          </DropdownMenuItem>
          {canReassign || canRetryOutbox || canRetryVideo ? (
            <DropdownMenuSeparator />
          ) : null}
          {canReassign ? (
            <DropdownMenuItem
              onSelect={() => {
                openOperation("REASSIGN");
              }}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Retry nearest-dealer assignment
            </DropdownMenuItem>
          ) : null}
          {canRetryOutbox ? (
            <DropdownMenuItem
              onSelect={() => {
                openOperation("RETRY_OUTBOX");
              }}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Retry outbox event
            </DropdownMenuItem>
          ) : null}
          {canRetryVideo ? (
            <DropdownMenuItem
              onSelect={() => {
                openOperation("RETRY_VIDEO");
              }}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Retry video message
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={operation !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !pending) {
            setOperation(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {operation === "RESOLVE"
                ? "Resolve operational issue"
                : operation === "REASSIGN"
                  ? "Retry nearest-dealer assignment"
                  : "Retry failed delivery"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              The backend will verify current state, permissions, row version,
              and idempotency before applying this intervention.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`issue-reason-${issue.issueKey}`}>Reason</Label>
            <Textarea
              id={`issue-reason-${issue.issueKey}`}
              value={reason}
              minLength={5}
              maxLength={operation === "RESOLVE" ? 2000 : 500}
              onChange={(event) => {
                setReason(event.currentTarget.value);
              }}
              placeholder="Record the operational reason and expected outcome"
              rows={5}
            />
            <p className="text-caption text-muted-readable">
              Minimum 5 characters. This note is included in the audited
              intervention.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending || reason.trim().length < 5}
              onClick={(event) => {
                event.preventDefault();
                submitOperation();
              }}
            >
              {pending ? "Processing…" : "Confirm intervention"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// oz-next-app/src/features/extended-warranty/ui/workspace-detail-payments.tsx
"use client";

import { CreditCard, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ContentStatus } from "@/components/common/content-shell";
import { formatDisplayLabel } from "@/components/common/display-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ExtendedWarrantyActionFailure } from "@/features/extended-warranty/actions/action-failure";
import { reconcileExtendedWarrantyPaymentAction } from "@/features/extended-warranty/actions/admin.actions";
import { buildWarrantyPaymentActivity } from "@/features/extended-warranty/policies/workspace-detail-presentation";
import {
  WarrantyMutationFailureStatus,
  workspaceDetailStatusBadgeVariant,
} from "@/features/extended-warranty/ui/workspace-detail-common";
import type { ExtendedWarrantyWorkspaceDetailPayload } from "@/features/extended-warranty/ui/workspace-detail.types";
import {
  formatWorkspaceDateTime,
  formatWorkspaceMinorAmount,
} from "@/features/extended-warranty/ui/workspace-shared";

function minorAmountIsPositive(value: string | null): boolean {
  if (value === null || !/^\d+$/u.test(value)) return false;
  return BigInt(value) > 0n;
}

export function WarrantyPaymentsSection({
  detail,
  tenantId,
  canReconcile,
}: Readonly<{
  detail: ExtendedWarrantyWorkspaceDetailPayload;
  tenantId: string;
  canReconcile: boolean;
}>): React.ReactElement {
  const router = useRouter();
  const [failure, setFailure] =
    React.useState<ExtendedWarrantyActionFailure | null>(null);
  const [reconciling, startReconciliation] = React.useTransition();
  const retryIntent = React.useRef<Readonly<{
    unitId: string;
    idempotencyKey: string;
  }> | null>(null);
  const activity = React.useMemo(
    () => buildWarrantyPaymentActivity(detail),
    [detail],
  );

  const reconcile = (): void => {
    setFailure(null);
    const existingIntent = retryIntent.current;
    const idempotencyKey =
      existingIntent?.unitId === detail.unitId
        ? existingIntent.idempotencyKey
        : `ew-payment-reconcile:${crypto.randomUUID()}`;
    retryIntent.current = { unitId: detail.unitId, idempotencyKey };

    startReconciliation(() => {
      void (async () => {
        const result = await reconcileExtendedWarrantyPaymentAction({
          tenantId,
          unitId: detail.unitId,
          idempotencyKey,
        });

        if (!result.ok) {
          setFailure(result);
          return;
        }

        retryIntent.current = null;
        toast.success("Payment reconciliation requested.");
        router.refresh();
      })();
    });
  };

  return (
    <div className="grid gap-5">
      <WarrantyMutationFailureStatus
        failure={failure}
        title="Payment reconciliation failed"
      />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Purchase & payment activity</CardTitle>
            <CardDescription>
              Newest-first order, payment, refund, and reconciliation history.
            </CardDescription>
          </div>
          {canReconcile && detail.paymentIntentId !== null ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reconciling}
              onClick={reconcile}
            >
              <RefreshCw
                className={`mr-2 size-4 ${reconciling ? "animate-spin" : ""} motion-reduce:animate-none`}
                aria-hidden="true"
              />
              {reconciling ? "Requesting…" : "Reconcile payment"}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <ContentStatus
              title="No payment activity"
              description="No purchase attempt, payment, or payment reconciliation record is available yet."
              icon={<CreditCard className="size-4" aria-hidden="true" />}
            />
          ) : (
            <ol className="divide-y rounded-xl border border-border/70">
              {activity.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {item.kind === "ORDER_ATTEMPT"
                          ? `Order ${item.title}`
                          : item.kind === "PAYMENT"
                            ? `Payment ${formatDisplayLabel(
                                item.status,
                                "Unknown status",
                              )}`
                            : formatDisplayLabel(
                                item.title,
                                "Payment verification",
                              )}
                      </span>
                      <Badge
                        variant={workspaceDetailStatusBadgeVariant(item.status)}
                      >
                        {formatDisplayLabel(item.status, "Unknown status")}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.timingLabel ?? "Recorded"}{" "}
                      {formatWorkspaceDateTime(item.at)}
                      {item.attemptCount === null
                        ? ""
                        : ` · Attempt ${String(item.attemptCount)}`}
                    </div>
                    {item.failureCode === null ? null : (
                      <div className="mt-1 text-xs text-destructive">
                        {formatDisplayLabel(
                          item.failureCode,
                          "Verification error",
                        )}
                      </div>
                    )}
                    {minorAmountIsPositive(item.refundedAmountMinor) ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Refunded{" "}
                        {formatWorkspaceMinorAmount(
                          item.currency,
                          item.refundedAmountMinor,
                        )}
                      </div>
                    ) : null}
                  </div>
                  {item.amountMinor === null ? null : (
                    <div className="shrink-0 text-sm font-medium tabular-nums">
                      {formatWorkspaceMinorAmount(
                        item.currency,
                        item.amountMinor,
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <div className="sr-only" aria-live="polite">
        {reconciling ? "Requesting payment reconciliation." : ""}
      </div>
    </div>
  );
}

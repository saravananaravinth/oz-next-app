// oz-next-app/src/features/extended-warranty/ui/workspace-detail-fulfillment.tsx
"use client";

import { ExternalLink, PackageCheck, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ContentStatus } from "@/components/common/content-shell";
import {
  formatCapitalizedDisplayText,
  formatDisplayLabel,
} from "@/components/common/display-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ExtendedWarrantyActionFailure } from "@/features/extended-warranty/actions/action-failure";
import { reconcileExtendedWarrantyFulfillmentAction } from "@/features/extended-warranty/actions/admin.actions";
import {
  WarrantyMutationFailureStatus,
  workspaceDetailStatusBadgeVariant,
} from "@/features/extended-warranty/ui/workspace-detail-common";
import type { ExtendedWarrantyWorkspaceDetailPayload } from "@/features/extended-warranty/ui/workspace-detail.types";
import {
  formatWorkspaceDateTime,
  safeExternalHttpHref,
  WorkspaceDetailField,
} from "@/features/extended-warranty/ui/workspace-shared";

export function WarrantyFulfillmentSection({
  detail,
  tenantId,
  canReconcileFulfillment,
}: Readonly<{
  detail: ExtendedWarrantyWorkspaceDetailPayload;
  tenantId: string;
  canReconcileFulfillment: boolean;
}>): React.ReactElement {
  const router = useRouter();
  const [failure, setFailure] =
    React.useState<ExtendedWarrantyActionFailure | null>(null);
  const [reconciling, startReconciliation] = React.useTransition();
  const retryIntent = React.useRef<Readonly<{
    unitId: string;
    idempotencyKey: string;
  }> | null>(null);

  const reconcile = (): void => {
    setFailure(null);
    const existingIntent = retryIntent.current;
    const idempotencyKey =
      existingIntent?.unitId === detail.unitId
        ? existingIntent.idempotencyKey
        : `ew-fulfillment-reconcile:${crypto.randomUUID()}`;
    retryIntent.current = { unitId: detail.unitId, idempotencyKey };

    startReconciliation(() => {
      void (async () => {
        const result = await reconcileExtendedWarrantyFulfillmentAction({
          tenantId,
          unitId: detail.unitId,
          idempotencyKey,
        });

        if (!result.ok) {
          setFailure(result);
          return;
        }

        retryIntent.current = null;
        toast.success(
          result.data.outcome === "deduplicated"
            ? "Fulfillment reconciliation was already queued."
            : "Fulfillment reconciliation queued.",
        );
        router.refresh();
      })();
    });
  };

  const trackingHref = safeExternalHttpHref(detail.trackingUrl);
  const sync = detail.fulfillmentSync;

  return (
    <div className="grid gap-5">
      <WarrantyMutationFailureStatus
        failure={failure}
        title="Fulfillment reconciliation failed"
      />

      {sync === null || sync === undefined ? (
        <ContentStatus
          title="Fulfillment synchronization unavailable"
          description="No fulfillment synchronization record is available for this warranty order."
          icon={<PackageCheck className="size-4" aria-hidden="true" />}
        />
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Fulfillment synchronization</CardTitle>
              <CardDescription>
                Provider projection and required kit progress.
              </CardDescription>
            </div>
            {canReconcileFulfillment && detail.orderId !== null ? (
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
                {reconciling ? "Queuing…" : "Reconcile fulfillment"}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-muted/20 p-3">
              <Badge variant={workspaceDetailStatusBadgeVariant(sync.health)}>
                {formatDisplayLabel(sync.health, "Unknown health")}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Last successful check:{" "}
                {formatWorkspaceDateTime(sync.lastSuccessAt)}
              </span>
              {sync.nextAttemptAt === null ? null : (
                <span className="text-sm text-muted-foreground">
                  Next attempt: {formatWorkspaceDateTime(sync.nextAttemptAt)}
                </span>
              )}
              {sync.failureCode === null ? null : (
                <span className="text-sm text-destructive">
                  {formatDisplayLabel(
                    sync.failureCode,
                    "Synchronization failure",
                  )}
                </span>
              )}
            </div>

            {sync.progress === null ? null : (
              <section
                className="grid gap-3"
                aria-labelledby="kit-progress-heading"
              >
                <div>
                  <h3 id="kit-progress-heading" className="font-medium">
                    Kit progress
                  </h3>
                  {sync.progress.partial ? (
                    <p className="text-sm text-muted-foreground">
                      Installation becomes available after every required kit
                      item is delivered.
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-3">
                  {sync.progress.lines.map((line, index) => (
                    <div
                      key={line.lineId ?? String(index)}
                      className="rounded-xl border border-border/70 p-3"
                    >
                      <div className="mb-3 text-sm font-medium">
                        Kit line {index + 1}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        <WorkspaceDetailField
                          label="Invoiced"
                          value={`${String(line.invoiced)}/${String(line.required)}`}
                        />
                        <WorkspaceDetailField
                          label="Packed"
                          value={`${String(line.packed)}/${String(line.required)}`}
                        />
                        <WorkspaceDetailField
                          label="Shipped"
                          value={`${String(line.shipped)}/${String(line.required)}`}
                        />
                        <WorkspaceDetailField
                          label="Delivered"
                          value={`${String(line.delivered)}/${String(line.required)}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {sync.resources.length === 0 ? null : (
              <section
                className="grid gap-3"
                aria-labelledby="provider-resources-heading"
              >
                <h3 id="provider-resources-heading" className="font-medium">
                  Provider resources
                </h3>
                <div className="overflow-x-auto rounded-xl border border-border/70">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Resource</TableHead>
                        <TableHead>Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tracking</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sync.resources.map((resource) => {
                        const resourceTrackingHref = safeExternalHttpHref(
                          resource.trackingUrl,
                        );
                        return (
                          <TableRow key={`${resource.kind}:${resource.id}`}>
                            <TableCell className="font-medium">
                              {formatDisplayLabel(resource.kind, "Document")}
                            </TableCell>
                            <TableCell>
                              {resource.number ?? resource.id}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={workspaceDetailStatusBadgeVariant(
                                  resource.status ?? "UNKNOWN",
                                )}
                              >
                                {formatDisplayLabel(
                                  resource.status,
                                  "Awaiting verification",
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {resource.trackingNumber === null ? (
                                "—"
                              ) : resourceTrackingHref === null ? (
                                <span>
                                  {formatCapitalizedDisplayText(
                                    resource.carrier,
                                    "Carrier",
                                  )}{" "}
                                  · {resource.trackingNumber}
                                </span>
                              ) : (
                                <a
                                  href={resourceTrackingHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  {resource.trackingNumber}
                                  <ExternalLink
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                </a>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </section>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Shipment & delivery</CardTitle>
          <CardDescription>
            Current delivery projection from the warranty order.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <WorkspaceDetailField
            label="Fulfillment status"
            value={formatDisplayLabel(detail.fulfillmentStatus, "Not started")}
          />
          <WorkspaceDetailField
            label="Delivered at"
            value={formatWorkspaceDateTime(detail.deliveredAt)}
          />
          <WorkspaceDetailField
            label="Carrier"
            value={formatCapitalizedDisplayText(detail.carrierName, "—")}
          />
          <WorkspaceDetailField
            label="Tracking"
            value={
              trackingHref === null ? (
                (detail.trackingNumber ?? "—")
              ) : (
                <a
                  href={trackingHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {detail.trackingNumber ?? "Open tracking"}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              )
            }
          />
        </CardContent>
      </Card>

      <div className="sr-only" aria-live="polite">
        {reconciling ? "Queuing fulfillment reconciliation." : ""}
      </div>
    </div>
  );
}

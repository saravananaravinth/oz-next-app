// oz-next-app/src/features/extended-warranty/ui/workspace-detail-sheet.tsx
"use client";

import { ExternalLink, FileCheck2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ContentStatus } from "@/components/common/content-shell";
import {
  formatCapitalizedDisplayList,
  formatCapitalizedDisplayText,
  formatDisplayLabel,
} from "@/components/common/display-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  reconcileExtendedWarrantyFulfillmentAction,
  reconcileExtendedWarrantyPaymentAction,
} from "@/features/extended-warranty/actions/admin.actions";
import { paymentVerificationTiming } from "@/features/extended-warranty/policies/reconciliation-display";
import { ExtendedWarrantyReviewDecisionPanel } from "@/features/extended-warranty/ui/review-decision-panel";
import type { ExtendedWarrantyWorkspaceDetailPayload } from "@/features/extended-warranty/ui/workspace-detail.types";
import {
  CertificateButton,
  formatWorkspaceDate,
  formatWorkspaceDateTime,
  formatWorkspaceMinorAmount,
  PurchaseLinkActionButton,
  safeExternalHttpHref,
  WorkspaceDetailField,
  workspaceStatusBadge,
} from "@/features/extended-warranty/ui/workspace-shared";

export function ExtendedWarrantyWorkspaceDetailSheet({
  detailPromise,
  tenantId,
  canSend,
  canReconcile,
  onClose,
}: Readonly<{
  detailPromise: Promise<ExtendedWarrantyWorkspaceDetailPayload>;
  tenantId: string;
  canSend: boolean;
  canReconcile: boolean;
  onClose: () => void;
}>): React.ReactElement {
  const { detail, review, reviewUnavailable } = React.use(detailPromise);
  const [reconciling, startReconciliation] = React.useTransition();
  const fulfillmentIntent = React.useRef<{
    unitId: string;
    key: string;
  } | null>(null);
  const router = useRouter();

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-[820px]"
      >
        <div className="min-h-full bg-background">
          <div className="sticky top-0 z-20 border-b bg-background/95 px-6 py-5 backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <SheetHeader className="text-left">
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="min-w-0">
                  <SheetTitle className="flex flex-wrap items-center gap-3 text-xl">
                    <span className="truncate font-mono">
                      {detail.vin ?? detail.invoiceNumber ?? "Vehicle"}
                    </span>
                    {workspaceStatusBadge(detail.status)}
                  </SheetTitle>
                  <SheetDescription className="mt-1">
                    {detail.invoiceNumber ?? "Invoice unavailable"} ·{" "}
                    {formatWorkspaceDateTime(detail.invoiceAt)}
                  </SheetDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {canSend && detail.certificateFileId === null ? (
                    <PurchaseLinkActionButton
                      tenantId={tenantId}
                      item={detail}
                    />
                  ) : null}
                  {detail.certificateFileId !== null ? (
                    <CertificateButton
                      tenantId={tenantId}
                      unitId={detail.unitId}
                    />
                  ) : null}
                </div>
              </div>
            </SheetHeader>
          </div>

          <div className="grid gap-6 px-6 py-6 pb-10">
            {detail.reconciliationReasons.length > 0 ? (
              <ContentStatus
                variant="warning"
                title="Attention required"
                description={Array.from(
                  new Set([...detail.reconciliationReasons]),
                ).join(". ")}
              />
            ) : null}

            {detail.eligibilityBlockers.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                Purchase eligibility: {detail.eligibilityBlockers.join(". ")}
              </p>
            ) : null}
            <p
              className="text-sm text-muted-foreground"
              aria-label="Warranty workflow"
            >
              Payment → Sales order → Invoice → Packing → Shipment → Delivery →
              Installation → Review → Activation → Certificate. Current stage:{" "}
              {formatDisplayLabel(detail.orderStatus, "Not ordered")}
            </p>
            {detail.fulfillmentSync ? (
              <section
                className="grid gap-3 rounded-lg border p-4"
                aria-label="Fulfillment synchronization"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">Fulfillment synchronization</h2>
                  {canSend && detail.orderId ? (
                    <Button
                      variant="outline"
                      disabled={reconciling}
                      onClick={() => {
                        const intent = fulfillmentIntent.current;
                        const idempotencyKey =
                          intent?.unitId === detail.unitId
                            ? intent.key
                            : crypto.randomUUID();
                        fulfillmentIntent.current = {
                          unitId: detail.unitId,
                          key: idempotencyKey,
                        };
                        startReconciliation(async () => {
                          try {
                            await reconcileExtendedWarrantyFulfillmentAction({
                              tenantId,
                              unitId: detail.unitId,
                              idempotencyKey,
                            });
                            fulfillmentIntent.current = null;
                            toast.success("Fulfillment reconciliation queued.");
                            router.refresh();
                          } catch {
                            toast.error(
                              "Unable to queue fulfillment reconciliation.",
                            );
                          }
                        });
                      }}
                    >
                      Reconcile Fulfillment
                    </Button>
                  ) : null}
                </div>
                <p className="text-sm">
                  {formatDisplayLabel(detail.fulfillmentSync.health, "Unknown")}
                  {detail.fulfillmentSync.failureCode
                    ? ` · ${formatDisplayLabel(detail.fulfillmentSync.failureCode, "Unknown failure")}`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last successful check:{" "}
                  {formatWorkspaceDateTime(
                    detail.fulfillmentSync.lastSuccessAt,
                  )}
                  {detail.fulfillmentSync.nextAttemptAt
                    ? ` · Next attempt: ${formatWorkspaceDateTime(detail.fulfillmentSync.nextAttemptAt)}`
                    : ""}
                </p>
                {detail.fulfillmentSync.progress?.lines.map((line, index) => (
                  <p key={line.lineId ?? index} className="text-sm">
                    Kit line {index + 1}: {line.invoiced}/{line.required}{" "}
                    invoiced · {line.packed}/{line.required} packed ·{" "}
                    {line.shipped}/{line.required} shipped · {line.delivered}/
                    {line.required} delivered
                  </p>
                ))}
                {detail.fulfillmentSync.progress?.partial ? (
                  <p className="text-sm text-muted-foreground">
                    Installation becomes available after all required kit items
                    are delivered.
                  </p>
                ) : null}
                {detail.fulfillmentSync.resources.map((resource) => (
                  <div
                    key={`${resource.kind}:${resource.id}`}
                    className="text-sm"
                  >
                    <span>
                      {formatDisplayLabel(resource.kind, "Document")}:{" "}
                      {resource.number ?? resource.id} ·{" "}
                      {formatDisplayLabel(
                        resource.status,
                        "Awaiting verification",
                      )}
                    </span>
                    {resource.trackingNumber ? (
                      <p className="text-xs text-muted-foreground">
                        {resource.carrier} · Tracking {resource.trackingNumber}
                      </p>
                    ) : null}
                  </div>
                ))}
              </section>
            ) : null}
            <section className="grid gap-4 border-b pb-6">
              <div>
                <h2 className="font-semibold">Purchase & Workflow</h2>
                <p className="text-sm text-muted-foreground">
                  Current purchase, payment, fulfillment, and certificate state.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <WorkspaceDetailField
                  label="Order"
                  value={detail.orderNumber ?? "—"}
                />
                <WorkspaceDetailField
                  label="Order Status"
                  value={formatDisplayLabel(detail.orderStatus, "—")}
                />
                <WorkspaceDetailField
                  label="Amount"
                  value={formatWorkspaceMinorAmount(
                    detail.currency,
                    detail.totalAmountMinor,
                  )}
                />
                <WorkspaceDetailField
                  label="Payment Confirmed"
                  value={formatWorkspaceDateTime(detail.paymentConfirmedAt)}
                />
                <WorkspaceDetailField
                  label="Fulfillment"
                  value={formatDisplayLabel(detail.fulfillmentStatus, "—")}
                />
                <WorkspaceDetailField
                  label="Delivered At"
                  value={formatWorkspaceDateTime(detail.deliveredAt)}
                />
                <WorkspaceDetailField
                  label="Installation Submitted"
                  value={formatWorkspaceDateTime(
                    detail.installationSubmittedAt,
                  )}
                />
                <WorkspaceDetailField
                  label="Review"
                  value={formatDisplayLabel(detail.reviewDecision, "—")}
                />
                <WorkspaceDetailField
                  label="Certificate"
                  value={detail.certificateNumber ?? "—"}
                />
                <WorkspaceDetailField
                  label="Certificate Issued"
                  value={formatWorkspaceDateTime(detail.certificateIssuedAt)}
                />
                <WorkspaceDetailField
                  label="Carrier"
                  value={formatCapitalizedDisplayText(detail.carrierName, "—")}
                />
                <WorkspaceDetailField
                  label="Tracking"
                  value={
                    detail.trackingUrl === null
                      ? (detail.trackingNumber ?? "—")
                      : (() => {
                          const href = safeExternalHttpHref(detail.trackingUrl);
                          return href === null ? (
                            (detail.trackingNumber ?? "—")
                          ) : (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              {detail.trackingNumber ?? "Open Tracking"}
                              <ExternalLink
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            </a>
                          );
                        })()
                  }
                />
              </div>
            </section>

            <section className="grid gap-4 border-b pb-6">
              <h2 className="font-semibold">Vehicle, Customer & Seller</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <WorkspaceDetailField
                  label="VIN"
                  value={<span className="font-mono">{detail.vin ?? "—"}</span>}
                />
                <WorkspaceDetailField
                  label="Model"
                  value={formatCapitalizedDisplayList(
                    [detail.modelName, detail.colorName],
                    "—",
                  )}
                />
                <WorkspaceDetailField
                  label="Variant"
                  value={formatCapitalizedDisplayList(
                    [
                      detail.variantName,
                      detail.batteryType,
                      detail.batteryPowerKw,
                    ],
                    "—",
                  )}
                />
                <WorkspaceDetailField
                  label="Buyer"
                  value={formatCapitalizedDisplayText(detail.buyerName, "—")}
                />
                <WorkspaceDetailField
                  label="Buyer Location"
                  value={formatCapitalizedDisplayList(
                    [detail.buyerDistrict, detail.buyerState],
                    "—",
                    ", ",
                  )}
                />
                <WorkspaceDetailField
                  label="Contact"
                  value={formatCapitalizedDisplayList(
                    [detail.maskedMobile, detail.preferredMsgChannel],
                    "—",
                  )}
                />
                <WorkspaceDetailField
                  label="Seller"
                  value={formatCapitalizedDisplayText(detail.sellerName, "—")}
                />
                <WorkspaceDetailField
                  label="Seller Location"
                  value={formatCapitalizedDisplayList(
                    [detail.sellerDistrict, detail.sellerState],
                    "—",
                    ", ",
                  )}
                />
                <WorkspaceDetailField
                  label="Invoice Date"
                  value={formatWorkspaceDate(detail.saleDate)}
                />
              </div>
            </section>

            <section className="grid gap-4 border-b pb-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">
                    Purchase Attempts & Payments
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Compact history of order attempts and payment
                    reconciliation.
                  </p>
                </div>
                {canReconcile && detail.paymentIntentId ? (
                  <Button
                    variant="outline"
                    disabled={reconciling}
                    onClick={() => {
                      startReconciliation(async () => {
                        try {
                          await reconcileExtendedWarrantyPaymentAction({
                            tenantId,
                            unitId: detail.unitId,
                          });
                          toast.success("Payment reconciliation queued.");
                          router.refresh();
                        } catch {
                          toast.error(
                            "Unable to queue reconciliation. Please retry.",
                          );
                        }
                      });
                    }}
                  >
                    {reconciling ? "Queuing…" : "Reconcile Payment"}
                  </Button>
                ) : null}
              </div>
              {detail.attempts.length === 0 &&
              detail.payments.length === 0 &&
              detail.reconciliationJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No purchase or payment activity yet.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {detail.attempts.map((attempt) => (
                    <div
                      key={attempt.orderId}
                      className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-medium">{attempt.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatWorkspaceDateTime(attempt.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span>
                          {formatWorkspaceMinorAmount(
                            attempt.currency,
                            attempt.totalAmountMinor,
                          )}
                        </span>
                        <Badge variant="outline">
                          {formatDisplayLabel(attempt.status, "Unknown Status")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {detail.payments.map((payment) => (
                    <div
                      key={payment.chargeId}
                      className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-medium">
                          Payment{" "}
                          {formatDisplayLabel(payment.status, "Unknown Status")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatWorkspaceDateTime(payment.createdAt)}
                        </div>
                      </div>
                      <div className="text-sm">
                        {formatWorkspaceMinorAmount(
                          payment.currency,
                          payment.amountMinor,
                        )}
                      </div>
                    </div>
                  ))}
                  {detail.reconciliationJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="font-medium">
                          {formatDisplayLabel(job.reason, "Verification")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {paymentVerificationTiming(job).label}{" "}
                          {formatWorkspaceDateTime(
                            paymentVerificationTiming(job).at,
                          )}
                          {job.failureCode
                            ? ` · ${formatDisplayLabel(job.failureCode, "Verification error")}`
                            : ""}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {formatDisplayLabel(job.status, "Unknown Status")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {reviewUnavailable ? (
              <ContentStatus
                title="Installation review"
                description={reviewUnavailable}
              />
            ) : null}
            {review === null ? null : (
              <section className="grid gap-4 border-b pb-6">
                <h2 className="font-semibold">Installation & Review</h2>
                <video
                  controls
                  preload="metadata"
                  src={review.videoUrl}
                  className="w-full rounded-lg border"
                />
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <span>
                    {review.fileName} ·{" "}
                    {formatWorkspaceDateTime(review.submittedAt)}
                  </span>
                  <span>
                    Location {review.latitude}, {review.longitude} · Accuracy{" "}
                    {review.accuracyMeters ?? "Unknown"} m
                  </span>
                </div>
                <div className="rounded-lg border">
                  <div className="border-b px-3 py-2 text-sm font-medium">
                    Approval history
                  </div>
                  <div className="divide-y">
                    {review.history.map((item) => (
                      <div
                        key={item.evidenceId}
                        className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="font-medium">
                            Attempt {item.revisionNo}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDisplayLabel(
                              item.evidenceStatus,
                              "Unknown Status",
                            )}{" "}
                            · {formatWorkspaceDateTime(item.submittedAt)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground sm:text-right">
                          {item.decision === null
                            ? "Awaiting review"
                            : `${formatDisplayLabel(
                                item.decision,
                                "Reviewed",
                              )} · ${formatWorkspaceDateTime(item.reviewedAt)}`}
                          {item.reasonCode === null
                            ? ""
                            : ` · ${formatDisplayLabel(
                                item.reasonCode,
                                item.reasonCode,
                              )}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <ExtendedWarrantyReviewDecisionPanel
                  orderId={review.orderId}
                  orderRowVersion={review.orderRowVersion}
                  evidenceRowVersion={review.evidenceRowVersion}
                  disabled={!review.pending || review.reviewId !== null}
                />
              </section>
            )}

            <section className="grid gap-4">
              <div>
                <h2 className="font-semibold">Activity Timeline</h2>
                <p className="text-sm text-muted-foreground">
                  Latest 100 recorded warranty events, newest first.
                </p>
              </div>
              {detail.events.length === 0 ? (
                <ContentStatus
                  title="No events recorded yet."
                  description="This vehicle has not generated any Extended Warranty events."
                  icon={<FileCheck2 className="size-5" aria-hidden="true" />}
                />
              ) : (
                <ol className="ml-2 border-l pl-5">
                  {detail.events.map((event) => (
                    <li key={event.id} className="relative pb-5 last:pb-0">
                      <span
                        className="absolute -left-[1.45rem] top-1.5 size-2 rounded-full bg-muted-foreground"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-medium">
                            {formatDisplayLabel(
                              event.eventType,
                              "Warranty Event",
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDisplayLabel(
                              event.actorKind,
                              "Unknown Actor",
                            )}
                            {event.reasonCode === null
                              ? ""
                              : ` · ${formatDisplayLabel(
                                  event.reasonCode,
                                  "Reason",
                                )}`}
                          </div>
                        </div>
                        <div className="text-xs tabular-nums text-muted-foreground">
                          {formatWorkspaceDateTime(event.occurredAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

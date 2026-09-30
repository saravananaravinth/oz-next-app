// oz-next-app/src/features/extended-warranty/ui/workspace-detail-sheet.tsx
"use client";

import {
  Activity,
  AlertTriangle,
  CreditCard,
  PackageCheck,
  ShieldCheck,
  Video,
} from "lucide-react";
import * as React from "react";

import { ContentStatus } from "@/components/common/content-shell";
import { formatDisplayLabel } from "@/components/common/display-label";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildWarrantyLifecycleStages,
  uniqueWarrantyMessages,
} from "@/features/extended-warranty/policies/workspace-detail-presentation";
import { WarrantyActivitySection } from "@/features/extended-warranty/ui/workspace-detail-activity";
import { WarrantyLifecycleRail } from "@/features/extended-warranty/ui/workspace-detail-common";
import { WarrantyFulfillmentSection } from "@/features/extended-warranty/ui/workspace-detail-fulfillment";
import { WarrantyInstallationSection } from "@/features/extended-warranty/ui/workspace-detail-installation";
import { WarrantyOverviewSection } from "@/features/extended-warranty/ui/workspace-detail-overview";
import { WarrantyPaymentsSection } from "@/features/extended-warranty/ui/workspace-detail-payments";
import type {
  ExtendedWarrantyWorkspaceDetailPayload,
  ExtendedWarrantyWorkspaceReviewPayload,
} from "@/features/extended-warranty/ui/workspace-detail.types";
import {
  CertificateButton,
  formatWorkspaceDateTime,
  PurchaseLinkActionButton,
  workspaceStatusBadge,
} from "@/features/extended-warranty/ui/workspace-shared";

const DETAIL_TABS = [
  "overview",
  "fulfillment",
  "payments",
  "installation",
  "activity",
] as const;

type DetailTab = (typeof DETAIL_TABS)[number];

type DetailSheetProps = Readonly<{
  detailPromise: Promise<ExtendedWarrantyWorkspaceDetailPayload>;
  reviewPromise: Promise<ExtendedWarrantyWorkspaceReviewPayload> | null;
  tenantId: string;
  canSend: boolean;
  canReconcile: boolean;
  canReview: boolean;
  onClose: () => void;
}>;

function isDetailTab(value: string): value is DetailTab {
  return DETAIL_TABS.some((tab) => tab === value);
}

export function ExtendedWarrantyWorkspaceDetailSheet({
  detailPromise,
  reviewPromise,
  tenantId,
  canSend,
  canReconcile,
  canReview,
  onClose,
}: DetailSheetProps): React.ReactElement {
  const detail = React.use(detailPromise);
  const [activeTab, setActiveTab] = React.useState<DetailTab>("overview");
  const lifecycleStages = React.useMemo(
    () => buildWarrantyLifecycleStages(detail),
    [detail],
  );
  const reconciliationReasons = React.useMemo(
    () => uniqueWarrantyMessages(detail.reconciliationReasons),
    [detail.reconciliationReasons],
  );
  const eligibilityBlockers = React.useMemo(
    () => uniqueWarrantyMessages(detail.eligibilityBlockers),
    [detail.eligibilityBlockers],
  );
  const latestEvent = React.useMemo(
    () =>
      [...detail.events].sort(
        (left, right) =>
          Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
      )[0] ?? null,
    [detail.events],
  );

  const canOpenReview =
    canReview &&
    detail.installationSubmittedAt !== null &&
    detail.reviewDecision === null;
  const canReviewPayment =
    canReconcile &&
    detail.paymentIntentId !== null &&
    reconciliationReasons.length > 0;

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full overflow-y-auto rounded-none p-0 sm:w-[min(68rem,calc(100vw-2rem))] sm:max-w-[68rem] sm:rounded-l-3xl"
      >
        <div className="min-h-full bg-background">
          <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <SheetHeader className="px-5 py-5 pe-14 text-left sm:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <SheetTitle className="flex flex-wrap items-center gap-3 text-xl">
                    <span className="truncate font-mono">
                      {detail.vin ?? detail.invoiceNumber ?? "Vehicle"}
                    </span>
                    {workspaceStatusBadge(detail.status)}
                  </SheetTitle>
                  <SheetDescription className="mt-1 grid gap-1">
                    <span>
                      {detail.invoiceNumber ?? "Invoice unavailable"}
                      {detail.orderNumber === null
                        ? ""
                        : ` · ${detail.orderNumber}`}{" "}
                      · {formatWorkspaceDateTime(detail.invoiceAt)}
                    </span>
                    {latestEvent === null ? null : (
                      <span>
                        Last activity:{" "}
                        {formatDisplayLabel(
                          latestEvent.eventType,
                          "Warranty event",
                        )}
                        {" · "}
                        {formatWorkspaceDateTime(latestEvent.occurredAt)}
                      </span>
                    )}
                  </SheetDescription>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {canOpenReview ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setActiveTab("installation");
                      }}
                    >
                      <Video className="mr-2 size-4" aria-hidden="true" />
                      Review installation
                    </Button>
                  ) : canReviewPayment ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setActiveTab("payments");
                      }}
                    >
                      <CreditCard className="mr-2 size-4" aria-hidden="true" />
                      Review payment
                    </Button>
                  ) : detail.certificateFileId !== null ? (
                    <CertificateButton
                      tenantId={tenantId}
                      unitId={detail.unitId}
                    />
                  ) : canSend ? (
                    <PurchaseLinkActionButton
                      tenantId={tenantId}
                      item={detail}
                    />
                  ) : null}
                </div>
              </div>
            </SheetHeader>
          </div>

          <div className="grid gap-5 px-4 py-5 pb-10 sm:px-6 sm:py-6">
            {reconciliationReasons.length === 0 ? null : (
              <ContentStatus
                variant="warning"
                title="Operational attention required"
                description={
                  <ul className="list-disc space-y-1 ps-5">
                    {reconciliationReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                }
                icon={<AlertTriangle className="size-4" aria-hidden="true" />}
              />
            )}

            {eligibilityBlockers.length === 0 ? null : (
              <ContentStatus
                title="Purchase eligibility"
                description={eligibilityBlockers.join(". ")}
                icon={<ShieldCheck className="size-4" aria-hidden="true" />}
              />
            )}

            <WarrantyLifecycleRail stages={lifecycleStages} />

            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                if (isDetailTab(value)) setActiveTab(value);
              }}
              className="gap-5"
            >
              <TabsList
                variant="workspace"
                aria-label="Warranty detail sections"
              >
                <TabsTrigger value="overview">
                  <ShieldCheck aria-hidden="true" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="fulfillment">
                  <PackageCheck aria-hidden="true" />
                  Fulfillment
                </TabsTrigger>
                <TabsTrigger value="payments">
                  <CreditCard aria-hidden="true" />
                  Payments
                </TabsTrigger>
                <TabsTrigger value="installation">
                  <Video aria-hidden="true" />
                  Installation
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Activity aria-hidden="true" />
                  Activity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <WarrantyOverviewSection detail={detail} />
              </TabsContent>

              <TabsContent value="fulfillment">
                <WarrantyFulfillmentSection
                  detail={detail}
                  tenantId={tenantId}
                  canReconcileFulfillment={canSend}
                />
              </TabsContent>

              <TabsContent value="payments">
                <WarrantyPaymentsSection
                  detail={detail}
                  tenantId={tenantId}
                  canReconcile={canReconcile}
                />
              </TabsContent>

              <TabsContent value="installation">
                <WarrantyInstallationSection
                  detail={detail}
                  reviewPromise={reviewPromise}
                  canReview={canReview}
                />
              </TabsContent>

              <TabsContent value="activity">
                <WarrantyActivitySection detail={detail} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

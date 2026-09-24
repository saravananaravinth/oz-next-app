// oz-next-app/src/features/extended-warranty/ui/review-order-page.tsx
import type { ReactElement } from "react";

import { ContentRoot, ContentSection } from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExtendedWarrantyReviewDetail } from "@/features/extended-warranty/contracts/review.schema";
import { ExtendedWarrantyReviewDecisionPanel } from "@/features/extended-warranty/ui/review-decision-panel";

export function ExtendedWarrantyReviewOrderPage({
  detail,
}: Readonly<{ detail: ExtendedWarrantyReviewDetail }>): ReactElement {
  const canReview = detail.pending && detail.reviewId === null;
  return (
    <ContentRoot>
      <ContentSection
        title={`Extended Warranty ${detail.orderNumber}`}
        description="Installation evidence, location evidence, review decision, activation and certificate state."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Summary label="Customer" value={detail.customerName} />
          <Summary label="Vehicle" value={maskVin(detail.vehicleVin)} />
          <Summary label="Kit" value={detail.kitName} />
          <Summary label="Order" value={humanize(detail.orderStatus)} />
          <Summary label="Evidence" value={humanize(detail.evidenceStatus)} />
          <Summary label="Revision" value={String(detail.revisionNo)} />
        </div>
      </ContentSection>

      <ContentSection
        title="Installation video"
        description="Private five-minute review URL. Do not copy or share it outside the review workflow."
      >
        <Card>
          <CardContent className="pt-6">
            <video
              className="max-h-[32rem] w-full rounded-md bg-black"
              controls
              preload="metadata"
              src={detail.videoUrl}
            >
              Your browser does not support secure video playback.
            </video>
            <div className="text-muted-foreground mt-3 grid gap-1 text-sm">
              <span>File: {detail.fileName}</span>
              <span>
                Recorded:{" "}
                {formatNullableDate(
                  detail.mediaRecordedAt ?? detail.clientRecordedAt,
                )}
              </span>
              <span>Submitted: {formatDate(detail.submittedAt)}</span>
            </div>
          </CardContent>
        </Card>
      </ContentSection>

      <ContentSection
        title="Location evidence"
        description="Precise coordinates are shown only to authorized reviewers and are not copied into general audit metadata."
      >
        <div className="grid gap-4 md:grid-cols-4">
          <Summary label="Latitude" value={detail.latitude} />
          <Summary label="Longitude" value={detail.longitude} />
          <Summary
            label="Accuracy"
            value={
              detail.accuracyMeters === null
                ? "Not reported"
                : `${detail.accuracyMeters} m`
            }
          />
          <Summary
            label="Captured"
            value={formatDate(detail.locationCapturedAt)}
          />
        </div>
      </ContentSection>

      <ContentSection
        title="Manager review"
        description="The decision is idempotent and protected by order/evidence row versions."
      >
        {detail.reviewId === null ? null : (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge>{detail.decision ?? "Reviewed"}</Badge>
            <span className="text-muted-foreground text-sm">
              {detail.reasonCode ?? "No reason code"} ·{" "}
              {formatNullableDate(detail.reviewedAt)}
            </span>
          </div>
        )}
        <ExtendedWarrantyReviewDecisionPanel
          orderId={detail.orderId}
          orderRowVersion={detail.orderRowVersion}
          evidenceRowVersion={detail.evidenceRowVersion}
          disabled={!canReview}
        />
      </ContentSection>

      <ContentSection
        title="Activation & certificate"
        description="Coverage is authoritative in warranty_core. PDF generation runs asynchronously after activation commits."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Summary
            label="Activation"
            value={
              detail.activationStatus === null
                ? "Not started"
                : humanize(detail.activationStatus)
            }
          />
          <Summary
            label="Certificate"
            value={
              detail.certificateStatus === null
                ? "Not created"
                : humanize(detail.certificateStatus)
            }
          />
          <Summary
            label="Certificate no."
            value={detail.certificateNumber ?? "Not issued"}
          />
        </div>
      </ContentSection>
    </ContentRoot>
  );
}

function Summary({
  label,
  value,
}: Readonly<{ label: string; value: string }>): ReactElement {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">{value}</CardContent>
    </Card>
  );
}

function maskVin(value: string | null): string {
  if (value === null || value.length < 6) return "VIN unavailable";
  return `••••••${value.slice(-6)}`;
}
function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./u, (character) => character.toUpperCase());
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
function formatNullableDate(value: string | null): string {
  return value === null ? "Not recorded" : formatDate(value);
}

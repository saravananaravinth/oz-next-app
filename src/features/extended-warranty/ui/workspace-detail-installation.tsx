// oz-next-app/src/features/extended-warranty/ui/workspace-detail-installation.tsx
"use client";

import {
  AlertTriangle,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ErrorBoundary } from "react-error-boundary";

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
import { ExtendedWarrantyReviewDecisionPanel } from "@/features/extended-warranty/ui/review-decision-panel";
import { workspaceDetailStatusBadgeVariant } from "@/features/extended-warranty/ui/workspace-detail-common";
import type {
  ExtendedWarrantyWorkspaceDetailPayload,
  ExtendedWarrantyWorkspaceReviewPayload,
} from "@/features/extended-warranty/ui/workspace-detail.types";
import {
  formatWorkspaceDateTime,
  WorkspaceDetailField,
} from "@/features/extended-warranty/ui/workspace-shared";

function formatFileSize(value: string | null): string {
  if (value === null) return "Not reported";
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "Not reported";
  if (bytes < 1024) return `${bytes.toLocaleString("en-IN")} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toLocaleString("en-IN", { maximumFractionDigits: 1 })} KB`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString("en-IN", { maximumFractionDigits: 1 })} MB`;
}

function ReviewLoadingState(): React.ReactElement {
  return (
    <div
      className="grid gap-4 rounded-xl border border-border/70 p-4"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-5 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="aspect-video max-h-[28rem] w-full animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
    </div>
  );
}

function SecureReviewVideo({
  videoUrl,
  onRefresh,
}: Readonly<{
  videoUrl: string;
  onRefresh: () => void;
}>): React.ReactElement {
  const [unavailable, setUnavailable] = React.useState(false);

  if (unavailable) {
    return (
      <div className="grid aspect-video max-h-[32rem] place-items-center rounded-xl border bg-muted/30 p-6 text-center">
        <div className="grid max-w-md gap-3">
          <Video
            className="mx-auto size-8 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium">Secure video is unavailable</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The signed media URL may have expired or playback may have failed.
              Refresh the record to request a current review URL.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mx-auto"
            onClick={onRefresh}
          >
            <RefreshCw className="mr-2 size-4" aria-hidden="true" />
            Refresh secure video
          </Button>
        </div>
      </div>
    );
  }

  return (
    <video
      controls
      preload="metadata"
      src={videoUrl}
      className="aspect-video max-h-[32rem] w-full rounded-xl border bg-black object-contain"
      onError={() => {
        setUnavailable(true);
      }}
    >
      Your browser does not support secure video playback.
    </video>
  );
}

function ReviewEvidencePanel({
  reviewPromise,
}: Readonly<{
  reviewPromise: Promise<ExtendedWarrantyWorkspaceReviewPayload>;
}>): React.ReactElement {
  const router = useRouter();
  const { review, reviewUnavailable } = React.use(reviewPromise);

  if (reviewUnavailable !== null) {
    return (
      <ContentStatus
        variant="info"
        title="Installation review"
        description={reviewUnavailable}
        icon={<Video className="size-4" aria-hidden="true" />}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              router.refresh();
            }}
          >
            <RefreshCw className="mr-2 size-4" aria-hidden="true" />
            Refresh review
          </Button>
        }
      />
    );
  }

  if (review === null) {
    return (
      <ContentStatus
        title="Secure evidence unavailable"
        description="Installation evidence has not entered the secure review surface for the current workspace context."
        icon={<ShieldCheck className="size-4" aria-hidden="true" />}
      />
    );
  }

  const recordedAt = review.mediaRecordedAt ?? review.clientRecordedAt;
  const canDecide = review.pending && review.reviewId === null;

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(18rem,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Secure installation video</CardTitle>
            <CardDescription>
              Private review media. The signed playback URL expires{" "}
              {formatWorkspaceDateTime(review.videoUrlExpiresAt)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SecureReviewVideo
              key={review.videoUrl}
              videoUrl={review.videoUrl}
              onRefresh={() => {
                router.refresh();
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evidence metadata</CardTitle>
            <CardDescription>
              Sensitive review evidence is shown only inside the authorized
              review workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <WorkspaceDetailField label="File" value={review.fileName} />
            <WorkspaceDetailField
              label="Media type"
              value={review.fileMimeType ?? "Not reported"}
            />
            <WorkspaceDetailField
              label="File size"
              value={formatFileSize(review.fileSizeBytes)}
            />
            <WorkspaceDetailField
              label="Recorded"
              value={formatWorkspaceDateTime(recordedAt)}
            />
            <WorkspaceDetailField
              label="Submitted"
              value={formatWorkspaceDateTime(review.submittedAt)}
            />
            <WorkspaceDetailField
              label="Location source"
              value={formatDisplayLabel(review.locationSource, "Unknown")}
            />
            <WorkspaceDetailField
              label="Location captured"
              value={formatWorkspaceDateTime(review.locationCapturedAt)}
            />
            <WorkspaceDetailField
              label="Coordinates"
              value={
                <span className="inline-flex items-start gap-1.5 font-mono text-xs">
                  <MapPin
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {review.latitude}, {review.longitude}
                </span>
              }
            />
            <WorkspaceDetailField
              label="Accuracy"
              value={
                review.accuracyMeters === null
                  ? "Not reported"
                  : `${review.accuracyMeters} m`
              }
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval history</CardTitle>
          <CardDescription>
            Every evidence revision and review outcome remains visible for audit
            and repeat-submission traceability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-xl border border-border/70">
            {review.history.map((item) => (
              <div
                key={item.evidenceId}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium">Attempt {item.revisionNo}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDisplayLabel(item.evidenceStatus, "Unknown Status")}{" "}
                    · {formatWorkspaceDateTime(item.submittedAt)}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <Badge
                    variant={
                      item.decision === null
                        ? "outline"
                        : workspaceDetailStatusBadgeVariant(item.decision)
                    }
                  >
                    {item.decision === null
                      ? "Awaiting review"
                      : formatDisplayLabel(item.decision, "Reviewed")}
                  </Badge>
                  {item.decision === null ? null : (
                    <div className="text-xs text-muted-foreground sm:text-right">
                      {formatWorkspaceDateTime(item.reviewedAt)}
                      {item.reasonCode === null
                        ? ""
                        : ` · ${formatDisplayLabel(
                            item.reasonCode,
                            item.reasonCode,
                          )}`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manager review</CardTitle>
          <CardDescription>
            Decisions are server-confirmed, idempotent, and protected by order
            and evidence row versions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {review.reviewId === null ? null : (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/20 p-3">
              <Badge
                variant={workspaceDetailStatusBadgeVariant(
                  review.decision ?? "REVIEWED",
                )}
              >
                {review.decision === null
                  ? "Reviewed"
                  : formatDisplayLabel(review.decision, "Reviewed")}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDisplayLabel(review.reasonCode, "No reason code")} ·{" "}
                {formatWorkspaceDateTime(review.reviewedAt)}
              </span>
            </div>
          )}
          <ExtendedWarrantyReviewDecisionPanel
            orderId={review.orderId}
            orderNumber={review.orderNumber}
            evidenceRevisionNo={review.revisionNo}
            orderRowVersion={review.orderRowVersion}
            evidenceRowVersion={review.evidenceRowVersion}
            disabled={!canDecide}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function WarrantyInstallationSection({
  detail,
  reviewPromise,
  canReview,
}: Readonly<{
  detail: ExtendedWarrantyWorkspaceDetailPayload;
  reviewPromise: Promise<ExtendedWarrantyWorkspaceReviewPayload> | null;
  canReview: boolean;
}>): React.ReactElement {
  const router = useRouter();

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Installation state</CardTitle>
          <CardDescription>
            High-level installation and review state from the warranty order.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          <WorkspaceDetailField
            label="Submitted"
            value={formatWorkspaceDateTime(detail.installationSubmittedAt)}
          />
          <WorkspaceDetailField
            label="Decision"
            value={formatDisplayLabel(detail.reviewDecision, "Awaiting review")}
          />
          <WorkspaceDetailField
            label="Reviewed"
            value={formatWorkspaceDateTime(detail.reviewedAt)}
          />
        </CardContent>
      </Card>

      {!canReview ? (
        <ContentStatus
          title="Review access required"
          description="Installation evidence and precise location are available only to authorized Extended Warranty reviewers."
          icon={<ShieldCheck className="size-4" aria-hidden="true" />}
        />
      ) : reviewPromise === null ? (
        <ContentStatus
          title="Secure evidence unavailable"
          description="Installation evidence is not available for the current workspace record."
          icon={<ShieldCheck className="size-4" aria-hidden="true" />}
        />
      ) : (
        <ErrorBoundary
          resetKeys={[reviewPromise]}
          fallbackRender={() => (
            <ContentStatus
              variant="destructive"
              announce="assertive"
              title="Installation evidence could not be loaded"
              description="The warranty record remains available. Refresh to request the current secure review evidence."
              icon={<AlertTriangle className="size-4" aria-hidden="true" />}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    router.refresh();
                  }}
                >
                  <RefreshCw className="mr-2 size-4" aria-hidden="true" />
                  Refresh review
                </Button>
              }
            />
          )}
        >
          <React.Suspense fallback={<ReviewLoadingState />}>
            <ReviewEvidencePanel reviewPromise={reviewPromise} />
          </React.Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}

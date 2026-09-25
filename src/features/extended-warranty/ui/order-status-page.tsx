// oz-next-app/src/features/extended-warranty/ui/order-status-page.tsx
"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileVideo2,
  LoaderCircle,
  LocateFixed,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
  UploadCloud,
} from "lucide-react";

import {
  ContentFormActions,
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { isApiHttpError } from "@/lib/api/problem";
import { idempotencyKey as createIdempotencyKey } from "@/lib/security/request-identifiers";
import {
  createExtendedWarrantyInstallationUpload,
  finalizeExtendedWarrantyInstallationUpload,
  getExtendedWarrantyOrderStatus,
  sha256File,
  uploadInstallationVideoToSignedUrl,
  type InstallationLocationEvidence,
} from "@/features/extended-warranty/api/order-status.client";
import {
  EXTENDED_WARRANTY_INSTALLATION_VIDEO_MAX_BYTES,
  EXTENDED_WARRANTY_INSTALLATION_VIDEO_MIME_TYPES,
  type ExtendedWarrantyOrderStatus,
} from "@/features/extended-warranty/contracts/order-status.schema";

const STATUS_POLL_MS = 12_000;
const GEOLOCATION_TIMEOUT_MS = 15_000;
const ACCEPT = EXTENDED_WARRANTY_INSTALLATION_VIDEO_MIME_TYPES.join(",");
const ACCEPTED_MIME_TYPES = new Set<string>(
  EXTENDED_WARRANTY_INSTALLATION_VIDEO_MIME_TYPES,
);
const POLLED_ORDER_STATUSES = new Set<string>([
  "SHIPPED",
  "DELIVERED",
  "INSTALLATION_PENDING",
  "REVIEW_PENDING",
  "REJECTED",
  "APPROVED",
  "ACTIVATION_PENDING",
]);

export type ExtendedWarrantyOrderStatusPageProps = Readonly<{ token: string }>;

type PageState = "loading" | "ready" | "unavailable" | "error";
type UploadState = "idle" | "preparing" | "uploading" | "finalizing";

type SelectedVideo = Readonly<{
  file: File;
  recordedAt: string;
  idempotencyKey: string;
}>;

export function ExtendedWarrantyOrderStatusPage({
  token,
}: ExtendedWarrantyOrderStatusPageProps): React.ReactElement {
  const [status, setStatus] =
    React.useState<ExtendedWarrantyOrderStatus | null>(null);
  const [pageState, setPageState] = React.useState<PageState>("loading");
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] =
    React.useState<SelectedVideo | null>(null);
  const [uploadState, setUploadState] = React.useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const lifecycleControllerRef = React.useRef<AbortController | null>(null);

  const refresh = React.useCallback(
    async (signal: AbortSignal): Promise<void> => {
      try {
        const result = await getExtendedWarrantyOrderStatus(token, signal);

        if (isAbortRequested(signal)) {
          return;
        }

        setStatus(result);
        setPageError(null);
        setPageState("ready");
      } catch (error: unknown) {
        if (isAbortRequested(signal)) {
          return;
        }

        if (isTerminalOrderLinkError(error)) {
          setStatus(null);
          setPageState("unavailable");
          return;
        }

        setPageError(toSafeMessage(error));
        setPageState("error");
      }
    },
    [token],
  );

  const refreshCurrent = React.useCallback(async (): Promise<void> => {
    const signal = lifecycleControllerRef.current?.signal;

    if (signal === undefined || isAbortRequested(signal)) {
      return;
    }

    await refresh(signal);
  }, [refresh]);

  React.useEffect(() => {
    const controller = new AbortController();
    lifecycleControllerRef.current = controller;

    void getExtendedWarrantyOrderStatus(token, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        setStatus(result);
        setPageError(null);
        setPageState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (isTerminalOrderLinkError(error)) {
          setStatus(null);
          setPageState("unavailable");
          return;
        }

        setPageError(toSafeMessage(error));
        setPageState("error");
      });

    return () => {
      controller.abort();
      lifecycleControllerRef.current = null;
    };
  }, [token]);

  React.useEffect(() => {
    if (status === null || !shouldPoll(status)) {
      return;
    }

    const interval = window.setInterval(() => {
      if (uploadState === "idle") {
        void refreshCurrent();
      }
    }, STATUS_POLL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshCurrent, status, uploadState]);

  const handleFileChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      setUploadError(null);
      setUploadProgress(0);
      if (file === null) {
        setSelectedVideo(null);
        return;
      }
      const validationError = validateVideo(file);
      if (validationError !== null) {
        setSelectedVideo(null);
        setUploadError(validationError);
        event.target.value = "";
        return;
      }
      setSelectedVideo({
        file,
        recordedAt: new Date(file.lastModified).toISOString(),
        idempotencyKey: createIdempotencyKey(),
      });
    },
    [],
  );

  const handleSubmit = React.useCallback(async (): Promise<void> => {
    const signal = lifecycleControllerRef.current?.signal;

    if (
      selectedVideo === null ||
      status?.installation.canUpload !== true ||
      uploadState !== "idle" ||
      signal === undefined ||
      isAbortRequested(signal)
    ) {
      return;
    }

    setUploadError(null);
    setUploadProgress(0);
    setUploadState("preparing");

    try {
      const location = await requestInstallationLocation();

      if (isAbortRequested(signal)) {
        return;
      }

      const checksumSha256 = await sha256File(selectedVideo.file);

      if (isAbortRequested(signal)) {
        return;
      }

      const intent = await createExtendedWarrantyInstallationUpload({
        token,
        fileName: selectedVideo.file.name,
        contentType: toSupportedMimeType(selectedVideo.file.type),
        sizeBytes: selectedVideo.file.size,
        checksumSha256,
        idempotencyKey: selectedVideo.idempotencyKey,
        signal,
      });

      if (isAbortRequested(signal)) {
        return;
      }

      setUploadState("uploading");
      await uploadInstallationVideoToSignedUrl({
        uploadUrl: intent.uploadUrl,
        file: selectedVideo.file,
        requiredHeaders: intent.requiredHeaders,
        signal,
        onProgress: (percent: number) => {
          if (!isAbortRequested(signal)) {
            setUploadProgress(percent);
          }
        },
      });

      if (isAbortRequested(signal)) {
        return;
      }

      setUploadState("finalizing");
      await finalizeExtendedWarrantyInstallationUpload({
        token,
        uploadId: intent.uploadId,
        checksumSha256,
        sizeBytes: selectedVideo.file.size,
        recordedAt: selectedVideo.recordedAt,
        location,
        signal,
      });

      if (isAbortRequested(signal)) {
        return;
      }

      setSelectedVideo(null);
      setUploadProgress(100);
      await refresh(signal);
    } catch (error: unknown) {
      if (isAbortRequested(signal)) {
        return;
      }

      setUploadError(toUploadMessage(error));
    } finally {
      if (!isAbortRequested(signal)) {
        setUploadState("idle");
      }
    }
  }, [
    refresh,
    selectedVideo,
    status?.installation.canUpload,
    token,
    uploadState,
  ]);

  if (pageState === "loading") {
    return (
      <PageState
        title="Loading secure order"
        description="Validating your Extended Warranty order link."
      />
    );
  }
  if (pageState === "unavailable") {
    return (
      <PageState
        title="Order link unavailable"
        description="This secure order-status link is invalid, expired, revoked, or no longer available. Use the latest link from Ozotec EV."
      />
    );
  }
  if (status === null) {
    return (
      <PageState
        title="Unable to load order"
        description={
          pageError ?? "The order status could not be loaded securely."
        }
        retry={() => void refreshCurrent()}
      />
    );
  }

  return (
    <ContentRoot
      width="default"
      density="comfortable"
      className="min-h-dvh px-3 py-4 sm:px-6 sm:py-10"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Extended Warranty</Badge>
              <Badge variant="outline">
                <ShieldCheck aria-hidden="true" /> Secure order status
              </Badge>
            </div>
            <CardTitle className="text-balance text-xl sm:text-3xl">
              Order {status.orderNumber}
            </CardTitle>
            <CardDescription>
              {status.vehicleLabel} · {status.kitName}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">{humanize(status.orderStatus)}</Badge>
            {status.payment.confirmed ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4" aria-hidden="true" /> Payment
                confirmed
              </span>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <ContentSection
            title="Payment & Zoho order"
            description="Only provider-confirmed payment and customer-safe ERP references are shown here."
          >
            <StatusRows
              rows={[
                [
                  "Payment",
                  status.payment.confirmed
                    ? "Confirmed"
                    : "Pending confirmation",
                ],
                [
                  "Confirmed at",
                  formatNullableDate(status.payment.confirmedAt),
                ],
                ["Sales order", status.zoho.salesOrderNumber ?? "Pending"],
                ["Invoice", status.zoho.invoiceNumber ?? "Pending"],
              ]}
            />
          </ContentSection>

          <ContentSection
            title="Shipment"
            description="Tracking information appears after Zoho creates the shipment."
          >
            <div className="space-y-3">
              <StatusRows
                rows={[
                  [
                    "Status",
                    status.shipment.status === null
                      ? "Pending"
                      : humanize(status.shipment.status),
                  ],
                  ["Shipment", status.shipment.shipmentNumber ?? "Pending"],
                  ["Carrier", status.shipment.carrierName ?? "Pending"],
                  ["Tracking", status.shipment.trackingNumber ?? "Pending"],
                  [
                    "Estimated delivery",
                    formatNullableDate(status.shipment.estimatedDeliveryAt),
                  ],
                  [
                    "Delivered",
                    formatNullableDate(status.shipment.deliveredAt),
                  ],
                ]}
              />
              {status.shipment.trackingUrl === null ? null : (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={status.shipment.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Truck aria-hidden="true" /> Track shipment{" "}
                    <ExternalLink aria-hidden="true" />
                  </a>
                </Button>
              )}
            </div>
          </ContentSection>
        </div>

        <ContentSection
          title="Installation evidence"
          description="After delivery, submit one current installation video. The video is uploaded directly to private storage and malware-scanned before review."
        >
          <div className="space-y-5">
            <InstallationState status={status} />

            {status.installation.canUpload ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileVideo2 aria-hidden="true" /> Submit installation video
                  </CardTitle>
                  <CardDescription>
                    MP4 or WebM, maximum{" "}
                    {formatBytes(
                      EXTENDED_WARRANTY_INSTALLATION_VIDEO_MAX_BYTES,
                    )}
                    . Your precise location is requested only when you press
                    Submit, to validate where the installation evidence was
                    captured. Location permission is required for this
                    submission and is not displayed on this page.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ew-installation-video">
                      Installation video
                    </Label>
                    <Input
                      id="ew-installation-video"
                      type="file"
                      accept={ACCEPT}
                      capture="environment"
                      disabled={uploadState !== "idle"}
                      onChange={handleFileChange}
                    />
                    {selectedVideo === null ? null : (
                      <p className="text-sm text-muted-foreground">
                        {selectedVideo.file.name} ·{" "}
                        {formatBytes(selectedVideo.file.size)}
                      </p>
                    )}
                  </div>

                  {uploadState !== "idle" ? (
                    <div className="space-y-2" aria-live="polite">
                      <Progress
                        value={
                          uploadState === "uploading" ? uploadProgress : null
                        }
                      />
                      <p className="text-sm text-muted-foreground">
                        {uploadStateLabel(uploadState, uploadProgress)}
                      </p>
                    </div>
                  ) : null}

                  {uploadError === null ? null : (
                    <ContentStatus
                      variant="destructive"
                      title="Installation video was not submitted"
                      description={uploadError}
                      announce="assertive"
                    />
                  )}

                  <ContentFormActions>
                    <div className="mr-auto flex items-center gap-2 text-sm text-muted-foreground">
                      <LocateFixed className="size-4" aria-hidden="true" /> GPS
                      is requested only at submission.
                    </div>
                    <Button
                      type="button"
                      disabled={
                        selectedVideo === null || uploadState !== "idle"
                      }
                      onClick={() => void handleSubmit()}
                    >
                      {uploadState === "idle" ? (
                        <UploadCloud aria-hidden="true" />
                      ) : (
                        <LoaderCircle
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      )}
                      Submit installation video
                    </Button>
                  </ContentFormActions>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </ContentSection>

        <ContentSection
          title="Review & certificate"
          description="Installation review and certificate issuance are updated from Ozotec ERP."
        >
          <StatusRows
            rows={[
              ["Approval", humanize(status.approval.status)],
              ["Reviewed at", formatNullableDate(status.approval.reviewedAt)],
              [
                "Certificate",
                status.certificate.available ? "Issued" : "Not issued yet",
              ],
            ]}
          />
          {status.certificate.available &&
          status.certificate.downloadUrl !== null ? (
            <div className="mt-4">
              <Button asChild>
                <a
                  href={status.certificate.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download warranty certificate
                </a>
              </Button>
              <p className="text-muted-foreground mt-2 text-xs">
                This private download link expires shortly. Refresh this page if
                it has expired.
              </p>
            </div>
          ) : null}
        </ContentSection>

        <ContentFormActions>
          <Button
            type="button"
            variant="outline"
            disabled={uploadState !== "idle"}
            onClick={() => void refreshCurrent()}
          >
            <RefreshCw aria-hidden="true" /> Refresh status
          </Button>
        </ContentFormActions>
      </div>
    </ContentRoot>
  );
}

function InstallationState({
  status,
}: Readonly<{ status: ExtendedWarrantyOrderStatus }>): React.ReactElement {
  const evidence = status.installation.status;
  if (evidence === "SCANNING" || evidence === "UPLOADED") {
    return (
      <ContentStatus
        title="Video security scan in progress"
        description="Your video was received and is being scanned before it can enter the review queue."
        icon={<LoaderCircle className="animate-spin" aria-hidden="true" />}
        announce="polite"
      />
    );
  }
  if (evidence === "READY_FOR_REVIEW" || status.approval.status === "PENDING") {
    return (
      <ContentStatus
        title="Ready for review"
        description="Your installation evidence passed the security scan and is waiting for manager review."
        icon={<Clock3 aria-hidden="true" />}
        announce="polite"
      />
    );
  }
  if (status.approval.status === "APPROVED" || evidence === "APPROVED") {
    return (
      <ContentStatus
        title="Installation approved"
        description="Your installation evidence has been approved."
        icon={<CheckCircle2 aria-hidden="true" />}
        announce="polite"
      />
    );
  }
  if (evidence === "QUARANTINED") {
    return (
      <ContentStatus
        variant="destructive"
        title="Video could not enter review"
        description="The uploaded file did not pass the security scan. Submit a new supported video using this secure link."
        announce="assertive"
      />
    );
  }
  if (status.approval.status === "REJECTED" || evidence === "REJECTED") {
    return (
      <ContentStatus
        variant="destructive"
        title="New installation evidence required"
        description="The previous installation evidence was rejected. You can submit one replacement video using this secure link."
        announce="assertive"
      />
    );
  }
  if (status.orderStatus === "SHIPPED") {
    return (
      <ContentStatus
        title="Installation submission opens after delivery"
        description="Track the shipment above. The installation upload becomes available after delivery is confirmed."
        icon={<Truck aria-hidden="true" />}
        announce="polite"
      />
    );
  }
  if (status.orderStatus === "DELIVERED") {
    return (
      <ContentStatus
        title="Ready for installation evidence"
        description="Your kit is marked delivered. Submit the installation video when the installation is complete."
        icon={<PackageCheck aria-hidden="true" />}
        announce="polite"
      />
    );
  }
  return (
    <ContentStatus
      title="Installation status"
      description={humanize(status.orderStatus)}
      icon={<Clock3 aria-hidden="true" />}
      announce="polite"
    />
  );
}

function StatusRows({
  rows,
}: Readonly<{
  rows: ReadonlyArray<readonly [string, string]>;
}>): React.ReactElement {
  return (
    <dl className="divide-y rounded-lg border">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4"
        >
          <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words text-sm text-foreground">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PageState({
  title,
  description,
  retry,
}: Readonly<{
  title: string;
  description: string;
  retry?: () => void;
}>): React.ReactElement {
  return (
    <ContentRoot width="narrow" className="py-12">
      <ContentStatus
        title={title}
        description={description}
        icon={<ShieldCheck aria-hidden="true" />}
        {...(retry === undefined
          ? {}
          : {
              actions: (
                <Button type="button" variant="outline" onClick={retry}>
                  <RefreshCw aria-hidden="true" /> Try again
                </Button>
              ),
            })}
        announce="polite"
      />
    </ContentRoot>
  );
}

function validateVideo(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    return "Choose an MP4 or WebM installation video.";
  }
  const normalizedName = file.name.toLowerCase();
  if (
    (file.type === "video/mp4" && !normalizedName.endsWith(".mp4")) ||
    (file.type === "video/webm" && !normalizedName.endsWith(".webm"))
  ) {
    return "The video filename extension does not match its media type.";
  }
  if (
    file.size <= 0 ||
    file.size > EXTENDED_WARRANTY_INSTALLATION_VIDEO_MAX_BYTES
  ) {
    return `The installation video must be between 1 byte and ${formatBytes(EXTENDED_WARRANTY_INSTALLATION_VIDEO_MAX_BYTES)}.`;
  }
  return null;
}

function toSupportedMimeType(value: string): "video/mp4" | "video/webm" {
  if (value === "video/mp4" || value === "video/webm") return value;
  throw new Error("Choose an MP4 or WebM installation video.");
}

async function requestInstallationLocation(): Promise<InstallationLocationEvidence> {
  if (!("geolocation" in navigator)) {
    throw new Error(
      "Location is not available in this browser. Use a browser with location services enabled to submit installation evidence.",
    );
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: GEOLOCATION_TIMEOUT_MS,
    });
  }).catch((error: unknown) => {
    if (isGeolocationPermissionDenied(error)) {
      throw new Error(
        "Location permission is required to submit installation evidence. Allow location access and try again.",
      );
    }
    throw new Error(
      "Your current location could not be captured accurately. Check location services and try again.",
    );
  });

  const accuracy = Number.isFinite(position.coords.accuracy)
    ? position.coords.accuracy
    : null;
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: accuracy,
    capturedAt: new Date(position.timestamp).toISOString(),
    source: "BROWSER_GEOLOCATION",
  };
}

function isGeolocationPermissionDenied(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error))
    return false;
  return error.code === 1;
}

function shouldPoll(status: ExtendedWarrantyOrderStatus): boolean {
  return (
    POLLED_ORDER_STATUSES.has(status.orderStatus) ||
    status.installation.status === "UPLOADED" ||
    status.installation.status === "SCANNING" ||
    status.installation.status === "READY_FOR_REVIEW"
  );
}

function isAbortRequested(signal: AbortSignal): boolean {
  return signal.aborted;
}

function isTerminalOrderLinkError(error: unknown): boolean {
  return isApiHttpError(error) && [401, 403, 404, 410].includes(error.status);
}

function toSafeMessage(error: unknown): string {
  if (isApiHttpError(error)) return error.message;
  return "The secure order status could not be loaded. Please try again.";
}

function toUploadMessage(error: unknown): string {
  if (isApiHttpError(error)) return error.message;
  if (error instanceof Error && error.message.trim().length > 0)
    return error.message;
  return "The installation video could not be submitted safely. Please try again.";
}

function uploadStateLabel(state: UploadState, progress: number): string {
  if (state === "preparing")
    return "Validating location and preparing the secure upload…";
  if (state === "uploading")
    return `Uploading directly to private storage… ${String(progress)}%`;
  if (state === "finalizing")
    return "Finalizing the upload and starting the security scan…";
  return "";
}

function humanize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatNullableDate(value: string | null): string {
  return value === null
    ? "Pending"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value));
}

function formatBytes(value: number): string {
  if (value >= 1024 * 1024)
    return `${(value / (1024 * 1024)).toFixed(value % (1024 * 1024) === 0 ? 0 : 1)} MiB`;
  if (value >= 1024) return `${String(Math.ceil(value / 1024))} KiB`;
  return `${String(value)} B`;
}

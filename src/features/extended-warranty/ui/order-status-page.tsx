// oz-next-app/src/features/extended-warranty/ui/order-status-page.tsx
"use client";

import * as React from "react";
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  LoaderCircle,
  MapPin,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Square,
  Truck,
  Video,
  XCircle,
} from "lucide-react";

import { ContentRoot, ContentStatus } from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { isApiHttpError } from "@/lib/api/problem";
import {
  getExtendedWarrantyOrderStatus,
  type InstallationLocationEvidence,
} from "@/features/extended-warranty/api/order-status.client";
import { type ExtendedWarrantyOrderStatus } from "@/features/extended-warranty/contracts/order-status.schema";

import {
  createInstallationUploadSession,
  resumeInstallationUpload,
  RecordingExpiredError,
  type InstallationUploadSession,
  type LiveRecording,
} from "@/features/extended-warranty/api/installation-upload-session";

import {
  startInstallationRecorder,
  type InstallationRecorderHandle,
} from "@/features/extended-warranty/api/live-installation-recorder";

const STATUS_POLL_MS = 12_000;
const GEOLOCATION_TIMEOUT_MS = 15_000;
const POLLED_ORDER_STATUSES = new Set<string>([
  "SALES_ORDER_PENDING",
  "SALES_ORDER_CREATED",
  "PROCESSING",
  "INVOICED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "INSTALLATION_PENDING",
  "REVIEW_PENDING",
  "REJECTED",
  "APPROVED",
  "ACTIVATION_PENDING",
  "CERTIFICATE_PENDING",
]);

export type ExtendedWarrantyOrderStatusPageProps = Readonly<{ token: string }>;

type PageState = "loading" | "ready" | "unavailable" | "error";
type RecorderState =
  | "idle"
  | "requesting"
  | "ready"
  | "failed"
  | "recording"
  | "preparing"
  | "uploading"
  | "finalizing";

export function ExtendedWarrantyOrderStatusPage({
  token,
}: ExtendedWarrantyOrderStatusPageProps): React.ReactElement {
  const [status, setStatus] =
    React.useState<ExtendedWarrantyOrderStatus | null>(null);
  const [pageState, setPageState] = React.useState<PageState>("loading");
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [recorderOpen, setRecorderOpen] = React.useState(false);
  const [recorderState, setRecorderState] =
    React.useState<RecorderState>("idle");
  const [recordingElapsedMs, setRecordingElapsedMs] = React.useState(0);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [recorderError, setRecorderError] = React.useState<string | null>(null);
  const [location, setLocation] =
    React.useState<InstallationLocationEvidence | null>(null);
  const [previewStream, setPreviewStream] = React.useState<MediaStream | null>(
    null,
  );
  const lifecycleControllerRef = React.useRef<AbortController | null>(null);
  const uploadSessionRef = React.useRef<InstallationUploadSession | null>(null);
  const uploadBusyRef = React.useRef(false);
  const captureGenerationRef = React.useRef(0);
  const [recordingExpired, setRecordingExpired] = React.useState(false);
  const streamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<InstallationRecorderHandle | null>(null);
  const stopTracks = React.useCallback((): void => {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
  }, []);

  const refresh = React.useCallback(
    async (signal: AbortSignal): Promise<void> => {
      try {
        const result = await getExtendedWarrantyOrderStatus(token, signal);
        if (isAbortRequested(signal)) return;
        setStatus(result);
        setPageError(null);
        setPageState("ready");
      } catch (error: unknown) {
        if (isAbortRequested(signal)) return;
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
    if (signal === undefined || signal.aborted) return;
    await refresh(signal);
  }, [refresh]);

  React.useEffect(() => {
    const controller = new AbortController();
    lifecycleControllerRef.current = controller;

    void getExtendedWarrantyOrderStatus(token, controller.signal)
      .then((result) => {
        if (isAbortRequested(controller.signal)) return;
        setStatus(result);
        setPageError(null);
        setPageState("ready");
      })
      .catch((error: unknown) => {
        if (isAbortRequested(controller.signal)) return;
        if (isTerminalOrderLinkError(error)) {
          setStatus(null);
          setPageState("unavailable");
          return;
        }
        setPageError(toSafeMessage(error));
        setPageState("error");
      });

    return () => {
      captureGenerationRef.current += 1;
      uploadSessionRef.current = null;
      controller.abort();
      lifecycleControllerRef.current = null;
      recorderRef.current?.cancel();
      recorderRef.current = null;
      stopTracks();
    };
  }, [stopTracks, token]);

  React.useEffect(() => {
    if (status === null || !shouldPoll(status) || recorderState !== "idle")
      return;
    const interval = window.setInterval(
      () => void refreshCurrent(),
      STATUS_POLL_MS,
    );
    return () => {
      window.clearInterval(interval);
    };
  }, [recorderState, refreshCurrent, status]);

  const uploadRecording = React.useCallback(
    async (recording?: LiveRecording): Promise<void> => {
      const signal = lifecycleControllerRef.current?.signal;
      if (signal === undefined || signal.aborted || uploadBusyRef.current)
        return;
      if (recording !== undefined) {
        if (location === null) return;
        uploadSessionRef.current = createInstallationUploadSession(
          recording,
          location,
        );
      }
      const session = uploadSessionRef.current;
      if (session === null) return;
      uploadBusyRef.current = true;
      setRecorderError(null);
      setRecordingExpired(false);
      setUploadProgress(0);
      try {
        await resumeInstallationUpload(session, {
          token,
          signal,
          onStage: (stage) => {
            if (!signal.aborted) setRecorderState(stage);
          },
          onProgress: (percent) => {
            if (!signal.aborted) setUploadProgress(percent);
          },
        });
        if (isAbortRequested(signal)) return;
        uploadSessionRef.current = null;
        setRecorderOpen(false);
        setRecorderState("idle");
        setLocation(null);
        setUploadProgress(100);
        setPreviewStream(null);
        stopTracks();
        await refresh(signal);
      } catch (error: unknown) {
        if (isAbortRequested(signal)) return;
        setRecorderState("failed");
        setRecordingExpired(error instanceof RecordingExpiredError);
        setRecorderError(toUploadMessage(error));
      } finally {
        uploadBusyRef.current = false;
      }
    },
    [location, refresh, stopTracks, token],
  );

  const openRecorder = React.useCallback(async (): Promise<void> => {
    if (
      status?.installation.canUpload !== true ||
      !["idle", "failed"].includes(recorderState)
    )
      return;
    const signal = lifecycleControllerRef.current?.signal;
    if (signal === undefined || signal.aborted) return;
    const generation = ++captureGenerationRef.current;
    uploadSessionRef.current = null;
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setRecordingExpired(false);
    stopTracks();
    setRecorderOpen(true);
    setRecorderState("requesting");
    setRecorderError(null);
    setRecordingElapsedMs(0);
    try {
      assertLiveRecorderSupport();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      if (
        isAbortRequested(signal) ||
        generation !== captureGenerationRef.current
      ) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      streamRef.current = stream;
      setPreviewStream(stream);
      const capturedLocation = await requestInstallationLocation();
      if (
        isAbortRequested(signal) ||
        generation !== captureGenerationRef.current
      )
        return;
      setLocation(capturedLocation);
      setRecorderState("ready");
    } catch (error: unknown) {
      if (
        isAbortRequested(signal) ||
        generation !== captureGenerationRef.current
      )
        return;
      setPreviewStream(null);
      stopTracks();
      setRecorderState("idle");
      setRecorderOpen(false);
      setRecorderError(toRecorderPermissionMessage(error));
    }
  }, [recorderState, status?.installation.canUpload, stopTracks]);

  const stopRecording = React.useCallback((): void => {
    recorderRef.current?.stop();
  }, []);

  const startRecording = React.useCallback((): void => {
    const stream = streamRef.current;
    const signal = lifecycleControllerRef.current?.signal;
    if (
      stream === null ||
      recorderState !== "ready" ||
      location === null ||
      signal === undefined ||
      signal.aborted ||
      recorderRef.current !== null
    )
      return;
    setRecorderError(null);
    setRecordingElapsedMs(0);
    setRecorderState("recording");
    const fail = (): void => {
      recorderRef.current = null;
      stopTracks();
      if (signal.aborted) return;
      setPreviewStream(null);
      setRecorderState("failed");
      setRecordingExpired(true);
      setRecorderError(
        "The camera recording could not be completed. Record the installation again.",
      );
    };
    try {
      recorderRef.current = startInstallationRecorder(
        stream,
        selectRecorderMimeType(),
        {
          complete: (recording) => {
            recorderRef.current = null;
            stopTracks();
            if (signal.aborted) return;
            setPreviewStream(null);
            void uploadRecording(recording);
          },
          error: fail,
          tick: (elapsed) => {
            if (!signal.aborted) setRecordingElapsedMs(elapsed);
          },
        },
      );
    } catch {
      fail();
    }
  }, [location, recorderState, stopTracks, uploadRecording]);

  const closeRecorder = React.useCallback((): void => {
    if (
      ["recording", "preparing", "uploading", "finalizing"].includes(
        recorderState,
      )
    )
      return;
    captureGenerationRef.current += 1;
    uploadSessionRef.current = null;
    setPreviewStream(null);
    stopTracks();
    setRecorderOpen(false);
    setRecorderState("idle");
    setLocation(null);
    setRecorderError(null);
    setRecordingElapsedMs(0);
  }, [recorderState, stopTracks]);

  if (pageState === "loading") {
    return (
      <PageState
        title="Loading your order"
        description="Validating your secure Extended Warranty link."
      />
    );
  }
  if (pageState === "unavailable") {
    return (
      <PageState
        title="Order link unavailable"
        description="This secure link is invalid, expired, revoked, or no longer available. Use the latest link sent by Ozotec EV."
      />
    );
  }
  if (status === null || pageState === "error") {
    return (
      <PageState
        title="Unable to load order"
        description={
          pageError ?? "The secure order status could not be loaded."
        }
        retry={() => void refreshCurrent()}
      />
    );
  }

  return (
    <ContentRoot
      width="narrow"
      density="comfortable"
      className="min-h-dvh bg-muted/20 px-0 py-0"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background shadow-sm">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4" aria-hidden="true" /> Extended
              Warranty
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Order {status.orderNumber}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Refresh order status"
            disabled={recorderState !== "idle"}
            onClick={() => void refreshCurrent()}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </header>

        <main className="flex flex-1 flex-col gap-3 px-3 py-3 pb-8">
          <CurrentStageCard
            status={status}
            recorderOpen={recorderOpen}
            recorderState={recorderState}
            recordingElapsedMs={recordingElapsedMs}
            uploadProgress={uploadProgress}
            recorderError={recorderError}
            previewStream={previewStream}
            onOpenRecorder={() => void openRecorder()}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onCloseRecorder={closeRecorder}
            onRetryUpload={() => void uploadRecording()}
            onRecordAgain={() => void openRecorder()}
            recordingExpired={recordingExpired}
          />

          <Card className="rounded-2xl shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order & payment</CardTitle>
              <CardDescription>
                Purchase, vehicle and payment confirmation details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailGrid
                rows={[
                  ["Order", status.orderNumber],
                  ["Status", humanize(status.orderStatus)],
                  ["Vehicle", status.vehicleLabel],
                  ["SPD kit", status.kitName],
                  [
                    "Amount",
                    formatMoney(
                      status.payment.currency,
                      status.payment.totalAmountMinor,
                    ),
                  ],
                  [
                    "Payment",
                    status.payment.confirmed ? "Confirmed" : "Pending",
                  ],
                  ["Paid at", formatNullableDate(status.payment.confirmedAt)],
                  ["Ordered at", formatDate(status.orderCreatedAt)],
                ]}
              />
            </CardContent>
          </Card>

          {status.installationHistory.length === 0 ? null : (
            <Card className="rounded-2xl shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Installation attempts
                </CardTitle>
                <CardDescription>
                  Every submitted installation revision and review decision is
                  retained.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {status.installationHistory.map((attempt) => (
                    <li
                      key={attempt.evidenceId}
                      className="rounded-xl border border-border/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">
                          Attempt {attempt.revisionNo}
                        </span>
                        <Badge
                          variant={
                            attempt.review?.decision === "REJECTED"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {attempt.review === null
                            ? humanize(attempt.status)
                            : humanize(attempt.review.decision)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted {formatDate(attempt.submittedAt)}
                      </p>
                      {attempt.review === null ? null : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Reviewed {formatDate(attempt.review.reviewedAt)}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order timeline</CardTitle>
              <CardDescription>
                Latest 100 recorded warranty events, newest first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status.timeline.length === 0 ? (
                <ContentStatus
                  title="No activity recorded yet"
                  description="Order activity will appear here as the workflow progresses."
                />
              ) : (
                <ol className="ml-2 border-l border-border pl-5">
                  {status.timeline.map((event) => (
                    <li key={event.id} className="relative pb-5 last:pb-0">
                      <span
                        className="absolute -left-[1.45rem] top-1.5 size-2 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      <div className="text-sm font-medium">
                        {publicEventLabel(event.eventType)}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(event.occurredAt)}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ContentRoot>
  );
}

type StageCardProps = Readonly<{
  status: ExtendedWarrantyOrderStatus;
  recorderOpen: boolean;
  recorderState: RecorderState;
  recordingElapsedMs: number;
  uploadProgress: number;
  recorderError: string | null;
  previewStream: MediaStream | null;
  onOpenRecorder: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCloseRecorder: () => void;
  onRetryUpload: () => void;
  onRecordAgain: () => void;
  recordingExpired: boolean;
}>;

function CurrentStageCard(props: StageCardProps): React.ReactElement {
  const { status } = props;
  if (status.certificate.available) {
    return (
      <StageShell
        icon={<BadgeCheck aria-hidden="true" />}
        title="Warranty certificate issued"
        description="Your installation has been approved and the Extended Warranty certificate is ready."
      >
        <DetailGrid
          rows={[
            ["Certificate", status.certificate.certificateNumber ?? "Issued"],
          ]}
        />
        {status.certificate.downloadUrl === null ? null : (
          <Button className="mt-4 w-full" asChild>
            <a
              href={status.certificate.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="size-4" aria-hidden="true" /> Download
              certificate
            </a>
          </Button>
        )}
      </StageShell>
    );
  }
  if (status.approval.status === "APPROVED") {
    return (
      <StageShell
        icon={<CheckCircle2 aria-hidden="true" />}
        title="Installation approved"
        description="Approval is complete. Your Extended Warranty certificate is being generated."
      />
    );
  }
  if (
    status.approval.status === "PENDING" ||
    status.installation.status === "READY_FOR_REVIEW"
  ) {
    return (
      <StageShell
        icon={<Clock3 aria-hidden="true" />}
        title="Waiting for approval"
        description="Your installation video and location evidence are securely submitted and awaiting review."
      />
    );
  }
  if (
    status.installation.status === "SCANNING" ||
    status.installation.status === "UPLOADED"
  ) {
    return (
      <StageShell
        icon={<LoaderCircle className="animate-spin" aria-hidden="true" />}
        title="Submission received"
        description="Your live installation video is being security-scanned before manager review."
      />
    );
  }
  if (
    status.approval.status === "REJECTED" ||
    status.installation.status === "REJECTED" ||
    status.installation.status === "QUARANTINED"
  ) {
    return (
      <StageShell
        icon={<XCircle aria-hidden="true" />}
        title="A new installation video is required"
        description="The previous submission was not approved. Record a new live video; the previous attempt remains in the approval history."
      >
        <RecorderPanel {...props} />
      </StageShell>
    );
  }
  if (status.installation.canUpload) {
    return (
      <StageShell
        icon={<Camera aria-hidden="true" />}
        title="Record SPD kit installation"
        description="The kit is delivered. Record the installation live using the rear camera. Existing videos cannot be selected."
      >
        <RecorderPanel {...props} />
      </StageShell>
    );
  }
  if (
    status.shipment.shipmentNumber !== null ||
    status.orderStatus === "SHIPPED"
  ) {
    return (
      <StageShell
        icon={<Truck aria-hidden="true" />}
        title="Your kit is on the way"
        description="Shipment tracking will remain available until delivery is confirmed."
      >
        <DetailGrid
          rows={[
            ["Shipment", status.shipment.shipmentNumber ?? "Created"],
            ["Carrier", status.shipment.carrierName ?? "Pending"],
            ["Tracking", status.shipment.trackingNumber ?? "Pending"],
            ["Status", humanize(status.shipment.status ?? status.orderStatus)],
            [
              "Estimated delivery",
              formatNullableDate(status.shipment.estimatedDeliveryAt),
            ],
          ]}
        />
        {status.shipment.trackingUrl === null ? null : (
          <Button variant="outline" className="mt-4 w-full" asChild>
            <a
              href={status.shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" aria-hidden="true" /> Track
              shipment
            </a>
          </Button>
        )}
      </StageShell>
    );
  }
  if (status.packages.length > 0) {
    const pkg = status.packages[0];
    return (
      <StageShell
        icon={<PackageCheck aria-hidden="true" />}
        title="Kit packed"
        description="Your SPD kit package has been prepared for shipment."
      >
        <DetailGrid
          rows={[
            ["Package", pkg?.number ?? "Created"],
            ["Status", humanize(pkg?.status ?? "PACKED")],
            ["Updated", formatNullableDate(pkg?.updatedAt ?? null)],
          ]}
        />
      </StageShell>
    );
  }
  if (status.invoice.number !== null) {
    return (
      <StageShell
        icon={<ReceiptText aria-hidden="true" />}
        title="Invoice created"
        description="Your order is invoiced and moving to packaging."
      >
        <DetailGrid
          rows={[
            ["Invoice", status.invoice.number],
            ["Status", humanize(status.invoice.status ?? "INVOICED")],
            ["Updated", formatNullableDate(status.invoice.updatedAt)],
          ]}
        />
      </StageShell>
    );
  }
  if (status.salesOrder.number !== null) {
    return (
      <StageShell
        icon={<FileCheck2 aria-hidden="true" />}
        title="Sales order created"
        description="Your paid Extended Warranty order has been created in fulfillment."
      >
        <DetailGrid
          rows={[
            ["Sales order", status.salesOrder.number],
            ["Status", humanize(status.salesOrder.status ?? "CREATED")],
            ["Updated", formatNullableDate(status.salesOrder.updatedAt)],
          ]}
        />
      </StageShell>
    );
  }
  if (status.payment.confirmed) {
    return (
      <StageShell
        icon={<CheckCircle2 aria-hidden="true" />}
        title="Payment confirmed"
        description="Payment is complete. Your sales order is being created automatically."
      />
    );
  }
  return (
    <StageShell
      icon={<Clock3 aria-hidden="true" />}
      title="Order processing"
      description="Your Extended Warranty purchase is being prepared."
    />
  );
}

function StageShell({
  icon,
  title,
  description,
  children,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}>): React.ReactElement {
  return (
    <Card className="rounded-2xl border-primary/20 shadow-xs">
      <CardHeader className="pb-3">
        <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <CardTitle className="text-xl tracking-tight">{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      {children === undefined ? null : <CardContent>{children}</CardContent>}
    </Card>
  );
}

function RecorderPanel(props: StageCardProps): React.ReactElement {
  const busy = [
    "requesting",
    "recording",
    "preparing",
    "uploading",
    "finalizing",
  ].includes(props.recorderState);
  if (!props.recorderOpen) {
    return (
      <div>
        {props.recorderError === null ? null : (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {props.recorderError}
          </p>
        )}
        <Button
          type="button"
          size="lg"
          className="mt-1 min-h-12 w-full rounded-xl"
          onClick={props.onOpenRecorder}
        >
          <Video className="size-4" aria-hidden="true" /> Record live
          installation video
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border bg-black">
        {props.recorderState === "failed" ? (
          <p className="p-6 text-center text-sm text-white">
            {props.recordingExpired
              ? "Record a new video to continue."
              : "Your recording stays in this page until you retry or discard it."}
          </p>
        ) : (
          <RecorderPreview stream={props.previewStream} />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="size-4" aria-hidden="true" /> Live location
          captured automatically
        </span>
        <span className="font-mono tabular-nums">
          {formatDuration(props.recordingElapsedMs)} / 01:00
        </span>
      </div>
      {props.recorderState === "uploading" ? (
        <Progress value={props.uploadProgress} />
      ) : null}
      {props.recorderState === "preparing" ||
      props.recorderState === "finalizing" ? (
        <Progress value={null} />
      ) : null}
      {props.recorderError === null ? null : (
        <p className="text-sm text-destructive" role="alert">
          {props.recorderError}
        </p>
      )}
      {props.recorderState === "requesting" ? (
        <Button className="w-full" disabled>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />{" "}
          Requesting camera & location…
        </Button>
      ) : props.recorderState === "recording" ? (
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          onClick={props.onStopRecording}
        >
          <Square className="size-4" aria-hidden="true" /> Stop & upload now
        </Button>
      ) : props.recorderState === "failed" ? (
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={props.onRetryUpload}
            disabled={props.recordingExpired}
          >
            Retry upload
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={props.onRecordAgain}
          >
            Record again
          </Button>
        </div>
      ) : props.recorderState === "ready" ? (
        <Button
          type="button"
          className="w-full"
          onClick={props.onStartRecording}
        >
          <Camera className="size-4" aria-hidden="true" /> Start recording
        </Button>
      ) : (
        <Button className="w-full" disabled>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />{" "}
          {uploadStateLabel(props.recorderState, props.uploadProgress)}
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={busy}
        onClick={props.onCloseRecorder}
      >
        {props.recorderState === "failed" ? "Discard" : "Cancel"}
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">
        Camera capture stops automatically at 60 seconds. The video, current
        device location, and capture timestamps are uploaded together for
        approval. There is no gallery/file-picker option.
      </p>
    </div>
  );
}

function RecorderPreview({
  stream,
}: Readonly<{ stream: MediaStream | null }>): React.ReactElement {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (video === null) return;

    video.srcObject = stream;
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="aspect-video w-full object-cover"
      aria-label="Live rear camera preview"
    />
  );
}

function DetailGrid({
  rows,
}: Readonly<{
  rows: ReadonlyArray<readonly [string, string]>;
}>): React.ReactElement {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="min-w-0 rounded-xl border border-border/70 p-3"
        >
          <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-foreground">
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
    <ContentRoot width="narrow" className="min-h-dvh bg-muted/20 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md items-center">
        <ContentStatus
          title={title}
          description={description}
          icon={<ShieldCheck aria-hidden="true" />}
          {...(retry === undefined
            ? {}
            : {
                actions: (
                  <Button type="button" variant="outline" onClick={retry}>
                    <RefreshCw className="size-4" aria-hidden="true" /> Try
                    again
                  </Button>
                ),
              })}
          announce="polite"
        />
      </div>
    </ContentRoot>
  );
}

function assertLiveRecorderSupport(): void {
  if (
    !("mediaDevices" in navigator) ||
    typeof navigator.mediaDevices.getUserMedia !== "function" ||
    typeof MediaRecorder === "undefined"
  ) {
    throw new Error(
      "This browser does not support secure live video recording. Use an up-to-date mobile browser with camera access.",
    );
  }
  selectRecorderMimeType();
}

function selectRecorderMimeType(): string {
  const candidates = [
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const supported = candidates.find((candidate) =>
    MediaRecorder.isTypeSupported(candidate),
  );
  if (supported === undefined) {
    throw new Error(
      "This browser cannot record a supported MP4 or WebM installation video.",
    );
  }
  return supported;
}

async function requestInstallationLocation(): Promise<InstallationLocationEvidence> {
  if (!("geolocation" in navigator)) {
    throw new Error(
      "Location is unavailable in this browser. Enable location services and try again.",
    );
  }
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: GEOLOCATION_TIMEOUT_MS,
    });
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: Number.isFinite(position.coords.accuracy)
      ? position.coords.accuracy
      : null,
    capturedAt: new Date(position.timestamp).toISOString(),
    source: "BROWSER_GEOLOCATION",
  };
}

function toRecorderPermissionMessage(error: unknown): string {
  if (
    error instanceof DOMException &&
    ["NotAllowedError", "SecurityError"].includes(error.name)
  ) {
    return "Camera, microphone and location permission are required to record installation evidence. Allow access and try again.";
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 1
  ) {
    return "Location permission is required to record installation evidence. Allow location access and try again.";
  }
  if (error instanceof Error && error.message.trim().length > 0)
    return error.message;
  return "The camera or location could not be opened securely. Check device permissions and try again.";
}

function isAbortRequested(signal: AbortSignal): boolean {
  return signal.aborted;
}

function shouldPoll(status: ExtendedWarrantyOrderStatus): boolean {
  return (
    POLLED_ORDER_STATUSES.has(status.orderStatus) ||
    status.installation.status === "UPLOADED" ||
    status.installation.status === "SCANNING" ||
    status.installation.status === "READY_FOR_REVIEW"
  );
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
  return "The installation video could not be submitted safely. Record it again and retry.";
}

function uploadStateLabel(state: RecorderState, progress: number): string {
  if (state === "preparing") return "Preparing secure upload…";
  if (state === "uploading") return `Uploading… ${String(progress)}%`;
  if (state === "finalizing") return "Finalizing & security scanning…";
  return "Working…";
}

function publicEventLabel(eventType: string): string {
  const labels: Readonly<Record<string, string>> = {
    ORDER_PAYMENT_CONFIRMED: "Payment confirmed",
    ZOHO_SALES_ORDER_RECORDED: "Sales order created",
    FULFILLMENT_INVOICED: "Invoice created",
    FULFILLMENT_PACKED: "Package created",
    FULFILLMENT_SHIPPED: "Shipment created",
    FULFILLMENT_DELIVERED: "Shipment delivered",
    INSTALLATION_UPLOAD_INTENT_CREATED: "Installation recording prepared",
    INSTALLATION_EVIDENCE_SUBMITTED: "Installation video submitted",
    INSTALLATION_REVIEW_APPROVED: "Installation approved",
    INSTALLATION_REVIEW_REJECTED: "New installation video requested",
    CERTIFICATE_ISSUED: "Warranty certificate issued",
  };
  return labels[eventType] ?? humanize(eventType);
}

function humanize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function formatNullableDate(value: string | null): string {
  return value === null ? "Pending" : formatDate(value);
}

function formatMoney(currency: string, minor: string): string {
  const amount = Number(minor) / 100;
  if (!Number.isFinite(amount)) return `${currency} ${minor}`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDuration(valueMs: number): string {
  const totalSeconds = Math.min(60, Math.floor(valueMs / 1000));
  return `00:${String(totalSeconds).padStart(2, "0")}`;
}

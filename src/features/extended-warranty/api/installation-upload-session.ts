// oz-next-app/src/features/extended-warranty/api/installation-upload-session.ts
import {
  createExtendedWarrantyInstallationUpload,
  finalizeExtendedWarrantyInstallationUpload,
  sha256Blob,
  uploadInstallationVideoToSignedUrl,
  type InstallationLocationEvidence,
  type LiveInstallationRecordingMetadata,
} from "./order-status.client";
import { idempotencyKey } from "@/lib/security/request-identifiers";
import { isApiHttpError } from "@/lib/api/problem";
import {
  EXTENDED_WARRANTY_INSTALLATION_VIDEO_MAX_BYTES,
  type ExtendedWarrantyInstallationUploadIntent,
} from "../contracts/order-status.schema";

export type LiveRecording = Readonly<{
  blob: Blob;
  contentType: "video/mp4" | "video/webm";
  metadata: LiveInstallationRecordingMetadata;
}>;

export type InstallationUploadSession = {
  readonly recording: LiveRecording;
  readonly location: InstallationLocationEvidence;
  key: string;
  checksum: string | null;
  intent: ExtendedWarrantyInstallationUploadIntent | null;
  transferred: boolean;
  finalizationAttempted: boolean;
};

export function createInstallationUploadSession(
  recording: LiveRecording,
  location: InstallationLocationEvidence,
): InstallationUploadSession {
  return {
    recording,
    location: { ...location },
    key: idempotencyKey(),
    checksum: null,
    intent: null,
    transferred: false,
    finalizationAttempted: false,
  };
}

export class RecordingExpiredError extends Error {
  constructor() {
    super(
      "This recording's capture session has expired. Record a new installation video.",
    );
  }
}

const dependencies = {
  create: createExtendedWarrantyInstallationUpload,
  finalize: finalizeExtendedWarrantyInstallationUpload,
  transfer: uploadInstallationVideoToSignedUrl,
  checksum: sha256Blob,
  newKey: idempotencyKey,
  now: Date.now,
};

/** Retained only in the mounted page. The same bytes and capture evidence survive retries. */
export async function resumeInstallationUpload(
  session: InstallationUploadSession,
  input: Readonly<{
    token: string;
    signal: AbortSignal;
    onStage: (stage: "preparing" | "uploading" | "finalizing") => void;
    onProgress: (percent: number) => void;
  }>,
  deps: typeof dependencies = dependencies,
): Promise<void> {
  const { recording, location } = session;
  const checkAbort = (): void => {
    input.signal.throwIfAborted();
  };
  const checkFresh = (): void => {
    const now = deps.now();
    const capturedAt = Date.parse(location.capturedAt);
    const startedAt = Date.parse(recording.metadata.recordingStartedAt);
    if (
      !Number.isFinite(capturedAt) ||
      !Number.isFinite(startedAt) ||
      capturedAt < startedAt - 5 * 60_000 ||
      capturedAt > now + 5 * 60_000 ||
      startedAt > now + 5 * 60_000 ||
      Date.parse(location.capturedAt) < now - 15 * 60_000 ||
      Date.parse(recording.metadata.recordingStartedAt) < now - 2 * 60 * 60_000
    ) {
      throw new RecordingExpiredError();
    }
  };
  const finalize = async (): Promise<void> => {
    if (session.intent === null || session.checksum === null)
      throw new Error("Upload session is incomplete.");
    input.onStage("finalizing");
    session.finalizationAttempted = true;
    await deps.finalize({
      token: input.token,
      uploadId: session.intent.uploadId,
      checksumSha256: session.checksum,
      sizeBytes: recording.blob.size,
      recording: recording.metadata,
      location,
      signal: input.signal,
    });
    checkAbort();
  };
  checkAbort();
  // The finalize endpoint is authoritative and idempotent even after capture expiry.
  // A lost success response must not cause another transfer or evidence revision.
  if (session.finalizationAttempted) {
    try {
      await finalize();
      return;
    } catch (error) {
      checkAbort();
      if (
        !isApiHttpError(error) ||
        error.status !== 409 ||
        session.intent === null ||
        Date.parse(session.intent.expiresAt) > deps.now()
      )
        throw error;
      checkFresh();
      session.finalizationAttempted = false;
    }
  }
  checkFresh();
  if (
    recording.blob.size < 1 ||
    recording.blob.size > EXTENDED_WARRANTY_INSTALLATION_VIDEO_MAX_BYTES
  ) {
    throw new Error(
      "The recording is empty or exceeds the 20 MiB upload limit. Record again.",
    );
  }
  input.onStage("preparing");
  session.checksum ??= await deps.checksum(recording.blob);
  checkAbort();
  if (
    session.intent !== null &&
    Date.parse(session.intent.expiresAt) <= deps.now()
  ) {
    session.intent = null;
    session.transferred = false;
    session.key = deps.newKey();
  }
  if (session.intent === null) {
    session.intent = await deps.create({
      token: input.token,
      fileName: `spd-installation-${recording.metadata.recordingStartedAt.replaceAll(":", "-")}.${recording.contentType === "video/mp4" ? "mp4" : "webm"}`,
      contentType: recording.contentType,
      sizeBytes: recording.blob.size,
      checksumSha256: session.checksum,
      idempotencyKey: session.key,
      signal: input.signal,
    });
    checkAbort();
  }
  if (!session.transferred) {
    checkFresh();
    input.onStage("uploading");
    await deps.transfer({
      uploadUrl: session.intent.uploadUrl,
      video: recording.blob,
      requiredHeaders: session.intent.requiredHeaders,
      signal: input.signal,
      onProgress: input.onProgress,
    });
    checkAbort();
    session.transferred = true;
  }
  checkFresh();
  await finalize();
}

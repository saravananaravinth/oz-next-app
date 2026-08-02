"use client";

import {
  cancelDealerUploadAction,
  createDealerUploadIntentAction,
  finalizeDealerUploadAction,
  getDealerFileStatusAction,
} from "@/features/engagement/dealer-operations/actions/dealer-operations.actions";
import type {
  DealerFileStatus,
  DealerUploadIntentActionInput,
} from "@/features/engagement/dealer-operations/contracts/dealer-operations.schema";
import { putPresignedUpload } from "@/lib/api/browser-client";

const MAX_POLL_ATTEMPTS = 12;
const MAX_POLL_DELAY_MS = 6_000;

export type DealerUploadProgress =
  | Readonly<{ phase: "hashing"; message: string }>
  | Readonly<{ phase: "uploading"; message: string }>
  | Readonly<{ phase: "scanning"; message: string; status: DealerFileStatus }>
  | Readonly<{ phase: "ready"; message: string; status: DealerFileStatus }>;

export type DealerUploadTarget = Pick<
  DealerUploadIntentActionInput,
  "resourceKind" | "resourceId" | "purpose"
>;

export async function uploadDealerFile(
  file: File,
  target: DealerUploadTarget,
  onProgress: (progress: DealerUploadProgress) => void,
): Promise<DealerFileStatus> {
  onProgress({ phase: "hashing", message: "Verifying file integrity…" });
  const checksumSha256 = await sha256File(file);
  const intentResult = await createDealerUploadIntentAction({
    ...target,
    fileName: file.name,
    mimeType: normalizeMimeType(file.type),
    sizeBytes: file.size,
    checksumSha256,
  });

  if (!intentResult.ok) {
    throw new DealerUploadError(intentResult.message, intentResult.code);
  }

  const intent = intentResult.data;
  let finalized = false;

  try {
    onProgress({ phase: "uploading", message: "Uploading securely…" });
    const headers = new Headers();

    for (const [name, value] of Object.entries(intent.requiredHeaders)) {
      if (name.toLocaleLowerCase("en-US") === "content-length") {
        continue;
      }

      headers.set(name, value);
    }

    try {
      await putPresignedUpload(intent.uploadUrl, intent.method, headers, file);
    } catch {
      throw new DealerUploadError(
        "The storage upload failed. Retry the file upload.",
        "storage_upload_failed",
      );
    }

    const finalizeResult = await finalizeDealerUploadAction({
      uploadId: intent.uploadId,
      checksumSha256,
      sizeBytes: file.size,
    });

    if (!finalizeResult.ok) {
      throw new DealerUploadError(finalizeResult.message, finalizeResult.code);
    }

    finalized = true;
    return await resumeDealerFileScan(finalizeResult.data, onProgress);
  } catch (error: unknown) {
    // Once finalization succeeds, the object belongs to the scanner lifecycle and
    // must not be treated as a cancellable pending upload. Preserve its file ID so
    // the UI can resume status checks without creating duplicate storage objects.
    if (!finalized) {
      await cancelDealerUploadAction({ uploadId: intent.uploadId }).catch(
        () => undefined,
      );
    }

    throw error;
  }
}

export async function resumeDealerFileScan(
  initial: DealerFileStatus,
  onProgress: (progress: DealerUploadProgress) => void,
): Promise<DealerFileStatus> {
  let status = initial;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    if (status.scanStatus === "CLEAN") {
      onProgress({
        phase: "ready",
        message: "File is verified and ready.",
        status,
      });
      return status;
    }

    if (
      status.scanStatus === "INFECTED" ||
      status.scanStatus === "REJECTED" ||
      status.scanStatus === "ERROR"
    ) {
      throw new DealerUploadError(
        status.failureCode === null
          ? "The file did not pass the security scan."
          : `The file did not pass the security scan (${status.failureCode}).`,
        "file_scan_failed",
        status,
      );
    }

    onProgress({
      phase: "scanning",
      message: "Security scan in progress…",
      status,
    });
    await delay(Math.min(1_500 + attempt * 500, MAX_POLL_DELAY_MS));

    const result = await getDealerFileStatusAction({ fileId: status.fileId });

    if (!result.ok) {
      throw new DealerUploadError(result.message, result.code, status);
    }

    status = result.data;
  }

  throw new DealerUploadError(
    "The file scan is still processing. Retry the security-status check shortly.",
    "file_scan_pending",
    status,
  );
}

export async function sha256File(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );

  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

function normalizeMimeType(
  value: string,
): DealerUploadIntentActionInput["mimeType"] {
  const normalized = value.trim().toLocaleLowerCase("en-US");

  if (
    normalized === "application/pdf" ||
    normalized === "image/png" ||
    normalized === "image/jpeg" ||
    normalized === "image/webp" ||
    normalized ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalized === "audio/webm" ||
    normalized === "audio/mp4" ||
    normalized === "audio/ogg"
  ) {
    return normalized;
  }

  throw new DealerUploadError(
    "The selected file type is not supported.",
    "unsupported_file_type",
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export class DealerUploadError extends Error {
  public readonly code: string;
  public readonly fileStatus: DealerFileStatus | null;

  public constructor(
    message: string,
    code: string,
    fileStatus: DealerFileStatus | null = null,
  ) {
    super(message);
    this.name = "DealerUploadError";
    this.code = code;
    this.fileStatus = fileStatus;
  }
}

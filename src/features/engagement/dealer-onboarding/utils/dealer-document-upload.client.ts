// oz-next-app/src/features/engagement/dealer-onboarding/utils/dealer-document-upload.client.ts
"use client";

import {
  cancelDealerUploadAction,
  createDealerUploadIntentAction,
  finalizeDealerUploadAction,
  getDealerFileStatusAction,
} from "@/features/engagement/dealer-onboarding/actions/dealer-onboarding.actions";
import type { DealerFileStatus } from "@/features/engagement/dealer-onboarding/contracts/dealer-onboarding.schema";
import { putPresignedUpload } from "@/lib/api/browser-client";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_POLL_ATTEMPTS = 12;
const MAX_POLL_DELAY_MS = 6_000;
const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type DealerDocumentUploadProgress =
  | Readonly<{ phase: "hashing"; message: string }>
  | Readonly<{ phase: "uploading"; message: string }>
  | Readonly<{ phase: "scanning"; message: string; status: DealerFileStatus }>
  | Readonly<{ phase: "ready"; message: string; status: DealerFileStatus }>;

export class DealerDocumentUploadError extends Error {
  readonly code: string;
  readonly fileStatus: DealerFileStatus | null;

  constructor(
    message: string,
    code: string,
    fileStatus: DealerFileStatus | null = null,
  ) {
    super(message);
    this.name = "DealerDocumentUploadError";
    this.code = code;
    this.fileStatus = fileStatus;
  }
}

export async function uploadDealerDocumentFile(
  file: File,
  dealerOrgUnitId: string,
  onProgress: (progress: DealerDocumentUploadProgress) => void,
): Promise<DealerFileStatus> {
  validateFile(file);
  onProgress({ phase: "hashing", message: "Verifying file integrity…" });
  const checksumSha256 = await sha256File(file);
  const intentResult = await createDealerUploadIntentAction({
    dealerOrgUnitId,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    checksumSha256,
  });

  if (!intentResult.ok) {
    throw new DealerDocumentUploadError(
      intentResult.message,
      intentResult.code,
    );
  }

  const intent = intentResult.data;
  let uploaded = false;

  try {
    onProgress({ phase: "uploading", message: "Uploading securely…" });
    const headers = new Headers();
    for (const [name, value] of Object.entries(intent.requiredHeaders)) {
      if (name.toLocaleLowerCase("en-US") === "content-length") continue;
      headers.set(name, value);
    }

    await putPresignedUpload(intent.uploadUrl, intent.method, headers, file);
    uploaded = true;

    const finalize = await finalizeDealerUploadAction({
      uploadId: intent.uploadId,
      checksumSha256,
      sizeBytes: file.size,
    });
    if (!finalize.ok) {
      throw new DealerDocumentUploadError(finalize.message, finalize.code);
    }

    return await waitForCleanFile(finalize.data, onProgress);
  } catch (error: unknown) {
    if (!uploaded) {
      await cancelDealerUploadAction({ uploadId: intent.uploadId }).catch(
        () => undefined,
      );
    }
    throw error;
  }
}

export async function resumeDealerDocumentScan(
  file: DealerFileStatus,
  onProgress: (progress: DealerDocumentUploadProgress) => void,
): Promise<DealerFileStatus> {
  return await waitForCleanFile(file, onProgress);
}

async function waitForCleanFile(
  initial: DealerFileStatus,
  onProgress: (progress: DealerDocumentUploadProgress) => void,
): Promise<DealerFileStatus> {
  let status = initial;
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    if (status.scanStatus === "CLEAN") {
      onProgress({
        phase: "ready",
        message: "File verified and ready.",
        status,
      });
      return status;
    }
    if (
      status.scanStatus === "INFECTED" ||
      status.scanStatus === "REJECTED" ||
      status.scanStatus === "ERROR"
    ) {
      throw new DealerDocumentUploadError(
        "The file did not pass the security scan.",
        status.failureCode ?? "file_scan_failed",
        status,
      );
    }

    onProgress({
      phase: "scanning",
      message: "Security scan in progress…",
      status,
    });
    await delay(Math.min(1_000 * 2 ** Math.min(attempt, 3), MAX_POLL_DELAY_MS));
    const result = await getDealerFileStatusAction({ fileId: status.fileId });
    if (!result.ok) {
      throw new DealerDocumentUploadError(result.message, result.code, status);
    }
    status = result.data;
  }

  throw new DealerDocumentUploadError(
    "The security scan is still processing. Retry the status check shortly.",
    "file_scan_pending",
    status,
  );
}

function validateFile(file: File): void {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new DealerDocumentUploadError(
      "Choose a non-empty file no larger than 25 MB.",
      "file_size_invalid",
    );
  }
  if (!SUPPORTED_MIME_TYPES.has(file.type)) {
    throw new DealerDocumentUploadError(
      "Choose a PDF, PNG, JPEG, WebP, or DOCX document.",
      "file_type_invalid",
    );
  }
}

async function sha256File(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

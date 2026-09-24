// oz-next-app/src/features/extended-warranty/api/order-status.client.ts
"use client";

import { apiClient } from "@/lib/api/browser-client";
import {
  buildExtendedWarrantyInstallationFinalizePath,
  buildExtendedWarrantyInstallationUploadPath,
  buildExtendedWarrantyOrderStatusPath,
  extendedWarrantyInstallationFinalizeSchema,
  extendedWarrantyInstallationUploadIntentSchema,
  extendedWarrantyOrderStatusSchema,
  type ExtendedWarrantyInstallationFinalize,
  type ExtendedWarrantyInstallationUploadIntent,
  type ExtendedWarrantyOrderStatus,
} from "@/features/extended-warranty/contracts/order-status.schema";

export type InstallationLocationEvidence = Readonly<{
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  capturedAt: string;
  source: "BROWSER_GEOLOCATION";
}>;

export async function getExtendedWarrantyOrderStatus(
  token: string,
  signal?: AbortSignal,
): Promise<ExtendedWarrantyOrderStatus> {
  return await apiClient.get(
    buildExtendedWarrantyOrderStatusPath(token),
    extendedWarrantyOrderStatusSchema,
    { auth: false, ...(signal === undefined ? {} : { signal }) },
  );
}

export async function createExtendedWarrantyInstallationUpload(
  input: Readonly<{
    token: string;
    fileName: string;
    contentType: "video/mp4" | "video/webm";
    sizeBytes: number;
    checksumSha256: string;
    idempotencyKey: string;
    signal?: AbortSignal;
  }>,
): Promise<ExtendedWarrantyInstallationUploadIntent> {
  return await apiClient.post(
    buildExtendedWarrantyInstallationUploadPath(input.token),
    {
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
    },
    extendedWarrantyInstallationUploadIntentSchema,
    {
      auth: false,
      idempotencyKey: input.idempotencyKey,
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    },
  );
}

export async function finalizeExtendedWarrantyInstallationUpload(
  input: Readonly<{
    token: string;
    uploadId: string;
    checksumSha256: string;
    sizeBytes: number;
    recordedAt: string;
    location: InstallationLocationEvidence;
    signal?: AbortSignal;
  }>,
): Promise<ExtendedWarrantyInstallationFinalize> {
  return await apiClient.post(
    buildExtendedWarrantyInstallationFinalizePath(input.token, input.uploadId),
    {
      checksumSha256: input.checksumSha256,
      sizeBytes: input.sizeBytes,
      recordedAt: input.recordedAt,
      location: input.location,
    },
    extendedWarrantyInstallationFinalizeSchema,
    {
      auth: false,
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    },
  );
}

export async function sha256File(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function uploadInstallationVideoToSignedUrl(
  input: Readonly<{
    uploadUrl: string;
    file: File;
    requiredHeaders: Readonly<Record<string, string>>;
    onProgress: (percent: number) => void;
    signal?: AbortSignal;
  }>,
): Promise<void> {
  const target = new URL(input.uploadUrl);
  if (target.protocol !== "https:" && target.hostname !== "localhost") {
    throw new Error("The secure upload destination is invalid.");
  }

  if (input.signal?.aborted === true) {
    throw new DOMException("Upload aborted.", "AbortError");
  }

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    const cleanup = (): void => {
      input.signal?.removeEventListener("abort", handleSignalAbort);
    };
    const resolveUpload = (): void => {
      cleanup();
      resolve();
    };
    const rejectUpload = (error: Error | DOMException): void => {
      cleanup();
      reject(error);
    };
    const handleSignalAbort = (): void => {
      request.abort();
      rejectUpload(new DOMException("Upload aborted.", "AbortError"));
    };

    request.open("PUT", target.toString(), true);
    request.withCredentials = false;
    request.timeout = 120_000;

    for (const [name, value] of Object.entries(input.requiredHeaders)) {
      request.setRequestHeader(name, value);
    }

    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      input.onProgress(
        Math.min(100, Math.round((event.loaded / event.total) * 100)),
      );
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        input.onProgress(100);
        resolveUpload();
        return;
      }
      rejectUpload(
        new Error(
          "The installation video upload was rejected by secure storage.",
        ),
      );
    });
    request.addEventListener("error", () => {
      rejectUpload(new Error("The installation video upload failed."));
    });
    request.addEventListener("timeout", () => {
      rejectUpload(new Error("The installation video upload timed out."));
    });
    request.addEventListener("abort", () => {
      rejectUpload(new DOMException("Upload aborted.", "AbortError"));
    });
    input.signal?.addEventListener("abort", handleSignalAbort, { once: true });

    if (input.signal?.aborted === true) {
      handleSignalAbort();
      return;
    }

    request.send(input.file);
  });
}

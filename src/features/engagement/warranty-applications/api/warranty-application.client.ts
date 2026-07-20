// oz-next-app/src/features/engagement/warranty-applications/api/warranty-application.client.ts
"use client";

import { apiClient, buildEdgeUrl } from "@/lib/api/browser-client";
import { CT, HDR, HTTP_METHODS } from "@/lib/api/http-contract";
import { correlationId, requestId } from "@/lib/security/request-identifiers";

import {
  buildPublicWarrantyApplicationFileUploadPath,
  buildPublicWarrantyApplicationSubmitPath,
  warrantyApplicationFilePurposeSchema,
  warrantyApplicationProblemEnvelopeSchema,
  warrantyApplicationSubmitRequestSchema,
  warrantyApplicationSubmitResponseSchema,
  warrantyApplicationUploadFileEnvelopeSchema,
  type WarrantyApplicationFilePurpose,
  type WarrantyApplicationSubmitRequest,
  type WarrantyApplicationSubmitResponse,
  type WarrantyApplicationUploadedFile,
} from "@/features/engagement/warranty-applications/contracts/warranty-application.schema";

const UPLOAD_TIMEOUT_MS = 60_000;

const UPLOAD_MIME_TYPE_BY_EXTENSION = new Map<string, string>([
  ["pdf", "application/pdf"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);

export type SubmitPublicWarrantyApplicationInput = Readonly<{
  token: string;
  application: WarrantyApplicationSubmitRequest;
  idempotencyKey: string;
  signal?: AbortSignal;
}>;

export type UploadPublicWarrantyApplicationFileInput = Readonly<{
  token: string;
  purpose: WarrantyApplicationFilePurpose;
  file: File;
  idempotencyKey: string;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}>;

export class PublicWarrantyUploadError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | undefined;

  constructor(
    input: Readonly<{
      status: number;
      code: string;
      message: string;
      requestId?: string;
    }>,
  ) {
    super(input.message);
    this.name = "PublicWarrantyUploadError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
  }
}

export function isPublicWarrantyUploadError(
  error: unknown,
): error is PublicWarrantyUploadError {
  return error instanceof PublicWarrantyUploadError;
}

export async function submitPublicWarrantyApplication(
  input: SubmitPublicWarrantyApplicationInput,
): Promise<WarrantyApplicationSubmitResponse> {
  const body = warrantyApplicationSubmitRequestSchema.parse(input.application);

  return await apiClient.request(
    buildPublicWarrantyApplicationSubmitPath(input.token),
    {
      method: HTTP_METHODS.POST,
      auth: false,
      retry: 0,
      retryOnUnauthorized: false,
      timeoutMs: 20_000,
      idempotencyKey: input.idempotencyKey,
      body,
      schema: warrantyApplicationSubmitResponseSchema,
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    },
  );
}

function fileExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const separatorIndex = normalized.lastIndexOf(".");

  return separatorIndex >= 0 && separatorIndex < normalized.length - 1
    ? normalized.slice(separatorIndex + 1)
    : "";
}

function fileForUpload(file: File): File {
  if (file.type.trim().length > 0) {
    return file;
  }

  const inferredMimeType = UPLOAD_MIME_TYPE_BY_EXTENSION.get(
    fileExtension(file.name),
  );

  if (inferredMimeType === undefined) {
    return file;
  }

  return new File([file], file.name, {
    type: inferredMimeType,
    lastModified: file.lastModified,
  });
}

function readJsonPayload(text: string): unknown {
  if (text.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function toUploadError(
  status: number,
  payload: unknown,
): PublicWarrantyUploadError {
  const parsed = warrantyApplicationProblemEnvelopeSchema.safeParse(payload);

  if (!parsed.success) {
    return new PublicWarrantyUploadError({
      status,
      code: "WARRANTY_UPLOAD_FAILED",
      message: "The invoice file could not be uploaded.",
    });
  }

  return new PublicWarrantyUploadError({
    status,
    code: String(parsed.data.code),
    message:
      parsed.data.detail.length > 0 ? parsed.data.detail : parsed.data.title,
    requestId: parsed.data.request_id,
  });
}

export function uploadPublicWarrantyApplicationFile(
  input: UploadPublicWarrantyApplicationFileInput,
): Promise<WarrantyApplicationUploadedFile> {
  const purpose = warrantyApplicationFilePurposeSchema.parse(input.purpose);

  return new Promise<WarrantyApplicationUploadedFile>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    let completed = false;

    const cleanup = (): void => {
      completed = true;
      input.signal?.removeEventListener("abort", abortUpload);
    };

    const fail = (error: Error): void => {
      if (completed) {
        return;
      }

      cleanup();
      reject(error);
    };

    const abortUpload = (): void => {
      xhr.abort();
    };

    if (input.signal?.aborted === true) {
      reject(
        new PublicWarrantyUploadError({
          status: 0,
          code: "WARRANTY_UPLOAD_ABORTED",
          message: "Invoice upload was cancelled.",
        }),
      );
      return;
    }

    input.signal?.addEventListener("abort", abortUpload, { once: true });

    const uploadFile = fileForUpload(input.file);

    formData.set("purpose", purpose);
    formData.set("file", uploadFile, uploadFile.name);

    xhr.open(
      "POST",
      buildEdgeUrl(buildPublicWarrantyApplicationFileUploadPath(input.token)),
      true,
    );
    xhr.responseType = "text";
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.withCredentials = false;

    xhr.setRequestHeader(HDR.ACCEPT, CT.JSON);
    xhr.setRequestHeader(HDR.REQUEST_ID, requestId("web"));
    xhr.setRequestHeader(HDR.CORRELATION_ID, correlationId("corr"));
    xhr.setRequestHeader(HDR.IDEMPOTENCY_KEY, input.idempotencyKey);

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }

      const progress = Math.round((event.loaded / event.total) * 100);
      input.onProgress?.(Math.min(99, Math.max(1, progress)));
    });

    xhr.addEventListener("load", () => {
      if (completed) {
        return;
      }

      const payload = readJsonPayload(xhr.responseText);

      if (xhr.status < 200 || xhr.status >= 300) {
        fail(toUploadError(xhr.status, payload));
        return;
      }

      const parsed =
        warrantyApplicationUploadFileEnvelopeSchema.safeParse(payload);

      if (!parsed.success) {
        fail(
          new PublicWarrantyUploadError({
            status: xhr.status,
            code: "WARRANTY_UPLOAD_RESPONSE_INVALID",
            message: "The invoice upload response could not be validated.",
          }),
        );
        return;
      }

      input.onProgress?.(100);
      cleanup();
      resolve(parsed.data.data);
    });

    xhr.addEventListener("error", () => {
      fail(
        new PublicWarrantyUploadError({
          status: 0,
          code: "WARRANTY_UPLOAD_NETWORK_ERROR",
          message: "Network failed while uploading the invoice file.",
        }),
      );
    });

    xhr.addEventListener("timeout", () => {
      fail(
        new PublicWarrantyUploadError({
          status: 0,
          code: "WARRANTY_UPLOAD_TIMEOUT",
          message:
            "Invoice upload timed out. Retry with a stronger network connection.",
        }),
      );
    });

    xhr.addEventListener("abort", () => {
      fail(
        new PublicWarrantyUploadError({
          status: 0,
          code: "WARRANTY_UPLOAD_ABORTED",
          message: "Invoice upload was cancelled.",
        }),
      );
    });

    xhr.send(formData);
  });
}

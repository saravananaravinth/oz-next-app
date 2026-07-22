// oz-next-app/src/features/engagement/warranty-applications/api/warranty-application.client.ts
"use client";

import { z } from "zod";

import { apiClient, buildEdgeUrl } from "@/lib/api/browser-client";
import { CT, HDR, HTTP_METHODS } from "@/lib/api/http-contract";
import { correlationId, requestId } from "@/lib/security/request-identifiers";

import {
  WARRANTY_APPLICATION_ALLOWED_UPLOAD_EXTENSIONS,
  WARRANTY_APPLICATION_ALLOWED_UPLOAD_MIME_TYPES,
  WARRANTY_APPLICATION_UPLOAD_MAX_BYTES,
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
const MAX_UPLOAD_RESPONSE_BYTES = 128 * 1024;
const MAX_RETRY_AFTER_SECONDS = 86_400;

const UPLOAD_MIME_TYPE_BY_EXTENSION = new Map<string, string>([
  ["pdf", "application/pdf"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);

const ACCEPTED_UPLOAD_MIME_TYPES = new Set<string>(
  WARRANTY_APPLICATION_ALLOWED_UPLOAD_MIME_TYPES,
);
const ACCEPTED_UPLOAD_EXTENSIONS = new Set<string>(
  WARRANTY_APPLICATION_ALLOWED_UPLOAD_EXTENSIONS,
);

const uploadIdempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9:_./@-]+$/u);

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
  readonly retryAfterSeconds: number | undefined;

  constructor(
    input: Readonly<{
      status: number;
      code: string;
      message: string;
      requestId?: string;
      retryAfterSeconds?: number;
    }>,
  ) {
    super(input.message);
    this.name = "PublicWarrantyUploadError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.retryAfterSeconds = input.retryAfterSeconds;
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

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function readJsonPayload(text: string): unknown {
  if (
    text.trim().length === 0 ||
    byteLength(text) > MAX_UPLOAD_RESPONSE_BYTES
  ) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function parseRetryAfterSeconds(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const normalized = value.trim();

  if (/^\d+$/u.test(normalized)) {
    const seconds = Number(normalized);

    return Number.isInteger(seconds) &&
      seconds >= 0 &&
      seconds <= MAX_RETRY_AFTER_SECONDS
      ? seconds
      : undefined;
  }

  const retryDate = Date.parse(normalized);

  if (!Number.isFinite(retryDate)) {
    return undefined;
  }

  const seconds = Math.max(0, Math.ceil((retryDate - Date.now()) / 1_000));

  return seconds <= MAX_RETRY_AFTER_SECONDS ? seconds : undefined;
}

function toUploadError(
  status: number,
  payload: unknown,
  retryAfterSeconds: number | undefined,
): PublicWarrantyUploadError {
  const parsed = warrantyApplicationProblemEnvelopeSchema.safeParse(payload);

  if (!parsed.success) {
    return new PublicWarrantyUploadError({
      status,
      code: "WARRANTY_UPLOAD_FAILED",
      message: "The invoice file could not be uploaded.",
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    });
  }

  return new PublicWarrantyUploadError({
    status,
    code: String(parsed.data.code),
    message:
      parsed.data.detail.length > 0 ? parsed.data.detail : parsed.data.title,
    requestId: parsed.data.request_id,
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  });
}

function validateUploadFile(file: File): PublicWarrantyUploadError | null {
  const extension = fileExtension(file.name);

  if (!ACCEPTED_UPLOAD_EXTENSIONS.has(extension)) {
    return new PublicWarrantyUploadError({
      status: 415,
      code: "WARRANTY_UPLOAD_EXTENSION_UNSUPPORTED",
      message: "Upload a PDF, JPG, JPEG, PNG, or WEBP invoice file.",
    });
  }

  if (
    file.type.trim().length > 0 &&
    !ACCEPTED_UPLOAD_MIME_TYPES.has(file.type.trim().toLowerCase())
  ) {
    return new PublicWarrantyUploadError({
      status: 415,
      code: "WARRANTY_UPLOAD_MEDIA_TYPE_UNSUPPORTED",
      message: "The selected invoice media type is not supported.",
    });
  }

  if (file.size <= 0) {
    return new PublicWarrantyUploadError({
      status: 422,
      code: "WARRANTY_UPLOAD_FILE_EMPTY",
      message: "The selected invoice file is empty.",
    });
  }

  if (file.size > WARRANTY_APPLICATION_UPLOAD_MAX_BYTES) {
    return new PublicWarrantyUploadError({
      status: 413,
      code: "WARRANTY_UPLOAD_FILE_TOO_LARGE",
      message: "The selected invoice file exceeds the allowed size.",
    });
  }

  return null;
}

export function uploadPublicWarrantyApplicationFile(
  input: UploadPublicWarrantyApplicationFileInput,
): Promise<WarrantyApplicationUploadedFile> {
  const purpose = warrantyApplicationFilePurposeSchema.parse(input.purpose);
  const idempotencyKey = uploadIdempotencyKeySchema.parse(input.idempotencyKey);
  const uploadFile = fileForUpload(input.file);
  const validationError = validateUploadFile(uploadFile);

  if (validationError !== null) {
    return Promise.reject(validationError);
  }

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
    xhr.setRequestHeader(HDR.IDEMPOTENCY_KEY, idempotencyKey);

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

      const retryAfterSeconds = parseRetryAfterSeconds(
        xhr.getResponseHeader(HDR.RETRY_AFTER),
      );
      const payload = readJsonPayload(xhr.responseText);

      if (xhr.status < 200 || xhr.status >= 300) {
        fail(toUploadError(xhr.status, payload, retryAfterSeconds));
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

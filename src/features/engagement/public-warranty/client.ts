// oz-next-app/src/features/engagement/public-warranty/client.ts
"use client";

import { apiClient, buildEdgeUrl } from "@/lib/api/client";
import { CT, HDR, HTTP_METHODS } from "@/lib/constants";
import { correlationId, requestId } from "@/lib/uuid";

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
} from "./schemas";

const UPLOAD_TIMEOUT_MS = 60_000;

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
    code: parsed.data.code ?? "WARRANTY_UPLOAD_FAILED",
    message:
      parsed.data.detail ??
      parsed.data.title ??
      "The invoice file could not be uploaded.",
    ...(parsed.data.request_id === undefined
      ? {}
      : { requestId: parsed.data.request_id }),
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

    formData.set("purpose", purpose);
    formData.set("file", input.file, input.file.name);

    xhr.open(
      "POST",
      buildEdgeUrl(buildPublicWarrantyApplicationFileUploadPath(input.token)),
      true,
    );
    xhr.responseType = "text";
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    xhr.setRequestHeader(HDR.ACCEPT, CT.JSON);
    xhr.setRequestHeader(HDR.REQUEST_ID, requestId("web"));
    xhr.setRequestHeader(HDR.CORRELATION_ID, correlationId("corr"));
    xhr.setRequestHeader(HDR.IDEMPOTENCY_KEY, input.idempotencyKey);

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }

      input.onProgress?.(
        Math.min(
          99,
          Math.max(1, Math.round((event.loaded / event.total) * 100)),
        ),
      );
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
            "Invoice upload timed out. Please retry with a smaller file or stronger network.",
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

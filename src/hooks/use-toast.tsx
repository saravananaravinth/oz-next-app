// oz-next-app/src/hooks/use-toast.tsx
"use client";

import type { ReactNode } from "react";
import { Info, LoaderCircle } from "lucide-react";
import {
  toast as sonnerToast,
  type Action,
  type ExternalToast,
  type ToastT,
} from "sonner";

import { VIEWPORT_BREAKPOINTS } from "@/hooks/use-mobile";

export type ToastId = string | number;

export type SonnerPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type ToastType =
  "success" | "info" | "warning" | "banner" | "error" | "loading" | "default";

export type ToastOptions = Readonly<{
  title: string;
  description?: string;
  duration?: number;
  replace?: boolean;
  id?: ToastId;
  icon?: ReactNode;
  action?: Action;
  cancel?: Action;
  position?: SonnerPosition;
  dismissible?: boolean;
  closeButton?: boolean;
  onDismiss?: (toastItem: ToastT) => void;
  onAutoClose?: (toastItem: ToastT) => void;
}>;

export type ToastMessageOptions = Readonly<
  Omit<ToastOptions, "title"> & { type?: ToastType }
>;

export type BannerOptions = Readonly<
  ToastOptions & { type?: Exclude<ToastType, "loading"> }
>;

export type ProblemToastOptions = Readonly<
  Omit<ToastOptions, "title" | "description"> & {
    title?: string;
    description?: string;
    fallbackTitle?: string;
    fallbackDescription?: string;
  }
>;

export type ToastApi = Readonly<{
  success: (options: ToastOptions) => ToastId;
  info: (options: ToastOptions) => ToastId;
  warning: (options: ToastOptions) => ToastId;
  banner: (options: BannerOptions) => ToastId;
  error: (options: ToastOptions) => ToastId;
  loading: (options: ToastOptions) => ToastId;
  message: (title: string, options?: ToastMessageOptions) => ToastId;
  problem: (error: unknown, options?: ProblemToastOptions) => ToastId;
  promise: <TValue>(
    task: Promise<TValue> | (() => Promise<TValue>),
    messages: Readonly<{
      loading: string;
      success: string | ((data: TValue) => string);
      error: string | ((error: Error) => string);
    }>,
    options?: Omit<ToastMessageOptions, "type">,
  ) => Promise<ToastId>;
  dismiss: (id?: ToastId) => void;
  dismissAll: () => void;
}>;

type ToastOptionsInput = Omit<ToastOptions, "title">;
type UnknownRecord = Readonly<Record<string, unknown>>;

const MAX_LOADING_MS = 45_000;
const MIN_TOAST_MS = 1_000;
const MAX_TOAST_TITLE_LENGTH = 160;
const MAX_TOAST_DESCRIPTION_LENGTH = 360;
const MAX_REFERENCE_LENGTH = 128;
const DEFAULT_TOAST_TITLE = "Notification";
const SAFE_PROMISE_ERROR_MESSAGE = "The operation could not be completed.";
const DEFAULT_PROBLEM_TITLE = "Request failed";
const DEFAULT_PROBLEM_DESCRIPTION =
  "The request could not be completed. Please try again.";

const DELETE_CODE_POINT = 0x7f;
const C0_CONTROL_MAX_CODE_POINT = 0x1f;
const CONTROL_CHARACTER_REPLACEMENT = " ";

const DURATION_BY_TYPE = {
  success: 2_200,
  info: 2_400,
  warning: 3_000,
  banner: 3_000,
  error: 4_000,
  loading: MAX_LOADING_MS,
  default: 2_400,
} as const satisfies Record<ToastType, number>;

const MOBILE_QUERY = `(max-width: ${String(VIEWPORT_BREAKPOINTS.mobileMax)}px)`;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const WHITESPACE_PATTERN = /\s+/gu;
const SAFE_ERROR_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/u;
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9_.:/@-]+$/u;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const JWT_PATTERN =
  /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gu;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/giu;
const LONG_NUMBER_PATTERN = /\b\d{7,}\b/gu;
const SENSITIVE_QUERY_PATTERN =
  /([?&](?:access_token|refresh_token|id_token|token|jwt|otp|code|password|email|phone|mobile|signature|secret)=)[^&#\s]+/giu;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function replaceControlCharacters(value: string): string {
  let sanitized = "";
  let hasReplacement = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index] ?? "";
    const codePoint = value.charCodeAt(index);

    if (
      codePoint <= C0_CONTROL_MAX_CODE_POINT ||
      codePoint === DELETE_CODE_POINT
    ) {
      sanitized += CONTROL_CHARACTER_REPLACEMENT;
      hasReplacement = true;
      continue;
    }

    sanitized += char;
  }

  return hasReplacement ? sanitized : value;
}

function canUseMatchMedia(): boolean {
  return (
    typeof window !== "undefined" && typeof window.matchMedia === "function"
  );
}

function prefersReducedMotion(): boolean {
  if (!canUseMatchMedia()) {
    return false;
  }

  try {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
}

function clampDuration(ms: number): number {
  if (!Number.isFinite(ms)) {
    return MAX_LOADING_MS;
  }

  const bounded = Math.min(
    MAX_LOADING_MS,
    Math.max(MIN_TOAST_MS, Math.floor(ms)),
  );

  return prefersReducedMotion()
    ? Math.max(1_500, Math.floor(bounded * 0.8))
    : bounded;
}

function isMobileViewport(): boolean {
  if (!canUseMatchMedia()) {
    return false;
  }

  try {
    return window.matchMedia(MOBILE_QUERY).matches;
  } catch {
    return false;
  }
}

function getToastPosition(): SonnerPosition {
  return isMobileViewport() ? "bottom-center" : "top-right";
}

function getDefaultDuration(type: ToastType): number {
  return DURATION_BY_TYPE[type];
}

function redactSensitiveText(value: string): string {
  return value
    .replace(BEARER_PATTERN, "Bearer [REDACTED]")
    .replace(JWT_PATTERN, "[REDACTED_JWT]")
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
    .replace(SENSITIVE_QUERY_PATTERN, "$1[REDACTED]")
    .replace(LONG_NUMBER_PATTERN, "[REDACTED_NUMBER]");
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizeText(value: string, maxLength: number): string {
  const normalized = replaceControlCharacters(redactSensitiveText(value))
    .replace(WHITESPACE_PATTERN, " ")
    .trim();

  return truncateText(normalized, maxLength);
}

function normalizeTitle(value: string): string {
  const normalized = normalizeText(value, MAX_TOAST_TITLE_LENGTH);

  return normalized.length > 0 ? normalized : DEFAULT_TOAST_TITLE;
}

function normalizeDescription(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizeText(value, MAX_TOAST_DESCRIPTION_LENGTH);

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeReference(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const normalized = String(value).trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_REFERENCE_LENGTH ||
    !SAFE_REFERENCE_PATTERN.test(normalized)
  ) {
    return undefined;
  }

  return normalized;
}

function readStringField(
  record: UnknownRecord | null,
  key: string,
): string | undefined {
  if (record === null) {
    return undefined;
  }

  const value = record[key];

  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : undefined;
}

function readStatusField(
  record: UnknownRecord | null,
  key: string,
): number | null {
  if (record === null) {
    return null;
  }

  const value = record[key];

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  return value >= 100 && value <= 599 ? value : null;
}

function readRetryAfterSeconds(record: UnknownRecord | null): number | null {
  if (record === null) {
    return null;
  }

  const retryAfter = record["retryAfter"] ?? record["retry_after"];

  if (typeof retryAfter !== "number" || !Number.isInteger(retryAfter)) {
    return null;
  }

  return retryAfter >= 0 && retryAfter <= 86_400 ? retryAfter : null;
}

function readProblemRecord(error: unknown): UnknownRecord | null {
  if (!isRecord(error)) {
    return null;
  }

  const problem = error["problem"];

  return isRecord(problem) ? problem : null;
}

function titleForStatus(status: number | null): string {
  if (status === 401) return "Sign in required";
  if (status === 403) return "Access denied";
  if (status === 404) return "Resource not found";
  if (status === 409) return "Conflict detected";
  if (status === 413) return "Payload too large";
  if (status === 415) return "Unsupported content";
  if (status === 422) return "Validation failed";
  if (status === 429) return "Too many requests";
  if (status !== null && status >= 500) return "Service unavailable";

  return DEFAULT_PROBLEM_TITLE;
}

function descriptionForStatus(status: number | null): string {
  if (status === 401)
    return "Your session is missing or expired. Sign in again to continue.";
  if (status === 403)
    return "You do not have permission to perform this action.";
  if (status === 404) return "The requested resource could not be found.";
  if (status === 409)
    return "The resource changed or is in a state that cannot accept this request.";
  if (status === 413)
    return "The request payload is larger than the allowed limit.";
  if (status === 415) return "The request content type is not supported.";
  if (status === 422)
    return "Some fields are invalid. Review the form and try again.";
  if (status === 429)
    return "Too many requests were sent. Wait before trying again.";
  if (status !== null && status >= 500)
    return "The ERP service is temporarily unavailable. Try again shortly.";

  return DEFAULT_PROBLEM_DESCRIPTION;
}

function buildReferenceDescription(
  description: string,
  requestId: string | undefined,
): string {
  if (requestId === undefined) {
    return description;
  }

  return `${description} Reference ID: ${requestId}`;
}

function buildRetryDescription(
  description: string,
  retryAfterSeconds: number | null,
): string {
  if (retryAfterSeconds === null || retryAfterSeconds <= 0) {
    return description;
  }

  return `${description} Retry after ${String(retryAfterSeconds)} seconds.`;
}

function getLoadingIcon(): ReactNode {
  return (
    <LoaderCircle
      aria-hidden="true"
      className="size-5 animate-spin motion-reduce:animate-none"
    />
  );
}

function getBannerIcon(): ReactNode {
  return <Info aria-hidden="true" className="size-5" />;
}

function buildToastOptions(
  title: string,
  input: ToastOptionsInput | undefined,
  defaultDuration: number,
): ToastOptions {
  const description = normalizeDescription(input?.description);

  return {
    title: normalizeTitle(title),
    duration: clampDuration(input?.duration ?? defaultDuration),
    ...(description !== undefined ? { description } : {}),
    ...(input?.replace !== undefined ? { replace: input.replace } : {}),
    ...(input?.id !== undefined ? { id: input.id } : {}),
    ...(input?.icon !== undefined ? { icon: input.icon } : {}),
    ...(input?.action !== undefined ? { action: input.action } : {}),
    ...(input?.cancel !== undefined ? { cancel: input.cancel } : {}),
    ...(input?.position !== undefined ? { position: input.position } : {}),
    ...(input?.dismissible !== undefined
      ? { dismissible: input.dismissible }
      : {}),
    ...(input?.closeButton !== undefined
      ? { closeButton: input.closeButton }
      : {}),
    ...(input?.onDismiss !== undefined ? { onDismiss: input.onDismiss } : {}),
    ...(input?.onAutoClose !== undefined
      ? { onAutoClose: input.onAutoClose }
      : {}),
  };
}

function toExternalToast(options: ToastOptions): ExternalToast {
  return {
    ...(options.duration !== undefined ? { duration: options.duration } : {}),
    position: options.position ?? getToastPosition(),
    ...(options.description !== undefined
      ? { description: options.description }
      : {}),
    ...(options.icon !== undefined ? { icon: options.icon } : {}),
    ...(options.id !== undefined ? { id: options.id } : {}),
    ...(options.action !== undefined ? { action: options.action } : {}),
    ...(options.cancel !== undefined ? { cancel: options.cancel } : {}),
    ...(options.dismissible !== undefined
      ? { dismissible: options.dismissible }
      : {}),
    ...(options.closeButton !== undefined
      ? { closeButton: options.closeButton }
      : {}),
    ...(options.onDismiss !== undefined
      ? { onDismiss: options.onDismiss }
      : {}),
    ...(options.onAutoClose !== undefined
      ? { onAutoClose: options.onAutoClose }
      : {}),
  };
}

function showToast(type: ToastType, options: ToastOptions): ToastId {
  const external = toExternalToast(options);

  switch (type) {
    case "success":
      return sonnerToast.success(options.title, external);
    case "info":
      return sonnerToast.info(options.title, external);
    case "warning":
      return sonnerToast.warning(options.title, external);
    case "banner":
      return sonnerToast.info(options.title, {
        ...external,
        icon: options.icon === undefined ? getBannerIcon() : options.icon,
      });
    case "error":
      return sonnerToast.error(options.title, external);
    case "loading":
      return sonnerToast.loading(options.title, {
        ...external,
        icon: options.icon === undefined ? getLoadingIcon() : options.icon,
      });
    case "default":
      return sonnerToast.message(options.title, external);
  }
}

function dismissExistingIfRequested(replace: boolean | undefined): void {
  if (replace === true) {
    sonnerToast.dismiss();
  }
}

function safePromiseError(unknownError: unknown): Error {
  const safeError = new Error(SAFE_PROMISE_ERROR_MESSAGE);

  if (
    unknownError instanceof Error &&
    SAFE_ERROR_NAME_PATTERN.test(unknownError.name)
  ) {
    safeError.name = unknownError.name;
  }

  return safeError;
}

function pickProblemToastOptions(
  options: ProblemToastOptions | undefined,
): ToastOptionsInput {
  if (options === undefined) {
    return {};
  }

  return {
    ...(options.duration !== undefined ? { duration: options.duration } : {}),
    ...(options.replace !== undefined ? { replace: options.replace } : {}),
    ...(options.id !== undefined ? { id: options.id } : {}),
    ...(options.icon !== undefined ? { icon: options.icon } : {}),
    ...(options.action !== undefined ? { action: options.action } : {}),
    ...(options.cancel !== undefined ? { cancel: options.cancel } : {}),
    ...(options.position !== undefined ? { position: options.position } : {}),
    ...(options.dismissible !== undefined
      ? { dismissible: options.dismissible }
      : {}),
    ...(options.closeButton !== undefined
      ? { closeButton: options.closeButton }
      : {}),
    ...(options.onDismiss !== undefined
      ? { onDismiss: options.onDismiss }
      : {}),
    ...(options.onAutoClose !== undefined
      ? { onAutoClose: options.onAutoClose }
      : {}),
  };
}

function buildProblemToastOptions(
  error: unknown,
  options: ProblemToastOptions | undefined,
): ToastOptions {
  const errorRecord = isRecord(error) ? error : null;
  const problemRecord = readProblemRecord(error);
  const status =
    readStatusField(errorRecord, "status") ??
    readStatusField(problemRecord, "status");

  const title =
    options?.title ??
    readStringField(problemRecord, "title") ??
    readStringField(errorRecord, "title") ??
    options?.fallbackTitle ??
    titleForStatus(status);

  const requestId =
    normalizeReference(readStringField(errorRecord, "requestId")) ??
    normalizeReference(readStringField(errorRecord, "request_id")) ??
    normalizeReference(readStringField(problemRecord, "request_id"));

  const retryAfterSeconds =
    readRetryAfterSeconds(errorRecord) ?? readRetryAfterSeconds(problemRecord);

  const descriptionCandidate =
    options?.description ??
    readStringField(problemRecord, "detail") ??
    options?.fallbackDescription ??
    descriptionForStatus(status);

  const description = buildReferenceDescription(
    buildRetryDescription(descriptionCandidate, retryAfterSeconds),
    requestId,
  );

  return {
    ...pickProblemToastOptions(options),
    title,
    description,
  };
}

function showConfiguredToast(type: ToastType, options: ToastOptions): ToastId {
  dismissExistingIfRequested(options.replace);

  return showToast(
    type,
    buildToastOptions(options.title, options, getDefaultDuration(type)),
  );
}

const toastApi: ToastApi = {
  success: (options) => showConfiguredToast("success", options),

  info: (options) => showConfiguredToast("info", options),

  warning: (options) => showConfiguredToast("warning", options),

  banner: (options) => {
    const type = options.type ?? "banner";

    dismissExistingIfRequested(options.replace);

    return showToast(
      type,
      buildToastOptions(options.title, options, getDefaultDuration(type)),
    );
  },

  error: (options) => showConfiguredToast("error", options),

  loading: (options) => showConfiguredToast("loading", options),

  message: (title, options) => {
    const type = options?.type ?? "default";

    dismissExistingIfRequested(options?.replace);

    return showToast(
      type,
      buildToastOptions(title, options, getDefaultDuration(type)),
    );
  },

  problem: (error, options) => {
    const problemToastOptions = buildProblemToastOptions(error, options);

    return toastApi.error(problemToastOptions);
  },

  promise: async (task, messages, options) => {
    dismissExistingIfRequested(options?.replace);

    const loadingId = toastApi.loading({
      ...options,
      title: messages.loading,
      icon: options?.icon === undefined ? getLoadingIcon() : options.icon,
      duration: DURATION_BY_TYPE.loading,
      replace: false,
    });

    try {
      const resolvedTask = typeof task === "function" ? task() : task;
      const data = await resolvedTask;

      sonnerToast.dismiss(loadingId);

      const title =
        typeof messages.success === "function"
          ? messages.success(data)
          : messages.success;

      return toastApi.success({
        ...options,
        title,
        replace: false,
      });
    } catch (unknownError) {
      sonnerToast.dismiss(loadingId);

      const safeError = safePromiseError(unknownError);
      const title =
        typeof messages.error === "function"
          ? messages.error(safeError)
          : messages.error;

      return toastApi.error({
        ...options,
        title,
        replace: false,
      });
    }
  },

  dismiss: (id) => sonnerToast.dismiss(id),

  dismissAll: () => sonnerToast.dismiss(),
};

export function useToast(): ToastApi {
  return toastApi;
}

export { sonnerToast as toast };

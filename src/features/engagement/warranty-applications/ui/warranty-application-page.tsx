// oz-next-app/src/features/engagement/warranty-applications/ui/warranty-application-page.tsx
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  Info,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Menu,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";

import {
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentForm,
  ContentFormActions,
  ContentHeader,
  ContentRoot,
  ContentSection,
  ContentSplit,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { isApiHttpError } from "@/lib/api/problem";
import { cn } from "@/lib/utils";
import { idempotencyKey as createIdempotencyKey } from "@/lib/security/request-identifiers";

import { PublicFormStatusEmblem } from "@/features/engagement/shared/ui/public-form-status-emblem";
import {
  isPublicWarrantyUploadError,
  submitPublicWarrantyApplication,
  uploadPublicWarrantyApplicationFile,
} from "@/features/engagement/warranty-applications/api/warranty-application.client";
import { PublicWarrantyShell } from "@/features/engagement/warranty-applications/ui/warranty-application-shell";
import {
  WARRANTY_APPLICATION_ALLOWED_UPLOAD_EXTENSIONS,
  WARRANTY_APPLICATION_ALLOWED_UPLOAD_MIME_TYPES,
  WARRANTY_APPLICATION_MAX_SERVICE_INVOICE_FILES,
  WARRANTY_APPLICATION_UPLOAD_ACCEPT,
  WARRANTY_APPLICATION_UPLOAD_MAX_BYTES,
  publicWarrantyTokenSchema,
  warrantyApplicationFormSchema,
  type WarrantyApplicationFilePurpose,
  type WarrantyApplicationFormValues,
  type WarrantyApplicationSubmitRequest,
  type WarrantyApplicationUploadedFile,
} from "@/features/engagement/warranty-applications/contracts/warranty-application.schema";

export type PublicWarrantyApplicationPageProps = Readonly<{
  token: string;
}>;

type SubmitState =
  | "idle"
  | "submitting"
  | "success"
  | "invalid-link"
  | "api-error"
  | "unexpected-error";

type UploadStatus = "queued" | "uploading" | "uploaded" | "failed";

type UserFacingError = Readonly<{
  title: string;
  description: string;
  requestId?: string;
}>;

type StepDefinition = Readonly<{
  title: string;
  description: string;
}>;

type StepIndex = 0 | 1 | 2;
type WarrantyFieldName = keyof WarrantyApplicationFormValues;

type InvoiceUploadItem = Readonly<{
  id: string;
  uploadIdempotencyKey: string;
  file: File;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  progress: number;
  status: UploadStatus;
  fileId: string | null;
  error: string | null;
  retryable: boolean;
}>;

type InvoiceSubmissionIds = Readonly<{
  purchaseInvoiceFileId: string;
  serviceInvoiceFileIds: readonly string[];
}>;

type InvoiceUploadPickerProps = Readonly<{
  inputId: string;
  title: string;
  description: string;
  disabled: boolean;
  multiple?: boolean;
  children: React.ReactNode;
  onFilesSelected: (files: readonly File[]) => void;
}>;

const FORM_ID = "public-warranty-application-form";
const FINAL_STEP: StepIndex = 2;
const MAX_TEXT_LENGTH = 160;
const MAX_FILE_NAME_LENGTH = 140;
const INDIAN_MOBILE_PREFIX = "+91";
const INDIAN_MOBILE_MAX_LENGTH = 10;
const MAX_REQUEST_ID_LENGTH = 128;
const C0_CONTROL_CHARACTER_MAX_CODE_POINT = 0x1f;
const DELETE_CONTROL_CHARACTER_CODE_POINT = 0x7f;
const NON_DIGIT_PATTERN = /\D/gu;
const WHITESPACE_PATTERN = /\s+/gu;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:/@-]+$/u;
const MAX_SERVICE_INVOICE_FILES_LABEL = String(
  WARRANTY_APPLICATION_MAX_SERVICE_INVOICE_FILES,
);

const ACCEPTED_MIME_TYPES = new Set<string>(
  WARRANTY_APPLICATION_ALLOWED_UPLOAD_MIME_TYPES,
);
const ACCEPTED_EXTENSIONS = new Set<string>(
  WARRANTY_APPLICATION_ALLOWED_UPLOAD_EXTENSIONS,
);

const STATE_COPY: Record<
  SubmitState,
  Readonly<{ title: string; description: string }>
> = {
  idle: {
    title: "Warranty application",
    description:
      "Complete the secure form and attach the invoices required for warranty evaluation.",
  },
  submitting: {
    title: "Submitting securely",
    description:
      "Your invoices and warranty application are being sent through the secure ERP gateway.",
  },
  success: {
    title: "Application received",
    description:
      "Thank you. Ozotec EV has received your warranty application for evaluation.",
  },
  "invalid-link": {
    title: "Invalid warranty link",
    description:
      "This warranty application link is invalid. Please use the latest link sent by Ozotec EV.",
  },
  "api-error": {
    title: "Application could not be submitted",
    description:
      "We could not submit your warranty application right now. Your entered details remain on this page; try again using the same link.",
  },
  "unexpected-error": {
    title: "Something went wrong",
    description:
      "The warranty application could not be completed. Refresh the page and try again.",
  },
};

const STEPS = [
  {
    title: "Customer details",
    description: "Provide the primary contact for this warranty request.",
  },
  {
    title: "Service address",
    description:
      "Enter the address where the vehicle or warranty component is located.",
  },
  {
    title: "Warranty details",
    description:
      "Add the VIN or serial number, describe the concern, and attach the invoices.",
  },
] as const satisfies readonly StepDefinition[];

const STEP_FIELDS = [
  ["name", "mobileNumber", "email"],
  ["addressLine1", "addressLine2", "city", "postalCode", "district", "state"],
  ["vinNumber", "componentDetails"],
] as const satisfies Record<StepIndex, readonly WarrantyFieldName[]>;

const DEFAULT_VALUES = {
  name: "",
  mobileNumber: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  postalCode: "",
  district: "",
  state: "Tamil Nadu",
  vinNumber: "",
  componentDetails: "",
} as const satisfies WarrantyApplicationFormValues;

function safeRequestId(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (
    normalized === undefined ||
    normalized.length === 0 ||
    normalized.length > MAX_REQUEST_ID_LENGTH ||
    !SAFE_REQUEST_ID_PATTERN.test(normalized)
  ) {
    return undefined;
  }

  return normalized;
}

function withRequestId(
  base: Readonly<{ title: string; description: string }>,
  requestId: string | undefined,
): UserFacingError {
  return requestId === undefined ? base : { ...base, requestId };
}

function errorFromUnknown(error: unknown): UserFacingError {
  if (isApiHttpError(error)) {
    const code = error.code.toUpperCase();
    const requestId = safeRequestId(error.requestId);
    let baseError: Omit<UserFacingError, "requestId">;

    if (
      error.status === 404 ||
      error.status === 409 ||
      code.includes("EXPIRED") ||
      code.includes("USED") ||
      code.includes("NOT_FOUND")
    ) {
      baseError = {
        title: "Link expired or already used",
        description:
          "This warranty application link is no longer active. Please use the latest link from Ozotec EV.",
      };
    } else if (error.status === 429) {
      baseError = {
        title: "Too many submission attempts",
        description:
          "Please wait briefly before trying to submit this warranty application again.",
      };
    } else if (error.status >= 500) {
      baseError = {
        title: "Warranty service temporarily unavailable",
        description:
          "The warranty service is temporarily unavailable. Your entered details remain on this page; try again shortly.",
      };
    } else {
      baseError = STATE_COPY["api-error"];
    }

    return withRequestId(baseError, requestId);
  }

  if (isPublicWarrantyUploadError(error)) {
    const code = error.code.toUpperCase();
    const requestId = safeRequestId(error.requestId);
    let baseError: Omit<UserFacingError, "requestId">;

    if (
      error.status === 404 ||
      code.includes("EXPIRED") ||
      code.includes("USED") ||
      code.includes("NOT_FOUND")
    ) {
      baseError = {
        title: "Link expired or already used",
        description:
          "This warranty application link is no longer active. Please use the latest link from Ozotec EV.",
      };
    } else if (error.status === 413 || code.includes("TOO_LARGE")) {
      baseError = {
        title: "Invoice file is too large",
        description: `Choose a file that is ${formatBytes(
          WARRANTY_APPLICATION_UPLOAD_MAX_BYTES,
        )} or smaller.`,
      };
    } else if (error.status === 415 || code.includes("MEDIA_TYPE")) {
      baseError = {
        title: "Invoice file type is not supported",
        description: "Upload a PDF, JPG, JPEG, PNG, or WEBP invoice file.",
      };
    } else if (error.status === 429) {
      baseError = {
        title: "Too many upload attempts",
        description: "Please wait briefly before retrying the invoice upload.",
      };
    } else if (error.status === 0 || error.status >= 500) {
      baseError = {
        title: "Invoice upload interrupted",
        description:
          "The invoice could not be uploaded. Check your connection and retry the failed file.",
      };
    } else {
      baseError = {
        title: "Invoice upload failed",
        description: error.message,
      };
    }

    return withRequestId(baseError, requestId);
  }

  return STATE_COPY["unexpected-error"];
}

function isRetryableUploadError(error: unknown): boolean {
  if (!isPublicWarrantyUploadError(error)) {
    return false;
  }

  return (
    error.status === 0 ||
    error.status === 408 ||
    error.status === 425 ||
    error.status === 429 ||
    error.status >= 500
  );
}

function normalizeMobileInput(value: string): string {
  const digits = value.replace(NON_DIGIT_PATTERN, "");

  if (digits.startsWith("91") && digits.length > INDIAN_MOBILE_MAX_LENGTH) {
    return digits.slice(2, 2 + INDIAN_MOBILE_MAX_LENGTH);
  }

  return digits.slice(0, INDIAN_MOBILE_MAX_LENGTH);
}

function normalizePincodeInput(value: string): string {
  return value.replace(NON_DIGIT_PATTERN, "").slice(0, 6);
}

function normalizeVinInput(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-HJ-NPR-Z0-9]/gu, "")
    .slice(0, 17);
}

function optionalNonEmpty(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized === undefined || normalized.length === 0
    ? undefined
    : normalized;
}

function isControlCharacter(value: string): boolean {
  const codePoint = value.codePointAt(0);

  return (
    codePoint !== undefined &&
    (codePoint <= C0_CONTROL_CHARACTER_MAX_CODE_POINT ||
      codePoint === DELETE_CONTROL_CHARACTER_CODE_POINT)
  );
}

function replaceControlCharacters(value: string): string {
  return Array.from(value, (character) =>
    isControlCharacter(character) ? " " : character,
  ).join("");
}

function safeDisplayText(
  value: string,
  fallback: string,
  maxLength = MAX_TEXT_LENGTH,
): string {
  const normalized = replaceControlCharacters(value)
    .replace(WHITESPACE_PATTERN, " ")
    .trim();

  if (normalized.length === 0) {
    return fallback;
  }

  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function safeFileName(value: string): string {
  return safeDisplayText(value, "Selected invoice", MAX_FILE_NAME_LENGTH);
}

function getFileExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const lastDotIndex = normalized.lastIndexOf(".");

  if (lastDotIndex < 0 || lastDotIndex === normalized.length - 1) {
    return "";
  }

  return normalized.slice(lastDotIndex + 1);
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${String(Math.round(bytes))} B`;
  }

  const kib = bytes / 1024;

  if (kib < 1024) {
    return `${kib.toFixed(kib >= 100 ? 0 : 1)} KB`;
  }

  const mib = kib / 1024;
  return `${mib.toFixed(mib >= 100 ? 0 : 1)} MB`;
}

function validateInvoiceFile(file: File): string | null {
  const extension = getFileExtension(file.name);

  if (!ACCEPTED_EXTENSIONS.has(extension)) {
    return "Upload a PDF, JPG, JPEG, PNG, or WEBP invoice file.";
  }

  if (file.type.length > 0 && !ACCEPTED_MIME_TYPES.has(file.type)) {
    return "The selected file type is not supported. Upload a PDF or image invoice.";
  }

  if (file.size <= 0) {
    return "The selected invoice file is empty.";
  }

  if (file.size > WARRANTY_APPLICATION_UPLOAD_MAX_BYTES) {
    return `Invoice file must be ${formatBytes(
      WARRANTY_APPLICATION_UPLOAD_MAX_BYTES,
    )} or smaller.`;
  }

  return null;
}

function fileFingerprint(file: File): string {
  return [
    file.name,
    file.type,
    String(file.size),
    String(file.lastModified),
  ].join("\u0001");
}

function createInvoiceUploadItem(
  file: File,
  purpose: WarrantyApplicationFilePurpose,
): InvoiceUploadItem {
  const validationError = validateInvoiceFile(file);

  return {
    id: createIdempotencyKey("warranty-file"),
    uploadIdempotencyKey: createIdempotencyKey(
      purpose === "PURCHASE_INVOICE" ? "warranty-purchase" : "warranty-service",
    ),
    file,
    fileName: safeFileName(file.name),
    mimeType: file.type.length > 0 ? file.type : "application/octet-stream",
    sizeBytes: file.size,
    progress: 0,
    status: validationError === null ? "queued" : "failed",
    fileId: null,
    error: validationError,
    retryable: validationError === null,
  };
}

function snapshotFileList(fileList: FileList | null): readonly File[] {
  return Object.freeze(Array.from(fileList ?? []));
}

function getFirstSelectedFile(files: readonly File[]): File | null {
  return files[0] ?? null;
}

function firstErrorStep(
  errors: Readonly<Partial<Record<WarrantyFieldName, unknown>>>,
): StepIndex {
  for (let index = 0; index < STEP_FIELDS.length; index += 1) {
    const fields = STEP_FIELDS[index as StepIndex];

    if (fields.some((field) => errors[field] !== undefined)) {
      return index as StepIndex;
    }
  }

  return 0;
}

function toSubmitRequest(
  values: WarrantyApplicationFormValues,
  invoices: InvoiceSubmissionIds,
): WarrantyApplicationSubmitRequest {
  const email = optionalNonEmpty(values.email);
  const addressLine2 = optionalNonEmpty(values.addressLine2);

  return {
    name: values.name.trim(),
    mobileNumber: `${INDIAN_MOBILE_PREFIX}${values.mobileNumber.trim()}`,
    ...(email === undefined ? {} : { email }),
    addressLine1: values.addressLine1.trim(),
    ...(addressLine2 === undefined ? {} : { addressLine2 }),
    city: values.city.trim(),
    district: values.district.trim(),
    state: values.state.trim(),
    postalCode: values.postalCode.trim(),
    vinNumber: normalizeVinInput(values.vinNumber),
    componentDetails: values.componentDetails.trim(),
    purchaseInvoiceFileId: invoices.purchaseInvoiceFileId,
    serviceInvoiceFileIds: [...invoices.serviceInvoiceFileIds],
  };
}

function FormErrorAlert({
  error,
}: Readonly<{ error: UserFacingError }>): React.ReactElement {
  return (
    <ContentStatus
      variant="destructive"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      icon={<AlertTriangle aria-hidden="true" />}
      title={error.title}
      description={
        <>
          {error.description}
          {error.requestId === undefined ? null : (
            <span className="mt-2 block text-caption">
              Reference: <code>{error.requestId}</code>
            </span>
          )}
        </>
      }
    />
  );
}

function focusTargetIdForStep(step: StepIndex): string {
  switch (step) {
    case 0:
      return "warranty-name";
    case 1:
      return "warranty-address-line-1";
    case 2:
      return "warranty-vin";
  }
}

function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function StepProgress({
  step,
}: Readonly<{ step: StepIndex }>): React.ReactElement {
  const percentage = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex min-w-0 items-center justify-between gap-3 text-caption text-muted-readable">
        <span>
          Step {String(step + 1)} of {String(STEPS.length)}
        </span>
        <span className="text-tabular">
          {String(Math.round(percentage))}% complete
        </span>
      </div>

      <Progress
        value={percentage}
        aria-label="Warranty application progress"
        aria-valuetext={`Step ${String(step + 1)} of ${String(STEPS.length)}`}
      />

      <ol
        className="hidden grid-cols-3 gap-2 sm:grid"
        aria-label="Warranty application steps"
      >
        {STEPS.map((item, index) => {
          const complete = index < step;
          const current = index === step;

          return (
            <li
              key={item.title}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2",
                current
                  ? "border-primary/30 bg-primary/6"
                  : "border-border/60 bg-background/55",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-semibold",
                  complete
                    ? "bg-success text-success-foreground"
                    : current
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-readable",
                )}
              >
                {complete ? (
                  <CheckCircle2 aria-hidden="true" className="size-3.5" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0 truncate text-caption font-medium">
                {item.title}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function UploadItemCard({
  item,
  disabled,
  onRemove,
  onRetry,
}: Readonly<{
  item: InvoiceUploadItem;
  disabled: boolean;
  onRemove: () => void;
  onRetry: () => void;
}>): React.ReactElement {
  const isQueued = item.status === "queued";
  const isUploading = item.status === "uploading";
  const isUploaded = item.status === "uploaded";
  const isFailed = item.status === "failed";
  const canRemove = !disabled && !isUploading && !isUploaded;
  const canRetry = !disabled && isFailed && item.retryable;

  return (
    <div
      className={cn(
        "grid min-w-0 max-w-full gap-3 overflow-hidden rounded-2xl border bg-background/55 p-3",
        isUploaded ? "border-success/25 bg-success/5" : "border-border/70",
        isFailed ? "border-destructive/35 bg-destructive/5" : undefined,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl border",
            isUploaded
              ? "border-success/25 bg-success/10 text-success"
              : "border-border/70 bg-background/70 text-muted-readable",
            isFailed
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : undefined,
          )}
        >
          {isUploading ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          ) : isUploaded ? (
            <FileCheck2 aria-hidden="true" className="size-4" />
          ) : (
            <FileText aria-hidden="true" className="size-4" />
          )}
        </div>

        <div className="grid min-w-0 flex-1 gap-1">
          <p className="break-words text-body-sm font-medium text-foreground [overflow-wrap:anywhere]">
            {item.fileName}
          </p>
          <p className="break-words text-caption text-muted-readable [overflow-wrap:anywhere]">
            {formatBytes(item.sizeBytes)}
            {item.mimeType.length > 0 ? ` · ${item.mimeType}` : ""}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label={`Remove ${item.fileName}`}
          className="size-8 shrink-0 px-0"
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      {isQueued ? (
        <p className="rounded-xl bg-muted/45 px-3 py-2 text-caption text-muted-readable">
          Ready to upload when the application is submitted.
        </p>
      ) : null}

      {isUploading ? (
        <div className="grid min-w-0 gap-1.5">
          <Progress
            value={item.progress}
            aria-label={`${item.fileName} upload progress`}
          />
          <div className="flex items-center justify-between gap-3 text-caption text-muted-readable">
            <span>Uploading invoice securely…</span>
            <span className="shrink-0 text-tabular">{item.progress}%</span>
          </div>
        </div>
      ) : null}

      {isUploaded ? (
        <ContentStatus
          variant="success"
          role="status"
          icon={<FileCheck2 aria-hidden="true" />}
          title="Upload complete"
          description="The invoice is locked to this secure warranty link."
        />
      ) : null}

      {isFailed ? (
        <div className="grid gap-2">
          <ContentStatus
            variant="destructive"
            role="alert"
            icon={<AlertTriangle aria-hidden="true" />}
            title="Upload failed"
            description={item.error ?? "Invoice upload failed."}
          />
          {canRetry ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="justify-self-start"
            >
              <RefreshCw aria-hidden="true" />
              Retry upload
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InvoiceUploadPicker({
  inputId,
  title,
  description,
  disabled,
  multiple = false,
  children,
  onFilesSelected,
}: InvoiceUploadPickerProps): React.ReactElement {
  return (
    <div className="grid min-w-0 max-w-full gap-3 overflow-hidden rounded-2xl border border-border/70 bg-muted/20 p-3 sm:p-4">
      <Input
        id={inputId}
        type="file"
        accept={WARRANTY_APPLICATION_UPLOAD_ACCEPT}
        multiple={multiple}
        disabled={disabled}
        className="peer sr-only"
        onChange={(event) => {
          const selectedFiles = snapshotFileList(event.currentTarget.files);
          event.currentTarget.value = "";
          onFilesSelected(selectedFiles);
        }}
      />

      <label
        htmlFor={inputId}
        aria-disabled={disabled}
        className={cn(
          "flex min-h-16 min-w-0 touch-manipulation cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-background/65 px-3.5 py-3 text-body-sm text-foreground transition-[border-color,background-color] duration-150 hover:border-primary/50 hover:bg-primary/5 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/20 motion-reduce:transition-none sm:px-4",
          disabled && "pointer-events-none cursor-not-allowed opacity-60",
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <UploadCloud aria-hidden="true" className="size-4" />
        </span>

        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="break-words font-medium [overflow-wrap:anywhere]">
            {title}
          </span>
          <span className="break-words text-caption leading-relaxed text-muted-readable [overflow-wrap:anywhere]">
            {description}
          </span>
        </span>
      </label>

      <div className="grid min-w-0 max-w-full gap-2 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function WarrantyApplicationReview({
  values,
  vinNumber,
  purchaseInvoice,
  serviceInvoices,
}: Readonly<{
  values: WarrantyApplicationFormValues;
  vinNumber: string;
  purchaseInvoice: InvoiceUploadItem | null;
  serviceInvoices: readonly InvoiceUploadItem[];
}>): React.ReactElement {
  const email = optionalNonEmpty(values.email) ?? "Not provided";
  const address = [
    values.addressLine1,
    values.addressLine2,
    values.city,
    values.district,
    values.state,
    values.postalCode,
  ]
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(", ");

  return (
    <ContentSection
      size="sm"
      title="Review your application"
      description="Confirm the customer, service address, warranty reference, and invoice selection before submission."
      className="bg-muted/20"
    >
      <ContentDescriptionList columns="two">
        <ContentDescriptionItem term="Customer">
          {values.name.trim() || "Not provided"}
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Mobile">
          {values.mobileNumber.trim().length === INDIAN_MOBILE_MAX_LENGTH
            ? `${INDIAN_MOBILE_PREFIX} ${values.mobileNumber.trim()}`
            : "Not provided"}
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Email">
          <span className="break-all">{email}</span>
        </ContentDescriptionItem>
        <ContentDescriptionItem term="VIN / serial number">
          <span className="break-all font-mono">
            {normalizeVinInput(vinNumber) || "Not provided"}
          </span>
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Service address">
          <span className="break-words">{address || "Not provided"}</span>
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Invoice selection">
          {purchaseInvoice === null
            ? "Purchase invoice missing"
            : "1 purchase invoice"}
          {` · ${String(serviceInvoices.length)} service invoice${serviceInvoices.length === 1 ? "" : "s"}`}
        </ContentDescriptionItem>
      </ContentDescriptionList>
    </ContentSection>
  );
}

function WarrantyGuideContent(): React.ReactElement {
  return (
    <div className="grid min-w-0 gap-4">
      <ContentDescriptionList columns="one">
        <ContentDescriptionItem term="Estimated time">
          About 5 minutes, excluding upload time
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Keep ready">
          Customer details, service address, VIN or serial number, purchase
          invoice, and at least one service invoice.
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Supported files">
          PDF, JPG, JPEG, PNG, or WEBP. Each file must be 10 MB or smaller.
        </ContentDescriptionItem>
        <ContentDescriptionItem term="After submission">
          The warranty team reviews the application and contacts the customer
          using the submitted mobile number or email address.
        </ContentDescriptionItem>
      </ContentDescriptionList>

      <ContentStatus
        variant="info"
        role="note"
        icon={<LockKeyhole aria-hidden="true" />}
        title="Private invoice handling"
        description="Invoice files are stored privately for this warranty request and are not published through a public CDN."
      />
    </div>
  );
}

function MobileWarrantyGuideSheet(): React.ReactElement {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="lg:hidden">
          <Menu aria-hidden="true" />
          Application guide
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[min(88dvh,44rem)]">
        <SheetHeader>
          <SheetTitle>Before you apply</SheetTitle>
          <SheetDescription>
            Documents and information needed for a complete warranty request.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6 sm:px-5">
          <WarrantyGuideContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatusScreen({
  state,
  error,
}: Readonly<{
  state: "success" | "invalid-link";
  error?: UserFacingError;
}>): React.ReactElement {
  const copy = STATE_COPY[state];
  const success = state === "success";

  return (
    <PublicWarrantyShell
      mainLabelledBy="warranty-status-title"
      mainClassName="items-center"
    >
      <ContentRoot
        width="narrow"
        density="compact"
        className="px-3 py-8 sm:px-0 sm:py-4"
      >
        <div className="grid justify-items-center">
          <PublicFormStatusEmblem status={success ? "success" : "error"} />
        </div>

        <ContentSection
          className={cn(
            "shadow-lg",
            success
              ? "border-success/20 shadow-success/5"
              : "border-destructive/20 shadow-destructive/5",
          )}
          title={<span id="warranty-status-title">{copy.title}</span>}
          description={copy.description}
        >
          <ContentStatus
            variant={success ? "success" : "destructive"}
            role="status"
            icon={
              success ? (
                <FileCheck2 aria-hidden="true" />
              ) : (
                <AlertTriangle aria-hidden="true" />
              )
            }
            title={
              success
                ? "The warranty application is safely recorded"
                : "No warranty application can be submitted from this link"
            }
            description={
              success
                ? "The warranty team can now evaluate the application and its private invoice references."
                : "Use the latest secure warranty link sent by Ozotec EV."
            }
          />

          {error === undefined ? null : (
            <div className="mt-4">
              <FormErrorAlert error={error} />
            </div>
          )}

          <p className="mt-4 text-center text-caption text-muted-readable">
            No internal ERP records or private invoice files are exposed here.
          </p>
        </ContentSection>
      </ContentRoot>
    </PublicWarrantyShell>
  );
}

export function PublicWarrantyApplicationPage({
  token,
}: PublicWarrantyApplicationPageProps): React.ReactElement {
  const tokenResult = React.useMemo(
    () => publicWarrantyTokenSchema.safeParse(token),
    [token],
  );

  const [step, setStep] = React.useState<StepIndex>(0);
  const [submitState, setSubmitState] = React.useState<SubmitState>("idle");
  const [formError, setFormError] = React.useState<UserFacingError | null>(
    null,
  );
  const [actionPending, setActionPending] = React.useState(false);
  const [purchaseInvoiceUpload, setPurchaseInvoiceUpload] =
    React.useState<InvoiceUploadItem | null>(null);
  const [serviceInvoiceUploads, setServiceInvoiceUploads] = React.useState<
    readonly InvoiceUploadItem[]
  >([]);

  const stepHeadingRef = React.useRef<HTMLSpanElement | null>(null);
  const errorRef = React.useRef<HTMLDivElement | null>(null);
  const mountedRef = React.useRef(false);
  const navigationDirectionRef = React.useRef<"forward" | "back">("forward");
  const submissionLockRef = React.useRef(false);
  const uploadLocksRef = React.useRef<Set<string>>(new Set());
  const submissionIdempotencyKeyRef = React.useRef<string | null>(null);
  const flowAbortControllerRef = React.useRef<AbortController | null>(null);

  const form = useForm<WarrantyApplicationFormValues>({
    resolver: zodResolver(warrantyApplicationFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });
  const componentDetails = useWatch({
    control: form.control,
    name: "componentDetails",
  });
  const vinNumber = useWatch({
    control: form.control,
    name: "vinNumber",
  });

  React.useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: () => {
        if (!submissionLockRef.current) {
          submissionIdempotencyKeyRef.current = null;
        }
      },
    });
  }, [form]);

  React.useEffect(() => {
    return () => {
      flowAbortControllerRef.current?.abort();
    };
  }, []);

  React.useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      stepHeadingRef.current?.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: "start",
      });

      const targetId =
        navigationDirectionRef.current === "forward"
          ? focusTargetIdForStep(step)
          : null;
      const target =
        targetId === null
          ? stepHeadingRef.current
          : document.getElementById(targetId);

      target?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [step]);

  React.useEffect(() => {
    if (formError === null) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: "center",
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [formError]);

  const parsedToken = tokenResult.success ? tokenResult.data : null;
  const uploadsBusy =
    purchaseInvoiceUpload?.status === "uploading" ||
    serviceInvoiceUploads.some((item) => item.status === "uploading");
  const networkBusy = submitState === "submitting" || uploadsBusy;
  const busy = actionPending || networkBusy;
  const success = submitState === "success";
  const disabled = busy || success || parsedToken === null;
  const currentStep = STEPS[step];
  const reviewValues = step === FINAL_STEP ? form.getValues() : null;

  function resetSubmissionIntent(): void {
    submissionIdempotencyKeyRef.current = null;
  }

  function validateInvoiceSelection(): UserFacingError | null {
    if (purchaseInvoiceUpload === null) {
      return {
        title: "Purchase invoice required",
        description:
          "Select the purchase invoice as a PDF or image before submitting.",
      };
    }

    if (
      purchaseInvoiceUpload.status === "failed" &&
      !purchaseInvoiceUpload.retryable
    ) {
      return {
        title: "Purchase invoice is invalid",
        description:
          purchaseInvoiceUpload.error ??
          "Remove the purchase invoice and select a valid file.",
      };
    }

    if (serviceInvoiceUploads.length === 0) {
      return {
        title: "Service invoice required",
        description:
          "Select at least one service invoice as a PDF or image before submitting.",
      };
    }

    const invalidServiceInvoice = serviceInvoiceUploads.find(
      (item) => item.status === "failed" && !item.retryable,
    );

    if (invalidServiceInvoice !== undefined) {
      return {
        title: "Service invoice is invalid",
        description:
          invalidServiceInvoice.error ??
          "Remove invalid service invoices and select valid files.",
      };
    }

    if (
      serviceInvoiceUploads.length >
      WARRANTY_APPLICATION_MAX_SERVICE_INVOICE_FILES
    ) {
      return {
        title: "Too many service invoices",
        description: `Select up to ${MAX_SERVICE_INVOICE_FILES_LABEL} service invoice files.`,
      };
    }

    return null;
  }

  function updatePurchaseUpload(id: string, next: InvoiceUploadItem): void {
    setPurchaseInvoiceUpload((current) =>
      current?.id === id ? next : current,
    );
  }

  function updatePurchaseUploadProgress(id: string, progress: number): void {
    setPurchaseInvoiceUpload((current) =>
      current?.id === id
        ? {
            ...current,
            progress,
            status: "uploading",
            error: null,
          }
        : current,
    );
  }

  function updateServiceUpload(id: string, next: InvoiceUploadItem): void {
    setServiceInvoiceUploads((current) =>
      current.map((item) => (item.id === id ? next : item)),
    );
  }

  function updateServiceUploadProgress(id: string, progress: number): void {
    setServiceInvoiceUploads((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              progress,
              status: "uploading",
              error: null,
            }
          : item,
      ),
    );
  }

  async function uploadInvoiceItem(
    item: InvoiceUploadItem,
    purpose: WarrantyApplicationFilePurpose,
    signal: AbortSignal,
    onProgress: (id: string, progress: number) => void,
    onUpdate: (id: string, next: InvoiceUploadItem) => void,
  ): Promise<InvoiceUploadItem> {
    if (item.status === "uploaded" && item.fileId !== null) {
      return item;
    }

    if (!item.retryable || uploadLocksRef.current.has(item.id)) {
      return item;
    }

    uploadLocksRef.current.add(item.id);
    const uploadingItem: InvoiceUploadItem = {
      ...item,
      status: "uploading",
      progress: Math.max(item.progress, 1),
      error: null,
    };
    onUpdate(item.id, uploadingItem);

    try {
      const uploaded: WarrantyApplicationUploadedFile =
        await uploadPublicWarrantyApplicationFile({
          token: parsedToken ?? "",
          purpose,
          file: item.file,
          idempotencyKey: item.uploadIdempotencyKey,
          signal,
          onProgress: (progress) => {
            onProgress(item.id, progress);
          },
        });

      const uploadedItem: InvoiceUploadItem = {
        ...item,
        fileName: safeFileName(uploaded.fileName),
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        progress: 100,
        status: "uploaded",
        fileId: uploaded.fileId,
        error: null,
        retryable: false,
      };
      onUpdate(item.id, uploadedItem);
      return uploadedItem;
    } catch (caught) {
      const nextError = errorFromUnknown(caught);
      const failedItem: InvoiceUploadItem = {
        ...item,
        progress: 0,
        status: "failed",
        fileId: null,
        error: nextError.description,
        retryable: isRetryableUploadError(caught),
      };
      onUpdate(item.id, failedItem);
      throw caught;
    } finally {
      uploadLocksRef.current.delete(item.id);
    }
  }

  async function uploadRequiredInvoices(
    signal: AbortSignal,
  ): Promise<InvoiceSubmissionIds> {
    const purchaseItem = purchaseInvoiceUpload;

    if (purchaseItem === null) {
      throw new Error("purchase_invoice_required");
    }

    const uploadedPurchase = await uploadInvoiceItem(
      purchaseItem,
      "PURCHASE_INVOICE",
      signal,
      updatePurchaseUploadProgress,
      updatePurchaseUpload,
    );

    if (uploadedPurchase.fileId === null) {
      throw new Error("purchase_invoice_upload_failed");
    }

    const serviceInvoiceFileIds: string[] = [];

    for (const item of serviceInvoiceUploads) {
      const uploadedItem = await uploadInvoiceItem(
        item,
        "SERVICE_INVOICE",
        signal,
        updateServiceUploadProgress,
        updateServiceUpload,
      );

      if (uploadedItem.fileId === null) {
        throw new Error("service_invoice_upload_failed");
      }

      serviceInvoiceFileIds.push(uploadedItem.fileId);
    }

    if (serviceInvoiceFileIds.length === 0) {
      throw new Error("service_invoice_required");
    }

    return {
      purchaseInvoiceFileId: uploadedPurchase.fileId,
      serviceInvoiceFileIds,
    };
  }

  function handlePurchaseInvoiceChange(file: File | null): void {
    if (file === null || busy) {
      return;
    }

    if (purchaseInvoiceUpload?.status === "uploaded") {
      setFormError({
        title: "Purchase invoice already uploaded",
        description:
          "The uploaded purchase invoice is locked to this secure link. Continue with the application or request a new warranty link if the document is incorrect.",
      });
      return;
    }

    resetSubmissionIntent();
    setFormError(null);
    setPurchaseInvoiceUpload(createInvoiceUploadItem(file, "PURCHASE_INVOICE"));
  }

  function handleServiceInvoicesChange(files: readonly File[]): void {
    if (files.length === 0 || busy) {
      return;
    }

    const existingFingerprints = new Set(
      serviceInvoiceUploads.map((item) => fileFingerprint(item.file)),
    );
    const batchFingerprints = new Set<string>();
    const uniqueFiles = files.filter((file) => {
      const fingerprint = fileFingerprint(file);

      if (
        existingFingerprints.has(fingerprint) ||
        batchFingerprints.has(fingerprint)
      ) {
        return false;
      }

      batchFingerprints.add(fingerprint);
      return true;
    });
    const duplicateCount = files.length - uniqueFiles.length;
    const remainingSlots =
      WARRANTY_APPLICATION_MAX_SERVICE_INVOICE_FILES -
      serviceInvoiceUploads.length;

    if (remainingSlots <= 0) {
      setFormError({
        title: "Service invoice limit reached",
        description: `You can select up to ${MAX_SERVICE_INVOICE_FILES_LABEL} service invoices.`,
      });
      return;
    }

    const acceptedFiles = uniqueFiles.slice(0, remainingSlots);
    const limitRejectedCount = uniqueFiles.length - acceptedFiles.length;

    if (acceptedFiles.length === 0) {
      setFormError({
        title: "No new files were added",
        description:
          duplicateCount > 0
            ? "The selected service invoices are already in the list."
            : "Select a supported service invoice file.",
      });
      return;
    }

    resetSubmissionIntent();
    setServiceInvoiceUploads((current) => [
      ...current,
      ...acceptedFiles.map((file) =>
        createInvoiceUploadItem(file, "SERVICE_INVOICE"),
      ),
    ]);

    if (duplicateCount > 0 || limitRejectedCount > 0) {
      const details = [
        duplicateCount > 0
          ? `${String(duplicateCount)} duplicate file${duplicateCount === 1 ? " was" : "s were"} skipped.`
          : null,
        limitRejectedCount > 0
          ? `${String(limitRejectedCount)} file${limitRejectedCount === 1 ? " exceeds" : "s exceed"} the ${MAX_SERVICE_INVOICE_FILES_LABEL}-file limit.`
          : null,
      ].filter((value): value is string => value !== null);

      setFormError({
        title: "Some files were not added",
        description: details.join(" "),
      });
      return;
    }

    setFormError(null);
  }

  async function retryPurchaseInvoice(item: InvoiceUploadItem): Promise<void> {
    if (busy || parsedToken === null || !item.retryable) {
      return;
    }

    setFormError(null);
    const controller = new AbortController();
    flowAbortControllerRef.current?.abort();
    flowAbortControllerRef.current = controller;

    try {
      await uploadInvoiceItem(
        item,
        "PURCHASE_INVOICE",
        controller.signal,
        updatePurchaseUploadProgress,
        updatePurchaseUpload,
      );
    } catch (caught) {
      if (!controller.signal.aborted) {
        setFormError(errorFromUnknown(caught));
      }
    }
  }

  async function retryServiceInvoice(item: InvoiceUploadItem): Promise<void> {
    if (busy || parsedToken === null || !item.retryable) {
      return;
    }

    setFormError(null);
    const controller = new AbortController();
    flowAbortControllerRef.current?.abort();
    flowAbortControllerRef.current = controller;

    try {
      await uploadInvoiceItem(
        item,
        "SERVICE_INVOICE",
        controller.signal,
        updateServiceUploadProgress,
        updateServiceUpload,
      );
    } catch (caught) {
      if (!controller.signal.aborted) {
        setFormError(errorFromUnknown(caught));
      }
    }
  }

  async function handleNext(
    event: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (disabled || step >= FINAL_STEP) {
      return;
    }

    setActionPending(true);
    setFormError(null);

    try {
      const fields = STEP_FIELDS[step];
      const valid = await form.trigger([...fields], { shouldFocus: true });

      if (valid) {
        navigationDirectionRef.current = "forward";
        setStep((current) => Math.min(current + 1, FINAL_STEP) as StepIndex);
      }
    } finally {
      setActionPending(false);
    }
  }

  function handleBack(): void {
    if (busy) {
      return;
    }

    setFormError(null);
    navigationDirectionRef.current = "back";
    setStep((current) => Math.max(current - 1, 0) as StepIndex);
  }

  async function handleSubmit(): Promise<void> {
    if (
      step !== FINAL_STEP ||
      parsedToken === null ||
      busy ||
      success ||
      submissionLockRef.current
    ) {
      return;
    }

    submissionLockRef.current = true;
    setActionPending(true);
    setFormError(null);
    let completed = false;

    try {
      const valid = await form.trigger(undefined, { shouldFocus: true });

      if (!valid) {
        navigationDirectionRef.current = "forward";
        setStep(firstErrorStep(form.formState.errors));
        return;
      }

      const invoiceError = validateInvoiceSelection();

      if (invoiceError !== null) {
        setFormError(invoiceError);
        return;
      }

      const values = warrantyApplicationFormSchema.parse(form.getValues());
      const submissionIdempotencyKey =
        submissionIdempotencyKeyRef.current ??
        createIdempotencyKey("warranty-submit");
      submissionIdempotencyKeyRef.current = submissionIdempotencyKey;

      const controller = new AbortController();
      flowAbortControllerRef.current?.abort();
      flowAbortControllerRef.current = controller;
      setSubmitState("submitting");

      const invoices = await uploadRequiredInvoices(controller.signal);

      if (controller.signal.aborted) {
        return;
      }

      await submitPublicWarrantyApplication({
        token: parsedToken,
        idempotencyKey: submissionIdempotencyKey,
        application: toSubmitRequest(values, invoices),
        signal: controller.signal,
      });

      completed = true;
      setSubmitState("success");
    } catch (caught) {
      if (
        (caught instanceof DOMException && caught.name === "AbortError") ||
        flowAbortControllerRef.current?.signal.aborted === true
      ) {
        return;
      }

      setSubmitState("api-error");
      setFormError(errorFromUnknown(caught));
    } finally {
      setActionPending(false);

      if (!completed) {
        submissionLockRef.current = false;
      }
    }
  }

  if (!tokenResult.success) {
    return <StatusScreen state="invalid-link" />;
  }

  if (success) {
    return <StatusScreen state="success" />;
  }

  const footerActions = (
    <ContentFormActions className="mx-auto w-full max-w-7xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent sm:justify-between">
      <div className="hidden min-w-0 flex-1 sm:block">
        <p className="truncate text-caption text-muted-readable">
          Step {String(step + 1)} of {String(STEPS.length)}
        </p>
        <p className="truncate text-body-sm font-medium text-foreground">
          {currentStep.title}
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-72">
        <Button
          type="button"
          variant="outline"
          disabled={busy || step === 0}
          onClick={handleBack}
          className="min-h-11 w-full touch-manipulation"
        >
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>

        {step < FINAL_STEP ? (
          <Button
            key="warranty-continue"
            type="button"
            disabled={disabled}
            onClick={(event) => {
              void handleNext(event);
            }}
            className="min-h-11 w-full touch-manipulation"
            aria-busy={actionPending}
          >
            {actionPending ? (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
              />
            ) : null}
            Continue
            <ChevronRight aria-hidden="true" />
          </Button>
        ) : (
          <Button
            key="warranty-submit"
            type="submit"
            form={FORM_ID}
            disabled={disabled}
            className="min-h-11 w-full touch-manipulation"
            aria-busy={busy}
          >
            {busy ? (
              <LoaderCircle
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <FileCheck2 aria-hidden="true" />
            )}
            {uploadsBusy
              ? "Uploading…"
              : submitState === "submitting"
                ? "Submitting…"
                : "Submit warranty"}
          </Button>
        )}
      </div>
    </ContentFormActions>
  );

  return (
    <PublicWarrantyShell
      footerActions={footerActions}
      mainLabelledBy="warranty-form-title"
    >
      <ContentRoot
        width="wide"
        density="compact"
        className="px-3 py-3 sm:px-0 sm:py-0"
      >
        <ContentHeader
          variant="compact"
          eyebrow={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Warranty application</Badge>
              <Badge variant="secondary">3 guided steps</Badge>
            </div>
          }
          title={
            <span
              ref={stepHeadingRef}
              id="warranty-form-title"
              tabIndex={-1}
              className="scroll-mt-24 outline-none"
            >
              {currentStep.title}
            </span>
          }
          description={currentStep.description}
          actions={<MobileWarrantyGuideSheet />}
          meta={
            <div className="grid w-full min-w-0 gap-2 sm:grid-cols-3">
              <div className="flex min-w-0 items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                <Clock3
                  aria-hidden="true"
                  className="size-4 shrink-0 text-primary"
                />
                <span className="text-caption text-foreground">
                  About 5 minutes
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
                <ListChecks
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-readable"
                />
                <span className="text-caption text-foreground">
                  One section at a time
                </span>
              </div>
              <div className="hidden min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 sm:flex">
                <LockKeyhole
                  aria-hidden="true"
                  className="size-4 shrink-0 text-success"
                />
                <span className="text-caption text-foreground">
                  Private invoice storage
                </span>
              </div>
            </div>
          }
          cardClassName="border-primary/20 bg-card/92 shadow-lg shadow-primary/5"
        >
          <div className="mt-4 border-t border-border/70 pt-4">
            <StepProgress step={step} />
          </div>
        </ContentHeader>

        <ContentSplit
          variant="main-context"
          className="gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem]"
        >
          <div className="grid min-w-0 gap-4">
            {formError === null ? null : (
              <div ref={errorRef} className="scroll-mt-24">
                <FormErrorAlert error={formError} />
              </div>
            )}

            <ContentSection
              aria-busy={busy}
              className="border-primary/15 bg-card/94 shadow-md"
              contentClassName="min-w-0"
            >
              <ContentForm
                id={FORM_ID}
                noValidate
                className="[&_input]:text-base [&_textarea]:text-base sm:[&_input]:text-body-sm sm:[&_textarea]:text-body-sm"
                onSubmit={(event) => {
                  event.preventDefault();

                  if (step !== FINAL_STEP) {
                    return;
                  }

                  void handleSubmit();
                }}
              >
                <FieldGroup className="gap-5">
                  {step === 0 ? (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field
                        data-invalid={
                          form.formState.errors.name === undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="warranty-name">
                          Customer name
                        </FieldLabel>
                        <Input
                          id="warranty-name"
                          type="text"
                          autoComplete="name"
                          enterKeyHint="next"
                          placeholder="Your full name"
                          aria-invalid={
                            form.formState.errors.name === undefined
                              ? undefined
                              : true
                          }
                          disabled={disabled}
                          {...form.register("name")}
                        />
                        {form.formState.errors.name?.message ===
                        undefined ? null : (
                          <FieldError>
                            {form.formState.errors.name.message}
                          </FieldError>
                        )}
                      </Field>

                      <Field
                        data-invalid={
                          form.formState.errors.mobileNumber === undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="warranty-mobile">
                          Mobile number
                        </FieldLabel>
                        <Controller
                          control={form.control}
                          name="mobileNumber"
                          render={({ field }) => (
                            <div className="relative">
                              <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-body-sm text-muted-readable"
                              >
                                {INDIAN_MOBILE_PREFIX}
                              </span>
                              <Input
                                id="warranty-mobile"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel-national"
                                enterKeyHint="next"
                                maxLength={INDIAN_MOBILE_MAX_LENGTH}
                                placeholder="9876543210"
                                className="pl-16 text-base sm:text-body-sm"
                                aria-invalid={
                                  form.formState.errors.mobileNumber ===
                                  undefined
                                    ? undefined
                                    : true
                                }
                                disabled={disabled}
                                value={field.value}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                                onChange={(event) => {
                                  field.onChange(
                                    normalizeMobileInput(event.target.value),
                                  );
                                }}
                              />
                            </div>
                          )}
                        />
                        {form.formState.errors.mobileNumber?.message ===
                        undefined ? null : (
                          <FieldError>
                            {form.formState.errors.mobileNumber.message}
                          </FieldError>
                        )}
                      </Field>

                      <Field
                        className="sm:col-span-2"
                        data-invalid={
                          form.formState.errors.email === undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="warranty-email">
                          Email{" "}
                          <span className="text-muted-readable">
                            (optional)
                          </span>
                        </FieldLabel>
                        <Input
                          id="warranty-email"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          enterKeyHint="done"
                          placeholder="you@example.com"
                          aria-invalid={
                            form.formState.errors.email === undefined
                              ? undefined
                              : true
                          }
                          disabled={disabled}
                          {...form.register("email")}
                        />
                        {form.formState.errors.email?.message ===
                        undefined ? null : (
                          <FieldError>
                            {form.formState.errors.email.message}
                          </FieldError>
                        )}
                      </Field>
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field
                        className="sm:col-span-2"
                        data-invalid={
                          form.formState.errors.addressLine1 === undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="warranty-address-line-1">
                          Address line 1
                        </FieldLabel>
                        <Input
                          id="warranty-address-line-1"
                          type="text"
                          autoComplete="address-line1"
                          enterKeyHint="next"
                          placeholder="House number, street, area"
                          aria-invalid={
                            form.formState.errors.addressLine1 === undefined
                              ? undefined
                              : true
                          }
                          disabled={disabled}
                          {...form.register("addressLine1")}
                        />
                        {form.formState.errors.addressLine1?.message ===
                        undefined ? null : (
                          <FieldError>
                            {form.formState.errors.addressLine1.message}
                          </FieldError>
                        )}
                      </Field>

                      <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="warranty-address-line-2">
                          Address line 2{" "}
                          <span className="text-muted-readable">
                            (optional)
                          </span>
                        </FieldLabel>
                        <Input
                          id="warranty-address-line-2"
                          type="text"
                          autoComplete="address-line2"
                          enterKeyHint="next"
                          placeholder="Landmark or nearby location"
                          disabled={disabled}
                          {...form.register("addressLine2")}
                        />
                        {form.formState.errors.addressLine2?.message ===
                        undefined ? null : (
                          <FieldError>
                            {form.formState.errors.addressLine2.message}
                          </FieldError>
                        )}
                      </Field>

                      <Field
                        data-invalid={
                          form.formState.errors.city === undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="warranty-city">City</FieldLabel>
                        <Input
                          id="warranty-city"
                          type="text"
                          autoComplete="address-level2"
                          enterKeyHint="next"
                          placeholder="City"
                          aria-invalid={
                            form.formState.errors.city === undefined
                              ? undefined
                              : true
                          }
                          disabled={disabled}
                          {...form.register("city")}
                        />
                        {form.formState.errors.city?.message ===
                        undefined ? null : (
                          <FieldError>
                            {form.formState.errors.city.message}
                          </FieldError>
                        )}
                      </Field>

                      <Field
                        data-invalid={
                          form.formState.errors.district === undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="warranty-district">
                          District
                        </FieldLabel>
                        <Input
                          id="warranty-district"
                          type="text"
                          enterKeyHint="next"
                          placeholder="District"
                          aria-invalid={
                            form.formState.errors.district === undefined
                              ? undefined
                              : true
                          }
                          disabled={disabled}
                          {...form.register("district")}
                        />
                        {form.formState.errors.district?.message ===
                        undefined ? null : (
                          <FieldError>
                            {form.formState.errors.district.message}
                          </FieldError>
                        )}
                      </Field>

                      <Field
                        data-invalid={
                          form.formState.errors.state === undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="warranty-state">State</FieldLabel>
                        <Input
                          id="warranty-state"
                          type="text"
                          autoComplete="address-level1"
                          enterKeyHint="next"
                          placeholder="Tamil Nadu"
                          aria-invalid={
                            form.formState.errors.state === undefined
                              ? undefined
                              : true
                          }
                          disabled={disabled}
                          {...form.register("state")}
                        />
                        {form.formState.errors.state?.message ===
                        undefined ? null : (
                          <FieldError>
                            {form.formState.errors.state.message}
                          </FieldError>
                        )}
                      </Field>

                      <Field
                        data-invalid={
                          form.formState.errors.postalCode === undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="warranty-postal-code">
                          PIN code
                        </FieldLabel>
                        <Controller
                          control={form.control}
                          name="postalCode"
                          render={({ field }) => (
                            <Input
                              id="warranty-postal-code"
                              type="text"
                              inputMode="numeric"
                              autoComplete="postal-code"
                              enterKeyHint="done"
                              maxLength={6}
                              placeholder="600001"
                              aria-invalid={
                                form.formState.errors.postalCode === undefined
                                  ? undefined
                                  : true
                              }
                              disabled={disabled}
                              value={field.value}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              onChange={(event) => {
                                field.onChange(
                                  normalizePincodeInput(event.target.value),
                                );
                              }}
                            />
                          )}
                        />
                        {form.formState.errors.postalCode?.message ===
                        undefined ? null : (
                          <FieldError>
                            {form.formState.errors.postalCode.message}
                          </FieldError>
                        )}
                      </Field>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="grid gap-5">
                      {reviewValues === null ? null : (
                        <WarrantyApplicationReview
                          values={reviewValues}
                          vinNumber={vinNumber}
                          purchaseInvoice={purchaseInvoiceUpload}
                          serviceInvoices={serviceInvoiceUploads}
                        />
                      )}
                      <div className="grid gap-3 rounded-2xl border border-info/20 bg-info/5 p-4 text-info dark:border-info/30 dark:bg-info/10">
                        <div className="flex gap-3">
                          <ShieldCheck
                            aria-hidden="true"
                            className="mt-0.5 size-5 shrink-0"
                          />
                          <div className="grid gap-1">
                            <p className="text-card-title">
                              Private warranty documents
                            </p>
                            <p className="text-body-sm leading-relaxed">
                              Files are validated before upload and stored
                              privately. One purchase invoice and at least one
                              service invoice are required by the current
                              warranty workflow.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field
                          data-invalid={
                            form.formState.errors.vinNumber === undefined
                              ? undefined
                              : true
                          }
                        >
                          <FieldLabel htmlFor="warranty-vin">
                            VIN / serial number
                          </FieldLabel>
                          <Controller
                            control={form.control}
                            name="vinNumber"
                            render={({ field }) => (
                              <Input
                                id="warranty-vin"
                                type="text"
                                autoCapitalize="characters"
                                autoCorrect="off"
                                enterKeyHint="next"
                                maxLength={17}
                                placeholder="Vehicle VIN or product serial"
                                aria-invalid={
                                  form.formState.errors.vinNumber === undefined
                                    ? undefined
                                    : true
                                }
                                disabled={disabled}
                                value={field.value}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                                onChange={(event) => {
                                  field.onChange(
                                    normalizeVinInput(event.target.value),
                                  );
                                }}
                              />
                            )}
                          />
                          <FieldDescription>
                            Use 11–17 letters and digits. I, O, and Q are
                            excluded from standard VINs.
                          </FieldDescription>
                          {form.formState.errors.vinNumber?.message ===
                          undefined ? null : (
                            <FieldError>
                              {form.formState.errors.vinNumber.message}
                            </FieldError>
                          )}
                        </Field>

                        <Field
                          className="sm:col-span-2"
                          data-invalid={
                            form.formState.errors.componentDetails === undefined
                              ? undefined
                              : true
                          }
                        >
                          <FieldLabel htmlFor="warranty-component-details">
                            Component and concern details
                          </FieldLabel>
                          <Textarea
                            id="warranty-component-details"
                            rows={5}
                            maxLength={4_000}
                            enterKeyHint="done"
                            placeholder="Describe the battery, motor, controller, charger, or other component and explain the concern."
                            aria-invalid={
                              form.formState.errors.componentDetails ===
                              undefined
                                ? undefined
                                : true
                            }
                            disabled={disabled}
                            {...form.register("componentDetails")}
                          />
                          <div className="flex flex-col gap-1 text-caption text-muted-readable sm:flex-row sm:items-center sm:justify-between">
                            <span>
                              Do not enter OTPs, passwords, bank information,
                              identity documents, or unrelated personal data.
                            </span>
                            <span className="text-tabular">
                              {componentDetails.length}/4000
                            </span>
                          </div>
                          {form.formState.errors.componentDetails?.message ===
                          undefined ? null : (
                            <FieldError>
                              {form.formState.errors.componentDetails.message}
                            </FieldError>
                          )}
                        </Field>
                      </div>

                      <Field>
                        <FieldLabel htmlFor="warranty-purchase-invoice">
                          Purchase invoice
                        </FieldLabel>
                        <FieldDescription>
                          Exactly one purchase invoice is required.
                        </FieldDescription>

                        <InvoiceUploadPicker
                          inputId="warranty-purchase-invoice"
                          title={
                            purchaseInvoiceUpload?.status === "uploaded"
                              ? "Purchase invoice uploaded"
                              : "Choose purchase invoice"
                          }
                          description={`PDF, JPG, JPEG, PNG, or WEBP · up to ${formatBytes(
                            WARRANTY_APPLICATION_UPLOAD_MAX_BYTES,
                          )}`}
                          disabled={
                            disabled ||
                            purchaseInvoiceUpload?.status === "uploaded"
                          }
                          onFilesSelected={(files) => {
                            handlePurchaseInvoiceChange(
                              getFirstSelectedFile(files),
                            );
                          }}
                        >
                          {purchaseInvoiceUpload === null ? (
                            <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/30 p-3 text-body-sm text-muted-readable">
                              <UploadCloud
                                aria-hidden="true"
                                className="size-4 shrink-0"
                              />
                              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                No purchase invoice selected.
                              </span>
                            </div>
                          ) : (
                            <UploadItemCard
                              item={purchaseInvoiceUpload}
                              disabled={busy}
                              onRemove={() => {
                                resetSubmissionIntent();
                                setPurchaseInvoiceUpload(null);
                                setFormError(null);
                              }}
                              onRetry={() => {
                                void retryPurchaseInvoice(
                                  purchaseInvoiceUpload,
                                );
                              }}
                            />
                          )}
                        </InvoiceUploadPicker>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="warranty-service-invoices">
                          Service invoices
                        </FieldLabel>
                        <FieldDescription>
                          Select 1–{MAX_SERVICE_INVOICE_FILES_LABEL} service
                          invoices. Duplicate selections are ignored.
                        </FieldDescription>

                        <InvoiceUploadPicker
                          inputId="warranty-service-invoices"
                          title="Choose service invoices"
                          description={`Selected ${String(
                            serviceInvoiceUploads.length,
                          )} of ${MAX_SERVICE_INVOICE_FILES_LABEL} · PDF or image`}
                          multiple
                          disabled={
                            disabled ||
                            serviceInvoiceUploads.length >=
                              WARRANTY_APPLICATION_MAX_SERVICE_INVOICE_FILES
                          }
                          onFilesSelected={handleServiceInvoicesChange}
                        >
                          {serviceInvoiceUploads.length === 0 ? (
                            <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/30 p-3 text-body-sm text-muted-readable">
                              <UploadCloud
                                aria-hidden="true"
                                className="size-4 shrink-0"
                              />
                              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                No service invoices selected.
                              </span>
                            </div>
                          ) : (
                            <div className="grid min-w-0 max-w-full gap-3 overflow-hidden">
                              {serviceInvoiceUploads.map((item) => (
                                <UploadItemCard
                                  key={item.id}
                                  item={item}
                                  disabled={busy}
                                  onRemove={() => {
                                    resetSubmissionIntent();
                                    setServiceInvoiceUploads((current) =>
                                      current.filter(
                                        (currentItem) =>
                                          currentItem.id !== item.id,
                                      ),
                                    );
                                    setFormError(null);
                                  }}
                                  onRetry={() => {
                                    void retryServiceInvoice(item);
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </InvoiceUploadPicker>
                      </Field>

                      <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 text-muted-readable">
                        <LockKeyhole
                          aria-hidden="true"
                          className="mt-0.5 size-5 shrink-0 text-primary"
                        />
                        <p className="text-body-sm leading-relaxed">
                          Invoice uploads use the public warranty token only for
                          this request and are stored in private warranty
                          storage; they are not published through a public CDN.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </FieldGroup>
              </ContentForm>
            </ContentSection>

            <ContentStatus
              variant="info"
              role="note"
              icon={<Info aria-hidden="true" />}
              title="Your progress stays on this device"
              description="Entered details and selected files remain available while this page stays open. Uploaded files are private and linked only to this warranty request."
              className="lg:hidden"
            />
          </div>

          <aside
            className="hidden min-w-0 lg:sticky lg:top-20 lg:block"
            aria-label="Warranty application guidance"
          >
            <ContentSection
              title="Before you apply"
              description="Prepare these details and documents for a faster application."
              className="bg-card/90 shadow-md"
            >
              <WarrantyGuideContent />
            </ContentSection>
          </aside>
        </ContentSplit>
      </ContentRoot>
    </PublicWarrantyShell>
  );
}

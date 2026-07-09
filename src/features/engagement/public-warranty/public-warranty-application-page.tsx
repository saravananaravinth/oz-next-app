// oz-next-app/src/features/engagement/public-warranty/public-warranty-application-page.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ChevronLeft,
  FileCheck2,
  FileText,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useForm, type FieldPath } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { isApiHttpError } from "@/lib/api/problem";
import { cn } from "@/lib/utils";

import {
  isPublicWarrantyUploadError,
  submitPublicWarrantyApplication,
  uploadPublicWarrantyApplicationFile,
} from "./client";
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
} from "./schemas";

type SubmitState =
  | "checking-device"
  | "idle"
  | "submitting"
  | "success"
  | "invalid-link"
  | "desktop-device"
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
type WarrantyFieldPath = FieldPath<WarrantyApplicationFormValues>;

type InvoiceUploadItem = Readonly<{
  id: string;
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

type BrandIconMarkProps = Readonly<{
  className?: string;
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

const MOBILE_DEVICE_QUERY = "(max-width: 767px) and (pointer: coarse)";
const MAX_STEP_INDEX = 2;
const MAX_TEXT_LENGTH = 160;
const MAX_FILE_NAME_LENGTH = 140;

const INDIAN_MOBILE_PREFIX = "+91";
const C0_CONTROL_CHARACTER_MAX_CODE_POINT = 0x1f;
const DELETE_CONTROL_CHARACTER_CODE_POINT = 0x7f;
const MAX_SERVICE_INVOICE_FILES_LABEL = String(
  WARRANTY_APPLICATION_MAX_SERVICE_INVOICE_FILES,
);
const WHITESPACE_PATTERN = /\s+/gu;

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
  "checking-device": {
    title: "Preparing secure form",
    description:
      "Checking your device before opening the warranty application.",
  },
  idle: {
    title: "Warranty application",
    description: "Submit warranty details securely from your mobile device.",
  },
  submitting: {
    title: "Submitting securely",
    description:
      "Your warranty application is being sent through the secure ERP gateway.",
  },
  success: {
    title: "Application received",
    description: "Thank you. Ozotec EV has received your warranty application.",
  },
  "invalid-link": {
    title: "Invalid warranty link",
    description:
      "This warranty application link is invalid. Please use the latest link from Ozotec EV.",
  },
  "desktop-device": {
    title: "Open this link on your phone",
    description: "This public warranty form is designed for mobile devices.",
  },
  "api-error": {
    title: "Application could not be submitted",
    description:
      "We could not submit your warranty application right now. Please try again using the same link.",
  },
  "unexpected-error": {
    title: "Something went wrong",
    description:
      "The warranty application could not be completed. Please refresh the page and try again.",
  },
};

const STEPS = [
  {
    title: "Customer",
    description: "Your basic contact details.",
  },
  {
    title: "Address",
    description: "Where the vehicle or component is located.",
  },
  {
    title: "Warranty",
    description: "Vehicle, component, and invoice documents.",
  },
] as const satisfies readonly StepDefinition[];

const STEP_FIELDS = [
  ["name", "mobileNumber", "email"],
  ["addressLine1", "addressLine2", "city", "postalCode", "district", "state"],
  ["vinNumber", "componentDetails"],
] as const satisfies Record<StepIndex, readonly WarrantyFieldPath[]>;

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

function nextStepIndex(current: StepIndex): StepIndex {
  if (current === 0) return 1;
  if (current === 1) return 2;
  return 2;
}

function previousStepIndex(current: StepIndex): StepIndex {
  if (current === 2) return 1;
  if (current === 1) return 0;
  return 0;
}

function createIdempotencyKey(prefix = "warranty"): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  const timestamp = Date.now().toString(36);
  const random = Math.random()
    .toString(36)
    .slice(2)
    .padEnd(18, "0")
    .slice(0, 18);

  return `${prefix}:${timestamp}:${random}`;
}

function createUploadItemId(): string {
  return createIdempotencyKey("upload");
}

function useMobileDevice(): boolean | null {
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const media = window.matchMedia(MOBILE_DEVICE_QUERY);

    const update = (): void => {
      setIsMobile(media.matches);
    };

    update();
    media.addEventListener("change", update);

    return () => {
      media.removeEventListener("change", update);
    };
  }, []);

  return isMobile;
}

function normalizeMobileInput(value: string): string {
  return value.replace(/\D/gu, "").slice(-10);
}

function normalizePincodeInput(value: string): string {
  return value.replace(/\D/gu, "").slice(0, 6);
}

function normalizeVinInput(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-HJ-NPR-Z0-9]/gu, "")
    .slice(0, 17);
}

function optionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized === undefined || normalized.length === 0
    ? undefined
    : normalized;
}

function toIndianMobileE164(value: string): string {
  return `${INDIAN_MOBILE_PREFIX}${normalizeMobileInput(value)}`;
}

function isControlCharacter(value: string): boolean {
  const codePoint = value.codePointAt(0);

  if (codePoint === undefined) {
    return false;
  }

  return (
    codePoint <= C0_CONTROL_CHARACTER_MAX_CODE_POINT ||
    codePoint === DELETE_CONTROL_CHARACTER_CODE_POINT
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

function safeRequestId(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (
    normalized === undefined ||
    normalized.length === 0 ||
    normalized.length > 128 ||
    !/^[A-Za-z0-9_.:/@-]+$/u.test(normalized)
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
    const expiredOrUsed =
      error.status === 404 ||
      error.status === 409 ||
      code.includes("EXPIRED") ||
      code.includes("USED") ||
      code.includes("NOT_FOUND");

    return withRequestId(
      {
        title: expiredOrUsed
          ? "Link expired or already used"
          : STATE_COPY["api-error"].title,
        description: expiredOrUsed
          ? "This warranty application link is no longer active. Please use the latest link from Ozotec EV."
          : STATE_COPY["api-error"].description,
      },
      safeRequestId(error.requestId),
    );
  }

  if (isPublicWarrantyUploadError(error)) {
    const code = error.code.toUpperCase();
    const expiredOrUsed =
      error.status === 404 ||
      error.status === 409 ||
      code.includes("EXPIRED") ||
      code.includes("USED") ||
      code.includes("NOT_FOUND");

    return withRequestId(
      {
        title: expiredOrUsed
          ? "Link expired or already used"
          : "Invoice upload failed",
        description: expiredOrUsed
          ? "This warranty application link is no longer active. Please use the latest link from Ozotec EV."
          : error.message,
      },
      safeRequestId(error.requestId),
    );
  }

  return {
    title: STATE_COPY["unexpected-error"].title,
    description: STATE_COPY["unexpected-error"].description,
  };
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
    return `Invoice file must be ${formatBytes(WARRANTY_APPLICATION_UPLOAD_MAX_BYTES)} or smaller.`;
  }

  return null;
}

function createInvoiceUploadItem(file: File): InvoiceUploadItem {
  const validationError = validateInvoiceFile(file);

  return {
    id: createUploadItemId(),
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

function toSubmitRequest(
  values: WarrantyApplicationFormValues,
  invoices: InvoiceSubmissionIds,
): WarrantyApplicationSubmitRequest {
  const email = optionalString(values.email);
  const addressLine2 = optionalString(values.addressLine2);

  return {
    name: values.name,
    mobileNumber: toIndianMobileE164(values.mobileNumber),
    ...(email === undefined ? {} : { email }),
    addressLine1: values.addressLine1,
    ...(addressLine2 === undefined ? {} : { addressLine2 }),
    city: values.city,
    district: values.district,
    state: values.state,
    postalCode: values.postalCode,
    vinNumber: normalizeVinInput(values.vinNumber),
    componentDetails: values.componentDetails,
    purchaseInvoiceFileId: invoices.purchaseInvoiceFileId,
    serviceInvoiceFileIds: [...invoices.serviceInvoiceFileIds],
  };
}

function FieldMessage({
  message,
}: Readonly<{ message: string | undefined }>): React.ReactElement | null {
  if (message === undefined) {
    return null;
  }

  return <FieldError>{message}</FieldError>;
}

function BrandIconMark({ className }: BrandIconMarkProps): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-7 items-center justify-center", className)}
    >
      <Image
        src="/icon-light.svg"
        alt=""
        width={28}
        height={28}
        className="block h-7 w-7 dark:hidden"
        priority
      />
      <Image
        src="/icon-dark.svg"
        alt=""
        width={28}
        height={28}
        className="hidden h-7 w-7 dark:block"
        priority
      />
    </span>
  );
}

function UploadItemCard({
  item,
  disabled,
  onRemove,
}: Readonly<{
  item: InvoiceUploadItem;
  disabled: boolean;
  onRemove: () => void;
}>): React.ReactElement {
  const isQueued = item.status === "queued";
  const isUploading = item.status === "uploading";
  const isUploaded = item.status === "uploaded";
  const isFailed = item.status === "failed";
  const canRemove = !disabled && !isUploading && !isUploaded;

  return (
    <div
      className={cn(
        "grid min-w-0 max-w-full gap-3 overflow-hidden rounded-2xl border bg-background/45 p-3",
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
              : "border-border/70 bg-background/60 text-muted-readable",
            isFailed
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : undefined,
          )}
        >
          {isUploading ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : isUploaded ? (
            <FileCheck2 aria-hidden="true" className="size-4" />
          ) : (
            <FileText aria-hidden="true" className="size-4" />
          )}
        </div>

        <div className="grid min-w-0 flex-1 gap-1">
          <p className="truncate text-body-sm font-medium text-foreground">
            {item.fileName}
          </p>
          <p className="truncate text-caption text-muted-readable">
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
          className="h-8 shrink-0 px-2"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>

      {isQueued ? (
        <p className="rounded-xl bg-muted/40 px-3 py-2 text-caption text-muted-readable">
          Ready to upload when you submit.
        </p>
      ) : null}

      {isUploading ? (
        <div className="grid min-w-0 gap-1">
          <Progress
            value={item.progress}
            aria-label={`${item.fileName} upload progress`}
          />
          <p className="text-caption text-muted-readable">
            Uploading invoice securely…
          </p>
        </div>
      ) : null}

      {isUploaded ? (
        <p className="rounded-xl bg-success/10 px-3 py-2 text-caption text-success">
          Invoice uploaded and locked for submission.
        </p>
      ) : null}

      {isFailed ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-caption text-destructive">
          {item.error ?? "Invoice upload failed. Remove and try again."}
        </p>
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
    <div className="grid min-w-0 max-w-full gap-3 overflow-hidden rounded-3xl border border-border/70 bg-muted/25 p-3">
      <Input
        id={inputId}
        type="file"
        accept={WARRANTY_APPLICATION_UPLOAD_ACCEPT}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
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
          "flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-background/35 px-4 py-3 text-body-sm text-foreground transition hover:border-primary/50 hover:bg-primary/5",
          disabled && "pointer-events-none cursor-not-allowed opacity-60",
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <UploadCloud aria-hidden="true" className="size-4" />
        </span>

        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate font-medium">{title}</span>
          <span className="text-caption leading-relaxed text-muted-readable">
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

function BlockingStatusCard({
  state,
  error,
}: Readonly<{
  state: SubmitState;
  error?: UserFacingError;
}>): React.ReactElement {
  const copy = STATE_COPY[state];
  const isBusy = state === "checking-device" || state === "submitting";

  return (
    <main
      className="dark min-h-svh bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.16),_transparent_30rem),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.34))] px-4 py-5 text-foreground"
      style={{ colorScheme: "dark" }}
    >
      <section
        aria-labelledby="warranty-status-title"
        className="mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-md flex-col justify-center"
      >
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-2xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
          <CardHeader className="items-center gap-5 px-5 pt-6 text-center">
            <div className="relative flex size-14 items-center justify-center rounded-3xl border border-primary/15 bg-primary/10 shadow-xs">
              <BrandIconMark />
              {isBusy ? (
                <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border border-border bg-card">
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-3 animate-spin text-primary"
                  />
                </span>
              ) : null}
            </div>

            <div className="grid gap-2">
              <p className="text-overline text-muted-readable">Ozotec EV</p>
              <CardTitle
                id="warranty-status-title"
                className="text-section-title"
              >
                {copy.title}
              </CardTitle>
              <p className="text-body-sm text-muted-readable text-pretty">
                {copy.description}
              </p>
            </div>
          </CardHeader>

          {error === undefined ? null : (
            <CardContent>
              <Alert variant="destructive" role="alert">
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>{error.title}</AlertTitle>
                <AlertDescription>
                  <p>{error.description}</p>
                  {error.requestId === undefined ? null : (
                    <p className="mt-1 text-caption">
                      Reference:{" "}
                      <code className="break-all text-tabular">
                        {error.requestId}
                      </code>
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
          )}

          <CardFooter className="justify-center text-center text-caption text-muted-readable">
            <p>
              For your security, this page does not expose internal ERP data.
            </p>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}

export function PublicWarrantyApplicationPage(): React.ReactElement {
  const params = useParams<{ token?: string | string[] }>();
  const isMobile = useMobileDevice();

  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const tokenResult = React.useMemo(
    () => publicWarrantyTokenSchema.safeParse(rawToken ?? ""),
    [rawToken],
  );

  const [step, setStep] = React.useState<StepIndex>(0);
  const [submitState, setSubmitState] = React.useState<SubmitState>("idle");
  const [formError, setFormError] = React.useState<UserFacingError | null>(
    null,
  );
  const [purchaseInvoiceUpload, setPurchaseInvoiceUpload] =
    React.useState<InvoiceUploadItem | null>(null);
  const [serviceInvoiceUploads, setServiceInvoiceUploads] = React.useState<
    readonly InvoiceUploadItem[]
  >([]);
  const idempotencyKeyRef = React.useRef<string | null>(null);

  const form = useForm<WarrantyApplicationFormValues>({
    resolver: zodResolver(warrantyApplicationFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const busy = submitState === "submitting";
  const uploadsBusy =
    purchaseInvoiceUpload?.status === "uploading" ||
    serviceInvoiceUploads.some((item) => item.status === "uploading");
  const progressValue = ((step + 1) / STEPS.length) * 100;
  const pageDisabled = busy || isMobile !== true;
  const submitDisabled = pageDisabled || uploadsBusy;

  if (!tokenResult.success) {
    return <BlockingStatusCard state="invalid-link" />;
  }

  if (isMobile === null) {
    return <BlockingStatusCard state="checking-device" />;
  }

  if (!isMobile) {
    return <BlockingStatusCard state="desktop-device" />;
  }

  if (submitState === "success") {
    return <BlockingStatusCard state="success" />;
  }

  const token = tokenResult.data;
  const currentStep = STEPS[step];
  const currentStepFields = STEP_FIELDS[step];

  function validateInvoiceSelection(): UserFacingError | null {
    if (purchaseInvoiceUpload === null) {
      return {
        title: "Purchase invoice required",
        description:
          "Upload your purchase invoice as a PDF or image before submitting.",
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
          "Remove the selected purchase invoice and upload a valid file.",
      };
    }

    if (serviceInvoiceUploads.length === 0) {
      return {
        title: "Service invoice required",
        description:
          "Upload at least one service invoice as a PDF or image before submitting.",
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
          "Remove invalid service invoices and upload valid PDF or image files.",
      };
    }

    if (
      serviceInvoiceUploads.length >
      WARRANTY_APPLICATION_MAX_SERVICE_INVOICE_FILES
    ) {
      return {
        title: "Too many service invoices",
        description: `Upload up to ${MAX_SERVICE_INVOICE_FILES_LABEL} service invoice files.`,
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
    onProgress: (id: string, progress: number) => void,
    onUpdate: (id: string, next: InvoiceUploadItem) => void,
  ): Promise<InvoiceUploadItem> {
    if (item.status === "uploaded" && item.fileId !== null) {
      return item;
    }

    if (!item.retryable) {
      return item;
    }

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
          token,
          purpose,
          file: item.file,
          idempotencyKey: createIdempotencyKey(
            purpose === "PURCHASE_INVOICE"
              ? "warranty-purchase-invoice-upload"
              : "warranty-service-invoice-upload",
          ),
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
        retryable: true,
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
        retryable: true,
      };

      onUpdate(item.id, failedItem);
      throw caught;
    }
  }

  async function uploadRequiredInvoices(): Promise<InvoiceSubmissionIds> {
    const purchaseItem = purchaseInvoiceUpload;

    if (purchaseItem === null) {
      throw new Error("Purchase invoice is required.");
    }

    const uploadedPurchase = await uploadInvoiceItem(
      purchaseItem,
      "PURCHASE_INVOICE",
      updatePurchaseUploadProgress,
      updatePurchaseUpload,
    );

    if (uploadedPurchase.fileId === null) {
      throw new Error("Purchase invoice upload failed.");
    }

    const uploadedServiceItems = await Promise.all(
      serviceInvoiceUploads.map(async (item) => {
        return await uploadInvoiceItem(
          item,
          "SERVICE_INVOICE",
          updateServiceUploadProgress,
          updateServiceUpload,
        );
      }),
    );

    const serviceInvoiceFileIds = uploadedServiceItems
      .map((item) => item.fileId)
      .filter((fileId): fileId is string => fileId !== null);

    if (serviceInvoiceFileIds.length === 0) {
      throw new Error("At least one service invoice is required.");
    }

    return {
      purchaseInvoiceFileId: uploadedPurchase.fileId,
      serviceInvoiceFileIds,
    };
  }

  function handlePurchaseInvoiceChange(file: File | null): void {
    if (file === null) {
      return;
    }

    setFormError(null);
    setPurchaseInvoiceUpload(createInvoiceUploadItem(file));
  }

  function handleServiceInvoicesChange(files: readonly File[]): void {
    if (files.length === 0) {
      return;
    }

    setFormError(null);

    const remainingSlots =
      WARRANTY_APPLICATION_MAX_SERVICE_INVOICE_FILES -
      serviceInvoiceUploads.length;

    if (remainingSlots <= 0) {
      setFormError({
        title: "Service invoice limit reached",
        description: `You can upload up to ${MAX_SERVICE_INVOICE_FILES_LABEL} service invoices.`,
      });
      return;
    }

    const acceptedFiles = files.slice(0, remainingSlots);
    const rejectedCount = files.length - acceptedFiles.length;
    const remainingSlotsLabel = String(remainingSlots);
    const serviceInvoicePluralSuffix = remainingSlots === 1 ? "" : "s";
    const rejectedFilesDescription = `Only ${remainingSlotsLabel} more service invoice file${serviceInvoicePluralSuffix} can be added.`;

    if (rejectedCount > 0) {
      setFormError({
        title: "Some files were not added",
        description: rejectedFilesDescription,
      });
    }

    setServiceInvoiceUploads((current) => [
      ...current,
      ...acceptedFiles.map(createInvoiceUploadItem),
    ]);
  }

  async function goNext(): Promise<void> {
    const valid = await form.trigger([...currentStepFields], {
      shouldFocus: true,
    });

    if (!valid) {
      return;
    }

    setFormError(null);
    setStep(nextStepIndex);
  }

  function goBack(): void {
    setFormError(null);
    setStep(previousStepIndex);
  }

  async function onSubmit(
    values: WarrantyApplicationFormValues,
  ): Promise<void> {
    setFormError(null);

    const invoiceError = validateInvoiceSelection();

    if (invoiceError !== null) {
      setFormError(invoiceError);
      return;
    }

    setSubmitState("submitting");

    const idempotencyKey = idempotencyKeyRef.current ?? createIdempotencyKey();
    idempotencyKeyRef.current = idempotencyKey;

    try {
      const invoiceSubmissionIds = await uploadRequiredInvoices();

      await submitPublicWarrantyApplication({
        token,
        application: toSubmitRequest(values, invoiceSubmissionIds),
        idempotencyKey,
      });

      setSubmitState("success");
    } catch (caught) {
      const nextError = errorFromUnknown(caught);
      setFormError(nextError);
      setSubmitState("api-error");
    }
  }

  function handleFormSubmit(
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ): void {
    void form.handleSubmit(onSubmit)(event);
  }

  return (
    <main
      className="dark min-h-svh bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.14),_transparent_30rem),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))] px-4 py-5 text-foreground"
      style={{ colorScheme: "dark" }}
    >
      <section
        aria-labelledby="warranty-form-title"
        className="mx-auto grid min-h-[calc(100svh-2.5rem)] w-full max-w-md content-center"
      >
        <form onSubmit={handleFormSubmit} noValidate>
          <Card className="overflow-hidden border-border/70 bg-card/95 shadow-2xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
            <CardHeader className="gap-5 px-5 pt-6">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-3xl border border-primary/15 bg-primary/10 shadow-xs">
                  <BrandIconMark className="size-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-overline text-muted-readable">Ozotec EV</p>
                  <CardTitle
                    id="warranty-form-title"
                    className="text-section-title"
                  >
                    Warranty application
                  </CardTitle>
                  <p className="mt-1 text-body-sm text-muted-readable text-pretty">
                    {currentStep.description}
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3 text-caption text-muted-readable">
                  <span>{currentStep.title}</span>
                  <span>
                    Step {step + 1} of {STEPS.length}
                  </span>
                </div>
                <Progress
                  value={progressValue}
                  aria-label="Warranty form progress"
                />
              </div>
            </CardHeader>

            <CardContent className="grid gap-5 px-5">
              {formError === null ? null : (
                <Alert variant="destructive" role="alert">
                  <AlertTriangle aria-hidden="true" />
                  <AlertTitle>{formError.title}</AlertTitle>
                  <AlertDescription>
                    <p>{formError.description}</p>
                    {formError.requestId === undefined ? null : (
                      <p className="mt-1 text-caption">
                        Reference:{" "}
                        <code className="break-all text-tabular">
                          {formError.requestId}
                        </code>
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {step === 0 ? (
                <div className="grid gap-4">
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
                      disabled={pageDisabled}
                      {...form.register("name")}
                    />
                    <FieldMessage
                      message={form.formState.errors.name?.message}
                    />
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
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-body-sm text-muted-readable">
                        {INDIAN_MOBILE_PREFIX}
                      </span>
                      <Input
                        id="warranty-mobile"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        enterKeyHint="next"
                        maxLength={10}
                        placeholder="9876543210"
                        className="pl-12"
                        aria-invalid={
                          form.formState.errors.mobileNumber === undefined
                            ? undefined
                            : true
                        }
                        disabled={pageDisabled}
                        onInput={(event) => {
                          event.currentTarget.value = normalizeMobileInput(
                            event.currentTarget.value,
                          );
                        }}
                        {...form.register("mobileNumber")}
                      />
                    </div>
                    <FieldMessage
                      message={form.formState.errors.mobileNumber?.message}
                    />
                  </Field>

                  <Field
                    data-invalid={
                      form.formState.errors.email === undefined
                        ? undefined
                        : true
                    }
                  >
                    <FieldLabel htmlFor="warranty-email">
                      Email{" "}
                      <span className="text-muted-readable">(optional)</span>
                    </FieldLabel>
                    <Input
                      id="warranty-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      enterKeyHint="next"
                      placeholder="you@example.com"
                      aria-invalid={
                        form.formState.errors.email === undefined
                          ? undefined
                          : true
                      }
                      disabled={pageDisabled}
                      {...form.register("email")}
                    />
                    <FieldMessage
                      message={form.formState.errors.email?.message}
                    />
                  </Field>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="grid gap-4">
                  <Field
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
                      placeholder="House / street / area"
                      aria-invalid={
                        form.formState.errors.addressLine1 === undefined
                          ? undefined
                          : true
                      }
                      disabled={pageDisabled}
                      {...form.register("addressLine1")}
                    />
                    <FieldMessage
                      message={form.formState.errors.addressLine1?.message}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="warranty-address-line-2">
                      Address line 2{" "}
                      <span className="text-muted-readable">(optional)</span>
                    </FieldLabel>
                    <Input
                      id="warranty-address-line-2"
                      type="text"
                      autoComplete="address-line2"
                      enterKeyHint="next"
                      placeholder="Landmark or nearby location"
                      disabled={pageDisabled}
                      {...form.register("addressLine2")}
                    />
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
                      disabled={pageDisabled}
                      {...form.register("city")}
                    />
                    <FieldMessage
                      message={form.formState.errors.city?.message}
                    />
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
                    <Input
                      id="warranty-postal-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      enterKeyHint="next"
                      maxLength={6}
                      placeholder="600001"
                      aria-invalid={
                        form.formState.errors.postalCode === undefined
                          ? undefined
                          : true
                      }
                      disabled={pageDisabled}
                      onInput={(event) => {
                        event.currentTarget.value = normalizePincodeInput(
                          event.currentTarget.value,
                        );
                      }}
                      {...form.register("postalCode")}
                    />
                    <FieldMessage
                      message={form.formState.errors.postalCode?.message}
                    />
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
                      autoComplete="address-level2"
                      enterKeyHint="next"
                      placeholder="District"
                      aria-invalid={
                        form.formState.errors.district === undefined
                          ? undefined
                          : true
                      }
                      disabled={pageDisabled}
                      {...form.register("district")}
                    />
                    <FieldMessage
                      message={form.formState.errors.district?.message}
                    />
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
                      disabled={pageDisabled}
                      {...form.register("state")}
                    />
                    <FieldMessage
                      message={form.formState.errors.state?.message}
                    />
                  </Field>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-4">
                  <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/35 p-4">
                    <div className="flex gap-3">
                      <ShieldCheck
                        aria-hidden="true"
                        className="mt-0.5 size-5 shrink-0 text-primary"
                      />
                      <div className="grid gap-1">
                        <p className="text-card-title">
                          Secure warranty review
                        </p>
                        <p className="text-body-sm text-muted-readable">
                          Upload invoices as PDF or image files. They are sent
                          only when you submit this warranty application.
                        </p>
                      </div>
                    </div>
                  </div>

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
                    <Input
                      id="warranty-vin"
                      type="text"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      enterKeyHint="next"
                      placeholder="Vehicle VIN or product serial"
                      aria-invalid={
                        form.formState.errors.vinNumber === undefined
                          ? undefined
                          : true
                      }
                      disabled={pageDisabled}
                      onInput={(event) => {
                        event.currentTarget.value = normalizeVinInput(
                          event.currentTarget.value,
                        );
                      }}
                      {...form.register("vinNumber")}
                    />
                    <FieldMessage
                      message={form.formState.errors.vinNumber?.message}
                    />
                  </Field>

                  <Field
                    data-invalid={
                      form.formState.errors.componentDetails === undefined
                        ? undefined
                        : true
                    }
                  >
                    <FieldLabel htmlFor="warranty-component-details">
                      Component details
                    </FieldLabel>
                    <Textarea
                      id="warranty-component-details"
                      rows={4}
                      enterKeyHint="next"
                      placeholder="Describe the battery, motor, controller, charger, or other component issue."
                      aria-invalid={
                        form.formState.errors.componentDetails === undefined
                          ? undefined
                          : true
                      }
                      disabled={pageDisabled}
                      {...form.register("componentDetails")}
                    />
                    <FieldMessage
                      message={form.formState.errors.componentDetails?.message}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="warranty-purchase-invoice">
                      Purchase invoice
                    </FieldLabel>

                    <InvoiceUploadPicker
                      inputId="warranty-purchase-invoice"
                      title="Choose purchase invoice"
                      description={`PDF, JPG, PNG, or WEBP · up to ${formatBytes(
                        WARRANTY_APPLICATION_UPLOAD_MAX_BYTES,
                      )}`}
                      disabled={
                        pageDisabled ||
                        purchaseInvoiceUpload?.status === "uploading"
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
                          <span className="min-w-0 truncate">
                            No purchase invoice selected yet.
                          </span>
                        </div>
                      ) : (
                        <UploadItemCard
                          item={purchaseInvoiceUpload}
                          disabled={pageDisabled || busy}
                          onRemove={() => {
                            setPurchaseInvoiceUpload(null);
                            setFormError(null);
                          }}
                        />
                      )}
                    </InvoiceUploadPicker>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="warranty-service-invoices">
                      Service invoices
                    </FieldLabel>

                    <InvoiceUploadPicker
                      inputId="warranty-service-invoices"
                      title="Choose service invoices"
                      description={`Up to ${MAX_SERVICE_INVOICE_FILES_LABEL} files · PDF or image`}
                      multiple
                      disabled={
                        pageDisabled ||
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
                          <span className="min-w-0 truncate">
                            No service invoices selected yet.
                          </span>
                        </div>
                      ) : (
                        <div className="grid min-w-0 max-w-full gap-3 overflow-hidden">
                          {serviceInvoiceUploads.map((item) => (
                            <UploadItemCard
                              key={item.id}
                              item={item}
                              disabled={pageDisabled || busy}
                              onRemove={() => {
                                setServiceInvoiceUploads((current) =>
                                  current.filter(
                                    (currentItem) => currentItem.id !== item.id,
                                  ),
                                );
                                setFormError(null);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </InvoiceUploadPicker>
                  </Field>
                </div>
              ) : null}
            </CardContent>

            <CardFooter className="grid gap-4 border-t border-border/70 bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-2 text-caption text-muted-readable">
                <LockKeyhole aria-hidden="true" className="size-3.5" />
                <span>Submitted through the secure ERP gateway.</span>
              </div>

              <div className="grid grid-cols-[auto_1fr] gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || step === 0}
                  onClick={goBack}
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                  Back
                </Button>

                {step < MAX_STEP_INDEX ? (
                  <Button
                    type="button"
                    disabled={pageDisabled}
                    onClick={() => void goNext()}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitDisabled}>
                    {busy ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="size-4 animate-spin"
                      />
                    ) : uploadsBusy ? (
                      <RefreshCw
                        aria-hidden="true"
                        className="size-4 animate-spin"
                      />
                    ) : (
                      <FileCheck2 aria-hidden="true" className="size-4" />
                    )}
                    Submit warranty
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </form>
      </section>
    </main>
  );
}

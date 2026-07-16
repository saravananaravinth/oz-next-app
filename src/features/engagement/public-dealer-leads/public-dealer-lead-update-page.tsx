// oz-next-app/src/features/engagement/public-dealer-leads/public-dealer-lead-update-page.tsx
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Phone,
  Route,
  Save,
  Send,
  UserRound,
} from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { isApiHttpError } from "@/lib/api/problem";
import { cn } from "@/lib/utils";
import { idempotencyKey as createIdempotencyKey } from "@/lib/uuid";

import { PublicFormStatusEmblem } from "../public-form-status-emblem";
import { forwardPublicDealerLead, updatePublicDealerLead } from "./client";
import { PublicDealerLeadShell } from "./public-dealer-lead-shell";
import {
  DEALER_LEAD_STATUS_VALUES,
  dealerLeadForwardFormSchema,
  dealerLeadForwardRequestSchema,
  dealerLeadUpdateFormSchema,
  dealerLeadUpdateRequestSchema,
  type DealerLeadEditableField,
  type DealerLeadForwardFormValues,
  type DealerLeadForwardRequest,
  type DealerLeadPublicView,
  type DealerLeadStatus,
  type DealerLeadUpdateFormValues,
  type DealerLeadUpdateRequest,
  type IvrFlowCode,
} from "./schemas";

export type PublicDealerLeadUpdatePageProps = Readonly<{
  token: string;
  initialLead: DealerLeadPublicView | null;
  loadError?: Readonly<{
    reason: "invalid-token" | "not-found" | "unavailable";
    requestId?: string;
  }>;
}>;

type ActionMode = "UPDATE" | "FORWARD";
type PendingAction = ActionMode | null;

type UserFacingError = Readonly<{
  title: string;
  description: string;
  requestId?: string;
}>;

type SuccessNotice = Readonly<{
  title: string;
  description: string;
}>;

type ChoiceOption<TValue extends string> = Readonly<{
  value: TValue;
  label: string;
  description: string;
}>;

type MutationIntent = Readonly<{
  fingerprint: string;
  key: string;
}>;

type MutableIntentRef = {
  current: MutationIntent | null;
};

const UPDATE_FORM_ID = "public-dealer-lead-update-form";
const FORWARD_FORM_ID = "public-dealer-lead-forward-form";
const EMPTY_VALUE = "";
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/u;
const DATE_TIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u;
const GOOGLE_MAPS_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "maps.google.com",
]);

const UPDATE_EDITABLE_FIELDS = [
  "customerName",
  "status",
  "followUpAt",
  "note",
] as const satisfies readonly DealerLeadEditableField[];

const STATUS_OPTIONS = [
  {
    value: "CONTACTED",
    label: "Contacted",
    description: "The customer was reached successfully.",
  },
  {
    value: "INTERESTED",
    label: "Interested",
    description: "The customer is interested and needs follow-up.",
  },
  {
    value: "NOT_REACHABLE",
    label: "Not reachable",
    description: "The customer did not answer or could not be reached.",
  },
  {
    value: "NOT_INTERESTED",
    label: "Not interested",
    description: "The customer is not interested at this time.",
  },
] as const satisfies ReadonlyArray<ChoiceOption<DealerLeadStatus>>;

const FORWARD_OPTIONS = [
  {
    value: "VEHICLE_ENQUIRIES",
    label: "Vehicle enquiry",
    description: "Keep the lead in the vehicle-enquiry workflow.",
  },
  {
    value: "DEALERSHIP",
    label: "Dealership enquiry",
    description: "Route the lead to the dealership-partnership workflow.",
  },
  {
    value: "SERVICE_ENQUIRIES",
    label: "Service support",
    description: "Route the lead to the service-support workflow.",
  },
  {
    value: "WARRANTY_TAMIL",
    label: "Warranty support — Tamil",
    description: "Route the lead to the Tamil warranty-support workflow.",
  },
] as const satisfies ReadonlyArray<ChoiceOption<IvrFlowCode>>;

const STATUS_LABELS = new Map<DealerLeadStatus, string>(
  STATUS_OPTIONS.map((option) => [option.value, option.label]),
);
const STATUS_DESCRIPTIONS = new Map<DealerLeadStatus, string>(
  STATUS_OPTIONS.map((option) => [option.value, option.description]),
);
const FORWARD_DESCRIPTIONS = new Map<IvrFlowCode, string>(
  FORWARD_OPTIONS.map((option) => [option.value, option.description]),
);

function safeRequestId(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (
    normalized === undefined ||
    normalized.length === 0 ||
    !SAFE_REQUEST_ID_PATTERN.test(normalized)
  ) {
    return undefined;
  }

  return normalized;
}

function isDealerLeadStatus(
  value: string | null | undefined,
): value is DealerLeadStatus {
  return DEALER_LEAD_STATUS_VALUES.some((status) => status === value);
}

function humanizeCode(
  value: string | null | undefined,
  fallback: string,
): string {
  const normalized = value?.trim();

  if (normalized === undefined || normalized.length === 0) {
    return fallback;
  }

  return normalized
    .replace(/_/gu, " ")
    .toLowerCase()
    .replace(/\b\w/gu, (match) => match.toUpperCase());
}

function formatStatus(value: string | null | undefined): string {
  if (isDealerLeadStatus(value)) {
    return STATUS_LABELS.get(value) ?? value;
  }

  return humanizeCode(value, "Open");
}

function formatDateTime(value: string | null): string {
  if (value === null) {
    return "Not scheduled";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toDateTimeLocalValue(value: string | null): string {
  if (value === null) {
    return EMPTY_VALUE;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return EMPTY_VALUE;
  }

  const pad = (part: number): string => String(part).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function toIsoOffsetDateTimeFromLocal(value: string): string | null {
  const normalized = value.trim();
  const match = DATE_TIME_LOCAL_PATTERN.exec(normalized);

  if (match === null) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0,
  );

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day) ||
    date.getHours() !== Number(hour) ||
    date.getMinutes() !== Number(minute)
  ) {
    return null;
  }

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHour = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const offsetMinute = String(absoluteOffset % 60).padStart(2, "0");

  return `${normalized}:00${sign}${offsetHour}:${offsetMinute}`;
}

function safeMapsHref(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      !GOOGLE_MAPS_HOSTS.has(url.hostname) ||
      !url.pathname.startsWith("/maps")
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function toUserFacingError(error: unknown): UserFacingError {
  if (isApiHttpError(error)) {
    const requestId = safeRequestId(error.requestId);
    let baseError: Omit<UserFacingError, "requestId">;

    if (error.status === 404 || error.status === 409 || error.status === 410) {
      baseError = {
        title: "Enquiry link is no longer available",
        description:
          "This secure follow-up link is invalid, expired, exhausted, or no longer assigned.",
      };
    } else if (error.status === 429) {
      baseError = {
        title: "Too many attempts",
        description:
          "Please wait briefly before submitting another follow-up action.",
      };
    } else if (error.status >= 500) {
      baseError = {
        title: "Follow-up service is temporarily unavailable",
        description:
          "Your entered details remain on this page. Please try again shortly.",
      };
    } else {
      baseError = {
        title: "Follow-up could not be submitted",
        description: "Review the entered details and try again.",
      };
    }

    return requestId === undefined ? baseError : { ...baseError, requestId };
  }

  return {
    title: "Unexpected error",
    description:
      "The follow-up action could not be completed. Please try again.",
  };
}

function buildUpdateFormValues(
  lead: DealerLeadPublicView | null,
): DealerLeadUpdateFormValues {
  return {
    customerName:
      lead?.dealerUpdate.latestCustomerName ?? lead?.customer.name ?? "",
    status: isDealerLeadStatus(lead?.dealerUpdate.latestStatus)
      ? lead.dealerUpdate.latestStatus
      : "",
    followUpAtLocal: toDateTimeLocalValue(lead?.nextFollowUpAt ?? null),
    note: lead?.dealerUpdate.latestNote ?? "",
  };
}

function resolveIntentKey(
  intentRef: MutableIntentRef,
  prefix: string,
  payload: unknown,
): string {
  const fingerprint = JSON.stringify(payload);
  const currentIntent = intentRef.current;

  if (currentIntent !== null && currentIntent.fingerprint === fingerprint) {
    return currentIntent.key;
  }

  const key = createIdempotencyKey(prefix);
  intentRef.current = { fingerprint, key };

  return key;
}

function remainingUseCopy(remainingUses: number): string {
  return `${String(remainingUses)} ${remainingUses === 1 ? "action" : "actions"} remaining`;
}

function FieldMessage({
  message,
}: Readonly<{ message: string | undefined }>): React.ReactElement | null {
  return message === undefined ? null : <FieldError>{message}</FieldError>;
}

function ChoiceCards<TValue extends string>({
  name,
  value,
  options,
  disabled,
  onChange,
}: Readonly<{
  name: string;
  value: TValue;
  options: ReadonlyArray<ChoiceOption<TValue>>;
  disabled: boolean;
  onChange: (value: TValue) => void;
}>): React.ReactElement {
  return (
    <RadioGroup
      value={value}
      onValueChange={(nextValue: string) => {
        const selected = options.find((option) => option.value === nextValue);

        if (selected !== undefined) {
          onChange(selected.value);
        }
      }}
      disabled={disabled}
      className="grid gap-3 sm:grid-cols-2"
    >
      {options.map((option) => {
        const id = `${name}-${option.value.toLowerCase().replace(/_/gu, "-")}`;
        const checked = value === option.value;

        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              "group flex min-h-24 cursor-pointer items-start gap-3 rounded-2xl border bg-card px-4 py-3.5 text-left shadow-xs transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out",
              "hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/4 hover:shadow-md focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 motion-reduce:transform-none motion-reduce:transition-none",
              checked
                ? "border-primary/55 bg-primary/8 shadow-primary/10"
                : "border-border/80",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <RadioGroupItem
              id={id}
              value={option.value}
              aria-label={option.label}
              className="mt-0.5 size-5"
            />

            <span className="grid min-w-0 flex-1 gap-1">
              <span className="text-body text-foreground [font-weight:var(--typography-emphasis-weight)]">
                {option.label}
              </span>
              <span className="text-body-sm leading-relaxed text-muted-readable">
                {option.description}
              </span>
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

function ActionModeSelector({
  value,
  updateAvailable,
  forwardAvailable,
  disabled,
  onChange,
}: Readonly<{
  value: ActionMode;
  updateAvailable: boolean;
  forwardAvailable: boolean;
  disabled: boolean;
  onChange: (value: ActionMode) => void;
}>): React.ReactElement {
  return (
    <div
      role="group"
      aria-label="Choose follow-up action"
      className="grid gap-3 sm:grid-cols-2"
    >
      <button
        type="button"
        aria-pressed={value === "UPDATE"}
        disabled={disabled || !updateAvailable}
        onClick={() => {
          onChange("UPDATE");
        }}
        className={cn(
          "flex min-h-20 items-start gap-3 rounded-2xl border px-4 py-3.5 text-left shadow-xs outline-none transition-[border-color,background-color,box-shadow,transform] duration-150",
          "hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 motion-reduce:transform-none motion-reduce:transition-none",
          value === "UPDATE"
            ? "border-primary/55 bg-primary/8"
            : "border-border/80 bg-card",
          (disabled || !updateAvailable) &&
            "cursor-not-allowed opacity-55 hover:translate-y-0 hover:border-border/80 hover:shadow-xs",
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
          <Save aria-hidden="true" className="size-5" />
        </span>
        <span className="grid gap-1">
          <span className="text-card-title">Update follow-up</span>
          <span className="text-body-sm leading-relaxed text-muted-readable">
            Record the customer response, next follow-up, name, or call note.
          </span>
        </span>
      </button>

      <button
        type="button"
        aria-pressed={value === "FORWARD"}
        disabled={disabled || !forwardAvailable}
        onClick={() => {
          onChange("FORWARD");
        }}
        className={cn(
          "flex min-h-20 items-start gap-3 rounded-2xl border px-4 py-3.5 text-left shadow-xs outline-none transition-[border-color,background-color,box-shadow,transform] duration-150",
          "hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 motion-reduce:transform-none motion-reduce:transition-none",
          value === "FORWARD"
            ? "border-primary/55 bg-primary/8"
            : "border-border/80 bg-card",
          (disabled || !forwardAvailable) &&
            "cursor-not-allowed opacity-55 hover:translate-y-0 hover:border-border/80 hover:shadow-xs",
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
          <Route aria-hidden="true" className="size-5" />
        </span>
        <span className="grid gap-1">
          <span className="text-card-title">Route enquiry</span>
          <span className="text-body-sm leading-relaxed text-muted-readable">
            Send the lead to the correct vehicle, dealership, service, or
            warranty workflow.
          </span>
        </span>
      </button>
    </div>
  );
}

function LeadSummary({
  lead,
}: Readonly<{ lead: DealerLeadPublicView }>): React.ReactElement {
  const mapsHref = safeMapsHref(lead.customer.googleMapsUrl);
  const customerName =
    lead.dealerUpdate.latestCustomerName ?? lead.customer.name ?? "Customer";
  const location = [
    lead.customer.city,
    lead.customer.district,
    lead.customer.state,
    lead.customer.postalCode,
  ]
    .filter((item): item is string => item !== null && item.trim().length > 0)
    .join(", ");

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-border/70 bg-muted/30 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <p className="text-caption text-muted-readable">Enquiry number</p>
            <p className="truncate text-page-title tracking-tight">
              {lead.leadNo}
            </p>
          </div>
          <Badge className="shrink-0 rounded-full">
            {formatStatus(lead.status)}
          </Badge>
        </div>

        <div className="mt-4 grid gap-2 rounded-2xl border border-border/70 bg-background/65 p-4">
          <p className="flex items-center gap-2 text-card-title">
            <UserRound aria-hidden="true" className="size-4 text-primary" />
            {customerName}
          </p>

          {lead.customer.phoneMasked === null ? null : (
            <p className="flex items-center gap-2 text-body-sm text-muted-readable">
              <Phone aria-hidden="true" className="size-4" />
              {lead.customer.phoneMasked}
            </p>
          )}

          {location.length === 0 ? null : (
            <p className="flex items-start gap-2 text-body-sm text-muted-readable">
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{location}</span>
            </p>
          )}

          {mapsHref === null ? null : (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-1 rounded-2xl"
            >
              <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                Open location
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <dl className="grid gap-3 rounded-3xl border border-border/70 bg-card p-4 text-body-sm sm:p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3">
          <dt className="text-muted-readable">Pipeline</dt>
          <dd className="text-right">
            {lead.pipeline.name ??
              humanizeCode(lead.pipeline.code, "Not assigned")}
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3">
          <dt className="text-muted-readable">Current step</dt>
          <dd className="text-right">
            {lead.stage.name ?? humanizeCode(lead.stage.code, "Not assigned")}
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3">
          <dt className="text-muted-readable">Lead source</dt>
          <dd className="text-right">
            {lead.source.name ??
              humanizeCode(lead.source.code, "Not available")}
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3">
          <dt className="text-muted-readable">Latest response</dt>
          <dd className="text-right">
            {formatStatus(lead.dealerUpdate.latestStatus)}
          </dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3">
          <dt className="text-muted-readable">Next follow-up</dt>
          <dd className="text-right">{formatDateTime(lead.nextFollowUpAt)}</dd>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3">
          <dt className="text-muted-readable">Secure-link access</dt>
          <dd className="text-right">
            {remainingUseCopy(lead.dealerUpdate.remainingUses)}
          </dd>
        </div>
      </dl>

      {lead.dealerUpdate.latestNote === null ? null : (
        <div className="rounded-3xl border border-border/70 bg-muted/25 p-4 sm:p-5">
          <p className="text-caption text-muted-readable">Latest call note</p>
          <p className="mt-1 whitespace-pre-wrap text-body-sm leading-relaxed">
            {lead.dealerUpdate.latestNote}
          </p>
        </div>
      )}
    </div>
  );
}

function LoadFailureScreen({
  error,
}: Readonly<{
  error: PublicDealerLeadUpdatePageProps["loadError"];
}>): React.ReactElement {
  const unavailable = error?.reason === "unavailable";
  const title = unavailable
    ? "Vehicle enquiry details are temporarily unavailable"
    : "Enquiry link is not available";
  const description = unavailable
    ? "Please retry after a few moments. No follow-up action was submitted."
    : "This secure enquiry link is invalid, expired, exhausted, or no longer assigned.";
  const requestId = safeRequestId(error?.requestId);

  return (
    <PublicDealerLeadShell
      mainLabelledBy="dealer-lead-load-error-title"
      mainClassName="items-center"
    >
      <section className="w-full max-w-xl px-4 sm:px-0">
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
          <CardHeader className="items-center gap-5 px-5 pt-7 text-center sm:px-8 sm:pt-9">
            <PublicFormStatusEmblem status="error" />
            <div className="grid gap-2">
              <p className="text-overline text-muted-readable">
                Vehicle enquiry follow-up
              </p>
              <CardTitle
                id="dealer-lead-load-error-title"
                className="text-section-title text-balance"
              >
                {title}
              </CardTitle>
              <CardDescription className="mx-auto max-w-md text-body-sm text-pretty text-muted-readable">
                {description}
              </CardDescription>
            </div>
          </CardHeader>

          {requestId === undefined ? null : (
            <CardContent className="px-5 pb-7 sm:px-8 sm:pb-9">
              <Alert variant="destructive" role="alert">
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>Request reference</AlertTitle>
                <AlertDescription>
                  <code className="break-all text-tabular">{requestId}</code>
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
        </Card>
      </section>
    </PublicDealerLeadShell>
  );
}

export function PublicDealerLeadUpdatePage({
  token,
  initialLead,
  loadError,
}: PublicDealerLeadUpdatePageProps): React.ReactElement {
  const [lead, setLead] = React.useState<DealerLeadPublicView | null>(
    initialLead,
  );
  const [requestedMode, setRequestedMode] = React.useState<ActionMode>(() => {
    if (initialLead?.dealerUpdate.canUpdate === true) {
      return "UPDATE";
    }

    return "FORWARD";
  });
  const [pendingAction, setPendingAction] = React.useState<PendingAction>(null);
  const [mutationError, setMutationError] =
    React.useState<UserFacingError | null>(null);
  const [successNotice, setSuccessNotice] =
    React.useState<SuccessNotice | null>(null);
  const [updateBaseline, setUpdateBaseline] =
    React.useState<DealerLeadUpdateFormValues>(() =>
      buildUpdateFormValues(initialLead),
    );

  const mainRef = React.useRef<HTMLElement | null>(null);
  const actionHeadingRef = React.useRef<HTMLHeadingElement | null>(null);
  const modeMountedRef = React.useRef(false);
  const mutationLockRef = React.useRef(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const updateIntentRef = React.useRef<MutationIntent | null>(null);
  const forwardIntentRef = React.useRef<MutationIntent | null>(null);

  const updateForm = useForm<DealerLeadUpdateFormValues>({
    resolver: zodResolver(dealerLeadUpdateFormSchema),
    defaultValues: updateBaseline,
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const forwardForm = useForm<DealerLeadForwardFormValues>({
    resolver: zodResolver(dealerLeadForwardFormSchema),
    defaultValues: {
      targetIvrFlowCode: "VEHICLE_ENQUIRIES",
      reason: "",
    },
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const editableFields = React.useMemo(
    () => new Set<DealerLeadEditableField>(lead?.dealerUpdate.editableFields),
    [lead?.dealerUpdate.editableFields],
  );
  const hasUpdateFields = UPDATE_EDITABLE_FIELDS.some((field) =>
    editableFields.has(field),
  );
  const remainingUses = lead?.dealerUpdate.remainingUses ?? 0;
  const updateAvailable =
    lead?.dealerUpdate.canUpdate === true &&
    hasUpdateFields &&
    remainingUses > 0;
  const forwardAvailable =
    lead?.dealerUpdate.canForward === true &&
    editableFields.has("forwardFlow") &&
    remainingUses > 0;
  const busy = pendingAction !== null;
  const activeMode: ActionMode =
    requestedMode === "UPDATE" && updateAvailable
      ? "UPDATE"
      : requestedMode === "FORWARD" && forwardAvailable
        ? "FORWARD"
        : updateAvailable
          ? "UPDATE"
          : "FORWARD";

  const selectedStatus = useWatch({
    control: updateForm.control,
    name: "status",
  });
  const selectedForwardFlow = useWatch({
    control: forwardForm.control,
    name: "targetIvrFlowCode",
  });

  const selectedStatusDescription =
    selectedStatus === ""
      ? "Choose the result of the latest customer contact."
      : (STATUS_DESCRIPTIONS.get(selectedStatus) ??
        "Choose the result of the latest customer contact.");
  const selectedForwardDescription =
    FORWARD_DESCRIPTIONS.get(selectedForwardFlow) ??
    "Choose the workflow that should handle this enquiry.";

  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  React.useEffect(() => {
    if (!modeMountedRef.current) {
      modeMountedRef.current = true;
      return;
    }

    actionHeadingRef.current?.focus({ preventScroll: true });
  }, [activeMode]);

  function clearNotices(): void {
    setMutationError(null);
    setSuccessNotice(null);
  }

  function changeMode(nextMode: ActionMode): void {
    if (busy || nextMode === activeMode) {
      return;
    }

    if (
      (nextMode === "UPDATE" && !updateAvailable) ||
      (nextMode === "FORWARD" && !forwardAvailable)
    ) {
      return;
    }

    clearNotices();
    setRequestedMode(nextMode);
  }

  function consumePublicLinkUse(
    current: DealerLeadPublicView,
  ): DealerLeadPublicView["dealerUpdate"] {
    const nextRemainingUses = Math.max(
      current.dealerUpdate.remainingUses - 1,
      0,
    );

    return {
      ...current.dealerUpdate,
      remainingUses: nextRemainingUses,
      canUpdate: current.dealerUpdate.canUpdate && nextRemainingUses > 0,
      canForward: current.dealerUpdate.canForward && nextRemainingUses > 0,
    };
  }

  async function submitUpdate(
    values: DealerLeadUpdateFormValues,
  ): Promise<void> {
    if (lead === null || !updateAvailable || busy || mutationLockRef.current) {
      return;
    }

    updateForm.clearErrors();
    clearNotices();

    const baseline = updateBaseline;
    const update: Partial<DealerLeadUpdateRequest> = {};
    const customerName = values.customerName.trim();
    const note = values.note.trim();
    const followUpAtLocal = values.followUpAtLocal.trim();

    if (
      editableFields.has("customerName") &&
      customerName !== baseline.customerName.trim()
    ) {
      if (customerName.length === 0) {
        updateForm.setError("customerName", {
          type: "manual",
          message:
            "Customer name cannot be cleared. Enter a name or restore the previous value.",
        });
        return;
      }

      update.customerName = customerName;
    }

    if (editableFields.has("status") && values.status !== baseline.status) {
      if (values.status === "") {
        updateForm.setError("status", {
          type: "manual",
          message:
            "Customer response cannot be cleared. Select a response or restore the previous value.",
        });
        return;
      }

      update.status = values.status;
    }

    if (
      editableFields.has("followUpAt") &&
      followUpAtLocal !== baseline.followUpAtLocal.trim()
    ) {
      if (followUpAtLocal.length === 0) {
        updateForm.setError("followUpAtLocal", {
          type: "manual",
          message:
            "Follow-up time cannot be cleared. Select a time or restore the previous value.",
        });
        return;
      }

      const followUpAt = toIsoOffsetDateTimeFromLocal(followUpAtLocal);

      if (followUpAt === null) {
        updateForm.setError("followUpAtLocal", {
          type: "manual",
          message: "Enter a valid follow-up date and time.",
        });
        return;
      }

      update.followUpAt = followUpAt;
    }

    if (editableFields.has("note") && note !== baseline.note.trim()) {
      if (note.length === 0) {
        updateForm.setError("note", {
          type: "manual",
          message:
            "Call note cannot be cleared. Enter a note or restore the previous value.",
        });
        return;
      }

      update.note = note;
    }

    const parsedUpdate = dealerLeadUpdateRequestSchema.safeParse(update);

    if (!parsedUpdate.success) {
      setMutationError({
        title: "Nothing to submit",
        description:
          "Change at least one field that this secure link allows you to update.",
      });
      return;
    }

    mutationLockRef.current = true;
    setPendingAction("UPDATE");

    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    try {
      const request = parsedUpdate.data;
      const idempotencyKey = resolveIntentKey(
        updateIntentRef,
        "dealer-update",
        request,
      );

      await updatePublicDealerLead({
        token,
        update: request,
        idempotencyKey,
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      const nextLead: DealerLeadPublicView = {
        ...lead,
        ...(request.followUpAt === undefined
          ? {}
          : { nextFollowUpAt: request.followUpAt }),
        dealerUpdate: {
          ...consumePublicLinkUse(lead),
          ...(request.customerName === undefined
            ? {}
            : { latestCustomerName: request.customerName }),
          ...(request.note === undefined ? {} : { latestNote: request.note }),
          ...(request.status === undefined
            ? {}
            : { latestStatus: request.status }),
        },
      };

      setLead(nextLead);
      const nextBaseline = buildUpdateFormValues(nextLead);
      setUpdateBaseline(nextBaseline);
      updateForm.reset(nextBaseline);
      updateIntentRef.current = null;
      setSuccessNotice({
        title: "Follow-up updated",
        description:
          "The customer follow-up details were accepted successfully.",
      });
    } catch (error: unknown) {
      if (!isAbortError(error)) {
        setMutationError(toUserFacingError(error));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      setPendingAction(null);
      mutationLockRef.current = false;
    }
  }

  function handleUpdateFormSubmit(
    event: React.SyntheticEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    void (async (): Promise<void> => {
      const valid = await updateForm.trigger(undefined, { shouldFocus: true });

      if (!valid) {
        return;
      }

      const parsedValues = dealerLeadUpdateFormSchema.safeParse(
        updateForm.getValues(),
      );

      if (!parsedValues.success) {
        return;
      }

      await submitUpdate(parsedValues.data);
    })();
  }

  async function submitForward(
    values: DealerLeadForwardFormValues,
  ): Promise<void> {
    if (lead === null || !forwardAvailable || busy || mutationLockRef.current) {
      return;
    }

    clearNotices();
    const request = dealerLeadForwardRequestSchema.parse({
      targetIvrFlowCode: values.targetIvrFlowCode,
      reason: values.reason.trim(),
    } satisfies DealerLeadForwardRequest);

    mutationLockRef.current = true;
    setPendingAction("FORWARD");

    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    try {
      const idempotencyKey = resolveIntentKey(
        forwardIntentRef,
        "dealer-forward",
        request,
      );

      await forwardPublicDealerLead({
        token,
        forward: request,
        idempotencyKey,
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      const nextLead: DealerLeadPublicView = {
        ...lead,
        dealerUpdate: {
          ...consumePublicLinkUse(lead),
          latestStatus: "CONTACTED",
          latestNote: request.reason,
        },
      };

      setLead(nextLead);
      forwardForm.reset({
        targetIvrFlowCode: request.targetIvrFlowCode,
        reason: "",
      });
      forwardIntentRef.current = null;
      setSuccessNotice({
        title: "Routing request accepted",
        description:
          "The enquiry was queued for the selected support workflow.",
      });
    } catch (error: unknown) {
      if (!isAbortError(error)) {
        setMutationError(toUserFacingError(error));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      setPendingAction(null);
      mutationLockRef.current = false;
    }
  }

  function handleForwardFormSubmit(
    event: React.SyntheticEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    void (async (): Promise<void> => {
      const valid = await forwardForm.trigger(undefined, { shouldFocus: true });

      if (!valid) {
        return;
      }

      const parsedValues = dealerLeadForwardFormSchema.safeParse(
        forwardForm.getValues(),
      );

      if (!parsedValues.success) {
        return;
      }

      await submitForward(parsedValues.data);
    })();
  }

  if (lead === null) {
    return <LoadFailureScreen error={loadError} />;
  }

  const activeActionAvailable =
    activeMode === "UPDATE" ? updateAvailable : forwardAvailable;
  const activeFormId =
    activeMode === "UPDATE" ? UPDATE_FORM_ID : FORWARD_FORM_ID;
  const expiryCopy = formatDateTime(lead.dealerUpdate.expiresAt);

  const footerActions = activeActionAvailable ? (
    <div className="mx-auto grid w-full max-w-4xl">
      <Button
        type="submit"
        form={activeFormId}
        disabled={busy}
        className="h-12 rounded-2xl"
      >
        {pendingAction === activeMode ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        ) : activeMode === "UPDATE" ? (
          <CheckCircle2 aria-hidden="true" className="size-4" />
        ) : (
          <Send aria-hidden="true" className="size-4" />
        )}
        {pendingAction === "UPDATE"
          ? "Submitting update…"
          : pendingAction === "FORWARD"
            ? "Routing enquiry…"
            : activeMode === "UPDATE"
              ? "Submit follow-up update"
              : "Route enquiry"}
      </Button>
    </div>
  ) : undefined;

  return (
    <PublicDealerLeadShell
      footerActions={footerActions}
      mainLabelledBy="dealer-lead-title"
      mainRef={mainRef}
    >
      <section className="w-full max-w-4xl">
        <Card
          aria-busy={busy}
          className="w-full gap-0 overflow-hidden rounded-none border-x-0 border-y-0 border-border/70 bg-card/96 py-0 shadow-xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl sm:rounded-3xl sm:border"
        >
          <CardHeader className="gap-4 px-4 py-5 sm:px-7 sm:py-7">
            <div className="min-w-0">
              <p className="text-overline text-primary">
                Vehicle enquiry follow-up
              </p>
              <CardTitle
                id="dealer-lead-title"
                className="mt-1 text-section-title text-balance"
              >
                Update customer follow-up
              </CardTitle>
              <CardDescription className="mt-1.5 max-w-2xl text-body-sm text-pretty text-muted-readable">
                Review the enquiry, record the latest customer outcome, or route
                it to the correct Ozotec EV workflow.
              </CardDescription>

              <div
                role="group"
                aria-label="Secure link details"
                className="mt-4 flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center"
              >
                <p className="flex min-h-9 max-w-full items-center gap-2 rounded-full border border-border/70 bg-muted/35 px-3 py-1.5 text-caption leading-relaxed text-muted-readable">
                  <Clock3 aria-hidden="true" className="size-4 shrink-0" />
                  <span>Secure link expires {expiryCopy}</span>
                </p>
                <Badge
                  variant="secondary"
                  className="h-auto min-h-9 max-w-full rounded-full px-3 py-1.5 text-center whitespace-normal"
                >
                  {remainingUseCopy(remainingUses)}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-6 px-4 pb-6 sm:px-7 sm:pb-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <LeadSummary lead={lead} />

            <div className="grid min-w-0 gap-5">
              {successNotice === null ? null : (
                <Alert variant="success" role="status" aria-live="polite">
                  <CheckCircle2 aria-hidden="true" />
                  <AlertTitle>{successNotice.title}</AlertTitle>
                  <AlertDescription>
                    {successNotice.description}
                  </AlertDescription>
                </Alert>
              )}

              {mutationError === null ? null : (
                <Alert
                  variant="destructive"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                >
                  <AlertTriangle aria-hidden="true" />
                  <AlertTitle>{mutationError.title}</AlertTitle>
                  <AlertDescription>
                    <p>{mutationError.description}</p>
                    {mutationError.requestId === undefined ? null : (
                      <p className="mt-1 text-caption">
                        Reference:{" "}
                        <code className="break-all text-tabular">
                          {mutationError.requestId}
                        </code>
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {!updateAvailable && !forwardAvailable ? (
                <Alert variant="warning" role="status">
                  <AlertTriangle aria-hidden="true" />
                  <AlertTitle>No further actions are available</AlertTitle>
                  <AlertDescription>
                    This secure link has no remaining uses or does not permit
                    additional follow-up changes.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid gap-2">
                    <h2 className="text-card-title">Choose an action</h2>
                    <p className="text-body-sm text-muted-readable">
                      Only actions permitted by this secure link are enabled.
                    </p>
                  </div>

                  <ActionModeSelector
                    value={activeMode}
                    updateAvailable={updateAvailable}
                    forwardAvailable={forwardAvailable}
                    disabled={busy}
                    onChange={changeMode}
                  />

                  <div className="rounded-3xl border border-border/70 bg-muted/20 p-4 sm:p-5">
                    <h2
                      ref={actionHeadingRef}
                      tabIndex={-1}
                      className="text-section-title outline-none"
                    >
                      {activeMode === "UPDATE"
                        ? "Follow-up details"
                        : "Routing details"}
                    </h2>
                    <p className="mt-1 text-body-sm text-muted-readable">
                      {activeMode === "UPDATE"
                        ? "Only changed fields will be sent and consume one secure-link action."
                        : "Routing marks the contact as reached and records the routing reason."}
                    </p>

                    {activeMode === "UPDATE" ? (
                      <form
                        id={UPDATE_FORM_ID}
                        noValidate
                        className="mt-5"
                        onSubmit={handleUpdateFormSubmit}
                      >
                        <FieldGroup className="gap-5">
                          {editableFields.has("customerName") ? (
                            <Field
                              data-invalid={
                                updateForm.formState.errors.customerName ===
                                undefined
                                  ? undefined
                                  : true
                              }
                            >
                              <FieldLabel htmlFor="dealer-lead-customer-name">
                                Customer name
                              </FieldLabel>
                              <Input
                                id="dealer-lead-customer-name"
                                type="text"
                                autoComplete="name"
                                enterKeyHint="next"
                                disabled={busy}
                                aria-invalid={
                                  updateForm.formState.errors.customerName ===
                                  undefined
                                    ? undefined
                                    : true
                                }
                                {...updateForm.register("customerName")}
                              />
                              <FieldMessage
                                message={
                                  updateForm.formState.errors.customerName
                                    ?.message
                                }
                              />
                            </Field>
                          ) : null}

                          {editableFields.has("status") ? (
                            <FieldSet disabled={busy}>
                              <FieldLegend>Customer response</FieldLegend>
                              <FieldDescription>
                                {selectedStatusDescription}
                              </FieldDescription>
                              <Controller
                                control={updateForm.control}
                                name="status"
                                render={({ field }) => (
                                  <ChoiceCards
                                    name="dealer-lead-status"
                                    value={field.value}
                                    options={STATUS_OPTIONS}
                                    disabled={busy}
                                    onChange={field.onChange}
                                  />
                                )}
                              />
                              <FieldMessage
                                message={
                                  updateForm.formState.errors.status?.message
                                }
                              />
                            </FieldSet>
                          ) : null}

                          {editableFields.has("followUpAt") ? (
                            <Field
                              data-invalid={
                                updateForm.formState.errors.followUpAtLocal ===
                                undefined
                                  ? undefined
                                  : true
                              }
                            >
                              <FieldLabel htmlFor="dealer-lead-follow-up">
                                Next follow-up
                              </FieldLabel>
                              <Input
                                id="dealer-lead-follow-up"
                                type="datetime-local"
                                disabled={busy}
                                aria-invalid={
                                  updateForm.formState.errors
                                    .followUpAtLocal === undefined
                                    ? undefined
                                    : true
                                }
                                {...updateForm.register("followUpAtLocal")}
                              />
                              <FieldDescription>
                                The selected local time is submitted with the
                                browser&apos;s UTC offset.
                              </FieldDescription>
                              <FieldMessage
                                message={
                                  updateForm.formState.errors.followUpAtLocal
                                    ?.message
                                }
                              />
                            </Field>
                          ) : null}

                          {editableFields.has("note") ? (
                            <Field
                              data-invalid={
                                updateForm.formState.errors.note === undefined
                                  ? undefined
                                  : true
                              }
                            >
                              <FieldLabel htmlFor="dealer-lead-note">
                                Call note
                              </FieldLabel>
                              <Textarea
                                id="dealer-lead-note"
                                rows={6}
                                maxLength={4_000}
                                placeholder="Add the customer requirement, call summary, decision, or next action."
                                disabled={busy}
                                aria-invalid={
                                  updateForm.formState.errors.note === undefined
                                    ? undefined
                                    : true
                                }
                                {...updateForm.register("note")}
                              />
                              <FieldDescription>
                                Do not enter OTPs, payment details, identity
                                documents, or unrelated personal information.
                              </FieldDescription>
                              <FieldMessage
                                message={
                                  updateForm.formState.errors.note?.message
                                }
                              />
                            </Field>
                          ) : null}
                        </FieldGroup>
                      </form>
                    ) : (
                      <form
                        id={FORWARD_FORM_ID}
                        noValidate
                        className="mt-5"
                        onSubmit={handleForwardFormSubmit}
                      >
                        <FieldGroup className="gap-5">
                          <FieldSet disabled={busy}>
                            <FieldLegend>Route to</FieldLegend>
                            <FieldDescription>
                              {selectedForwardDescription}
                            </FieldDescription>
                            <Controller
                              control={forwardForm.control}
                              name="targetIvrFlowCode"
                              render={({ field }) => (
                                <ChoiceCards
                                  name="dealer-lead-forward-flow"
                                  value={field.value}
                                  options={FORWARD_OPTIONS}
                                  disabled={busy}
                                  onChange={field.onChange}
                                />
                              )}
                            />
                            <FieldMessage
                              message={
                                forwardForm.formState.errors.targetIvrFlowCode
                                  ?.message
                              }
                            />
                          </FieldSet>

                          <Field
                            data-invalid={
                              forwardForm.formState.errors.reason === undefined
                                ? undefined
                                : true
                            }
                          >
                            <FieldLabel htmlFor="dealer-lead-forward-reason">
                              Routing reason
                            </FieldLabel>
                            <Textarea
                              id="dealer-lead-forward-reason"
                              rows={5}
                              maxLength={1_000}
                              placeholder="Explain why this enquiry belongs in the selected workflow."
                              disabled={busy}
                              aria-invalid={
                                forwardForm.formState.errors.reason ===
                                undefined
                                  ? undefined
                                  : true
                              }
                              {...forwardForm.register("reason")}
                            />
                            <FieldDescription>
                              The reason becomes the latest dealer note and is
                              included with the routing request.
                            </FieldDescription>
                            <FieldMessage
                              message={
                                forwardForm.formState.errors.reason?.message
                              }
                            />
                          </Field>
                        </FieldGroup>
                      </form>
                    )}
                  </div>
                </>
              )}

              <div className="flex items-start gap-3 rounded-2xl border border-info/20 bg-info/5 p-4 text-info dark:border-info/30 dark:bg-info/10">
                <Clock3 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <p className="text-body-sm leading-relaxed">
                  Backend permissions and remaining-use limits are enforced for
                  every action.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </PublicDealerLeadShell>
  );
}

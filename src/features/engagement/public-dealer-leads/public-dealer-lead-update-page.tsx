// oz-next-app/src/features/engagement/public-dealer-leads/public-dealer-lead-update-page.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isApiHttpError } from "@/lib/api/problem";
import { cn } from "@/lib/utils";

import { forwardPublicDealerLead, updatePublicDealerLead } from "./client";
import {
  DEALER_LEAD_STATUS_VALUES,
  IVR_FLOW_CODE_VALUES,
  dealerLeadForwardFormSchema,
  dealerLeadUpdateFormSchema,
  type DealerLeadForwardFormValues,
  type DealerLeadPublicView,
  type DealerLeadStatus,
  type DealerLeadUpdateFormValues,
  type IvrFlowCode,
} from "./schemas";

type PublicDealerLeadUpdatePageProps = Readonly<{
  token: string;
  initialLead: DealerLeadPublicView | null;
  loadError?: Readonly<{
    reason: "invalid-token" | "not-found" | "unavailable";
    requestId?: string;
  }>;
}>;

type MutationState =
  "idle" | "submitting-update" | "submitting-forward" | "success" | "error";

type UserFacingError = Readonly<{
  title: string;
  description: string;
  requestId?: string;
}>;

type StatusOption = Readonly<{
  value: DealerLeadStatus;
  label: string;
  description: string;
}>;

type ForwardOption = Readonly<{
  value: IvrFlowCode;
  label: string;
  description: string;
}>;

const BRAND_ICON_SIZE = 28;
const BRAND_ICON_CLASS_NAME = "h-7 w-auto";
const EMPTY_VALUE = "";
const GOOGLE_MAPS_ORIGINS = new Set([
  "https://www.google.com",
  "https://google.com",
]);

const STATUS_OPTIONS = [
  {
    value: "CONTACTED",
    label: "Contacted",
    description: "Customer has been reached.",
  },
  {
    value: "INTERESTED",
    label: "Interested",
    description: "Customer is interested and needs follow-up.",
  },
  {
    value: "NOT_REACHABLE",
    label: "Not reachable",
    description: "Customer did not answer or number was unreachable.",
  },
  {
    value: "NOT_INTERESTED",
    label: "Not interested",
    description: "Customer is not interested now.",
  },
] as const satisfies readonly StatusOption[];

const FORWARD_OPTIONS = [
  {
    value: "VEHICLE_ENQUIRIES",
    label: "Vehicle enquiry",
    description: "Keep this enquiry in the vehicle enquiry flow.",
  },
  {
    value: "DEALERSHIP",
    label: "Dealership enquiry",
    description: "Route to dealership enquiry flow.",
  },
  {
    value: "SERVICE_ENQUIRIES",
    label: "Service support",
    description: "Route to service support flow.",
  },
  {
    value: "WARRANTY_TAMIL",
    label: "Warranty support - Tamil",
    description: "Route to Tamil warranty support flow.",
  },
] as const satisfies readonly ForwardOption[];

const STATUS_LABELS = new Map<DealerLeadStatus, string>(
  STATUS_OPTIONS.map((option) => [option.value, option.label]),
);

function createIdempotencyKey(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

function isDealerLeadStatus(
  value: string | null | undefined,
): value is DealerLeadStatus {
  return DEALER_LEAD_STATUS_VALUES.some((status) => status === value);
}

function formatStatus(value: string | null | undefined): string {
  if (isDealerLeadStatus(value)) {
    return STATUS_LABELS.get(value) ?? value;
  }

  return (
    value
      ?.replace(/_/gu, " ")
      .toLowerCase()
      .replace(/\b\w/gu, (match) => match.toUpperCase()) ?? "Open"
  );
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

function toIsoOffsetDateTimeFromLocal(value: string): string | undefined {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return undefined;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u.exec(normalized);

  if (match === null) {
    return undefined;
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

  if (Number.isNaN(date.getTime())) {
    return undefined;
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

    return GOOGLE_MAPS_ORIGINS.has(url.origin) ? url.toString() : null;
  } catch {
    return null;
  }
}

function toUserFacingError(error: unknown): UserFacingError {
  if (isApiHttpError(error)) {
    if (error.status === 404 || error.status === 410) {
      return {
        title: "Enquiry link is not available",
        description:
          "This secure update link is invalid, expired, used up, or no longer available.",
      };
    }

    if (error.status === 429) {
      return {
        title: "Too many attempts",
        description: "Please wait for a short time and try again.",
        ...(error.requestId === undefined
          ? {}
          : { requestId: error.requestId }),
      };
    }

    return {
      title: "Follow-up could not be submitted",
      description: error.message || "Please review the details and try again.",
      ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
    };
  }

  return {
    title: "Unexpected error",
    description: "The request could not be completed. Please try again.",
  };
}

function LoadFailureCard({
  error,
}: Readonly<{ error: PublicDealerLeadUpdatePageProps["loadError"] }>) {
  const title =
    error?.reason === "unavailable"
      ? "Vehicle enquiry details are temporarily unavailable"
      : "Enquiry link is not available";

  const description =
    error?.reason === "unavailable"
      ? "Please retry after a few moments. No follow-up update was submitted."
      : "This secure enquiry link is invalid, expired, used up, or no longer available.";

  return (
    <Card className="overflow-hidden border-border/80 bg-card/95 shadow-xl shadow-foreground/5">
      <CardHeader className="items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/10 text-destructive">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </div>

        <div className="grid gap-1">
          <CardTitle className="text-section-title">{title}</CardTitle>
          <p className="text-body-sm text-muted-readable">{description}</p>
        </div>
      </CardHeader>

      {error?.requestId === undefined ? null : (
        <CardFooter className="justify-center border-t border-border/70 bg-muted/35 text-center text-caption text-muted-readable">
          Reference:{" "}
          <code className="ml-1 text-tabular">{error.requestId}</code>
        </CardFooter>
      )}
    </Card>
  );
}

function UnsupportedDesktopCard(): React.ReactElement {
  return (
    <Card className="mx-auto max-w-md border-border/80 bg-card/95 shadow-xl shadow-foreground/5">
      <CardHeader className="items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-3xl border border-border/70 bg-muted text-muted-readable">
          <Phone aria-hidden="true" className="size-5" />
        </div>

        <div className="grid gap-1">
          <CardTitle className="text-section-title">
            Open this link on mobile
          </CardTitle>
          <p className="text-body-sm text-muted-readable">
            Vehicle enquiry follow-ups are optimized for mobile devices. Please
            open this link on your phone.
          </p>
        </div>
      </CardHeader>
    </Card>
  );
}

function BrandHeader(): React.ReactElement {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="flex size-10 items-center justify-center rounded-2xl border border-border/70 bg-background shadow-xs">
          <Image
            src="/icon-light.svg"
            alt=""
            width={BRAND_ICON_SIZE}
            height={BRAND_ICON_SIZE}
            className={`block ${BRAND_ICON_CLASS_NAME} dark:hidden`}
            priority
          />
          <Image
            src="/icon-dark.svg"
            alt=""
            width={BRAND_ICON_SIZE}
            height={BRAND_ICON_SIZE}
            className={`hidden ${BRAND_ICON_CLASS_NAME} dark:block`}
            priority
          />
        </span>

        <div className="grid gap-0.5">
          <p className="text-card-title leading-none">Ozotec EV</p>
          <p className="text-caption text-muted-readable">
            Vehicle enquiry follow-up
          </p>
        </div>
      </div>

      <Badge variant="secondary" className="rounded-full">
        Secure link
      </Badge>
    </header>
  );
}

function LeadSummaryCard({
  lead,
}: Readonly<{ lead: DealerLeadPublicView }>): React.ReactElement {
  const mapsHref = safeMapsHref(lead.customer.googleMapsUrl);
  const location = [
    lead.customer.city,
    lead.customer.district,
    lead.customer.state,
    lead.customer.postalCode,
  ]
    .filter((item): item is string => item !== null && item.trim().length > 0)
    .join(", ");

  return (
    <Card className="overflow-hidden border-border/80 bg-card/95 shadow-xl shadow-foreground/5">
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-caption text-muted-readable">Enquiry number</p>
            <CardTitle className="text-page-title tracking-tight">
              {lead.leadNo}
            </CardTitle>
          </div>

          <Badge className="rounded-full">{formatStatus(lead.status)}</Badge>
        </div>

        <div className="grid gap-2 rounded-3xl border border-border/70 bg-muted/35 p-4">
          <p className="text-card-title">{lead.customer.name ?? "Customer"}</p>

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
              <a href={mapsHref} target="_blank" rel="noreferrer">
                Open location
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 text-body-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-readable">Current step</span>
          <span className="text-right">
            {lead.stage.name ?? lead.stage.code ?? "Not assigned"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-readable">Customer contacted for</span>
          <span className="text-right">
            {lead.source.name ?? lead.source.code ?? "Not available"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-readable">Next follow-up</span>
          <span className="text-right">
            {formatDateTime(lead.nextFollowUpAt)}
          </span>
        </div>
      </CardContent>
    </Card>
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
  const [mutationState, setMutationState] =
    React.useState<MutationState>("idle");
  const [mutationError, setMutationError] =
    React.useState<UserFacingError | null>(null);

  const editableFields = React.useMemo(
    () => new Set(lead?.dealerUpdate.editableFields ?? []),
    [lead?.dealerUpdate.editableFields],
  );

  const canUpdate = lead?.dealerUpdate.canUpdate === true;
  const canForward = lead?.dealerUpdate.canForward === true;

  const updateForm = useForm<DealerLeadUpdateFormValues>({
    resolver: zodResolver(dealerLeadUpdateFormSchema),
    defaultValues: {
      customerName:
        lead?.dealerUpdate.latestCustomerName ?? lead?.customer.name ?? "",
      status: isDealerLeadStatus(lead?.dealerUpdate.latestStatus)
        ? lead.dealerUpdate.latestStatus
        : "",
      followUpAtLocal: toDateTimeLocalValue(lead?.nextFollowUpAt ?? null),
      note: lead?.dealerUpdate.latestNote ?? "",
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const forwardForm = useForm<DealerLeadForwardFormValues>({
    resolver: zodResolver(dealerLeadForwardFormSchema),
    defaultValues: {
      targetIvrFlowCode: "VEHICLE_ENQUIRIES",
      reason: "",
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const isBusy =
    mutationState === "submitting-update" ||
    mutationState === "submitting-forward";
  const selectedUpdateStatus = useWatch({
    control: updateForm.control,
    name: "status",
  });
  const selectedForwardFlowCode = useWatch({
    control: forwardForm.control,
    name: "targetIvrFlowCode",
  });

  const selectedUpdateStatusDescription = React.useMemo(
    () =>
      STATUS_OPTIONS.find((option) => option.value === selectedUpdateStatus)
        ?.description ?? "Choose what happened during the call.",
    [selectedUpdateStatus],
  );

  const selectedForwardFlowDescription = React.useMemo(
    () =>
      FORWARD_OPTIONS.find((option) => option.value === selectedForwardFlowCode)
        ?.description ?? "Select where this lead should go.",
    [selectedForwardFlowCode],
  );

  async function submitUpdate(
    values: DealerLeadUpdateFormValues,
  ): Promise<void> {
    if (lead === null || isBusy || !canUpdate) {
      return;
    }

    const update = {
      ...(editableFields.has("customerName") &&
      values.customerName.trim().length > 0
        ? { customerName: values.customerName.trim() }
        : {}),
      ...(editableFields.has("note") && values.note.trim().length > 0
        ? { note: values.note.trim() }
        : {}),
      ...(editableFields.has("followUpAt") &&
      values.followUpAtLocal.trim().length > 0
        ? { followUpAt: toIsoOffsetDateTimeFromLocal(values.followUpAtLocal) }
        : {}),
      ...(editableFields.has("status") && values.status !== ""
        ? { status: values.status }
        : {}),
    };

    const normalizedUpdate = Object.fromEntries(
      Object.entries(update).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(normalizedUpdate).length === 0) {
      setMutationError({
        title: "Nothing to submit",
        description: "Update at least one allowed field before submitting.",
      });
      return;
    }

    setMutationState("submitting-update");
    setMutationError(null);

    try {
      await updatePublicDealerLead({
        token,
        update: normalizedUpdate,
        idempotencyKey: createIdempotencyKey("vehicle-enquiry-update"),
      });

      setLead((current) =>
        current === null
          ? current
          : {
              ...current,
              ...(typeof normalizedUpdate["followUpAt"] === "string"
                ? { nextFollowUpAt: normalizedUpdate["followUpAt"] }
                : {}),
              dealerUpdate: {
                ...current.dealerUpdate,
                ...(typeof normalizedUpdate["customerName"] === "string"
                  ? { latestCustomerName: normalizedUpdate["customerName"] }
                  : {}),
                ...(typeof normalizedUpdate["note"] === "string"
                  ? { latestNote: normalizedUpdate["note"] }
                  : {}),
                ...(typeof normalizedUpdate["status"] === "string"
                  ? { latestStatus: normalizedUpdate["status"] }
                  : {}),
                remainingUses: Math.max(
                  current.dealerUpdate.remainingUses - 1,
                  0,
                ),
              },
            },
      );

      setMutationState("success");
    } catch (error: unknown) {
      setMutationError(toUserFacingError(error));
      setMutationState("error");
    }
  }

  async function submitForward(
    values: DealerLeadForwardFormValues,
  ): Promise<void> {
    if (lead === null || isBusy || !canForward) {
      return;
    }

    setMutationState("submitting-forward");
    setMutationError(null);

    try {
      await forwardPublicDealerLead({
        token,
        forward: values,
        idempotencyKey: createIdempotencyKey("vehicle-enquiry-route"),
      });

      setLead((current) =>
        current === null
          ? current
          : {
              ...current,
              dealerUpdate: {
                ...current.dealerUpdate,
                latestStatus: "CONTACTED",
                latestNote: values.reason,
                remainingUses: Math.max(
                  current.dealerUpdate.remainingUses - 1,
                  0,
                ),
              },
            },
      );

      forwardForm.reset({
        targetIvrFlowCode: values.targetIvrFlowCode,
        reason: "",
      });
      setMutationState("success");
    } catch (error: unknown) {
      setMutationError(toUserFacingError(error));
      setMutationState("error");
    }
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,_hsl(var(--muted))_0,_hsl(var(--background))_42%)] px-4 py-5 text-foreground">
      <div className="hidden min-h-[calc(100svh-2.5rem)] items-center justify-center md:flex">
        <UnsupportedDesktopCard />
      </div>

      <section
        className="mx-auto grid w-full max-w-md gap-5 md:hidden"
        aria-labelledby="dealer-lead-title"
      >
        <BrandHeader />

        {lead === null ? (
          <LoadFailureCard error={loadError} />
        ) : (
          <>
            <div className="grid gap-1">
              <h1
                id="dealer-lead-title"
                className="text-page-title tracking-tight"
              >
                Update vehicle enquiry
              </h1>
              <p className="text-body-sm text-muted-readable">
                This customer contacted Ozotec through the Vehicle Enquiries
                IVR. Update the call outcome, next follow-up, or route it to the
                right support flow.
              </p>
            </div>

            <LeadSummaryCard lead={lead} />

            {mutationState === "success" ? (
              <Alert variant="success" role="status" aria-live="polite">
                <CheckCircle2 aria-hidden="true" />
                <AlertTitle>Submitted successfully</AlertTitle>
                <AlertDescription>
                  Your vehicle enquiry follow-up has been accepted.
                </AlertDescription>
              </Alert>
            ) : null}

            {mutationError === null ? null : (
              <Alert variant="destructive" role="alert" aria-live="assertive">
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>{mutationError.title}</AlertTitle>
                <AlertDescription>
                  <span className="block">{mutationError.description}</span>
                  {mutationError.requestId === undefined ? null : (
                    <span className="mt-1 block text-caption">
                      Reference:{" "}
                      <code className="text-tabular">
                        {mutationError.requestId}
                      </code>
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Card className="border-border/80 bg-card/95 shadow-xl shadow-foreground/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-section-title">
                  <Clock3
                    aria-hidden="true"
                    className="size-5 text-muted-readable"
                  />
                  Call outcome
                </CardTitle>
              </CardHeader>

              <CardContent>
                {!canUpdate ? (
                  <Alert variant="warning">
                    <AlertTriangle aria-hidden="true" />
                    <AlertTitle>Updates are not available</AlertTitle>
                    <AlertDescription>
                      This link has no remaining update access or no editable
                      fields.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <form
                    onSubmit={updateForm.handleSubmit(submitUpdate)}
                    noValidate
                  >
                    <FieldGroup>
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
                            autoComplete="name"
                            enterKeyHint="next"
                            disabled={isBusy}
                            {...updateForm.register("customerName")}
                          />
                          <FieldError
                            errors={[updateForm.formState.errors.customerName]}
                          />
                        </Field>
                      ) : null}

                      {editableFields.has("status") ? (
                        <Field
                          data-invalid={
                            updateForm.formState.errors.status === undefined
                              ? undefined
                              : true
                          }
                        >
                          <FieldLabel htmlFor="dealer-lead-status">
                            Customer response
                          </FieldLabel>
                          <select
                            id="dealer-lead-status"
                            className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-body-sm text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isBusy}
                            {...updateForm.register("status")}
                          >
                            <option value="">Select customer response</option>
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <FieldDescription>
                            {selectedUpdateStatusDescription}
                          </FieldDescription>
                          <FieldError
                            errors={[updateForm.formState.errors.status]}
                          />
                        </Field>
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
                            disabled={isBusy}
                            {...updateForm.register("followUpAtLocal")}
                          />
                          <FieldDescription>
                            Use the customer’s local follow-up time.
                          </FieldDescription>
                          <FieldError
                            errors={[
                              updateForm.formState.errors.followUpAtLocal,
                            ]}
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
                            rows={5}
                            enterKeyHint="done"
                            placeholder="Add why the customer contacted, vehicle requirement, call summary, or next action."
                            disabled={isBusy}
                            {...updateForm.register("note")}
                          />
                          <FieldDescription>
                            Do not enter OTPs, payment details, or unrelated
                            personal data.
                          </FieldDescription>
                          <FieldError
                            errors={[updateForm.formState.errors.note]}
                          />
                        </Field>
                      ) : null}

                      <Button
                        type="submit"
                        disabled={isBusy || !canUpdate}
                        className="h-12 rounded-2xl"
                      >
                        {mutationState === "submitting-update" ? (
                          <LoaderCircle
                            aria-hidden="true"
                            className="size-4 animate-spin"
                          />
                        ) : (
                          <CheckCircle2 aria-hidden="true" className="size-4" />
                        )}
                        Submit update
                      </Button>
                    </FieldGroup>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card
              className={cn(
                "border-border/80 bg-card/95 shadow-xl shadow-foreground/5",
                !canForward && "opacity-75",
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-section-title">
                  <Send
                    aria-hidden="true"
                    className="size-5 text-muted-readable"
                  />
                  Route enquiry
                </CardTitle>
                <p className="text-body-sm text-muted-readable">
                  Use this only when the customer contacted for another purpose
                  and should be handled by a different flow.
                </p>
              </CardHeader>

              <CardContent>
                {!canForward ? (
                  <Alert variant="warning">
                    <AlertTriangle aria-hidden="true" />
                    <AlertTitle>Routing is not available</AlertTitle>
                    <AlertDescription>
                      This secure link does not allow routing or has no
                      remaining uses.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <form
                    onSubmit={forwardForm.handleSubmit(submitForward)}
                    noValidate
                  >
                    <FieldGroup>
                      <Field
                        data-invalid={
                          forwardForm.formState.errors.targetIvrFlowCode ===
                          undefined
                            ? undefined
                            : true
                        }
                      >
                        <FieldLabel htmlFor="dealer-lead-forward-flow">
                          Route to
                        </FieldLabel>
                        <select
                          id="dealer-lead-forward-flow"
                          className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-body-sm text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isBusy}
                          {...forwardForm.register("targetIvrFlowCode")}
                        >
                          {FORWARD_OPTIONS.filter((option) =>
                            IVR_FLOW_CODE_VALUES.some(
                              (value) => value === option.value,
                            ),
                          ).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <FieldDescription>
                          {selectedForwardFlowDescription}
                        </FieldDescription>
                        <FieldError
                          errors={[
                            forwardForm.formState.errors.targetIvrFlowCode,
                          ]}
                        />
                      </Field>

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
                          rows={4}
                          placeholder="Example: Customer contacted for service support instead of a vehicle enquiry."
                          disabled={isBusy}
                          {...forwardForm.register("reason")}
                        />
                        <FieldError
                          errors={[forwardForm.formState.errors.reason]}
                        />
                      </Field>

                      <Button
                        type="submit"
                        variant="secondary"
                        disabled={isBusy || !canForward}
                        className="h-12 rounded-2xl"
                      >
                        {mutationState === "submitting-forward" ? (
                          <LoaderCircle
                            aria-hidden="true"
                            className="size-4 animate-spin"
                          />
                        ) : (
                          <Send aria-hidden="true" className="size-4" />
                        )}
                        Route enquiry
                      </Button>
                    </FieldGroup>
                  </form>
                )}
              </CardContent>
            </Card>

            <footer className="flex items-center justify-center gap-2 pb-4 text-center text-caption text-muted-readable">
              <ShieldCheck aria-hidden="true" className="size-4" />
              This secure link expires on{" "}
              {formatDateTime(lead.dealerUpdate.expiresAt)}.
            </footer>
          </>
        )}
      </section>
    </main>
  );
}

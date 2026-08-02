// oz-next-app/src/features/engagement/dealership-application-operations/ui/dealership-application-workflow-actions.tsx
"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Ban,
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileUp,
  Info,
  LogOut,
  Mic,
  Route,
  ShieldCheck,
  UserRoundCog,
  Workflow,
} from "lucide-react";

import {
  OperationTile,
  WorkflowStepper,
  WorkflowSummaryItem,
  type WorkflowStep,
} from "@/components/common/operation-workflow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AudioNoteRecorderProps } from "@/features/engagement/dealer-operations/ui/audio-note-recorder";
import type { CentralFileUploadFieldProps } from "@/features/engagement/dealer-operations/ui/central-file-upload-field";
import {
  assignDealershipApplicationAction,
  bindDealershipApplicationDocumentAction,
  cancelDealershipApplicationAction,
  claimDealershipApplicationAction,
  completeDealershipApplicationExitAction,
  createDealershipApplicationActivityAction,
  initiateDealershipApplicationExitAction,
  provisionDealershipApplicationDealerAction,
  transitionDealershipApplicationAction,
  type DealershipApplicationActionResult,
} from "@/features/engagement/dealership-application-operations/actions/dealership-application.actions";
import {
  DEALER_ORG_UNIT_TYPES,
  DEALERSHIP_APPLICATION_ACTIVITY_KINDS,
  DEALERSHIP_APPLICATION_ACTIVITY_STATUSES,
  DEALERSHIP_APPLICATION_DOCUMENT_KINDS,
  DEALERSHIP_APPLICATION_PRIORITIES,
  type DealershipApplicationDetail,
  type DealershipApplicationFilterOptions,
  type DealershipApplicationStatus,
} from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";
import type { DealershipApplicationCapabilities } from "@/features/engagement/dealership-application-operations/policies/dealership-application.policy";
import { titleCaseDealershipToken } from "@/features/engagement/dealership-application-operations/utils/dealership-application-format";
import { useToast } from "@/shared/hooks/use-toast";

const CentralFileUploadField = dynamic<CentralFileUploadFieldProps>(
  () =>
    import("@/features/engagement/dealer-operations/ui/central-file-upload-field").then(
      (module) => module.CentralFileUploadField,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-28 items-center justify-center rounded-2xl border border-border/70 bg-muted/25 p-4 text-body-sm text-muted-readable">
        <Spinner aria-hidden="true" className="me-2 size-4" />
        Loading secure uploader…
      </div>
    ),
  },
);

const AudioNoteRecorder = dynamic<AudioNoteRecorderProps>(
  () =>
    import("@/features/engagement/dealer-operations/ui/audio-note-recorder").then(
      (module) => module.AudioNoteRecorder,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-28 items-center justify-center rounded-2xl border border-border/70 bg-muted/25 p-4 text-body-sm text-muted-readable">
        <Spinner aria-hidden="true" className="me-2 size-4" />
        Loading audio recorder…
      </div>
    ),
  },
);

const TRANSITIONS: Readonly<
  Partial<
    Record<DealershipApplicationStatus, readonly DealershipApplicationStatus[]>
  >
> = {
  NEW: ["UNDER_REVIEW", "CONTACT_PENDING", "WITHDRAWN"],
  UNDER_REVIEW: [
    "CONTACT_PENDING",
    "APPOINTMENT_SCHEDULED",
    "EVALUATION_IN_PROGRESS",
    "REJECTED",
    "WITHDRAWN",
  ],
  CONTACT_PENDING: [
    "APPOINTMENT_SCHEDULED",
    "EVALUATION_IN_PROGRESS",
    "REJECTED",
    "WITHDRAWN",
  ],
  APPOINTMENT_SCHEDULED: [
    "EVALUATION_IN_PROGRESS",
    "CONTACT_PENDING",
    "REJECTED",
    "WITHDRAWN",
  ],
  EVALUATION_IN_PROGRESS: [
    "QUALIFIED",
    "CONTACT_PENDING",
    "REJECTED",
    "WITHDRAWN",
  ],
  QUALIFIED: ["DOCUMENTS_PENDING", "APPROVAL_PENDING", "REJECTED", "WITHDRAWN"],
  DOCUMENTS_PENDING: ["COMPLIANCE_REVIEW", "REJECTED", "WITHDRAWN"],
  COMPLIANCE_REVIEW: [
    "DOCUMENTS_PENDING",
    "RISK_REVIEW",
    "REJECTED",
    "WITHDRAWN",
  ],
  RISK_REVIEW: [
    "COMPLIANCE_REVIEW",
    "APPROVAL_PENDING",
    "REJECTED",
    "WITHDRAWN",
  ],
  APPROVAL_PENDING: ["APPROVED", "RISK_REVIEW", "REJECTED", "WITHDRAWN"],
  APPROVED: ["REJECTED", "WITHDRAWN"],
  PROFILE_PROVISIONING: ["TRAINING_PENDING", "APPROVED"],
  TRAINING_PENDING: ["ACTIVATION_PENDING", "PROFILE_PROVISIONING"],
  ACTIVATION_PENDING: ["ACTIVE", "TRAINING_PENDING"],
  EXIT_INITIATED: ["EXIT_CLEARANCE", "ACTIVE"],
  EXIT_CLEARANCE: ["ACCESS_REVOCATION", "SETTLEMENT_PENDING", "ACTIVE"],
  ACCESS_REVOCATION: ["SETTLEMENT_PENDING", "EXIT_CLEARANCE"],
  SETTLEMENT_PENDING: ["EXIT_CLEARANCE"],
};

const ONBOARDING_STEPS = [
  {
    id: "partner",
    label: "Partner profile",
    description: "Dealer identity and organization type",
  },
  {
    id: "administrator",
    label: "ERP administrator",
    description: "Verified login and role",
  },
  {
    id: "location",
    label: "Business location",
    description: "Operational address and coordinates",
  },
  {
    id: "commercial",
    label: "Commercial setup",
    description: "Parent organization and margin template",
  },
  {
    id: "review",
    label: "Review & create",
    description: "Confirm the complete provisioning intent",
  },
] as const satisfies readonly WorkflowStep[];

const ACTIVITY_STEPS = [
  {
    id: "schedule",
    label: "Schedule",
    description: "Choose activity and timing",
  },
  {
    id: "context",
    label: "Context",
    description: "Add ownership, notes, and outcome",
  },
] as const satisfies readonly WorkflowStep[];

const DOCUMENT_STEPS = [
  {
    id: "document",
    label: "Choose document",
    description: "Upload and complete security scanning",
  },
  {
    id: "review",
    label: "Review & attach",
    description: "Classify the document and confirm",
  },
] as const satisfies readonly WorkflowStep[];

const AUDIO_STEPS = [
  {
    id: "record",
    label: "Record",
    description: "Capture, preview, and securely upload",
  },
  {
    id: "details",
    label: "Save note",
    description: "Describe the meeting note and outcome",
  },
] as const satisfies readonly WorkflowStep[];

type WorkflowOperation =
  | "ASSIGN"
  | "STATUS"
  | "ACTIVITY"
  | "DOCUMENT"
  | "AUDIO"
  | "ONBOARD"
  | "CANCEL"
  | "EXIT_INITIATE"
  | "EXIT_COMPLETE";

export type DealershipApplicationWorkflowActionsProps = Readonly<{
  detail: DealershipApplicationDetail;
  filterOptions: DealershipApplicationFilterOptions | null;
  capabilities: DealershipApplicationCapabilities;
}>;

function idempotencyKey(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalField(formData: FormData, key: string): string | undefined {
  const value = field(formData, key);
  return value.length === 0 ? undefined : value;
}

function optionalIso(formData: FormData, key: string): string | undefined {
  const value = optionalField(formData, key);
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function optionalNumber(formData: FormData, key: string): number | undefined {
  const value = optionalField(formData, key);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optional<TValue>(key: string, value: TValue | undefined) {
  return value === undefined ? {} : { [key]: value };
}

function operationTitle(operation: WorkflowOperation): string {
  const titles: Readonly<Record<WorkflowOperation, string>> = {
    ASSIGN: "Application ownership",
    STATUS: "Update application",
    ACTIVITY: "Appointment or follow-up",
    DOCUMENT: "Upload application document",
    AUDIO: "Record audio note",
    ONBOARD: "Onboard dealer",
    CANCEL: "Cancel application",
    EXIT_INITIATE: "Start dealer exit",
    EXIT_COMPLETE: "Complete dealer exit",
  };
  return titles[operation];
}

function operationDescription(
  operation: WorkflowOperation,
  applicationNo: string,
): string {
  const descriptions: Readonly<Record<WorkflowOperation, string>> = {
    ASSIGN: "Choose who is responsible for this application.",
    STATUS: "Record the current business decision and next action.",
    ACTIVITY:
      "Schedule a call, appointment, meeting, or follow-up without changing other work.",
    DOCUMENT:
      "Upload evidence directly to the private file service and attach it after security scanning.",
    AUDIO:
      "Record a private meeting note, review it locally, and attach it to the application.",
    ONBOARD:
      "Prepare the dealer profile, ERP administrator, location, and commercial setup.",
    CANCEL:
      "Close an application the organization will not pursue and preserve the decision in the audit history.",
    EXIT_INITIATE:
      "Begin the controlled dealer exit process with an effective date.",
    EXIT_COMPLETE:
      "Close access, sessions, margins, and the dealership case after clearance.",
  };
  return `${applicationNo} · ${descriptions[operation]}`;
}

function FormField({
  label,
  htmlFor,
  required = false,
  help,
  children,
  className,
}: Readonly<{
  label: string;
  htmlFor: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
  className?: string;
}>): React.ReactElement {
  return (
    <div
      className={
        className === undefined ? "grid gap-1.5" : `grid gap-1.5 ${className}`
      }
    >
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </Label>
        {help === undefined ? null : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`About ${label}`}
                className="inline-flex size-5 items-center justify-center rounded-full text-muted-readable outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <Info aria-hidden="true" className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-72">{help}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
    </div>
  );
}

function StepActions({
  step,
  total,
  pending,
  canSubmit = true,
  submitLabel,
  onPrevious,
  onNext,
  submitVariant = "default",
}: Readonly<{
  step: number;
  total: number;
  pending: boolean;
  canSubmit?: boolean;
  submitLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  submitVariant?: React.ComponentProps<typeof Button>["variant"];
}>): React.ReactElement {
  const last = step === total - 1;
  return (
    <>
      <DialogClose asChild>
        <Button type="button" variant="ghost" disabled={pending}>
          Cancel
        </Button>
      </DialogClose>
      <div className="flex flex-1 items-center justify-end gap-2">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={pending}
          >
            Back
          </Button>
        ) : null}
        {last ? (
          <Button
            type="submit"
            variant={submitVariant}
            disabled={pending || !canSubmit}
          >
            {pending ? <Spinner aria-hidden="true" className="size-4" /> : null}
            {pending ? "Saving…" : submitLabel}
          </Button>
        ) : (
          <Button type="button" onClick={onNext} disabled={pending}>
            Continue
          </Button>
        )}
      </div>
    </>
  );
}

export function DealershipApplicationWorkflowActions({
  detail,
  filterOptions,
  capabilities,
}: DealershipApplicationWorkflowActionsProps): React.ReactElement {
  const application = detail.application;
  const applicationReference = application.applicationNo ?? application.leadNo;
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const [operation, setOperation] = React.useState<WorkflowOperation | null>(
    null,
  );
  const [step, setStep] = React.useState(0);
  const [intentKey, setIntentKey] = React.useState("");
  const [transitionStatus, setTransitionStatus] = React.useState<
    DealershipApplicationStatus | ""
  >("");
  const [activityKind, setActivityKind] =
    React.useState<(typeof DEALERSHIP_APPLICATION_ACTIVITY_KINDS)[number]>(
      "FOLLOW_UP",
    );
  const [assignmentTarget, setAssignmentTarget] = React.useState(
    application.ownerUserId ?? "__SELF__",
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  const [documentReady, setDocumentReady] = React.useState(false);
  const [audioReady, setAudioReady] = React.useState(false);
  const [contactVerified, setContactVerified] = React.useState(false);

  const allowedTransitions = TRANSITIONS[application.status] ?? [];
  const canUpdateStage =
    allowedTransitions.length > 0 &&
    (capabilities.canEvaluate ||
      capabilities.canApprove ||
      capabilities.canManageOnboarding ||
      capabilities.canManageExit);
  const canOnboardNow =
    application.status === "APPROVED" ||
    application.status === "PROFILE_PROVISIONING";
  const alreadyProvisioned = application.dealerOrgUnitId !== null;
  const canInitiateExit =
    capabilities.canManageExit && application.status === "ACTIVE";
  const canCompleteExit =
    capabilities.canManageExit &&
    (application.status === "EXIT_CLEARANCE" ||
      application.status === "ACCESS_REVOCATION" ||
      application.status === "SETTLEMENT_PENDING");
  const canCancel =
    capabilities.canEvaluate &&
    application.dealerOrgUnitId === null &&
    [
      "AWAITING_FORM",
      "NEW",
      "UNDER_REVIEW",
      "CONTACT_PENDING",
      "APPOINTMENT_SCHEDULED",
      "EVALUATION_IN_PROGRESS",
      "QUALIFIED",
      "DOCUMENTS_PENDING",
      "COMPLIANCE_REVIEW",
      "RISK_REVIEW",
      "APPROVAL_PENDING",
      "APPROVED",
    ].includes(application.status);
  const defaultOwnerOrgUnitId =
    application.ownerOrgUnitId ?? filterOptions?.ownerOrgUnits[0]?.orgUnitId;
  const preferredMarginTemplate = filterOptions?.marginTemplates.find(
    (template) => template.preferred,
  );

  const finish = React.useCallback(
    (result: DealershipApplicationActionResult): boolean => {
      if (result.ok) {
        toast.success({ title: result.message });
        setOperation(null);
        setStep(0);
        router.refresh();
        return true;
      }

      const fieldSummary = result.fieldErrors
        ?.slice(0, 3)
        .map((item) => `${item.path}: ${item.message}`)
        .join(" ");
      const retrySummary =
        result.retryAfterSeconds === undefined
          ? undefined
          : `Retry after ${String(result.retryAfterSeconds)} seconds.`;
      const referenceSummary =
        result.requestId === undefined
          ? undefined
          : `Reference: ${result.requestId}.`;

      toast.error({
        title: "Operation could not be completed",
        description: [
          result.message,
          fieldSummary,
          retrySummary,
          referenceSummary,
        ]
          .filter((value): value is string => value !== undefined)
          .join(" "),
      });
      return false;
    },
    [router, toast],
  );

  function open(nextOperation: WorkflowOperation): void {
    setOperation(nextOperation);
    setStep(0);
    setIntentKey(idempotencyKey(`dealership-${nextOperation.toLowerCase()}`));
    setTransitionStatus(allowedTransitions[0] ?? "");
    setActivityKind("FOLLOW_UP");
    setAssignmentTarget(application.ownerUserId ?? "__SELF__");
    setDocumentReady(false);
    setAudioReady(false);
    setContactVerified(false);
  }

  function advanceStep(nextStep: number): void {
    const panel = formRef.current?.querySelector<HTMLElement>(
      `[data-workflow-panel="${String(step)}"]`,
    );
    const controls = panel?.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea");

    if (controls !== undefined) {
      for (const control of controls) {
        if (!control.checkValidity()) {
          control.reportValidity();
          return;
        }
      }
    }

    if (operation === "DOCUMENT" && step === 0 && !documentReady) {
      toast.error({
        title: "Complete the secure upload first",
        description:
          "Continue after the document passes the centralized security scan.",
      });
      return;
    }

    if (operation === "AUDIO" && step === 0 && !audioReady) {
      toast.error({
        title: "Complete the audio upload first",
        description:
          "Record, preview, and upload the note before entering its details.",
      });
      return;
    }

    if (operation === "ONBOARD" && step === 1 && !contactVerified) {
      toast.error({
        title: "Verify the ERP administrator",
        description:
          "Confirm the login email and mobile number before continuing.",
      });
      return;
    }

    setStep(nextStep);
  }

  function submit(event: React.SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (operation === null || intentKey.length < 16) return;
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        let result: DealershipApplicationActionResult;

        if (operation === "ASSIGN") {
          const selectedOwner = field(formData, "ownerUserId");
          result =
            selectedOwner === "__SELF__"
              ? await claimDealershipApplicationAction({
                  applicationId: application.applicationId,
                  reason: field(formData, "reason"),
                  rowVersion: application.rowVersion,
                  idempotencyKey: intentKey,
                })
              : await assignDealershipApplicationAction({
                  applicationId: application.applicationId,
                  ownerUserId:
                    selectedOwner === "__UNASSIGNED__" ? null : selectedOwner,
                  ownerOrgUnitId: field(formData, "ownerOrgUnitId"),
                  reason: field(formData, "reason"),
                  rowVersion: application.rowVersion,
                  idempotencyKey: intentKey,
                });
        } else if (operation === "STATUS") {
          result = await transitionDealershipApplicationAction({
            applicationId: application.applicationId,
            status: field(formData, "status") as DealershipApplicationStatus,
            reason: field(formData, "reason"),
            rowVersion: application.rowVersion,
            idempotencyKey: intentKey,
            ...optional("note", optionalField(formData, "note")),
            ...optional("nextActionAt", optionalIso(formData, "nextActionAt")),
            ...optional(
              "priority",
              optionalField(formData, "priority") as
                typeof application.priority | undefined,
            ),
            ...optional(
              "rejectionReason",
              optionalField(formData, "rejectionReason"),
            ),
          });
        } else if (operation === "CANCEL") {
          result = await cancelDealershipApplicationAction({
            applicationId: application.applicationId,
            reason: field(formData, "reason"),
            rowVersion: application.rowVersion,
            idempotencyKey: intentKey,
          });
        } else if (operation === "ACTIVITY") {
          result = await createDealershipApplicationActivityAction({
            applicationId: application.applicationId,
            kind: field(
              formData,
              "kind",
            ) as (typeof DEALERSHIP_APPLICATION_ACTIVITY_KINDS)[number],
            status: field(
              formData,
              "activityStatus",
            ) as (typeof DEALERSHIP_APPLICATION_ACTIVITY_STATUSES)[number],
            title: field(formData, "title"),
            idempotencyKey: intentKey,
            ...optional("note", optionalField(formData, "note")),
            ...optional("outcome", optionalField(formData, "outcome")),
            ...optional("dueAt", optionalIso(formData, "dueAt")),
            ...optional(
              "scheduledStartAt",
              optionalIso(formData, "scheduledStartAt"),
            ),
            ...optional(
              "scheduledEndAt",
              optionalIso(formData, "scheduledEndAt"),
            ),
            ...optional(
              "ownerUserId",
              field(formData, "activityOwnerUserId") === "__CURRENT__"
                ? undefined
                : optionalField(formData, "activityOwnerUserId"),
            ),
          });
        } else if (operation === "DOCUMENT") {
          result = await bindDealershipApplicationDocumentAction({
            applicationId: application.applicationId,
            fileId: field(formData, "fileId"),
            kind: field(
              formData,
              "documentKind",
            ) as (typeof DEALERSHIP_APPLICATION_DOCUMENT_KINDS)[number],
            idempotencyKey: intentKey,
            ...optional("expiresAt", optionalIso(formData, "expiresAt")),
            ...optional("note", optionalField(formData, "note")),
          });
        } else if (operation === "AUDIO") {
          const audioFileId = field(formData, "audioFileId");
          if (audioFileId.length === 0) {
            throw new Error(
              "Record and upload the audio note before saving the activity.",
            );
          }
          result = await createDealershipApplicationActivityAction({
            applicationId: application.applicationId,
            kind: "MEETING_NOTE_AUDIO",
            status: "COMPLETED",
            title: field(formData, "title"),
            idempotencyKey: intentKey,
            audioFileId,
            ...optional("note", optionalField(formData, "note")),
            ...optional("outcome", optionalField(formData, "outcome")),
          });
        } else if (operation === "ONBOARD") {
          if (!canOnboardNow) {
            throw new Error(
              "The application must be approved before the ERP dealer profile can be created.",
            );
          }
          if (!contactVerified) {
            throw new Error(
              "Confirm that the login email and phone were verified with the applicant.",
            );
          }
          result = await provisionDealershipApplicationDealerAction({
            applicationId: application.applicationId,
            parentOrgUnitId: field(formData, "parentOrgUnitId"),
            orgUnitType: field(
              formData,
              "orgUnitType",
            ) as (typeof DEALER_ORG_UNIT_TYPES)[number],
            dealerName: field(formData, "dealerName"),
            loginDisplayName: field(formData, "loginDisplayName"),
            loginEmail: field(formData, "loginEmail"),
            loginPhoneE164: field(formData, "loginPhoneE164"),
            roleName: "dealer_admin",
            addressLine1: field(formData, "addressLine1"),
            city: field(formData, "city"),
            district: field(formData, "district"),
            state: field(formData, "state"),
            postalCode: field(formData, "postalCode"),
            contactVerified: true,
            reason: field(formData, "reason"),
            rowVersion: application.rowVersion,
            idempotencyKey: intentKey,
            ...optional(
              "marginSourceOrgUnitId",
              optionalField(formData, "marginSourceOrgUnitId"),
            ),
            ...optional(
              "addressLine2",
              optionalField(formData, "addressLine2"),
            ),
            ...optional("latitude", optionalNumber(formData, "latitude")),
            ...optional("longitude", optionalNumber(formData, "longitude")),
          });
        } else if (operation === "EXIT_INITIATE") {
          result = await initiateDealershipApplicationExitAction({
            applicationId: application.applicationId,
            reason: field(formData, "reason"),
            effectiveDate: field(formData, "effectiveDate"),
            rowVersion: application.rowVersion,
            idempotencyKey: intentKey,
            ...optional("note", optionalField(formData, "note")),
          });
        } else {
          result = await completeDealershipApplicationExitAction({
            applicationId: application.applicationId,
            reason: field(formData, "reason"),
            rowVersion: application.rowVersion,
            idempotencyKey: intentKey,
          });
        }

        finish(result);
      } catch (error: unknown) {
        toast.error({
          title: "Review the information",
          description:
            error instanceof Error
              ? error.message
              : "The entered information could not be validated.",
        });
      }
    });
  }

  const onboardingStatus = alreadyProvisioned
    ? "ERP dealer created"
    : canOnboardNow
      ? "Ready to create"
      : "Approval required";
  const onboardingStatusVariant = alreadyProvisioned
    ? "default"
    : canOnboardNow
      ? "secondary"
      : "outline";

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {capabilities.canManageActivities ? (
          <OperationTile
            title="Appointment / follow-up"
            description="Schedule calls, meetings, callbacks, and next actions without leaving this application."
            icon={<CalendarClock aria-hidden="true" className="size-5" />}
            tone="primary"
            tooltip="Use one activity to capture timing, owner, notes, and outcome."
            onClick={() => {
              open("ACTIVITY");
            }}
          />
        ) : null}

        {capabilities.canProvisionDealer ? (
          <OperationTile
            title="Onboard dealer"
            description={
              alreadyProvisioned
                ? "The ERP dealer profile already exists. Open the dealer workspace for ongoing maintenance."
                : "Prepare the partner profile, administrator, location, and commercial setup in a guided flow."
            }
            icon={<Building2 aria-hidden="true" className="size-5" />}
            tone={canOnboardNow ? "success" : "warning"}
            status={onboardingStatus}
            statusVariant={onboardingStatusVariant}
            tooltip={
              alreadyProvisioned
                ? "Dealer provisioning cannot be repeated for this application."
                : canOnboardNow
                  ? "The application is approved and eligible for atomic ERP provisioning."
                  : "You can review the onboarding form now; final creation remains protected until approval."
            }
            disabled={alreadyProvisioned || filterOptions === null}
            onClick={() => {
              open("ONBOARD");
            }}
          />
        ) : null}

        {capabilities.canManageDocuments &&
        capabilities.canUploadDealerFiles ? (
          <OperationTile
            title="Upload documents"
            description="Upload business, tax, bank, identity, agreement, and facility evidence directly from ERP."
            icon={<FileUp aria-hidden="true" className="size-5" />}
            tone="info"
            tooltip="Files are checksum-bound, privately stored, and malware scanned before attachment."
            onClick={() => {
              open("DOCUMENT");
            }}
          />
        ) : null}

        {capabilities.canManageActivities &&
        capabilities.canUploadDealerFiles ? (
          <OperationTile
            title="Record audio note"
            description="Record a meeting note, preview it locally, then upload and attach it securely."
            icon={<Mic aria-hidden="true" className="size-5" />}
            tone="info"
            tooltip="Nothing is uploaded while recording; the recording is sent only after confirmation."
            onClick={() => {
              open("AUDIO");
            }}
          />
        ) : null}

        {canUpdateStage ? (
          <OperationTile
            title="Update application"
            description="Record the current decision, priority, next action, or rejection reason."
            icon={<Workflow aria-hidden="true" className="size-5" />}
            tone="default"
            status={titleCaseDealershipToken(application.status)}
            tooltip="Only backend-approved lifecycle transitions are offered for the current status."
            onClick={() => {
              open("STATUS");
            }}
          />
        ) : null}

        {capabilities.canAssign &&
        (application.ownerUserId === null || filterOptions !== null) ? (
          <OperationTile
            title={
              application.ownerUserId === null
                ? "Take ownership"
                : "Change owner"
            }
            description="Assign the application to yourself, another manager, or the central queue."
            icon={<UserRoundCog aria-hidden="true" className="size-5" />}
            tone="default"
            status={application.ownerName ?? "Unassigned"}
            tooltip="Ownership changes are audited and protected by the current row version."
            onClick={() => {
              open("ASSIGN");
            }}
          />
        ) : null}

        {canCancel ? (
          <OperationTile
            title="Cancel application"
            description="Close an application the organization does not intend to pursue. A reason is required."
            icon={<Ban aria-hidden="true" className="size-5" />}
            tone="destructive"
            tooltip="Cancellation is terminal, audited, and available only before dealer provisioning."
            onClick={() => {
              open("CANCEL");
            }}
          />
        ) : null}

        {canInitiateExit ? (
          <OperationTile
            title="Start dealer exit"
            description="Open the controlled clearance, settlement, access, and margin closure workflow."
            icon={<LogOut aria-hidden="true" className="size-5" />}
            tone="destructive"
            tooltip="The dealer remains active until the mandatory exit controls are completed."
            onClick={() => {
              open("EXIT_INITIATE");
            }}
          />
        ) : null}

        {canCompleteExit ? (
          <OperationTile
            title="Complete dealer exit"
            description="Finalize access revocation and close the dealer after every required clearance."
            icon={<ShieldCheck aria-hidden="true" className="size-5" />}
            tone="destructive"
            tooltip="This permanent operation is rejected unless the backend confirms all mandatory exit items."
            onClick={() => {
              open("EXIT_COMPLETE");
            }}
          />
        ) : null}
      </div>

      {filterOptions === null &&
      (capabilities.canAssign || capabilities.canProvisionDealer) ? (
        <Alert variant="warning">
          <ShieldCheck aria-hidden="true" />
          <AlertTitle>
            Some setup choices are temporarily unavailable
          </AlertTitle>
          <AlertDescription>
            Owner, organization, and margin-template choices could not be
            loaded. Other application actions remain available and no unsafe
            fallback values are used.
          </AlertDescription>
        </Alert>
      ) : null}

      <Dialog
        open={operation !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setOperation(null);
            setStep(0);
          }
        }}
      >
        <DialogContent height="tall" className="sm:max-w-4xl">
          {operation === null ? null : (
            <form ref={formRef} onSubmit={submit} className="contents">
              <DialogHeader>
                <DialogTitle>{operationTitle(operation)}</DialogTitle>
                <DialogDescription>
                  {operationDescription(operation, applicationReference)}
                </DialogDescription>
              </DialogHeader>

              <DialogBody>
                {operation === "ASSIGN" ? (
                  <div className="grid gap-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        label="Responsible person"
                        htmlFor="workflow-owner-user"
                        required
                        help="Choose yourself, an authorized manager, or return the application to the central queue."
                      >
                        <Select
                          name="ownerUserId"
                          value={assignmentTarget}
                          onValueChange={setAssignmentTarget}
                          required
                        >
                          <SelectTrigger id="workflow-owner-user">
                            <SelectValue placeholder="Select responsible person" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__SELF__">
                              Assign to me
                            </SelectItem>
                            <SelectItem value="__UNASSIGNED__">
                              Central queue
                            </SelectItem>
                            {filterOptions?.owners.map((owner) => (
                              <SelectItem
                                key={owner.userId}
                                value={owner.userId}
                              >
                                {owner.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>

                      <FormField
                        label="Owning organization"
                        htmlFor="workflow-owner-org"
                        required
                      >
                        <Select
                          name="ownerOrgUnitId"
                          required={assignmentTarget !== "__SELF__"}
                          disabled={assignmentTarget === "__SELF__"}
                          {...(defaultOwnerOrgUnitId === undefined
                            ? {}
                            : { defaultValue: defaultOwnerOrgUnitId })}
                        >
                          <SelectTrigger id="workflow-owner-org">
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {filterOptions?.ownerOrgUnits.map((orgUnit) => (
                              <SelectItem
                                key={orgUnit.orgUnitId}
                                value={orgUnit.orgUnitId}
                              >
                                {orgUnit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                    </div>
                    <FormField
                      label="Reason for ownership change"
                      htmlFor="workflow-assign-reason"
                      required
                    >
                      <Textarea
                        id="workflow-assign-reason"
                        name="reason"
                        minLength={3}
                        maxLength={500}
                        placeholder="For example: Assigned to the manager responsible for this district."
                        required
                      />
                    </FormField>
                  </div>
                ) : null}

                {operation === "STATUS" ? (
                  <div className="grid gap-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        label="Current decision"
                        htmlFor="workflow-status"
                        required
                      >
                        <Select
                          name="status"
                          value={transitionStatus}
                          onValueChange={(value) => {
                            setTransitionStatus(
                              value as DealershipApplicationStatus,
                            );
                          }}
                          required
                        >
                          <SelectTrigger id="workflow-status">
                            <SelectValue placeholder="Choose the next status" />
                          </SelectTrigger>
                          <SelectContent>
                            {allowedTransitions.map((status) => (
                              <SelectItem key={status} value={status}>
                                {titleCaseDealershipToken(status)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>

                      <FormField label="Priority" htmlFor="workflow-priority">
                        <Select
                          name="priority"
                          defaultValue={application.priority}
                        >
                          <SelectTrigger id="workflow-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEALERSHIP_APPLICATION_PRIORITIES.map(
                              (priority) => (
                                <SelectItem key={priority} value={priority}>
                                  {titleCaseDealershipToken(priority)}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </FormField>

                      <FormField
                        label="Next action date and time"
                        htmlFor="workflow-next-action"
                      >
                        <Input
                          id="workflow-next-action"
                          name="nextActionAt"
                          type="datetime-local"
                          placeholder="Select next action date and time"
                        />
                      </FormField>

                      {transitionStatus === "REJECTED" ? (
                        <FormField
                          label="Rejection reason"
                          htmlFor="workflow-rejection"
                          required
                        >
                          <Textarea
                            id="workflow-rejection"
                            name="rejectionReason"
                            placeholder="Explain why the application is rejected"
                            minLength={3}
                            maxLength={2_000}
                            required
                          />
                        </FormField>
                      ) : null}
                    </div>

                    <FormField
                      label="Internal note"
                      htmlFor="workflow-status-note"
                    >
                      <Textarea
                        id="workflow-status-note"
                        name="note"
                        maxLength={10_000}
                        placeholder="Record the facts supporting this decision."
                      />
                    </FormField>
                    <FormField
                      label="Reason for this update"
                      htmlFor="workflow-status-reason"
                      required
                    >
                      <Textarea
                        id="workflow-status-reason"
                        name="reason"
                        placeholder="Explain the status update"
                        minLength={3}
                        maxLength={2_000}
                        required
                      />
                    </FormField>
                  </div>
                ) : null}

                {operation === "ACTIVITY" ? (
                  <div className="grid gap-5">
                    <WorkflowStepper
                      steps={ACTIVITY_STEPS}
                      currentStep={step}
                    />
                    <div
                      data-workflow-panel="0"
                      className={
                        step === 0 ? "grid gap-4 sm:grid-cols-2" : "hidden"
                      }
                    >
                      <FormField
                        label="Activity type"
                        htmlFor="workflow-activity-kind"
                        required
                      >
                        <Select
                          name="kind"
                          value={activityKind}
                          onValueChange={(value) => {
                            setActivityKind(
                              value as (typeof DEALERSHIP_APPLICATION_ACTIVITY_KINDS)[number],
                            );
                          }}
                          required
                        >
                          <SelectTrigger id="workflow-activity-kind">
                            <SelectValue placeholder="Select activity type" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEALERSHIP_APPLICATION_ACTIVITY_KINDS.filter(
                              (kind) =>
                                kind !== "EMAIL" &&
                                kind !== "WHATSAPP" &&
                                kind !== "MEETING_NOTE_AUDIO",
                            ).map((kind) => (
                              <SelectItem key={kind} value={kind}>
                                {titleCaseDealershipToken(kind)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField
                        label="Activity status"
                        htmlFor="workflow-activity-status"
                        required
                      >
                        <Select
                          name="activityStatus"
                          defaultValue="SCHEDULED"
                          required
                        >
                          <SelectTrigger id="workflow-activity-status">
                            <SelectValue placeholder="Select activity status" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEALERSHIP_APPLICATION_ACTIVITY_STATUSES.map(
                              (status) => (
                                <SelectItem key={status} value={status}>
                                  {titleCaseDealershipToken(status)}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField
                        label="Title"
                        htmlFor="workflow-activity-title"
                        required
                        className="sm:col-span-2"
                      >
                        <Input
                          id="workflow-activity-title"
                          name="title"
                          minLength={1}
                          maxLength={256}
                          placeholder="For example: Showroom site visit"
                          required
                        />
                      </FormField>
                      <FormField
                        label="Start date and time"
                        htmlFor="workflow-activity-start"
                        required={activityKind === "APPOINTMENT"}
                      >
                        <Input
                          id="workflow-activity-start"
                          name="scheduledStartAt"
                          type="datetime-local"
                          placeholder="Select activity start"
                          required={activityKind === "APPOINTMENT"}
                        />
                      </FormField>
                      <FormField
                        label="End date and time"
                        htmlFor="workflow-activity-end"
                        required={activityKind === "APPOINTMENT"}
                      >
                        <Input
                          id="workflow-activity-end"
                          name="scheduledEndAt"
                          type="datetime-local"
                          placeholder="Select activity end"
                          required={activityKind === "APPOINTMENT"}
                        />
                      </FormField>
                      <FormField
                        label="Follow-up due"
                        htmlFor="workflow-activity-due"
                        className="sm:col-span-2"
                      >
                        <Input
                          id="workflow-activity-due"
                          name="dueAt"
                          type="datetime-local"
                          placeholder="Select follow-up due date and time"
                        />
                      </FormField>
                    </div>
                    <div
                      data-workflow-panel="1"
                      className={
                        step === 1 ? "grid gap-4 sm:grid-cols-2" : "hidden"
                      }
                    >
                      <FormField
                        label="Responsible person"
                        htmlFor="workflow-activity-owner"
                      >
                        <Select
                          name="activityOwnerUserId"
                          defaultValue={
                            application.ownerUserId ?? "__CURRENT__"
                          }
                        >
                          <SelectTrigger id="workflow-activity-owner">
                            <SelectValue placeholder="Select activity owner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__CURRENT__">
                              Current user
                            </SelectItem>
                            {filterOptions?.owners.map((owner) => (
                              <SelectItem
                                key={owner.userId}
                                value={owner.userId}
                              >
                                {owner.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField
                        label="Outcome"
                        htmlFor="workflow-activity-outcome"
                      >
                        <Input
                          id="workflow-activity-outcome"
                          name="outcome"
                          maxLength={1_000}
                          placeholder="Optional result or commitment"
                        />
                      </FormField>
                      <FormField
                        label="Notes"
                        htmlFor="workflow-activity-note"
                        className="sm:col-span-2"
                      >
                        <Textarea
                          id="workflow-activity-note"
                          name="note"
                          maxLength={10_000}
                          placeholder="Add only information needed by the next staff member."
                        />
                      </FormField>
                    </div>
                  </div>
                ) : null}

                {operation === "DOCUMENT" ? (
                  <div className="grid gap-5">
                    <WorkflowStepper
                      steps={DOCUMENT_STEPS}
                      currentStep={step}
                    />
                    <div
                      data-workflow-panel="0"
                      className={step === 0 ? "grid gap-4" : "hidden"}
                    >
                      <CentralFileUploadField
                        id="workflow-document-file"
                        name="fileId"
                        label="Document file"
                        description="PDF, image, or DOCX up to 25 MB. The file must complete malware scanning before it can be attached."
                        target={{
                          resourceKind: "APPLICATION",
                          resourceId: application.applicationId,
                          purpose: "APPLICATION_DOCUMENT",
                        }}
                        accept="application/pdf,image/png,image/jpeg,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        required
                        disabled={pending}
                        onReadyChange={(file) => {
                          setDocumentReady(file !== null);
                        }}
                      />
                    </div>
                    <div
                      data-workflow-panel="1"
                      className={
                        step === 1 ? "grid gap-4 sm:grid-cols-2" : "hidden"
                      }
                    >
                      <FormField
                        label="Document type"
                        htmlFor="workflow-document-kind"
                        required
                      >
                        <Select
                          name="documentKind"
                          defaultValue="BUSINESS_REGISTRATION"
                          required
                        >
                          <SelectTrigger id="workflow-document-kind">
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEALERSHIP_APPLICATION_DOCUMENT_KINDS.map(
                              (kind) => (
                                <SelectItem key={kind} value={kind}>
                                  {titleCaseDealershipToken(kind)}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField
                        label="Valid until"
                        htmlFor="workflow-document-expiry"
                      >
                        <Input
                          id="workflow-document-expiry"
                          name="expiresAt"
                          type="datetime-local"
                          placeholder="Select document expiry"
                        />
                      </FormField>
                      <FormField
                        label="Reviewer note"
                        htmlFor="workflow-document-note"
                        className="sm:col-span-2"
                      >
                        <Textarea
                          id="workflow-document-note"
                          name="note"
                          maxLength={1_000}
                          placeholder="Optional context for the reviewer"
                        />
                      </FormField>
                    </div>
                  </div>
                ) : null}

                {operation === "AUDIO" ? (
                  <div className="grid gap-5">
                    <WorkflowStepper steps={AUDIO_STEPS} currentStep={step} />
                    <div
                      data-workflow-panel="0"
                      className={step === 0 ? "grid gap-4" : "hidden"}
                    >
                      <AudioNoteRecorder
                        applicationId={application.applicationId}
                        onReadyChange={(file) => {
                          setAudioReady(file !== null);
                        }}
                      />
                    </div>
                    <div
                      data-workflow-panel="1"
                      className={step === 1 ? "grid gap-4" : "hidden"}
                    >
                      <FormField
                        label="Note title"
                        htmlFor="workflow-audio-title"
                        required
                      >
                        <Input
                          id="workflow-audio-title"
                          name="title"
                          minLength={1}
                          maxLength={256}
                          placeholder="For example: Dealer manager meeting"
                          required
                        />
                      </FormField>
                      <FormField
                        label="Text summary"
                        htmlFor="workflow-audio-note"
                      >
                        <Textarea
                          id="workflow-audio-note"
                          name="note"
                          maxLength={10_000}
                          placeholder="Summarize the decisions and next actions for users who cannot listen now."
                        />
                      </FormField>
                      <FormField
                        label="Outcome"
                        htmlFor="workflow-audio-outcome"
                      >
                        <Input
                          id="workflow-audio-outcome"
                          name="outcome"
                          maxLength={1_000}
                          placeholder="Optional final outcome"
                        />
                      </FormField>
                    </div>
                  </div>
                ) : null}

                {operation === "ONBOARD" ? (
                  <div className="grid gap-5">
                    <WorkflowStepper
                      steps={ONBOARDING_STEPS}
                      currentStep={step}
                    />

                    {!canOnboardNow ? (
                      <Alert variant="warning">
                        <ShieldCheck aria-hidden="true" />
                        <AlertTitle>
                          Approval is required before dealer creation
                        </AlertTitle>
                        <AlertDescription>
                          You may review and prepare every onboarding section
                          now. The final create action remains disabled until
                          the application reaches Approved.
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    <div
                      data-workflow-panel="0"
                      className={
                        step === 0 ? "grid gap-4 sm:grid-cols-2" : "hidden"
                      }
                    >
                      <FormField
                        label="Dealer name"
                        htmlFor="workflow-dealer-name"
                        required
                        className="sm:col-span-2"
                      >
                        <Input
                          id="workflow-dealer-name"
                          name="dealerName"
                          defaultValue={application.applicantName}
                          placeholder="Enter dealer name"
                          maxLength={120}
                          required
                        />
                      </FormField>
                      <FormField
                        label="Organization type"
                        htmlFor="workflow-org-type"
                        required
                        help="Choose Dealer for a primary partner or Sub-dealer when the organization belongs under an existing dealer."
                      >
                        <Select
                          name="orgUnitType"
                          defaultValue={
                            application.proposedOrgUnitType ?? "DEALER"
                          }
                          required
                        >
                          <SelectTrigger id="workflow-org-type">
                            <SelectValue placeholder="Select organization type" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEALER_ORG_UNIT_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {titleCaseDealershipToken(type)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <WorkflowSummaryItem
                        label="Application"
                        value={applicationReference}
                        icon={
                          <ClipboardCheck
                            aria-hidden="true"
                            className="size-4"
                          />
                        }
                      />
                    </div>

                    <div
                      data-workflow-panel="1"
                      className={
                        step === 1 ? "grid gap-4 sm:grid-cols-2" : "hidden"
                      }
                    >
                      <FormField
                        label="Administrator name"
                        htmlFor="workflow-admin-name"
                        required
                      >
                        <Input
                          id="workflow-admin-name"
                          name="loginDisplayName"
                          defaultValue={application.applicantName}
                          placeholder="Enter administrator name"
                          maxLength={120}
                          required
                        />
                      </FormField>
                      <FormField
                        label="Initial ERP role"
                        htmlFor="workflow-admin-role"
                      >
                        <Input
                          id="workflow-admin-role"
                          value="Dealer administrator"
                          placeholder="Dealer administrator"
                          readOnly
                          aria-readonly="true"
                        />
                      </FormField>
                      <FormField
                        label="Verified email"
                        htmlFor="workflow-admin-email"
                        required
                      >
                        <Input
                          id="workflow-admin-email"
                          name="loginEmail"
                          type="email"
                          placeholder="Enter verified email address"
                          defaultValue={application.applicantEmail ?? ""}
                          required
                        />
                      </FormField>
                      <FormField
                        label="Verified mobile number"
                        htmlFor="workflow-admin-phone"
                        required
                        help="Use the Indian E.164 format, for example +919876543210."
                      >
                        <Input
                          id="workflow-admin-phone"
                          name="loginPhoneE164"
                          type="tel"
                          placeholder="+919876543210"
                          pattern="\+91[6-9][0-9]{9}"
                          required
                        />
                      </FormField>
                      <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/25 p-4 sm:col-span-2">
                        <Checkbox
                          id="workflow-contact-verified"
                          checked={contactVerified}
                          onCheckedChange={(value) => {
                            setContactVerified(value === true);
                          }}
                        />
                        <Label
                          htmlFor="workflow-contact-verified"
                          className="cursor-pointer leading-relaxed"
                        >
                          I verified the email and mobile number with the
                          applicant and confirmed that this person will
                          administer the new ERP dealer account.
                        </Label>
                      </div>
                    </div>

                    <div
                      data-workflow-panel="2"
                      className={
                        step === 2 ? "grid gap-4 sm:grid-cols-2" : "hidden"
                      }
                    >
                      <FormField
                        label="Address line 1"
                        htmlFor="workflow-address-1"
                        required
                        className="sm:col-span-2"
                      >
                        <Input
                          id="workflow-address-1"
                          name="addressLine1"
                          placeholder="Enter primary address"
                          maxLength={240}
                          required
                        />
                      </FormField>
                      <FormField
                        label="Address line 2"
                        htmlFor="workflow-address-2"
                        className="sm:col-span-2"
                      >
                        <Input
                          id="workflow-address-2"
                          name="addressLine2"
                          placeholder="Enter additional address details"
                          maxLength={240}
                        />
                      </FormField>
                      <FormField label="City" htmlFor="workflow-city" required>
                        <Input
                          id="workflow-city"
                          name="city"
                          placeholder="Enter city"
                          defaultValue={application.city ?? ""}
                          maxLength={100}
                          required
                        />
                      </FormField>
                      <FormField
                        label="District"
                        htmlFor="workflow-district"
                        required
                      >
                        <Input
                          id="workflow-district"
                          name="district"
                          placeholder="Enter district"
                          defaultValue={application.district ?? ""}
                          maxLength={100}
                          required
                        />
                      </FormField>
                      <FormField
                        label="State"
                        htmlFor="workflow-state"
                        required
                      >
                        <Input
                          id="workflow-state"
                          name="state"
                          placeholder="Enter state"
                          defaultValue={application.state ?? ""}
                          maxLength={100}
                          required
                        />
                      </FormField>
                      <FormField
                        label="Postal code"
                        htmlFor="workflow-postal"
                        required
                      >
                        <Input
                          id="workflow-postal"
                          name="postalCode"
                          inputMode="numeric"
                          pattern="[1-9][0-9]{5}"
                          placeholder="600001"
                          required
                        />
                      </FormField>
                      <FormField label="Latitude" htmlFor="workflow-latitude">
                        <Input
                          id="workflow-latitude"
                          name="latitude"
                          type="number"
                          placeholder="Enter latitude"
                          step="any"
                        />
                      </FormField>
                      <FormField label="Longitude" htmlFor="workflow-longitude">
                        <Input
                          id="workflow-longitude"
                          name="longitude"
                          type="number"
                          placeholder="Enter longitude"
                          step="any"
                        />
                      </FormField>
                    </div>

                    <div
                      data-workflow-panel="3"
                      className={
                        step === 3 ? "grid gap-4 sm:grid-cols-2" : "hidden"
                      }
                    >
                      <FormField
                        label="Parent organization"
                        htmlFor="workflow-parent-org"
                        required
                        help="The selected parent controls the organization hierarchy and authorized operational scope."
                        className="sm:col-span-2"
                      >
                        <Select
                          name="parentOrgUnitId"
                          required
                          {...(defaultOwnerOrgUnitId === undefined
                            ? {}
                            : { defaultValue: defaultOwnerOrgUnitId })}
                        >
                          <SelectTrigger id="workflow-parent-org">
                            <SelectValue placeholder="Select authorized parent organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {filterOptions?.ownerOrgUnits.map((orgUnit) => (
                              <SelectItem
                                key={orgUnit.orgUnitId}
                                value={orgUnit.orgUnitId}
                              >
                                {orgUnit.name} · {orgUnit.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField
                        label="Margin template"
                        htmlFor="workflow-margin-template"
                        help="The backend copies only active, same-type margins in the atomic provisioning transaction."
                        className="sm:col-span-2"
                      >
                        <Select
                          name="marginSourceOrgUnitId"
                          {...(preferredMarginTemplate === undefined
                            ? {}
                            : {
                                defaultValue: preferredMarginTemplate.orgUnitId,
                              })}
                        >
                          <SelectTrigger id="workflow-margin-template">
                            <SelectValue placeholder="Use preferred margin template" />
                          </SelectTrigger>
                          <SelectContent>
                            {filterOptions?.marginTemplates.map((template) => (
                              <SelectItem
                                key={template.orgUnitId}
                                value={template.orgUnitId}
                              >
                                {template.name} ·{" "}
                                {String(template.activeMarginCount)} active
                                margins
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                    </div>

                    <div
                      data-workflow-panel="4"
                      className={step === 4 ? "grid gap-4" : "hidden"}
                    >
                      <Alert>
                        <BadgeCheck aria-hidden="true" />
                        <AlertTitle>
                          One atomic provisioning operation
                        </AlertTitle>
                        <AlertDescription>
                          The backend creates the dealer location, organization,
                          administrator identity, membership, role assignment,
                          and active margins together. A failure rolls back the
                          complete operation.
                        </AlertDescription>
                      </Alert>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <WorkflowSummaryItem
                          label="Applicant"
                          value={application.applicantName}
                        />
                        <WorkflowSummaryItem
                          label="Application status"
                          value={titleCaseDealershipToken(application.status)}
                        />
                        <WorkflowSummaryItem
                          label="Current owner"
                          value={application.ownerName ?? "Unassigned"}
                        />
                        <WorkflowSummaryItem
                          label="Provisioning readiness"
                          value={canOnboardNow ? "Ready" : "Approval required"}
                        />
                      </div>
                      <FormField
                        label="Reason for creating ERP access"
                        htmlFor="workflow-onboard-reason"
                        required
                      >
                        <Textarea
                          id="workflow-onboard-reason"
                          name="reason"
                          minLength={3}
                          maxLength={500}
                          placeholder="Record the approved business reason for dealer creation."
                          required
                        />
                      </FormField>
                    </div>
                  </div>
                ) : null}

                {operation === "EXIT_INITIATE" ? (
                  <div className="grid gap-5">
                    <Alert variant="warning">
                      <Route aria-hidden="true" />
                      <AlertTitle>
                        Controlled exit keeps the dealer auditable
                      </AlertTitle>
                      <AlertDescription>
                        Starting exit opens clearance and settlement controls.
                        It does not immediately revoke access or close margins.
                      </AlertDescription>
                    </Alert>
                    <FormField
                      label="Effective date"
                      htmlFor="workflow-exit-date"
                      required
                    >
                      <Input
                        id="workflow-exit-date"
                        name="effectiveDate"
                        type="date"
                        placeholder="Select exit effective date"
                        required
                      />
                    </FormField>
                    <FormField label="Exit note" htmlFor="workflow-exit-note">
                      <Textarea
                        id="workflow-exit-note"
                        name="note"
                        placeholder="Add exit context"
                        maxLength={10_000}
                      />
                    </FormField>
                    <FormField
                      label="Reason for starting exit"
                      htmlFor="workflow-exit-reason"
                      required
                    >
                      <Textarea
                        id="workflow-exit-reason"
                        name="reason"
                        placeholder="Explain why exit is being started"
                        minLength={3}
                        maxLength={2_000}
                        required
                      />
                    </FormField>
                  </div>
                ) : null}

                {operation === "CANCEL" ? (
                  <div className="grid gap-5">
                    <Alert variant="destructive">
                      <Ban aria-hidden="true" />
                      <AlertTitle>This closes the application</AlertTitle>
                      <AlertDescription>
                        Open appointments and follow-ups will be cancelled. The
                        application remains available in history and cannot be
                        resumed through the normal lifecycle.
                      </AlertDescription>
                    </Alert>
                    <FormField
                      label="Cancellation reason"
                      htmlFor="workflow-cancel-reason"
                      required
                    >
                      <Textarea
                        id="workflow-cancel-reason"
                        name="reason"
                        minLength={3}
                        maxLength={2_000}
                        placeholder="Explain why the organization will not pursue this application."
                        required
                      />
                    </FormField>
                  </div>
                ) : null}

                {operation === "EXIT_COMPLETE" ? (
                  <div className="grid gap-5">
                    <Alert variant="destructive">
                      <ShieldCheck aria-hidden="true" />
                      <AlertTitle>
                        This permanently closes dealer operations
                      </AlertTitle>
                      <AlertDescription>
                        Completion revokes sessions and access, disables the
                        dealer organization and user, closes active margins, and
                        closes the application. The backend rejects this action
                        until every mandatory exit requirement is complete.
                      </AlertDescription>
                    </Alert>
                    <FormField
                      label="Reason for completing exit"
                      htmlFor="workflow-exit-complete-reason"
                      required
                    >
                      <Textarea
                        id="workflow-exit-complete-reason"
                        name="reason"
                        placeholder="Explain why exit can be completed"
                        minLength={3}
                        maxLength={2_000}
                        required
                      />
                    </FormField>
                  </div>
                ) : null}
              </DialogBody>

              <DialogFooter className="items-center">
                {operation === "ACTIVITY" ? (
                  <StepActions
                    step={step}
                    total={ACTIVITY_STEPS.length}
                    pending={pending}
                    submitLabel="Save activity"
                    onPrevious={() => {
                      setStep((value) => Math.max(0, value - 1));
                    }}
                    onNext={() => {
                      advanceStep(
                        Math.min(ACTIVITY_STEPS.length - 1, step + 1),
                      );
                    }}
                  />
                ) : operation === "DOCUMENT" ? (
                  <StepActions
                    step={step}
                    total={DOCUMENT_STEPS.length}
                    pending={pending}
                    canSubmit={documentReady}
                    submitLabel="Attach document"
                    onPrevious={() => {
                      setStep((value) => Math.max(0, value - 1));
                    }}
                    onNext={() => {
                      advanceStep(1);
                    }}
                  />
                ) : operation === "AUDIO" ? (
                  <StepActions
                    step={step}
                    total={AUDIO_STEPS.length}
                    pending={pending}
                    submitLabel="Save audio note"
                    onPrevious={() => {
                      setStep((value) => Math.max(0, value - 1));
                    }}
                    onNext={() => {
                      advanceStep(1);
                    }}
                    canSubmit={audioReady}
                  />
                ) : operation === "ONBOARD" ? (
                  <StepActions
                    step={step}
                    total={ONBOARDING_STEPS.length}
                    pending={pending}
                    canSubmit={canOnboardNow && contactVerified}
                    submitLabel="Create ERP dealer"
                    onPrevious={() => {
                      setStep((value) => Math.max(0, value - 1));
                    }}
                    onNext={() => {
                      advanceStep(
                        Math.min(ONBOARDING_STEPS.length - 1, step + 1),
                      );
                    }}
                  />
                ) : (
                  <>
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                      >
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      type="submit"
                      disabled={
                        pending ||
                        (operation === "STATUS" && transitionStatus === "")
                      }
                      variant={
                        operation === "EXIT_INITIATE" ||
                        operation === "EXIT_COMPLETE"
                          ? "destructive"
                          : "default"
                      }
                    >
                      {pending ? (
                        <Spinner aria-hidden="true" className="size-4" />
                      ) : null}
                      {pending ? "Saving…" : operationTitle(operation)}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

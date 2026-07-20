// oz-next-app/src/features/engagement/dealer-lead-updates/ui/dealer-lead-update-page.tsx
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleOff,
  Clock3,
  ExternalLink,
  History,
  Info,
  ListFilter,
  Menu,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Navigation,
  NotebookPen,
  PhoneCall,
  PhoneOff,
  Route,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";

import {
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentEmptyState,
  ContentForm,
  ContentFormActions,
  ContentHeader,
  ContentMetricCard,
  ContentRoot,
  ContentSection,
  ContentSplit,
  ContentStatus,
  ContentToolbar,
} from "@/components/common/content-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
import { idempotencyKey as createIdempotencyKey } from "@/lib/security/request-identifiers";
import { cn } from "@/lib/utils";

import {
  forwardPublicDealerLead,
  getPublicDealerLead,
  updatePublicDealerLead,
} from "@/features/engagement/dealer-lead-updates/api/dealer-lead.client";
import {
  dealerLeadCallNoteFormSchema,
  dealerLeadFollowUpDetailsFormSchema,
  dealerLeadForwardFormSchema,
  dealerLeadForwardRequestSchema,
  dealerLeadNextFollowUpFormSchema,
  dealerLeadUpdateFormSchema,
  dealerLeadUpdateRequestSchema,
  type DealerLeadAction,
  type DealerLeadForwardFormValues,
  type DealerLeadHistoryItem,
  type DealerLeadHistoryKind,
  type DealerLeadPublicView,
  type DealerLeadStatus,
  type DealerLeadUpdateFormValues,
  type DealerLeadWorkflowStep,
  type DealerVehicleCandidate,
  type IvrFlowCode,
} from "@/features/engagement/dealer-lead-updates/contracts/dealer-lead.schema";
import { PublicDealerLeadShell } from "@/features/engagement/dealer-lead-updates/ui/dealer-lead-shell";
import { PublicFormStatusEmblem } from "@/features/engagement/shared/ui/public-form-status-emblem";

export type PublicDealerLeadUpdatePageProps = Readonly<{
  token: string;
  initialLead: DealerLeadPublicView | null;
  loadError?: Readonly<{
    reason: "invalid-token" | "not-found" | "unavailable";
    requestId?: string;
  }>;
}>;

type PendingAction = DealerLeadAction | null;
type PendingMutation =
  "FOLLOW_UP_DETAILS" | "NEXT_FOLLOW_UP" | "CALL_NOTE" | "FORWARD" | null;
type WorkspacePanel = DealerLeadWorkflowStep | "FORWARD";
type HistoryFilter = "ALL" | "CALLS" | "FOLLOW_UPS" | "MESSAGES" | "ROUTING";

type UserFacingError = Readonly<{
  title: string;
  description: string;
  requestId?: string;
}>;

type SuccessNotice = Readonly<{
  title: string;
  description: string;
}>;

type MutationIntent = Readonly<{
  fingerprint: string;
  key: string;
}>;

type WorkspacePanelMeta = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  number?: number;
  icon: React.ReactNode;
}>;

const EMPTY_VALUE = "";
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/u;
const MAX_FOLLOW_UP_DAYS = 30;

const FORM_IDS = {
  FOLLOW_UP_DETAILS: "dealer-lead-follow-up-details-form",
  NEXT_FOLLOW_UP: "dealer-lead-next-follow-up-form",
  CALL_NOTE: "dealer-lead-call-note-form",
  FORWARD: "dealer-lead-forward-form",
} as const;

const WORKFLOW_STEPS = [
  {
    value: "ACTION",
    number: 1,
    label: "Choose an action",
    shortLabel: "Action",
    description: "Choose whether to follow up or route the enquiry.",
  },
  {
    value: "FOLLOW_UP_DETAILS",
    number: 2,
    label: "Follow-up details",
    shortLabel: "Details",
    description: "Record the customer name and response.",
  },
  {
    value: "NEXT_FOLLOW_UP",
    number: 3,
    label: "Next follow-up",
    shortLabel: "Schedule",
    description: "Choose when the customer should be contacted again.",
  },
  {
    value: "CALL_NOTE",
    number: 4,
    label: "Call note",
    shortLabel: "Call note",
    description: "Capture the important points from the conversation.",
  },
  {
    value: "HISTORY",
    number: 5,
    label: "Lead history",
    shortLabel: "History",
    description: "Review every call, follow-up, message, and routing event.",
  },
] as const satisfies ReadonlyArray<{
  value: DealerLeadWorkflowStep;
  number: number;
  label: string;
  shortLabel: string;
  description: string;
}>;

const STATUS_OPTIONS = [
  {
    value: "CONTACTED",
    label: "Spoke with customer",
    description: "The customer answered and the conversation was completed.",
    icon: PhoneCall,
  },
  {
    value: "INTERESTED",
    label: "Customer is interested",
    description: "The customer wants more information or another discussion.",
    icon: CheckCircle2,
  },
  {
    value: "NOT_REACHABLE",
    label: "Could not reach customer",
    description: "The call was not answered or the customer was unavailable.",
    icon: PhoneOff,
  },
  {
    value: "NOT_INTERESTED",
    label: "Customer is not interested",
    description: "The customer does not want to continue at this time.",
    icon: CircleOff,
  },
] as const satisfies ReadonlyArray<{
  value: DealerLeadStatus;
  label: string;
  description: string;
  icon: LucideIcon;
}>;

const ROUTE_OPTIONS = [
  {
    value: "VEHICLE_ENQUIRIES",
    label: "Vehicle enquiry",
    description:
      "Keep the enquiry here or assign it to another eligible nearby dealer.",
    icon: Navigation,
  },
  {
    value: "DEALERSHIP",
    label: "Dealership opportunity",
    description: "Send the enquiry to the dealership application team.",
    icon: Building2,
  },
  {
    value: "SERVICE_ENQUIRIES",
    label: "Service support",
    description: "Send the enquiry to the service support workflow.",
    icon: Route,
  },
  {
    value: "WARRANTY_TAMIL",
    label: "Warranty support",
    description: "Send the enquiry to the Tamil warranty support workflow.",
    icon: ShieldAlert,
  },
] as const satisfies ReadonlyArray<{
  value: IvrFlowCode;
  label: string;
  description: string;
  icon: LucideIcon;
}>;

const HISTORY_FILTERS = [
  { value: "ALL", label: "All activity" },
  { value: "CALLS", label: "Calls" },
  { value: "FOLLOW_UPS", label: "Follow-ups" },
  { value: "MESSAGES", label: "WhatsApp" },
  { value: "ROUTING", label: "Routing" },
] as const satisfies ReadonlyArray<{
  value: HistoryFilter;
  label: string;
}>;

const HISTORY_KIND_LABELS = {
  CALL: "Call",
  FOLLOW_UP: "Follow-up",
  WHATSAPP: "WhatsApp",
  ROUTING: "Routing",
  STATUS: "Status",
  NOTE: "Note",
  ASSIGNMENT: "Assignment",
  SYSTEM: "Activity",
} as const satisfies Record<DealerLeadHistoryKind, string>;

function toLocalDateTimeValue(value: string | null): string {
  if (value === null) {
    return EMPTY_VALUE;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return EMPTY_VALUE;
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string): string | undefined {
  if (value.length === 0) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function buildSuggestedFollowUpValue(
  daysFromNow: number,
  hour: number,
): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);

  return toLocalDateTimeValue(date.toISOString());
}

function localDateTimeValueToDate(value: string): Date | null {
  if (value.length === 0) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function localDateValue(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localTimeValue(date: Date): string {
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

function combineLocalDateAndTime(
  selectedDate: Date | undefined,
  selectedTime: string,
): string | null {
  if (selectedDate === undefined || selectedTime.length === 0) {
    return null;
  }

  const candidate = `${localDateValue(selectedDate)}T${selectedTime}`;
  return localDateTimeValueToDate(candidate) === null ? null : candidate;
}

function isSameLocalDate(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function normalizeHistoryTitle(item: DealerLeadHistoryItem): string {
  const normalizedTitle = item.title.trim().toLocaleLowerCase("en-IN");

  if (
    item.kind === "CALL" &&
    (normalizedTitle.includes("telecmi") || normalizedTitle.includes("ivr"))
  ) {
    return "Phone Call";
  }

  return item.title;
}

function formatDateTime(value: string | null): string {
  if (value === null) {
    return "Not scheduled";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCodeLabel(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("en-IN")
    .split(/[_\s-]+/u)
    .filter((part) => part.length > 0)
    .map(
      (part) => `${part.charAt(0).toLocaleUpperCase("en-IN")}${part.slice(1)}`,
    )
    .join(" ");
}

function buildLocationText(lead: DealerLeadPublicView): string {
  return [
    lead.customer.city,
    lead.customer.district,
    lead.customer.state,
    lead.customer.postalCode,
  ]
    .filter((value): value is string => value !== null && value.length > 0)
    .join(", ");
}

function safeRequestId(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized !== undefined && SAFE_REQUEST_ID_PATTERN.test(normalized)
    ? normalized
    : undefined;
}

function toUserFacingError(error: unknown): UserFacingError {
  if (isApiHttpError(error)) {
    const requestId = safeRequestId(error.requestId);
    const base =
      error.status === 409
        ? {
            title: "This lead changed while you were working",
            description: "Reload the latest details and try the action again.",
          }
        : error.status === 422 || error.status === 400
          ? {
              title: "Please check the highlighted details",
              description: error.message,
            }
          : error.status === 429
            ? {
                title: "Too many attempts",
                description: "Please wait a moment before trying again.",
              }
            : error.status === 404 || error.status === 410
              ? {
                  title: "This secure link is no longer available",
                  description:
                    "The lead may have been moved to another dealer, or the link may have expired.",
                }
              : {
                  title: "The update could not be saved",
                  description:
                    "Your information is still on this page. Check your connection and try again.",
                };

    return { ...base, ...(requestId === undefined ? {} : { requestId }) };
  }

  return {
    title: "The update could not be saved",
    description:
      "Your information is still on this page. Check your connection and try again.",
  };
}

function resolveMutationIntent(
  current: MutationIntent | null,
  fingerprint: string,
): MutationIntent {
  return current?.fingerprint === fingerprint
    ? current
    : { fingerprint, key: createIdempotencyKey() };
}

function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function resolveDefaultAction(lead: DealerLeadPublicView): PendingAction {
  if (lead.workflow.nextStep === "ACTION") {
    return null;
  }

  if (
    lead.workflow.nextStep === "FOLLOW_UP_DETAILS" ||
    lead.workflow.nextStep === "NEXT_FOLLOW_UP" ||
    lead.workflow.nextStep === "CALL_NOTE"
  ) {
    return "UPDATE";
  }

  return lead.dealerUpdate.latestAction;
}

function resolveUpdatePanel(
  lead: DealerLeadPublicView,
): DealerLeadWorkflowStep {
  if (
    lead.workflow.nextStep === "FOLLOW_UP_DETAILS" ||
    lead.workflow.nextStep === "NEXT_FOLLOW_UP" ||
    lead.workflow.nextStep === "CALL_NOTE"
  ) {
    return lead.workflow.nextStep;
  }

  return "FOLLOW_UP_DETAILS";
}

function resolveInitialPanel(
  lead: DealerLeadPublicView,
  action: PendingAction,
): WorkspacePanel {
  if (lead.workflow.nextStep !== "ACTION") {
    return lead.workflow.nextStep;
  }

  return action === "FORWARD" ? "FORWARD" : "ACTION";
}

function historyIcon(kind: DealerLeadHistoryKind): React.ReactElement {
  const iconClassName = "size-4";

  switch (kind) {
    case "CALL":
      return <PhoneCall aria-hidden="true" className={iconClassName} />;
    case "WHATSAPP":
      return <MessageCircle aria-hidden="true" className={iconClassName} />;
    case "ROUTING":
    case "ASSIGNMENT":
      return <Route aria-hidden="true" className={iconClassName} />;
    case "NOTE":
      return <NotebookPen aria-hidden="true" className={iconClassName} />;
    case "FOLLOW_UP":
      return <Clock3 aria-hidden="true" className={iconClassName} />;
    default:
      return <History aria-hidden="true" className={iconClassName} />;
  }
}

function historyItemMatchesFilter(
  item: DealerLeadHistoryItem,
  filter: HistoryFilter,
): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "CALLS":
      return item.kind === "CALL";
    case "FOLLOW_UPS":
      return (
        item.kind === "FOLLOW_UP" ||
        item.kind === "STATUS" ||
        item.kind === "NOTE"
      );
    case "MESSAGES":
      return item.kind === "WHATSAPP";
    case "ROUTING":
      return item.kind === "ROUTING" || item.kind === "ASSIGNMENT";
  }
}

function getHistoryFilterCount(
  items: readonly DealerLeadHistoryItem[],
  filter: HistoryFilter,
): number {
  return items.filter((item) => historyItemMatchesFilter(item, filter)).length;
}

function getPanelMeta(panel: WorkspacePanel): WorkspacePanelMeta {
  switch (panel) {
    case "ACTION":
      return {
        eyebrow: "Priority 1",
        title: "Choose what you need to do",
        description:
          "Continue the customer follow-up or route the enquiry to the correct destination.",
        number: 1,
        icon: <Sparkles aria-hidden="true" className="size-5" />,
      };
    case "FOLLOW_UP_DETAILS":
      return {
        eyebrow: "Priority 2",
        title: "Record the follow-up details",
        description:
          "Confirm the customer name and choose the response that best matches the conversation.",
        number: 2,
        icon: <UserRound aria-hidden="true" className="size-5" />,
      };
    case "NEXT_FOLLOW_UP":
      return {
        eyebrow: "Priority 3",
        title: "Schedule the next follow-up",
        description:
          "Choose when the assigned dealer should be reminded to contact the customer again.",
        number: 3,
        icon: <CalendarClock aria-hidden="true" className="size-5" />,
      };
    case "CALL_NOTE":
      return {
        eyebrow: "Priority 4",
        title: "Add a useful call note",
        description:
          "Capture the customer’s need, the action promised, and anything the next person should know.",
        number: 4,
        icon: <NotebookPen aria-hidden="true" className="size-5" />,
      };
    case "HISTORY":
      return {
        eyebrow: "Priority 5",
        title: "Lead history",
        description:
          "Review calls, follow-ups, WhatsApp messages, assignments, and routing activity.",
        number: 5,
        icon: <History aria-hidden="true" className="size-5" />,
      };
    case "FORWARD":
      return {
        eyebrow: "Route enquiry",
        title: "Send this enquiry to the right destination",
        description:
          "Choose the enquiry type, confirm the destination, and leave enough context for the receiving team.",
        icon: <Route aria-hidden="true" className="size-5" />,
      };
  }
}

function panelTitleId(panel: WorkspacePanel): string {
  return `dealer-lead-panel-${panel.toLocaleLowerCase("en-US").replaceAll("_", "-")}`;
}

function PanelHeader({ panel }: Readonly<{ panel: WorkspacePanel }>) {
  const meta = getPanelMeta(panel);

  return (
    <CardHeader className="min-w-0 gap-4 border-b border-border/70 bg-muted/20">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
          {meta.number ?? meta.icon}
        </span>
        <div className="min-w-0">
          <p className="text-caption font-medium uppercase tracking-[0.12em] text-primary">
            {meta.eyebrow}
          </p>
          <h2
            id={panelTitleId(panel)}
            className="mt-1 break-words text-section-title text-foreground"
          >
            {meta.title}
          </h2>
          <p className="mt-1 max-w-2xl break-words text-body-sm text-muted-readable">
            {meta.description}
          </p>
        </div>
      </div>
    </CardHeader>
  );
}

function WorkflowNavigation({
  lead,
  activePanel,
  onSelect,
}: Readonly<{
  lead: DealerLeadPublicView;
  activePanel: WorkspacePanel;
  onSelect: (step: DealerLeadWorkflowStep) => void;
}>) {
  const completed = new Set(lead.workflow.completedSteps);
  const activeButtonRef = React.useRef<HTMLButtonElement>(null);
  const priorityIndex = Math.max(
    0,
    WORKFLOW_STEPS.findIndex((step) => step.value === lead.workflow.nextStep),
  );
  const activeStep = WORKFLOW_STEPS.find((step) => step.value === activePanel);

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      activeButtonRef.current?.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: "nearest",
        inline: "center",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activePanel, lead.workflow.nextStep]);

  return (
    <nav aria-label="Lead follow-up progress" className="grid min-w-0 gap-3">
      <div className="flex min-w-0 items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="text-overline text-muted-readable">
            Step {priorityIndex + 1} of {WORKFLOW_STEPS.length}
          </p>
          <p className="truncate text-body-sm font-medium text-foreground">
            {activeStep?.label ?? "Route enquiry"}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {completed.size}/{WORKFLOW_STEPS.length} complete
        </Badge>
      </div>

      <ScrollArea className="w-full rounded-2xl border border-border/70 bg-card/85 shadow-xs">
        <ol className="flex w-max min-w-full snap-x snap-mandatory gap-1 p-1.5">
          {WORKFLOW_STEPS.map((step) => {
            const isComplete = completed.has(step.value);
            const isPriority = lead.workflow.nextStep === step.value;
            const isActive = activePanel === step.value;

            return (
              <li
                key={step.value}
                className="min-w-[9.25rem] flex-1 snap-start sm:min-w-[10.5rem]"
              >
                <button
                  ref={isActive ? activeButtonRef : undefined}
                  type="button"
                  aria-current={isPriority ? "step" : undefined}
                  aria-pressed={isActive}
                  onClick={() => {
                    onSelect(step.value);
                  }}
                  className={cn(
                    "group flex min-h-14 w-full touch-manipulation items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted/55 focus-visible:bg-muted/60 motion-reduce:transition-none sm:min-h-16",
                    isActive && "bg-primary/8",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-caption font-semibold",
                      isComplete
                        ? "bg-success text-success-foreground"
                        : isPriority
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-readable group-hover:text-foreground",
                    )}
                  >
                    {isComplete ? (
                      <Check aria-hidden="true" className="size-3.5" />
                    ) : (
                      step.number
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-caption font-medium text-foreground">
                      {step.shortLabel}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.625rem] text-muted-readable">
                      {isPriority
                        ? "Current priority"
                        : isComplete
                          ? "Completed"
                          : "Not completed"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </nav>
  );
}

type DealerSelectionDialogProps = Readonly<{
  currentDealer: DealerLeadPublicView["vehicleRouting"]["currentDealer"];
  options: readonly DealerVehicleCandidate[];
  value: string;
  disabled: boolean;
  onValueChange: (value: string) => void;
}>;

function DealerSelectionDialog({
  currentDealer,
  options,
  value,
  disabled,
  onValueChange,
}: DealerSelectionDialogProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const selectedDealer = options.find(
    (dealer) => dealer.dealerOrgUnitId === value,
  );
  const currentDealerName = currentDealer?.name ?? "current dealer";
  const triggerLabel =
    selectedDealer === undefined
      ? `Keep with ${currentDealerName}`
      : selectedDealer.name;

  function selectDealer(nextValue: string): void {
    onValueChange(nextValue);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          id="route-dealer"
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-auto min-h-12 w-full justify-between gap-3 whitespace-normal px-4 py-3 text-left text-base sm:text-body-sm"
        >
          <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
          <ChevronRight
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-readable"
          />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Choose dealer destination</DialogTitle>
          <DialogDescription>
            Keep the enquiry with the current dealer or choose one eligible
            dealer near the customer.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[min(65dvh,34rem)] pr-3">
          <div className="grid gap-2 pb-1">
            <Button
              type="button"
              variant={value.length === 0 ? "secondary" : "ghost"}
              className="h-auto min-h-14 w-full justify-start gap-3 whitespace-normal px-3 py-3 text-left"
              onClick={() => {
                selectDealer(EMPTY_VALUE);
              }}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {value.length === 0 ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <Building2 aria-hidden="true" className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words font-medium">
                  Keep with {currentDealerName}
                </span>
                <span className="mt-1 block text-caption text-muted-readable">
                  No dealer transfer will be made.
                </span>
              </span>
            </Button>

            {options.map((dealer) => {
              const isSelected = dealer.dealerOrgUnitId === value;

              return (
                <Button
                  key={dealer.dealerOrgUnitId}
                  type="button"
                  variant={isSelected ? "secondary" : "ghost"}
                  className="h-auto min-h-14 w-full justify-start gap-3 whitespace-normal px-3 py-3 text-left"
                  onClick={() => {
                    selectDealer(dealer.dealerOrgUnitId);
                  }}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {isSelected ? (
                      <Check aria-hidden="true" className="size-4" />
                    ) : (
                      <MapPin aria-hidden="true" className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-medium">
                      {dealer.name}
                    </span>
                    <span className="mt-1 block break-words text-caption text-muted-readable">
                      {dealer.distanceKm.toFixed(1)} km ·{" "}
                      {dealer.district ?? "District unavailable"}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

type FollowUpDateTimeDialogProps = Readonly<{
  value: string;
  min: string;
  max: string;
  disabled: boolean;
  onValueChange: (value: string) => void;
}>;

function FollowUpDateTimeDialog({
  value,
  min,
  max,
  disabled,
  onValueChange,
}: FollowUpDateTimeDialogProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [draftDate, setDraftDate] = React.useState<Date>();
  const [draftTime, setDraftTime] = React.useState(EMPTY_VALUE);
  const minimumDate = React.useMemo(() => localDateTimeValueToDate(min), [min]);
  const maximumDate = React.useMemo(() => localDateTimeValueToDate(max), [max]);

  function initializeDraft(): void {
    const existing = localDateTimeValueToDate(value);
    const initial = existing ?? minimumDate;

    if (initial === null) {
      setDraftDate(undefined);
      setDraftTime(EMPTY_VALUE);
      return;
    }

    setDraftDate(initial);
    setDraftTime(localTimeValue(initial));
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (nextOpen) {
      initializeDraft();
    }

    setOpen(nextOpen);
  }

  const candidateValue = combineLocalDateAndTime(draftDate, draftTime);
  const candidateDate =
    candidateValue === null ? null : localDateTimeValueToDate(candidateValue);
  const candidateIsValid =
    candidateDate !== null &&
    minimumDate !== null &&
    maximumDate !== null &&
    candidateDate.getTime() >= minimumDate.getTime() &&
    candidateDate.getTime() <= maximumDate.getTime();
  const selectedMinimumTime =
    draftDate !== undefined &&
    minimumDate !== null &&
    isSameLocalDate(draftDate, minimumDate)
      ? localTimeValue(minimumDate)
      : undefined;
  const selectedMaximumTime =
    draftDate !== undefined &&
    maximumDate !== null &&
    isSameLocalDate(draftDate, maximumDate)
      ? localTimeValue(maximumDate)
      : undefined;
  const formattedValue =
    value.length === 0
      ? "Choose date and time"
      : formatDateTime(toIsoDateTime(value) ?? null);

  function setDraftFromValue(nextValue: string): void {
    const date = localDateTimeValueToDate(nextValue);

    if (date === null) {
      return;
    }

    setDraftDate(date);
    setDraftTime(localTimeValue(date));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          id="next-follow-up"
          type="button"
          variant="outline"
          disabled={disabled}
          aria-describedby="next-follow-up-help"
          className="h-auto min-h-12 w-full max-w-md justify-between gap-3 whitespace-normal px-4 py-3 text-left text-base sm:text-body-sm"
        >
          <span className="min-w-0 flex-1 truncate">{formattedValue}</span>
          <CalendarClock
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-readable"
          />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Schedule the next follow-up</DialogTitle>
          <DialogDescription>
            Choose a date and time from one minute up to 30 days from now.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="overflow-x-auto rounded-2xl border border-border/70 bg-background p-1">
            <Calendar
              mode="single"
              selected={draftDate}
              onSelect={setDraftDate}
              disabled={(date) => {
                if (minimumDate === null || maximumDate === null) {
                  return true;
                }

                const dayStart = new Date(date);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(date);
                dayEnd.setHours(23, 59, 59, 999);

                return (
                  dayEnd.getTime() < minimumDate.getTime() ||
                  dayStart.getTime() > maximumDate.getTime()
                );
              }}
              {...(minimumDate === null ? {} : { startMonth: minimumDate })}
              {...(maximumDate === null ? {} : { endMonth: maximumDate })}
              className="mx-auto"
            />
          </div>

          <Field>
            <FieldLabel htmlFor="follow-up-time">Follow-up time</FieldLabel>
            <Input
              id="follow-up-time"
              type="time"
              value={draftTime}
              min={selectedMinimumTime}
              max={selectedMaximumTime}
              onChange={(event) => {
                setDraftTime(event.currentTarget.value);
              }}
              className="text-base sm:text-body-sm"
            />
          </Field>

          <div className="grid gap-2 rounded-2xl border border-border/70 bg-muted/25 p-3 sm:grid-cols-3">
            {[
              {
                label: "Tomorrow, 10:00 AM",
                value: buildSuggestedFollowUpValue(1, 10),
              },
              {
                label: "Tomorrow, 4:00 PM",
                value: buildSuggestedFollowUpValue(1, 16),
              },
              {
                label: "In 3 days, 10:00 AM",
                value: buildSuggestedFollowUpValue(3, 10),
              },
            ].map((suggestion) => (
              <Button
                key={suggestion.label}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto min-h-10 whitespace-normal"
                onClick={() => {
                  setDraftFromValue(suggestion.value);
                }}
              >
                {suggestion.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!candidateIsValid || candidateValue === null}
              onClick={() => {
                if (candidateValue === null || !candidateIsValid) {
                  return;
                }

                onValueChange(candidateValue);
                setOpen(false);
              }}
            >
              <Check aria-hidden="true" />
              Use this schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HistoryItem({ item }: Readonly<{ item: DealerLeadHistoryItem }>) {
  const displayTitle = normalizeHistoryTitle(item);

  return (
    <li className="min-w-0">
      <article className="min-w-0 rounded-2xl border border-border/70 bg-card/75 p-3 shadow-xs sm:p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {historyIcon(item.kind)}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words font-medium text-foreground [overflow-wrap:anywhere]">
                  {displayTitle}
                </p>
                <p className="mt-1 text-caption text-muted-readable">
                  {formatDate(item.occurredAt)}
                </p>
              </div>

              <div className="flex min-w-0 flex-wrap gap-1.5">
                <Badge variant="outline">
                  {HISTORY_KIND_LABELS[item.kind]}
                </Badge>
                {item.status === null ? null : (
                  <Badge
                    variant="secondary"
                    className="max-w-full whitespace-normal"
                  >
                    {formatCodeLabel(item.status)}
                  </Badge>
                )}
              </div>
            </div>

            {item.description === null ? null : (
              <p className="mt-3 whitespace-pre-wrap break-words text-body-sm leading-relaxed text-muted-readable [overflow-wrap:anywhere]">
                {item.description}
              </p>
            )}

            {item.actorLabel === null ? null : (
              <p className="mt-3 break-words border-t border-border/60 pt-2 text-caption text-muted-readable [overflow-wrap:anywhere]">
                Recorded by {item.actorLabel}
              </p>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}

function LeadSummaryContent({
  lead,
  locationText,
  readOnly,
}: Readonly<{
  lead: DealerLeadPublicView;
  locationText: string;
  readOnly: boolean;
}>): React.ReactElement {
  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-overline text-muted-readable">Lead summary</p>
          <p className="mt-1 truncate text-section-title text-foreground">
            {lead.leadNo}
          </p>
        </div>
        <Badge variant={readOnly ? "secondary" : "outline"}>
          {readOnly ? "Read-only" : "Active"}
        </Badge>
      </div>

      <ContentDescriptionList columns="one" className="gap-2.5">
        <ContentDescriptionItem term="Customer">
          <span className="block font-medium">
            {lead.customer.name ?? "Name not recorded"}
          </span>
          <span className="mt-0.5 block text-muted-readable">
            {lead.customer.phoneMasked ?? "Phone unavailable"}
          </span>
        </ContentDescriptionItem>

        <ContentDescriptionItem term="Customer area">
          <span className="block font-medium">
            {locationText || "Location not recorded"}
          </span>
          {lead.customer.googleMapsUrl === null ? null : (
            <a
              href={lead.customer.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex min-h-9 items-center gap-1 text-primary underline underline-offset-4"
            >
              Open map
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          )}
        </ContentDescriptionItem>

        <ContentDescriptionItem term="Next follow-up">
          <span className="font-medium">
            {formatDateTime(lead.nextFollowUpAt)}
          </span>
        </ContentDescriptionItem>

        <ContentDescriptionItem term="Assigned dealer">
          <span className="font-medium">
            {lead.vehicleRouting.currentDealer?.name ?? "Current dealer"}
          </span>
        </ContentDescriptionItem>
      </ContentDescriptionList>

      <ContentSection
        size="sm"
        title="Secure link"
        description="Limited to the assigned dealer team."
        contentClassName="grid gap-2"
      >
        <div className="flex items-start justify-between gap-3 text-body-sm">
          <span className="text-muted-readable">Expires</span>
          <span className="max-w-[60%] text-right font-medium">
            {formatDateTime(lead.dealerUpdate.expiresAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-body-sm">
          <span className="text-muted-readable">Updates remaining</span>
          <span className="font-medium text-tabular">
            {lead.dealerUpdate.remainingUses}
          </span>
        </div>
      </ContentSection>

      <ContentStatus
        variant="info"
        role="note"
        icon={<Info aria-hidden="true" />}
        title="Privacy reminder"
        description="Never record Aadhaar, PAN, bank, UPI, card, OTP, or password information."
      />
    </div>
  );
}

function MobileLeadSummarySheet({
  lead,
  locationText,
  readOnly,
}: Readonly<{
  lead: DealerLeadPublicView;
  locationText: string;
  readOnly: boolean;
}>): React.ReactElement {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="lg:hidden">
          <Menu aria-hidden="true" />
          Lead details
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[min(90dvh,48rem)]">
        <SheetHeader>
          <SheetTitle>Lead details</SheetTitle>
          <SheetDescription>
            Customer, assignment, follow-up, and secure-link information.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6 sm:px-5">
          <LeadSummaryContent
            lead={lead}
            locationText={locationText}
            readOnly={readOnly}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LoadFailure({
  loadError,
}: Pick<PublicDealerLeadUpdatePageProps, "loadError">) {
  const unavailable = loadError?.reason === "unavailable";

  return (
    <PublicDealerLeadShell mainLabelledBy="dealer-lead-error-title">
      <ContentRoot
        width="narrow"
        density="compact"
        className="px-3 py-8 sm:px-0 sm:py-6"
      >
        <div className="grid justify-items-center">
          <PublicFormStatusEmblem status="error" />
        </div>

        <ContentSection
          className="border-destructive/20 shadow-lg shadow-destructive/5"
          title={
            <span id="dealer-lead-error-title">
              {unavailable
                ? "Lead details are temporarily unavailable"
                : "This secure link is unavailable"}
            </span>
          }
          description={
            unavailable
              ? "Check your connection and open the link again. No lead information has been changed."
              : "The lead may have been moved to another dealer, the permitted uses may be complete, or the link may have expired."
          }
        >
          <ContentStatus
            variant={unavailable ? "warning" : "destructive"}
            icon={<AlertTriangle aria-hidden="true" />}
            title={
              unavailable
                ? "Try opening the link again"
                : "No update can be submitted"
            }
            description={
              unavailable
                ? "Your existing lead information remains unchanged."
                : "Contact the assigning team when continued access is required."
            }
          />

          {loadError?.requestId === undefined ? null : (
            <p className="mt-4 text-center text-caption text-muted-readable">
              Reference: <code>{loadError.requestId}</code>
            </p>
          )}
        </ContentSection>
      </ContentRoot>
    </PublicDealerLeadShell>
  );
}

export function PublicDealerLeadUpdatePage({
  token,
  initialLead,
  loadError,
}: PublicDealerLeadUpdatePageProps): React.ReactElement {
  const initialAction =
    initialLead === null ? null : resolveDefaultAction(initialLead);
  const [lead, setLead] = React.useState(initialLead);
  const [action, setAction] = React.useState<PendingAction>(initialAction);
  const [activePanel, setActivePanel] = React.useState<WorkspacePanel>(() =>
    initialLead === null
      ? "ACTION"
      : resolveInitialPanel(initialLead, initialAction),
  );
  const [pending, setPending] = React.useState<PendingMutation>(null);
  const [error, setError] = React.useState<UserFacingError | null>(null);
  const [success, setSuccess] = React.useState<SuccessNotice | null>(null);
  const [historyFilter, setHistoryFilter] =
    React.useState<HistoryFilter>("ALL");
  const [forwardConfirmation, setForwardConfirmation] =
    React.useState<DealerLeadForwardFormValues | null>(null);
  const mainRef = React.useRef<HTMLElement>(null);
  const workspaceRef = React.useRef<HTMLDivElement>(null);
  const [updateIntent, setUpdateIntent] = React.useState<MutationIntent | null>(
    null,
  );
  const [forwardIntent, setForwardIntent] =
    React.useState<MutationIntent | null>(null);
  const [followUpBounds] = React.useState(() => {
    const now = Date.now();
    return {
      min: toLocalDateTimeValue(new Date(now + 60_000).toISOString()),
      max: toLocalDateTimeValue(
        new Date(now + MAX_FOLLOW_UP_DAYS * 24 * 60 * 60 * 1_000).toISOString(),
      ),
    };
  });

  const initialStatus = initialLead?.dealerUpdate.latestStatus;
  const updateForm = useForm<DealerLeadUpdateFormValues>({
    resolver: zodResolver(dealerLeadUpdateFormSchema),
    mode: "onBlur",
    defaultValues: {
      customerName:
        initialLead?.dealerUpdate.latestCustomerName ??
        initialLead?.customer.name ??
        EMPTY_VALUE,
      status:
        initialStatus !== undefined &&
        initialStatus !== null &&
        STATUS_OPTIONS.some((option) => option.value === initialStatus)
          ? (initialStatus as DealerLeadStatus)
          : EMPTY_VALUE,
      followUpAtLocal: toLocalDateTimeValue(
        initialLead?.nextFollowUpAt ?? null,
      ),
      note: initialLead?.dealerUpdate.latestNote ?? EMPTY_VALUE,
    },
  });

  const forwardForm = useForm<DealerLeadForwardFormValues>({
    resolver: zodResolver(dealerLeadForwardFormSchema),
    mode: "onBlur",
    defaultValues: {
      targetIvrFlowCode: "VEHICLE_ENQUIRIES",
      targetDealerOrgUnitId: EMPTY_VALUE,
      reason: EMPTY_VALUE,
    },
  });

  const selectedRoute = useWatch({
    control: forwardForm.control,
    name: "targetIvrFlowCode",
  });
  const selectedDealerOrgUnitId = useWatch({
    control: forwardForm.control,
    name: "targetDealerOrgUnitId",
  });
  const noteValue = useWatch({
    control: updateForm.control,
    name: "note",
  });

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      workspaceRef.current?.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: "start",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activePanel, lead?.workflow.nextStep]);

  const refreshLead = React.useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      const refreshed = await getPublicDealerLead({
        token,
        ...(signal === undefined ? {} : { signal }),
      });
      const refreshedAction = resolveDefaultAction(refreshed);

      setLead(refreshed);
      setAction(refreshedAction);
      setActivePanel(resolveInitialPanel(refreshed, refreshedAction));
      updateForm.reset({
        customerName:
          refreshed.dealerUpdate.latestCustomerName ??
          refreshed.customer.name ??
          EMPTY_VALUE,
        status:
          refreshed.dealerUpdate.latestStatus !== null &&
          STATUS_OPTIONS.some(
            (option) => option.value === refreshed.dealerUpdate.latestStatus,
          )
            ? (refreshed.dealerUpdate.latestStatus as DealerLeadStatus)
            : EMPTY_VALUE,
        followUpAtLocal: toLocalDateTimeValue(refreshed.nextFollowUpAt),
        note: refreshed.dealerUpdate.latestNote ?? EMPTY_VALUE,
      });

      const currentSelectedDealerOrgUnitId = forwardForm.getValues(
        "targetDealerOrgUnitId",
      );
      if (
        currentSelectedDealerOrgUnitId.length > 0 &&
        !refreshed.vehicleRouting.options.some(
          (option) => option.dealerOrgUnitId === currentSelectedDealerOrgUnitId,
        )
      ) {
        forwardForm.setValue("targetDealerOrgUnitId", EMPTY_VALUE, {
          shouldValidate: true,
        });
      }
    },
    [forwardForm, token, updateForm],
  );

  async function saveUpdateStep(
    step: Exclude<PendingMutation, "FORWARD" | null>,
    candidate: Readonly<Record<string, unknown>>,
    successNotice: SuccessNotice,
  ): Promise<void> {
    if (lead === null || pending !== null || !lead.dealerUpdate.canUpdate) {
      return;
    }

    setPending(step);
    setError(null);
    setSuccess(null);
    const controller = new AbortController();

    try {
      const update = dealerLeadUpdateRequestSchema.parse(candidate);
      const fingerprint = JSON.stringify(update);
      const mutationIntent = resolveMutationIntent(updateIntent, fingerprint);
      setUpdateIntent(mutationIntent);

      const result = await updatePublicDealerLead({
        token,
        update,
        idempotencyKey: mutationIntent.key,
        signal: controller.signal,
      });
      setUpdateIntent(null);
      setSuccess(successNotice);

      if (result.linkStillValid) {
        try {
          await refreshLead(controller.signal);
        } catch (refreshError: unknown) {
          const refreshRequestId = isApiHttpError(refreshError)
            ? safeRequestId(refreshError.requestId)
            : undefined;
          setError({
            title: "Saved, but the latest view could not be loaded",
            description:
              "The update was accepted. Reload this page to see the newest priority and history.",
            ...(refreshRequestId === undefined
              ? {}
              : { requestId: refreshRequestId }),
          });
        }
      }
    } catch (caught: unknown) {
      setError(toUserFacingError(caught));
    } finally {
      setPending(null);
    }
  }

  async function submitFollowUpDetails(): Promise<void> {
    updateForm.clearErrors(["customerName", "status"]);
    const parsed = dealerLeadFollowUpDetailsFormSchema.safeParse({
      customerName: updateForm.getValues("customerName"),
      status: updateForm.getValues("status"),
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "customerName" || field === "status") {
          updateForm.setError(field, {
            type: "validate",
            message: issue.message,
          });
        }
      }
      return;
    }

    await saveUpdateStep("FOLLOW_UP_DETAILS", parsed.data, {
      title: "Follow-up details saved",
      description:
        "The customer name and response are recorded. The next priority is ready.",
    });
  }

  async function submitNextFollowUp(): Promise<void> {
    updateForm.clearErrors("followUpAtLocal");
    const parsed = dealerLeadNextFollowUpFormSchema.safeParse({
      followUpAtLocal: updateForm.getValues("followUpAtLocal"),
    });

    if (!parsed.success) {
      updateForm.setError("followUpAtLocal", {
        type: "validate",
        message:
          parsed.error.issues[0]?.message ??
          "Choose the next follow-up date and time.",
      });
      return;
    }

    const followUpAt = toIsoDateTime(parsed.data.followUpAtLocal);
    if (followUpAt === undefined) {
      updateForm.setError("followUpAtLocal", {
        type: "validate",
        message: "Enter a valid follow-up date and time.",
      });
      return;
    }

    await saveUpdateStep(
      "NEXT_FOLLOW_UP",
      { followUpAt },
      {
        title: "Next follow-up scheduled",
        description:
          "A secure WhatsApp reminder will be sent to the assigned dealer at the selected time.",
      },
    );
  }

  async function submitCallNote(): Promise<void> {
    updateForm.clearErrors("note");
    const parsed = dealerLeadCallNoteFormSchema.safeParse({
      note: updateForm.getValues("note"),
    });

    if (!parsed.success) {
      updateForm.setError("note", {
        type: "validate",
        message: parsed.error.issues[0]?.message ?? "Add a short call note.",
      });
      return;
    }

    await saveUpdateStep("CALL_NOTE", parsed.data, {
      title: "Call note saved",
      description:
        "The follow-up record is complete. The full lead history is ready to review.",
    });
  }

  const executeForward = React.useCallback(
    async (values: DealerLeadForwardFormValues): Promise<void> => {
      if (lead === null || pending !== null) {
        return;
      }

      setPending("FORWARD");
      setError(null);
      setSuccess(null);
      const controller = new AbortController();

      try {
        const targetDealerOrgUnitId =
          values.targetIvrFlowCode === "VEHICLE_ENQUIRIES" &&
          values.targetDealerOrgUnitId.length > 0
            ? values.targetDealerOrgUnitId
            : undefined;
        const forward = dealerLeadForwardRequestSchema.parse({
          targetIvrFlowCode: values.targetIvrFlowCode,
          ...(targetDealerOrgUnitId === undefined
            ? {}
            : { targetDealerOrgUnitId }),
          reason: values.reason,
        });
        const fingerprint = JSON.stringify(forward);
        const mutationIntent = resolveMutationIntent(
          forwardIntent,
          fingerprint,
        );
        setForwardIntent(mutationIntent);

        const result = await forwardPublicDealerLead({
          token,
          forward,
          idempotencyKey: mutationIntent.key,
          signal: controller.signal,
        });
        setForwardIntent(null);

        const movedToAnotherDealer =
          forward.targetIvrFlowCode === "VEHICLE_ENQUIRIES" &&
          forward.targetDealerOrgUnitId !== undefined;
        setSuccess({
          title: movedToAnotherDealer
            ? "Lead forwarded to the selected dealer"
            : "Routing choice saved",
          description: movedToAnotherDealer
            ? "The new dealer is assigned and will receive a secure WhatsApp lead notification."
            : forward.targetIvrFlowCode === "VEHICLE_ENQUIRIES"
              ? "The current dealer will continue handling this vehicle enquiry."
              : "The routing request has been recorded for the selected team.",
        });

        if (result.linkStillValid) {
          try {
            await refreshLead(controller.signal);
          } catch (refreshError: unknown) {
            const refreshRequestId = isApiHttpError(refreshError)
              ? safeRequestId(refreshError.requestId)
              : undefined;
            setError({
              title: "Saved, but the latest view could not be loaded",
              description:
                "The routing choice was accepted. Reload this page to see the newest priority and history.",
              ...(refreshRequestId === undefined
                ? {}
                : { requestId: refreshRequestId }),
            });
          }
        } else {
          setLead((current) =>
            current === null
              ? null
              : {
                  ...current,
                  dealerUpdate: {
                    ...current.dealerUpdate,
                    canUpdate: false,
                    canForward: false,
                    remainingUses: 0,
                  },
                },
          );
        }
      } catch (caught: unknown) {
        setError(toUserFacingError(caught));
      } finally {
        setPending(null);
      }
    },
    [forwardIntent, lead, pending, refreshLead, token],
  );

  const submitForward = forwardForm.handleSubmit((values): void => {
    const isDealerTransfer =
      values.targetIvrFlowCode === "VEHICLE_ENQUIRIES" &&
      values.targetDealerOrgUnitId.length > 0;

    if (isDealerTransfer) {
      setForwardConfirmation(values);
      return;
    }

    void executeForward(values);
  });

  if (lead === null) {
    return <LoadFailure {...(loadError === undefined ? {} : { loadError })} />;
  }

  const activeLead: DealerLeadPublicView = lead;
  const locationText = buildLocationText(activeLead);
  const currentStep = WORKFLOW_STEPS.find(
    (step) => step.value === lead.workflow.nextStep,
  );
  const readOnly =
    !lead.dealerUpdate.canUpdate && !lead.dealerUpdate.canForward;
  const actionDisabled = pending !== null || readOnly;
  const updateDisabled = pending !== null || !lead.dealerUpdate.canUpdate;
  const forwardDisabled = pending !== null || !lead.dealerUpdate.canForward;
  const selectedDealer = lead.vehicleRouting.options.find(
    (dealer) => dealer.dealerOrgUnitId === selectedDealerOrgUnitId,
  );
  const confirmationDealer = lead.vehicleRouting.options.find(
    (dealer) =>
      dealer.dealerOrgUnitId === forwardConfirmation?.targetDealerOrgUnitId,
  );
  const filteredHistoryItems = activeLead.history.items.filter((item) =>
    historyItemMatchesFilter(item, historyFilter),
  );
  const panelMeta = getPanelMeta(activePanel);

  function chooseAction(nextAction: DealerLeadAction): void {
    setAction(nextAction);
    setError(null);
    setSuccess(null);
    setActivePanel(
      nextAction === "UPDATE" ? resolveUpdatePanel(activeLead) : "FORWARD",
    );
  }

  const hasFooterAction =
    activePanel === "FOLLOW_UP_DETAILS" ||
    activePanel === "NEXT_FOLLOW_UP" ||
    activePanel === "CALL_NOTE" ||
    activePanel === "FORWARD" ||
    (activePanel === "HISTORY" && lead.workflow.nextStep !== "HISTORY");

  const footerActions =
    readOnly || !hasFooterAction ? undefined : (
      <ContentFormActions className="mx-auto w-full max-w-7xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent">
        <div className="hidden min-w-0 flex-1 sm:block">
          <p className="truncate text-caption text-muted-readable">
            {panelMeta.eyebrow}
          </p>
          <p className="truncate text-body-sm font-medium text-foreground">
            {panelMeta.title}
          </p>
        </div>

        {activePanel === "FOLLOW_UP_DETAILS" ? (
          <Button
            type="submit"
            form={FORM_IDS.FOLLOW_UP_DETAILS}
            disabled={updateDisabled}
            aria-busy={pending === "FOLLOW_UP_DETAILS"}
            className="min-h-11 w-full touch-manipulation sm:w-auto"
          >
            {pending === "FOLLOW_UP_DETAILS" ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Save and continue
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : activePanel === "NEXT_FOLLOW_UP" ? (
          <Button
            type="submit"
            form={FORM_IDS.NEXT_FOLLOW_UP}
            disabled={updateDisabled}
            aria-busy={pending === "NEXT_FOLLOW_UP"}
            className="min-h-11 w-full touch-manipulation sm:w-auto"
          >
            {pending === "NEXT_FOLLOW_UP" ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <CalendarClock aria-hidden="true" />
            )}
            Schedule reminder
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : activePanel === "CALL_NOTE" ? (
          <Button
            type="submit"
            form={FORM_IDS.CALL_NOTE}
            disabled={updateDisabled}
            aria-busy={pending === "CALL_NOTE"}
            className="min-h-11 w-full touch-manipulation sm:w-auto"
          >
            {pending === "CALL_NOTE" ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Save note
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : activePanel === "FORWARD" ? (
          <Button
            type="submit"
            form={FORM_IDS.FORWARD}
            disabled={forwardDisabled}
            aria-busy={pending === "FORWARD"}
            className="min-h-11 w-full touch-manipulation sm:w-auto"
          >
            {pending === "FORWARD" ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Send aria-hidden="true" />
            )}
            Save routing choice
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : lead.workflow.nextStep !== "HISTORY" ? (
          <Button
            type="button"
            className="min-h-11 w-full touch-manipulation sm:w-auto"
            onClick={() => {
              setActivePanel(lead.workflow.nextStep);
            }}
          >
            Return to current priority
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : null}
      </ContentFormActions>
    );

  return (
    <PublicDealerLeadShell
      mainLabelledBy="dealer-lead-title"
      mainRef={mainRef}
      footerActions={footerActions}
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
              <Badge variant="outline">Lead {lead.leadNo}</Badge>
              <Badge variant={readOnly ? "secondary" : "outline"}>
                {readOnly
                  ? "Read-only"
                  : `${String(lead.dealerUpdate.remainingUses)} updates remaining`}
              </Badge>
            </div>
          }
          title={<span id="dealer-lead-title">Customer follow-up</span>}
          description="Complete one clear task at a time. Each successful save moves the lead to its next required priority."
          actions={
            <MobileLeadSummarySheet
              lead={lead}
              locationText={locationText}
              readOnly={readOnly}
            />
          }
          meta={
            <div className="grid w-full min-w-0 gap-2 sm:grid-cols-2">
              <div className="flex min-w-0 items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                <Sparkles
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-primary"
                />
                <div className="min-w-0">
                  <span className="block text-overline text-primary">
                    Current priority
                  </span>
                  <span className="block truncate text-body-sm font-medium text-foreground">
                    {currentStep?.label ?? "Lead history"}
                  </span>
                </div>
              </div>

              <div className="flex min-w-0 items-start gap-2.5 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
                <UserRound
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-readable"
                />
                <div className="min-w-0">
                  <span className="block text-overline text-muted-readable">
                    Customer
                  </span>
                  <span className="block truncate text-body-sm font-medium text-foreground">
                    {lead.customer.name ?? "Name not recorded"}
                  </span>
                  <span className="block truncate text-caption text-muted-readable">
                    {lead.customer.phoneMasked ?? "Phone unavailable"}
                  </span>
                </div>
              </div>
            </div>
          }
          cardClassName="border-primary/20 bg-card/92 shadow-lg shadow-primary/5"
        >
          <div className="mt-4 border-t border-border/70 pt-4">
            <WorkflowNavigation
              lead={lead}
              activePanel={activePanel}
              onSelect={(step) => {
                if (
                  step === "FOLLOW_UP_DETAILS" ||
                  step === "NEXT_FOLLOW_UP" ||
                  step === "CALL_NOTE"
                ) {
                  setAction("UPDATE");
                }
                setActivePanel(step);
              }}
            />
          </div>
        </ContentHeader>

        <ContentSplit
          variant="main-context"
          className="gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-6 2xl:grid-cols-[minmax(0,1fr)_21rem]"
        >
          <div className="grid min-w-0 gap-5">
            <div aria-live="polite" aria-atomic="true" className="grid gap-3">
              {error === null ? null : (
                <ContentStatus
                  variant="destructive"
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
              )}

              {success === null ? null : (
                <ContentStatus
                  variant="success"
                  icon={<CheckCircle2 aria-hidden="true" />}
                  title={success.title}
                  description={success.description}
                />
              )}
            </div>

            {!readOnly && activePanel !== "ACTION" ? (
              <ContentToolbar variant="subtle" className="p-2">
                <div className="px-2 py-1">
                  <p className="text-overline text-muted-readable">
                    Working mode
                  </p>
                  <p className="text-body-sm font-medium">
                    {action === "FORWARD"
                      ? "Route this enquiry"
                      : "Update customer follow-up"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button
                    type="button"
                    variant={action === "UPDATE" ? "secondary" : "ghost"}
                    size="sm"
                    className="min-h-10 touch-manipulation"
                    onClick={() => {
                      chooseAction("UPDATE");
                    }}
                    disabled={!lead.dealerUpdate.canUpdate || pending !== null}
                  >
                    <PhoneCall aria-hidden="true" />
                    Follow up
                  </Button>
                  <Button
                    type="button"
                    variant={action === "FORWARD" ? "secondary" : "ghost"}
                    size="sm"
                    className="min-h-10 touch-manipulation"
                    onClick={() => {
                      chooseAction("FORWARD");
                    }}
                    disabled={!lead.dealerUpdate.canForward || pending !== null}
                  >
                    <Route aria-hidden="true" />
                    Route enquiry
                  </Button>
                </div>
              </ContentToolbar>
            ) : null}

            <div
              ref={workspaceRef}
              role="region"
              aria-labelledby={panelTitleId(activePanel)}
              className="scroll-mt-24"
            >
              {activePanel === "ACTION" ? (
                <Card className="overflow-hidden border-primary/20 shadow-lg shadow-primary/5">
                  <PanelHeader panel="ACTION" />
                  <CardContent className="grid gap-4 pt-5">
                    <RadioGroup
                      value={action ?? EMPTY_VALUE}
                      onValueChange={(value: string) => {
                        chooseAction(value as DealerLeadAction);
                      }}
                      className="grid gap-3 md:grid-cols-2"
                      disabled={actionDisabled}
                    >
                      <Label
                        htmlFor="action-update"
                        className={cn(
                          "group flex min-h-32 cursor-pointer flex-col justify-between gap-4 rounded-2xl border p-4 sm:min-h-40 sm:gap-5 sm:rounded-3xl sm:p-5 transition-all hover:border-primary/35 hover:bg-primary/4 hover:shadow-md has-[:focus-visible]:bg-muted/50 motion-reduce:transition-none",
                          action === "UPDATE" &&
                            "border-primary/50 bg-primary/6 shadow-md",
                          !lead.dealerUpdate.canUpdate &&
                            "pointer-events-none opacity-60",
                        )}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <PhoneCall aria-hidden="true" className="size-5" />
                          </span>
                          <RadioGroupItem
                            id="action-update"
                            value="UPDATE"
                            disabled={!lead.dealerUpdate.canUpdate}
                            className="sr-only"
                          />
                        </span>
                        <span>
                          <span className="block text-card-title">
                            Update customer follow-up
                          </span>
                          <span className="mt-2 block text-body-sm leading-relaxed text-muted-readable">
                            Record the customer response, schedule the next
                            contact, and add a useful call note.
                          </span>
                        </span>
                        <span className="flex items-center gap-1 text-body-sm font-medium text-primary">
                          Start follow-up
                          <ChevronRight aria-hidden="true" className="size-4" />
                        </span>
                      </Label>

                      <Label
                        htmlFor="action-forward"
                        className={cn(
                          "group flex min-h-32 cursor-pointer flex-col justify-between gap-4 rounded-2xl border p-4 sm:min-h-40 sm:gap-5 sm:rounded-3xl sm:p-5 transition-all hover:border-primary/35 hover:bg-primary/4 hover:shadow-md has-[:focus-visible]:bg-muted/50 motion-reduce:transition-none",
                          action === "FORWARD" &&
                            "border-primary/50 bg-primary/6 shadow-md",
                          !lead.dealerUpdate.canForward &&
                            "pointer-events-none opacity-60",
                        )}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Route aria-hidden="true" className="size-5" />
                          </span>
                          <RadioGroupItem
                            id="action-forward"
                            value="FORWARD"
                            disabled={!lead.dealerUpdate.canForward}
                            className="sr-only"
                          />
                        </span>
                        <span>
                          <span className="block text-card-title">
                            Route this enquiry
                          </span>
                          <span className="mt-2 block text-body-sm leading-relaxed text-muted-readable">
                            Keep a vehicle enquiry here, move it to another
                            eligible dealer, or send it to another team.
                          </span>
                        </span>
                        <span className="flex items-center gap-1 text-body-sm font-medium text-primary">
                          Choose destination
                          <ChevronRight aria-hidden="true" className="size-4" />
                        </span>
                      </Label>
                    </RadioGroup>
                  </CardContent>
                </Card>
              ) : null}

              {activePanel === "FOLLOW_UP_DETAILS" ? (
                <ContentForm
                  id={FORM_IDS.FOLLOW_UP_DETAILS}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitFollowUpDetails();
                  }}
                  noValidate
                >
                  <Card className="overflow-hidden border-primary/20 shadow-lg shadow-primary/5">
                    <PanelHeader panel="FOLLOW_UP_DETAILS" />
                    <CardContent className="grid gap-6 pt-6">
                      <Field
                        data-invalid={
                          updateForm.formState.errors.customerName !== undefined
                        }
                      >
                        <FieldLabel htmlFor="customer-name">
                          Customer name
                        </FieldLabel>
                        <Input
                          id="customer-name"
                          autoComplete="name"
                          inputMode="text"
                          placeholder="Enter the customer name"
                          disabled={updateDisabled}
                          aria-invalid={
                            updateForm.formState.errors.customerName !==
                            undefined
                          }
                          aria-describedby="customer-name-help customer-name-error"
                          className="text-base sm:text-body-sm"
                          {...updateForm.register("customerName")}
                        />
                        <FieldDescription id="customer-name-help">
                          Use the name the customer prefers during follow-up.
                        </FieldDescription>
                        <FieldError
                          id="customer-name-error"
                          errors={[updateForm.formState.errors.customerName]}
                        />
                      </Field>

                      <Controller
                        control={updateForm.control}
                        name="status"
                        render={({ field }) => (
                          <FieldSet>
                            <FieldLegend>Customer response</FieldLegend>
                            <FieldDescription>
                              Choose the option that most accurately describes
                              the latest conversation.
                            </FieldDescription>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={updateDisabled}
                              className="grid gap-3 md:grid-cols-2"
                              aria-invalid={
                                updateForm.formState.errors.status !== undefined
                              }
                            >
                              {STATUS_OPTIONS.map((option) => {
                                const StatusIcon = option.icon;

                                return (
                                  <Label
                                    key={option.value}
                                    htmlFor={`status-${option.value}`}
                                    className={cn(
                                      "flex min-h-24 cursor-pointer items-start gap-3 rounded-2xl border p-3.5 sm:min-h-28 sm:p-4 transition-colors hover:border-primary/35 hover:bg-primary/4 has-[:focus-visible]:bg-muted/50 motion-reduce:transition-none",
                                      field.value === option.value &&
                                        "border-primary/50 bg-primary/6",
                                      updateDisabled &&
                                        "pointer-events-none opacity-60",
                                    )}
                                  >
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-readable">
                                      <StatusIcon
                                        aria-hidden="true"
                                        className="size-4"
                                      />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block font-medium">
                                        {option.label}
                                      </span>
                                      <span className="mt-1 block text-caption leading-relaxed text-muted-readable">
                                        {option.description}
                                      </span>
                                    </span>
                                    <RadioGroupItem
                                      id={`status-${option.value}`}
                                      value={option.value}
                                      className="mt-1"
                                    />
                                  </Label>
                                );
                              })}
                            </RadioGroup>
                            <FieldError
                              errors={[updateForm.formState.errors.status]}
                            />
                          </FieldSet>
                        )}
                      />

                      <Alert variant="info">
                        <Info aria-hidden="true" />
                        <AlertTitle>What happens after saving?</AlertTitle>
                        <AlertDescription>
                          The response is added to lead history and the
                          workspace moves to the next follow-up schedule.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </ContentForm>
              ) : null}

              {activePanel === "NEXT_FOLLOW_UP" ? (
                <ContentForm
                  id={FORM_IDS.NEXT_FOLLOW_UP}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitNextFollowUp();
                  }}
                  noValidate
                >
                  <Card className="overflow-hidden border-primary/20 shadow-lg shadow-primary/5">
                    <PanelHeader panel="NEXT_FOLLOW_UP" />
                    <CardContent className="grid gap-6 pt-6">
                      <Controller
                        control={updateForm.control}
                        name="followUpAtLocal"
                        render={({ field }) => (
                          <Field
                            data-invalid={
                              updateForm.formState.errors.followUpAtLocal !==
                              undefined
                            }
                          >
                            <FieldLabel htmlFor="next-follow-up">
                              Date and time
                            </FieldLabel>
                            <FollowUpDateTimeDialog
                              value={field.value}
                              min={followUpBounds.min}
                              max={followUpBounds.max}
                              disabled={updateDisabled}
                              onValueChange={(nextValue) => {
                                field.onChange(nextValue);
                                field.onBlur();
                              }}
                            />
                            <FieldDescription id="next-follow-up-help">
                              Date and time are selected in a focused dialog.
                            </FieldDescription>
                            <FieldError
                              errors={[
                                updateForm.formState.errors.followUpAtLocal,
                              ]}
                            />
                          </Field>
                        )}
                      />

                      <Alert variant="info">
                        <MessageCircle aria-hidden="true" />
                        <AlertTitle>Automatic WhatsApp reminder</AlertTitle>
                        <AlertDescription>
                          At the selected time, the assigned dealer receives a
                          reminder with this lead number and a secure update
                          link. Rescheduling replaces the previous reminder.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </ContentForm>
              ) : null}

              {activePanel === "CALL_NOTE" ? (
                <ContentForm
                  id={FORM_IDS.CALL_NOTE}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitCallNote();
                  }}
                  noValidate
                >
                  <Card className="overflow-hidden border-primary/20 shadow-lg shadow-primary/5">
                    <PanelHeader panel="CALL_NOTE" />
                    <CardContent className="grid gap-5 pt-6">
                      <Field
                        data-invalid={
                          updateForm.formState.errors.note !== undefined
                        }
                      >
                        <FieldLabel htmlFor="call-note">Call note</FieldLabel>
                        <Textarea
                          id="call-note"
                          rows={8}
                          placeholder="Example: Customer asked for the on-road price. Promised to share the quotation and call again after 6 PM."
                          disabled={updateDisabled}
                          aria-invalid={
                            updateForm.formState.errors.note !== undefined
                          }
                          aria-describedby="call-note-help call-note-count"
                          className="min-h-40 resize-y text-base sm:min-h-44 sm:text-body-sm"
                          {...updateForm.register("note")}
                        />
                        <div className="flex flex-col gap-1 text-caption text-muted-readable sm:flex-row sm:items-center sm:justify-between">
                          <span id="call-note-help">
                            Do not enter payment, identity, or banking details.
                          </span>
                          <span id="call-note-count" className="text-tabular">
                            {noteValue.length}/4000
                          </span>
                        </div>
                        <FieldError
                          errors={[updateForm.formState.errors.note]}
                        />
                      </Field>

                      <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/25 p-4 sm:grid-cols-3">
                        {[
                          {
                            title: "Customer need",
                            description:
                              "What information or support is needed?",
                          },
                          {
                            title: "Action promised",
                            description: "What will you or the team do next?",
                          },
                          {
                            title: "Preferred timing",
                            description:
                              "When should the customer be contacted?",
                          },
                        ].map((item) => (
                          <div key={item.title} className="flex gap-2">
                            <CheckCircle2
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0 text-success"
                            />
                            <div>
                              <p className="text-body-sm font-medium">
                                {item.title}
                              </p>
                              <p className="mt-1 text-caption text-muted-readable">
                                {item.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </ContentForm>
              ) : null}

              {activePanel === "FORWARD" ? (
                <ContentForm
                  id={FORM_IDS.FORWARD}
                  onSubmit={submitForward}
                  noValidate
                >
                  <Card className="overflow-hidden border-primary/20 shadow-lg shadow-primary/5">
                    <PanelHeader panel="FORWARD" />
                    <CardContent className="grid gap-6 pt-6">
                      <Controller
                        control={forwardForm.control}
                        name="targetIvrFlowCode"
                        render={({ field }) => (
                          <FieldSet>
                            <FieldLegend>Enquiry type</FieldLegend>
                            <FieldDescription>
                              Select the destination that best matches the
                              customer’s request.
                            </FieldDescription>
                            <RadioGroup
                              value={field.value}
                              onValueChange={(value: string) => {
                                field.onChange(value);
                                if (value !== "VEHICLE_ENQUIRIES") {
                                  forwardForm.setValue(
                                    "targetDealerOrgUnitId",
                                    EMPTY_VALUE,
                                    { shouldValidate: true },
                                  );
                                }
                              }}
                              disabled={forwardDisabled}
                              className="grid gap-3 md:grid-cols-2"
                            >
                              {ROUTE_OPTIONS.map((option) => {
                                const RouteIcon = option.icon;

                                return (
                                  <Label
                                    key={option.value}
                                    htmlFor={`route-${option.value}`}
                                    className={cn(
                                      "flex min-h-24 cursor-pointer items-start gap-3 rounded-2xl border p-3.5 sm:min-h-28 sm:p-4 transition-colors hover:border-primary/35 hover:bg-primary/4 has-[:focus-visible]:bg-muted/50 motion-reduce:transition-none",
                                      field.value === option.value &&
                                        "border-primary/50 bg-primary/6",
                                      forwardDisabled &&
                                        "pointer-events-none opacity-60",
                                    )}
                                  >
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-readable">
                                      <RouteIcon
                                        aria-hidden="true"
                                        className="size-4"
                                      />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block font-medium">
                                        {option.label}
                                      </span>
                                      <span className="mt-1 block text-caption leading-relaxed text-muted-readable">
                                        {option.description}
                                      </span>
                                    </span>
                                    <RadioGroupItem
                                      id={`route-${option.value}`}
                                      value={option.value}
                                      className="mt-1"
                                    />
                                  </Label>
                                );
                              })}
                            </RadioGroup>
                          </FieldSet>
                        )}
                      />

                      {selectedRoute === "VEHICLE_ENQUIRIES" ? (
                        <section
                          aria-labelledby="dealer-destination-title"
                          className="grid gap-4 rounded-3xl border border-border/70 bg-muted/20 p-4 sm:p-5"
                        >
                          <div>
                            <h2
                              id="dealer-destination-title"
                              className="text-card-title"
                            >
                              Dealer destination
                            </h2>
                            <p className="mt-1 text-body-sm text-muted-readable">
                              Keep this lead with the current dealer or assign
                              it to an eligible dealer near the customer.
                            </p>
                          </div>

                          {lead.vehicleRouting.locationAvailable ? (
                            <Controller
                              control={forwardForm.control}
                              name="targetDealerOrgUnitId"
                              render={({ field }) => (
                                <div className="grid gap-2">
                                  <Label htmlFor="route-dealer">
                                    Dealer to handle this enquiry
                                  </Label>
                                  <DealerSelectionDialog
                                    currentDealer={
                                      activeLead.vehicleRouting.currentDealer
                                    }
                                    options={activeLead.vehicleRouting.options}
                                    value={field.value}
                                    disabled={forwardDisabled}
                                    onValueChange={(nextValue) => {
                                      field.onChange(nextValue);
                                      field.onBlur();
                                    }}
                                  />
                                </div>
                              )}
                            />
                          ) : (
                            <Alert variant="warning">
                              <MapPin aria-hidden="true" />
                              <AlertTitle>
                                Nearby dealers cannot be listed
                              </AlertTitle>
                              <AlertDescription>
                                The customer location is missing, so this
                                enquiry must remain with the current dealer.
                              </AlertDescription>
                            </Alert>
                          )}

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div
                              className={cn(
                                "rounded-2xl border p-4",
                                selectedDealer === undefined
                                  ? "border-primary/35 bg-primary/6"
                                  : "border-border/70 bg-background/70",
                              )}
                            >
                              <p className="text-caption text-muted-readable">
                                Current dealer
                              </p>
                              <p className="mt-1 font-medium">
                                {lead.vehicleRouting.currentDealer?.name ??
                                  "Current dealer"}
                              </p>
                              <p className="mt-1 text-caption text-muted-readable">
                                {selectedDealer === undefined
                                  ? "This dealer will continue handling the lead."
                                  : "This assignment will be replaced after confirmation."}
                              </p>
                            </div>

                            <div
                              className={cn(
                                "rounded-2xl border p-4",
                                selectedDealer === undefined
                                  ? "border-dashed border-border/70 bg-background/40"
                                  : "border-primary/35 bg-primary/6",
                              )}
                            >
                              <p className="text-caption text-muted-readable">
                                Selected destination
                              </p>
                              {selectedDealer === undefined ? (
                                <p className="mt-1 text-body-sm text-muted-readable">
                                  No dealer transfer selected.
                                </p>
                              ) : (
                                <>
                                  <p className="mt-1 font-medium">
                                    {selectedDealer.name}
                                  </p>
                                  <p className="mt-1 text-caption text-muted-readable">
                                    {selectedDealer.distanceKm.toFixed(1)} km
                                    away ·{" "}
                                    {selectedDealer.district ??
                                      "District unavailable"}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>

                          <p className="text-caption text-muted-readable">
                            Only active dealers configured to support vehicle
                            enquiries are listed. Distance is calculated from
                            the customer location.
                          </p>
                        </section>
                      ) : null}

                      <Field
                        data-invalid={
                          forwardForm.formState.errors.reason !== undefined
                        }
                      >
                        <FieldLabel htmlFor="route-reason">
                          Context for the receiving team
                        </FieldLabel>
                        <Textarea
                          id="route-reason"
                          rows={5}
                          placeholder="Briefly explain what the customer needs, what has already been discussed, and why this destination is suitable."
                          disabled={forwardDisabled}
                          aria-invalid={
                            forwardForm.formState.errors.reason !== undefined
                          }
                          aria-describedby="route-reason-help route-reason-error"
                          className="min-h-32 resize-y text-base sm:text-body-sm"
                          {...forwardForm.register("reason")}
                        />
                        <FieldDescription id="route-reason-help">
                          Keep the note factual and do not include payment,
                          identity, or banking details.
                        </FieldDescription>
                        <FieldError
                          id="route-reason-error"
                          errors={[forwardForm.formState.errors.reason]}
                        />
                      </Field>
                    </CardContent>
                  </Card>
                </ContentForm>
              ) : null}

              {activePanel === "HISTORY" ? (
                <Card className="overflow-hidden border-primary/20 shadow-lg shadow-primary/5">
                  <PanelHeader panel="HISTORY" />
                  <CardContent className="grid gap-5 pt-6">
                    <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                      {[
                        {
                          label: "Calls",
                          value: getHistoryFilterCount(
                            activeLead.history.items,
                            "CALLS",
                          ),
                          icon: PhoneCall,
                        },
                        {
                          label: "Follow-ups",
                          value: getHistoryFilterCount(
                            activeLead.history.items,
                            "FOLLOW_UPS",
                          ),
                          icon: Clock3,
                        },
                        {
                          label: "WhatsApp",
                          value: getHistoryFilterCount(
                            activeLead.history.items,
                            "MESSAGES",
                          ),
                          icon: MessageCircle,
                        },
                        {
                          label: "Routing",
                          value: getHistoryFilterCount(
                            activeLead.history.items,
                            "ROUTING",
                          ),
                          icon: Route,
                        },
                      ].map((metric) => {
                        const MetricIcon = metric.icon;

                        return (
                          <ContentMetricCard
                            key={metric.label}
                            size="sm"
                            label={metric.label}
                            value={metric.value}
                            icon={
                              <MetricIcon
                                aria-hidden="true"
                                className="size-4"
                              />
                            }
                            tone="primary"
                            className="min-w-0"
                          />
                        );
                      })}
                    </div>

                    <ContentSection
                      size="sm"
                      title="Filter activity"
                      description="Show only the activity needed for this follow-up."
                      actions={
                        <ListFilter
                          aria-hidden="true"
                          className="size-4 text-muted-readable"
                        />
                      }
                      contentClassName="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
                    >
                      {HISTORY_FILTERS.map((filter) => {
                        const count = getHistoryFilterCount(
                          activeLead.history.items,
                          filter.value,
                        );

                        return (
                          <Button
                            key={filter.value}
                            type="button"
                            variant={
                              historyFilter === filter.value
                                ? "secondary"
                                : "outline"
                            }
                            size="sm"
                            aria-pressed={historyFilter === filter.value}
                            onClick={() => {
                              setHistoryFilter(filter.value);
                            }}
                            className="min-w-0 justify-between sm:w-auto"
                          >
                            <span className="truncate">{filter.label}</span>
                            <Badge variant="outline" className="shrink-0">
                              {count}
                            </Badge>
                          </Button>
                        );
                      })}
                    </ContentSection>

                    {activeLead.history.items.length === 0 ? (
                      <ContentEmptyState
                        icon={<History aria-hidden="true" />}
                        title="No lead activity has been recorded yet"
                        description="Saved calls, notes, messages, and routing changes will appear here."
                        className="min-h-48 border border-dashed border-border/80 sm:min-h-56"
                      />
                    ) : filteredHistoryItems.length === 0 ? (
                      <ContentEmptyState
                        icon={<ListFilter aria-hidden="true" />}
                        title="No activity matches this filter"
                        description="Choose another activity type to continue reviewing the lead history."
                        className="min-h-48 border border-dashed border-border/80 sm:min-h-56"
                      />
                    ) : (
                      <ol className="grid min-w-0 gap-3">
                        {filteredHistoryItems.map((item) => (
                          <HistoryItem key={item.id} item={item} />
                        ))}
                      </ol>
                    )}

                    {lead.history.truncated ? (
                      <Alert variant="info">
                        <History aria-hidden="true" />
                        <AlertTitle>
                          Older history is available in ERP
                        </AlertTitle>
                        <AlertDescription>
                          This secure page shows the latest 200 records to keep
                          loading fast and limit unnecessary data exposure.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </div>

            {readOnly ? (
              <ContentStatus
                variant="warning"
                icon={<Building2 aria-hidden="true" />}
                title="This link is now read-only"
                description="The lead was moved, the permitted updates were completed, or the secure link expired. The visible history remains available for this session."
              />
            ) : null}
          </div>

          <aside
            className="hidden min-w-0 lg:sticky lg:top-20 lg:block"
            aria-label="Lead summary"
          >
            <ContentSection className="bg-card/90 shadow-md">
              <LeadSummaryContent
                lead={lead}
                locationText={locationText}
                readOnly={readOnly}
              />
            </ContentSection>
          </aside>
        </ContentSplit>
      </ContentRoot>

      <AlertDialog
        open={forwardConfirmation !== null}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setForwardConfirmation(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Building2 aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Transfer this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              The lead will move from{" "}
              <strong>
                {lead.vehicleRouting.currentDealer?.name ??
                  "the current dealer"}
              </strong>{" "}
              to{" "}
              <strong>
                {confirmationDealer?.name ?? "the selected dealer"}
              </strong>
              . The new dealer will receive a secure WhatsApp notification, and
              this dealer’s update link may become read-only.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirmationDealer === undefined ? null : (
            <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
              <p className="font-medium">{confirmationDealer.name}</p>
              <p className="mt-1 text-body-sm text-muted-readable">
                {confirmationDealer.distanceKm.toFixed(1)} km from the customer
                · {confirmationDealer.district ?? "District unavailable"}
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Keep current assignment</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const values = forwardConfirmation;
                setForwardConfirmation(null);
                if (values !== null) {
                  void executeForward(values);
                }
              }}
            >
              Confirm transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PublicDealerLeadShell>
  );
}

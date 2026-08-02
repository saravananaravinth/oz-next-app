// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-lead-dialog.tsx
"use client";

import * as React from "react";
import {
  Activity,
  ArrowRightLeft,
  Building2,
  Check,
  Circle,
  CircleAlert,
  Clock3,
  ExternalLink,
  Eye,
  EyeOff,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Route,
  ShieldCheck,
  ShoppingCart,
  UserRound,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToast } from "@/shared/hooks/use-toast";

import {
  createEngagementLeadAdminSessionAction,
  readEngagementLeadDetailAction,
  reassignEngagementLeadAction,
  type ReadEngagementLeadDetailActionResult,
} from "@/features/engagement/operations-dashboard/actions/engagement-dashboard.actions";
import type {
  EngagementDashboardLeadListItem,
  EngagementLeadDetail,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDashboardCapabilities } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import {
  formatDashboardDateTime,
  titleCaseDashboardToken,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";

type LeadDialogCapabilities = Pick<
  EngagementDashboardCapabilities,
  "canReadCustomerContact" | "canReassignLead" | "canUpdateLeads"
>;

export type EngagementLeadDialogProps = Readonly<{
  lead: Pick<EngagementDashboardLeadListItem, "leadId" | "leadNo"> | null;
  capabilities: LeadDialogCapabilities;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>;

type LoadedLeadResult = Readonly<{
  leadId: string;
  result: ReadEngagementLeadDetailActionResult;
}>;

type PrivilegedAction = "ADMIN_SESSION" | "REASSIGN";
type FlowState = "COMPLETE" | "CURRENT" | "BLOCKED" | "UPCOMING";
type FlowStage = Readonly<{
  code: "NEW" | "ASSIGNED" | "CONTACTED" | "BOOKED" | "CONVERTED";
  label: string;
  state: FlowState;
  occurredAt: string | null;
  reason: string;
}>;
type TimelineEvent = EngagementLeadDetail["timeline"][number];
type JourneyItem = EngagementLeadDetail["journey"]["items"][number];
type JourneyPhaseCode =
  | "INTAKE"
  | "LOCATION"
  | "ASSIGNMENT"
  | "NOTIFICATION"
  | "ENGAGEMENT"
  | "OUTCOME";
type LifecycleAction = Readonly<{
  id: string;
  phase: JourneyPhaseCode;
  title: string;
  description: string;
  occurredAt: string | null;
  state: FlowState;
  statusLabel: string;
  kind: JourneyItem["kind"];
  channel: JourneyItem["channel"];
  actorLabel: string | null;
  derived: boolean;
}>;

const FLOW_STATE_META = {
  COMPLETE: {
    label: "Completed",
    badge: "success",
    icon: Check,
  },
  CURRENT: {
    label: "In progress",
    badge: "info",
    icon: Circle,
  },
  BLOCKED: {
    label: "Needs action",
    badge: "warning",
    icon: CircleAlert,
  },
  UPCOMING: {
    label: "Upcoming",
    badge: "outline",
    icon: LockKeyhole,
  },
} as const satisfies Readonly<
  Record<
    FlowState,
    Readonly<{
      label: string;
      badge: BadgeProps["variant"];
      icon: typeof Check;
    }>
  >
>;

const JOURNEY_PHASES = [
  {
    code: "INTAKE",
    label: "Customer call and intake",
    description: "Enquiry receipt and source-side call evidence.",
  },
  {
    code: "LOCATION",
    label: "Location request and response",
    description: "WhatsApp request delivery and customer coordinate readiness.",
  },
  {
    code: "ASSIGNMENT",
    label: "Dealer assignment",
    description: "Routing decisions, assignment evidence, and blockers.",
  },
  {
    code: "NOTIFICATION",
    label: "Assignment communications",
    description:
      "Customer and dealer WhatsApp delivery evidence after assignment.",
  },
  {
    code: "ENGAGEMENT",
    label: "Dealer response and follow-up",
    description: "Calls, response SLA, notes, and scheduled next actions.",
  },
  {
    code: "OUTCOME",
    label: "Booking and conversion",
    description: "Commercial outcome evidence and remaining downstream work.",
  },
] as const satisfies ReadonlyArray<
  Readonly<{
    code: JourneyPhaseCode;
    label: string;
    description: string;
  }>
>;

function actionFailureDescription(
  result: Extract<ReadEngagementLeadDetailActionResult, { ok: false }>,
): string {
  return result.requestId === undefined
    ? result.message
    : `${result.message} Reference: ${result.requestId}`;
}

function payloadString(event: TimelineEvent, key: string): string | null {
  const value = event.payload[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function latestDealerStatus(lead: EngagementLeadDetail): string | null {
  for (const event of lead.timeline) {
    const status = payloadString(event, "status");
    if (status !== null) return status;
  }
  return null;
}

function flowStages(lead: EngagementLeadDetail): readonly FlowStage[] {
  const closedWithoutConversion =
    lead.closedAt !== null && lead.convertedAt === null;
  const dealerStatus = latestDealerStatus(lead);
  const locationAvailable =
    lead.location.latitude !== null && lead.location.longitude !== null;
  const assignmentComplete =
    lead.ownerAssignedAt !== null && lead.dealer !== null;
  const contactComplete = lead.firstResponseAt !== null;
  const bookingComplete = lead.bookedAt !== null;
  const conversionComplete = lead.convertedAt !== null;

  const stages: FlowStage[] = [
    {
      code: "NEW",
      label: "Lead received",
      state: "COMPLETE",
      occurredAt: lead.createdAt,
      reason: `Created from ${lead.source.name}.`,
    },
    {
      code: "ASSIGNED",
      label: "Dealer assigned",
      state: assignmentComplete
        ? "COMPLETE"
        : closedWithoutConversion
          ? "BLOCKED"
          : locationAvailable
            ? "CURRENT"
            : "BLOCKED",
      occurredAt: lead.ownerAssignedAt,
      reason: assignmentComplete
        ? `Assigned to ${lead.dealer?.name ?? "the selected dealer"}.`
        : closedWithoutConversion
          ? "The lead was closed before a dealer assignment was recorded."
          : locationAvailable
            ? "No dealer assignment is recorded. Check dealer capacity, coverage, and engagement eligibility."
            : "Customer coordinates are missing, so distance-based dealer assignment cannot complete.",
    },
    {
      code: "CONTACTED",
      label: "Customer contacted",
      state: contactComplete
        ? "COMPLETE"
        : closedWithoutConversion
          ? "BLOCKED"
          : !assignmentComplete
            ? "UPCOMING"
            : lead.responseSlaState === "BREACHED"
              ? "BLOCKED"
              : "CURRENT",
      occurredAt: lead.firstResponseAt,
      reason: contactComplete
        ? dealerStatus === null
          ? "A dealer response was recorded."
          : `Latest dealer response: ${titleCaseDashboardToken(dealerStatus)}.`
        : closedWithoutConversion
          ? "The lead was closed before any customer response was recorded."
          : !assignmentComplete
            ? "Starts after a dealer is assigned."
            : lead.responseSlaState === "BREACHED"
              ? "No dealer response was recorded before the response SLA expired."
              : "Waiting for the dealer to record the first customer response.",
    },
    {
      code: "BOOKED",
      label: "Booking confirmed",
      state: bookingComplete
        ? "COMPLETE"
        : closedWithoutConversion || dealerStatus === "NOT_INTERESTED"
          ? "BLOCKED"
          : !contactComplete
            ? "UPCOMING"
            : "CURRENT",
      occurredAt: lead.bookedAt,
      reason: bookingComplete
        ? "A booking event was recorded."
        : closedWithoutConversion
          ? "The lead was closed before a booking was recorded."
          : dealerStatus === "NOT_INTERESTED"
            ? "The latest dealer response marks the customer as not interested."
            : !contactComplete
              ? "Starts after the first customer response."
              : "No confirmed booking is recorded yet.",
    },
    {
      code: "CONVERTED",
      label: "Sale converted",
      state: conversionComplete
        ? "COMPLETE"
        : !bookingComplete
          ? closedWithoutConversion
            ? "BLOCKED"
            : "UPCOMING"
          : "CURRENT",
      occurredAt: lead.convertedAt,
      reason: conversionComplete
        ? "A verified conversion record is linked to this lead."
        : closedWithoutConversion
          ? "The lead was closed without a verified conversion."
          : !bookingComplete
            ? "Starts after a booking is confirmed."
            : "Booking is complete; conversion evidence is still pending.",
    },
  ];

  return stages;
}

function journeyText(item: JourneyItem): string {
  return `${item.title} ${item.description ?? ""}`.toLocaleLowerCase("en-US");
}

function hasJourneyText(
  items: readonly JourneyItem[],
  fragments: readonly string[],
): boolean {
  return items.some((item) => {
    const text = journeyText(item);
    return fragments.some((fragment) => text.includes(fragment));
  });
}

function journeyState(item: JourneyItem): FlowState {
  if (item.status === null) return "COMPLETE";
  const status = item.status
    .trim()
    .toLocaleUpperCase("en-US")
    .replaceAll(" ", "_");

  if (
    [
      "FAILED",
      "BOUNCED",
      "REJECTED",
      "CANCELLED",
      "UNDELIVERED",
      "MISSED",
      "EXPIRED",
      "ERROR",
      "NOT_SENT",
    ].some((value) => status.includes(value))
  ) {
    return "BLOCKED";
  }

  if (
    [
      "PENDING",
      "QUEUED",
      "SCHEDULED",
      "SUBMITTED",
      "CREATED",
      "PROCESSING",
      "IN_PROGRESS",
    ].some((value) => status.includes(value))
  ) {
    return "CURRENT";
  }

  return "COMPLETE";
}

function journeyPhase(
  item: JourneyItem,
  lead: EngagementLeadDetail,
): JourneyPhaseCode {
  const text = journeyText(item);

  if (item.kind === "WHATSAPP") {
    if (text.includes("location")) return "LOCATION";
    if (
      text.includes("dealer_assigned") ||
      text.includes("dealer_lead_update") ||
      text.includes("assignment_pending") ||
      text.includes("assignment")
    ) {
      return "NOTIFICATION";
    }
    return "ENGAGEMENT";
  }

  if (
    text.includes("booking") ||
    text.includes("booked") ||
    text.includes("convert") ||
    text.includes("sale") ||
    text.includes("closed")
  ) {
    return "OUTCOME";
  }
  if (text.includes("location") || text.includes("coordinate")) {
    return "LOCATION";
  }
  if (
    item.kind === "ASSIGNMENT" ||
    item.kind === "ROUTING" ||
    text.includes("assign") ||
    text.includes("route") ||
    text.includes("forward")
  ) {
    return "ASSIGNMENT";
  }
  if (item.kind === "CALL") {
    return lead.ownerAssignedAt !== null &&
      item.occurredAt >= lead.ownerAssignedAt
      ? "ENGAGEMENT"
      : "INTAKE";
  }
  if (
    item.kind === "FOLLOW_UP" ||
    item.kind === "NOTE" ||
    item.kind === "STATUS" ||
    text.includes("contact") ||
    text.includes("follow")
  ) {
    return "ENGAGEMENT";
  }
  return "INTAKE";
}

function journeyIcon(
  item: Pick<LifecycleAction, "kind" | "phase">,
): React.ReactNode {
  if (item.kind === "WHATSAPP") {
    return <MessageCircle aria-hidden="true" />;
  }
  if (item.phase === "LOCATION") {
    return <MapPin aria-hidden="true" />;
  }
  if (item.kind === "ASSIGNMENT" || item.kind === "ROUTING") {
    return <Building2 aria-hidden="true" />;
  }
  if (item.kind === "CALL" || item.kind === "FOLLOW_UP") {
    return <Phone aria-hidden="true" />;
  }
  if (item.phase === "OUTCOME") {
    return <ShoppingCart aria-hidden="true" />;
  }
  return <Activity aria-hidden="true" />;
}

function lifecycleActions(
  lead: EngagementLeadDetail,
): readonly LifecycleAction[] {
  const items = lead.journey.items;
  const actions: LifecycleAction[] = items.map((item) => ({
    id: item.id,
    phase: journeyPhase(item, lead),
    title: item.title,
    description:
      item.description ??
      (item.kind === "ASSIGNMENT" && lead.dealer !== null
        ? `Assigned to ${lead.dealer.name} · ${lead.dealer.code}.`
        : "Auditable workflow evidence was recorded."),
    occurredAt: item.occurredAt,
    state: journeyState(item),
    statusLabel: item.status ?? "Recorded",
    kind: item.kind,
    channel: item.channel,
    actorLabel: item.actorLabel,
    derived: false,
  }));
  const locationReady =
    lead.location.latitude !== null && lead.location.longitude !== null;
  const assignmentComplete =
    lead.ownerAssignedAt !== null && lead.dealer !== null;
  const closedWithoutConversion =
    lead.closedAt !== null && lead.convertedAt === null;
  const sourceText =
    `${lead.source.name} ${lead.source.code}`.toLocaleLowerCase("en-US");
  const messageItems = items.filter((item) => item.kind === "WHATSAPP");
  const locationMessages = items.filter(
    (item) =>
      item.kind === "WHATSAPP" && journeyText(item).includes("location"),
  );
  const successfulLocationRequest = locationMessages.some(
    (item) => journeyState(item) === "COMPLETE",
  );
  const pendingLocationRequest = locationMessages.some(
    (item) => journeyState(item) === "CURRENT",
  );

  function add(
    action: Omit<LifecycleAction, "derived" | "channel" | "actorLabel"> &
      Partial<Pick<LifecycleAction, "channel" | "actorLabel">>,
  ): void {
    actions.push({
      ...action,
      channel: action.channel ?? null,
      actorLabel: action.actorLabel ?? null,
      derived: true,
    });
  }

  if (
    !hasJourneyText(items, [
      "lead received",
      "lead created",
      "customer call",
      "phone call",
    ])
  ) {
    add({
      id: "checkpoint:intake",
      phase: "INTAKE",
      title:
        sourceText.includes("phone") || sourceText.includes("call")
          ? "Customer call captured"
          : "Vehicle-sales enquiry received",
      description: `Lead created from ${lead.source.name}.`,
      occurredAt: lead.createdAt,
      state: "COMPLETE",
      statusLabel: "Completed",
      kind: "CALL",
    });
  }

  if (locationMessages.length === 0) {
    const requestEventRecorded = hasJourneyText(items, [
      "location request",
      "location_request",
    ]);
    add({
      id: "checkpoint:location-request",
      phase: "LOCATION",
      title: "Location request WhatsApp",
      description: requestEventRecorded
        ? "A request event exists, but no outbound-message delivery record is linked to this lead."
        : locationReady
          ? "Customer coordinates were already available, so a location request was not required."
          : "No WhatsApp delivery record exists. Send or retry the customer location request.",
      occurredAt: null,
      state: requestEventRecorded
        ? "BLOCKED"
        : locationReady
          ? "COMPLETE"
          : "BLOCKED",
      statusLabel: requestEventRecorded
        ? "Evidence missing"
        : locationReady
          ? "Not required"
          : "Not sent",
      kind: "WHATSAPP",
      channel: "WHATSAPP",
    });
  }

  add({
    id: "checkpoint:customer-location",
    phase: "LOCATION",
    title: "Customer location shared",
    description: locationReady
      ? `Coordinates are available${lead.location.district === null ? "" : ` for ${lead.location.district}`}.`
      : successfulLocationRequest || pendingLocationRequest
        ? "The location request is recorded; customer coordinates are still pending."
        : "Coordinates are missing and no successful location-request delivery is recorded.",
    occurredAt: locationReady ? lead.updatedAt : null,
    state: locationReady
      ? "COMPLETE"
      : successfulLocationRequest || pendingLocationRequest
        ? "CURRENT"
        : "BLOCKED",
    statusLabel: locationReady
      ? "Completed"
      : successfulLocationRequest || pendingLocationRequest
        ? "Waiting for customer"
        : "Needs action",
    kind: "SYSTEM",
  });

  if (
    !assignmentComplete ||
    !items.some(
      (item) =>
        item.kind === "ASSIGNMENT" ||
        item.kind === "ROUTING" ||
        journeyText(item).includes("assigned"),
    )
  ) {
    add({
      id: "checkpoint:dealer-assignment",
      phase: "ASSIGNMENT",
      title: assignmentComplete
        ? "Dealer assigned"
        : "Current dealer assignment",
      description: assignmentComplete
        ? `Assigned to ${lead.dealer?.name ?? "the selected dealer"}.`
        : !locationReady
          ? "Distance-based assignment cannot complete until customer coordinates are available."
          : "Coordinates are available, but no eligible dealer assignment is recorded. Check coverage, capacity, and eligibility.",
      occurredAt: lead.ownerAssignedAt,
      state: assignmentComplete ? "COMPLETE" : "BLOCKED",
      statusLabel: assignmentComplete ? "Completed" : "Needs action",
      kind: "ASSIGNMENT",
    });
  }

  const hasCustomerAssignmentMessage = hasJourneyText(messageItems, [
    "oz_dealer_assigned_v1",
    "oz_dealer_assigned_far_v1",
  ]);
  if (!hasCustomerAssignmentMessage) {
    add({
      id: "checkpoint:customer-assignment-message",
      phase: "NOTIFICATION",
      title: "Customer assignment WhatsApp",
      description: assignmentComplete
        ? "No customer assignment-message delivery record is linked to this lead."
        : "Starts after a dealer assignment is recorded.",
      occurredAt: null,
      state: assignmentComplete ? "BLOCKED" : "UPCOMING",
      statusLabel: assignmentComplete ? "Not sent" : "Upcoming",
      kind: "WHATSAPP",
      channel: "WHATSAPP",
    });
  }

  const hasDealerAssignmentMessage = hasJourneyText(messageItems, [
    "oz_dealer_lead_update_v1",
    "dealer lead assigned",
  ]);
  if (!hasDealerAssignmentMessage) {
    add({
      id: "checkpoint:dealer-assignment-message",
      phase: "NOTIFICATION",
      title: "Dealer assignment WhatsApp",
      description: assignmentComplete
        ? "No dealer assignment-message delivery record is linked to this lead."
        : "Starts after a dealer assignment is recorded.",
      occurredAt: null,
      state: assignmentComplete ? "BLOCKED" : "UPCOMING",
      statusLabel: assignmentComplete ? "Not sent" : "Upcoming",
      kind: "WHATSAPP",
      channel: "WHATSAPP",
    });
  }

  if (
    !hasJourneyText(items, [
      "customer contact",
      "lead contacted",
      "follow-up details updated",
    ])
  ) {
    add({
      id: "checkpoint:first-response",
      phase: "ENGAGEMENT",
      title: "Dealer first response",
      description:
        lead.firstResponseAt !== null
          ? "A first dealer response is recorded."
          : !assignmentComplete
            ? "Starts after a dealer is assigned."
            : lead.responseSlaState === "BREACHED"
              ? "No response was recorded before the SLA expired."
              : "Waiting for the dealer to record the first customer response.",
      occurredAt: lead.firstResponseAt,
      state:
        lead.firstResponseAt !== null
          ? "COMPLETE"
          : !assignmentComplete
            ? "UPCOMING"
            : lead.responseSlaState === "BREACHED"
              ? "BLOCKED"
              : "CURRENT",
      statusLabel:
        lead.firstResponseAt !== null
          ? "Completed"
          : !assignmentComplete
            ? "Upcoming"
            : lead.responseSlaState === "BREACHED"
              ? "SLA breached"
              : "Waiting for dealer",
      kind: "FOLLOW_UP",
    });
  }

  add({
    id: "checkpoint:next-follow-up",
    phase: "ENGAGEMENT",
    title: "Next follow-up",
    description:
      lead.nextFollowUpAt !== null
        ? "A next customer follow-up is scheduled."
        : closedWithoutConversion
          ? "The lead closed without another follow-up."
          : lead.firstResponseAt === null
            ? "Starts after the first dealer response."
            : "No next follow-up is scheduled.",
    occurredAt: lead.nextFollowUpAt,
    state:
      lead.nextFollowUpAt !== null
        ? lead.followUpState === "OVERDUE"
          ? "BLOCKED"
          : "CURRENT"
        : closedWithoutConversion
          ? "BLOCKED"
          : lead.firstResponseAt === null
            ? "UPCOMING"
            : "BLOCKED",
    statusLabel:
      lead.nextFollowUpAt !== null
        ? titleCaseDashboardToken(lead.followUpState)
        : closedWithoutConversion
          ? "Not completed"
          : lead.firstResponseAt === null
            ? "Upcoming"
            : "Not scheduled",
    kind: "FOLLOW_UP",
  });

  if (!hasJourneyText(items, ["booking confirmed", "lead booked"])) {
    add({
      id: "checkpoint:booking",
      phase: "OUTCOME",
      title: "Booking confirmed",
      description:
        lead.bookedAt !== null
          ? "A booking event is recorded."
          : closedWithoutConversion
            ? "The lead closed before a booking was recorded."
            : lead.firstResponseAt === null
              ? "Starts after the first customer response."
              : "Customer engagement is active; booking evidence is pending.",
      occurredAt: lead.bookedAt,
      state:
        lead.bookedAt !== null
          ? "COMPLETE"
          : closedWithoutConversion
            ? "BLOCKED"
            : lead.firstResponseAt === null
              ? "UPCOMING"
              : "CURRENT",
      statusLabel:
        lead.bookedAt !== null
          ? "Completed"
          : closedWithoutConversion
            ? "Not completed"
            : lead.firstResponseAt === null
              ? "Upcoming"
              : "In progress",
      kind: "STATUS",
    });
  }

  if (!hasJourneyText(items, ["sale converted", "lead converted"])) {
    add({
      id: "checkpoint:conversion",
      phase: "OUTCOME",
      title: "Sale converted",
      description:
        lead.convertedAt !== null
          ? "A verified conversion record is linked to this lead."
          : closedWithoutConversion
            ? "The lead closed without a verified conversion."
            : lead.bookedAt === null
              ? "Starts after a booking is confirmed."
              : "Booking is complete; conversion evidence is pending.",
      occurredAt: lead.convertedAt,
      state:
        lead.convertedAt !== null
          ? "COMPLETE"
          : closedWithoutConversion
            ? "BLOCKED"
            : lead.bookedAt === null
              ? "UPCOMING"
              : "CURRENT",
      statusLabel:
        lead.convertedAt !== null
          ? "Completed"
          : closedWithoutConversion
            ? "Not completed"
            : lead.bookedAt === null
              ? "Upcoming"
              : "In progress",
      kind: "STATUS",
    });
  }

  return actions;
}

function DetailItem({
  label,
  children,
}: Readonly<{
  label: string;
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <div className="grid h-full min-w-0 content-start gap-1 rounded-xl border border-border/65 bg-card/60 p-3.5">
      <dt className="text-overline text-muted-readable">{label}</dt>
      <dd className="min-w-0 break-words text-body-sm font-medium text-foreground">
        {children}
      </dd>
    </div>
  );
}

function ContactValue({
  lead,
  canRead,
}: Readonly<{
  lead: EngagementLeadDetail;
  canRead: boolean;
}>): React.ReactElement {
  const [revealed, setRevealed] = React.useState(false);
  const full = canRead ? lead.customer.contact : null;
  const masked = lead.customer.contactMasked ?? "Not available";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="min-w-0 flex-1 text-tabular">
        {revealed && full !== null ? full : masked}
      </span>
      {full === null ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-readable"
              tabIndex={0}
            >
              <LockKeyhole aria-hidden="true" className="size-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Full contact access requires engagement:customer-contact:read.
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={
                revealed
                  ? "Hide customer mobile number"
                  : "Reveal customer mobile number"
              }
              aria-pressed={revealed}
              onClick={() => {
                setRevealed((current) => !current);
              }}
            >
              {revealed ? (
                <EyeOff aria-hidden="true" />
              ) : (
                <Eye aria-hidden="true" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {revealed ? "Hide full mobile number" : "Reveal full mobile number"}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function LeadOverview({
  lead,
  capabilities,
}: Readonly<{
  lead: EngagementLeadDetail;
  capabilities: LeadDialogCapabilities;
}>): React.ReactElement {
  const location = [
    lead.location.city,
    lead.location.district,
    lead.location.state,
    lead.location.postalCode,
  ]
    .filter((value): value is string => value !== null && value.length > 0)
    .join(" · ");

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section
        className="grid h-full grid-rows-[auto_1fr] gap-3"
        aria-labelledby="lead-customer-title"
      >
        <div>
          <h3 id="lead-customer-title" className="text-card-title">
            Customer and enquiry
          </h3>
          <p className="mt-1 text-caption text-muted-readable">
            Contact remains masked until an authorized user explicitly reveals
            it.
          </p>
        </div>
        <dl className="grid auto-rows-fr gap-3 sm:grid-cols-2">
          <DetailItem label="Customer">
            {lead.customer.name ?? "Unnamed customer"}
          </DetailItem>
          <DetailItem label="Mobile number">
            <ContactValue
              lead={lead}
              canRead={capabilities.canReadCustomerContact}
            />
          </DetailItem>
          <DetailItem label="Lead type">
            {titleCaseDashboardToken(lead.leadType)}
          </DetailItem>
          <DetailItem label="Source">
            {lead.source.name} · {lead.source.code}
          </DetailItem>
          <DetailItem label="Location">
            {location.length > 0 ? location : "Not available"}
          </DetailItem>
          <DetailItem label="Coordinates">
            {lead.location.latitude === null || lead.location.longitude === null
              ? "Not available"
              : `${String(lead.location.latitude)}, ${String(lead.location.longitude)}`}
          </DetailItem>
          <DetailItem label="Lead number">{lead.leadNo}</DetailItem>
          <DetailItem label="Location readiness">
            <Badge
              variant={
                lead.location.latitude !== null &&
                lead.location.longitude !== null
                  ? "success"
                  : "warning"
              }
            >
              {lead.location.latitude !== null &&
              lead.location.longitude !== null
                ? "Ready for routing"
                : "Location required"}
            </Badge>
          </DetailItem>
        </dl>
      </section>

      <section
        className="grid h-full grid-rows-[auto_1fr] gap-3"
        aria-labelledby="lead-operations-title"
      >
        <div>
          <h3 id="lead-operations-title" className="text-card-title">
            Assignment and service health
          </h3>
          <p className="mt-1 text-caption text-muted-readable">
            Current owner, SLA, follow-up, and outcome evidence.
          </p>
        </div>
        <dl className="grid auto-rows-fr gap-3 sm:grid-cols-2">
          <DetailItem label="Assigned dealer">
            {lead.dealer === null
              ? "Unassigned"
              : `${lead.dealer.name} · ${lead.dealer.code}`}
          </DetailItem>
          <DetailItem label="Assignment time">
            {formatDashboardDateTime(lead.ownerAssignedAt)}
          </DetailItem>
          <DetailItem label="Response SLA">
            <Badge
              variant={
                lead.responseSlaState === "WITHIN_SLA"
                  ? "success"
                  : lead.responseSlaState === "BREACHED"
                    ? "destructive"
                    : lead.responseSlaState === "PENDING"
                      ? "warning"
                      : "outline"
              }
            >
              {titleCaseDashboardToken(lead.responseSlaState)}
            </Badge>
          </DetailItem>
          <DetailItem label="First response">
            {formatDashboardDateTime(lead.firstResponseAt)}
          </DetailItem>
          <DetailItem label="Follow-up">
            <Badge
              variant={
                lead.followUpState === "OVERDUE"
                  ? "destructive"
                  : lead.followUpState === "DUE_TODAY"
                    ? "warning"
                    : lead.followUpState === "SCHEDULED"
                      ? "info"
                      : lead.followUpState === "CLOSED"
                        ? "success"
                        : "outline"
              }
            >
              {titleCaseDashboardToken(lead.followUpState)}
            </Badge>
          </DetailItem>
          <DetailItem label="Next follow-up">
            {formatDashboardDateTime(lead.nextFollowUpAt)}
          </DetailItem>
          <DetailItem label="Booked">
            {formatDashboardDateTime(lead.bookedAt)}
          </DetailItem>
          <DetailItem label="Converted">
            {formatDashboardDateTime(lead.convertedAt)}
          </DetailItem>
        </dl>
      </section>

      <section className="xl:col-span-2" aria-labelledby="lead-audit-title">
        <h3 id="lead-audit-title" className="sr-only">
          Lead audit metadata
        </h3>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="Created">
            {formatDashboardDateTime(lead.createdAt)}
          </DetailItem>
          <DetailItem label="Last activity">
            {formatDashboardDateTime(lead.lastActivityAt)}
          </DetailItem>
          <DetailItem label="Last record update">
            {formatDashboardDateTime(lead.updatedAt)}
          </DetailItem>
          <DetailItem label="Record version">{lead.rowVersion}</DetailItem>
        </dl>
      </section>
    </div>
  );
}

function LeadFlow({
  lead,
}: Readonly<{ lead: EngagementLeadDetail }>): React.ReactElement {
  const stages = flowStages(lead);
  const actions = lifecycleActions(lead);
  const completeCount = stages.filter(
    (stage) => stage.state === "COMPLETE",
  ).length;
  const blockedActionCount = actions.filter(
    (action) => action.state === "BLOCKED",
  ).length;

  return (
    <section className="grid gap-5" aria-labelledby="lead-flow-title">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="lead-flow-title" className="text-card-title">
              Vehicle-sales lifecycle
            </h3>
            <p className="mt-1 text-caption text-muted-readable">
              Evidence-based completion, blockers, and downstream steps.
            </p>
          </div>
          <Badge variant="secondary">
            {completeCount} of {stages.length} completed
          </Badge>
        </div>
        <Progress
          value={(completeCount / stages.length) * 100}
          aria-label={`${String(completeCount)} of ${String(stages.length)} lifecycle stages completed`}
        />
      </div>

      <div className="grid gap-3" aria-labelledby="lead-action-flow-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4 id="lead-action-flow-title" className="font-medium">
              Complete action flow
            </h4>
            <p className="mt-1 text-caption text-muted-readable">
              Recorded calls, system events, WhatsApp delivery states, and
              evidence-based readiness checks in operational order.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {lead.journey.items.length} recorded
            </Badge>
            <Badge variant={blockedActionCount > 0 ? "warning" : "success"}>
              {blockedActionCount} need action
            </Badge>
          </div>
        </div>

        {lead.journey.truncated ? (
          <div className="flex items-start gap-2 rounded-xl border border-warning/35 bg-warning/10 p-3 text-body-sm">
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-warning-foreground dark:text-warning"
            />
            <p>
              Showing the newest 200 recorded actions. Older evidence remains
              available in the source audit store.
            </p>
          </div>
        ) : null}

        {JOURNEY_PHASES.map((phase, phaseIndex) => {
          const phaseActions = actions
            .filter((action) => action.phase === phase.code)
            .toSorted((left, right) => {
              if (left.occurredAt === null) return 1;
              if (right.occurredAt === null) return -1;
              return left.occurredAt.localeCompare(right.occurredAt);
            });
          const phaseBlocked = phaseActions.filter(
            (action) => action.state === "BLOCKED",
          ).length;
          const phaseCurrent = phaseActions.filter(
            (action) => action.state === "CURRENT",
          ).length;

          return (
            <section
              key={phase.code}
              className="overflow-hidden rounded-2xl border border-border/70 bg-card/40"
              aria-labelledby={`lead-phase-${phase.code.toLocaleLowerCase("en-US")}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/65 bg-muted/30 px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Badge
                    variant="outline"
                    className="size-7 shrink-0 rounded-full px-0"
                  >
                    {phaseIndex + 1}
                  </Badge>
                  <div className="min-w-0">
                    <h5
                      id={`lead-phase-${phase.code.toLocaleLowerCase("en-US")}`}
                      className="font-medium"
                    >
                      {phase.label}
                    </h5>
                    <p className="mt-0.5 text-caption text-muted-readable">
                      {phase.description}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    phaseBlocked > 0
                      ? "warning"
                      : phaseCurrent > 0
                        ? "info"
                        : "success"
                  }
                >
                  {phaseBlocked > 0
                    ? `${String(phaseBlocked)} need action`
                    : phaseCurrent > 0
                      ? `${String(phaseCurrent)} in progress`
                      : "On track"}
                </Badge>
              </div>

              <ol className="divide-y divide-border/60">
                {phaseActions.map((action) => {
                  const meta = FLOW_STATE_META[action.state];
                  return (
                    <li
                      key={action.id}
                      className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 p-4 [contain-intrinsic-size:auto_6rem] [content-visibility:auto]"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-10 items-center justify-center rounded-xl border bg-card [&_svg]:size-4",
                          action.state === "COMPLETE" &&
                            "border-success/30 bg-success/10 text-success",
                          action.state === "CURRENT" &&
                            "border-info/30 bg-info/10 text-info",
                          action.state === "BLOCKED" &&
                            "border-warning/35 bg-warning/10 text-warning-foreground dark:text-warning",
                          action.state === "UPCOMING" &&
                            "border-border text-muted-readable",
                        )}
                      >
                        {journeyIcon(action)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">
                              {action.title}
                            </p>
                            <p className="mt-1 text-body-sm text-muted-readable">
                              {action.description}
                            </p>
                          </div>
                          <Badge variant={meta.badge}>
                            {action.statusLabel}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-caption text-muted-readable">
                          {action.occurredAt !== null ? (
                            <time
                              dateTime={action.occurredAt}
                              className="inline-flex items-center gap-1.5"
                            >
                              <Clock3 aria-hidden="true" className="size-3.5" />
                              {formatDashboardDateTime(action.occurredAt)}
                            </time>
                          ) : null}
                          {action.channel !== null ? (
                            <Badge variant="outline">
                              {titleCaseDashboardToken(action.channel)}
                            </Badge>
                          ) : null}
                          {action.actorLabel !== null ? (
                            <span>{action.actorLabel}</span>
                          ) : null}
                          {action.derived ? (
                            <Badge variant="secondary">Readiness check</Badge>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      <div className="grid gap-3" aria-labelledby="lead-stage-readiness-title">
        <div>
          <h4 id="lead-stage-readiness-title" className="font-medium">
            Stage readiness
          </h4>
          <p className="mt-1 text-caption text-muted-readable">
            High-level progression retained for funnel and SLA analysis.
          </p>
        </div>
        <ol className="grid gap-0">
          {stages.map((stage, index) => {
            const meta = FLOW_STATE_META[stage.state];
            const Icon = meta.icon;
            return (
              <li
                key={stage.code}
                className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 pb-4 last:pb-0"
              >
                {index < stages.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-10 bottom-0 left-[1.21875rem] w-px",
                      stage.state === "COMPLETE"
                        ? "bg-success/45"
                        : "bg-border",
                    )}
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative z-10 flex size-10 items-center justify-center rounded-xl border bg-card [&_svg]:size-4",
                    stage.state === "COMPLETE" &&
                      "border-success/30 bg-success/10 text-success",
                    stage.state === "CURRENT" &&
                      "border-info/30 bg-info/10 text-info",
                    stage.state === "BLOCKED" &&
                      "border-warning/35 bg-warning/10 text-warning-foreground dark:text-warning",
                    stage.state === "UPCOMING" &&
                      "border-border text-muted-readable",
                  )}
                >
                  <Icon />
                </span>
                <div className="min-w-0 rounded-2xl border border-border/70 bg-card/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {index + 1}. {stage.label}
                      </p>
                      <p className="mt-1 text-body-sm text-muted-readable">
                        {stage.reason}
                      </p>
                    </div>
                    <Badge variant={meta.badge}>{meta.label}</Badge>
                  </div>
                  {stage.occurredAt !== null ? (
                    <p className="mt-3 flex items-center gap-1.5 text-caption text-muted-readable">
                      <Clock3 aria-hidden="true" className="size-3.5" />
                      {formatDashboardDateTime(stage.occurredAt)}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function LeadActivity({
  lead,
}: Readonly<{ lead: EngagementLeadDetail }>): React.ReactElement {
  if (lead.journey.items.length === 0) {
    return (
      <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed p-6 text-center">
        <div>
          <Activity
            aria-hidden="true"
            className="mx-auto size-8 text-muted-readable"
          />
          <h3 className="mt-3 text-card-title">No activity returned</h3>
          <p className="mt-1 text-body-sm text-muted-readable">
            The lead record exists, but no calls, communications, or auditable
            workflow events are available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="grid gap-4" aria-labelledby="lead-activity-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 id="lead-activity-title" className="text-card-title">
            Complete activity timeline
          </h3>
          <p className="mt-1 text-caption text-muted-readable">
            Newest activity first across calls, lifecycle events, and outbound
            communications. Only approved, bounded fields are displayed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{lead.journey.items.length} actions</Badge>
          {lead.journey.truncated ? (
            <Badge variant="warning">Newest 200 shown</Badge>
          ) : null}
        </div>
      </div>
      <ol className="grid gap-3">
        {lead.journey.items.map((item) => {
          const state = journeyState(item);
          const meta = FLOW_STATE_META[state];
          return (
            <li
              key={item.id}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 rounded-2xl border border-border/70 bg-card/60 p-4 [contain-intrinsic-size:auto_6rem] [content-visibility:auto]"
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl border bg-muted/55 [&_svg]:size-4",
                  state === "COMPLETE" &&
                    "border-success/30 bg-success/10 text-success",
                  state === "CURRENT" && "border-info/30 bg-info/10 text-info",
                  state === "BLOCKED" &&
                    "border-warning/35 bg-warning/10 text-warning-foreground dark:text-warning",
                )}
              >
                {journeyIcon({
                  kind: item.kind,
                  phase: journeyPhase(item, lead),
                })}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <time
                    dateTime={item.occurredAt}
                    className="text-caption text-muted-readable"
                  >
                    {formatDashboardDateTime(item.occurredAt)}
                  </time>
                </div>
                <p className="mt-1 text-body-sm text-muted-readable">
                  {item.description ?? "Auditable workflow evidence recorded."}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {titleCaseDashboardToken(item.kind)}
                  </Badge>
                  {item.status !== null ? (
                    <Badge variant={meta.badge}>{item.status}</Badge>
                  ) : null}
                  {item.channel !== null ? (
                    <Badge variant="secondary">
                      {titleCaseDashboardToken(item.channel)}
                    </Badge>
                  ) : null}
                  <span className="text-caption text-muted-readable">
                    {item.actorLabel ?? "System"}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function DialogLoading(): React.ReactElement {
  return (
    <div
      className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]"
      aria-busy="true"
      aria-label="Loading lead details"
    >
      <div className="border-b border-border/70 px-5 py-2 sm:px-6">
        <Skeleton className="h-10 w-full max-w-xl rounded-2xl" />
      </div>
      <div className="grid gap-5 overflow-hidden p-5 sm:p-6 xl:grid-cols-2">
        {[0, 1].map((section) => (
          <section
            key={section}
            className="grid content-start gap-3"
            aria-hidden="true"
          >
            <div className="grid gap-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full max-w-sm" />
            </div>
            <div className="grid auto-rows-fr gap-3 sm:grid-cols-2">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="h-24 rounded-xl sm:h-28" />
              ))}
            </div>
          </section>
        ))}
        <div
          className="grid gap-3 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-4"
          aria-hidden="true"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function EngagementLeadDialog({
  lead: listLead,
  capabilities,
  open,
  onOpenChange,
}: EngagementLeadDialogProps): React.ReactElement {
  const toast = useToast();
  const [loadedLead, setLoadedLead] = React.useState<LoadedLeadResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [isActionPending, startActionTransition] = React.useTransition();
  const [privilegedAction, setPrivilegedAction] =
    React.useState<PrivilegedAction | null>(null);
  const [reason, setReason] = React.useState("");
  const requestSequence = React.useRef(0);
  const leadId = listLead?.leadId ?? null;

  const loadLead = React.useCallback(async (): Promise<void> => {
    if (leadId === null) return;
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setIsLoading(true);
    try {
      const nextResult = await readEngagementLeadDetailAction({ leadId });
      if (sequence === requestSequence.current) {
        setLoadedLead({ leadId, result: nextResult });
      }
    } finally {
      if (sequence === requestSequence.current) {
        setIsLoading(false);
      }
    }
  }, [leadId]);

  function openAction(action: PrivilegedAction): void {
    setReason("");
    setPrivilegedAction(action);
  }

  function performPrivilegedAction(): void {
    if (listLead === null || reason.trim().length < 5) return;

    startActionTransition(async () => {
      if (privilegedAction === "ADMIN_SESSION") {
        const session = await createEngagementLeadAdminSessionAction({
          values: { leadId: listLead.leadId, reason },
        });
        if (!session.ok) {
          toast.error({
            title: "Update workspace could not be opened",
            description:
              session.requestId === undefined
                ? session.message
                : `${session.message} Reference: ${session.requestId}`,
          });
          return;
        }

        toast.success({
          title: "Secure update workspace created",
          description: session.canForward
            ? "Lead updates and routing are available for 15 minutes."
            : "Lead updates are available for 15 minutes.",
        });
        setPrivilegedAction(null);
        window.location.assign(session.href);
        return;
      }

      if (privilegedAction === "REASSIGN") {
        const reassignment = await reassignEngagementLeadAction({
          values: {
            resourceId: listLead.leadId,
            reason,
            idempotencyKey: `engagement:${crypto.randomUUID()}`,
          },
        });
        if (!reassignment.ok) {
          toast.error({
            title: "Lead reassignment failed",
            description:
              reassignment.requestId === undefined
                ? reassignment.message
                : `${reassignment.message} Reference: ${reassignment.requestId}`,
          });
          return;
        }

        toast.success({ title: reassignment.message });
        setPrivilegedAction(null);
        await loadLead();
      }
    });
  }

  const result =
    leadId !== null && loadedLead?.leadId === leadId ? loadedLead.result : null;
  const detail = result?.ok === true ? result.lead : null;
  const title = listLead === null ? "Lead details" : `Lead ${listLead.leadNo}`;
  const closed = detail?.closedAt !== null && detail?.closedAt !== undefined;
  const assigned = detail?.dealer !== null && detail?.dealer !== undefined;
  const canOpenAdminSession =
    capabilities.canUpdateLeads && detail !== null && !closed && assigned;
  const canReassign =
    capabilities.canReassignLead && detail !== null && !closed;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            requestSequence.current += 1;
          }
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent
          height="viewport"
          className="sm:max-w-6xl"
          onOpenAutoFocus={() => {
            void loadLead();
          }}
        >
          <DialogHeader className="gap-4 bg-card/75">
            <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Vehicle sales</Badge>
                  {detail !== null ? (
                    <>
                      <Badge variant="outline">
                        {titleCaseDashboardToken(detail.status)}
                      </Badge>
                      <Badge
                        variant={
                          detail.responseSlaState === "BREACHED"
                            ? "destructive"
                            : detail.responseSlaState === "WITHIN_SLA"
                              ? "success"
                              : "warning"
                        }
                      >
                        {titleCaseDashboardToken(detail.responseSlaState)}
                      </Badge>
                    </>
                  ) : null}
                </div>
                <DialogTitle>{title}</DialogTitle>
              </div>

              <div
                className="flex min-w-0 flex-wrap items-center gap-2"
                aria-label="Lead administration controls"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={!canOpenAdminSession ? 0 : undefined}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!canOpenAdminSession || isActionPending}
                        onClick={() => {
                          openAction("ADMIN_SESSION");
                        }}
                      >
                        <Route aria-hidden="true" />
                        Update / forward
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!capabilities.canUpdateLeads
                      ? "Requires engagement and CRM lead-update permissions."
                      : closed
                        ? "Closed leads cannot be changed."
                        : !assigned
                          ? "Assign the lead before opening the dealer update workflow."
                          : "Edit lead details, schedule follow-up, forward to a dealer, or change flow in a short-lived audited workspace."}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={!canReassign ? 0 : undefined}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!canReassign || isActionPending}
                        onClick={() => {
                          openAction("REASSIGN");
                        }}
                      >
                        <ArrowRightLeft aria-hidden="true" />
                        Reassign
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Re-run nearest eligible dealer assignment. A reason is
                    required and the action is audited.
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Refresh lead details"
                      disabled={listLead === null || isLoading}
                      onClick={() => void loadLead()}
                    >
                      <RefreshCw
                        aria-hidden="true"
                        className={cn(isLoading && "animate-spin")}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh lead details</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </DialogHeader>

          <DialogBody className="p-0">
            {isLoading && result === null ? (
              <DialogLoading />
            ) : result === null ? (
              <DialogLoading />
            ) : !result.ok ? (
              <div className="grid place-items-center p-6 text-center">
                <div className="max-w-lg">
                  <CircleAlert
                    aria-hidden="true"
                    className="mx-auto size-10 text-destructive"
                  />
                  <h3 className="mt-4 text-card-title">
                    Lead details are unavailable
                  </h3>
                  <p className="mt-2 text-body-sm text-muted-readable">
                    {actionFailureDescription(result)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5"
                    onClick={() => void loadLead()}
                  >
                    <RefreshCw aria-hidden="true" />
                    Try again
                  </Button>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="overview" className="grid gap-0">
                <div className="border-b border-border/70 px-5 py-2 sm:px-6">
                  <TabsList className="grid h-auto w-full max-w-xl grid-cols-3">
                    <TabsTrigger value="overview">
                      <UserRound aria-hidden="true" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="flow">
                      <ShieldCheck aria-hidden="true" />
                      Lifecycle
                    </TabsTrigger>
                    <TabsTrigger value="activity">
                      <Activity aria-hidden="true" />
                      Activity
                      <Badge variant="outline" className="ms-1">
                        {result.lead.journey.items.length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="overview" className="m-0 p-5 sm:p-6">
                  <LeadOverview
                    lead={result.lead}
                    capabilities={capabilities}
                  />
                </TabsContent>
                <TabsContent value="flow" className="m-0 p-5 sm:p-6">
                  <LeadFlow lead={result.lead} />
                </TabsContent>
                <TabsContent value="activity" className="m-0 p-5 sm:p-6">
                  <LeadActivity lead={result.lead} />
                </TabsContent>
              </Tabs>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={privilegedAction !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isActionPending) setPrivilegedAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              {privilegedAction === "ADMIN_SESSION" ? (
                <Route aria-hidden="true" />
              ) : (
                <ArrowRightLeft aria-hidden="true" />
              )}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {privilegedAction === "ADMIN_SESSION"
                ? "Open lead update workspace?"
                : "Reassign this lead?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {privilegedAction === "ADMIN_SESSION"
                ? "A 15-minute audited session will reuse the dealer update and routing workflow. The session remains bound to the currently assigned dealer."
                : "Nearest-dealer assignment will run again using current location, eligibility, capacity, and distance rules."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-2">
            <label
              htmlFor="lead-action-reason"
              className="text-body-sm font-medium"
            >
              Reason
            </label>
            <Textarea
              id="lead-action-reason"
              value={reason}
              maxLength={500}
              placeholder="Explain why this administrative action is required."
              onChange={(event) => {
                setReason(event.currentTarget.value);
              }}
            />
            <p className="text-caption text-muted-readable">
              Minimum 5 characters · {reason.length}/500
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={reason.trim().length < 5 || isActionPending}
              onClick={performPrivilegedAction}
            >
              {isActionPending ? (
                <RefreshCw aria-hidden="true" className="animate-spin" />
              ) : privilegedAction === "ADMIN_SESSION" ? (
                <ExternalLink aria-hidden="true" />
              ) : (
                <ArrowRightLeft aria-hidden="true" />
              )}
              {privilegedAction === "ADMIN_SESSION"
                ? "Open workspace"
                : "Reassign lead"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

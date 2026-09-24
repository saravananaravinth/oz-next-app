// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-lead-dialog.tsx
"use client";

import * as React from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  CalendarClock,
  Check,
  Circle,
  CircleAlert,
  Clock3,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Route,
  ShoppingCart,
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
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
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
type LeadView = "SUMMARY" | "ACTIVITY";
type FlowState = "COMPLETE" | "CURRENT" | "BLOCKED" | "UPCOMING";
type FlowStage = Readonly<{
  code:
    "RECEIVED" | "LOCATION" | "ASSIGNED" | "CONTACTED" | "BOOKED" | "CONVERTED";
  label: string;
  state: FlowState;
  occurredAt: string | null;
  reason: string;
}>;
type JourneyItem = EngagementLeadDetail["journey"]["items"][number];
type ActivityFilter =
  | "ALL"
  | "CALLS"
  | "MESSAGES"
  | "DEALER"
  | "ROUTING"
  | "FOLLOW_UPS"
  | "OUTCOME";

type ActivityGroup = Readonly<{
  key: string;
  label: string;
  items: readonly JourneyItem[];
}>;

const LATEST_ACTIVITY_LIMIT = 5;

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
    icon: Clock3,
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

const ACTIVITY_FILTERS = [
  ["ALL", "All"],
  ["CALLS", "Calls"],
  ["MESSAGES", "Messages"],
  ["DEALER", "Dealer"],
  ["ROUTING", "Routing"],
  ["FOLLOW_UPS", "Follow-ups"],
  ["OUTCOME", "Outcome"],
] as const satisfies ReadonlyArray<readonly [ActivityFilter, string]>;

function actionFailureDescription(
  result: Extract<ReadEngagementLeadDetailActionResult, { ok: false }>,
): string {
  return result.requestId === undefined
    ? result.message
    : `${result.message} Reference: ${result.requestId}`;
}

function displaySource(lead: EngagementLeadDetail): string {
  return /telecmi|incoming.?call|phone/iu.test(
    `${lead.source.code} ${lead.source.name}`,
  )
    ? "Incoming Call"
    : lead.source.name;
}

function leadInitials(name: string | null): string {
  if (name === null) return "NC";
  const parts = name
    .trim()
    .split(/\s+/u)
    .filter((part) => part.length > 0)
    .slice(0, 2);
  if (parts.length === 0) return "NC";
  return parts
    .map((part) => part[0]?.toLocaleUpperCase("en-US") ?? "")
    .join("");
}

function locationLabel(lead: EngagementLeadDetail): string {
  const location = [
    lead.location.city,
    lead.location.district,
    lead.location.state,
    lead.location.postalCode,
  ]
    .filter((value): value is string => value !== null && value.length > 0)
    .join(" · ");

  return location.length > 0 ? location : "Location unavailable";
}

function locationReady(lead: EngagementLeadDetail): boolean {
  return lead.location.latitude !== null && lead.location.longitude !== null;
}

function latestDealerStatus(lead: EngagementLeadDetail): string | null {
  for (const item of lead.journey.items) {
    if (item.kind !== "FOLLOW_UP" && item.kind !== "STATUS") continue;
    if (item.status !== null && item.status.trim().length > 0) {
      return item.status;
    }
  }
  return null;
}

function flowStages(lead: EngagementLeadDetail): readonly FlowStage[] {
  const hasLocation = locationReady(lead);
  const assignmentComplete =
    lead.ownerAssignedAt !== null && lead.dealer !== null;
  const contactComplete = lead.firstResponseAt !== null;
  const bookingComplete = lead.bookedAt !== null;
  const conversionComplete = lead.convertedAt !== null;
  const closedWithoutConversion = lead.closedAt !== null && !conversionComplete;
  const dealerStatus = latestDealerStatus(lead);

  return [
    {
      code: "RECEIVED",
      label: "Enquiry received",
      state: "COMPLETE",
      occurredAt: lead.createdAt,
      reason: `Created from ${displaySource(lead)}.`,
    },
    {
      code: "LOCATION",
      label: "Location",
      state: hasLocation
        ? "COMPLETE"
        : closedWithoutConversion
          ? "BLOCKED"
          : "CURRENT",
      occurredAt: hasLocation ? lead.updatedAt : null,
      reason: hasLocation
        ? `Customer location is available for ${locationLabel(lead)}.`
        : closedWithoutConversion
          ? "The lead closed without usable customer coordinates."
          : "Customer coordinates are still required for precise routing.",
    },
    {
      code: "ASSIGNED",
      label: "Dealer assigned",
      state: assignmentComplete
        ? "COMPLETE"
        : closedWithoutConversion
          ? "BLOCKED"
          : hasLocation
            ? "CURRENT"
            : "UPCOMING",
      occurredAt: lead.ownerAssignedAt,
      reason: assignmentComplete
        ? `Assigned to ${lead.dealer?.name ?? "the selected dealer"}.`
        : closedWithoutConversion
          ? "The lead closed before a dealer assignment was recorded."
          : hasLocation
            ? "Customer location is ready; dealer assignment is pending."
            : "Dealer routing starts after customer location is available.",
    },
    {
      code: "CONTACTED",
      label: "Contacted",
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
          ? "The lead closed before a customer response was recorded."
          : !assignmentComplete
            ? "Customer contact starts after dealer assignment."
            : lead.responseSlaState === "BREACHED"
              ? "The response SLA expired before a dealer response was recorded."
              : "Waiting for the assigned dealer to record the first response.",
    },
    {
      code: "BOOKED",
      label: "Booked",
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
          ? "The lead closed without a booking."
          : dealerStatus === "NOT_INTERESTED"
            ? "The latest dealer response marks the customer as not interested."
            : !contactComplete
              ? "Booking begins after first customer contact."
              : "Customer contact exists; a booking is not yet confirmed.",
    },
    {
      code: "CONVERTED",
      label: "Converted",
      state: conversionComplete
        ? "COMPLETE"
        : closedWithoutConversion
          ? "BLOCKED"
          : !bookingComplete
            ? "UPCOMING"
            : "CURRENT",
      occurredAt: lead.convertedAt,
      reason: conversionComplete
        ? "Verified conversion evidence is linked to this lead."
        : closedWithoutConversion
          ? "The lead closed without a verified conversion."
          : !bookingComplete
            ? "Conversion begins after booking confirmation."
            : "Booking is complete; conversion evidence is pending.",
    },
  ];
}

function responseSlaVariant(
  state: EngagementLeadDetail["responseSlaState"],
): BadgeProps["variant"] {
  if (state === "WITHIN_SLA") return "success";
  if (state === "BREACHED") return "destructive";
  if (state === "PENDING") return "warning";
  return "outline";
}

function followUpVariant(
  state: EngagementLeadDetail["followUpState"],
): BadgeProps["variant"] {
  if (state === "OVERDUE") return "destructive";
  if (state === "DUE_TODAY") return "warning";
  if (state === "SCHEDULED") return "info";
  if (state === "CLOSED") return "success";
  return "outline";
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

function journeyText(item: JourneyItem): string {
  return `${item.title} ${item.description ?? ""}`.toLocaleLowerCase("en-US");
}

function isOutcomeActivity(item: JourneyItem): boolean {
  const text = journeyText(item);
  return (
    text.includes("booking") ||
    text.includes("booked") ||
    text.includes("convert") ||
    text.includes("sale") ||
    text.includes("closed") ||
    item.kind === "STATUS"
  );
}

function activityMatchesFilter(
  item: JourneyItem,
  filter: ActivityFilter,
): boolean {
  if (filter === "ALL") return true;
  if (filter === "CALLS") return item.kind === "CALL";
  if (filter === "MESSAGES") return item.kind === "WHATSAPP";
  if (filter === "ROUTING") {
    return item.kind === "ASSIGNMENT" || item.kind === "ROUTING";
  }
  if (filter === "FOLLOW_UPS") {
    return item.kind === "FOLLOW_UP" || item.kind === "NOTE";
  }
  if (filter === "OUTCOME") return isOutcomeActivity(item);

  const actor = item.actorLabel?.toLocaleLowerCase("en-US") ?? "";
  const text = journeyText(item);
  return (
    actor.includes("dealer") ||
    text.includes("dealer opened") ||
    text.includes("dealer update") ||
    text.includes("dealer response")
  );
}

function journeyIcon(item: JourneyItem): React.ReactNode {
  const text = journeyText(item);
  if (text.includes("opened") && text.includes("link")) {
    return <Link2 aria-hidden="true" />;
  }
  if (item.kind === "WHATSAPP") {
    return <MessageCircle aria-hidden="true" />;
  }
  if (item.kind === "ASSIGNMENT" || item.kind === "ROUTING") {
    return <Building2 aria-hidden="true" />;
  }
  if (item.kind === "CALL") {
    return <Phone aria-hidden="true" />;
  }
  if (item.kind === "FOLLOW_UP" || item.kind === "NOTE") {
    return <CalendarClock aria-hidden="true" />;
  }
  if (isOutcomeActivity(item)) {
    return <ShoppingCart aria-hidden="true" />;
  }
  if (text.includes("location")) {
    return <MapPin aria-hidden="true" />;
  }
  return <Activity aria-hidden="true" />;
}

function activityDayKey(occurredAt: string): string {
  const date = new Date(occurredAt);
  if (!Number.isFinite(date.getTime())) return occurredAt.slice(0, 10);
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join("-");
}

function activityDayLabel(occurredAt: string): string {
  const date = new Date(occurredAt);
  if (!Number.isFinite(date.getTime())) return "Activity";
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function groupActivities(
  items: readonly JourneyItem[],
): readonly ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  for (const item of items) {
    const key = activityDayKey(item.occurredAt);
    const latest = groups.at(-1);
    if (latest?.key === key) {
      groups[groups.length - 1] = {
        ...latest,
        items: [...latest.items, item],
      };
      continue;
    }
    groups.push({
      key,
      label: activityDayLabel(item.occurredAt),
      items: [item],
    });
  }
  return groups;
}

function DetailItem({
  label,
  children,
}: Readonly<{
  label: string;
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <div className="min-w-0 border-b border-border/65 px-4 py-3.5 last:border-b-0 sm:border-b-0 sm:border-e sm:last:border-e-0">
      <dt className="text-overline text-muted-readable">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-body-sm font-medium text-foreground">
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

function LeadJourney({
  lead,
}: Readonly<{ lead: EngagementLeadDetail }>): React.ReactElement {
  const stages = flowStages(lead);
  const completed = stages.filter((stage) => stage.state === "COMPLETE").length;
  const progress = Math.round((completed / stages.length) * 100);

  return (
    <section
      className="border-y border-border/70 bg-muted/15 px-5 py-5 sm:px-6"
      aria-labelledby="lead-journey-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="lead-journey-title" className="text-card-title">
            Lead journey
          </h3>
          <p className="mt-1 text-caption text-muted-readable">
            Operational progress derived from authoritative lead and engagement
            evidence.
          </p>
        </div>
        <div className="text-end">
          <p className="text-body-sm font-medium text-foreground">
            {completed} of {stages.length} milestones complete
          </p>
          <p className="text-caption text-muted-readable">
            {progress}% complete
          </p>
        </div>
      </div>

      <Progress value={progress} className="mt-4" />

      <ol className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {stages.map((stage) => {
          const meta = FLOW_STATE_META[stage.state];
          const Icon = meta.icon;
          return (
            <li
              key={stage.code}
              className={cn(
                "min-w-0 rounded-xl border border-border/65 bg-card/75 p-3",
                stage.state === "CURRENT" && "border-info/35 bg-info/5",
                stage.state === "BLOCKED" && "border-warning/40 bg-warning/5",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-readable [&_svg]:size-3.5",
                    stage.state === "COMPLETE" &&
                      "border-success/30 bg-success/10 text-success",
                    stage.state === "CURRENT" &&
                      "border-info/30 bg-info/10 text-info",
                    stage.state === "BLOCKED" &&
                      "border-warning/35 bg-warning/10 text-warning-foreground dark:text-warning",
                  )}
                >
                  <Icon aria-hidden="true" />
                </span>
                <Badge variant={meta.badge} className="max-w-full truncate">
                  {meta.label}
                </Badge>
              </div>
              <p className="mt-2 text-caption font-medium text-foreground">
                {stage.label}
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="mt-1 line-clamp-2 cursor-help text-caption text-muted-readable">
                    {stage.reason}
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  {stage.reason}
                </TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function SummarySection({
  title,
  description,
  action,
  children,
}: Readonly<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <section className="px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-card-title">{title}</h3>
          {description === undefined ? null : (
            <p className="mt-1 text-caption text-muted-readable">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ActivityItem({
  item,
  compact = false,
}: Readonly<{
  item: JourneyItem;
  compact?: boolean;
}>): React.ReactElement {
  const state = journeyState(item);
  const meta = FLOW_STATE_META[state];

  return (
    <li
      className={cn(
        "relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3",
        !compact &&
          "pb-5 before:absolute before:top-10 before:bottom-0 before:left-[1.22rem] before:w-px before:bg-border/80 last:pb-0 last:before:hidden",
      )}
    >
      <span
        className={cn(
          "relative z-10 inline-flex size-10 items-center justify-center rounded-full border bg-card text-muted-readable [&_svg]:size-4",
          state === "COMPLETE" &&
            "border-success/30 bg-success/10 text-success",
          state === "CURRENT" && "border-info/30 bg-info/10 text-info",
          state === "BLOCKED" &&
            "border-warning/35 bg-warning/10 text-warning-foreground dark:text-warning",
        )}
      >
        {journeyIcon(item)}
      </span>
      <div
        className={cn(
          "min-w-0",
          compact && "rounded-xl border border-border/60 bg-card/55 p-3",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <p className="font-medium text-foreground">{item.title}</p>
          <time
            dateTime={item.occurredAt}
            className="shrink-0 text-caption text-muted-readable text-tabular"
          >
            {formatDashboardDateTime(item.occurredAt)}
          </time>
        </div>
        <p className="mt-1 text-body-sm text-muted-readable">
          {item.description ?? "Auditable workflow evidence recorded."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{titleCaseDashboardToken(item.kind)}</Badge>
          {item.status === null ? null : (
            <Badge variant={meta.badge}>{item.status}</Badge>
          )}
          {item.channel === null ? null : (
            <Badge variant="secondary">
              {titleCaseDashboardToken(item.channel)}
            </Badge>
          )}
          <span className="text-caption text-muted-readable">
            {item.actorLabel ?? "System"}
          </span>
        </div>
      </div>
    </li>
  );
}

function LatestActivity({
  lead,
  onViewAll,
}: Readonly<{
  lead: EngagementLeadDetail;
  onViewAll: () => void;
}>): React.ReactElement {
  const items = lead.journey.items.slice(0, LATEST_ACTIVITY_LIMIT);

  return (
    <SummarySection
      title="Latest activity"
      description="Most recent meaningful events across calls, messages, routing, dealer actions, and outcomes."
      action={
        <Button type="button" variant="ghost" size="sm" onClick={onViewAll}>
          <Activity aria-hidden="true" />
          View all activity
        </Button>
      }
    >
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-body-sm text-muted-readable">
          No activity evidence is available for this lead yet.
        </div>
      ) : (
        <ol className="grid gap-3">
          {items.map((item) => (
            <ActivityItem key={item.id} item={item} compact />
          ))}
        </ol>
      )}
      {lead.journey.truncated ? (
        <p className="mt-3 text-caption text-warning-foreground dark:text-warning">
          The activity feed is bounded to the newest 200 records.
        </p>
      ) : null}
    </SummarySection>
  );
}

function LeadSummary({
  lead,
  capabilities,
  onViewAllActivity,
}: Readonly<{
  lead: EngagementLeadDetail;
  capabilities: LeadDialogCapabilities;
  onViewAllActivity: () => void;
}>): React.ReactElement {
  return (
    <div className="divide-y divide-border/70">
      <LeadJourney lead={lead} />

      <SummarySection
        title="Current information"
        description="The fields operators need to understand ownership, urgency, and the next action."
      >
        <dl className="overflow-hidden rounded-xl border border-border/70 bg-card/55 sm:grid sm:grid-cols-3">
          <DetailItem label="Assigned dealer">
            {lead.dealer === null
              ? "Unassigned"
              : `${lead.dealer.name} · ${lead.dealer.code}`}
          </DetailItem>
          <DetailItem label="Customer location">
            {locationLabel(lead)}
          </DetailItem>
          <DetailItem label="Source">{displaySource(lead)}</DetailItem>
          <DetailItem label="Customer mobile">
            <ContactValue
              lead={lead}
              canRead={capabilities.canReadCustomerContact}
            />
          </DetailItem>
          <DetailItem label="Next follow-up">
            <div className="flex flex-wrap items-center gap-2">
              <span>{formatDashboardDateTime(lead.nextFollowUpAt)}</span>
              <Badge variant={followUpVariant(lead.followUpState)}>
                {titleCaseDashboardToken(lead.followUpState)}
              </Badge>
            </div>
          </DetailItem>
          <DetailItem label="Last activity">
            {formatDashboardDateTime(lead.lastActivityAt)}
          </DetailItem>
        </dl>
      </SummarySection>

      <SummarySection
        title="Service health"
        description="SLA and lifecycle evidence that may require operator attention."
      >
        <dl className="overflow-hidden rounded-xl border border-border/70 bg-card/55 sm:grid sm:grid-cols-3">
          <DetailItem label="Response SLA">
            <Badge variant={responseSlaVariant(lead.responseSlaState)}>
              {titleCaseDashboardToken(lead.responseSlaState)}
            </Badge>
          </DetailItem>
          <DetailItem label="First response">
            {formatDashboardDateTime(lead.firstResponseAt)}
          </DetailItem>
          <DetailItem label="Assignment time">
            {formatDashboardDateTime(lead.ownerAssignedAt)}
          </DetailItem>
          <DetailItem label="Booked">
            {formatDashboardDateTime(lead.bookedAt)}
          </DetailItem>
          <DetailItem label="Converted">
            {formatDashboardDateTime(lead.convertedAt)}
          </DetailItem>
          <DetailItem label="Lead created">
            {formatDashboardDateTime(lead.createdAt)}
          </DetailItem>
        </dl>
      </SummarySection>

      <LatestActivity lead={lead} onViewAll={onViewAllActivity} />
    </div>
  );
}

function LeadActivity({
  lead,
  onBack,
}: Readonly<{
  lead: EngagementLeadDetail;
  onBack: () => void;
}>): React.ReactElement {
  const [filter, setFilter] = React.useState<ActivityFilter>("ALL");
  const filteredItems = lead.journey.items.filter((item) =>
    activityMatchesFilter(item, filter),
  );
  const groups = groupActivities(filteredItems);

  return (
    <div className="min-h-0">
      <div className="sticky top-0 z-10 border-b border-border/70 bg-popover/95 px-5 py-4 backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Back to lead summary"
              onClick={onBack}
            >
              <ArrowLeft aria-hidden="true" />
            </Button>
            <div className="min-w-0">
              <h3 className="text-card-title">Activity history</h3>
              <p className="mt-1 text-caption text-muted-readable">
                {lead.leadNo} · newest activity first · approved audit fields
                only
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{lead.journey.items.length} actions</Badge>
            {lead.journey.truncated ? (
              <Badge variant="warning">Newest 200 shown</Badge>
            ) : null}
          </div>
        </div>

        <div
          className="mt-4 flex max-w-full gap-1.5 overflow-x-auto pb-1 scrollbar-compact"
          aria-label="Activity filters"
        >
          {ACTIVITY_FILTERS.map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="xs"
              variant={filter === value ? "secondary" : "ghost"}
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <Activity
              aria-hidden="true"
              className="mx-auto size-8 text-muted-readable"
            />
            <p className="mt-3 font-medium text-foreground">
              No activity matches this filter
            </p>
            <p className="mt-1 text-body-sm text-muted-readable">
              Choose another category to continue reviewing the lead history.
            </p>
          </div>
        ) : (
          <div className="grid gap-7">
            {groups.map((group) => (
              <section
                key={group.key}
                aria-labelledby={`activity-${group.key}`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <h4
                    id={`activity-${group.key}`}
                    className="shrink-0 text-overline text-muted-readable"
                  >
                    {group.label}
                  </h4>
                  <span
                    className="h-px flex-1 bg-border/70"
                    aria-hidden="true"
                  />
                </div>
                <ol>
                  {group.items.map((item) => (
                    <ActivityItem key={item.id} item={item} />
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DialogLoading(): React.ReactElement {
  return (
    <div
      className="grid gap-0"
      aria-busy="true"
      aria-label="Loading lead details"
    >
      <div className="border-b border-border/70 px-5 py-5 sm:px-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-2 w-full" />
        <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-36 rounded-xl" />
      </div>
      <div className="border-t border-border/70 px-5 py-5 sm:px-6">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 grid gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function LeadHeader({
  lead,
  title,
}: Readonly<{
  lead: EngagementLeadDetail | null;
  title: string;
}>): React.ReactElement {
  if (lead === null) {
    return (
      <div className="min-w-0">
        <Badge variant="secondary">Vehicle sales</Badge>
        <SheetTitle className="mt-2">{title}</SheetTitle>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-body-sm font-semibold text-primary"
        aria-hidden="true"
      >
        {leadInitials(lead.customer.name)}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Vehicle sales</Badge>
          <Badge variant="outline">
            {titleCaseDashboardToken(lead.status)}
          </Badge>
          <Badge variant={responseSlaVariant(lead.responseSlaState)}>
            {titleCaseDashboardToken(lead.responseSlaState)}
          </Badge>
        </div>
        <SheetTitle className="mt-2 truncate">
          {lead.customer.name ?? "New customer"}
        </SheetTitle>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-readable">
          <span className="text-tabular">{lead.leadNo}</span>
          <span aria-hidden="true">·</span>
          <span>{displaySource(lead)}</span>
          {lead.customer.contactMasked === null ? null : (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-tabular">
                {lead.customer.contactMasked}
              </span>
            </>
          )}
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
  const [view, setView] = React.useState<LeadView>("SUMMARY");
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
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            requestSequence.current += 1;
            setView("SUMMARY");
            setLoadedLead(null);
            setIsLoading(false);
            setReason("");
            setPrivilegedAction(null);
          }
          onOpenChange(nextOpen);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:w-[min(54rem,calc(100vw-1rem))] sm:max-w-none"
          onOpenAutoFocus={() => {
            void loadLead();
          }}
        >
          <SheetHeader className="sticky top-0 z-20 gap-4 border-b border-border/70 bg-popover/95 backdrop-blur">
            <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <LeadHeader lead={detail} title={title} />

              <div
                className="flex min-w-0 flex-wrap items-center gap-2"
                aria-label="Lead administration controls"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={!canOpenAdminSession ? 0 : undefined}>
                      <Button
                        type="button"
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
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading && result === null ? (
              <DialogLoading />
            ) : result === null ? (
              <DialogLoading />
            ) : !result.ok ? (
              <div className="grid min-h-80 place-items-center p-6 text-center">
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
            ) : view === "ACTIVITY" ? (
              <LeadActivity
                lead={result.lead}
                onBack={() => {
                  setView("SUMMARY");
                }}
              />
            ) : (
              <LeadSummary
                lead={result.lead}
                capabilities={capabilities}
                onViewAllActivity={() => {
                  setView("ACTIVITY");
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

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

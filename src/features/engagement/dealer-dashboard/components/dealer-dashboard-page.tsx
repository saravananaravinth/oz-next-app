import type { Route } from "next";
import type { ReactElement, ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock3,
  ContactRound,
  LocateFixed,
  MapPinOff,
  PauseCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentEmptyState,
  ContentGrid,
  ContentHeader,
  ContentList,
  ContentListItem,
  ContentMetricCard,
  ContentMetrics,
  ContentRoot,
  ContentSection,
  ContentStatus,
  ContentToolbar,
} from "@/components/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type {
  DealerDashboardAccess,
  DealerDashboardCapabilities,
} from "../access";
import type { DealerDashboardData } from "../server";
import type {
  DealerDashboardContext,
  DealerDashboardSearchParams,
  DealerEngagementDashboard,
  OwnerGuideSummary,
} from "../schemas";
import {
  OwnerGuideAssignmentBadge,
  OwnerGuideOnboardDialog,
  OwnerGuideRowActions,
} from "./dealer-dashboard-controls";
import {
  DashboardQuickRangeSelect,
  type DashboardQuickRangeOption,
  type DashboardQuickRangeValue,
} from "./dashboard-quick-range-select";
import { OwnerGuideIntroDialog } from "./owner-guide-intro-dialog";

const DASHBOARD_TITLE_ID = "dealer-dashboard-title";
const ASSIGNMENT_FUNNEL_TITLE_ID = "owner-guide-assignment-funnel-title";
const OWNER_GUIDE_TABLE_TITLE_ID = "owner-guide-preview-title";

const NUMBER_FORMAT = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});
const PERCENT_FORMAT = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 1,
});
const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const DATE_PARTS_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export type DealerDashboardPageProps = Readonly<{
  access: Extract<DealerDashboardAccess, { kind: "dealer" | "super_admin" }>;
  data: DealerDashboardData;
  query: Pick<DealerDashboardSearchParams, "from" | "to">;
}>;

type DashboardNotice = Readonly<{
  variant: "warning" | "destructive" | "info";
  title: string;
  description: string;
  icon: ReactNode;
}>;

type FunnelStep = Readonly<{
  label: string;
  value: number;
  help: string;
}>;

function count(value: number): string {
  return NUMBER_FORMAT.format(value);
}

function percentage(value: number): string {
  return `${PERCENT_FORMAT.format(value)}%`;
}

function formattedDate(value: string | null): string {
  if (value === null) {
    return "Not available";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Not available"
    : DATE_FORMAT.format(parsed);
}

function dateInputValue(value: Date): string {
  const parts = DATE_PARTS_FORMAT.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year !== undefined && month !== undefined && day !== undefined
    ? `${year}-${month}-${day}`
    : value.toISOString().slice(0, 10);
}

function queryHref(
  query: Pick<DealerDashboardSearchParams, "from" | "to">,
  context?: DealerDashboardContext,
): Route {
  const params = new URLSearchParams();
  if (query.from !== undefined) params.set("from", query.from);
  if (query.to !== undefined) params.set("to", query.to);
  if (context !== undefined) {
    params.set("tenantId", context.tenantId);
    params.set("dealerOrgUnitId", context.dealerOrgUnitId);
  }

  const queryString = params.toString();
  return queryString.length > 0 ? `/dashboard?${queryString}` : "/dashboard";
}

const QUICK_RANGE_DAYS = [7, 30, 90] as const;

type QuickRangeDays = (typeof QUICK_RANGE_DAYS)[number];

function presetRange(
  days: QuickRangeDays,
): Pick<DealerDashboardSearchParams, "from" | "to"> {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);

  return {
    from: dateInputValue(from),
    to: dateInputValue(to),
  };
}

function presetHref(
  days: QuickRangeDays,
  context: DealerDashboardContext | undefined,
): Route {
  return queryHref(presetRange(days), context);
}

function quickRangeValue(
  query: Pick<DealerDashboardSearchParams, "from" | "to">,
): DashboardQuickRangeValue {
  if (query.from === undefined && query.to === undefined) {
    return "all";
  }

  for (const days of QUICK_RANGE_DAYS) {
    const range = presetRange(days);

    if (query.from === range.from && query.to === range.to) {
      return String(days) as DashboardQuickRangeValue;
    }
  }

  return "custom";
}

function statusBadge(status: OwnerGuideSummary["status"]): ReactElement {
  if (status === "ACTIVE") {
    return <Badge>Active</Badge>;
  }

  if (status === "SUSPENDED") {
    return <Badge variant="destructive">Suspended</Badge>;
  }

  return <Badge variant="secondary">Inactive</Badge>;
}

function onboardingLabel(
  status: OwnerGuideSummary["onboardingStatus"],
): string {
  switch (status) {
    case "INVITED":
      return "Invited";
    case "APP_LOGIN_PENDING":
      return "Login pending";
    case "LOCATION_READY":
      return "Location ready";
    case "COMPLETED":
      return "Completed";
    default: {
      const exhaustiveStatus: never = status;
      return exhaustiveStatus;
    }
  }
}

function readinessBadge(ownerGuide: OwnerGuideSummary): ReactElement {
  if (
    ownerGuide.status === "ACTIVE" &&
    ownerGuide.assignmentEnabled &&
    ownerGuide.hasFreshLocation
  ) {
    return <Badge variant="outline">Ready</Badge>;
  }

  return <Badge variant="secondary">Needs attention</Badge>;
}

function operationalNotices(
  dashboard: DealerEngagementDashboard,
): readonly DashboardNotice[] {
  const notices: DashboardNotice[] = [];

  if (dashboard.ownerGuides.totalCount === 0) {
    notices.push({
      variant: "destructive",
      title: "No Owner Guides are onboarded",
      description:
        "Onboard the first Owner Guide before expecting automated lead matching.",
      icon: <UsersRound aria-hidden="true" className="size-4" />,
    });
  } else if (dashboard.ownerGuides.assignmentReadyCount === 0) {
    notices.push({
      variant: "warning",
      title: "No Owner Guide is ready for matching",
      description:
        "A ready guide needs an active profile, assignment enabled, and a fresh location.",
      icon: <UserRoundCheck aria-hidden="true" className="size-4" />,
    });
  }

  if (dashboard.ownerGuides.assignmentPausedCount > 0) {
    notices.push({
      variant: "info",
      title: `${count(dashboard.ownerGuides.assignmentPausedCount)} Owner Guide assignments are paused`,
      description:
        "Paused guides remain in the system but are excluded from new lead matching.",
      icon: <PauseCircle aria-hidden="true" className="size-4" />,
    });
  }

  if (dashboard.ownerGuides.staleLocationCount > 0) {
    notices.push({
      variant: "warning",
      title: `${count(dashboard.ownerGuides.staleLocationCount)} Owner Guide locations need attention`,
      description:
        "Stale or missing locations prevent accurate nearest-guide matching.",
      icon: <MapPinOff aria-hidden="true" className="size-4" />,
    });
  }

  const assignmentVolume =
    dashboard.ownerGuideAssignments.assignedCount +
    dashboard.ownerGuideAssignments.notifiedCount +
    dashboard.ownerGuideAssignments.acceptedCount +
    dashboard.ownerGuideAssignments.rejectedCount +
    dashboard.ownerGuideAssignments.visitedCount +
    dashboard.ownerGuideAssignments.testDriveCompletedCount +
    dashboard.ownerGuideAssignments.bookedCount +
    dashboard.ownerGuideAssignments.convertedCount;

  if (
    assignmentVolume >= 5 &&
    dashboard.ownerGuideAssignments.acceptanceRatePct < 40
  ) {
    notices.push({
      variant: "info",
      title: "Owner Guide acceptance is below 40%",
      description:
        "Review availability, location freshness, distance limits, and daily workload before adding more assignments.",
      icon: <Activity aria-hidden="true" className="size-4" />,
    });
  }

  return notices;
}

function funnelSteps(
  dashboard: DealerEngagementDashboard,
): readonly FunnelStep[] {
  const assignments = dashboard.ownerGuideAssignments;

  return [
    {
      label: "Assigned",
      value: assignments.assignedCount,
      help: "Assignment record created for an eligible Owner Guide.",
    },
    {
      label: "Notified",
      value: assignments.notifiedCount,
      help: "The Owner Guide notification was queued or delivered.",
    },
    {
      label: "Accepted",
      value: assignments.acceptedCount,
      help: "The Owner Guide accepted responsibility for the lead.",
    },
    {
      label: "Visited",
      value: assignments.visitedCount,
      help: "The customer visit was recorded.",
    },
    {
      label: "Test drive",
      value: assignments.testDriveCompletedCount,
      help: "The Owner Guide completed the test-drive milestone.",
    },
    {
      label: "Booked",
      value: assignments.bookedCount,
      help: "The lead reached the booking milestone.",
    },
    {
      label: "Converted",
      value: assignments.convertedCount,
      help: "The assignment was attributed to a completed conversion.",
    },
  ];
}

function MetricLabel({
  label,
  help,
}: Readonly<{ label: string; help: string }>): ReactElement {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex size-5 items-center justify-center rounded-full text-muted-readable outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            tabIndex={0}
            role="button"
            aria-label={`About ${label}`}
          >
            <CircleHelp aria-hidden="true" className="size-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent>{help}</TooltipContent>
      </Tooltip>
    </span>
  );
}

function DashboardDateFilter({
  query,
  context,
  includeContextInQuery,
}: Readonly<{
  query: Pick<DealerDashboardSearchParams, "from" | "to">;
  context: DealerDashboardContext;
  includeContextInQuery: boolean;
}>): ReactElement {
  const contextualQuery = includeContextInQuery ? context : undefined;
  const quickRangeOptions = [
    {
      value: "all",
      label: "All activity",
      href: queryHref({}, contextualQuery),
    },
    ...QUICK_RANGE_DAYS.map((days) => ({
      value: String(days) as "7" | "30" | "90",
      label: `Last ${String(days)} days`,
      href: presetHref(days, contextualQuery),
    })),
  ] satisfies readonly DashboardQuickRangeOption[];

  return (
    <ContentToolbar
      variant="ghost"
      align="start"
      className="mt-1 rounded-none border-x-0 border-b-0 border-t border-border/70 p-0 pt-5"
    >
      <div className="grid w-full min-w-0 gap-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/55 text-muted-readable">
              <CalendarDays aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-card-title text-foreground">
                  Activity period
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-readable outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
                      aria-label="About the dashboard activity period"
                    >
                      <CircleHelp aria-hidden="true" className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    The period filters lead and assignment activity. Owner Guide
                    capacity and readiness always show the current state.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-caption text-muted-readable">
                Review a custom period or choose a common reporting window.
              </p>
            </div>
          </div>

          <div className="grid w-full shrink-0 gap-1.5 sm:w-auto sm:justify-items-end">
            <DashboardQuickRangeSelect
              value={quickRangeValue(query)}
              options={quickRangeOptions}
            />
          </div>
        </div>

        <form method="get" className="w-full min-w-0">
          {includeContextInQuery ? (
            <>
              <input type="hidden" name="tenantId" value={context.tenantId} />
              <input
                type="hidden"
                name="dealerOrgUnitId"
                value={context.dealerOrgUnitId}
              />
            </>
          ) : null}

          <fieldset className="grid w-full min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,20rem)_minmax(12rem,20rem)_auto] xl:items-end">
            <legend className="sr-only">Custom dashboard date range</legend>

            <label
              className="grid min-w-0 gap-1.5 text-body-sm"
              htmlFor="dashboard-from-date"
            >
              <span className="text-muted-readable">From date</span>
              <Input
                id="dashboard-from-date"
                type="date"
                name="from"
                defaultValue={query.from ?? ""}
              />
            </label>

            <label
              className="grid min-w-0 gap-1.5 text-body-sm"
              htmlFor="dashboard-to-date"
            >
              <span className="text-muted-readable">To date</span>
              <Input
                id="dashboard-to-date"
                type="date"
                name="to"
                defaultValue={query.to ?? ""}
              />
            </label>

            <Button
              type="submit"
              variant="outline"
              className="w-full sm:col-span-2 xl:col-span-1 xl:w-auto"
            >
              <CalendarDays aria-hidden="true" className="size-4" />
              Apply dates
            </Button>
          </fieldset>
        </form>
      </div>
    </ContentToolbar>
  );
}

function DashboardActions({
  context,
  capabilities,
}: Readonly<{
  context: DealerDashboardContext;
  capabilities: DealerDashboardCapabilities;
}>): ReactElement {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <OwnerGuideIntroDialog />
      {capabilities.canManageOwnerGuides ? (
        <OwnerGuideOnboardDialog context={context} />
      ) : null}
    </div>
  );
}

function AssignmentFunnel({
  dashboard,
}: Readonly<{ dashboard: DealerEngagementDashboard }>): ReactElement {
  const steps = funnelSteps(dashboard);
  const maximum = Math.max(1, ...steps.map((step) => step.value));

  return (
    <ContentSection
      aria-labelledby={ASSIGNMENT_FUNNEL_TITLE_ID}
      title={
        <span id={ASSIGNMENT_FUNNEL_TITLE_ID}>
          Owner Guide assignment funnel
        </span>
      }
      description="Progress for assignments created in the selected activity range."
    >
      <div className="grid gap-4">
        {steps.map((step) => (
          <div key={step.label} className="grid gap-2">
            <div className="flex items-center justify-between gap-4 text-body-sm">
              <span className="inline-flex items-center gap-1 text-muted-readable">
                {step.label}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex size-5 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      tabIndex={0}
                      role="button"
                      aria-label={`About ${step.label}`}
                    >
                      <CircleHelp aria-hidden="true" className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{step.help}</TooltipContent>
                </Tooltip>
              </span>
              <span className="text-foreground text-tabular">
                {count(step.value)}
              </span>
            </div>
            <Progress
              value={(step.value / maximum) * 100}
              aria-label={`${step.label}: ${count(step.value)}`}
            />
          </div>
        ))}
      </div>

      <ContentDescriptionList columns="two" className="mt-5">
        <ContentDescriptionItem term="Acceptance rate" numeric>
          {percentage(dashboard.ownerGuideAssignments.acceptanceRatePct)}
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Visit rate" numeric>
          {percentage(dashboard.ownerGuideAssignments.visitRatePct)}
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Test-drive completion" numeric>
          {percentage(
            dashboard.ownerGuideAssignments.testDriveCompletionRatePct,
          )}
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Assignment conversion" numeric>
          {percentage(dashboard.ownerGuideAssignments.conversionRatePct)}
        </ContentDescriptionItem>
      </ContentDescriptionList>
    </ContentSection>
  );
}

function ReadinessSummary({
  dashboard,
}: Readonly<{ dashboard: DealerEngagementDashboard }>): ReactElement {
  const guides = dashboard.ownerGuides;

  return (
    <ContentSection
      title="Current matching readiness"
      description="The conditions used to determine whether an Owner Guide can receive a new lead."
    >
      <ContentDescriptionList columns="one">
        <ContentDescriptionItem term="Active profiles" numeric>
          {count(guides.activeCount)} of {count(guides.totalCount)}
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Assignment enabled" numeric>
          {count(guides.assignmentEnabledCount)}
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Fresh locations" numeric>
          {count(guides.freshLocationCount)}
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Fully ready" numeric>
          <span className="font-medium text-foreground">
            {count(guides.assignmentReadyCount)}
          </span>
        </ContentDescriptionItem>
      </ContentDescriptionList>

      <ContentStatus
        className="mt-5"
        role="note"
        variant={guides.assignmentReadyCount > 0 ? "success" : "warning"}
        icon={
          guides.assignmentReadyCount > 0 ? (
            <ShieldCheck aria-hidden="true" className="size-4" />
          ) : (
            <MapPinOff aria-hidden="true" className="size-4" />
          )
        }
        title={
          guides.assignmentReadyCount > 0
            ? "Matching has eligible Owner Guides"
            : "Matching has no ready Owner Guide"
        }
        description="Backend-configured location freshness, candidate count, templates, and application URL are intentionally not editable from the dealer dashboard."
      />
    </ContentSection>
  );
}

function OwnerGuidePreview({
  ownerGuides,
  context,
  capabilities,
}: Readonly<{
  ownerGuides: readonly OwnerGuideSummary[];
  context: DealerDashboardContext;
  capabilities: DealerDashboardCapabilities;
}>): ReactElement {
  if (ownerGuides.length === 0) {
    return (
      <ContentDataSurface
        title={<span id={OWNER_GUIDE_TABLE_TITLE_ID}>Owner Guides</span>}
        description="Manage the people who receive and progress dealer leads."
      >
        <ContentEmptyState
          className="min-h-72 border-0 bg-transparent py-12"
          icon={<UsersRound aria-hidden="true" />}
          title="Build your Owner Guide team"
          description="Onboard the first Owner Guide, then enable assignments and confirm a fresh location before lead matching begins."
          actions={
            capabilities.canManageOwnerGuides ? (
              <OwnerGuideOnboardDialog context={context} />
            ) : undefined
          }
        />
      </ContentDataSurface>
    );
  }

  return (
    <ContentDataSurface
      aria-labelledby={OWNER_GUIDE_TABLE_TITLE_ID}
      title={
        <span id={OWNER_GUIDE_TABLE_TITLE_ID}>Owner Guide operations</span>
      }
      description="Latest 12 dealer-scoped profiles. Assignment availability can be paused without deactivating the account."
      padded={false}
    >
      <div className="hidden min-w-0 overflow-auto scrollbar-stable lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner Guide</TableHead>
              <TableHead>Readiness</TableHead>
              <TableHead>Assignment</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Limits</TableHead>
              {capabilities.canManageOwnerGuides ? (
                <TableHead className="text-right">Actions</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ownerGuides.map((ownerGuide) => (
              <TableRow key={ownerGuide.ownerGuideId}>
                <TableCell>
                  <div className="grid gap-1">
                    <span className="font-medium text-foreground">
                      {ownerGuide.displayName}
                    </span>
                    <span className="text-caption text-muted-readable">
                      {ownerGuide.phoneMasked}
                    </span>
                    <span className="text-caption text-muted-readable">
                      {onboardingLabel(ownerGuide.onboardingStatus)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="grid justify-items-start gap-1.5">
                    {statusBadge(ownerGuide.status)}
                    {readinessBadge(ownerGuide)}
                  </div>
                </TableCell>
                <TableCell>
                  <OwnerGuideAssignmentBadge ownerGuide={ownerGuide} />
                </TableCell>
                <TableCell>
                  <div className="grid max-w-48 gap-0.5">
                    <span>{ownerGuide.vehicleModel ?? "Not configured"}</span>
                    <span className="truncate text-caption text-muted-readable">
                      {ownerGuide.vehicleVariant ?? "Variant not configured"}
                    </span>
                    <span className="truncate text-caption text-muted-readable">
                      Chassis: {ownerGuide.vehicleChassisNoMasked ?? "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="grid gap-1">
                    <Badge
                      variant={
                        ownerGuide.hasFreshLocation ? "outline" : "destructive"
                      }
                    >
                      {ownerGuide.hasFreshLocation ? "Fresh" : "Stale"}
                    </Badge>
                    <span className="text-caption text-muted-readable">
                      {formattedDate(ownerGuide.latestLocationCollectedAt)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-caption text-muted-readable">
                    {ownerGuide.maxAssignmentDistanceKm === null
                      ? "Backend distance"
                      : `${String(ownerGuide.maxAssignmentDistanceKm)} km`}
                    {ownerGuide.dailyAssignmentLimit === null
                      ? ""
                      : ` · ${String(ownerGuide.dailyAssignmentLimit)}/day`}
                  </span>
                </TableCell>
                {capabilities.canManageOwnerGuides ? (
                  <TableCell className="text-right">
                    <OwnerGuideRowActions
                      context={context}
                      ownerGuide={ownerGuide}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 lg:hidden">
        <ContentList density="compact">
          {ownerGuides.map((ownerGuide) => (
            <ContentListItem
              key={ownerGuide.ownerGuideId}
              media={<UserRoundCheck aria-hidden="true" className="size-5" />}
              title={ownerGuide.displayName}
              description={ownerGuide.phoneMasked}
              meta={
                <>
                  {statusBadge(ownerGuide.status)}
                  {readinessBadge(ownerGuide)}
                </>
              }
            >
              <div className="mt-3 grid gap-3">
                <div className="flex flex-wrap gap-2">
                  <OwnerGuideAssignmentBadge ownerGuide={ownerGuide} />
                  <Badge
                    variant={
                      ownerGuide.hasFreshLocation ? "outline" : "destructive"
                    }
                  >
                    {ownerGuide.hasFreshLocation
                      ? "Fresh location"
                      : "Location needed"}
                  </Badge>
                </div>
                <ContentDescriptionList columns="one">
                  <ContentDescriptionItem term="Onboarding">
                    {onboardingLabel(ownerGuide.onboardingStatus)}
                  </ContentDescriptionItem>
                  <ContentDescriptionItem term="Vehicle">
                    {ownerGuide.vehicleModel ?? "Not configured"}
                    {ownerGuide.vehicleVariant === null
                      ? ""
                      : ` · ${ownerGuide.vehicleVariant}`}
                  </ContentDescriptionItem>
                  <ContentDescriptionItem term="Masked chassis">
                    {ownerGuide.vehicleChassisNoMasked ?? "Not configured"}
                  </ContentDescriptionItem>
                  <ContentDescriptionItem term="Assignment limits">
                    {ownerGuide.maxAssignmentDistanceKm === null
                      ? "Backend distance"
                      : `${String(ownerGuide.maxAssignmentDistanceKm)} km`}
                    {ownerGuide.dailyAssignmentLimit === null
                      ? ""
                      : ` · ${String(ownerGuide.dailyAssignmentLimit)}/day`}
                  </ContentDescriptionItem>
                </ContentDescriptionList>
                {capabilities.canManageOwnerGuides ? (
                  <OwnerGuideRowActions
                    context={context}
                    ownerGuide={ownerGuide}
                    showLabels
                  />
                ) : null}
              </div>
            </ContentListItem>
          ))}
        </ContentList>
      </div>
    </ContentDataSurface>
  );
}

export function DealerDashboardPage({
  access,
  data,
  query,
}: DealerDashboardPageProps): ReactElement {
  const { dashboard, ownerGuides } = data;
  const notices = operationalNotices(dashboard);

  return (
    <ContentRoot width="full" aria-labelledby={DASHBOARD_TITLE_ID}>
      <ContentHeader
        variant="default"
        eyebrow={
          <Badge variant="secondary">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Dealer engagement
          </Badge>
        }
        title={<span id={DASHBOARD_TITLE_ID}>Dealer dashboard</span>}
        actions={
          <DashboardActions
            context={access.context}
            capabilities={access.capabilities}
          />
        }
      >
        <DashboardDateFilter
          query={query}
          context={access.context}
          includeContextInQuery={access.kind === "super_admin"}
        />
      </ContentHeader>

      <ContentSection
        title="Lead performance"
        description="Dealer lead activity for the selected date range."
      >
        <ContentMetrics>
          <ContentMetricCard
            label={
              <MetricLabel
                label="Assigned leads"
                help="Dealer-scoped leads created within the selected range."
              />
            }
            value={count(dashboard.leads.assignedCount)}
            description={`${count(dashboard.leads.openCount)} currently open`}
            icon={<ContactRound aria-hidden="true" className="size-4" />}
            tone="primary"
          />
          <ContentMetricCard
            label={
              <MetricLabel
                label="Bookings"
                help="Leads with the booking milestone recorded by the backend."
              />
            }
            value={count(dashboard.leads.bookedCount)}
            description={`${percentage(dashboard.leads.bookingRatePct)} booking rate`}
            icon={<BadgeCheck aria-hidden="true" className="size-4" />}
            tone="info"
          />
          <ContentMetricCard
            label={
              <MetricLabel
                label="Conversions"
                help="Leads in converted or won state within the selected range."
              />
            }
            value={count(dashboard.leads.convertedCount)}
            description={`${percentage(dashboard.leads.conversionRatePct)} conversion rate`}
            icon={<TrendingUp aria-hidden="true" className="size-4" />}
            tone="success"
          />
          <ContentMetricCard
            label={
              <MetricLabel
                label="Forward requests"
                help="Recorded requests to forward dealer lead context."
              />
            }
            value={count(dashboard.leads.forwardedCount)}
            description="Dealer lead forwarding events"
            icon={<ArrowRight aria-hidden="true" className="size-4" />}
          />
        </ContentMetrics>
      </ContentSection>

      <ContentSection
        title="Current Owner Guide capacity"
        description="Live readiness is intentionally independent from the activity date range."
      >
        <ContentMetrics>
          <ContentMetricCard
            label={
              <MetricLabel
                label="Owner Guides"
                help="All non-deleted Owner Guide profiles under this dealer."
              />
            }
            value={count(dashboard.ownerGuides.totalCount)}
            description={`${count(dashboard.ownerGuides.activeCount)} active profiles`}
            icon={<UsersRound aria-hidden="true" className="size-4" />}
          />
          <ContentMetricCard
            label={
              <MetricLabel
                label="Ready for matching"
                help="Active profiles with assignment enabled and a fresh location."
              />
            }
            value={count(dashboard.ownerGuides.assignmentReadyCount)}
            description={`${count(dashboard.ownerGuides.assignmentPausedCount)} assignment paused`}
            icon={<UserRoundCheck aria-hidden="true" className="size-4" />}
            tone="success"
          />
          <ContentMetricCard
            label={
              <MetricLabel
                label="Fresh locations"
                help="Locations that remain within the backend-configured freshness window."
              />
            }
            value={count(dashboard.ownerGuides.freshLocationCount)}
            description={`${count(dashboard.ownerGuides.staleLocationCount)} stale or missing`}
            icon={<LocateFixed aria-hidden="true" className="size-4" />}
            tone={
              dashboard.ownerGuides.staleLocationCount > 0
                ? "warning"
                : "success"
            }
          />
          <ContentMetricCard
            label={
              <MetricLabel
                label="Open assignments"
                help="Assignments that have not yet reached a terminal state."
              />
            }
            value={count(dashboard.ownerGuideAssignments.openCount)}
            description={`${count(dashboard.ownerGuideAssignments.rejectedCount)} rejected`}
            icon={<Clock3 aria-hidden="true" className="size-4" />}
            tone="warning"
          />
        </ContentMetrics>
      </ContentSection>

      {notices.length > 0 ? (
        <div className="grid gap-3">
          {notices.map((notice) => (
            <ContentStatus
              key={notice.title}
              variant={notice.variant}
              icon={notice.icon}
              title={notice.title}
              description={notice.description}
            />
          ))}
        </div>
      ) : (
        <ContentStatus
          variant="success"
          icon={<CheckCircle2 aria-hidden="true" className="size-4" />}
          title="Dealer engagement is ready"
          description="No deterministic Owner Guide readiness alert is active for this dealer context."
        />
      )}

      <ContentGrid variant="main-aside">
        <AssignmentFunnel dashboard={dashboard} />
        <ReadinessSummary dashboard={dashboard} />
      </ContentGrid>

      <OwnerGuidePreview
        ownerGuides={ownerGuides}
        context={access.context}
        capabilities={access.capabilities}
      />

      <ContentStatus
        role="note"
        variant="info"
        icon={<ContactRound aria-hidden="true" className="size-4" />}
        title="Dealer lead detail workspace"
        description="This dashboard uses authenticated aggregate lead metrics. Individual lead rows remain unavailable until dealer-scoped list and detail APIs are exposed; public token endpoints are not reused inside the ERP."
      />
    </ContentRoot>
  );
}

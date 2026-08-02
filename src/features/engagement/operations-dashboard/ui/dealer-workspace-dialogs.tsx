// oz-next-app/src/features/engagement/operations-dashboard/ui/dealer-workspace-dialogs.tsx
"use client";

import * as React from "react";
import {
  Activity,
  ArrowRightLeft,
  CalendarClock,
  CircleCheck,
  Eye,
  Settings2,
  ShoppingCart,
  Users,
} from "lucide-react";

import {
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  readEngagementDealerDetailAction,
  type ReadEngagementDealerDetailActionResult,
} from "@/features/engagement/operations-dashboard/actions/engagement-dashboard.actions";
import type {
  EngagementDashboardSearchParams,
  EngagementDealerDetail,
  EngagementDealerPerformanceItem,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDashboardCapabilities } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { DealerConfigurationForms } from "@/features/engagement/operations-dashboard/ui/dealer-configuration-forms";
import { EngagementMetricGrid } from "@/features/engagement/operations-dashboard/ui/engagement-metric-grid";
import {
  formatDashboardDateTime,
  formatDashboardInteger,
  formatDashboardPercentage,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";

export type DealerWorkspaceDialogsProps = Readonly<{
  dealer: EngagementDealerPerformanceItem;
  query: EngagementDashboardSearchParams;
  capabilities: Pick<
    EngagementDashboardCapabilities,
    | "canReadDealerPerformance"
    | "canUpdateDealerSettings"
    | "canUpdateDealerLocation"
  >;
}>;

type DialogMode = "DETAIL" | "CONFIGURE";

function actionInput(
  dealerOrgUnitId: string,
  query: EngagementDashboardSearchParams,
) {
  return {
    dealerOrgUnitId,
    from: query.from,
    to: query.to,
    leadSourceIds: query.leadSourceIds,
    ivrFlowCodes: query.ivrFlowCodes,
    statuses: query.statuses,
    dealerOrgUnitIds: query.dealerOrgUnitIds,
    districts: query.districts,
    cities: query.cities,
    assignmentStates: query.assignmentStates,
    conversionStates: query.conversionStates,
    followUpStates: query.followUpStates,
    issueSeverities: query.issueSeverities,
    ...(query.q !== undefined ? { q: query.q } : {}),
  } as const;
}

function DealerMetrics({
  dealer,
}: Readonly<{
  dealer: EngagementDealerDetail;
}>): React.ReactElement {
  return (
    <EngagementMetricGrid
      columns={4}
      metrics={[
        {
          id: "assigned",
          label: "Assigned",
          value: formatDashboardInteger(dealer.assignedCount),
          description: `${formatDashboardInteger(dealer.openLeadCount)} still open`,
          icon: <Users aria-hidden="true" className="size-5" />,
          tone: "info",
        },
        {
          id: "responded",
          label: "Dealer responded",
          value: formatDashboardInteger(dealer.respondedCount),
          description: `${formatDashboardInteger(dealer.responseWithinSlaCount)} within SLA`,
          icon: <Activity aria-hidden="true" className="size-5" />,
          tone: dealer.responseSlaRatePct >= 80 ? "success" : "warning",
        },
        {
          id: "follow-up",
          label: "Follow-up available",
          value: formatDashboardInteger(dealer.followUpAvailableCount),
          description: `${formatDashboardInteger(dealer.overdueFollowUpCount)} overdue`,
          icon: <CalendarClock aria-hidden="true" className="size-5" />,
          tone: dealer.overdueFollowUpCount > 0 ? "warning" : "success",
        },
        {
          id: "closed",
          label: "Closed",
          value: formatDashboardInteger(dealer.closedCount),
          description: `${formatDashboardInteger(dealer.convertedCount)} converted`,
          icon: <CircleCheck aria-hidden="true" className="size-5" />,
          tone: "success",
        },
        {
          id: "forward-dealer",
          label: "Forwarded to dealer",
          value: formatDashboardInteger(dealer.forwardedToDealerCount),
          description: "Dealer-to-dealer routing events",
          icon: <ArrowRightLeft aria-hidden="true" className="size-5" />,
        },
        {
          id: "forward-flow",
          label: "Moved to another flow",
          value: formatDashboardInteger(dealer.forwardedToFlowCount),
          description: "Forward requests to another IVR flow",
          icon: <ArrowRightLeft aria-hidden="true" className="size-5" />,
        },
        {
          id: "booked",
          label: "Booked",
          value: formatDashboardInteger(dealer.bookedCount),
          description: `${formatDashboardPercentage(dealer.conversionRatePct)} conversion rate`,
          icon: <ShoppingCart aria-hidden="true" className="size-5" />,
          tone: "info",
        },
        {
          id: "converted",
          label: "Converted",
          value: formatDashboardInteger(dealer.convertedCount),
          description: `${formatDashboardPercentage(dealer.responseSlaRatePct)} response SLA`,
          icon: <CircleCheck aria-hidden="true" className="size-5" />,
          tone: "success",
        },
      ]}
    />
  );
}

function LoadedDealer({
  dealer,
  mode,
  capabilities,
}: Readonly<{
  dealer: EngagementDealerDetail;
  mode: DialogMode;
  capabilities: DealerWorkspaceDialogsProps["capabilities"];
}>): React.ReactElement {
  if (mode === "CONFIGURE") {
    return (
      <DealerConfigurationForms
        dealer={dealer}
        canUpdateSettings={capabilities.canUpdateDealerSettings}
        canUpdateLocation={capabilities.canUpdateDealerLocation}
      />
    );
  }

  return (
    <Tabs defaultValue="performance" className="grid gap-4">
      <TabsList>
        <TabsTrigger value="performance">Performance</TabsTrigger>
        <TabsTrigger value="profile">Dealer profile</TabsTrigger>
      </TabsList>

      <TabsContent value="performance" className="grid gap-4">
        <DealerMetrics dealer={dealer} />

        <ContentDescriptionList columns="three">
          <ContentDescriptionItem term="Engagement status">
            <Badge variant={dealer.engagementActive ? "success" : "outline"}>
              {dealer.engagementActive ? "Active" : "Inactive"}
            </Badge>
          </ContentDescriptionItem>

          <ContentDescriptionItem term="Health">
            {dealer.health.status.replaceAll("_", " ")}
          </ContentDescriptionItem>

          <ContentDescriptionItem term="Last activity">
            {formatDashboardDateTime(dealer.lastActivityAt)}
          </ContentDescriptionItem>
        </ContentDescriptionList>
      </TabsContent>

      <TabsContent value="profile">
        <ContentDescriptionList columns="three">
          <ContentDescriptionItem term="Dealer code">
            {dealer.dealerCode}
          </ContentDescriptionItem>

          <ContentDescriptionItem term="District">
            {dealer.district ?? "Not configured"}
          </ContentDescriptionItem>

          <ContentDescriptionItem term="City">
            {dealer.city ?? "Not configured"}
          </ContentDescriptionItem>

          <ContentDescriptionItem term="Address">
            {[dealer.address.line1, dealer.address.line2]
              .filter((value): value is string => value !== null)
              .join(", ") || "Not configured"}
          </ContentDescriptionItem>

          <ContentDescriptionItem term="Priority">
            {dealer.settings.priority}
          </ContentDescriptionItem>

          <ContentDescriptionItem term="Assignment weight">
            {dealer.settings.assignmentWeight}
          </ContentDescriptionItem>

          <ContentDescriptionItem term="Maximum open leads">
            {dealer.settings.maxOpenLeads ?? "Unlimited"}
          </ContentDescriptionItem>

          <ContentDescriptionItem term="Maximum distance">
            {dealer.settings.maxAssignmentDistanceKm === null
              ? "Not configured"
              : `${String(dealer.settings.maxAssignmentDistanceKm)} km`}
          </ContentDescriptionItem>

          <ContentDescriptionItem term="Settings updated">
            {formatDashboardDateTime(dealer.settings.updatedAt)}
          </ContentDescriptionItem>
        </ContentDescriptionList>
      </TabsContent>
    </Tabs>
  );
}

function DealerDialog({
  dealer,
  query,
  capabilities,
  mode,
}: DealerWorkspaceDialogsProps &
  Readonly<{
    mode: DialogMode;
  }>): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [result, setResult] =
    React.useState<ReadEngagementDealerDetailActionResult | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const openRef = React.useRef(false);

  const canConfigure =
    capabilities.canUpdateDealerSettings ||
    capabilities.canUpdateDealerLocation;
  const configurationDisabled = mode === "CONFIGURE" && !canConfigure;
  const actionLabel =
    mode === "DETAIL" ? "View dealer details" : "Configure engagement";
  const tooltipLabel = configurationDisabled
    ? "You do not have permission to configure this dealer."
    : actionLabel;

  function handleOpenChange(nextOpen: boolean): void {
    openRef.current = nextOpen;
    setOpen(nextOpen);

    if (!nextOpen) {
      setResult(null);
      return;
    }

    if (isPending) {
      return;
    }

    setResult(null);
    startTransition(async () => {
      const nextResult = await readEngagementDealerDetailAction(
        actionInput(dealer.dealerOrgUnitId, query),
      );

      if (openRef.current) setResult(nextResult);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex"
            tabIndex={configurationDisabled ? 0 : undefined}
            aria-disabled={configurationDisabled ? true : undefined}
            aria-label={configurationDisabled ? tooltipLabel : undefined}
          >
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={actionLabel}
                disabled={configurationDisabled}
              >
                {mode === "DETAIL" ? (
                  <Eye aria-hidden="true" />
                ) : (
                  <Settings2 aria-hidden="true" />
                )}
              </Button>
            </DialogTrigger>
          </span>
        </TooltipTrigger>

        <TooltipContent side="top">{tooltipLabel}</TooltipContent>
      </Tooltip>

      <DialogContent height="viewport" className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "DETAIL"
              ? dealer.dealerName
              : `Configure ${dealer.dealerName}`}
          </DialogTitle>

          <DialogDescription>
            {mode === "DETAIL"
              ? "Vehicle-sales engagement performance for the selected period."
              : "Only engagement participation, assignment settings and dealer location are changed here."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {isPending && result === null ? (
            <div
              className="grid gap-4"
              aria-busy="true"
              aria-label="Loading dealer details"
            >
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          ) : result === null ? null : result.ok ? (
            <LoadedDealer
              dealer={result.dealer}
              mode={mode}
              capabilities={capabilities}
            />
          ) : (
            <ContentStatus
              variant="destructive"
              title="Dealer details could not be loaded"
              description={
                result.requestId === undefined
                  ? result.message
                  : `${result.message} Reference: ${result.requestId}`
              }
            />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export function DealerWorkspaceDialogs(
  props: DealerWorkspaceDialogsProps,
): React.ReactElement {
  return (
    <div
      role="group"
      aria-label={`Actions for ${props.dealer.dealerName}`}
      className="flex items-center justify-end gap-1"
    >
      <DealerDialog {...props} mode="DETAIL" />
      <DealerDialog {...props} mode="CONFIGURE" />
    </div>
  );
}

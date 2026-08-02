// oz-next-app/src/features/engagement/dealership-application-operations/ui/dealership-application-kpis.tsx
import type * as React from "react";
import {
  BadgeCheck,
  CalendarClock,
  Clock3,
  Inbox,
  ShieldAlert,
  Target,
  UserRoundPlus,
  Workflow,
} from "lucide-react";

import { ContentMetricCard } from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import type { ContentTone } from "@/components/common/content-shell";

import type {
  DealershipApplicationDashboardSummary,
  DealershipApplicationSearchParams,
} from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";
import {
  formatDealershipHours,
  formatDealershipInteger,
  formatDealershipPercentage,
  formatDealershipSignedPercentage,
} from "@/features/engagement/dealership-application-operations/utils/dealership-application-format";
import { dealershipApplicationDashboardHref } from "@/features/engagement/dealership-application-operations/utils/dealership-application-url";

export type DealershipApplicationKpisProps = Readonly<{
  summary: DealershipApplicationDashboardSummary;
  query: DealershipApplicationSearchParams;
}>;

type Kpi = DealershipApplicationDashboardSummary["kpis"][number];

const KPI_PRESENTATION: Readonly<
  Record<
    string,
    Readonly<{
      icon: React.ReactNode;
      description: string;
      format: "integer" | "percentage" | "hours";
    }>
  >
> = {
  received: {
    icon: <Inbox aria-hidden="true" />,
    description: "Applications received in the selected period",
    format: "integer",
  },
  qualification_rate: {
    icon: <Target aria-hidden="true" />,
    description: "Received applications that reached qualification",
    format: "percentage",
  },
  approval_rate: {
    icon: <BadgeCheck aria-hidden="true" />,
    description: "Qualified applications approved for onboarding",
    format: "percentage",
  },
  activation_rate: {
    icon: <UserRoundPlus aria-hidden="true" />,
    description: "Approved applications activated as dealers",
    format: "percentage",
  },
  average_approval_hours: {
    icon: <Clock3 aria-hidden="true" />,
    description: "Average elapsed time from intake to approval",
    format: "hours",
  },
  onboarding_in_progress: {
    icon: <Workflow aria-hidden="true" />,
    description: "Applications moving through onboarding",
    format: "integer",
  },
} as const;

function kpiTone(severity: Kpi["severity"]): ContentTone {
  if (severity === "GOOD") return "success";
  if (severity === "WARNING") return "warning";
  if (severity === "CRITICAL") return "destructive";
  return "default";
}

function kpiValue(kpi: Kpi): string {
  const format = KPI_PRESENTATION[kpi.key]?.format ?? "integer";
  if (format === "percentage") return formatDealershipPercentage(kpi.value);
  if (format === "hours") return formatDealershipHours(kpi.value);
  return formatDealershipInteger(kpi.value);
}

function kpiTrend(kpi: Kpi): React.ReactNode {
  if (kpi.trendPercentage === null) return "No prior-period comparison";
  const positive = kpi.trendPercentage > 0;
  const negative = kpi.trendPercentage < 0;
  return (
    <Badge
      variant={positive ? "secondary" : negative ? "outline" : "outline"}
      className="text-tabular"
    >
      {formatDealershipSignedPercentage(kpi.trendPercentage)}
    </Badge>
  );
}

export function DealershipApplicationKpis({
  summary,
}: DealershipApplicationKpisProps): React.ReactElement {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {summary.kpis.map((kpi) => {
        const presentation = KPI_PRESENTATION[kpi.key];
        return (
          <ContentMetricCard
            key={kpi.key}
            label={kpi.label}
            value={kpiValue(kpi)}
            description={
              presentation?.description ?? "Operational lifecycle metric"
            }
            icon={presentation?.icon}
            trend={kpiTrend(kpi)}
            tone={kpiTone(kpi.severity)}
          />
        );
      })}
    </div>
  );
}

export function DealershipApplicationWorkQueue({
  summary,
  query,
}: DealershipApplicationKpisProps): React.ReactElement {
  const queue = summary.workQueue;
  const items = [
    {
      key: "unassigned",
      label: "Unassigned",
      value: queue.unassigned,
      description: "Open cases waiting for an owner",
      icon: <UserRoundPlus aria-hidden="true" />,
      tone: "warning" as const,
    },
    {
      key: "overdue",
      label: "Overdue actions",
      value: queue.overdueFollowUps,
      description: "Next actions past their due time",
      icon: <Clock3 aria-hidden="true" />,
      tone: "destructive" as const,
      href: dealershipApplicationDashboardHref(query, {
        sortBy: "NEXT_ACTION_AT",
        sortDirection: "ASC",
        cursor: null,
      }),
    },
    {
      key: "appointments",
      label: "Appointments today",
      value: queue.appointmentsToday,
      description: "Applicant meetings scheduled today",
      icon: <CalendarClock aria-hidden="true" />,
      tone: "info" as const,
    },
    {
      key: "blocked",
      label: "Compliance blocked",
      value: queue.complianceBlocked,
      description: "Compliance or risk cases with blockers",
      icon: <ShieldAlert aria-hidden="true" />,
      tone: "destructive" as const,
    },
    {
      key: "activation",
      label: "Awaiting activation",
      value: queue.activationPending,
      description: "Provisioned dealers pending activation",
      icon: <BadgeCheck aria-hidden="true" />,
      tone: "success" as const,
      href: dealershipApplicationDashboardHref(query, {
        statuses: ["ACTIVATION_PENDING"],
        cursor: null,
      }),
    },
    {
      key: "exit",
      label: "Exits in progress",
      value: queue.exitPending,
      description: "Dealer exits requiring completion",
      icon: <Workflow aria-hidden="true" />,
      tone: "warning" as const,
      href: dealershipApplicationDashboardHref(query, {
        phases: ["EXIT"],
        cursor: null,
      }),
    },
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <ContentMetricCard
          key={item.key}
          label={item.label}
          value={formatDealershipInteger(item.value)}
          description={item.description}
          icon={item.icon}
          tone={item.tone}
          {...("href" in item ? { href: item.href } : {})}
          ariaLabel={`${item.label}: ${formatDealershipInteger(item.value)}`}
        />
      ))}
    </div>
  );
}

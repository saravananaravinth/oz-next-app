// oz-next-app/src/features/engagement/operations-dashboard/ui/lead-source-chart.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";

import { ContentEmptyState } from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { usePrefersReducedMotion } from "@/shared/hooks";
import {
  addDashboardDays,
  type EngagementDashboardSearchParams,
  type EngagementLeadFlowSeries,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import {
  formatDashboardDate,
  formatDashboardInteger,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import {
  ENGAGEMENT_DASHBOARD_ROUTES,
  engagementWorkspaceHref,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

const config = {
  newCount: { label: "New leads", color: "var(--chart-1)" },
  closedCount: { label: "Closed leads", color: "var(--chart-2)" },
} satisfies ChartConfig;

export type LeadSourceChartProps = Readonly<{
  series: EngagementLeadFlowSeries;
  query: EngagementDashboardSearchParams;
}>;

function periodEnd(
  periodStart: string,
  grain: EngagementLeadFlowSeries["range"]["grain"],
): string {
  if (grain === "DAY") return periodStart;
  if (grain === "WEEK") return addDashboardDays(periodStart, 6);
  const [yearText, monthText] = periodStart.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  return Number.isInteger(year) && Number.isInteger(month)
    ? new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
    : periodStart;
}

function periodStartFromBarEvent(value: unknown): string | null {
  if (typeof value !== "object" || value === null || !("payload" in value))
    return null;
  const payload = value.payload;
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("periodStart" in payload)
  )
    return null;
  return typeof payload.periodStart === "string" ? payload.periodStart : null;
}

export function LeadSourceChart({
  series,
  query,
}: LeadSourceChartProps): React.ReactElement {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  const hasChartData = series.points.some(
    (point) => point.newCount > 0 || point.closedCount > 0,
  );

  const crossFilter = React.useCallback(
    (periodStart: string): void => {
      const from =
        periodStart < series.range.from ? series.range.from : periodStart;
      const rawTo = periodEnd(periodStart, series.range.grain);
      const to = rawTo > series.range.to ? series.range.to : rawTo;
      router.push(
        engagementWorkspaceHref(ENGAGEMENT_DASHBOARD_ROUTES.overview, query, {
          from,
          to,
          dealerCursor: null,
          leadCursor: null,
        }),
      );
    },
    [query, router, series.range.from, series.range.grain, series.range.to],
  );

  if (!hasChartData) {
    return (
      <ContentEmptyState
        icon={<BarChart3 aria-hidden="true" />}
        title="No lead flow in this period"
        description="No new or terminal vehicle-sales lead activity matches the selected period and filters."
      />
    );
  }

  return (
    <div className="grid min-h-0 gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          <BarChart3 aria-hidden="true" className="size-3.5" />
          {formatDashboardInteger(series.totals.newCount)} new
        </Badge>
        <Badge variant="outline">
          {formatDashboardInteger(series.totals.closedCount)} closed
        </Badge>
        <Badge variant="outline">
          {series.range.grain.toLocaleLowerCase("en-US")}
        </Badge>
      </div>
      <ChartContainer
        config={config}
        className="h-[20rem] min-h-[20rem] w-full aspect-auto sm:h-[22rem]"
        initialDimension={{ width: 960, height: 352 }}
      >
        <BarChart
          accessibilityLayer
          data={series.points}
          margin={{ left: 4, right: 12, top: 8 }}
          barCategoryGap="22%"
          barGap={4}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="periodStart"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tickFormatter={(value: string) => formatDashboardDate(value)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={44}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.45 }}
            content={
              <ChartTooltipContent
                labelFormatter={(value) =>
                  typeof value === "string" || typeof value === "number"
                    ? formatDashboardDate(String(value))
                    : ""
                }
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {(["newCount", "closedCount"] as const).map((key) => (
            <Bar
              key={key}
              dataKey={key}
              fill={`var(--color-${key})`}
              radius={[4, 4, 0, 0]}
              maxBarSize={38}
              isAnimationActive={!reducedMotion}
              animationDuration={450}
              animationEasing="ease-out"
              onClick={(entry: unknown) => {
                const start = periodStartFromBarEvent(entry);
                if (start !== null) crossFilter(start);
              }}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <p className="text-caption text-muted-readable">
        New leads use creation date; closed leads use the verified terminal
        event date in Asia/Kolkata.
      </p>
    </div>
  );
}

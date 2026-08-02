// oz-next-app/src/features/engagement/operations-dashboard/ui/lead-source-chart.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3, Layers3, Rows3 } from "lucide-react";

import { ContentEmptyState } from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePrefersReducedMotion } from "@/shared/hooks";

import {
  addDashboardDays,
  type EngagementDashboardSearchParams,
  type EngagementLeadSourceSeries,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import {
  formatDashboardDate,
  formatDashboardInteger,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import {
  ENGAGEMENT_DASHBOARD_ROUTES,
  engagementWorkspaceHref,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

const ALL_SOURCES = "__ALL_SOURCES__";
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--muted-foreground)",
] as const;

type ChartMode = "STACKED" | "GROUPED";
type ChartSource = Readonly<{
  key: `series_${number}`;
  code: string;
  id: string;
  name: string;
  totalCount: number;
}>;
type ChartRow = Readonly<Record<string, string | number>> &
  Readonly<{ periodStart: string; totalCount: number }>;

export type LeadSourceChartProps = Readonly<{
  series: EngagementLeadSourceSeries;
  query: EngagementDashboardSearchParams;
}>;

function chartSourceKey(index: number): ChartSource["key"] {
  return `series_${String(index)}` as ChartSource["key"];
}

function chartSources(
  series: EngagementLeadSourceSeries,
): readonly ChartSource[] {
  return series.sources.map((source, index) => ({
    key: chartSourceKey(index),
    code: source.code,
    id: source.leadSourceId,
    name: source.name,
    totalCount: source.totalCount,
  }));
}

function chartRows(
  series: EngagementLeadSourceSeries,
  sources: readonly ChartSource[],
): readonly ChartRow[] {
  return series.points.map((point) => {
    const values: Record<string, string | number> = {
      periodStart: point.periodStart,
      totalCount: point.totalCount,
    };

    for (const source of sources) {
      values[source.key] = point.sourceCounts[source.code] ?? 0;
    }

    return values as ChartRow;
  });
}

function chartConfig(sources: readonly ChartSource[]): ChartConfig {
  return Object.fromEntries(
    sources.map((source, index) => [
      source.key,
      {
        label: source.name,
        color: CHART_COLORS[index % CHART_COLORS.length] ?? CHART_COLORS[0],
      },
    ]),
  ) satisfies ChartConfig;
}

function periodEnd(
  periodStart: string,
  grain: EngagementLeadSourceSeries["range"]["grain"],
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

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function periodStartFromBarEvent(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value["payload"])) return null;
  const periodStart = value["payload"]["periodStart"];
  return typeof periodStart === "string" ? periodStart : null;
}

export function LeadSourceChart({
  series,
  query,
}: LeadSourceChartProps): React.ReactElement {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  const [selectedKey, setSelectedKey] = React.useState(ALL_SOURCES);
  const [mode, setMode] = React.useState<ChartMode>("STACKED");
  const sources = React.useMemo(() => chartSources(series), [series]);
  const rows = React.useMemo(
    () => chartRows(series, sources),
    [series, sources],
  );
  const config = React.useMemo(() => chartConfig(sources), [sources]);
  const visibleSources = React.useMemo(
    () =>
      selectedKey === ALL_SOURCES
        ? sources
        : sources.filter((source) => source.key === selectedKey),
    [selectedKey, sources],
  );
  const total = visibleSources.reduce(
    (sum, source) => sum + source.totalCount,
    0,
  );
  const hasChartData =
    sources.length > 0 && rows.some((row) => row.totalCount > 0);

  const crossFilter = React.useCallback(
    (periodStart: string, source: ChartSource): void => {
      const selectedFrom =
        periodStart < series.range.from ? series.range.from : periodStart;
      const rawPeriodEnd = periodEnd(periodStart, series.range.grain);
      const selectedTo =
        rawPeriodEnd > series.range.to ? series.range.to : rawPeriodEnd;
      const isOther = source.id === "00000000-0000-0000-0000-000000000000";

      router.push(
        engagementWorkspaceHref(ENGAGEMENT_DASHBOARD_ROUTES.overview, query, {
          from: selectedFrom,
          to: selectedTo,
          leadSourceIds: isOther ? query.leadSourceIds : [source.id],
          dealerCursor: null,
          leadCursor: null,
          issueCursor: null,
        }),
      );
    },
    [query, router, series.range.from, series.range.grain, series.range.to],
  );

  if (!hasChartData) {
    return (
      <ContentEmptyState
        icon={<BarChart3 aria-hidden="true" />}
        title="No lead-source activity in this period"
        description="No vehicle-sales leads match the selected period and filters. Adjust the date range or clear filters to compare lead sources."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <BarChart3 aria-hidden="true" className="size-3.5" />
            {formatDashboardInteger(total)} leads
          </Badge>
          <Badge variant="outline">
            {series.range.grain.toLocaleLowerCase("en-US")}
          </Badge>
          <Badge variant="outline">Top six + Other</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedKey} onValueChange={setSelectedKey}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select lead source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SOURCES}>All sources</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source.key} value={source.key}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={mode === "STACKED" ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setMode("STACKED");
            }}
          >
            <Layers3 aria-hidden="true" className="size-4" />
            Stacked
          </Button>
          <Button
            type="button"
            variant={mode === "GROUPED" ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setMode("GROUPED");
            }}
          >
            <Rows3 aria-hidden="true" className="size-4" />
            Grouped
          </Button>
        </div>
      </div>

      <ChartContainer
        config={config}
        className="min-h-[20rem] w-full flex-1 aspect-auto"
        initialDimension={{ width: 960, height: 480 }}
      >
        <BarChart
          accessibilityLayer
          data={rows}
          margin={{ left: 4, right: 12, top: 8 }}
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
          {visibleSources.map((source) => (
            <Bar
              key={source.key}
              dataKey={source.key}
              fill={`var(--color-${source.key})`}
              radius={mode === "STACKED" ? [4, 4, 0, 0] : 4}
              {...(mode === "STACKED" ? { stackId: "lead-source" } : {})}
              maxBarSize={48}
              isAnimationActive={!reducedMotion}
              animationDuration={450}
              animationEasing="ease-out"
              onClick={(entry: unknown) => {
                const periodStart = periodStartFromBarEvent(entry);
                if (periodStart !== null) crossFilter(periodStart, source);
              }}
            />
          ))}
        </BarChart>
      </ChartContainer>

      <p className="text-caption text-muted-readable">
        Select a bar to focus the lead table on that period and source.
        Aggregated Other remains visible but keeps the current source filter.
      </p>
    </div>
  );
}

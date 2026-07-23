// oz-next-app/src/features/engagement/operations-dashboard/ui/lead-source-chart.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3, Layers3, Rows3 } from "lucide-react";

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

import {
  addDashboardDays,
  type EngagementDashboardSearchParams,
  type EngagementLeadSourceSeries,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import {
  formatDashboardDate,
  formatDashboardInteger,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import { engagementDashboardHref } from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

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

type ChartRow = Readonly<Record<string, string | number>> &
  Readonly<{ periodStart: string; totalCount: number }>;

type ChartMode = "STACKED" | "GROUPED";

export type LeadSourceChartProps = Readonly<{
  series: EngagementLeadSourceSeries;
  query: EngagementDashboardSearchParams;
}>;

function chartRows(series: EngagementLeadSourceSeries): readonly ChartRow[] {
  return series.points.map((point) => ({
    periodStart: point.periodStart,
    totalCount: point.totalCount,
    ...point.sourceCounts,
  }));
}

function chartConfig(series: EngagementLeadSourceSeries): ChartConfig {
  const config: ChartConfig = {};
  for (const [index, source] of series.sources.entries()) {
    config[source.code] = {
      label: source.name,
      color: CHART_COLORS[index % CHART_COLORS.length] ?? CHART_COLORS[0],
    };
  }
  return config;
}

function periodEnd(
  periodStart: string,
  grain: EngagementLeadSourceSeries["range"]["grain"],
): string {
  if (grain === "DAY") {
    return periodStart;
  }
  if (grain === "WEEK") {
    return addDashboardDays(periodStart, 6);
  }

  const [yearText, monthText] = periodStart.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return periodStart;
  }
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function periodStartFromBarEvent(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const payload = value["payload"];
  if (!isRecord(payload)) {
    return null;
  }
  const periodStart = payload["periodStart"];
  return typeof periodStart === "string" ? periodStart : null;
}

export function LeadSourceChart({
  series,
  query,
}: LeadSourceChartProps): React.ReactElement {
  const router = useRouter();
  const [sourceCode, setSourceCode] = React.useState(ALL_SOURCES);
  const [mode, setMode] = React.useState<ChartMode>("STACKED");
  const rows = React.useMemo(() => chartRows(series), [series]);
  const config = React.useMemo(() => chartConfig(series), [series]);
  const visibleSources = React.useMemo(
    () =>
      sourceCode === ALL_SOURCES
        ? series.sources
        : series.sources.filter((source) => source.code === sourceCode),
    [series.sources, sourceCode],
  );
  const total = visibleSources.reduce(
    (sum, source) => sum + source.totalCount,
    0,
  );

  const crossFilter = React.useCallback(
    (periodStart: string, selectedSourceCode: string): void => {
      const source = series.sources.find(
        (item) => item.code === selectedSourceCode,
      );
      const selectedFrom =
        periodStart < series.range.from ? series.range.from : periodStart;
      const rawPeriodEnd = periodEnd(periodStart, series.range.grain);
      const selectedTo =
        rawPeriodEnd > series.range.to ? series.range.to : rawPeriodEnd;
      router.push(
        engagementDashboardHref(
          query,
          {
            from: selectedFrom,
            to: selectedTo,
            leadSourceIds:
              source === undefined || source.code === "OTHER"
                ? query.leadSourceIds
                : [source.leadSourceId],
            dealerCursor: null,
            issueCursor: null,
          },
          "dealers",
        ),
      );
    },
    [
      query,
      router,
      series.range.from,
      series.range.grain,
      series.range.to,
      series.sources,
    ],
  );

  return (
    <div className="grid gap-4">
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
          <Select value={sourceCode} onValueChange={setSourceCode}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SOURCES}>All sources</SelectItem>
              {series.sources.map((source) => (
                <SelectItem key={source.code} value={source.code}>
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
        className="min-h-[20rem] w-full"
        initialDimension={{ width: 960, height: 360 }}
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
              key={source.code}
              dataKey={source.code}
              fill={`var(--color-${source.code})`}
              radius={mode === "STACKED" ? [3, 3, 0, 0] : 3}
              {...(mode === "STACKED" ? { stackId: "lead-source" } : {})}
              maxBarSize={48}
              onClick={(entry: unknown) => {
                const periodStart = periodStartFromBarEvent(entry);
                if (periodStart !== null) {
                  crossFilter(periodStart, source.code);
                }
              }}
            />
          ))}
        </BarChart>
      </ChartContainer>

      <p className="text-caption text-muted-readable">
        Select a bar to constrain the dashboard to that period and source. The
        aggregated Other series remains period-clickable but cannot be
        represented as a backend source identifier.
      </p>
    </div>
  );
}

// oz-next-app/src/features/engagement/dealership-application-operations/ui/dealership-application-source-chart.tsx
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
  addDealershipApplicationDays,
  type DealershipApplicationSearchParams,
  type DealershipApplicationSourceSeries,
} from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";
import {
  formatDealershipInteger,
  isoDateInKolkata,
  sourceBucketLabel,
} from "@/features/engagement/dealership-application-operations/utils/dealership-application-format";
import { dealershipApplicationDashboardHref } from "@/features/engagement/dealership-application-operations/utils/dealership-application-url";

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
  sourceKey: string;
  sourceId: string | null;
  kind: string;
  name: string;
}>;
type ChartRow = Readonly<Record<string, string | number>> &
  Readonly<{
    bucketStart: string;
    bucketEnd: string;
    total: number;
  }>;

export type DealershipApplicationSourceChartProps = Readonly<{
  series: DealershipApplicationSourceSeries;
  query: DealershipApplicationSearchParams;
}>;

function chartSourceKey(index: number): ChartSource["key"] {
  return `series_${String(index)}` as ChartSource["key"];
}

function chartSources(
  series: DealershipApplicationSourceSeries,
): readonly ChartSource[] {
  return series.sourceKeys.map((source, index) => ({
    key: chartSourceKey(index),
    sourceKey: source.key,
    sourceId: source.sourceId,
    kind: source.kind,
    name: source.name,
  }));
}

function chartRows(
  series: DealershipApplicationSourceSeries,
  sources: readonly ChartSource[],
): readonly ChartRow[] {
  return series.points.map((point) => {
    const row: Record<string, string | number> = {
      bucketStart: point.bucketStart,
      bucketEnd: point.bucketEnd,
      total: point.total,
    };
    for (const source of sources) {
      row[source.key] = point.sources[source.sourceKey] ?? 0;
    }
    return row as ChartRow;
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

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function chartEntry(value: unknown): ChartRow | null {
  if (!isRecord(value) || !isRecord(value["payload"])) return null;
  const payload = value["payload"];
  const bucketStart = payload["bucketStart"];
  const bucketEnd = payload["bucketEnd"];
  const total = payload["total"];
  return typeof bucketStart === "string" &&
    typeof bucketEnd === "string" &&
    typeof total === "number"
    ? { bucketStart, bucketEnd, total }
    : null;
}

export function DealershipApplicationSourceChart({
  series,
  query,
}: DealershipApplicationSourceChartProps): React.ReactElement {
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
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const hasData = sources.length > 0 && rows.some((row) => row.total > 0);

  const crossFilter = React.useCallback(
    (row: ChartRow, source: ChartSource): void => {
      const from = isoDateInKolkata(row.bucketStart);
      const exclusiveTo = isoDateInKolkata(row.bucketEnd);
      if (from === null || exclusiveTo === null) return;
      const to = addDealershipApplicationDays(exclusiveTo, -1);
      router.push(
        dealershipApplicationDashboardHref(query, {
          from,
          to,
          sourceIds: source.sourceId === null ? null : [source.sourceId],
          sourceKinds: source.sourceId === null ? [source.kind] : null,
          cursor: null,
        }),
      );
    },
    [query, router],
  );

  if (!hasData) {
    return (
      <ContentEmptyState
        icon={<BarChart3 aria-hidden="true" />}
        title="No application intake in this period"
        description="No dealership applications match the selected period and filters. Adjust the date range or clear filters to compare sources."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <BarChart3 aria-hidden="true" className="size-3.5" />
            {formatDealershipInteger(total)} applications
          </Badge>
          <Badge variant="outline">
            {series.grain.toLocaleLowerCase("en-US")} buckets
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedKey} onValueChange={setSelectedKey}>
            <SelectTrigger
              className="w-56"
              aria-label="Select lead source series"
            >
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

      <div
        className="max-w-full overflow-x-auto overscroll-x-contain rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        role="region"
        aria-label="Daily application intake chart; scroll horizontally on smaller screens"
        tabIndex={0}
      >
        <ChartContainer
          config={config}
          className="h-[28rem] min-h-[28rem] min-w-[48rem] w-full flex-none aspect-auto"
          initialDimension={{ width: 960, height: 448 }}
        >
          <BarChart
            accessibilityLayer
            data={rows}
            margin={{ left: 4, right: 12, top: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="bucketStart"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tickFormatter={(value: string) =>
                sourceBucketLabel(value, series.grain)
              }
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
                      ? sourceBucketLabel(String(value), series.grain)
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
                {...(mode === "STACKED"
                  ? { stackId: "application-source" }
                  : {})}
                maxBarSize={48}
                isAnimationActive={!reducedMotion}
                animationDuration={450}
                animationEasing="ease-out"
                onClick={(entry: unknown) => {
                  const row = chartEntry(entry);
                  if (row !== null) crossFilter(row, source);
                }}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </div>
      <p className="text-caption text-muted-readable">
        Select a bar to focus the work queue on that source and bucket. Source
        totals are returned gap-filled by the API.
      </p>
    </div>
  );
}

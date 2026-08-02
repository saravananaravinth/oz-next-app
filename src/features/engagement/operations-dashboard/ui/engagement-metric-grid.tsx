// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-metric-grid.tsx
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type EngagementMetricTone =
  "default" | "success" | "warning" | "destructive" | "info";

export type EngagementMetric = Readonly<{
  id: string;
  label: string;
  value: React.ReactNode;
  description: React.ReactNode;
  help?: React.ReactNode;
  icon: React.ReactNode;
  tone?: EngagementMetricTone;
  trend?: Readonly<{
    value: number | null;
    positiveIsGood: boolean;
    label?: string;
  }>;
  badge?: React.ReactNode;
  href?: Route;
}>;

export type EngagementMetricGridProps = Readonly<{
  metrics: readonly EngagementMetric[];
  columns?: 4 | 5 | 6;
}>;

const ICON_TONE_CLASSES = {
  default: "border-border/70 bg-muted/55 text-muted-readable",
  success: "border-success/25 bg-success/10 text-success",
  warning:
    "border-warning/30 bg-warning/10 text-warning-foreground dark:text-warning",
  destructive: "border-destructive/25 bg-destructive/10 text-destructive",
  info: "border-info/25 bg-info/10 text-info",
} as const satisfies Readonly<Record<EngagementMetricTone, string>>;

function Trend({
  trend,
}: Readonly<{
  trend: NonNullable<EngagementMetric["trend"]>;
}>): React.ReactElement {
  const value = trend.value;
  const isPositive = value !== null && value > 0;
  const isNegative = value !== null && value < 0;
  const good =
    value !== null && value !== 0 && isPositive === trend.positiveIsGood;
  const bad = value !== null && value !== 0 && !good;
  const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1 text-caption text-tabular",
        good && "text-success",
        bad && "text-destructive",
        !good && !bad && "text-muted-readable",
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {value === null
        ? (trend.label ?? "No baseline")
        : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`}
    </span>
  );
}

function MetricCard({
  metric,
}: Readonly<{ metric: EngagementMetric }>): React.ReactElement {
  const tone = metric.tone ?? "default";
  const helpId = React.useId();
  const content = (
    <Card
      size="sm"
      className={cn(
        "group h-full overflow-hidden transition-[border-color,box-shadow,transform] duration-[var(--motion-duration-fast)] ease-enterprise motion-reduce:transition-none",
        metric.href !== undefined &&
          "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md motion-reduce:hover:translate-y-0",
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="grid min-w-0 gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <p className="flex min-w-0 items-center gap-1.5 text-overline text-muted-readable">
              <span className="truncate">{metric.label}</span>
              {metric.help !== undefined ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex size-5 shrink-0 items-center justify-center rounded-md"
                      tabIndex={metric.href === undefined ? 0 : undefined}
                    >
                      <Info aria-hidden="true" className="size-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    {metric.help}
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </p>
            {metric.badge !== undefined ? (
              <Badge variant="outline" className="h-5 shrink-0 px-1.5">
                {metric.badge}
              </Badge>
            ) : null}
          </div>
          <p className="text-page-title text-tabular text-foreground">
            {metric.value}
          </p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-2xl border",
            ICON_TONE_CLASSES[tone],
          )}
        >
          {metric.icon}
        </span>
      </CardHeader>
      <CardContent className="grid gap-3 pt-0">
        <p className="min-h-10 text-body-sm text-muted-readable">
          {metric.description}
        </p>
        {metric.trend !== undefined ? <Trend trend={metric.trend} /> : null}
        {metric.help !== undefined ? (
          <span id={helpId} className="sr-only">
            {metric.help}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );

  return metric.href === undefined ? (
    content
  ) : (
    <Link
      href={metric.href}
      aria-describedby={metric.help === undefined ? undefined : helpId}
      className="min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      {content}
    </Link>
  );
}

export function EngagementMetricGrid({
  metrics,
  columns = 6,
}: EngagementMetricGridProps): React.ReactElement {
  return (
    <section
      aria-label="Key performance indicators"
      data-columns={columns}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 data-[columns=4]:2xl:grid-cols-4 data-[columns=5]:2xl:grid-cols-5 data-[columns=6]:2xl:grid-cols-6"
    >
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </section>
  );
}

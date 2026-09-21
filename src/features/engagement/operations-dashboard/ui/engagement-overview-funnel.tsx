// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-overview-funnel.tsx
import type * as React from "react";
import { ArrowRight, TimerReset } from "lucide-react";

import { ContentDataSurface } from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import type { EngagementFunnel } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import {
  formatDashboardDuration,
  formatDashboardInteger,
  formatDashboardPercentage,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";

export type EngagementOverviewFunnelProps = Readonly<{
  funnel: EngagementFunnel;
}>;

export function EngagementOverviewFunnel({
  funnel,
}: EngagementOverviewFunnelProps): React.ReactElement {
  const maximumCount = Math.max(
    1,
    ...funnel.stages.map((stage) => stage.count),
  );

  return (
    <ContentDataSurface
      title="Lead lifecycle funnel"
      description="Lead progression from creation through conversion for the selected operational filters. Drop-off is measured against the immediately preceding stage."
      contentClassName="grid gap-3 px-[var(--card-spacing)] pb-[var(--card-spacing)]"
    >
      <div className="grid gap-3 xl:grid-cols-5">
        {funnel.stages.map((stage, index) => {
          const relativeShare = (stage.count / maximumCount) * 100;
          const isFirst = index === 0;

          return (
            <article
              key={stage.code}
              className="grid min-w-0 gap-3 rounded-2xl border border-border/70 bg-muted/15 p-4"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-overline text-muted-readable">
                    Stage {String(index + 1)}
                  </p>
                  <h3 className="truncate text-body-sm font-semibold text-foreground">
                    {stage.name}
                  </h3>
                </div>
                {!isFirst ? (
                  <ArrowRight
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-muted-readable"
                  />
                ) : null}
              </div>

              <div className="grid gap-2">
                <p className="text-page-title text-tabular text-foreground">
                  {formatDashboardInteger(stage.count)}
                </p>
                <Progress
                  value={relativeShare}
                  aria-label={`${stage.name} relative funnel volume`}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {stage.dropOffPct === null ? (
                  <Badge variant="outline">Entry stage</Badge>
                ) : (
                  <Badge variant="outline">
                    {formatDashboardPercentage(stage.dropOffPct)} drop-off
                  </Badge>
                )}
                <Badge variant="secondary">
                  <TimerReset aria-hidden="true" className="size-3" />
                  {formatDashboardDuration(stage.medianMinutesFromPrevious)}
                </Badge>
              </div>
            </article>
          );
        })}
      </div>
    </ContentDataSurface>
  );
}

// oz-next-app/src/features/extended-warranty/ui/workspace-detail-common.tsx
"use client";

import { AlertTriangle, CheckCircle2, Circle, CircleDot } from "lucide-react";
import * as React from "react";

import { ContentStatus } from "@/components/common/content-shell";
import type { BadgeProps } from "@/components/ui/badge";
import type { ExtendedWarrantyActionFailure } from "@/features/extended-warranty/actions/action-failure";
import type { WarrantyLifecycleStage } from "@/features/extended-warranty/policies/workspace-detail-presentation";

export function workspaceDetailStatusBadgeVariant(
  status: string,
): BadgeProps["variant"] {
  const normalized = status.toUpperCase();
  if (normalized.includes("FAIL") || normalized.includes("REJECT")) {
    return "destructive";
  }
  if (
    normalized.includes("SUCCEED") ||
    normalized.includes("APPROV") ||
    normalized.includes("DELIVER") ||
    normalized.includes("CAPTURE") ||
    normalized.includes("COMPLETE") ||
    normalized.includes("FULFILL")
  ) {
    return "success";
  }
  if (
    normalized.includes("PENDING") ||
    normalized.includes("RUNNING") ||
    normalized.includes("QUEUE")
  ) {
    return "warning";
  }
  return "outline";
}

function lifecycleStateLabel(stage: WarrantyLifecycleStage): string {
  if (stage.state === "complete") return "Complete";
  if (stage.state === "attention") return "Attention";
  if (stage.state === "current") return "Current";
  return "Upcoming";
}

function LifecycleStateIcon({
  state,
}: Readonly<{ state: WarrantyLifecycleStage["state"] }>): React.ReactElement {
  if (state === "complete") {
    return <CheckCircle2 className="size-4" aria-hidden="true" />;
  }
  if (state === "attention") {
    return <AlertTriangle className="size-4" aria-hidden="true" />;
  }
  if (state === "current") {
    return <CircleDot className="size-4" aria-hidden="true" />;
  }
  return <Circle className="size-4" aria-hidden="true" />;
}

export function WarrantyLifecycleRail({
  stages,
}: Readonly<{
  stages: readonly WarrantyLifecycleStage[];
}>): React.ReactElement {
  return (
    <section aria-labelledby="ew-lifecycle-heading" className="grid gap-3">
      <div>
        <h2 id="ew-lifecycle-heading" className="text-sm font-semibold">
          Warranty lifecycle
        </h2>
        <p className="text-xs text-muted-foreground">
          Workflow projection from the current server-backed warranty state.
        </p>
      </div>
      <div className="overflow-x-auto overscroll-x-contain pb-1">
        <ol className="grid min-w-[46rem] grid-cols-7 gap-2">
          {stages.map((stage) => {
            const active =
              stage.state === "current" || stage.state === "attention";
            return (
              <li
                key={stage.key}
                aria-current={active ? "step" : undefined}
                className={`rounded-xl border px-3 py-2.5 ${
                  stage.state === "attention"
                    ? "border-destructive/35 bg-destructive/5"
                    : stage.state === "current"
                      ? "border-primary/35 bg-primary/5"
                      : stage.state === "complete"
                        ? "border-success/25 bg-success/5"
                        : "border-border/70 bg-muted/20"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-medium">
                  <LifecycleStateIcon state={stage.state} />
                  <span>{stage.label}</span>
                </div>
                <div className="mt-1 text-[0.6875rem] text-muted-foreground">
                  {lifecycleStateLabel(stage)}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export function WarrantyMutationFailureStatus({
  failure,
  title,
}: Readonly<{
  failure: ExtendedWarrantyActionFailure | null;
  title: string;
}>): React.ReactElement | null {
  if (failure === null) return null;
  return (
    <ContentStatus
      variant="destructive"
      announce="assertive"
      title={title}
      description={
        <div className="grid gap-1">
          <span>{failure.message}</span>
          {failure.requestId === undefined ? null : (
            <span className="text-xs">
              Support request ID:{" "}
              <span className="font-mono">{failure.requestId}</span>
            </span>
          )}
        </div>
      }
      icon={<AlertTriangle className="size-4" aria-hidden="true" />}
    />
  );
}

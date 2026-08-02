// oz-next-app/src/components/common/operation-workflow.tsx
"use client";

import type * as React from "react";
import { Check, ChevronRight, Circle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type OperationTileTone =
  "default" | "primary" | "success" | "warning" | "destructive" | "info";

export type OperationTileProps = Readonly<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  status?: string;
  statusVariant?: React.ComponentProps<typeof Badge>["variant"];
  tone?: OperationTileTone;
  tooltip: string;
  ariaLabel?: string;
}>;

const TILE_TONE_CLASSNAME = {
  default:
    "bg-card text-foreground hover:border-foreground/20 hover:bg-accent/45",
  primary:
    "bg-primary/[0.055] text-foreground hover:border-primary/35 hover:bg-primary/[0.09]",
  success:
    "bg-success/[0.055] text-foreground hover:border-success/35 hover:bg-success/[0.09]",
  warning:
    "bg-warning/[0.06] text-foreground hover:border-warning/40 hover:bg-warning/[0.1]",
  destructive:
    "bg-destructive/[0.05] text-foreground hover:border-destructive/35 hover:bg-destructive/[0.09]",
  info: "bg-info/[0.055] text-foreground hover:border-info/35 hover:bg-info/[0.09]",
} as const satisfies Readonly<Record<OperationTileTone, string>>;

const TILE_ICON_TONE_CLASSNAME = {
  default: "bg-muted text-muted-readable",
  primary: "bg-primary/12 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/14 text-warning-foreground dark:text-warning",
  destructive: "bg-destructive/12 text-destructive",
  info: "bg-info/12 text-info",
} as const satisfies Readonly<Record<OperationTileTone, string>>;

export function OperationTile({
  title,
  description,
  icon,
  onClick,
  disabled = false,
  status,
  statusVariant = "secondary",
  tone = "default",
  tooltip,
  ariaLabel,
}: OperationTileProps): React.ReactElement {
  const tile = (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel ?? title}
      className={cn(
        "group relative grid min-h-40 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 overflow-hidden rounded-3xl border border-border/70 p-5 text-start shadow-xs shadow-foreground/5 outline-none",
        "transition-[transform,background-color,border-color,box-shadow] duration-[var(--motion-duration-fast)] ease-enterprise hover:-translate-y-0.5 hover:shadow-md hover:shadow-foreground/8 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35 active:translate-y-0",
        "disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none",
        TILE_TONE_CLASSNAME[tone],
      )}
    >
      <span
        className={cn(
          "inline-flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-xs ring-1 ring-inset ring-foreground/5 transition-transform duration-[var(--motion-duration-fast)] ease-enterprise group-hover:scale-[1.03] motion-reduce:transform-none",
          TILE_ICON_TONE_CLASSNAME[tone],
        )}
      >
        {icon}
      </span>

      <span className="grid min-w-0 gap-1.5">
        <span className="text-card-title text-foreground">{title}</span>
        <span className="text-body-sm text-muted-readable text-pretty">
          {description}
        </span>
        {status === undefined ? null : (
          <Badge variant={statusVariant} className="mt-1 w-fit">
            {status}
          </Badge>
        )}
      </span>

      <ChevronRight
        aria-hidden="true"
        className="mt-1 size-5 shrink-0 text-muted-readable transition-transform duration-[var(--motion-duration-fast)] ease-enterprise group-hover:translate-x-0.5 motion-reduce:transform-none"
      />
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {disabled ? (
          <span className="block rounded-3xl" tabIndex={0}>
            {tile}
          </span>
        ) : (
          tile
        )}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-80">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export type WorkflowStep = Readonly<{
  id: string;
  label: string;
  description?: string;
}>;

export type WorkflowStepperProps = Readonly<{
  steps: readonly WorkflowStep[];
  currentStep: number;
  completedThrough?: number;
  label?: string;
  className?: string;
}>;

export function WorkflowStepper({
  steps,
  currentStep,
  completedThrough = currentStep - 1,
  label = "Workflow progress",
  className,
}: WorkflowStepperProps): React.ReactElement {
  return (
    <nav aria-label={label} className={cn("min-w-0", className)}>
      <ol className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
        {steps.map((step, index) => {
          const complete = index <= completedThrough;
          const active = index === currentStep;

          return (
            <li key={step.id} className="min-w-0">
              <div
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex h-full items-start gap-3 rounded-2xl border px-3.5 py-3 transition-[background-color,border-color,box-shadow] duration-[var(--motion-duration-fast)] ease-enterprise motion-reduce:transition-none",
                  active
                    ? "border-primary/40 bg-primary/[0.07] shadow-xs"
                    : complete
                      ? "border-success/30 bg-success/[0.05]"
                      : "border-border/70 bg-muted/25",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-caption font-semibold",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : complete
                        ? "border-success bg-success text-success-foreground"
                        : "border-border bg-background text-muted-readable",
                  )}
                >
                  {complete ? (
                    <Check aria-hidden="true" className="size-3.5" />
                  ) : active ? (
                    <Circle
                      aria-hidden="true"
                      className="size-2.5 fill-current"
                    />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate text-body-sm font-medium text-foreground">
                    {step.label}
                  </span>
                  {step.description === undefined ? null : (
                    <span className="line-clamp-2 text-caption text-muted-readable">
                      {step.description}
                    </span>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export type WorkflowSummaryItemProps = Readonly<{
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}>;

export function WorkflowSummaryItem({
  label,
  value,
  icon,
}: WorkflowSummaryItemProps): React.ReactElement {
  return (
    <div className="grid gap-1 rounded-2xl border border-border/70 bg-muted/25 p-4">
      <span className="flex items-center gap-2 text-caption text-muted-readable">
        {icon}
        {label}
      </span>
      <span className="text-body-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

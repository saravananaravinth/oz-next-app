// oz-next-app/src/features/wallet/ui/credit-note-ui.tsx
import type * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type CreditNoteSurfaceTone =
  "default" | "primary" | "success" | "warning" | "info";

const SURFACE_TONE_CLASSES = {
  default: "border-border/70 bg-card",
  primary:
    "border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card to-card",
  success:
    "border-success/25 bg-gradient-to-br from-success/[0.06] via-card to-card",
  warning:
    "border-warning/30 bg-gradient-to-br from-warning/[0.08] via-card to-card",
  info: "border-info/25 bg-gradient-to-br from-info/[0.06] via-card to-card",
} as const satisfies Record<CreditNoteSurfaceTone, string>;

const ICON_TONE_CLASSES = {
  default: "border-border/70 bg-muted/55 text-muted-readable",
  primary: "border-primary/25 bg-primary/10 text-primary",
  success: "border-success/25 bg-success/10 text-success",
  warning:
    "border-warning/30 bg-warning/10 text-warning-foreground dark:text-warning",
  info: "border-info/25 bg-info/10 text-info",
} as const satisfies Record<CreditNoteSurfaceTone, string>;

export type CreditNoteSectionProps = Omit<
  React.ComponentProps<"section">,
  "title"
> &
  Readonly<{
    title: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    footer?: React.ReactNode;
    tone?: CreditNoteSurfaceTone;
    padded?: boolean;
    contentClassName?: string;
  }>;

export function CreditNoteSection({
  title,
  description,
  icon,
  actions,
  footer,
  tone = "default",
  padded = true,
  contentClassName,
  className,
  children,
  ...props
}: CreditNoteSectionProps): React.ReactElement {
  return (
    <section className={cn("min-w-0 scroll-mt-5", className)} {...props}>
      <Card
        className={cn(
          "min-w-0 gap-0 overflow-hidden py-0 shadow-sm shadow-foreground/5",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
          SURFACE_TONE_CLASSES[tone],
        )}
      >
        <CardHeader className="border-b border-border/65 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {icon !== undefined ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border shadow-xs [&_svg]:size-4",
                    ICON_TONE_CLASSES[tone],
                  )}
                >
                  {icon}
                </span>
              ) : null}
              <div className="min-w-0">
                <CardTitle className="text-section-title text-foreground">
                  {title}
                </CardTitle>
                {description !== undefined ? (
                  <CardDescription className="mt-0.5 max-w-4xl text-caption sm:text-body-sm">
                    {description}
                  </CardDescription>
                ) : null}
              </div>
            </div>
            {actions !== undefined ? (
              <div className="flex max-w-full flex-wrap items-end gap-2 xl:justify-end">
                {actions}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent
          className={cn(
            "min-w-0",
            padded ? "px-4 py-4 sm:px-5 sm:py-5" : "px-0 py-0",
            contentClassName,
          )}
        >
          {children}
        </CardContent>
        {footer !== undefined ? (
          <CardFooter className="justify-between gap-3 px-4 py-3 sm:px-5">
            {footer}
          </CardFooter>
        ) : null}
      </Card>
    </section>
  );
}

export type CreditNoteMetricProps = Readonly<{
  label: React.ReactNode;
  value: React.ReactNode;
  caption?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: CreditNoteSurfaceTone;
  emphasis?: boolean;
  className?: string;
}>;

export function CreditNoteMetric({
  label,
  value,
  caption,
  icon,
  tone = "default",
  emphasis = false,
  className,
}: CreditNoteMetricProps): React.ReactElement {
  return (
    <div
      className={cn(
        "group/credit-note-metric min-w-0 rounded-2xl border border-border/65 bg-background/55 p-3.5 shadow-xs",
        "transition-[transform,border-color,box-shadow,background-color] duration-300 ease-enterprise",
        "hover:-translate-y-0.5 hover:border-primary/25 hover:bg-background/80 hover:shadow-sm hover:shadow-foreground/5",
        "motion-reduce:transform-none motion-reduce:transition-none",
        emphasis && "ring-1 ring-primary/10",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon !== undefined ? (
          <span
            aria-hidden="true"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl border [&_svg]:size-4",
              ICON_TONE_CLASSES[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium text-muted-readable">
            {label}
          </p>
          <div
            className={cn(
              "mt-1 min-w-0 font-semibold tracking-tight text-foreground text-tabular",
              emphasis ? "text-xl sm:text-2xl" : "text-body-sm",
            )}
          >
            {value}
          </div>
          {caption !== undefined ? (
            <div className="mt-1 text-caption leading-5 text-muted-readable">
              {caption}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CreditNoteMetricGrid({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn(
        "grid min-w-0 gap-2.5 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
      {...props}
    />
  );
}

export function CreditNoteToolbar({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn(
        "flex max-w-full flex-wrap items-end justify-end gap-2",
        className,
      )}
      {...props}
    />
  );
}

export function CreditNoteTableViewport({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn(
        "hidden min-w-0 overflow-x-auto md:block",
        "[scrollbar-gutter:stable]",
        className,
      )}
      {...props}
    />
  );
}

export function CreditNoteMobileList({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div className={cn("grid gap-3 p-3 md:hidden", className)} {...props} />
  );
}

export function CreditNoteInset({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/65 bg-muted/25 p-3.5",
        className,
      )}
      {...props}
    />
  );
}

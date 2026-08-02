// oz-next-app/src/components/ui/alert.tsx
import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  [
    "group/alert relative grid w-full min-w-0 grid-cols-[minmax(0,1fr)] gap-1 rounded-2xl border px-4 py-3.5 text-start text-body-sm text-foreground shadow-xs",
    "has-data-[slot=alert-action]:grid-cols-[minmax(0,1fr)_auto] has-data-[slot=alert-action]:gap-x-3",
    "has-[>svg]:grid-cols-[auto_minmax(0,1fr)] has-[>svg]:gap-x-3",
    "has-[>svg]:has-data-[slot=alert-action]:grid-cols-[auto_minmax(0,1fr)_auto]",
    "[&>svg]:pointer-events-none [&>svg]:row-span-2 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
    "[&>svg]:text-muted-readable",
    "[&_[data-slot=alert-description]]:text-muted-readable",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-border/70 bg-card text-card-foreground shadow-foreground/5",
        destructive: [
          "border-destructive/25 bg-destructive/5",
          "dark:border-destructive/35 dark:bg-destructive/10",
          "[&>svg]:text-destructive",
        ].join(" "),
        success: [
          "border-success/25 bg-success/5",
          "dark:border-success/35 dark:bg-success/10",
          "[&>svg]:text-success",
        ].join(" "),
        warning: [
          "border-warning/30 bg-warning/10",
          "dark:border-warning/35 dark:bg-warning/10",
          "[&>svg]:text-warning-foreground dark:[&>svg]:text-warning",
        ].join(" "),
        info: [
          "border-info/25 bg-info/5",
          "dark:border-info/35 dark:bg-info/10",
          "[&>svg]:text-info",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type AlertProps = ComponentProps<"div"> & VariantProps<typeof alertVariants>;
type AlertTitleProps = ComponentProps<"div">;
type AlertDescriptionProps = ComponentProps<"div">;
type AlertActionProps = ComponentProps<"div">;

function Alert({ className, variant, role, ...props }: AlertProps) {
  const resolvedVariant = variant ?? "default";

  return (
    <div
      data-slot="alert"
      data-variant={resolvedVariant}
      role={role ?? (resolvedVariant === "destructive" ? "alert" : "status")}
      className={cn(alertVariants({ variant: resolvedVariant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: AlertTitleProps) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        [
          "min-w-0 text-card-title text-balance",
          "group-has-[>svg]/alert:col-start-2",
          "[&_a]:underline [&_a]:underline-offset-4 [&_a]:transition-colors [&_a]:duration-[var(--motion-duration-fast)] [&_a]:ease-enterprise [&_a]:hover:text-foreground motion-reduce:[&_a]:transition-none",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        [
          "min-w-0 text-body-sm text-balance md:text-pretty",
          "group-has-[>svg]/alert:col-start-2",
          "[&_a]:underline [&_a]:underline-offset-4 [&_a]:transition-colors [&_a]:duration-[var(--motion-duration-fast)] [&_a]:ease-enterprise [&_a]:hover:text-foreground motion-reduce:[&_a]:transition-none",
          "[&_p:not(:last-child)]:mb-3",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: AlertActionProps) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end ps-2 group-has-[>svg]/alert:col-start-3",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertAction, AlertDescription, AlertTitle };
export type {
  AlertActionProps,
  AlertDescriptionProps,
  AlertProps,
  AlertTitleProps,
};

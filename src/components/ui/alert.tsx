// oz-next-app/src/components/ui/alert.tsx
import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  [
    "group/alert relative grid w-full min-w-0 gap-1 rounded-2xl border px-4 py-3.5 text-left text-body-sm shadow-xs",
    "has-data-[slot=alert-action]:pr-16",
    "has-[>svg]:grid-cols-[auto_minmax(0,1fr)] has-[>svg]:gap-x-3",
    "[&>svg]:pointer-events-none [&>svg]:row-span-2 [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
    "[&>svg]:text-current",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "border-border/70 bg-card text-card-foreground shadow-foreground/5",
          "[&_[data-slot=alert-description]]:text-muted-readable",
        ].join(" "),
        destructive: [
          "border-destructive/25 bg-destructive/5 text-destructive",
          "dark:border-destructive/35 dark:bg-destructive/10",
          "[&_[data-slot=alert-description]]:text-destructive/90",
        ].join(" "),
        success: [
          "border-success/25 bg-success/5 text-success",
          "dark:border-success/35 dark:bg-success/10",
          "[&_[data-slot=alert-description]]:text-success/90",
        ].join(" "),
        warning: [
          "border-warning/30 bg-warning/10 text-warning-foreground",
          "dark:border-warning/35 dark:bg-warning/10 dark:text-warning",
          "[&_[data-slot=alert-description]]:text-warning-foreground/80",
          "dark:[&_[data-slot=alert-description]]:text-warning/90",
        ].join(" "),
        info: [
          "border-info/25 bg-info/5 text-info",
          "dark:border-info/35 dark:bg-info/10",
          "[&_[data-slot=alert-description]]:text-info/90",
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

function Alert({ className, variant, role = "alert", ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role={role}
      className={cn(alertVariants({ variant }), className)}
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
          "[&_a]:underline [&_a]:underline-offset-4 [&_a]:transition-colors [&_a]:hover:text-foreground",
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
          "[&_a]:underline [&_a]:underline-offset-4 [&_a]:transition-colors [&_a]:hover:text-foreground",
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
        "absolute right-3 top-3 flex items-center gap-2",
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

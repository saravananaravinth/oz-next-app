// oz-next-app/src/components/ui/empty.tsx
import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Empty({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/70 bg-card/40 p-6 text-center text-balance",
        className,
      )}
      {...props}
    />
  );
}

function EmptyHeader({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex max-w-sm flex-col items-center gap-2", className)}
      {...props}
    />
  );
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent text-muted-readable",
        icon: "flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/70 text-foreground shadow-sm [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function EmptyMedia({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof emptyMediaVariants>): React.ReactElement {
  const resolvedVariant = variant ?? "default";

  return (
    <div
      data-slot="empty-icon"
      data-variant={resolvedVariant}
      className={cn(
        emptyMediaVariants({ variant: resolvedVariant, className }),
      )}
      {...props}
    />
  );
}

function EmptyTitle({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      data-slot="empty-title"
      className={cn("text-card-title", className)}
      {...props}
    />
  );
}

function EmptyDescription({
  className,
  ...props
}: React.ComponentProps<"p">): React.ReactElement {
  return (
    <p
      data-slot="empty-description"
      className={cn(
        "text-body-sm text-muted-readable [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className,
      )}
      {...props}
    />
  );
}

function EmptyContent({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full max-w-sm min-w-0 flex-col items-center gap-2.5 text-balance text-body-sm",
        className,
      )}
      {...props}
    />
  );
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
};

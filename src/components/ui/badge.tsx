// oz-next-app/src/components/ui/badge.tsx
import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent bg-clip-padding px-2.5 py-0.5 text-caption [font-weight:var(--typography-emphasis-weight)] whitespace-nowrap outline-none select-none",
    "transition-[background-color,border-color,color,box-shadow,opacity] duration-200 ease-out",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
    "has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
    "[&>svg]:pointer-events-none [&>svg]:size-3! [&>svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 [a]:hover:bg-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40",
        warning:
          "border-warning/30 bg-warning/10 text-warning-foreground focus-visible:ring-warning/25 [a]:hover:bg-warning/15 dark:bg-warning/15 dark:focus-visible:ring-warning/40",
        outline:
          "border-border bg-background/70 text-foreground [a]:hover:bg-muted",
        ghost:
          "text-muted-readable hover:bg-muted hover:text-foreground dark:hover:bg-muted/60",
        link: "rounded-md border-transparent bg-transparent px-0 text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    readonly asChild?: boolean;
  };

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Component = asChild ? Slot.Root : "span";
  const resolvedVariant = variant ?? "default";

  return (
    <Component
      data-slot="badge"
      data-variant={resolvedVariant}
      className={cn(badgeVariants({ variant: resolvedVariant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants, type BadgeProps };

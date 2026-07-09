// oz-next-app/src/components/ui/toggle.tsx
"use client";

import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  [
    "group/toggle inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-transparent text-body-sm [font-weight:var(--typography-emphasis-weight)] whitespace-nowrap outline-none select-none",
    "transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-200 ease-out",
    "hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
    "aria-pressed:bg-muted data-[state=on]:bg-muted data-[state=on]:text-foreground",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border-input bg-background/70 shadow-xs hover:bg-muted dark:bg-input/30 dark:hover:bg-input/50",
      },
      size: {
        default:
          "h-10 min-w-10 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        sm: "h-8 min-w-8 rounded-xl px-2.5 text-caption has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 min-w-11 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ToggleProps = React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>;

function Toggle({ className, variant, size, ...props }: ToggleProps) {
  const resolvedVariant = variant ?? "default";
  const resolvedSize = size ?? "default";

  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      className={cn(
        toggleVariants({
          variant: resolvedVariant,
          size: resolvedSize,
          className,
        }),
      )}
      {...props}
    />
  );
}

export { Toggle, toggleVariants, type ToggleProps };

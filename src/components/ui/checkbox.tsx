// oz-next-app/src/components/ui/checkbox.tsx
"use client";

import type { ComponentPropsWithoutRef } from "react";
import { CheckIcon, MinusIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

type CheckboxProps = ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>;

function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        [
          "peer relative flex size-4 shrink-0 items-center justify-center rounded-md border border-input bg-background text-primary-foreground shadow-xs outline-none",
          "transition-[background-color,border-color,box-shadow,color] motion-reduce:transition-none",
          "after:absolute after:-inset-x-3 after:-inset-y-2",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50 group-has-disabled/field:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          "dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
          "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
          "dark:data-[state=checked]:bg-primary dark:data-[state=indeterminate]:bg-primary",
        ].join(" "),
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={cn(
          "grid place-content-center text-current transition-none [&>svg]:col-start-1 [&>svg]:row-start-1 [&>svg]:size-3.5",
          "data-[state=checked]:[&>[data-slot=checkbox-minus]]:hidden",
          "data-[state=indeterminate]:[&>[data-slot=checkbox-check]]:hidden",
          "data-[state=indeterminate]:[&>[data-slot=checkbox-minus]]:block",
        )}
      >
        <CheckIcon aria-hidden="true" data-slot="checkbox-check" />
        <MinusIcon
          aria-hidden="true"
          className="hidden"
          data-slot="checkbox-minus"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
export type { CheckboxProps };

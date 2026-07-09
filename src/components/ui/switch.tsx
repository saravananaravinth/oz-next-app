// oz-next-app/src/components/ui/switch.tsx
"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

type SwitchSize = "sm" | "default";

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  readonly size?: SwitchSize;
}): React.ReactElement {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent outline-none after:absolute after:-inset-x-3 after:-inset-y-2 transition-[background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        "data-[size=default]:h-5 data-[size=default]:w-9 data-[size=sm]:h-4 data-[size=sm]:w-7 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input data-checked:bg-primary data-unchecked:bg-input dark:data-[state=unchecked]:bg-input/80 dark:data-unchecked:bg-input/80 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-background shadow-sm ring-0 transition-transform duration-200 motion-reduce:transition-none group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-[state=checked]:translate-x-4 group-data-[size=default]/switch:data-checked:translate-x-4 group-data-[size=sm]/switch:data-[state=checked]:translate-x-3 group-data-[size=sm]/switch:data-checked:translate-x-3 group-data-[size=default]/switch:data-[state=unchecked]:translate-x-0 group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-[state=unchecked]:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0 dark:data-[state=checked]:bg-primary-foreground dark:data-checked:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground dark:data-unchecked:bg-foreground"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

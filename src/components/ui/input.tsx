// oz-next-app/src/components/ui/input.tsx
import type * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input">;

const INPUT_CLASS_NAME = [
  "flex h-11 w-full min-w-0 rounded-2xl border border-input bg-background/80 px-3 py-2 text-body-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground/80",
  "transition-[background-color,border-color,box-shadow,color] duration-200 ease-out selection:bg-primary/20 selection:text-foreground",
  "file:mr-3 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-caption file:[font-weight:var(--typography-emphasis-weight)] file:text-foreground",
  "enabled:hover:border-ring/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground disabled:opacity-60",
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:enabled:hover:border-ring/50 dark:disabled:bg-input/20 dark:aria-invalid:border-destructive/60 dark:aria-invalid:ring-destructive/30",
].join(" ");

function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(INPUT_CLASS_NAME, className)}
      {...props}
    />
  );
}

export { Input };

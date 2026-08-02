// oz-next-app/src/components/ui/textarea.tsx
import type * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = Omit<
  React.ComponentProps<"textarea">,
  "placeholder"
> &
  Readonly<{ placeholder: string }>;

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        [
          "flex field-sizing-content min-h-24 w-full min-w-0 resize-y rounded-2xl border border-input bg-background px-3 py-2.5 text-body-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground/80",
          "transition-[background-color,border-color,box-shadow,color] duration-[var(--motion-duration-fast)] ease-enterprise selection:bg-primary/20 selection:text-foreground motion-reduce:transition-none",
          "enabled:hover:border-ring/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground disabled:opacity-60",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:enabled:hover:border-ring/50 dark:disabled:bg-input/20 dark:aria-invalid:border-destructive/60 dark:aria-invalid:ring-destructive/30",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

// oz-next-app/src/components/ui/progress.tsx
"use client";

import type * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const MIN_PROGRESS_VALUE = 0;
const MAX_PROGRESS_VALUE = 100;

function normalizeProgressValue(
  value: number | null | undefined,
): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(MAX_PROGRESS_VALUE, Math.max(MIN_PROGRESS_VALUE, value));
}

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const normalizedValue = normalizeProgressValue(value);
  const translateX =
    normalizedValue === null ? 0 : MAX_PROGRESS_VALUE - normalizedValue;

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={normalizedValue}
      className={cn(
        "relative flex h-2 w-full items-center overflow-hidden rounded-full bg-muted",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 bg-primary transition-transform duration-300 ease-out data-[state=indeterminate]:animate-pulse motion-reduce:transition-none motion-reduce:data-[state=indeterminate]:animate-none"
        style={{ transform: `translateX(-${String(translateX)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

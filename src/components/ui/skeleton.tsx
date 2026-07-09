// oz-next-app/src/components/ui/skeleton.tsx
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export type SkeletonProps = Readonly<ComponentPropsWithoutRef<"div">>;

function Skeleton({
  className,
  "aria-hidden": ariaHidden = true,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden={ariaHidden}
      data-slot="skeleton"
      className={cn(
        "pointer-events-none relative overflow-hidden rounded-2xl bg-muted/70 motion-safe:animate-pulse motion-reduce:animate-none dark:bg-muted/50",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };

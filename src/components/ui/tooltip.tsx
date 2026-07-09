// oz-next-app/src/components/ui/tooltip.tsx
"use client";

import type { ComponentProps } from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

type TooltipProviderProps = ComponentProps<typeof TooltipPrimitive.Provider>;
type TooltipProps = ComponentProps<typeof TooltipPrimitive.Root>;
type TooltipTriggerProps = ComponentProps<typeof TooltipPrimitive.Trigger>;
type TooltipContentProps = ComponentProps<typeof TooltipPrimitive.Content>;

const TOOLTIP_CONTENT_CLASSNAME =
  "z-50 inline-flex w-fit max-w-[min(20rem,calc(100vw-2rem))] origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 break-words rounded-xl border border-border/80 bg-popover/95 px-3 py-2 text-caption text-popover-foreground shadow-lg backdrop-blur-xl select-none has-data-[slot=kbd]:gap-2 has-data-[slot=kbd]:pr-2 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:duration-150 data-open:duration-150 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:rounded-md **:data-[slot=kbd]:border **:data-[slot=kbd]:border-border/70 **:data-[slot=kbd]:bg-muted **:data-[slot=kbd]:px-1.5 **:data-[slot=kbd]:py-0.5 **:data-[slot=kbd]:text-tabular";

const TOOLTIP_ARROW_CLASSNAME = "z-50 size-2.5 fill-popover stroke-border";

function TooltipProvider({
  delayDuration = 220,
  skipDelayDuration = 80,
  ...props
}: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  );
}

function Tooltip({ ...props }: TooltipProps) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: TooltipTriggerProps) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 8,
  collisionPadding = 12,
  children,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(TOOLTIP_CONTENT_CLASSNAME, className)}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow
          data-slot="tooltip-arrow"
          className={TOOLTIP_ARROW_CLASSNAME}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };

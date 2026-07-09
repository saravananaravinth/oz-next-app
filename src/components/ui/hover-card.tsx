// oz-next-app/src/components/ui/hover-card.tsx
"use client";

import * as React from "react";
import { HoverCard as HoverCardPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function HoverCard({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>): React.ReactElement {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger({
  ...props
}: React.ComponentProps<
  typeof HoverCardPrimitive.Trigger
>): React.ReactElement {
  return (
    <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  );
}

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 6,
  ...props
}: React.ComponentProps<
  typeof HoverCardPrimitive.Content
>): React.ReactElement {
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-64 origin-[var(--radix-hover-card-content-transform-origin)] rounded-2xl border border-border/70 bg-popover/95 p-3 text-body-sm text-popover-foreground shadow-lg outline-hidden backdrop-blur-xl duration-150 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 motion-reduce:duration-0",
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };

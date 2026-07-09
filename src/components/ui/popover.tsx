// oz-next-app/src/components/ui/popover.tsx
"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>): React.ReactElement {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>): React.ReactElement {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>): React.ReactElement {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-3 rounded-3xl border border-border/70 bg-popover/95 p-3 text-popover-foreground shadow-lg shadow-foreground/5 ring-1 ring-foreground/5 outline-none backdrop-blur-xl",
          "duration-200 ease-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:duration-0 motion-reduce:data-[state=open]:zoom-in-100 motion-reduce:data-[state=closed]:zoom-out-100",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>): React.ReactElement {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverHeader({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function PopoverTitle({
  className,
  ...props
}: React.ComponentProps<"h2">): React.ReactElement {
  return (
    <h2
      data-slot="popover-title"
      className={cn("text-card-title text-foreground", className)}
      {...props}
    />
  );
}

function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<"p">): React.ReactElement {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-body-sm text-muted-readable", className)}
      {...props}
    />
  );
}

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
};

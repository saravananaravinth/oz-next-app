// oz-next-app/src/components/ui/sheet.tsx
"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SheetSide = "top" | "right" | "bottom" | "left";

type SheetContentProps = React.ComponentPropsWithoutRef<
  typeof SheetPrimitive.Content
> &
  Readonly<{
    side?: SheetSide;
    showCloseButton?: boolean;
  }>;

const sheetSideClassNames = {
  top: [
    "inset-x-0 top-0 h-auto max-h-[calc(100dvh-1rem)] rounded-b-3xl border-b safe-pt",
    "data-open:slide-in-from-top-10 data-closed:slide-out-to-top-10",
  ].join(" "),
  right: [
    "inset-y-0 right-0 h-full w-[min(28rem,calc(100vw-1rem))] rounded-l-3xl border-l",
    "data-open:slide-in-from-right-10 data-closed:slide-out-to-right-10",
  ].join(" "),
  bottom: [
    "inset-x-0 bottom-0 h-auto max-h-[calc(100dvh-1rem)] rounded-t-3xl border-t safe-pb",
    "data-open:slide-in-from-bottom-10 data-closed:slide-out-to-bottom-10",
  ].join(" "),
  left: [
    "inset-y-0 left-0 h-full w-[min(28rem,calc(100vw-1rem))] rounded-r-3xl border-r",
    "data-open:slide-in-from-left-10 data-closed:slide-out-to-left-10",
  ].join(" "),
} as const satisfies Record<SheetSide, string>;

function Sheet({
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        [
          "fixed inset-0 z-50 bg-black/20 transition-opacity duration-200 ease-out dark:bg-black/55",
          "supports-backdrop-filter:bg-black/10 supports-backdrop-filter:backdrop-blur-md dark:supports-backdrop-filter:bg-black/35",
          "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          [
            "fixed z-50 flex max-w-full flex-col gap-0 overflow-y-auto overscroll-contain bg-popover/95 bg-clip-padding text-body-sm text-popover-foreground shadow-2xl outline-none scrollbar-stable",
            "transition-[opacity,transform] duration-200 ease-out",
            "supports-backdrop-filter:bg-popover/85 supports-backdrop-filter:backdrop-blur-xl",
            "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
            sheetSideClassNames[side],
          ].join(" "),
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button
              aria-label="Close sheet"
              className="absolute top-4 right-4 z-10 rounded-full text-muted-foreground hover:text-foreground"
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <XIcon aria-hidden="true" />
              <span className="sr-only">Close sheet</span>
            </Button>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 px-5 py-5 pr-14", className)}
      {...props}
    />
  );
}

function SheetFooter({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex flex-col gap-2 border-t bg-popover/80 px-5 py-4 supports-backdrop-filter:backdrop-blur-md sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-card-title text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-body-sm text-muted-readable", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};

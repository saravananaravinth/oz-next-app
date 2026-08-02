// oz-next-app/src/components/ui/dialog.tsx
"use client";

import type * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/30 duration-[var(--motion-duration-fast)] ease-enterprise dark:bg-black/65 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

type DialogContentHeight = "compact" | "default" | "tall" | "viewport";

const DIALOG_CONTENT_MAX_HEIGHT = {
  compact: "min(82dvh, 36rem)",
  default: "min(88dvh, 52rem)",
  tall: "min(92dvh, 62rem)",
  viewport: "calc(100dvh - 1rem)",
} as const satisfies Readonly<Record<DialogContentHeight, string>>;

type DialogContentProps = React.ComponentProps<
  typeof DialogPrimitive.Content
> & {
  readonly height?: DialogContentHeight;
  readonly showCloseButton?: boolean;
};

function DialogContent({
  className,
  children,
  height = "default",
  showCloseButton = true,
  style,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />

      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-height={height}
        data-show-close-button={showCloseButton ? "true" : "false"}
        className={cn(
          [
            "group/dialog-content fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-1rem)] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto overscroll-contain rounded-3xl border border-border/80 bg-popover p-6 text-popover-foreground shadow-xl shadow-foreground/10 outline-none scrollbar-stable sm:max-w-lg",
            "has-data-[slot=dialog-body]:flex has-data-[slot=dialog-body]:flex-col has-data-[slot=dialog-body]:gap-0 has-data-[slot=dialog-body]:overflow-hidden has-data-[slot=dialog-body]:p-0",
            "duration-[var(--motion-duration-fast)] ease-enterprise data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 motion-reduce:animate-none",
          ].join(" "),
          className,
        )}
        style={{
          ...style,
          maxHeight: DIALOG_CONTENT_MAX_HEIGHT[height],
        }}
        {...props}
      >
        {children}

        {showCloseButton ? (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              aria-label="Close dialog"
              variant="ghost"
              className="absolute top-3 end-3 z-30 rounded-full bg-popover/85 shadow-xs backdrop-blur-sm"
              size="icon-sm"
            >
              <XIcon aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "sticky top-0 z-20 -mx-6 -mt-6 flex shrink-0 flex-col gap-2 border-b border-border/70 bg-popover px-6 py-5 group-data-[show-close-button=true]/dialog-content:pe-12",
        "group-has-data-[slot=dialog-body]/dialog-content:static group-has-data-[slot=dialog-body]/dialog-content:mx-0 group-has-data-[slot=dialog-body]/dialog-content:mt-0 group-has-data-[slot=dialog-body]/dialog-content:border-b group-has-data-[slot=dialog-body]/dialog-content:border-border/70 group-has-data-[slot=dialog-body]/dialog-content:bg-popover group-has-data-[slot=dialog-body]/dialog-content:px-6 group-has-data-[slot=dialog-body]/dialog-content:py-5",
        className,
      )}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 scrollbar-stable",
        className,
      )}
      {...props}
    />
  );
}

type DialogFooterProps = React.ComponentProps<"div"> & {
  readonly showCloseButton?: boolean;
};

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: DialogFooterProps) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "sticky bottom-0 z-20 -mx-6 -mb-6 flex shrink-0 flex-col-reverse gap-2 rounded-b-3xl border-t border-border/80 bg-muted/80 p-4 backdrop-blur-xl sm:flex-row sm:justify-end",
        "group-has-data-[slot=dialog-body]/dialog-content:static group-has-data-[slot=dialog-body]/dialog-content:m-0 group-has-data-[slot=dialog-body]/dialog-content:rounded-none group-has-data-[slot=dialog-body]/dialog-content:bg-muted/70 group-has-data-[slot=dialog-body]/dialog-content:px-6 group-has-data-[slot=dialog-body]/dialog-content:py-4 group-has-data-[slot=dialog-body]/dialog-content:backdrop-blur-xl",
        className,
      )}
      {...props}
    >
      {children}

      {showCloseButton ? (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      ) : null}
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-card-title text-foreground", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-body-sm text-muted-readable text-pretty *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  type DialogContentHeight,
  type DialogContentProps,
  type DialogFooterProps,
};

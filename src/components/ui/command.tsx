// oz-next-app/src/components/ui/command.tsx
"use client";

import type * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { CheckIcon, SearchIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-2xl bg-popover p-1 text-popover-foreground",
        className,
      )}
      {...props}
    />
  );
}

type CommandDialogProps = React.ComponentProps<typeof Dialog> & {
  readonly title?: string;
  readonly description?: string;
  readonly className?: string;
  readonly showCloseButton?: boolean;
};

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run.",
  children,
  className,
  showCloseButton = false,
  ...props
}: CommandDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent
        className={cn(
          "top-1/3 translate-y-0 overflow-hidden rounded-3xl p-0 sm:max-w-xl",
          className,
        )}
        showCloseButton={showCloseButton}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="p-2 pb-0">
      <InputGroup className="h-10 rounded-2xl border-input/60 bg-muted/50 shadow-none *:data-[slot=input-group-addon]:pl-3">
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "w-full bg-transparent text-body-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
        <InputGroupAddon>
          <SearchIcon
            aria-hidden="true"
            className="size-4 shrink-0 opacity-60"
          />
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "scrollbar-stable max-h-80 scroll-py-2 overflow-x-hidden overflow-y-auto p-1 outline-none",
        className,
      )}
      {...props}
    />
  );
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn(
        "py-8 text-center text-body-sm text-muted-readable",
        className,
      )}
      {...props}
    />
  );
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-overline **:[[cmdk-group-heading]]:text-muted-readable",
        className,
      )}
      {...props}
    />
  );
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 my-1 h-px bg-border/80", className)}
      {...props}
    />
  );
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        [
          "group/command-item relative flex cursor-default items-center gap-2 rounded-xl px-2.5 py-2 text-body-sm outline-none select-none",
          "transition-[background-color,color] duration-150 ease-out",
          "in-data-[slot=dialog-content]:rounded-xl data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
          "data-selected:bg-accent data-selected:text-accent-foreground data-selected:*:[svg]:text-accent-foreground",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        ].join(" "),
        className,
      )}
      {...props}
    >
      {children}
      <CheckIcon
        aria-hidden="true"
        className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100"
      />
    </CommandPrimitive.Item>
  );
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-caption text-tabular text-muted-readable group-data-selected/command-item:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  type CommandDialogProps,
};

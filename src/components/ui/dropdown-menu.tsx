// oz-next-app/src/components/ui/dropdown-menu.tsx
"use client";

import type * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { CheckIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  );
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  align = "start",
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        align={align}
        className={cn(
          [
            "z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[max(10rem,var(--radix-dropdown-menu-trigger-width))] origin-[var(--radix-dropdown-menu-content-transform-origin)] overflow-x-hidden overflow-y-auto rounded-2xl border border-border/80 bg-popover/95 p-1.5 text-popover-foreground shadow-xl shadow-foreground/5 outline-none supports-[backdrop-filter]:backdrop-blur-xl",
            "duration-150 ease-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:overflow-hidden",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          ].join(" "),
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  );
}

type DropdownMenuItemProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Item
> & {
  readonly inset?: boolean;
  readonly variant?: "default" | "destructive";
};

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        [
          "group/dropdown-menu-item relative flex cursor-default items-center gap-2 rounded-xl px-2.5 py-2 text-body-sm outline-none select-none",
          "transition-[background-color,color] duration-150 ease-out",
          "focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
          "not-data-[variant=destructive]:focus:**:text-accent-foreground not-data-[variant=destructive]:data-[highlighted]:**:text-accent-foreground",
          "data-inset:pl-8 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          "data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:data-[highlighted]:bg-destructive/10 data-[variant=destructive]:data-[highlighted]:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 dark:data-[variant=destructive]:data-[highlighted]:bg-destructive/20",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

type DropdownMenuCheckboxItemProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.CheckboxItem
> & {
  readonly inset?: boolean;
};

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: DropdownMenuCheckboxItemProps) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        [
          "relative flex cursor-default items-center gap-2 rounded-xl py-2 pr-8 pl-2.5 text-body-sm outline-none select-none",
          "transition-[background-color,color] duration-150 ease-out",
          "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[highlighted]:**:text-accent-foreground",
          "data-inset:pl-8 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        ].join(" "),
        className,
      )}
      {...(checked !== undefined && { checked })}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2.5 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon aria-hidden="true" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

type DropdownMenuRadioItemProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.RadioItem
> & {
  readonly inset?: boolean;
};

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: DropdownMenuRadioItemProps) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        [
          "relative flex cursor-default items-center gap-2 rounded-xl py-2 pr-8 pl-2.5 text-body-sm outline-none select-none",
          "transition-[background-color,color] duration-150 ease-out",
          "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[highlighted]:**:text-accent-foreground",
          "data-inset:pl-8 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        ].join(" "),
        className,
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2.5 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon aria-hidden="true" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

type DropdownMenuLabelProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Label
> & {
  readonly inset?: boolean;
};

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: DropdownMenuLabelProps) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2.5 py-1.5 text-overline text-muted-readable data-inset:pl-8",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border/80", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-caption text-tabular text-muted-readable group-focus/dropdown-menu-item:text-accent-foreground group-data-[highlighted]/dropdown-menu-item:text-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

type DropdownMenuSubTriggerProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.SubTrigger
> & {
  readonly inset?: boolean;
};

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: DropdownMenuSubTriggerProps) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        [
          "flex cursor-default items-center gap-2 rounded-xl px-2.5 py-2 text-body-sm outline-none select-none",
          "transition-[background-color,color] duration-150 ease-out",
          "focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          "not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:pl-8",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        ].join(" "),
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon aria-hidden="true" className="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        [
          "z-50 min-w-40 origin-[var(--radix-dropdown-menu-content-transform-origin)] overflow-hidden rounded-2xl border border-border/80 bg-popover/95 p-1.5 text-popover-foreground shadow-xl shadow-foreground/5 outline-none supports-[backdrop-filter]:backdrop-blur-xl",
          "duration-150 ease-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};

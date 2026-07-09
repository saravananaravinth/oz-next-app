// oz-next-app/src/components/ui/combobox.tsx
"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

const Combobox = ComboboxPrimitive.Root;

type ComboboxInputProps = ComboboxPrimitive.Input.Props &
  Readonly<{
    showTrigger?: boolean;
    showClear?: boolean;
  }>;

function ComboboxValue({
  ...props
}: ComboboxPrimitive.Value.Props): React.ReactElement {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      {children}
      <ChevronDownIcon
        className="pointer-events-none size-4 text-muted-readable"
        aria-hidden="true"
      />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxClear({
  className,
  ...props
}: ComboboxPrimitive.Clear.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={cn(className)}
      {...props}
    >
      <XIcon className="pointer-events-none" aria-hidden="true" />
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxInputProps): React.ReactElement {
  return (
    <InputGroup className={cn("w-auto", className)}>
      <ComboboxPrimitive.Input
        render={<InputGroupInput disabled={disabled} />}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        {showTrigger ? (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            asChild
            data-slot="input-group-button"
            className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
            disabled={disabled}
          >
            <ComboboxTrigger />
          </InputGroupButton>
        ) : null}
        {showClear ? <ComboboxClear disabled={disabled} /> : null}
      </InputGroupAddon>
      {children}
    </InputGroup>
  );
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >): React.ReactElement {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={anchor !== undefined}
          className={cn(
            "group/combobox-content relative max-h-[var(--available-height)] w-[var(--anchor-width)] max-w-[var(--available-width)] min-w-[calc(var(--anchor-width)+1.75rem)] origin-[var(--transform-origin)] overflow-hidden rounded-2xl border border-border/70 bg-popover/95 text-popover-foreground shadow-lg backdrop-blur-xl duration-150 data-[chips=true]:min-w-[var(--anchor-width)] data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:shadow-none data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 motion-reduce:duration-0",
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({
  className,
  ...props
}: ComboboxPrimitive.List.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "scrollbar-stable max-h-[min(18rem,calc(var(--available-height)-2.25rem))] scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-xl py-1 pr-8 pl-1.5 text-body-sm outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" aria-hidden="true" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxGroup({
  className,
  ...props
}: ComboboxPrimitive.Group.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn(className)}
      {...props}
    />
  );
}

function ComboboxLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn("px-2 py-1.5 text-caption text-muted-readable", className)}
      {...props}
    />
  );
}

function ComboboxCollection({
  ...props
}: ComboboxPrimitive.Collection.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
  );
}

function ComboboxEmpty({
  className,
  ...props
}: ComboboxPrimitive.Empty.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "hidden w-full justify-center py-3 text-center text-body-sm text-muted-readable group-data-empty/combobox-content:flex",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function ComboboxChips({
  className,
  ...props
}: ComboboxPrimitive.Chips.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        "flex min-h-8 flex-wrap items-center gap-1 rounded-2xl border border-input bg-transparent bg-clip-padding px-2.5 py-1 text-body-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1 dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40 motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean;
}): React.ReactElement {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        "flex h-5 w-fit items-center justify-center gap-1 whitespace-nowrap rounded-md bg-muted px-1.5 text-caption text-foreground [font-weight:var(--typography-emphasis-weight)] has-data-[slot=combobox-chip-remove]:pr-0 has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {showRemove ? (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" size="icon-xs" />}
          className="-ml-1 opacity-60 hover:opacity-100"
          data-slot="combobox-chip-remove"
        >
          <XIcon className="pointer-events-none" aria-hidden="true" />
        </ComboboxPrimitive.ChipRemove>
      ) : null}
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props): React.ReactElement {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn(
        "min-w-16 flex-1 bg-transparent text-body-sm outline-none",
        className,
      )}
      {...props}
    />
  );
}

function useComboboxAnchor(): React.RefObject<HTMLDivElement | null> {
  return React.useRef<HTMLDivElement | null>(null);
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
};

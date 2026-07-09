// oz-next-app/src/components/ui/input-group.tsx
"use client";

import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function isElement(value: EventTarget | null): value is Element {
  return value instanceof Element;
}

function focusNearestInputGroupControl(addonElement: HTMLElement): void {
  const control = addonElement.parentElement?.querySelector<HTMLElement>(
    "[data-slot='input-group-control'], input, textarea, select",
  );

  control?.focus();
}

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        [
          "group/input-group relative flex h-11 w-full min-w-0 items-center rounded-2xl border border-input bg-background/80 shadow-xs outline-none",
          "transition-[background-color,border-color,box-shadow,color] duration-200 ease-out",
          "in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0",
          "has-disabled:bg-muted/50 has-disabled:opacity-60 dark:bg-input/30 dark:has-disabled:bg-input/20",
          "has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20",
          "has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/30",
          "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto",
          "has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-body-sm text-muted-readable select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-md [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start":
          "order-first pl-3 has-[>button]:ml-[-0.35rem] has-[>kbd]:ml-[-0.15rem]",
        "inline-end":
          "order-last pr-3 has-[>button]:mr-[-0.35rem] has-[>kbd]:mr-[-0.15rem]",
        "block-start":
          "order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5 [.border-b]:pb-2",
        "block-end":
          "order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5 [.border-t]:pt-2",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

type InputGroupAddonProps = React.ComponentProps<"div"> &
  VariantProps<typeof inputGroupAddonVariants>;

function InputGroupAddon({
  className,
  align,
  onClick,
  ...props
}: InputGroupAddonProps) {
  const resolvedAlign = align ?? "inline-start";
  function handleClick(event: React.MouseEvent<HTMLDivElement>): void {
    onClick?.(event);

    if (event.defaultPrevented || !isElement(event.target)) {
      return;
    }

    if (
      event.target.closest(
        "button, a, [role='button'], input, textarea, select",
      )
    ) {
      return;
    }

    focusNearestInputGroupControl(event.currentTarget);
  }

  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={resolvedAlign}
      className={cn(
        inputGroupAddonVariants({ align: resolvedAlign }),
        className,
      )}
      onClick={handleClick}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva(
  "flex items-center gap-2 text-body-sm shadow-none",
  {
    variants: {
      size: {
        xs: "h-7 gap-1 rounded-xl px-2 text-caption [&>svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 rounded-xl px-2.5 text-caption",
        "icon-xs": "size-7 rounded-xl p-0 has-[>svg]:p-0",
        "icon-sm": "size-8 rounded-xl p-0 has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  },
);

type InputGroupButtonProps = Omit<React.ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof inputGroupButtonVariants>;

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size,
  ...props
}: InputGroupButtonProps) {
  const resolvedSize = size ?? "xs";
  return (
    <Button
      type={type}
      data-slot="input-group-button"
      data-size={resolvedSize}
      variant={variant}
      className={cn(
        inputGroupButtonVariants({ size: resolvedSize }),
        className,
      )}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="input-group-text"
      className={cn(
        "flex items-center gap-2 text-body-sm text-muted-readable [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "h-full flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
  type InputGroupAddonProps,
  type InputGroupButtonProps,
};

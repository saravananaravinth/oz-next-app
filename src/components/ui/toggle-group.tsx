// oz-next-app/src/components/ui/toggle-group.tsx
"use client";

import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";

import { toggleVariants } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

type ToggleGroupOrientation = "horizontal" | "vertical";
type ToggleVariant = NonNullable<
  VariantProps<typeof toggleVariants>["variant"]
>;
type ToggleSize = NonNullable<VariantProps<typeof toggleVariants>["size"]>;

type ToggleGroupContextValue = Readonly<{
  variant: ToggleVariant;
  size: ToggleSize;
  spacing: number;
  orientation: ToggleGroupOrientation;
}>;

type ToggleGroupStyle = React.CSSProperties &
  Readonly<{
    "--toggle-group-gap": number;
  }>;

const DEFAULT_TOGGLE_GROUP_CONTEXT = {
  size: "default",
  variant: "default",
  spacing: 2,
  orientation: "horizontal",
} as const satisfies ToggleGroupContextValue;

const MIN_SPACING = 0;
const MAX_SPACING = 6;

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>(
  DEFAULT_TOGGLE_GROUP_CONTEXT,
);

function normalizeSpacing(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_TOGGLE_GROUP_CONTEXT.spacing;
  }

  return Math.min(MAX_SPACING, Math.max(MIN_SPACING, Math.floor(value)));
}

type ToggleGroupProps = React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants> & {
    readonly spacing?: number;
    readonly orientation?: ToggleGroupOrientation;
  };

function ToggleGroup({
  className,
  variant,
  size,
  spacing = DEFAULT_TOGGLE_GROUP_CONTEXT.spacing,
  orientation = DEFAULT_TOGGLE_GROUP_CONTEXT.orientation,
  children,
  style,
  ...props
}: ToggleGroupProps) {
  const resolvedVariant = variant ?? DEFAULT_TOGGLE_GROUP_CONTEXT.variant;
  const resolvedSize = size ?? DEFAULT_TOGGLE_GROUP_CONTEXT.size;
  const resolvedSpacing = normalizeSpacing(spacing);
  const resolvedStyle: ToggleGroupStyle = {
    ...style,
    "--toggle-group-gap": resolvedSpacing,
  };

  const context = React.useMemo<ToggleGroupContextValue>(
    () => ({
      variant: resolvedVariant,
      size: resolvedSize,
      spacing: resolvedSpacing,
      orientation,
    }),
    [orientation, resolvedSize, resolvedSpacing, resolvedVariant],
  );

  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      data-spacing={resolvedSpacing}
      data-orientation={orientation}
      orientation={orientation}
      style={resolvedStyle}
      className={cn(
        "group/toggle-group flex w-fit flex-row items-center gap-[calc(var(--toggle-group-gap)*0.25rem)] rounded-2xl data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[size=sm]:rounded-xl",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider value={context}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

type ToggleGroupItemProps = React.ComponentProps<
  typeof ToggleGroupPrimitive.Item
> &
  VariantProps<typeof toggleVariants>;

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: ToggleGroupItemProps) {
  const context = React.useContext(ToggleGroupContext);

  void variant;
  void size;

  const resolvedVariant = context.variant;
  const resolvedSize = context.size;

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={resolvedVariant}
      data-size={resolvedSize}
      data-spacing={context.spacing}
      className={cn(
        [
          "shrink-0 focus:z-10 focus-visible:z-10",
          "group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2",
          "group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-1.5 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-1.5",
          "group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:first:rounded-l-2xl group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:last:rounded-r-2xl",
          "group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:first:rounded-t-2xl group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:last:rounded-b-2xl",
          "group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l",
          "group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-[orientation=vertical]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        ].join(" "),
        toggleVariants({ variant: resolvedVariant, size: resolvedSize }),
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export {
  ToggleGroup,
  ToggleGroupItem,
  type ToggleGroupContextValue,
  type ToggleGroupItemProps,
  type ToggleGroupOrientation,
  type ToggleGroupProps,
};

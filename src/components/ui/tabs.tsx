// oz-next-app/src/components/ui/tabs.tsx
"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>): React.ReactElement {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-3 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:flex-row",
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center text-muted-readable data-[variant=line]:rounded-none data-[variant=line]:bg-transparent group-data-[orientation=horizontal]/tabs:h-10 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default:
          "rounded-2xl border border-border/70 bg-muted/70 p-1 shadow-xs backdrop-blur-sm",
        line: "gap-1 border-b border-border/80 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>): React.ReactElement {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>): React.ReactElement {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex min-h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-transparent px-3 py-1.5 text-body-sm text-muted-readable transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out select-none motion-reduce:transition-none",
        "hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        "group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start",
        "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs data-active:bg-background data-active:text-foreground data-active:shadow-xs dark:data-[state=active]:bg-input/45 dark:data-active:bg-input/45",
        "group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:px-2 group-data-[variant=line]/tabs-list:shadow-none group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity after:duration-200 motion-reduce:after:transition-none group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        "group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:-bottom-px group-data-[orientation=horizontal]/tabs:after:h-px group-data-[orientation=vertical]/tabs:after:inset-y-1 group-data-[orientation=vertical]/tabs:after:right-0 group-data-[orientation=vertical]/tabs:after:w-px",
        "[font-weight:var(--typography-emphasis-weight)] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>): React.ReactElement {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("min-w-0 flex-1 text-body outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };

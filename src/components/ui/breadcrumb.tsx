// oz-next-app/src/components/ui/breadcrumb.tsx
import type * as React from "react";
import { Slot } from "radix-ui";
import { ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Breadcrumb({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      className={cn("min-w-0", className)}
      {...props}
    />
  );
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-1.5 break-words text-body-sm text-muted-readable",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn("inline-flex min-w-0 items-center gap-1", className)}
      {...props}
    />
  );
}

type BreadcrumbLinkProps = React.ComponentProps<"a"> & {
  readonly asChild?: boolean;
};

function BreadcrumbLink({
  asChild = false,
  className,
  ...props
}: BreadcrumbLinkProps) {
  const Component = asChild ? Slot.Root : "a";

  return (
    <Component
      data-slot="breadcrumb-link"
      className={cn(
        "min-w-0 truncate rounded-md text-muted-readable transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-current="page"
      aria-disabled="true"
      data-slot="breadcrumb-page"
      role="link"
      className={cn("min-w-0 truncate text-body-sm text-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      aria-hidden="true"
      data-slot="breadcrumb-separator"
      role="presentation"
      className={cn(
        "flex items-center text-muted-foreground/70 [&>svg]:size-3.5",
        className,
      )}
      {...props}
    >
      {children ?? <ChevronRightIcon aria-hidden="true" />}
    </li>
  );
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-readable [&>svg]:size-4",
        className,
      )}
      {...props}
    >
      <MoreHorizontalIcon aria-hidden="true" />
      <span className="sr-only">More breadcrumb items</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};

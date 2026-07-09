// oz-next-app/src/components/ui/pagination.tsx
import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Pagination({
  className,
  ...props
}: React.ComponentProps<"nav">): React.ReactElement {
  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">): React.ReactElement {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-0.5", className)}
      {...props}
    />
  );
}

function PaginationItem({
  ...props
}: React.ComponentProps<"li">): React.ReactElement {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = Readonly<
  {
    isActive?: boolean;
  } & Pick<React.ComponentProps<typeof Button>, "size"> &
    React.ComponentProps<"a">
>;

function PaginationLink({
  className,
  isActive = false,
  size = "icon",
  ...props
}: PaginationLinkProps): React.ReactElement {
  return (
    <Button
      asChild
      variant={isActive ? "outline" : "ghost"}
      size={size}
      className={cn(className)}
    >
      <a
        aria-current={isActive ? "page" : undefined}
        data-slot="pagination-link"
        data-active={isActive}
        {...props}
      />
    </Button>
  );
}

function PaginationPrevious({
  className,
  text = "Previous",
  ...props
}: React.ComponentProps<typeof PaginationLink> & {
  text?: string;
}): React.ReactElement {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("!pl-1.5", className)}
      {...props}
    >
      <ChevronLeftIcon data-icon="inline-start" aria-hidden="true" />
      <span className="hidden sm:block">{text}</span>
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  text = "Next",
  ...props
}: React.ComponentProps<typeof PaginationLink> & {
  text?: string;
}): React.ReactElement {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("!pr-1.5", className)}
      {...props}
    >
      <span className="hidden sm:block">{text}</span>
      <ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">): React.ReactElement {
  return (
    <span
      data-slot="pagination-ellipsis"
      className={cn(
        "flex size-8 items-center justify-center text-muted-readable [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <MoreHorizontalIcon aria-hidden="true" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};

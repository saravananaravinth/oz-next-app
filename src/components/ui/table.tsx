// oz-next-app/src/components/ui/table.tsx
import type * as React from "react";

import { cn } from "@/lib/utils";

function Table({
  className,
  ...props
}: React.ComponentProps<"table">): React.ReactElement {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto scrollbar-stable"
    >
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom text-body-sm text-tabular",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function TableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">): React.ReactElement {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">): React.ReactElement {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({
  className,
  ...props
}: React.ComponentProps<"tfoot">): React.ReactElement {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 text-body-sm [font-weight:var(--typography-emphasis-weight)] [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({
  className,
  ...props
}: React.ComponentProps<"tr">): React.ReactElement {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors duration-150 hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({
  className,
  ...props
}: React.ComponentProps<"th">): React.ReactElement {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-3 text-left align-middle whitespace-nowrap text-foreground [font-weight:var(--typography-emphasis-weight)] [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({
  className,
  ...props
}: React.ComponentProps<"td">): React.ReactElement {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">): React.ReactElement {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-caption text-muted-readable", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};

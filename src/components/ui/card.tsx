// oz-next-app/src/components/ui/card.tsx
import type * as React from "react";

import { cn } from "@/lib/utils";

type CardSize = "default" | "sm";

type CardProps = React.ComponentProps<"div"> &
  Readonly<{
    size?: CardSize;
  }>;

type CardHeaderProps = React.ComponentProps<"div">;
type CardTitleProps = React.ComponentProps<"div">;
type CardDescriptionProps = React.ComponentProps<"div">;
type CardActionProps = React.ComponentProps<"div">;
type CardContentProps = React.ComponentProps<"div">;
type CardFooterProps = React.ComponentProps<"div">;

const DEFAULT_CARD_SIZE = "default" satisfies CardSize;

function Card({ className, size = DEFAULT_CARD_SIZE, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-xs shadow-foreground/5 [--card-spacing:--spacing(5)] gap-[var(--card-spacing)] py-[var(--card-spacing)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:rounded-xl data-[size=sm]:[--card-spacing:--spacing(4)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl data-[size=sm]:*:[img:first-child]:rounded-t-xl data-[size=sm]:*:[img:last-child]:rounded-b-xl",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min items-start gap-1.5 px-[var(--card-spacing)] has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:border-border/70 [.border-b]:pb-[var(--card-spacing)]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-card-title text-balance", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "text-body-sm text-muted-readable group-data-[size=sm]/card:text-caption",
        className,
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: CardActionProps) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div
      data-slot="card-content"
      className={cn("min-w-0 px-[var(--card-spacing)] text-body", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-2 border-t border-border/70 bg-muted/45 p-[var(--card-spacing)] text-body-sm text-muted-readable",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
export type {
  CardActionProps,
  CardContentProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardProps,
  CardSize,
  CardTitleProps,
};

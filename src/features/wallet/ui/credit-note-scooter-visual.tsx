// oz-next-app/src/features/wallet/ui/credit-note-scooter-visual.tsx
import type { ReactElement } from "react";
import { cn } from "@/lib/utils";

export type CreditNoteScooterVisualProps = Readonly<{
  className?: string;
}>;

function Scooter({
  x,
  scale,
  accentClassName,
}: Readonly<{
  x: number;
  scale: number;
  accentClassName: string;
}>): ReactElement {
  return (
    <g transform={`translate(${String(x)} 12) scale(${String(scale)})`}>
      <circle
        cx="48"
        cy="102"
        r="17"
        className="fill-background stroke-foreground/65"
        strokeWidth="5"
      />
      <circle
        cx="142"
        cy="102"
        r="17"
        className="fill-background stroke-foreground/65"
        strokeWidth="5"
      />
      <path
        d="M53 87h54c9 0 17 5 21 13l4 8H83c-8 0-15-5-18-12l-12-25z"
        className={cn("stroke-foreground/70", accentClassName)}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M92 88 104 47h20l8 43"
        className="fill-none stroke-foreground/70"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M104 48c-3-12 5-24 18-25l22-2"
        className="fill-none stroke-foreground/70"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M137 22h22"
        className="stroke-foreground/70"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M83 60h28l-4 15H87z"
        className="fill-background/90 stroke-foreground/60"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M63 79 48 67h-9"
        className="fill-none stroke-foreground/60"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M136 88h18"
        className="stroke-foreground/60"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="120" cy="47" r="4" className="fill-primary" />
    </g>
  );
}

export function CreditNoteScooterVisual({
  className,
}: CreditNoteScooterVisualProps): ReactElement {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-32 w-full min-w-0 overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/[0.06] via-info/[0.04] to-warning/[0.06]",
        "before:pointer-events-none before:absolute before:inset-x-6 before:bottom-4 before:h-8 before:rounded-[50%] before:bg-foreground/[0.06] before:blur-xl",
        className,
      )}
    >
      <div className="pointer-events-none absolute -left-8 -top-8 size-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="pointer-events-none absolute -right-6 top-3 size-28 rounded-full bg-warning/10 blur-2xl" />
      <svg
        viewBox="0 0 520 150"
        className="relative h-full w-full overflow-visible text-foreground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-700 motion-reduce:animate-none"
        focusable="false"
      >
        <path
          d="M20 128h480"
          className="stroke-border"
          strokeWidth="2"
          strokeDasharray="8 10"
        />
        <Scooter x={16} scale={0.78} accentClassName="fill-primary/20" />
        <Scooter x={166} scale={0.9} accentClassName="fill-info/20" />
        <Scooter x={340} scale={0.82} accentClassName="fill-success/20" />
      </svg>
    </div>
  );
}

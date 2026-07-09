// oz-next-app/src/components/ui/color-swatch.tsx
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

type ColorSwatchProps = Readonly<{
  color: string;
  label: string;
  className?: string;
}>;

export function ColorSwatch({ color, label, className }: ColorSwatchProps) {
  const style: CSSProperties = { backgroundColor: color };

  return (
    <span
      aria-label={`${label} color`}
      className={cn(
        "inline-block size-4 shrink-0 rounded-full border border-border shadow-xs",
        className,
      )}
      role="img"
      style={style}
    />
  );
}

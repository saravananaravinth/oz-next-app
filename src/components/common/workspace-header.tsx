// oz-next-app/src/components/common/workspace-header.tsx
import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type WorkspaceHeaderTone = "primary" | "info" | "success" | "default";

export type WorkspaceHeaderProps = Readonly<{
  titleId: string;
  title: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  actions?: ReactNode | undefined;
  tone?: WorkspaceHeaderTone;
  className?: string;
}>;

const ICON_TONE_CLASSES = {
  primary: "border-primary/20 bg-primary/10 text-primary",
  info: "border-info/20 bg-info/10 text-info",
  success: "border-success/20 bg-success/10 text-success",
  default: "border-border/70 bg-muted/60 text-muted-readable",
} as const satisfies Record<WorkspaceHeaderTone, string>;

export function WorkspaceHeader({
  titleId,
  title,
  description,
  icon,
  actions,
  tone = "primary",
  className,
}: WorkspaceHeaderProps): ReactElement {
  const descriptionId = `${titleId}-description`;

  return (
    <header
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn(
        "relative h-[60px] min-h-[60px] max-h-[60px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs shadow-foreground/5",
        className,
      )}
    >
      <div className="no-scrollbar h-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
        <div className="flex h-full w-full min-w-max items-center gap-3 px-4 sm:px-5">
          <div className="flex shrink-0 items-center gap-3">
            <span
              aria-hidden="true"
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-xl border shadow-xs [&_svg]:size-4",
                ICON_TONE_CLASSES[tone],
              )}
            >
              {icon}
            </span>

            <div className="flex shrink-0 flex-col justify-center gap-0.5">
              <h1
                id={titleId}
                className="max-w-[min(32rem,55vw)] truncate whitespace-nowrap text-card-title leading-tight"
              >
                {title}
              </h1>
              <p
                id={descriptionId}
                className="max-w-[min(48rem,64vw)] truncate whitespace-nowrap text-caption leading-tight text-muted-readable"
              >
                {description}
              </p>
            </div>
          </div>

          {actions === undefined ? null : (
            <div className="ms-auto flex shrink-0 items-center justify-end gap-2 ps-6">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

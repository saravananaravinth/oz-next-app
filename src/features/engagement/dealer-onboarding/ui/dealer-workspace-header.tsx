// oz-next-app/src/features/engagement/dealer-onboarding/ui/dealer-workspace-header.tsx
import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DealerWorkspaceHeaderProps = Readonly<{
  titleId: string;
  title: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  backHref?: string | undefined;
  backLabel?: string | undefined;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string | undefined;
}>;

export function DealerWorkspaceHeader({
  titleId,
  title,
  description,
  icon,
  backHref,
  backLabel = "Back to dealer directory",
  meta,
  actions,
  className,
}: DealerWorkspaceHeaderProps): ReactElement {
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
        <div className="flex h-full min-w-max w-full items-center gap-3 px-4 sm:px-5">
          <div className="flex shrink-0 items-center gap-3">
            {backHref === undefined ? null : (
              <Button
                asChild
                variant="ghost"
                size="icon-sm"
                className="rounded-xl"
              >
                <Link
                  href={backHref as Route}
                  aria-label={backLabel}
                  title={backLabel}
                >
                  <ArrowLeft aria-hidden="true" className="size-3.5" />
                </Link>
              </Button>
            )}

            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-xs dark:bg-primary/10">
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
                className="max-w-[min(42rem,62vw)] truncate whitespace-nowrap text-caption leading-tight text-muted-readable"
              >
                {description}
              </p>
            </div>
          </div>

          {meta === undefined && actions === undefined ? null : (
            <div className="ms-auto flex shrink-0 items-center justify-end gap-2 ps-6">
              {meta}
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

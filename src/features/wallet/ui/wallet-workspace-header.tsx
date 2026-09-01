// oz-next-app/src/features/wallet/ui/wallet-workspace-header.tsx
import type { ReactElement, ReactNode } from "react";
import { WalletCards } from "lucide-react";

export type WalletWorkspaceHeaderProps = Readonly<{
  titleId: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode | undefined;
}>;

export function WalletWorkspaceHeader({
  titleId,
  title,
  description,
  actions,
}: WalletWorkspaceHeaderProps): ReactElement {
  const descriptionId = `${titleId}-description`;

  return (
    <header
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="relative h-[60px] min-h-[60px] max-h-[60px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs shadow-foreground/5"
    >
      <div className="no-scrollbar h-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
        <div className="flex h-full min-w-max w-full items-center gap-3 px-4 sm:px-5">
          <div className="flex shrink-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-xs dark:bg-primary/10">
              <WalletCards aria-hidden="true" className="size-4" />
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

// oz-next-app/src/features/engagement/dealer-lead-updates/ui/dealer-lead-shell.tsx
import Image from "next/image";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactElement, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

const BRAND_ICON_SIZE = 36;

export type PublicDealerLeadShellProps = Readonly<{
  children: ReactNode;
  footerActions?: ReactNode;
  mainLabelledBy?: string;
  mainClassName?: string;
  mainRef?: Ref<HTMLElement>;
}>;

type PublicDealerLeadBrandMarkProps = Readonly<{
  className?: string;
  iconClassName?: string;
}>;

function PublicDealerLeadBrandMark({
  className,
  iconClassName,
}: PublicDealerLeadBrandMarkProps): ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 shadow-xs ring-1 ring-background/80",
        className,
      )}
    >
      <Image
        src="/icon-light.svg"
        alt=""
        width={BRAND_ICON_SIZE}
        height={BRAND_ICON_SIZE}
        className={cn("block h-7 w-auto dark:hidden", iconClassName)}
        priority
      />
      <Image
        src="/icon-dark.svg"
        alt=""
        width={BRAND_ICON_SIZE}
        height={BRAND_ICON_SIZE}
        className={cn("hidden h-7 w-auto dark:block", iconClassName)}
        priority
      />
    </span>
  );
}

export function PublicDealerLeadShell({
  children,
  footerActions,
  mainLabelledBy,
  mainClassName,
  mainRef,
}: PublicDealerLeadShellProps): ReactElement {
  const hasFooterActions = footerActions !== undefined;

  return (
    <div className="relative isolate flex min-h-svh min-w-0 flex-col bg-background text-foreground">
      <a
        href="#dealer-lead-main"
        className="fixed top-3 left-3 z-[60] -translate-y-24 rounded-xl bg-primary px-4 py-2 text-body-sm text-primary-foreground shadow-lg transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        Skip to lead workspace
      </a>

      <header className="sticky top-0 z-40 shrink-0 border-b border-border/70 bg-background/94 pt-[env(safe-area-inset-top)] shadow-xs supports-[backdrop-filter]:bg-background/82 supports-[backdrop-filter]:backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-3 px-3 sm:min-h-16 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <PublicDealerLeadBrandMark className="size-9 rounded-xl sm:size-10 sm:rounded-2xl" />

            <div className="min-w-0">
              <p className="truncate text-body-sm [font-weight:var(--typography-emphasis-weight)] sm:text-body">
                Ozotec EV
              </p>
              <p className="truncate text-caption text-muted-readable">
                Innovation to Serve Society
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 text-caption text-muted-readable lg:flex">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              <span>Private lead information</span>
            </div>
            <div className="flex min-h-9 items-center gap-1.5 rounded-full border border-success/20 bg-success/8 px-2.5 text-caption text-success dark:border-success/30 dark:bg-success/10 sm:px-3">
              <ShieldCheck aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Secure workspace</span>
              <span className="sm:hidden">Secure</span>
            </div>
          </div>
        </div>
      </header>

      <main
        id="dealer-lead-main"
        ref={mainRef}
        aria-labelledby={mainLabelledBy}
        className={cn(
          "relative flex min-w-0 flex-1 touch-pan-y items-start justify-center overflow-x-clip px-0 py-0 sm:px-6 sm:py-6 lg:px-8 lg:py-8",
          hasFooterActions ? "pb-28 sm:pb-24" : "pb-6 sm:pb-8",
          mainClassName,
        )}
      >
        {children}
      </main>

      {hasFooterActions ? (
        <footer className="sticky bottom-0 z-40 mt-auto shrink-0 border-t border-border/70 bg-background/96 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-12px_32px_-24px_hsl(var(--foreground))] supports-[backdrop-filter]:bg-background/86 supports-[backdrop-filter]:backdrop-blur-xl">
          <div className="px-3 pt-2.5 sm:px-6 sm:py-3">{footerActions}</div>
        </footer>
      ) : null}
    </div>
  );
}

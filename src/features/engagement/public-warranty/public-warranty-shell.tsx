// oz-next-app/src/features/engagement/public-warranty/public-warranty-shell.tsx
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import type { ReactElement, ReactNode, Ref } from "react";

import { cn } from "@/lib/utils";

const COMPANY_LEGAL_NAME = "Ozotec Automobile Pvt Ltd";
const CURRENT_YEAR = new Date().getUTCFullYear();
const BRAND_ICON_SIZE = 36;

export type PublicWarrantyShellProps = Readonly<{
  children: ReactNode;
  footerActions?: ReactNode;
  mainLabelledBy?: string;
  mainClassName?: string;
  mainRef?: Ref<HTMLElement>;
}>;

type PublicWarrantyBrandMarkProps = Readonly<{
  className?: string;
  iconClassName?: string;
}>;

function PublicWarrantyBrandMark({
  className,
  iconClassName,
}: PublicWarrantyBrandMarkProps): ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 shadow-xs",
        className,
      )}
    >
      <Image
        src="/icon-light.svg"
        alt=""
        width={BRAND_ICON_SIZE}
        height={BRAND_ICON_SIZE}
        className={cn("block h-8 w-auto dark:hidden", iconClassName)}
        priority
      />
      <Image
        src="/icon-dark.svg"
        alt=""
        width={BRAND_ICON_SIZE}
        height={BRAND_ICON_SIZE}
        className={cn("hidden h-8 w-auto dark:block", iconClassName)}
        priority
      />
    </span>
  );
}

export function PublicWarrantyShell({
  children,
  footerActions,
  mainLabelledBy,
  mainClassName,
  mainRef,
}: PublicWarrantyShellProps): ReactElement {
  const hasFooterActions = footerActions !== undefined;

  return (
    <div className="relative isolate grid h-dvh min-h-svh grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-linear-to-b from-primary/12 via-primary/4 to-transparent dark:from-primary/16 dark:via-primary/5"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-20 left-1/2 -z-10 size-[34rem] max-w-[96vw] -translate-x-1/2 rounded-full bg-primary/6 blur-3xl dark:bg-primary/8"
      />

      <header className="relative z-30 shrink-0 border-b border-border/70 bg-background/88 pt-[env(safe-area-inset-top)] shadow-xs supports-[backdrop-filter]:bg-background/78 supports-[backdrop-filter]:backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <PublicWarrantyBrandMark />

            <div className="min-w-0">
              <p className="truncate text-body [font-weight:var(--typography-emphasis-weight)]">
                Ozotec EV
              </p>
              <p className="truncate text-caption text-muted-readable">
                Innovation to Serve Society
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-full border border-success/20 bg-success/8 px-3 py-1.5 text-caption text-success dark:border-success/30 dark:bg-success/10">
            <ShieldCheck aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Secure warranty</span>
            <span className="sm:hidden">Secure</span>
          </div>
        </div>
      </header>

      <main
        ref={mainRef}
        aria-labelledby={mainLabelledBy}
        className={cn(
          "relative flex min-h-0 min-w-0 touch-pan-y items-start justify-center overflow-x-hidden overflow-y-scroll overscroll-y-contain px-0 py-0 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] sm:px-6 sm:py-6 lg:px-8",
          mainClassName,
        )}
      >
        {children}
      </main>

      <footer className="relative z-30 shrink-0 border-t border-border/70 bg-background/92 supports-[backdrop-filter]:bg-background/82 supports-[backdrop-filter]:backdrop-blur-xl">
        {hasFooterActions ? (
          <div className="border-b border-border/70 px-4 py-3 sm:px-6">
            {footerActions}
          </div>
        ) : null}

        <div
          className={cn(
            "px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-6",
            !hasFooterActions &&
              "pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]",
          )}
        >
          <div className="mx-auto grid w-full max-w-5xl gap-1 text-center text-[0.6875rem] leading-relaxed text-muted-readable sm:grid-cols-[1fr_auto] sm:items-center sm:text-left sm:text-caption">
            <p>
              Copyright © {CURRENT_YEAR} {COMPANY_LEGAL_NAME}. All rights
              reserved.
            </p>
            <p className="sm:text-right">
              Information is used only for warranty evaluation and follow-up.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

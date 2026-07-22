// oz-next-app/src/features/engagement/dealer-lead-updates/ui/dealer-lead-shell.tsx
import Image from "next/image";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactElement, ReactNode, Ref } from "react";

import {
  BRAND_ICON_INTRINSIC_HEIGHT,
  BRAND_ICON_INTRINSIC_WIDTH,
} from "@/components/common/brand-assets";
import { cn } from "@/lib/utils";

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
        "relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 shadow-xs",
        className,
      )}
    >
      <Image
        src="/icon-light.svg"
        alt=""
        width={BRAND_ICON_INTRINSIC_WIDTH}
        height={BRAND_ICON_INTRINSIC_HEIGHT}
        className={cn("block h-6 w-auto dark:hidden", iconClassName)}
        priority
      />

      <Image
        src="/icon-dark.svg"
        alt=""
        width={BRAND_ICON_INTRINSIC_WIDTH}
        height={BRAND_ICON_INTRINSIC_HEIGHT}
        className={cn("hidden h-6 w-auto dark:block", iconClassName)}
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
        className="fixed top-2 left-2 z-[60] -translate-y-24 rounded-lg bg-primary px-3 py-2 text-body-sm text-primary-foreground shadow-lg transition-transform focus:translate-y-0 motion-reduce:transition-none"
      >
        Skip to enquiry follow-up
      </a>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-72 bg-linear-to-b from-primary/10 via-primary/3 to-transparent sm:block dark:from-primary/14 dark:via-primary/4"
      />

      <header className="sticky top-0 z-40 shrink-0 border-b border-border/70 bg-background/96 pt-[env(safe-area-inset-top)] supports-[backdrop-filter]:bg-background/86 supports-[backdrop-filter]:backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 w-full max-w-4xl items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <PublicDealerLeadBrandMark />

            <div className="min-w-0">
              <p className="truncate text-body-sm [font-weight:var(--typography-emphasis-weight)]">
                Ozotec EV
              </p>

              <p className="truncate text-caption text-muted-readable">
                Innovation to Serve Society
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-1.5 text-caption text-muted-readable sm:flex">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              <span>Masked customer data</span>
            </div>

            <div className="flex min-h-8 items-center gap-1.5 rounded-full border border-success/25 bg-success/8 px-2.5 text-caption text-success dark:border-success/35 dark:bg-success/10">
              <ShieldCheck aria-hidden="true" className="size-4" />
              <span>Official request</span>
            </div>
          </div>
        </div>
      </header>

      <main
        id="dealer-lead-main"
        ref={mainRef}
        aria-labelledby={mainLabelledBy}
        className={cn(
          "relative flex min-w-0 flex-1 touch-pan-y items-start justify-center overflow-x-clip px-0 py-0 sm:px-5 sm:py-6",
          hasFooterActions ? "pb-28 sm:pb-24" : "pb-6",
          mainClassName,
        )}
      >
        {children}
      </main>

      <aside
        aria-label="Customer data privacy and safety"
        className="shrink-0 border-t border-border/60 bg-muted/20 px-3 py-2.5 sm:px-5"
      >
        <div className="mx-auto flex max-w-4xl items-start justify-center gap-2.5">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-success"
          />

          <p className="max-w-3xl text-left text-caption leading-relaxed text-muted-readable text-pretty sm:text-center">
            <span className="text-foreground [font-weight:var(--typography-emphasis-weight)]">
              Privacy and safety:
            </span>{" "}
            Use this link only for the assigned customer enquiry. Never record
            OTPs, passwords, bank, card, UPI, Aadhaar, PAN, or unrelated
            identity-document information.
          </p>
        </div>
      </aside>

      {hasFooterActions ? (
        <footer className="sticky bottom-0 z-40 mt-auto shrink-0 border-t border-border/70 bg-background/97 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[0_-10px_28px_-24px_hsl(var(--foreground))] supports-[backdrop-filter]:bg-background/88 supports-[backdrop-filter]:backdrop-blur-xl">
          <div className="px-3 pt-2.5 sm:px-5 sm:py-3">{footerActions}</div>
        </footer>
      ) : null}
    </div>
  );
}

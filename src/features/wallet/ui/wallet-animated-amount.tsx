// oz-next-app/src/features/wallet/ui/wallet-animated-amount.tsx
"use client";

import * as React from "react";

import {
  formatMinorUnits,
  formatMoney,
  parseMoneyToMinorUnits,
} from "@/features/wallet/utils/wallet-money";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/shared/hooks";

export type WalletAnimatedAmountProps = Readonly<{
  amount: string;
  currency: string;
  className?: string | undefined;
  delayMs?: number | undefined;
}>;

const ANIMATION_DURATION_MS = 900;
const MAX_DELAY_MS = 480;
const PROGRESS_SCALE = 10_000;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function clampDelay(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(0, Math.floor(value)), MAX_DELAY_MS);
}

function easeOutCubic(progress: number): number {
  const remaining = 1 - progress;
  return 1 - remaining * remaining * remaining;
}

function systemPrefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

export function WalletAnimatedAmount({
  amount,
  currency,
  className,
  delayMs,
}: WalletAnimatedAmountProps): React.ReactElement {
  const visualAmountRef = React.useRef<HTMLSpanElement>(null);
  const targetMinorUnits = React.useMemo(
    () => parseMoneyToMinorUnits(amount),
    [amount],
  );
  const targetText = React.useMemo(
    () => formatMoney(amount, currency),
    [amount, currency],
  );
  const prefersReducedMotion = usePrefersReducedMotion(false);

  React.useLayoutEffect(() => {
    const visualAmount = visualAmountRef.current;

    if (visualAmount === null) {
      return;
    }

    if (
      targetMinorUnits === null ||
      prefersReducedMotion ||
      systemPrefersReducedMotion()
    ) {
      visualAmount.textContent = targetText;
      return;
    }

    const normalizedDelayMs = clampDelay(delayMs);
    const animationOrigin = performance.now() + normalizedDelayMs;
    let animationFrameId = 0;
    let cancelled = false;

    visualAmount.textContent = formatMinorUnits(0n, currency);

    const tick = (now: number): void => {
      if (cancelled) {
        return;
      }

      if (now < animationOrigin) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      const rawProgress = Math.min(
        Math.max((now - animationOrigin) / ANIMATION_DURATION_MS, 0),
        1,
      );
      const easedProgress = easeOutCubic(rawProgress);
      const scaledProgress = BigInt(Math.round(easedProgress * PROGRESS_SCALE));
      const nextMinorUnits =
        (targetMinorUnits * scaledProgress) / BigInt(PROGRESS_SCALE);

      visualAmount.textContent = formatMinorUnits(nextMinorUnits, currency);

      if (rawProgress < 1) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      visualAmount.textContent = targetText;
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [currency, delayMs, prefersReducedMotion, targetMinorUnits, targetText]);

  return (
    <span className={cn("inline-block tabular-nums", className)}>
      <span className="sr-only">{targetText}</span>
      <span ref={visualAmountRef} aria-hidden="true">
        {targetText}
      </span>
    </span>
  );
}

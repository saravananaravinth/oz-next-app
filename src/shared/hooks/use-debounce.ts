// oz-next-app/src/shared/hooks/use-debounce.ts
"use client";

import * as React from "react";

export type UseDebounceOptions<TValue> = Readonly<{
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
  equals?: (left: TValue, right: TValue) => boolean;
}>;

type Timer = ReturnType<typeof setTimeout>;

type TimerRef = {
  current: Timer | null;
};

type DebounceConfig = Readonly<{
  delayMs: number;
  leading: boolean;
  trailing: boolean;
  maxWaitMs: number | null;
}>;

const DEFAULT_LEADING = false;
const DEFAULT_TRAILING = true;
const MAX_DELAY_MS = 5 * 60_000;

function objectIsEqual<TValue>(left: TValue, right: TValue): boolean {
  return Object.is(left, right);
}

function normalizeDelayMs(value: number | undefined): number | null {
  if (value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return Math.min(Math.max(0, Math.floor(value)), MAX_DELAY_MS);
}

function isEnabledDelay(value: number | null): value is number {
  return value !== null && value > 0;
}

function resolveMaxWaitMs(
  maxWaitMs: number | null,
  delayMs: number,
): number | null {
  return maxWaitMs === null ? null : Math.max(maxWaitMs, delayMs);
}

function clearTimer(timerRef: TimerRef): void {
  if (timerRef.current === null) {
    return;
  }

  clearTimeout(timerRef.current);
  timerRef.current = null;
}

function createDebounceConfig(input: {
  readonly delayMs: number;
  readonly leading: boolean;
  readonly trailing: boolean;
  readonly maxWaitMs: number | null;
}): DebounceConfig {
  return {
    delayMs: input.delayMs,
    leading: input.leading,
    trailing: input.trailing,
    maxWaitMs: input.maxWaitMs,
  };
}

function isSameConfig(
  left: DebounceConfig | null,
  right: DebounceConfig,
): boolean {
  return (
    left !== null &&
    left.delayMs === right.delayMs &&
    left.leading === right.leading &&
    left.trailing === right.trailing &&
    left.maxWaitMs === right.maxWaitMs
  );
}

export function useDebounce<TValue>(
  value: TValue,
  delayMs: number,
  options?: UseDebounceOptions<TValue>,
): TValue {
  const leading = options?.leading ?? DEFAULT_LEADING;
  const trailing = options?.trailing ?? DEFAULT_TRAILING;
  const normalizedDelayMs = normalizeDelayMs(delayMs);
  const normalizedMaxWaitMs = normalizeDelayMs(options?.maxWait);
  const equals = options?.equals;

  const equalityRef = React.useRef<(left: TValue, right: TValue) => boolean>(
    equals ?? objectIsEqual,
  );
  const latestValueRef = React.useRef(value);
  const lastEmittedValueRef = React.useRef(value);
  const leadingTimerRef = React.useRef<Timer | null>(null);
  const trailingTimerRef = React.useRef<Timer | null>(null);
  const cooldownTimerRef = React.useRef<Timer | null>(null);
  const maxWaitTimerRef = React.useRef<Timer | null>(null);
  const leadingGateRef = React.useRef(false);
  const configRef = React.useRef<DebounceConfig | null>(null);
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    equalityRef.current = equals ?? objectIsEqual;
  }, [equals]);

  const clearTimers = React.useCallback((): void => {
    clearTimer(leadingTimerRef);
    clearTimer(trailingTimerRef);
    clearTimer(cooldownTimerRef);
    clearTimer(maxWaitTimerRef);
  }, []);

  const emitValue = React.useCallback((nextValue: TValue): void => {
    if (equalityRef.current(nextValue, lastEmittedValueRef.current)) {
      return;
    }

    lastEmittedValueRef.current = nextValue;
    setDebouncedValue(nextValue);
  }, []);

  React.useEffect(() => {
    latestValueRef.current = value;

    if (!isEnabledDelay(normalizedDelayMs) || (!leading && !trailing)) {
      clearTimers();
      configRef.current = null;
      leadingGateRef.current = false;
      lastEmittedValueRef.current = value;
      return;
    }

    if (equalityRef.current(value, lastEmittedValueRef.current)) {
      clearTimers();
      leadingGateRef.current = false;
      return;
    }

    const maxWaitMs = resolveMaxWaitMs(normalizedMaxWaitMs, normalizedDelayMs);
    const nextConfig = createDebounceConfig({
      delayMs: normalizedDelayMs,
      leading,
      trailing,
      maxWaitMs,
    });

    if (!isSameConfig(configRef.current, nextConfig)) {
      clearTimers();
      configRef.current = nextConfig;
      leadingGateRef.current = false;
    }

    if (leading && !leadingGateRef.current) {
      leadingGateRef.current = true;
      clearTimer(leadingTimerRef);

      leadingTimerRef.current = setTimeout(() => {
        leadingTimerRef.current = null;
        emitValue(value);
      }, 0);
    }

    if (trailing) {
      clearTimer(trailingTimerRef);

      trailingTimerRef.current = setTimeout(() => {
        emitValue(latestValueRef.current);
        clearTimers();
        leadingGateRef.current = false;
      }, normalizedDelayMs);
    }

    if (leading && !trailing) {
      clearTimer(cooldownTimerRef);

      cooldownTimerRef.current = setTimeout(() => {
        leadingGateRef.current = false;
        cooldownTimerRef.current = null;
      }, normalizedDelayMs);
    }

    if (trailing && maxWaitMs !== null && maxWaitTimerRef.current === null) {
      maxWaitTimerRef.current = setTimeout(() => {
        emitValue(latestValueRef.current);
        clearTimers();
        leadingGateRef.current = false;
      }, maxWaitMs);
    }
  }, [
    value,
    normalizedDelayMs,
    normalizedMaxWaitMs,
    leading,
    trailing,
    clearTimers,
    emitValue,
  ]);

  React.useEffect(() => {
    return () => {
      clearTimers();
      leadingGateRef.current = false;
    };
  }, [clearTimers]);

  if (!isEnabledDelay(normalizedDelayMs) || (!leading && !trailing)) {
    return value;
  }

  return debouncedValue;
}

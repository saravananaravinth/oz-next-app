// oz-next-app/src/hooks/use-mobile.ts
"use client";

import * as React from "react";

export const VIEWPORT_BREAKPOINTS = {
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 1023,
  desktopMin: 1024,
} as const;

export type ViewportKind = "mobile" | "tablet" | "desktop";

const MOBILE_QUERY = `(max-width: ${String(VIEWPORT_BREAKPOINTS.mobileMax)}px)`;
const TABLET_QUERY = `((min-width: ${String(
  VIEWPORT_BREAKPOINTS.tabletMin,
)}px) and (max-width: ${String(VIEWPORT_BREAKPOINTS.tabletMax)}px))`;
const DESKTOP_QUERY = `(min-width: ${String(VIEWPORT_BREAKPOINTS.desktopMin)}px)`;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const MAX_MEDIA_QUERY_LENGTH = 512;
const MAX_MEDIA_QUERY_ENTRIES = 64;
const DELETE_CODE_POINT = 0x7f;
const C0_CONTROL_MAX_CODE_POINT = 0x1f;

type Subscriber = () => void;
type MediaQueryChangeHandler = (event: MediaQueryListEvent) => void;

type MediaQueryEntry = {
  readonly mql: MediaQueryList;
  readonly subscribers: Set<Subscriber>;
  readonly handleChange: MediaQueryChangeHandler;
  listening: boolean;
};

const mediaQueryEntries = new Map<string, MediaQueryEntry>();

function noop(): void {
  return;
}

function canUseMatchMedia(): boolean {
  return (
    typeof window !== "undefined" && typeof window.matchMedia === "function"
  );
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);

    if (
      codePoint <= C0_CONTROL_MAX_CODE_POINT ||
      codePoint === DELETE_CODE_POINT
    ) {
      return true;
    }
  }

  return false;
}

function normalizeQuery(query: string): string | null {
  const normalized = query.trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_MEDIA_QUERY_LENGTH ||
    hasControlCharacter(normalized)
  ) {
    return null;
  }

  return normalized;
}

function addChangeListener(
  mql: MediaQueryList,
  handler: MediaQueryChangeHandler,
): void {
  mql.addEventListener("change", handler);
}

function removeChangeListener(
  mql: MediaQueryList,
  handler: MediaQueryChangeHandler,
): void {
  mql.removeEventListener("change", handler);
}

function evictIdleEntries(): void {
  if (mediaQueryEntries.size <= MAX_MEDIA_QUERY_ENTRIES) {
    return;
  }

  for (const [query, entry] of mediaQueryEntries) {
    if (mediaQueryEntries.size <= MAX_MEDIA_QUERY_ENTRIES) {
      return;
    }

    if (entry.subscribers.size === 0) {
      mediaQueryEntries.delete(query);
    }
  }
}

function hasCapacityForNewEntry(): boolean {
  if (mediaQueryEntries.size < MAX_MEDIA_QUERY_ENTRIES) {
    return true;
  }

  evictIdleEntries();

  return mediaQueryEntries.size < MAX_MEDIA_QUERY_ENTRIES;
}

function createEntry(query: string): MediaQueryEntry | null {
  if (!canUseMatchMedia() || !hasCapacityForNewEntry()) {
    return null;
  }

  let mql: MediaQueryList;

  try {
    mql = window.matchMedia(query);
  } catch {
    return null;
  }

  const subscribers = new Set<Subscriber>();
  const entry: MediaQueryEntry = {
    mql,
    subscribers,
    listening: false,
    handleChange: () => {
      for (const subscriber of [...subscribers]) {
        subscriber();
      }
    },
  };

  mediaQueryEntries.set(query, entry);
  evictIdleEntries();

  return entry;
}

function getOrCreateEntry(query: string): MediaQueryEntry | null {
  const normalized = normalizeQuery(query);

  if (normalized === null) {
    return null;
  }

  const existing = mediaQueryEntries.get(normalized);

  if (existing !== undefined) {
    mediaQueryEntries.delete(normalized);
    mediaQueryEntries.set(normalized, existing);
    return existing;
  }

  return createEntry(normalized);
}

function attachEntry(entry: MediaQueryEntry): void {
  if (entry.listening) {
    return;
  }

  addChangeListener(entry.mql, entry.handleChange);
  entry.listening = true;
}

function detachEntry(entry: MediaQueryEntry): void {
  if (!entry.listening) {
    return;
  }

  removeChangeListener(entry.mql, entry.handleChange);
  entry.listening = false;
}

export function useMediaQuery(query: string, defaultValue = false): boolean {
  const normalizedQuery = React.useMemo(() => normalizeQuery(query), [query]);

  const subscribe = React.useCallback(
    (callback: Subscriber): (() => void) => {
      if (normalizedQuery === null) {
        return noop;
      }

      const entry = getOrCreateEntry(normalizedQuery);

      if (entry === null) {
        return noop;
      }

      entry.subscribers.add(callback);
      attachEntry(entry);

      return () => {
        entry.subscribers.delete(callback);

        if (entry.subscribers.size === 0) {
          detachEntry(entry);
          mediaQueryEntries.delete(normalizedQuery);
        }
      };
    },
    [normalizedQuery],
  );

  const getClientSnapshot = React.useCallback((): boolean => {
    if (normalizedQuery === null) {
      return defaultValue;
    }

    const entry = getOrCreateEntry(normalizedQuery);

    return entry === null ? defaultValue : entry.mql.matches;
  }, [normalizedQuery, defaultValue]);

  const getServerSnapshot = React.useCallback(
    (): boolean => defaultValue,
    [defaultValue],
  );

  return React.useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
}

export function useIsMobile(defaultValue = false): boolean {
  return useMediaQuery(MOBILE_QUERY, defaultValue);
}

export function usePrefersReducedMotion(defaultValue = false): boolean {
  return useMediaQuery(REDUCED_MOTION_QUERY, defaultValue);
}

export function useViewportKind(
  defaultValue: ViewportKind = "desktop",
): ViewportKind {
  const isMobile = useMediaQuery(MOBILE_QUERY, defaultValue === "mobile");
  const isTablet = useMediaQuery(TABLET_QUERY, defaultValue === "tablet");
  const isDesktop = useMediaQuery(DESKTOP_QUERY, defaultValue === "desktop");

  if (isMobile) {
    return "mobile";
  }

  if (isTablet) {
    return "tablet";
  }

  if (isDesktop) {
    return "desktop";
  }

  return defaultValue;
}

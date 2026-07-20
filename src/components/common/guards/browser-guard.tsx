// oz-next-app/src/components/common/guards/browser-guard.tsx
"use client";

import * as React from "react";

import { UnsupportedDevice } from "@/components/common/feedback/unsupported-device";
import { useViewportKind, type ViewportKind } from "@/shared/hooks/use-mobile";

type GuardViewportKind = ViewportKind;

export type BrowserGuardProps = Readonly<
  React.PropsWithChildren<{
    minViewport?: GuardViewportKind;
    fallback?: React.ReactNode;
  }>
>;

const VIEWPORT_ORDER = {
  mobile: 0,
  tablet: 1,
  desktop: 2,
} as const satisfies Record<GuardViewportKind, number>;

function isAllowedViewport(
  current: GuardViewportKind,
  minimum: GuardViewportKind,
): boolean {
  return VIEWPORT_ORDER[current] >= VIEWPORT_ORDER[minimum];
}

export function BrowserGuard({
  children,
  minViewport = "mobile",
  fallback,
}: BrowserGuardProps): React.ReactElement {
  const viewportKind = useViewportKind();

  if (!isAllowedViewport(viewportKind, minViewport)) {
    return <>{fallback ?? <UnsupportedDevice />}</>;
  }

  return <>{children}</>;
}

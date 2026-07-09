// oz-next-app/src/app/(protected)/dashboard/error.tsx
"use client";

import type { ReactElement } from "react";
import { RotateCcw, ShieldAlert } from "lucide-react";

import {
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/content";
import { Button } from "@/components/ui/button";

type DashboardErrorProps = Readonly<{
  error: Error & {
    readonly digest?: string;
  };
  reset: () => void;
}>;

const SAFE_DIGEST_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

function safeDigest(value: string | undefined): string | null {
  const normalized = value?.trim();

  if (normalized === undefined || normalized.length === 0) {
    return null;
  }

  return SAFE_DIGEST_PATTERN.test(normalized) ? normalized : null;
}

export default function DashboardError({
  error,
  reset,
}: DashboardErrorProps): ReactElement {
  const errorReference = safeDigest(error.digest);

  return (
    <ContentRoot
      width="narrow"
      className="flex min-h-[min(640px,calc(100dvh-8rem))] justify-center"
      aria-labelledby="dashboard-error-title"
    >
      <ContentSection>
        <div className="mx-auto grid max-w-xl justify-items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive">
            <ShieldAlert aria-hidden="true" className="size-6" />
          </div>

          <div className="grid gap-2">
            <h1
              id="dashboard-error-title"
              className="text-section-title text-foreground"
            >
              Dashboard could not be loaded
            </h1>

            <p className="text-body-sm text-muted-readable text-pretty">
              Retry the dashboard. Your workspace data was not changed.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <ContentStatus
            variant="destructive"
            role="alert"
            icon={<ShieldAlert aria-hidden="true" className="size-4" />}
            title="Workspace landing page failed"
            description="The dashboard could not render safely. Retry the request, or return to the workspace later if the issue continues."
          />

          {errorReference !== null ? (
            <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3">
              <p className="text-caption text-muted-readable">
                Error reference
              </p>

              <code className="mt-1 block break-all text-caption text-foreground text-tabular">
                {errorReference}
              </code>
            </div>
          ) : null}

          <div className="flex justify-center">
            <Button type="button" onClick={reset}>
              <RotateCcw aria-hidden="true" className="size-4" />
              Try again
            </Button>
          </div>
        </div>
      </ContentSection>
    </ContentRoot>
  );
}

// oz-next-app/src/app/public/location/[token]/error.tsx
"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useCallback, useMemo, type ReactElement } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { PublicLocationShell } from "@/features/engagement/public-location/public-location-shell";

type PublicLocationErrorProps = Readonly<{
  error: Error & {
    readonly digest?: string;
  };
  reset: () => void;
}>;

const SAFE_DIGEST_PATTERN = /^[A-Za-z0-9._:/@-]{1,128}$/u;

function safeDigest(value: string | undefined): string | null {
  const normalized = value?.trim();

  if (normalized === undefined || normalized.length === 0) {
    return null;
  }

  return SAFE_DIGEST_PATTERN.test(normalized) ? normalized : null;
}

export default function PublicLocationError({
  error,
  reset,
}: PublicLocationErrorProps): ReactElement {
  const reference = useMemo(() => safeDigest(error.digest), [error.digest]);
  const handleReset = useCallback((): void => {
    reset();
  }, [reset]);

  const footerActions = (
    <div className="mx-auto grid w-full max-w-2xl gap-2.5">
      <Button
        type="button"
        onClick={handleReset}
        className="h-12 w-full rounded-2xl"
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        Try again
      </Button>
      <p className="text-center text-[0.6875rem] leading-relaxed text-muted-readable sm:text-caption">
        Retrying does not submit a location until you approve browser access.
      </p>
    </div>
  );

  return (
    <PublicLocationShell
      footerActions={footerActions}
      mainLabelledBy="public-location-error-title"
      mainClassName="items-stretch sm:items-center"
    >
      <section className="flex w-full max-w-2xl sm:block">
        <Card className="min-h-full w-full gap-0 overflow-hidden rounded-none border-x-0 border-y-0 border-border/70 bg-card/96 py-0 shadow-xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl sm:min-h-0 sm:rounded-3xl sm:border">
          <CardHeader className="items-center gap-5 px-5 py-8 text-center sm:px-8 sm:py-10">
            <span className="flex size-16 items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/8 text-destructive shadow-xs">
              <AlertTriangle aria-hidden="true" className="size-8" />
            </span>

            <div className="grid max-w-lg gap-2">
              <p className="text-overline text-primary">Location request</p>
              <h1
                id="public-location-error-title"
                className="text-section-title text-balance"
              >
                Location page could not be opened
              </h1>
              <CardDescription className="text-body-sm text-pretty text-muted-readable">
                Retry the secure location page. No location was captured or
                submitted by this failure.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 px-5 pb-8 sm:px-8 sm:pb-10">
            <Alert
              variant="destructive"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Page failed safely</AlertTitle>
              <AlertDescription>
                <p>
                  The public location request could not render safely. Try again
                  using the same link.
                </p>

                {reference === null ? null : (
                  <p className="mt-1 text-caption">
                    Reference:{" "}
                    <code className="break-all text-tabular">{reference}</code>
                  </p>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>
    </PublicLocationShell>
  );
}

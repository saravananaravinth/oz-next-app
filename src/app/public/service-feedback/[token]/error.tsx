// oz-next-app/src/app/erp/public/forms/service-feedback/[token]/error.tsx
"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useCallback, useMemo, type ReactElement } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { PublicServiceFeedbackShell } from "@/features/engagement/public-service-feedback";

export type ServiceFeedbackErrorProps = Readonly<{
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

export default function ServiceFeedbackError({
  error,
  reset,
}: ServiceFeedbackErrorProps): ReactElement {
  const errorReference = useMemo(
    () => safeDigest(error.digest),
    [error.digest],
  );
  const handleReset = useCallback((): void => {
    reset();
  }, [reset]);

  return (
    <PublicServiceFeedbackShell
      mainLabelledBy="service-feedback-error-title"
      mainClassName="items-center"
    >
      <section className="w-full max-w-xl px-4 sm:px-0">
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
          <CardHeader className="items-center gap-5 px-5 pt-7 text-center sm:px-8 sm:pt-9">
            <span className="flex size-16 items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/8 text-destructive shadow-xs">
              <AlertTriangle aria-hidden="true" className="size-8" />
            </span>

            <div className="grid gap-2">
              <p className="text-overline text-muted-readable">Ozotec EV</p>
              <h1
                id="service-feedback-error-title"
                className="text-section-title text-balance"
              >
                Feedback form could not be opened
              </h1>
              <CardDescription className="mx-auto max-w-md text-body-sm text-pretty text-muted-readable">
                Retry the form. Your feedback was not submitted or changed.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 px-5 sm:px-8">
            <Alert
              variant="destructive"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Form loading failed</AlertTitle>
              <AlertDescription>
                <p>
                  The public feedback form could not render safely. Try again
                  using the same secure link.
                </p>
                {errorReference === null ? null : (
                  <p className="mt-1 text-caption">
                    Reference:{" "}
                    <code className="break-all text-tabular">
                      {errorReference}
                    </code>
                  </p>
                )}
              </AlertDescription>
            </Alert>

            <Button
              type="button"
              onClick={handleReset}
              className="h-12 rounded-2xl"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Try again
            </Button>
          </CardContent>

          <CardFooter className="justify-center border-t border-border/70 bg-muted/30 px-5 py-4 text-center text-caption text-muted-readable sm:px-8">
            <p>No internal ERP diagnostics are exposed on this public page.</p>
          </CardFooter>
        </Card>
      </section>
    </PublicServiceFeedbackShell>
  );
}

// oz-next-app/src/app/public/dealer-leads/[token]/error.tsx
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
  CardTitle,
} from "@/components/ui/card";
import { PublicDealerLeadShell } from "@/features/engagement/public-dealer-leads/public-dealer-lead-shell";

export type PublicDealerLeadErrorProps = Readonly<{
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

export default function PublicDealerLeadError({
  error,
  reset,
}: PublicDealerLeadErrorProps): ReactElement {
  const errorReference = useMemo(
    () => safeDigest(error.digest),
    [error.digest],
  );
  const handleReset = useCallback((): void => {
    reset();
  }, [reset]);

  const footerActions = (
    <div className="mx-auto w-full max-w-xl">
      <Button
        type="button"
        onClick={handleReset}
        className="h-12 w-full rounded-2xl"
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        Try again
      </Button>
    </div>
  );

  return (
    <PublicDealerLeadShell
      footerActions={footerActions}
      mainLabelledBy="dealer-lead-error-title"
      mainClassName="items-center"
    >
      <section className="w-full max-w-xl px-4 sm:px-0">
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
          <CardHeader className="items-center gap-5 px-5 pt-7 text-center sm:px-8 sm:pt-9">
            <span className="flex size-16 items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/8 text-destructive shadow-xs">
              <AlertTriangle aria-hidden="true" className="size-8" />
            </span>
            <div className="grid gap-2">
              <p className="text-overline text-muted-readable">
                Vehicle enquiry follow-up
              </p>
              <CardTitle
                id="dealer-lead-error-title"
                className="text-section-title text-balance"
              >
                Enquiry page could not be opened
              </CardTitle>
              <CardDescription className="mx-auto max-w-md text-body-sm text-pretty text-muted-readable">
                Retry the secure page. No customer follow-up action was
                submitted.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-5 pb-7 sm:px-8 sm:pb-9">
            <Alert variant="destructive" role="alert">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Page failed safely</AlertTitle>
              <AlertDescription>
                <p>
                  The vehicle enquiry page could not render safely. Try again
                  using the same link.
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
          </CardContent>
        </Card>
      </section>
    </PublicDealerLeadShell>
  );
}

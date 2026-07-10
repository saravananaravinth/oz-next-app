// oz-next-app/src/app/public/warranty/[token]/error.tsx
"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import type { ReactElement } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { PublicWarrantyShell } from "@/features/engagement/public-warranty/public-warranty-shell";

export type WarrantyApplicationErrorProps = Readonly<{
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

export default function WarrantyApplicationError({
  error,
  reset,
}: WarrantyApplicationErrorProps): ReactElement {
  const errorReference = safeDigest(error.digest);

  const footerActions = (
    <div className="mx-auto w-full max-w-xl">
      <Button type="button" onClick={reset} className="h-12 w-full rounded-2xl">
        <RotateCcw aria-hidden="true" className="size-4" />
        Try again
      </Button>
    </div>
  );

  return (
    <PublicWarrantyShell
      footerActions={footerActions}
      mainLabelledBy="warranty-error-title"
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
                id="warranty-error-title"
                className="text-section-title text-balance"
              >
                Warranty form could not be opened
              </h1>
              <CardDescription className="mx-auto max-w-md text-body-sm text-pretty text-muted-readable">
                Retry the secure form. No warranty details or invoice files were
                submitted by this failed render.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-5 sm:px-8">
            <Alert
              variant="destructive"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Warranty form failed safely</AlertTitle>
              <AlertDescription>
                <p>
                  The public warranty application could not render safely. Try
                  again using the same link.
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

          <CardFooter className="justify-center border-t border-border/70 bg-muted/30 px-5 py-4 text-center text-caption text-muted-readable sm:px-8">
            <p>
              No internal ERP diagnostics or private files are exposed here.
            </p>
          </CardFooter>
        </Card>
      </section>
    </PublicWarrantyShell>
  );
}

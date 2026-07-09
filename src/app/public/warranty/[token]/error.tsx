// oz-next-app/src/app/erp/public/forms/warranty/[token]/error.tsx
"use client";

import type { ReactElement } from "react";
import { AlertTriangle, RotateCcw, Smartphone } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type WarrantyApplicationErrorProps = Readonly<{
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

  return (
    <main
      className="dark min-h-svh bg-[radial-gradient(circle_at_top,_hsl(var(--destructive)/0.12),_transparent_30rem),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))] px-4 py-5 text-foreground"
      style={{ colorScheme: "dark" }}
    >
      <section
        aria-labelledby="warranty-error-title"
        className="mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-md flex-col justify-center"
      >
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-2xl shadow-foreground/5">
          <CardHeader className="items-center gap-5 px-5 pt-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-3xl border border-destructive/25 bg-destructive/10 text-destructive shadow-xs">
              <Smartphone aria-hidden="true" className="size-7" />
            </div>

            <div className="grid gap-2">
              <p className="text-overline text-muted-readable">Ozotec EV</p>
              <CardTitle
                id="warranty-error-title"
                className="text-section-title"
              >
                Warranty form could not be opened
              </CardTitle>
              <p className="text-body-sm text-muted-readable text-pretty">
                Retry the form. Your warranty details were not submitted.
              </p>
            </div>
          </CardHeader>

          <CardContent>
            <Alert variant="destructive" role="alert">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Public form failed</AlertTitle>
              <AlertDescription>
                <p>The warranty application could not render safely.</p>
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

          <CardFooter className="grid gap-3 border-t border-border/70 bg-muted/30 px-5 py-4">
            <Button type="button" onClick={reset}>
              <RotateCcw aria-hidden="true" className="size-4" />
              Try again
            </Button>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}

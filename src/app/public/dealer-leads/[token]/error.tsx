// oz-next-app/src/app/erp/public/dealer-leads/[token]/error.tsx
"use client";

import type { ReactElement } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PublicDealerLeadErrorProps = Readonly<{
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
  const errorReference = safeDigest(error.digest);

  return (
    <main className="min-h-svh bg-background px-4 py-5 text-foreground">
      <section className="mx-auto grid min-h-[calc(100svh-2.5rem)] w-full max-w-md place-items-center md:hidden">
        <Card className="w-full border-border/80 bg-card/95 shadow-xl shadow-foreground/5">
          <CardHeader className="items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/10 text-destructive">
              <AlertTriangle aria-hidden="true" className="size-5" />
            </div>

            <div className="grid gap-1">
              <CardTitle className="text-section-title">
                Vehicle enquiry could not be opened
              </CardTitle>
              <p className="text-body-sm text-muted-readable">
                Retry the secure vehicle enquiry page. No update was submitted.
              </p>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4">
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Enquiry page failed</AlertTitle>
              <AlertDescription>
                {errorReference === null ? (
                  "Please retry. If the problem continues, contact Ozotec support."
                ) : (
                  <>
                    Reference:{" "}
                    <code className="text-tabular">{errorReference}</code>
                  </>
                )}
              </AlertDescription>
            </Alert>

            <Button type="button" onClick={reset} className="h-12 rounded-2xl">
              <RotateCcw aria-hidden="true" className="size-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

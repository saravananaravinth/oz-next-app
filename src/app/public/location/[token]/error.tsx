// oz-next-app/src/app/erp/public/location/[token]/error.tsx
"use client";

import type { ReactElement } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

type PublicLocationErrorProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

const SAFE_DIGEST_RE = /^[A-Za-z0-9._:/@-]{1,128}$/u;

function safeDigest(value: string | undefined): string | null {
  const normalized = value?.trim();

  return normalized !== undefined && SAFE_DIGEST_RE.test(normalized)
    ? normalized
    : null;
}

export default function PublicLocationError({
  error,
  reset,
}: PublicLocationErrorProps): ReactElement {
  const reference = safeDigest(error.digest);

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-5 text-foreground">
      <section
        aria-labelledby="location-error-title"
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/10 text-destructive">
              <AlertTriangle aria-hidden="true" className="size-6" />
            </div>

            <h1 id="location-error-title" className="text-section-title">
              Location page could not be opened
            </h1>
          </CardHeader>

          <CardContent>
            <Alert variant="destructive" role="alert">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Page failed safely</AlertTitle>
              <AlertDescription>
                <p>
                  Please retry the location request. No location was submitted.
                </p>

                {reference !== null ? (
                  <p className="mt-1 text-caption">
                    Reference:{" "}
                    <code className="break-all text-tabular">{reference}</code>
                  </p>
                ) : null}
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter>
            <Button type="button" className="w-full" onClick={reset}>
              <RotateCcw aria-hidden="true" className="size-4" />
              Try again
            </Button>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}

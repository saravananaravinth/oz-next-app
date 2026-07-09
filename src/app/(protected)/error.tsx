// oz-next-app/src/app/(protected)/error.tsx
"use client";

import type { ReactElement } from "react";
import { RotateCcw, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

type ProtectedErrorProps = Readonly<{
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

export default function ProtectedError({
  error,
  reset,
}: ProtectedErrorProps): ReactElement {
  const errorReference = safeDigest(error.digest);

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-4 text-foreground">
      <section
        aria-labelledby="protected-error-title"
        className="w-full max-w-xl"
      >
        <Card>
          <CardHeader className="items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive">
              <ShieldAlert aria-hidden="true" className="size-6" />
            </div>

            <h1
              id="protected-error-title"
              className="text-section-title text-balance"
            >
              Workspace could not be loaded
            </h1>
          </CardHeader>

          <CardContent>
            <Alert variant="destructive" role="alert">
              <ShieldAlert aria-hidden="true" className="size-4" />

              <AlertTitle>Secure workspace failed</AlertTitle>

              <AlertDescription>
                <p>Retry the page. Your session data was not changed.</p>

                {errorReference !== null ? (
                  <p className="text-caption">
                    Reference:{" "}
                    <code className="break-all text-tabular">
                      {errorReference}
                    </code>
                  </p>
                ) : null}
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="justify-center">
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

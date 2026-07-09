// oz-next-app/src/app/erp/public/forms/dealership/[token]/error.tsx
"use client";

import Image from "next/image";
import type { ReactElement } from "react";
import { useCallback, useMemo } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PublicDealershipFormErrorProps = Readonly<{
  error: Error & {
    readonly digest?: string;
  };
  reset: () => void;
}>;

const BRAND_ICON_SIZE = 32;
const SAFE_DIGEST_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

function safeDigest(value: string | undefined): string | null {
  const normalized = value?.trim();

  if (normalized === undefined || normalized.length === 0) {
    return null;
  }

  return SAFE_DIGEST_PATTERN.test(normalized) ? normalized : null;
}

function BrandMark(): ReactElement {
  return (
    <span
      aria-hidden="true"
      className="flex size-14 items-center justify-center rounded-3xl border border-primary/15 bg-primary/10 shadow-xs"
    >
      <Image
        src="/icon-light.svg"
        alt=""
        width={BRAND_ICON_SIZE}
        height={BRAND_ICON_SIZE}
        className="block h-8 w-auto dark:hidden"
        priority
      />
      <Image
        src="/icon-dark.svg"
        alt=""
        width={BRAND_ICON_SIZE}
        height={BRAND_ICON_SIZE}
        className="hidden h-8 w-auto dark:block"
        priority
      />
    </span>
  );
}

export default function PublicDealershipFormError({
  error,
  reset,
}: PublicDealershipFormErrorProps): ReactElement {
  const errorReference = useMemo(
    () => safeDigest(error.digest),
    [error.digest],
  );

  const handleReset = useCallback((): void => {
    reset();
  }, [reset]);

  return (
    <main
      className="dark min-h-svh bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.16),_transparent_30rem),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.34))] px-4 py-5 text-foreground"
      style={{ colorScheme: "dark" }}
    >
      <section
        aria-labelledby="dealership-error-title"
        className="mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-md flex-col justify-center"
      >
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-2xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
          <CardHeader className="items-center gap-5 px-5 pt-6 text-center">
            <BrandMark />

            <div className="grid gap-2">
              <p className="text-overline text-muted-readable">Ozotec EV</p>

              <CardTitle
                id="dealership-error-title"
                className="text-section-title"
              >
                Dealership form could not be opened
              </CardTitle>

              <p className="text-body-sm text-muted-readable text-pretty">
                Retry the form. Your application details were not submitted or
                changed.
              </p>
            </div>
          </CardHeader>

          <CardContent className="grid gap-4 px-5">
            <Alert variant="destructive" role="alert" aria-live="assertive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Form loading failed</AlertTitle>
              <AlertDescription>
                <p>
                  The public dealership application could not render safely.
                  Please try again using the same link.
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

          <CardFooter className="justify-center border-t border-border/70 bg-muted/35 px-5 py-4 text-center text-caption text-muted-readable">
            <p>No internal ERP diagnostics are exposed on this public page.</p>
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}

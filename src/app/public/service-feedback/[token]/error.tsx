// oz-next-app/src/app/erp/public/forms/service-feedback/[token]/error.tsx
"use client";

import Image from "next/image";
import type { ReactElement } from "react";
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

type ServiceFeedbackErrorProps = Readonly<{
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

function BrandMark(): ReactElement {
  return (
    <div className="flex size-14 items-center justify-center rounded-3xl border border-border/70 bg-background/75 shadow-xs">
      <Image
        src="/icon-light.svg"
        alt=""
        width={42}
        height={42}
        priority
        className="block h-10 w-auto dark:hidden"
      />
      <Image
        src="/icon-dark.svg"
        alt=""
        width={42}
        height={42}
        priority
        className="hidden h-10 w-auto dark:block"
      />
    </div>
  );
}

export default function ServiceFeedbackError({
  error,
  reset,
}: ServiceFeedbackErrorProps): ReactElement {
  const reference = safeDigest(error.digest);

  return (
    <main
      className="dark min-h-svh bg-[radial-gradient(circle_at_top,_hsl(var(--destructive)/0.12),_transparent_30rem),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))] px-4 py-5 text-foreground"
      style={{ colorScheme: "dark" }}
    >
      <section
        aria-labelledby="feedback-complaints-error-title"
        className="mx-auto grid min-h-[calc(100svh-2.5rem)] w-full max-w-md content-center"
      >
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-2xl shadow-foreground/5">
          <CardHeader className="items-center gap-4 px-5 pt-6 text-center">
            <BrandMark />

            <div className="grid gap-2">
              <p className="text-overline text-muted-readable">Ozotec EV</p>
              <CardTitle
                id="feedback-complaints-error-title"
                className="text-section-title"
              >
                Feedback/Complaints could not be opened
              </CardTitle>
              <p className="text-body-sm text-muted-readable text-pretty">
                Retry the secure form. Your feedback or complaint was not
                submitted.
              </p>
            </div>
          </CardHeader>

          <CardContent>
            <Alert variant="destructive" role="alert">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>
                Feedback/Complaints form failed to render safely
              </AlertTitle>
              <AlertDescription>
                <p>Please retry. No internal ERP data was exposed.</p>

                {reference === null ? null : (
                  <p className="mt-1 text-caption">
                    Reference:{" "}
                    <code className="break-all text-tabular">{reference}</code>
                  </p>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="px-5 pb-5">
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

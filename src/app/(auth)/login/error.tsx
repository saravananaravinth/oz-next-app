// oz-next-app/src/app/(auth)/login/error.tsx
"use client";

import Link from "next/link";
import { useCallback, useMemo, type ReactElement } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginBrandMark } from "@/features/auth";

type LoginErrorProps = Readonly<{
  error: Error & {
    readonly digest?: string;
  };
  reset: () => void;
}>;

const MAX_ERROR_REFERENCE_LENGTH = 128;
const ERROR_REFERENCE_PATTERN = /^[A-Za-z0-9_.:-]+$/u;

function normalizeErrorReference(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";

  if (
    normalized.length > 0 &&
    normalized.length <= MAX_ERROR_REFERENCE_LENGTH &&
    ERROR_REFERENCE_PATTERN.test(normalized)
  ) {
    return normalized;
  }

  return null;
}

export default function LoginError({
  error,
  reset,
}: LoginErrorProps): ReactElement {
  const errorReference = useMemo(
    () => normalizeErrorReference(error.digest),
    [error.digest],
  );

  const handleReset = useCallback((): void => {
    reset();
  }, [reset]);

  return (
    <section
      aria-labelledby="login-error-title"
      className="grid w-full max-w-md gap-5"
    >
      <div className="grid justify-items-center">
        <LoginBrandMark />
      </div>

      <Card aria-labelledby="login-error-title">
        <CardHeader className="text-center">
          <CardTitle id="login-error-title" className="text-section-title">
            Sign-in could not be opened
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4">
          <Alert
            variant="destructive"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            <AlertTitle className="text-card-title">
              Authentication screen failed
            </AlertTitle>

            <AlertDescription className="text-body-sm">
              <p>
                Retry the sign-in screen. Your account details were not changed.
              </p>

              {errorReference !== null ? (
                <p className="text-caption">
                  Reference:{" "}
                  <code className="text-tabular">{errorReference}</code>
                </p>
              ) : null}
            </AlertDescription>
          </Alert>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" onClick={handleReset}>
              Try again
            </Button>

            <Button variant="outline" asChild>
              <Link href="/login" prefetch={false}>
                Back to sign in
              </Link>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="justify-center text-center text-caption text-muted-readable">
          <p>No authentication request was completed.</p>
        </CardFooter>
      </Card>
    </section>
  );
}

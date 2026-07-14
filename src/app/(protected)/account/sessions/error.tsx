// oz-next-app/src/app/(protected)/account/sessions/error.tsx
"use client";

import type { ReactElement } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SessionsErrorProps = Readonly<{
  error: Error & { readonly digest?: string };
  reset: () => void;
}>;

const SAFE_DIGEST_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

export default function SessionsError({
  error,
  reset,
}: SessionsErrorProps): ReactElement {
  const digest = error.digest?.trim() ?? "";
  const reference = SAFE_DIGEST_PATTERN.test(digest) ? digest : null;

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Active sessions unavailable</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Alert variant="destructive">
          <ShieldAlert aria-hidden="true" />
          <AlertTitle>Session data could not be loaded</AlertTitle>
          <AlertDescription>
            Retry the secure session workspace. No account or ERP records were
            changed.
            {reference === null ? null : (
              <span className="mt-2 block text-caption">
                Reference: <code>{reference}</code>
              </span>
            )}
          </AlertDescription>
        </Alert>
        <Button type="button" onClick={reset}>
          <RefreshCw aria-hidden="true" className="size-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

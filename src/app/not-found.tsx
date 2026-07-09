// oz-next-app/src/app/not-found.tsx
import Link from "next/link";
import type { ReactElement } from "react";

import { Button } from "@/components/ui/button";

const SUPPORT_NOTE =
  "If you believe this ERP route should exist, contact your system administrator with the page address." as const;

export default function NotFound(): ReactElement {
  return (
    <section
      aria-labelledby="not-found-title"
      aria-describedby="not-found-description"
      className="min-h-[calc(100dvh-4rem)] bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-3xl flex-col items-center justify-center text-center">
        <div className="mb-8 rounded-full border border-border bg-card px-5 py-2 text-overline text-muted-readable shadow-sm text-tabular">
          404
        </div>

        <h1 id="not-found-title" className="text-page-title text-foreground">
          Page not found
        </h1>

        <p
          id="not-found-description"
          className="mt-4 max-w-xl text-body-sm text-muted-readable text-pretty"
        >
          The page you requested is unavailable, has moved, or is not part of
          your current ERP workspace.
        </p>

        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard" prefetch={false}>
              Go to dashboard
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/login" prefetch={false}>
              Sign in
            </Link>
          </Button>
        </div>

        <p className="mt-8 max-w-xl rounded-2xl border border-border bg-muted/40 px-4 py-3 text-caption text-muted-readable">
          {SUPPORT_NOTE}
        </p>
      </div>
    </section>
  );
}

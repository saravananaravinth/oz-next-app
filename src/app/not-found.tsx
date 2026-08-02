// oz-next-app/src/app/not-found.tsx
import Link from "next/link";
import type { ReactElement } from "react";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

const SUPPORT_NOTE =
  "If you believe this ERP route should exist, contact your system administrator with the page address." as const;

export default function NotFound(): ReactElement {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-labelledby="not-found-title"
      aria-describedby="not-found-description"
      className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8"
    >
      <section className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 text-center shadow-sm shadow-foreground/5 sm:p-8">
        <div
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-muted-readable"
        >
          <FileQuestion className="size-6" />
        </div>

        <div className="mt-6 grid gap-3">
          <p className="text-overline text-muted-readable text-tabular">
            Error 404
          </p>

          <h1 id="not-found-title" className="text-page-title text-foreground">
            Page not found
          </h1>

          <p
            id="not-found-description"
            className="text-pretty text-body-sm text-muted-readable"
          >
            The page you requested is unavailable, has moved, or is not part of
            your current ERP workspace.
          </p>
        </div>

        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>

          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>

        <p className="mt-8 border-t border-border/70 pt-5 text-caption text-muted-readable">
          {SUPPORT_NOTE}
        </p>
      </section>
    </main>
  );
}

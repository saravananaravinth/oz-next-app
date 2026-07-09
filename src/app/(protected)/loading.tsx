// oz-next-app/src/app/(protected)/loading.tsx
import type { ReactElement } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const CAPABILITY_SKELETON_KEYS = [
  "session",
  "navigation",
  "search",
  "notifications",
] as const;

const DETAIL_SKELETON_KEYS = [
  "workspace-tools",
  "enterprise-baseline",
  "security-reminder",
] as const;

export default function ProtectedLoading(): ReactElement {
  return (
    <main
      aria-busy="true"
      className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-4 text-foreground"
    >
      <section
        aria-labelledby="protected-loading-title"
        className="grid w-full max-w-5xl gap-4"
      >
        <Card>
          <CardHeader className="gap-4">
            <Skeleton className="h-6 w-36 rounded-full" />
            <Skeleton className="h-10 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-2xl rounded-full" />
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {CAPABILITY_SKELETON_KEYS.map((key) => (
                <Card key={key} size="sm" aria-hidden="true">
                  <CardHeader>
                    <Skeleton className="size-10 rounded-2xl" />
                    <Skeleton className="h-4 w-24 rounded-full" />
                    <Skeleton className="h-6 w-28 rounded-full" />
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
              {DETAIL_SKELETON_KEYS.map((key) => (
                <Skeleton key={key} className="h-28 rounded-2xl" />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="sr-only" role="status" aria-live="polite">
          <h1 id="protected-loading-title">Loading secure workspace</h1>
        </div>
      </section>
    </main>
  );
}

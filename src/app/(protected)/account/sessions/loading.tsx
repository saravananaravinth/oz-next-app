// oz-next-app/src/app/(protected)/account/sessions/loading.tsx
import type { ReactElement } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SessionsLoading(): ReactElement {
  return (
    <section
      aria-busy="true"
      aria-label="Loading active sessions"
      className="grid gap-6"
    >
      <div className="grid gap-3">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      {[0, 1, 2].map((value) => (
        <Card key={value} aria-hidden="true">
          <CardHeader className="grid gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-4/5" />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

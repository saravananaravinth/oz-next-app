// oz-next-app/src/app/erp/public/location/[token]/loading.tsx
import type { ReactElement } from "react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PublicLocationLoading(): ReactElement {
  return (
    <main
      aria-busy="true"
      className="min-h-svh bg-muted/30 px-4 py-5 text-foreground"
    >
      <section className="mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-md flex-col justify-center">
        <Card aria-hidden="true">
          <CardHeader className="items-center gap-5 text-center">
            <Skeleton className="size-14 rounded-3xl" />
            <div className="grid w-full justify-items-center gap-2">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-8 w-52 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-4 w-4/5 rounded-full" />
            </div>
          </CardHeader>

          <CardContent className="grid gap-4">
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
          </CardContent>

          <CardFooter className="grid gap-3">
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="mx-auto h-3 w-56 rounded-full" />
          </CardFooter>
        </Card>

        <p className="sr-only" role="status" aria-live="polite">
          Loading secure location request.
        </p>
      </section>
    </main>
  );
}

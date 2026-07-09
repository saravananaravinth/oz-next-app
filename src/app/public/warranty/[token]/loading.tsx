// oz-next-app/src/app/erp/public/forms/warranty/[token]/loading.tsx
import type { ReactElement } from "react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function WarrantyApplicationLoading(): ReactElement {
  return (
    <main
      className="dark min-h-svh bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.14),_transparent_30rem),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))] px-4 py-5 text-foreground"
      style={{ colorScheme: "dark" }}
    >
      <section
        aria-busy="true"
        aria-labelledby="warranty-loading-title"
        className="mx-auto grid min-h-[calc(100svh-2.5rem)] w-full max-w-md content-center"
      >
        <p id="warranty-loading-title" className="sr-only" role="status">
          Loading warranty application…
        </p>

        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-2xl shadow-foreground/5">
          <CardHeader className="gap-5 px-5 pt-6">
            <div className="flex items-start gap-4">
              <Skeleton className="size-12 rounded-3xl" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </CardHeader>

          <CardContent className="grid gap-4 px-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-11 w-full" />
          </CardContent>

          <CardFooter className="grid gap-4 border-t border-border/70 bg-muted/30 px-5 py-4">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-11 w-full" />
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}

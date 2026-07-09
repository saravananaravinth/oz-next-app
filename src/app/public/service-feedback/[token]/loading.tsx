// oz-next-app/src/app/erp/public/forms/service-feedback/[token]/loading.tsx
import Image from "next/image";
import type { ReactElement } from "react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ServiceFeedbackLoading(): ReactElement {
  return (
    <main
      className="dark min-h-svh bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.14),_transparent_30rem),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.35))] px-4 py-5 text-foreground"
      style={{ colorScheme: "dark" }}
    >
      <section
        aria-busy="true"
        aria-live="polite"
        aria-labelledby="feedback-complaints-loading-title"
        className="mx-auto grid min-h-[calc(100svh-2.5rem)] w-full max-w-md content-center"
      >
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-2xl shadow-foreground/5">
          <CardHeader className="gap-4 px-5 pt-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-3xl border border-border/70 bg-background/75 shadow-xs">
                <Image
                  src="/icon-light.svg"
                  alt=""
                  width={34}
                  height={34}
                  priority
                  className="block h-8 w-auto dark:hidden"
                />
                <Image
                  src="/icon-dark.svg"
                  alt=""
                  width={34}
                  height={34}
                  priority
                  className="hidden h-8 w-auto dark:block"
                />
              </div>

              <div className="grid flex-1 gap-2">
                <p className="sr-only" id="feedback-complaints-loading-title">
                  Preparing Feedback/Complaints
                </p>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-44" />
              </div>
            </div>

            <Skeleton className="h-2 w-full" />
          </CardHeader>

          <CardContent className="grid gap-4 px-5">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </CardContent>

          <CardFooter className="grid grid-cols-2 gap-3 px-5 pb-5">
            <Skeleton className="h-11 w-full rounded-2xl" />
            <Skeleton className="h-11 w-full rounded-2xl" />
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}

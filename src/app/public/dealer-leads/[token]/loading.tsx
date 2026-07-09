// oz-next-app/src/app/erp/public/dealer-leads/[token]/loading.tsx
import Image from "next/image";
import type { ReactElement } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PublicDealerLeadLoading(): ReactElement {
  return (
    <main
      aria-busy="true"
      className="min-h-svh bg-[radial-gradient(circle_at_top,_hsl(var(--muted))_0,_hsl(var(--background))_42%)] px-4 py-5 text-foreground"
    >
      <section className="mx-auto grid w-full max-w-md gap-5 md:hidden">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-border/70 bg-background shadow-xs">
              <Image
                src="/icon-light.svg"
                alt=""
                width={28}
                height={28}
                className="block h-7 w-auto dark:hidden"
                priority
              />
              <Image
                src="/icon-dark.svg"
                alt=""
                width={28}
                height={28}
                className="hidden h-7 w-auto dark:block"
                priority
              />
            </span>

            <div className="grid gap-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>

          <Skeleton className="h-7 w-24 rounded-full" />
        </header>

        <div className="grid gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full" />
        </div>

        <Card>
          <CardHeader className="gap-4">
            <div className="flex justify-between gap-3">
              <div className="grid gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-36" />
              </div>
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>

            <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/35 p-4">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardHeader>

          <CardContent className="grid gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
          </CardHeader>
          <CardContent className="grid gap-5">
            <Skeleton className="h-11 w-full rounded-2xl" />
            <Skeleton className="h-11 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

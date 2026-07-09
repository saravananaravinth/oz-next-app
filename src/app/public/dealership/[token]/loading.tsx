// oz-next-app/src/app/erp/public/forms/dealership/[token]/loading.tsx
import Image from "next/image";
import type { ReactElement } from "react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const BRAND_ICON_SIZE = 28;

function BrandMark(): ReactElement {
  return (
    <span
      aria-hidden="true"
      className="flex size-11 items-center justify-center rounded-3xl border border-primary/15 bg-primary/10 shadow-xs"
    >
      <Image
        src="/icon-light.svg"
        alt=""
        width={BRAND_ICON_SIZE}
        height={BRAND_ICON_SIZE}
        className="block h-7 w-auto dark:hidden"
        priority
      />
      <Image
        src="/icon-dark.svg"
        alt=""
        width={BRAND_ICON_SIZE}
        height={BRAND_ICON_SIZE}
        className="hidden h-7 w-auto dark:block"
        priority
      />
    </span>
  );
}

export default function PublicDealershipFormLoading(): ReactElement {
  return (
    <main
      className="dark min-h-svh bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.16),_transparent_30rem),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.34))] px-3 py-4 text-foreground"
      style={{ colorScheme: "dark" }}
    >
      <section
        aria-labelledby="dealership-loading-title"
        aria-busy="true"
        className="mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-md flex-col justify-center"
      >
        <p className="sr-only" role="status" aria-live="polite">
          Preparing dealership application form…
        </p>

        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-2xl shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
          <CardHeader className="gap-4 px-5 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <BrandMark />

                <div className="grid gap-1">
                  <Skeleton className="h-3 w-24" />
                  <CardTitle
                    id="dealership-loading-title"
                    className="text-subsection-title"
                  >
                    <Skeleton className="h-6 w-52" />
                  </CardTitle>
                </div>
              </div>

              <Skeleton className="h-8 w-16 rounded-full" />
            </div>

            <div className="grid gap-3">
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-5 w-36" />
            </div>
          </CardHeader>

          <CardContent className="grid gap-5 px-5">
            <div className="grid gap-3">
              <Skeleton className="h-7 w-64" />

              <div className="grid gap-3">
                <Skeleton className="h-[104px] w-full rounded-3xl" />
                <Skeleton className="h-[104px] w-full rounded-3xl" />
                <Skeleton className="h-[104px] w-full rounded-3xl" />
              </div>
            </div>
          </CardContent>

          <CardFooter className="grid gap-3 border-t border-border/70 bg-muted/35 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>

            <Skeleton className="mx-auto h-4 w-72 max-w-full" />
            <Skeleton className="mx-auto h-4 w-56 max-w-full" />
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}

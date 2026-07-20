// oz-next-app/src/features/auth/ui/login-client-fallback.tsx
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { LoginBrandMark } from "@/features/auth/ui/login-brand-mark";

export function LoginClientFallback() {
  return (
    <>
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Loading secure sign-in…
      </p>

      <Card aria-hidden="true">
        <CardHeader className="items-center gap-5 text-center">
          <div className="grid justify-items-center gap-3">
            <LoginBrandMark />
            <div className="grid justify-items-center gap-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>

          <div className="grid w-full justify-items-center gap-3">
            <Skeleton className="h-9 w-44" />
            <div className="grid w-full gap-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5 justify-self-center" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <Skeleton className="h-12 w-full" />
        </CardContent>

        <CardFooter className="justify-center">
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardFooter>
      </Card>
    </>
  );
}

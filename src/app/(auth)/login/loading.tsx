// oz-next-app/src/app/(auth)/login/loading.tsx
import type { ReactElement } from "react";

import { LoginClientFallback } from "@/features/auth/ui/login-client-fallback";

export default function LoginLoading(): ReactElement {
  return (
    <section
      aria-busy="true"
      aria-label="Loading secure sign-in"
      className="w-full max-w-md"
    >
      <h1 className="sr-only">Sign in to Ozotec EV</h1>
      <LoginClientFallback />
    </section>
  );
}

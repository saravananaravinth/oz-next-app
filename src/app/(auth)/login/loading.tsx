// oz-next-app/src/app/(auth)/login/loading.tsx
import type { ReactElement } from "react";

import { LoginClientFallback } from "@/features/auth";

export default function LoginLoading(): ReactElement {
  return (
    <section
      aria-busy="true"
      aria-labelledby="login-loading-title"
      className="grid w-full max-w-xl gap-6"
    >
      <LoginClientFallback />

      <div
        className="grid gap-1 text-center"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p id="login-loading-title" className="text-card-title">
          Preparing secure sign-in
        </p>

        <p className="text-body-sm text-muted-readable">
          Please wait while we load the authentication screen.
        </p>
      </div>
    </section>
  );
}

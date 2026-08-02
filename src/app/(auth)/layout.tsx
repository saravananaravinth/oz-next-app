// oz-next-app/src/app/(auth)/layout.tsx
import type { ReactElement, ReactNode } from "react";

type AuthLayoutProps = Readonly<{
  children: ReactNode;
}>;

const AUTH_LAYOUT_CLASS_NAME =
  "flex min-h-dvh w-full items-center justify-center overflow-x-clip bg-muted/30 px-4 py-6 text-foreground outline-none sm:px-6 sm:py-8 lg:px-8 lg:py-10";

export default function AuthLayout({
  children,
}: AuthLayoutProps): ReactElement {
  return (
    <main id="main-content" tabIndex={-1} className={AUTH_LAYOUT_CLASS_NAME}>
      {children}
    </main>
  );
}

// oz-next-app/src/app/(auth)/login/page.tsx
import type { Metadata } from "next";
import { Suspense, type ReactElement } from "react";

import { LoginClient, LoginClientFallback } from "@/features/auth";

const PAGE_TITLE = "Sign in";
const PAGE_DESCRIPTION = "Sign in to access your Ozotec ERP workspace.";
const PRODUCT_NAME = "Ozotec EV";
const COMPANY_LEGAL_NAME = "Ozotec Automobile Pvt Ltd";
const CURRENT_YEAR = new Date().getUTCFullYear();

export const dynamic = "force-static";

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
} satisfies Metadata;

export default function LoginPage(): ReactElement {
  return (
    <section
      aria-labelledby="login-page-title"
      className="grid w-full max-w-xl gap-6"
    >
      <div className="sr-only">
        <h1 id="login-page-title">Sign in to {PRODUCT_NAME}</h1>
      </div>

      <Suspense fallback={<LoginClientFallback />}>
        <LoginClient />
      </Suspense>

      <footer
        aria-label="Legal"
        className="text-center text-caption text-muted-readable"
      >
        <p>
          Copyright © {CURRENT_YEAR} {COMPANY_LEGAL_NAME}. All rights reserved.
        </p>
      </footer>
    </section>
  );
}

// oz-next-app/src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactElement, ReactNode } from "react";

import { env } from "@/lib/env/public-env";
import Providers from "@/app/_providers/app-providers";

import { THEME_BOOTSTRAP_SCRIPT } from "@/app/layout-bootstrap";
import "@/app/globals.css";

const ROOT_APP_NAME = "Ozotec EV" as const;
const ROOT_APP_DESCRIPTION =
  "Secure enterprise resource planning workspace for Ozotec EV operations." as const;
const ORGANIZATION_NAME = "Ozotec Automobile Pvt Ltd" as const;

const METADATA_BASE_ERROR = "metadata_base_url_invalid" as const;

const APP_KEYWORDS = [
  "Ozotec",
  "Ozotec EV",
  "ERP",
  "Enterprise Resource Planning",
  "Electric Vehicle",
  "Operations",
  "Inventory",
  "Sales",
  "Service",
  "Finance",
] as const;

const HTML_CLASS_NAME = "h-full";

const BODY_CLASS_NAME = [
  "min-h-dvh",
  "bg-background text-foreground antialiased font-sans",
  "touch-manipulation",
].join(" ");

const APP_SHELL_CLASS_NAME =
  "relative flex min-h-dvh w-full flex-col overflow-x-clip";

const CONTENT_ROOT_CLASS_NAME =
  "relative flex min-h-dvh w-full flex-1 flex-col overflow-x-clip";

const SKIP_LINK_CLASS_NAME = [
  "sr-only text-body-sm [font-weight:var(--typography-emphasis-weight)]",
  "focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[9999]",
  "focus:rounded-xl focus:border focus:border-primary/30 focus:bg-primary",
  "focus:px-4 focus:py-2 focus:text-primary-foreground",
  "focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
].join(" ");

function createMetadataBase(value: string, appEnv: string): URL {
  try {
    const url = new URL(value);
    const isProduction = appEnv === "production";

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error(METADATA_BASE_ERROR);
    }

    if (isProduction && url.protocol !== "https:") {
      throw new Error(METADATA_BASE_ERROR);
    }

    if (
      url.username.length > 0 ||
      url.password.length > 0 ||
      url.search.length > 0 ||
      url.hash.length > 0
    ) {
      throw new Error(METADATA_BASE_ERROR);
    }

    return new URL(url.origin);
  } catch {
    throw new Error(METADATA_BASE_ERROR);
  }
}

function readMetadataBaseInput(): string {
  const appOrigin = env.NEXT_PUBLIC_APP_ORIGIN.trim();

  if (appOrigin.length > 0) {
    return appOrigin;
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim();

  if (appUrl !== undefined && appUrl.length > 0) {
    return appUrl;
  }

  throw new Error("metadata_base_url_missing");
}

const metadataBase = createMetadataBase(
  readMetadataBaseInput(),
  env.NEXT_PUBLIC_APP_ENV,
);

const metadataBaseUrl = metadataBase.origin;

export const metadata = {
  metadataBase,
  applicationName: ROOT_APP_NAME,
  title: {
    default: ROOT_APP_NAME,
    template: `%s | ${ROOT_APP_NAME}`,
  },
  description: ROOT_APP_DESCRIPTION,
  keywords: [...APP_KEYWORDS],
  authors: [{ name: ORGANIZATION_NAME, url: metadataBaseUrl }],
  creator: ORGANIZATION_NAME,
  publisher: ORGANIZATION_NAME,
  category: "enterprise software",
  generator: `Next.js / ${env.NEXT_PUBLIC_APP_VERSION}`,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
    },
  },
  openGraph: {
    type: "website",
    url: metadataBaseUrl,
    siteName: ROOT_APP_NAME,
    title: ROOT_APP_NAME,
    description: ROOT_APP_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: ROOT_APP_NAME,
    description: ROOT_APP_DESCRIPTION,
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: ROOT_APP_NAME,
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  other: {
    "application-name": ROOT_APP_NAME,
    "color-scheme": "light dark",
    googlebot: "noindex, nofollow, noarchive, nosnippet, noimageindex",
  },
} satisfies Metadata;

export const viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
  colorScheme: "light dark",
  interactiveWidget: "resizes-content",
} satisfies Viewport;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return (
    <html
      lang="en"
      dir="ltr"
      data-accent="default"
      suppressHydrationWarning
      className={HTML_CLASS_NAME}
    >
      <head>
        <Script id="ozo-theme-bootstrap" strategy="beforeInteractive">
          {THEME_BOOTSTRAP_SCRIPT}
        </Script>
      </head>

      <body className={BODY_CLASS_NAME} suppressHydrationWarning>
        <div className={APP_SHELL_CLASS_NAME}>
          <a href="#main-content" className={SKIP_LINK_CLASS_NAME}>
            Skip to main content
          </a>

          <Providers>
            <div id="application-root" className={CONTENT_ROOT_CLASS_NAME}>
              {children}
            </div>

            <div id="portal-root" />
          </Providers>
        </div>
      </body>
    </html>
  );
}

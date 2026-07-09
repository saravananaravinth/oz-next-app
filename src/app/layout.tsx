// oz-next-app/src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactElement, ReactNode } from "react";

import { env } from "@/lib/env";
import Providers from "@/providers/providers";

import {
  DISPLAY_SCALE_ZOOM_BOOTSTRAP_SCRIPT,
  THEME_BOOTSTRAP_SCRIPT,
} from "./bootstrap";
import "./globals.css";

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

const HTML_CLASS_NAME = "h-full scroll-smooth";

const BODY_CLASS_NAME = [
  "ozo-ui-scale-root",
  "min-h-dvh",
  "bg-background text-foreground antialiased font-sans",
  "transition-colors duration-200 ease-out",
  "motion-reduce:transition-none motion-reduce:animate-none",
  "supports-[padding:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)]",
  "supports-[padding:env(safe-area-inset-right)]:pr-[env(safe-area-inset-right)]",
  "supports-[padding:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]",
  "supports-[padding:env(safe-area-inset-left)]:pl-[env(safe-area-inset-left)]",
  "touch-manipulation",
].join(" ");

const APP_SCALE_SHELL_CLASS_NAME =
  "ozo-ui-scale-shell relative flex min-h-dvh w-full flex-col overflow-x-clip";

const CONTENT_ROOT_CLASS_NAME = [
  "relative z-10 flex min-h-dvh w-full flex-1 flex-col overflow-x-clip",
  "transition-colors duration-200 ease-out motion-reduce:transition-none",
].join(" ");

const SKIP_LINK_CLASS_NAME = [
  "sr-only text-body-sm [font-weight:var(--typography-emphasis-weight)] transition-opacity duration-150 ease-out",
  "focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999]",
  "focus:rounded-2xl focus:border focus:border-border focus:bg-primary",
  "focus:px-4 focus:py-2 focus:text-primary-foreground",
  "focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
  "motion-reduce:transition-none",
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
    statusBarStyle: "black-translucent",
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
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
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
      data-ozo-boot="pending"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={HTML_CLASS_NAME}
    >
      <head>
        <Script id="ozo-theme-bootstrap" strategy="beforeInteractive">
          {THEME_BOOTSTRAP_SCRIPT}
        </Script>
        <Script id="ozo-display-scale-bootstrap" strategy="beforeInteractive">
          {DISPLAY_SCALE_ZOOM_BOOTSTRAP_SCRIPT}
        </Script>
      </head>

      <body className={BODY_CLASS_NAME} suppressHydrationWarning>
        <div className={APP_SCALE_SHELL_CLASS_NAME}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-primary/10 via-primary/5 to-transparent"
          />

          <a href="#main-content" className={SKIP_LINK_CLASS_NAME}>
            Skip to main content
          </a>

          <Providers>
            <div
              id="main-content"
              tabIndex={-1}
              className={CONTENT_ROOT_CLASS_NAME}
            >
              {children}
            </div>

            <div id="portal-root" />
          </Providers>
        </div>
      </body>
    </html>
  );
}

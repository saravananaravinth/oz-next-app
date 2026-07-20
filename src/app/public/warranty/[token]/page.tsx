// oz-next-app/src/app/public/warranty/[token]/page.tsx
import type { Metadata, Viewport } from "next";
import type { ReactElement } from "react";

import { PublicWarrantyApplicationPage } from "@/features/engagement/warranty-applications";

const PAGE_TITLE = "Warranty application";
const PAGE_DESCRIPTION = "Submit your Ozotec EV warranty application securely.";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
} satisfies Viewport;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
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
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
} satisfies Metadata;

type WarrantyApplicationRoutePageProps = Readonly<{
  params: Promise<Readonly<{ token: string }>>;
}>;

export default async function WarrantyApplicationRoutePage({
  params,
}: WarrantyApplicationRoutePageProps): Promise<ReactElement> {
  const { token } = await params;

  return <PublicWarrantyApplicationPage token={token} />;
}

// oz-next-app/src/app/public/location/[token]/page.tsx
import type { Metadata, Viewport } from "next";
import type { ReactElement } from "react";

import { PublicLocationRequestPage } from "@/features/engagement/location-requests";

const PAGE_TITLE = "Share location";
const PAGE_DESCRIPTION = "Securely share your current location with Ozotec EV.";

type PublicLocationPageProps = Readonly<{
  params: Promise<
    Readonly<{
      token: string;
    }>
  >;
}>;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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
} satisfies Metadata;

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

export default async function PublicLocationPage({
  params,
}: PublicLocationPageProps): Promise<ReactElement> {
  const { token } = await params;

  return <PublicLocationRequestPage token={token} />;
}

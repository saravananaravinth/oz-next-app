// oz-next-app/src/app/public/dealership/[token]/page.tsx
import type { Metadata, Viewport } from "next";
import type { ReactElement } from "react";

import { PublicDealershipApplicationPage } from "@/features/engagement/dealership-applications";

const PAGE_TITLE = "Dealership application";
const PAGE_DESCRIPTION =
  "Submit your Ozotec EV dealership application securely.";

type PublicDealershipFormRouteProps = Readonly<{
  params: Promise<
    Readonly<{
      token: string;
    }>
  >;
}>;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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

export default async function PublicDealershipFormRoute({
  params,
}: PublicDealershipFormRouteProps): Promise<ReactElement> {
  const { token } = await params;

  return <PublicDealershipApplicationPage token={token} />;
}

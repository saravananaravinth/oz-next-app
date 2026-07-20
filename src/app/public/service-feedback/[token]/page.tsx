// oz-next-app/src/app/public/service-feedback/[token]/page.tsx
import type { Metadata, Viewport } from "next";
import type { ReactElement } from "react";

import { PublicServiceFeedbackPage } from "@/features/engagement/service-feedback";

const PAGE_TITLE = "Feedback / complaints";
const PAGE_DESCRIPTION =
  "Submit your Ozotec EV feedback or complaint securely.";

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

type ServiceFeedbackPublicPageProps = Readonly<{
  params: Promise<Readonly<{ token: string }>>;
}>;

export default async function ServiceFeedbackPublicPage({
  params,
}: ServiceFeedbackPublicPageProps): Promise<ReactElement> {
  const { token } = await params;

  return <PublicServiceFeedbackPage token={token} />;
}

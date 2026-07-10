// oz-next-app/src/app/erp/public/forms/service-feedback/[token]/page.tsx
import type { Metadata, Viewport } from "next";
import type { ReactElement } from "react";

import { PublicServiceFeedbackPage } from "@/features/engagement/public-service-feedback";

const PAGE_TITLE = "Feedback / complaints";
const PAGE_DESCRIPTION =
  "Submit your Ozotec EV feedback or complaint securely.";

export const dynamic = "force-static";
export const revalidate = false;

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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
} satisfies Viewport;

export default function ServiceFeedbackPublicPage(): ReactElement {
  return <PublicServiceFeedbackPage />;
}

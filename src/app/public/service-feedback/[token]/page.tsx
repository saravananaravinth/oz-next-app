// oz-next-app/src/app/erp/public/forms/service-feedback/[token]/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { PublicServiceFeedbackPage } from "@/features/engagement/public-service-feedback";

const PAGE_TITLE = "Feedback/Complaints";
const PAGE_DESCRIPTION =
  "Submit your Ozotec EV feedback or complaint securely.";

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

export default function ServiceFeedbackPublicPage(): ReactElement {
  return <PublicServiceFeedbackPage />;
}

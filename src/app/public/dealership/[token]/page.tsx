// oz-next-app/src/app/erp/public/forms/dealership/[token]/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { PublicDealershipApplicationPage } from "@/features/engagement/public-dealership";

const PAGE_TITLE = "Dealership application";
const PAGE_DESCRIPTION =
  "Submit your Ozotec EV dealership application securely.";

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

export default function PublicDealershipFormRoute(): ReactElement {
  return <PublicDealershipApplicationPage />;
}

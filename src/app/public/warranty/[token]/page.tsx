// oz-next-app/src/app/erp/public/forms/warranty/[token]/page.tsx
import type { Metadata, Viewport } from "next";
import type { ReactElement } from "react";

import { PublicWarrantyApplicationPage } from "@/features/engagement/public-warranty";

const PAGE_TITLE = "Warranty application";
const PAGE_DESCRIPTION = "Submit your Ozotec EV warranty application securely.";

export const dynamic = "force-static";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
  colorScheme: "dark",
} satisfies Viewport;

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
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
} satisfies Metadata;

export default function WarrantyApplicationRoutePage(): ReactElement {
  return <PublicWarrantyApplicationPage />;
}

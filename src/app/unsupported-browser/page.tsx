// oz-next-app/src/app/unsupported-browser/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { UnsupportedBrowser } from "@/components/common/feedback/unsupported-browser";

export const metadata = {
  title: "Browser update required",
  description: "A current supported browser is required to use Ozotec ERP.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
} satisfies Metadata;

export default function UnsupportedBrowserPage(): ReactElement {
  return <UnsupportedBrowser />;
}

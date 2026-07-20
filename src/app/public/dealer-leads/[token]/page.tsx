// oz-next-app/src/app/public/dealer-leads/[token]/page.tsx
import type { Metadata, Viewport } from "next";
import type { ReactElement } from "react";

import {
  getPublicDealerLeadByToken,
  PublicDealerLeadUpdatePage,
} from "@/features/engagement/dealer-lead-updates";

const PAGE_TITLE = "Customer enquiry follow-up";
const PAGE_DESCRIPTION =
  "Update, schedule, or route an Ozotec EV customer enquiry securely.";

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

type PublicDealerLeadRouteProps = Readonly<{
  params: Promise<{
    token: string;
  }>;
}>;

export default async function PublicDealerLeadRoute({
  params,
}: PublicDealerLeadRouteProps): Promise<ReactElement> {
  const { token } = await params;
  const result = await getPublicDealerLeadByToken(token);

  const loadError = result.ok
    ? null
    : {
        reason: result.reason,
        ...(result.requestId === undefined
          ? {}
          : { requestId: result.requestId }),
      };

  return (
    <PublicDealerLeadUpdatePage
      token={token}
      initialLead={result.ok ? result.lead : null}
      {...(loadError === null ? {} : { loadError })}
    />
  );
}

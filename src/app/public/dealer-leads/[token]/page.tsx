// oz-next-app/src/app/erp/public/dealer-leads/[token]/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import {
  getPublicDealerLeadByToken,
  PublicDealerLeadUpdatePage,
} from "@/features/engagement/public-dealer-leads";

const PAGE_TITLE = "Vehicle enquiry follow-up";
const PAGE_DESCRIPTION =
  "Update the customer follow-up for an Ozotec EV vehicle enquiry securely.";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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

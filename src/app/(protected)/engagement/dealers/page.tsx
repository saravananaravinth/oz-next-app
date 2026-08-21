// oz-next-app/src/app/(protected)/engagement/dealers/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  DealerOnboardingAccessState,
  DealerOnboardingInvalidQueryState,
  DealerOnboardingPage,
  parseDealerDirectorySearchParams,
  resolveDealerOnboardingAccess,
  type DealerDirectoryRawSearchParams,
} from "@/features/engagement/dealer-onboarding";
import { readDealerDirectory } from "@/features/engagement/dealer-onboarding/server/dealer-onboarding.server";

const PAGE_TITLE = "Dealers";
const PAGE_DESCRIPTION =
  "Manage dealers and sub-dealers, contacts, tax identity, locations, wallets, Welfare Fund activity, and supporting documents.";

type PageProps = Readonly<{
  searchParams: Promise<DealerDirectoryRawSearchParams>;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
} satisfies Metadata;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export default async function DealersRoutePage({
  searchParams,
}: PageProps): Promise<ReactElement> {
  const [me, rawSearchParams] = await Promise.all([
    requireAuthenticatedMe(),
    searchParams,
  ]);
  const parsedQuery = parseDealerDirectorySearchParams(rawSearchParams);

  if (!parsedQuery.success) {
    return (
      <DealerOnboardingInvalidQueryState issues={parsedQuery.error.issues} />
    );
  }

  const access = resolveDealerOnboardingAccess(me);
  if (access.kind !== "resolved") {
    return <DealerOnboardingAccessState access={access} />;
  }

  const data = await readDealerDirectory({
    access,
    query: {
      ...(parsedQuery.data.q === undefined ? {} : { q: parsedQuery.data.q }),
      ...(parsedQuery.data.dealerType === undefined
        ? {}
        : { dealerType: parsedQuery.data.dealerType }),
      ...(parsedQuery.data.active === undefined
        ? {}
        : { active: parsedQuery.data.active === "true" }),
      limit: 40,
      ...(parsedQuery.data.cursor === undefined
        ? {}
        : { cursor: parsedQuery.data.cursor }),
    },
  });

  return (
    <DealerOnboardingPage
      access={access}
      data={data}
      query={parsedQuery.data}
    />
  );
}

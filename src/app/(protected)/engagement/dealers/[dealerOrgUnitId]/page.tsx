// oz-next-app/src/app/(protected)/engagement/dealers/[dealerOrgUnitId]/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { erpUuidSchema } from "@/features/erp-core/contracts/erp-common.schema";
import {
  DealerDetailPage,
  DealerOnboardingAccessState,
  resolveDealerOnboardingAccess,
} from "@/features/engagement/dealer-onboarding";
import { readDealerDirectoryDetail } from "@/features/engagement/dealer-onboarding/server/dealer-onboarding.server";

export const metadata = {
  title: "Dealer Details",
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

type PageProps = Readonly<{
  params: Promise<Readonly<{ dealerOrgUnitId: string }>>;
}>;

export default async function DealerDetailRoutePage({
  params,
}: PageProps): Promise<ReactElement> {
  const [me, rawParams] = await Promise.all([requireAuthenticatedMe(), params]);
  const dealerOrgUnitId = erpUuidSchema.parse(rawParams.dealerOrgUnitId);
  const access = resolveDealerOnboardingAccess(me);

  if (access.kind !== "resolved") {
    return <DealerOnboardingAccessState access={access} />;
  }

  const dealer = await readDealerDirectoryDetail({ access, dealerOrgUnitId });
  return <DealerDetailPage access={access} dealer={dealer} />;
}

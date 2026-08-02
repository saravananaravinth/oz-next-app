// oz-next-app/src/app/(protected)/engagement/dealership-applications/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { resolveDealershipApplicationRoute } from "@/app/(protected)/engagement/dealership-applications/_lib/dealership-application-route";
import {
  DealershipApplicationDashboardPage,
  readDealershipApplicationDashboard,
  type DealershipApplicationRawSearchParams,
} from "@/features/engagement/dealership-application-operations";

const PAGE_TITLE = "Dealership applications";
const PAGE_DESCRIPTION =
  "Dealer-manager operating workspace for dealership application evaluation, onboarding, activation, communications, and controlled exit.";

type PageProps = Readonly<{
  searchParams: Promise<DealershipApplicationRawSearchParams>;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
} satisfies Metadata;

export default async function DealershipApplicationsRoutePage({
  searchParams,
}: PageProps): Promise<ReactElement> {
  const route = await resolveDealershipApplicationRoute({ searchParams });
  if (route.kind === "blocked") return route.content;

  const data = await readDealershipApplicationDashboard({
    query: route.query,
    access: route.access,
  });

  return (
    <DealershipApplicationDashboardPage
      access={route.access}
      query={route.query}
      data={data}
    />
  );
}

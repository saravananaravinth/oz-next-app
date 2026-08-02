import type { Metadata } from "next";
import type { ReactElement } from "react";

import { resolveDealerOperationsListRoute } from "@/app/(protected)/engagement/dealership-applications/_lib/dealer-operations-route";
import {
  DealerListPage,
  readDealerOperationsPage,
  type DealerOperationsRawSearchParams,
} from "@/features/engagement/dealer-operations";

export const metadata = {
  title: "Dealers and sub-dealers",
  description:
    "Authorized dealer and sub-dealer administration for profiles, ERP users, margins, documents, and operating status.",
} satisfies Metadata;

type PageProps = Readonly<{
  searchParams: Promise<DealerOperationsRawSearchParams>;
}>;

export default async function DealerOperationsRoutePage({
  searchParams,
}: PageProps): Promise<ReactElement> {
  const route = await resolveDealerOperationsListRoute({ searchParams });
  if (route.kind === "blocked") return route.content;

  const page = await readDealerOperationsPage({
    access: route.access,
    query: route.query,
  });

  return (
    <DealerListPage access={route.access} query={route.query} page={page} />
  );
}

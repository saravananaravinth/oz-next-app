import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { z } from "zod";

import { resolveDealerOperationsAccess } from "@/app/(protected)/engagement/dealership-applications/_lib/dealer-operations-route";
import { renderDealershipApplicationResourceFailure } from "@/app/(protected)/engagement/dealership-applications/_lib/dealership-application-route";
import {
  DEALER_OPERATIONS_ROUTES,
  DealerDetailPage,
  readDealerOperationDetail,
} from "@/features/engagement/dealer-operations";

const paramsSchema = z.object({ dealerOrgUnitId: z.uuid() }).strict();

export const metadata = {
  title: "Dealer administration",
  description:
    "Actor-scoped dealer profile, user, margin, document, and operating-status administration.",
} satisfies Metadata;

type PageProps = Readonly<{
  params: Promise<Readonly<{ dealerOrgUnitId: string }>>;
}>;

export default async function DealerOperationDetailRoutePage({
  params,
}: PageProps): Promise<ReactElement> {
  const [route, rawParams] = await Promise.all([
    resolveDealerOperationsAccess("canReadDealers", "Dealer administration"),
    params,
  ]);
  if (route.kind === "blocked") return route.content;

  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) notFound();

  let detail;
  try {
    detail = await readDealerOperationDetail({
      access: route.access,
      dealerOrgUnitId: parsed.data.dealerOrgUnitId,
    });
  } catch (error: unknown) {
    return renderDealershipApplicationResourceFailure(error, {
      resourceLabel: "Dealer organization",
      fallbackHref: DEALER_OPERATIONS_ROUTES.dealers,
      fallbackLabel: "Back to dealers",
    });
  }
  return <DealerDetailPage access={route.access} detail={detail} />;
}

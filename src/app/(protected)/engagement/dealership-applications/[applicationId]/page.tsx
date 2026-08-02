// oz-next-app/src/app/(protected)/engagement/dealership-applications/[applicationId]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { z } from "zod";

import {
  renderDealershipApplicationResourceFailure,
  resolveDealershipApplicationRoute,
} from "@/app/(protected)/engagement/dealership-applications/_lib/dealership-application-route";
import {
  DEALERSHIP_APPLICATION_ROUTES,
  DealershipApplicationDetailPage,
  readDealershipApplicationDetail,
  readDealershipApplicationFilterOptions,
  type DealershipApplicationRawSearchParams,
} from "@/features/engagement/dealership-application-operations";

const paramsSchema = z.object({ applicationId: z.uuid() }).strict();

type PageProps = Readonly<{
  params: Promise<Readonly<{ applicationId: string }>>;
  searchParams: Promise<DealershipApplicationRawSearchParams>;
}>;

export const metadata = {
  title: "Dealership application details",
  description:
    "Authorized dealership application lifecycle operating workspace.",
} satisfies Metadata;

export default async function DealershipApplicationDetailRoutePage({
  params,
  searchParams,
}: PageProps): Promise<ReactElement> {
  const [route, rawParams] = await Promise.all([
    resolveDealershipApplicationRoute({
      searchParams,
      requiredCapability: "canReadApplications",
    }),
    params,
  ]);
  if (route.kind === "blocked") return route.content;

  const parsedParams = paramsSchema.safeParse(rawParams);
  if (!parsedParams.success) notFound();

  let detail: Awaited<ReturnType<typeof readDealershipApplicationDetail>>;
  let filterOptions: Awaited<
    ReturnType<typeof readDealershipApplicationFilterOptions>
  > | null;

  try {
    const [detailResult, filterOptionsResult] = await Promise.allSettled([
      readDealershipApplicationDetail({
        applicationId: parsedParams.data.applicationId,
        access: route.access,
      }),
      readDealershipApplicationFilterOptions(route.access),
    ]);

    if (detailResult.status === "rejected") {
      throw detailResult.reason;
    }

    detail = detailResult.value;
    filterOptions =
      filterOptionsResult.status === "fulfilled"
        ? filterOptionsResult.value
        : null;
  } catch (error: unknown) {
    return renderDealershipApplicationResourceFailure(error, {
      resourceLabel: "Dealership application",
      fallbackHref: DEALERSHIP_APPLICATION_ROUTES.dashboard,
      fallbackLabel: "Back to dealership applications",
    });
  }

  return (
    <DealershipApplicationDetailPage
      access={route.access}
      query={route.query}
      detail={detail}
      filterOptions={filterOptions}
    />
  );
}

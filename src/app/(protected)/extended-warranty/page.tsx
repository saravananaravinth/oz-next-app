// oz-next-app/src/app/(protected)/extended-warranty/page.tsx
import { isApiHttpError } from "@/lib/api/problem";
import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { loadExtendedWarrantyReviewOrder } from "@/features/extended-warranty/api/review.server";
import type { Metadata } from "next";

import {
  ExtendedWarrantyWorkspacePage,
  loadExtendedWarrantyVehicleDetail,
  loadExtendedWarrantyWorkspace,
} from "@/features/extended-warranty";
import { extendedWarrantyWorkspaceQuerySchema } from "@/features/extended-warranty/contracts/admin.schema";
import { EXTENDED_WARRANTY_ROUTE_PERMISSION } from "@/features/extended-warranty/contracts/route-access";
import { requireExtendedWarrantyRouteAccess } from "@/features/extended-warranty/server/route-access";

export const metadata: Metadata = {
  title: "Extended Warranty | Ozotec ERP",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type ExtendedWarrantyOverviewPageProps = Readonly<{
  searchParams: Promise<
    Readonly<Record<string, string | string[] | undefined>>
  >;
}>;

function flattenSearchParams(
  raw: Readonly<Record<string, string | string[] | undefined>>,
): Record<string, string | undefined> {
  const entries: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      entries[key] = value;
      continue;
    }

    if (Array.isArray(value) && value.length > 0) {
      entries[key] = value[0];
    }
  }

  return entries;
}

export default async function Page({
  searchParams,
}: ExtendedWarrantyOverviewPageProps) {
  const access = await requireExtendedWarrantyRouteAccess([
    EXTENDED_WARRANTY_ROUTE_PERMISSION.OVERVIEW,
    EXTENDED_WARRANTY_ROUTE_PERMISSION.ORDERS,
  ]);

  if (access.kind !== "resolved") {
    return (
      <div role="status" className="p-6">
        {access.reason}
      </div>
    );
  }

  const parsedQuery = extendedWarrantyWorkspaceQuerySchema.parse(
    flattenSearchParams(await searchParams),
  );

  const [data, detail] = await Promise.all([
    loadExtendedWarrantyWorkspace(access, parsedQuery),
    parsedQuery.unitId === undefined
      ? Promise.resolve(null)
      : loadExtendedWarrantyVehicleDetail(access, parsedQuery.unitId),
  ]);

  const me = await requireAuthenticatedMe();
  const canReview = me.permissions.includes("extended-warranty:review");
  let review = null;
  let reviewUnavailable: string | null = null;
  if (canReview && detail?.orderId && detail.installationSubmittedAt) {
    try {
      review = await loadExtendedWarrantyReviewOrder(access, detail.orderId);
    } catch (error) {
      if (
        isApiHttpError(error) &&
        (error.status === 409 || error.status === 404)
      )
        reviewUnavailable =
          "Installation evidence is not ready for review. Refresh after processing completes.";
      else throw error;
    }
  }
  return (
    <ExtendedWarrantyWorkspacePage
      tenantId={access.tenantId}
      data={data}
      query={parsedQuery}
      detail={detail}
      review={review}
      reviewUnavailable={reviewUnavailable}
      canReconcile={me.permissions.includes("payment:reconcile")}
      canSend={me.permissions.includes("extended-warranty:order:update")}
    />
  );
}

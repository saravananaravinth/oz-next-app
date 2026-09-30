// oz-next-app/src/app/(protected)/extended-warranty/page.tsx
import type { Metadata } from "next";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  ExtendedWarrantyWorkspacePage,
  loadExtendedWarrantyVehicleDetail,
  loadExtendedWarrantyWorkspace,
  type ExtendedWarrantyWorkspaceDetailPayload,
  type ExtendedWarrantyWorkspaceReviewPayload,
} from "@/features/extended-warranty";
import { loadExtendedWarrantyReviewOrder } from "@/features/extended-warranty/api/review.server";
import { extendedWarrantyWorkspaceQuerySchema } from "@/features/extended-warranty/contracts/admin.schema";
import { EXTENDED_WARRANTY_ROUTE_PERMISSION } from "@/features/extended-warranty/contracts/route-access";
import { requireExtendedWarrantyRouteAccess } from "@/features/extended-warranty/server/route-access";
import { isApiHttpError } from "@/lib/api/problem";

export const metadata: Metadata = {
  title: "Extended Warranty | Ozotec ERP",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const REVIEW_NOT_READY_MESSAGE =
  "Installation evidence is not ready for review. Refresh after processing completes.";

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
  const [access, rawSearchParams] = await Promise.all([
    requireExtendedWarrantyRouteAccess([
      EXTENDED_WARRANTY_ROUTE_PERMISSION.OVERVIEW,
      EXTENDED_WARRANTY_ROUTE_PERMISSION.ORDERS,
    ]),
    searchParams,
  ]);

  if (access.kind !== "resolved") {
    return (
      <div role="status" className="p-6">
        {access.reason}
      </div>
    );
  }

  const parsedQuery = extendedWarrantyWorkspaceQuerySchema.parse(
    flattenSearchParams(rawSearchParams),
  );
  const mePromise = requireAuthenticatedMe();
  const workspacePromise = loadExtendedWarrantyWorkspace(access, parsedQuery);
  const selectedUnitId = parsedQuery.unitId;

  const detailPromise: Promise<ExtendedWarrantyWorkspaceDetailPayload> | null =
    selectedUnitId === undefined
      ? null
      : loadExtendedWarrantyVehicleDetail(access, selectedUnitId);

  const reviewPromise: Promise<ExtendedWarrantyWorkspaceReviewPayload> | null =
    detailPromise === null
      ? null
      : (async (): Promise<ExtendedWarrantyWorkspaceReviewPayload> => {
          const [detail, me] = await Promise.all([detailPromise, mePromise]);
          const canReview = me.permissions.includes("extended-warranty:review");

          if (
            !canReview ||
            !detail.orderId ||
            !detail.installationSubmittedAt
          ) {
            return { review: null, reviewUnavailable: null };
          }

          try {
            const review = await loadExtendedWarrantyReviewOrder(
              access,
              detail.orderId,
            );
            return { review, reviewUnavailable: null };
          } catch (error: unknown) {
            if (
              isApiHttpError(error) &&
              (error.status === 409 || error.status === 404)
            ) {
              return {
                review: null,
                reviewUnavailable: REVIEW_NOT_READY_MESSAGE,
              };
            }
            throw error;
          }
        })();

  const [data, me] = await Promise.all([workspacePromise, mePromise]);

  return (
    <ExtendedWarrantyWorkspacePage
      tenantId={access.tenantId}
      data={data}
      query={parsedQuery}
      detailPromise={detailPromise}
      reviewPromise={reviewPromise}
      canReconcile={me.permissions.includes("payment:reconcile")}
      canReview={me.permissions.includes("extended-warranty:review")}
      canSend={me.permissions.includes("extended-warranty:order:update")}
    />
  );
}

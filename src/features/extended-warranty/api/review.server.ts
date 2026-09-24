// oz-next-app/src/features/extended-warranty/api/review.server.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  EXTENDED_WARRANTY_ROUTE_PERMISSION,
  hasRequiredExtendedWarrantyPermissions,
} from "@/features/extended-warranty/contracts/route-access";
import {
  resolveTenantAccess,
  type ResolvedTenantAccess,
} from "@/features/tenant-context";
import { HTTP_METHODS } from "@/lib/api/http-contract";
import { serverFetch } from "@/server/api/edge-fetch";
import {
  buildExtendedWarrantyReviewOrderPath,
  buildExtendedWarrantyReviewsPath,
  extendedWarrantyReviewDecisionInputSchema,
  extendedWarrantyReviewDecisionResultSchema,
  extendedWarrantyReviewDetailSchema,
  extendedWarrantyReviewQueueSchema,
  type ExtendedWarrantyReviewDecisionInput,
  type ExtendedWarrantyReviewDetail,
  type ExtendedWarrantyReviewQueue,
} from "@/features/extended-warranty/contracts/review.schema";

type ReviewAccess = Pick<ResolvedTenantAccess, "tenantId" | "actorContext">;

const contextOptions = (access: ReviewAccess) =>
  access.actorContext === undefined
    ? {}
    : { actorContext: access.actorContext };

async function requireReviewActionAccess(): Promise<ReviewAccess> {
  const me = await requireAuthenticatedMe();

  if (
    !hasRequiredExtendedWarrantyPermissions(me.permissions, [
      EXTENDED_WARRANTY_ROUTE_PERMISSION.REVIEWS,
    ])
  ) {
    throw new Error("forbidden");
  }

  const access = resolveTenantAccess(me);

  if (access.kind !== "resolved") {
    throw new Error("invalid_tenant_context");
  }

  return access;
}

export async function loadExtendedWarrantyReviews(
  access: ReviewAccess,
  input: Readonly<{
    filter: "PENDING" | "HISTORY" | "ALL";
    cursor?: string | null;
  }>,
): Promise<ExtendedWarrantyReviewQueue> {
  const query = {
    filter: input.filter,
    limit: 50,
    ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
  };

  return await serverFetch(buildExtendedWarrantyReviewsPath(query), {
    method: HTTP_METHODS.GET,
    schema: extendedWarrantyReviewQueueSchema,
    cache: "no-store",
    ...contextOptions(access),
  });
}

export async function loadExtendedWarrantyReviewOrder(
  access: ReviewAccess,
  orderId: string,
): Promise<ExtendedWarrantyReviewDetail> {
  return await serverFetch(buildExtendedWarrantyReviewOrderPath(orderId), {
    method: HTTP_METHODS.GET,
    schema: extendedWarrantyReviewDetailSchema,
    cache: "no-store",
    ...contextOptions(access),
  });
}

export async function submitExtendedWarrantyReviewDecision(
  input: ExtendedWarrantyReviewDecisionInput,
): Promise<Readonly<{ reviewId: string; activationId: string | null }>> {
  const parsed = extendedWarrantyReviewDecisionInputSchema.parse(input);
  const access = await requireReviewActionAccess();
  const result = await serverFetch(
    buildExtendedWarrantyReviewOrderPath(parsed.orderId),
    {
      method: HTTP_METHODS.POST,
      body: {
        decision: parsed.decision,
        reasonCode: parsed.reasonCode,
        notes: parsed.notes,
        orderRowVersion: parsed.orderRowVersion,
        evidenceRowVersion: parsed.evidenceRowVersion,
      },
      schema: extendedWarrantyReviewDecisionResultSchema,
      idempotencyKey: parsed.idempotencyKey,
      cache: "no-store",
      ...contextOptions(access),
    },
  );

  revalidatePath("/extended-warranty");
  revalidatePath(`/extended-warranty/orders/${parsed.orderId}`);

  return result;
}

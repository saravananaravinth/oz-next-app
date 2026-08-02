"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import { resolveDealerDashboardAccess } from "@/features/engagement/dealer-dashboard/policies/dealer-dashboard.policy";
import {
  dealerOperationUserSchema,
  type DealerOperationUser,
} from "@/features/engagement/dealer-operations/contracts/dealer-operations.schema";
import { ENGAGEMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { API_CONFIG, HTTP_METHODS } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";
import { assertSameOriginMutation } from "@/server/security/origin";

const client = createErpFeatureClient({
  featureName: "engagement.dealer-staff-self-service",
  basePath: ENGAGEMENT_ENDPOINTS.dealerOperationsBase,
});

const uuid = z.uuid();
const intentKey = z.string().trim().min(16).max(128);
const dealerStaffCreateSchema = z.object({
  dealerOrgUnitId: uuid,
  displayName: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  phoneE164: z.string().regex(/^\+91[6-9][0-9]{9}$/u),
  title: z.string().trim().max(120).nullable(),
  idempotencyKey: intentKey,
});
const dealerStaffUpdateSchema = z.object({
  dealerOrgUnitId: uuid,
  dealerUserId: uuid,
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
  displayName: z.string().trim().min(1).max(120),
  title: z.string().trim().max(120).nullable(),
  status: z.enum(["ACTIVE", "DISABLED"]),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: intentKey,
});

export type DealerStaffActionResult =
  | Readonly<{ ok: true; data: DealerOperationUser }>
  | Readonly<{ ok: false; message: string; requestId?: string }>;

async function requireDealerAdministrator(
  dealerOrgUnitId: string,
): Promise<void> {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  const access = resolveDealerDashboardAccess(await requireAuthenticatedMe());
  if (
    access.kind !== "dealer" ||
    access.context.dealerOrgUnitId !== dealerOrgUnitId ||
    !access.capabilities.canManageDealerStaff
  ) {
    throw new Error("Dealer administrator access is required.");
  }
}

function failure(error: unknown): DealerStaffActionResult {
  if (isApiHttpError(error)) {
    return {
      ok: false,
      message:
        error.status === 409
          ? "The staff record changed or the requested access change is not permitted. Reload and try again."
          : error.status === 403
            ? "You are not authorized to manage staff for this dealer."
            : "Dealer staff could not be updated.",
      ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
    };
  }
  return { ok: false, message: "Dealer staff could not be updated." };
}

export async function createDealerStaffAction(
  raw: z.input<typeof dealerStaffCreateSchema>,
): Promise<DealerStaffActionResult> {
  try {
    const input = dealerStaffCreateSchema.parse(raw);
    await requireDealerAdministrator(input.dealerOrgUnitId);
    const data = await client.request({
      method: HTTP_METHODS.POST,
      path: `/dealers/${encodeURIComponent(input.dealerOrgUnitId)}/users`,
      body: {
        displayName: input.displayName,
        email: input.email,
        phoneE164: input.phoneE164,
        roleName: "dealer_staff",
        title: input.title,
      },
      schema: dealerOperationUserSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
    });
    revalidatePath("/dashboard");
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error);
  }
}

export async function updateDealerStaffAction(
  raw: z.input<typeof dealerStaffUpdateSchema>,
): Promise<DealerStaffActionResult> {
  try {
    const input = dealerStaffUpdateSchema.parse(raw);
    await requireDealerAdministrator(input.dealerOrgUnitId);
    const data = await client.request({
      method: HTTP_METHODS.PATCH,
      path: `/dealers/${encodeURIComponent(input.dealerOrgUnitId)}/users/${encodeURIComponent(input.dealerUserId)}`,
      body: {
        expectedUpdatedAt: input.expectedUpdatedAt,
        displayName: input.displayName,
        roleName: "dealer_staff",
        title: input.title,
        status: input.status,
        reason: input.reason,
      },
      schema: dealerOperationUserSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
    });
    revalidatePath("/dashboard");
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error);
  }
}

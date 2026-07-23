// oz-next-app/src/features/engagement/operations-dashboard/actions/engagement-dashboard.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import { ENGAGEMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { API_CONFIG, HTTP_METHODS } from "@/lib/api/http-contract";
import { ApiHttpError, isApiHttpError } from "@/lib/api/problem";
import { assertSameOriginMutation } from "@/server/security/origin";

import {
  dealerLocationActionInputSchema,
  dealerLocationMutationResultSchema,
  dealerSettingsActionInputSchema,
  dealerSettingsMutationResultSchema,
  engagementSupportIssueActionResultSchema,
  engagementSupportRetryResultSchema,
  issueActionInputSchema,
  retryOperationInputSchema,
  engagementVideoSequenceItemSchema,
  engagementVideoSequenceSchema,
  videoSequenceCreateActionInputSchema,
  videoSequenceItemCreateActionInputSchema,
  videoSequenceItemUpdateActionInputSchema,
  videoSequenceUpdateActionInputSchema,
  type DealerLocationActionInput,
  type DealerSettingsActionInput,
  type IssueActionInput,
  type RetryOperationInput,
  type VideoSequenceCreateActionInput,
  type VideoSequenceItemCreateActionInput,
  type VideoSequenceItemUpdateActionInput,
  type VideoSequenceUpdateActionInput,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import {
  resolveEngagementDashboardAccess,
  type EngagementDashboardCapabilities,
  type ResolvedEngagementDashboardAccess,
} from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";

const DASHBOARD_PATH = "/engagement/dashboard";
const tenantContextSchema = z
  .object({
    tenantId: z.string().trim().pipe(z.uuid()).optional(),
  })
  .strict();

const dashboardClient = createErpFeatureClient({
  featureName: "engagement.operations-dashboard",
  basePath: ENGAGEMENT_ENDPOINTS.operationsDashboardBase,
});
const supportClient = createErpFeatureClient({
  featureName: "engagement.support",
  basePath: ENGAGEMENT_ENDPOINTS.supportBase,
});
const videoSequenceClient = createErpFeatureClient({
  featureName: "engagement.video-sequences",
  basePath: ENGAGEMENT_ENDPOINTS.videoSequencesBase,
});

export type EngagementDashboardActionResult =
  | Readonly<{ ok: true; message: string }>
  | Readonly<{
      ok: false;
      code: string;
      message: string;
      requestId?: string;
    }>;

function actionFailure(error: unknown): EngagementDashboardActionResult {
  if (isApiHttpError(error)) {
    const requestId = error.requestId?.trim();
    const message =
      error.status === 409
        ? "This record changed before the operation completed. Refresh and try again."
        : error.status === 403
          ? "You are not authorized to perform this engagement operation."
          : error.status === 429
            ? "The operation was rate limited. Wait for the displayed retry window before retrying."
            : error.status >= 500
              ? "The engagement operation is temporarily unavailable."
              : "The engagement operation could not be completed. Review the values and try again.";

    return {
      ok: false,
      code: error.code,
      message,
      ...(requestId !== undefined && requestId.length > 0 ? { requestId } : {}),
    };
  }

  return {
    ok: false,
    code: "engagement_dashboard_operation_failed",
    message: "The engagement operation could not be completed safely.",
  };
}

async function requireActionAccess(
  tenantId: string | undefined,
  capability: keyof EngagementDashboardCapabilities,
): Promise<ResolvedEngagementDashboardAccess> {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  const context = tenantContextSchema.parse({ tenantId });
  const me = await requireAuthenticatedMe();
  const access = resolveEngagementDashboardAccess(me, context.tenantId);

  if (access.kind !== "resolved" || !access.capabilities[capability]) {
    throw new ApiHttpError({
      message:
        "Engagement dashboard action is not permitted for this actor context.",
      status: 403,
      code: "engagement_dashboard_action_forbidden",
    });
  }

  return access;
}

function refreshDashboard(dealerOrgUnitId?: string, leadId?: string): void {
  revalidatePath(DASHBOARD_PATH);
  if (dealerOrgUnitId !== undefined) {
    revalidatePath(`${DASHBOARD_PATH}/dealers/${dealerOrgUnitId}`);
  }
  if (leadId !== undefined) {
    revalidatePath(`${DASHBOARD_PATH}/leads/${leadId}`);
  }
}

export async function updateEngagementIssueAction(
  input: Readonly<{
    tenantId?: string;
    values: IssueActionInput;
  }>,
): Promise<EngagementDashboardActionResult> {
  try {
    const access = await requireActionAccess(input.tenantId, "canIntervene");
    const values = issueActionInputSchema.parse(input.values);

    await supportClient.request({
      method: HTTP_METHODS.POST,
      path: `/issues/${encodeURIComponent(values.issueKey)}/action`,
      body: {
        state: values.state,
        resolutionNote: values.resolutionNote ?? null,
        rowVersion: values.rowVersion,
      },
      schema: engagementSupportIssueActionResultSchema,
      idempotencyKey: values.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext !== undefined
        ? { actorContext: access.actorContext }
        : {}),
    });

    refreshDashboard();
    return {
      ok: true,
      message:
        values.state === "RESOLVED"
          ? "The issue was resolved with an audited resolution note."
          : "The issue was acknowledged.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function reassignEngagementLeadAction(
  input: Readonly<{
    tenantId?: string;
    values: RetryOperationInput;
  }>,
): Promise<EngagementDashboardActionResult> {
  try {
    const access = await requireActionAccess(input.tenantId, "canReassignLead");
    const values = retryOperationInputSchema.parse(input.values);
    const result = await supportClient.request({
      method: HTTP_METHODS.POST,
      path: `/leads/${encodeURIComponent(values.resourceId)}/reassign`,
      body: { reason: values.reason },
      schema: engagementSupportRetryResultSchema,
      idempotencyKey: values.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext !== undefined
        ? { actorContext: access.actorContext }
        : {}),
    });

    refreshDashboard(undefined, values.resourceId);
    return {
      ok: true,
      message:
        result.outcome === "NO_ELIGIBLE_DEALER"
          ? "The reassignment check completed, but no eligible dealer was available."
          : result.outcome === "NOOP"
            ? "The same reassignment intent was already processed."
            : "The nearest-dealer reassignment was processed.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function retryEngagementDeliveryAction(
  input: Readonly<{
    tenantId?: string;
    kind: "OUTBOX" | "VIDEO_MESSAGE";
    values: RetryOperationInput;
  }>,
): Promise<EngagementDashboardActionResult> {
  try {
    const access = await requireActionAccess(
      input.tenantId,
      "canRetryDelivery",
    );
    const values = retryOperationInputSchema.parse(input.values);
    const isOutbox = input.kind === "OUTBOX";

    const result = await supportClient.request({
      method: HTTP_METHODS.POST,
      path: isOutbox
        ? `/outbox/${encodeURIComponent(values.resourceId)}/retry`
        : `/video-messages/${encodeURIComponent(values.resourceId)}/retry`,
      body: { reason: values.reason },
      schema: engagementSupportRetryResultSchema,
      idempotencyKey: values.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext !== undefined
        ? { actorContext: access.actorContext }
        : {}),
    });

    refreshDashboard();
    return {
      ok: true,
      message:
        result.outcome === "NOOP"
          ? "The same retry intent was already processed."
          : isOutbox
            ? "The idempotent outbox retry was queued."
            : "The failed video message retry was queued.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateEngagementDealerSettingsAction(
  input: Readonly<{
    tenantId?: string;
    values: DealerSettingsActionInput;
  }>,
): Promise<EngagementDashboardActionResult> {
  try {
    const access = await requireActionAccess(
      input.tenantId,
      "canUpdateDealerSettings",
    );
    const values = dealerSettingsActionInputSchema.parse(input.values);

    await dashboardClient.request({
      method: HTTP_METHODS.PATCH,
      path: `/dealers/${encodeURIComponent(values.dealerOrgUnitId)}/settings`,
      body: {
        rowVersion: values.rowVersion,
        orgUnitActive: values.orgUnitActive,
        engagementActive: values.engagementActive,
        supportsVehicleEnquiries: values.supportsVehicleEnquiries,
        supportsServiceEnquiries: values.supportsServiceEnquiries,
        supportsWarranty: values.supportsWarranty,
        priority: values.priority,
        assignmentWeight: values.assignmentWeight,
        maxOpenLeads: values.maxOpenLeads,
        maxAssignmentDistanceKm: values.maxAssignmentDistanceKm,
        ...(values.businessHours !== undefined
          ? { businessHours: values.businessHours }
          : {}),
        reason: values.reason,
      },
      schema: dealerSettingsMutationResultSchema,
      idempotencyKey: values.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext !== undefined
        ? { actorContext: access.actorContext }
        : {}),
    });

    refreshDashboard(values.dealerOrgUnitId);
    return {
      ok: true,
      message:
        "Dealer engagement configuration was updated with optimistic concurrency.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateEngagementDealerLocationAction(
  input: Readonly<{
    tenantId?: string;
    values: DealerLocationActionInput;
  }>,
): Promise<EngagementDashboardActionResult> {
  try {
    const access = await requireActionAccess(
      input.tenantId,
      "canUpdateDealerLocation",
    );
    const values = dealerLocationActionInputSchema.parse(input.values);

    await dashboardClient.request({
      method: HTTP_METHODS.PATCH,
      path: `/dealers/${encodeURIComponent(values.dealerOrgUnitId)}/location`,
      body: {
        rowVersion: values.rowVersion,
        latitude: values.latitude,
        longitude: values.longitude,
        googleMapsUrl: values.googleMapsUrl,
        ...(values.name !== undefined ? { name: values.name } : {}),
        ...(values.addressLine1 !== undefined
          ? { addressLine1: values.addressLine1 }
          : {}),
        ...(values.addressLine2 !== undefined
          ? { addressLine2: values.addressLine2 }
          : {}),
        ...(values.city !== undefined ? { city: values.city } : {}),
        ...(values.district !== undefined ? { district: values.district } : {}),
        ...(values.state !== undefined ? { state: values.state } : {}),
        ...(values.postalCode !== undefined
          ? { postalCode: values.postalCode }
          : {}),
        reason: values.reason,
      },
      schema: dealerLocationMutationResultSchema,
      idempotencyKey: values.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext !== undefined
        ? { actorContext: access.actorContext }
        : {}),
    });

    refreshDashboard(values.dealerOrgUnitId);
    return {
      ok: true,
      message: "Dealer coordinates and map configuration were updated.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function createEngagementVideoSequenceAction(
  input: Readonly<{
    tenantId?: string;
    values: VideoSequenceCreateActionInput;
  }>,
): Promise<EngagementDashboardActionResult> {
  try {
    const access = await requireActionAccess(
      input.tenantId,
      "canUpdateVideoSequences",
    );
    const values = videoSequenceCreateActionInputSchema.parse(input.values);

    await videoSequenceClient.request({
      method: HTTP_METHODS.POST,
      path: "/",
      body: {
        sequenceCode: values.sequenceCode,
        name: values.name,
        description: values.description ?? null,
        active: values.active,
        reason: values.reason,
      },
      schema: engagementVideoSequenceSchema,
      idempotencyKey: values.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext !== undefined
        ? { actorContext: access.actorContext }
        : {}),
    });

    refreshDashboard();
    return {
      ok: true,
      message: "The video sequence was created with an audited reason.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateEngagementVideoSequenceAction(
  input: Readonly<{
    tenantId?: string;
    values: VideoSequenceUpdateActionInput;
  }>,
): Promise<EngagementDashboardActionResult> {
  try {
    const access = await requireActionAccess(
      input.tenantId,
      "canUpdateVideoSequences",
    );
    const values = videoSequenceUpdateActionInputSchema.parse(input.values);

    await videoSequenceClient.request({
      method: HTTP_METHODS.PATCH,
      path: `/${encodeURIComponent(values.videoSequenceId)}`,
      body: {
        rowVersion: values.rowVersion,
        ...(values.name !== undefined ? { name: values.name } : {}),
        ...(values.description !== undefined
          ? { description: values.description }
          : {}),
        ...(values.active !== undefined ? { active: values.active } : {}),
        reason: values.reason,
      },
      schema: engagementVideoSequenceSchema,
      idempotencyKey: values.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext !== undefined
        ? { actorContext: access.actorContext }
        : {}),
    });

    refreshDashboard();
    return {
      ok: true,
      message: "The video sequence was updated with row-version protection.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function createEngagementVideoSequenceItemAction(
  input: Readonly<{
    tenantId?: string;
    values: VideoSequenceItemCreateActionInput;
  }>,
): Promise<EngagementDashboardActionResult> {
  try {
    const access = await requireActionAccess(
      input.tenantId,
      "canUpdateVideoSequences",
    );
    const values = videoSequenceItemCreateActionInputSchema.parse(input.values);

    await videoSequenceClient.request({
      method: HTTP_METHODS.POST,
      path: `/${encodeURIComponent(values.videoSequenceId)}/items`,
      body: {
        dayNo: values.dayNo,
        videoTitle: values.videoTitle,
        videoUrl: values.videoUrl,
        templateCode: values.templateCode,
        active: values.active,
        reason: values.reason,
      },
      schema: engagementVideoSequenceItemSchema,
      idempotencyKey: values.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext !== undefined
        ? { actorContext: access.actorContext }
        : {}),
    });

    refreshDashboard();
    return {
      ok: true,
      message: "The video schedule item was created.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateEngagementVideoSequenceItemAction(
  input: Readonly<{
    tenantId?: string;
    values: VideoSequenceItemUpdateActionInput;
  }>,
): Promise<EngagementDashboardActionResult> {
  try {
    const access = await requireActionAccess(
      input.tenantId,
      "canUpdateVideoSequences",
    );
    const values = videoSequenceItemUpdateActionInputSchema.parse(input.values);

    await videoSequenceClient.request({
      method: HTTP_METHODS.PATCH,
      path: `/items/${encodeURIComponent(values.videoSequenceItemId)}`,
      body: {
        rowVersion: values.rowVersion,
        ...(values.dayNo !== undefined ? { dayNo: values.dayNo } : {}),
        ...(values.videoTitle !== undefined
          ? { videoTitle: values.videoTitle }
          : {}),
        ...(values.videoUrl !== undefined ? { videoUrl: values.videoUrl } : {}),
        ...(values.templateCode !== undefined
          ? { templateCode: values.templateCode }
          : {}),
        ...(values.active !== undefined ? { active: values.active } : {}),
        reason: values.reason,
      },
      schema: engagementVideoSequenceItemSchema,
      idempotencyKey: values.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext !== undefined
        ? { actorContext: access.actorContext }
        : {}),
    });

    refreshDashboard();
    return {
      ok: true,
      message:
        "The video schedule item was updated with row-version protection.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

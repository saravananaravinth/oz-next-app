// oz-next-app/src/features/engagement/operations-dashboard/actions/engagement-dashboard.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import {
  dealerLocationActionInputSchema,
  engagementDealerDetailSchema,
  engagementDealerPerformanceResultSchema,
  engagementLeadAdminSessionSchema,
  engagementLeadDetailSchema,
  dealerLocationMutationResultSchema,
  dealerSettingsActionInputSchema,
  dealerSettingsMutationResultSchema,
  engagementSupportIssueActionResultSchema,
  engagementSupportRetryResultSchema,
  engagementVideoSequenceItemSchema,
  issueActionInputSchema,
  leadAdminSessionActionInputSchema,
  retryOperationInputSchema,
  videoSequenceItemUpdateActionInputSchema,
  type DealerLocationActionInput,
  type EngagementDealerDetail,
  type EngagementDealerPerformanceResult,
  type EngagementLeadDetail,
  type DealerSettingsActionInput,
  type IssueActionInput,
  type RetryOperationInput,
  type VideoSequenceItemUpdateActionInput,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import {
  resolveEngagementDashboardAccess,
  type EngagementDashboardCapabilities,
  type ResolvedEngagementDashboardAccess,
} from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { ENGAGEMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { API_CONFIG, HTTP_METHODS } from "@/lib/api/http-contract";
import { ApiHttpError, isApiHttpError } from "@/lib/api/problem";
import { assertSameOriginMutation } from "@/server/security/origin";

const dealerDialogQuerySchema = z
  .object({
    dealerOrgUnitId: z.string().trim().pipe(z.uuid()),
    from: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/u),
    to: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/u),
    leadSourceIds: z.array(z.string().trim().pipe(z.uuid())).max(20).readonly(),
    ivrFlowCodes: z.array(z.string().trim().min(1).max(64)).max(16).readonly(),
    statuses: z.array(z.string().trim().min(1).max(64)).max(32).readonly(),
    dealerOrgUnitIds: z
      .array(z.string().trim().pipe(z.uuid()))
      .max(50)
      .readonly(),
    districts: z.array(z.string().trim().min(1).max(128)).max(50).readonly(),
    cities: z.array(z.string().trim().min(1).max(128)).max(50).readonly(),
    assignmentStates: z
      .array(z.enum(["ASSIGNED", "UNASSIGNED"]))
      .max(2)
      .readonly(),
    conversionStates: z
      .array(z.enum(["CONVERTED", "NOT_CONVERTED"]))
      .max(2)
      .readonly(),
    followUpStates: z
      .array(z.enum(["OVERDUE", "DUE_TODAY", "DUE_TOMORROW", "SCHEDULED"]))
      .max(4)
      .readonly(),
    issueSeverities: z
      .array(z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]))
      .max(4)
      .readonly(),
    q: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

const leadDialogQuerySchema = z
  .object({
    leadId: z.string().trim().pipe(z.uuid()),
  })
  .strict();

const districtDealersQuerySchema = dealerDialogQuerySchema
  .omit({ dealerOrgUnitId: true })
  .extend({ district: z.string().trim().min(1).max(128) })
  .strict();

export type ReadEngagementDealerDetailActionResult =
  | Readonly<{ ok: true; dealer: EngagementDealerDetail }>
  | Readonly<{
      ok: false;
      code: string;
      message: string;
      requestId?: string;
    }>;

export type ReadEngagementDistrictDealersActionResult =
  | Readonly<{ ok: true; dealers: EngagementDealerPerformanceResult }>
  | Readonly<{
      ok: false;
      code: string;
      message: string;
      requestId?: string;
    }>;

export type ReadEngagementLeadDetailActionResult =
  | Readonly<{ ok: true; lead: EngagementLeadDetail }>
  | Readonly<{
      ok: false;
      code: string;
      message: string;
      requestId?: string;
    }>;

export type CreateEngagementLeadAdminSessionActionResult =
  | Readonly<{
      ok: true;
      href: `/public/dealer-leads/${string}`;
      expiresAt: string;
      canForward: boolean;
    }>
  | EngagementDashboardActionFailure;

const DASHBOARD_PATHS = [
  "/engagement/dashboard",
  "/engagement/dashboard/dealers",
  "/engagement/dashboard/issues",
  "/engagement/dashboard/coverage",
  "/engagement/dashboard/configuration/video-sequences",
] as const;

const dashboardClient = createErpFeatureClient({
  featureName: "engagement.vehicle-sales-dashboard",
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

const DISTRICT_DEALER_PAGE_LIMIT = 100;
const DISTRICT_DEALER_FALLBACK_MAX_PAGES = 10;
const WHITESPACE_SEQUENCE_PATTERN = /\s+/gu;

type DistrictDealersQuery = z.output<typeof districtDealersQuerySchema>;

function normalizeDistrictKey(value: string | null): string {
  return (value ?? "")
    .trim()
    .replace(WHITESPACE_SEQUENCE_PATTERN, " ")
    .toLowerCase();
}

async function requestDistrictDealerPage(
  input: Readonly<{
    values: DistrictDealersQuery;
    access: ResolvedEngagementDashboardAccess;
    district?: string;
    cursor?: string;
  }>,
): Promise<EngagementDealerPerformanceResult> {
  return await dashboardClient.request({
    path: "/dealers",
    query: {
      from: input.values.from,
      to: input.values.to,
      leadSourceId: input.values.leadSourceIds,
      ivrFlowCode: input.values.ivrFlowCodes,
      status: input.values.statuses,
      dealerOrgUnitId: input.values.dealerOrgUnitIds,
      ...(input.district === undefined ? {} : { district: [input.district] }),
      city: input.values.cities,
      assignmentState: ["ASSIGNED"],
      conversionState: input.values.conversionStates,
      followUpState: input.values.followUpStates,
      issueSeverity: input.values.issueSeverities,
      engagementState: "ALL",
      sortBy: "ASSIGNED_COUNT",
      sortDirection: "DESC",
      limit: DISTRICT_DEALER_PAGE_LIMIT,
      ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
      ...(input.values.q === undefined ? {} : { q: input.values.q }),
    },
    schema: engagementDealerPerformanceResultSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

async function readDistrictDealers(
  values: DistrictDealersQuery,
  access: ResolvedEngagementDashboardAccess,
): Promise<EngagementDealerPerformanceResult> {
  const exactResult = await requestDistrictDealerPage({
    values,
    access,
    district: values.district,
  });

  if (exactResult.items.length > 0) {
    return exactResult;
  }

  const districtKey = normalizeDistrictKey(values.district);
  const matchedDealers: Array<
    EngagementDealerPerformanceResult["items"][number]
  > = [];
  const seenDealerIds = new Set<string>();
  let cursor: string | undefined;
  let asOf = exactResult.asOf;

  for (let page = 0; page < DISTRICT_DEALER_FALLBACK_MAX_PAGES; page += 1) {
    const pageResult = await requestDistrictDealerPage({
      values,
      access,
      ...(cursor === undefined ? {} : { cursor }),
    });

    asOf = pageResult.asOf;

    for (const dealer of pageResult.items) {
      if (
        normalizeDistrictKey(dealer.district) !== districtKey ||
        seenDealerIds.has(dealer.dealerOrgUnitId)
      ) {
        continue;
      }

      seenDealerIds.add(dealer.dealerOrgUnitId);
      matchedDealers.push(dealer);

      if (matchedDealers.length > DISTRICT_DEALER_PAGE_LIMIT) {
        throw new ApiHttpError({
          message:
            "District dealer detail exceeds the bounded dialog result limit.",
          status: 503,
          code: "engagement_district_dealer_result_limit_exceeded",
        });
      }
    }

    if (!pageResult.pagination.hasMore) {
      return engagementDealerPerformanceResultSchema.parse({
        asOf,
        items: matchedDealers,
        pagination: {
          limit: DISTRICT_DEALER_PAGE_LIMIT,
          hasMore: false,
          nextCursor: null,
        },
      });
    }

    if (pageResult.pagination.nextCursor === null) {
      throw new ApiHttpError({
        message:
          "Dealer pagination returned an inconsistent continuation state.",
        status: 503,
        code: "engagement_district_dealer_pagination_invalid",
      });
    }

    cursor = pageResult.pagination.nextCursor;
  }

  throw new ApiHttpError({
    message: "District dealer lookup exceeded its bounded pagination budget.",
    status: 503,
    code: "engagement_district_dealer_scan_limit_exceeded",
  });
}

export type EngagementDashboardActionFailure = Readonly<{
  ok: false;
  code: string;
  message: string;
  requestId?: string;
}>;

export type EngagementDashboardActionResult =
  | Readonly<{ ok: true; message: string; rowVersion?: number }>
  | EngagementDashboardActionFailure;

export type EngagementDealerConfigurationActionResult =
  | Readonly<{ ok: true; message: string; rowVersion: number }>
  | EngagementDashboardActionFailure;

function actionFailure(error: unknown): EngagementDashboardActionFailure {
  if (isApiHttpError(error)) {
    const requestId = error.requestId?.trim();
    const message =
      error.status === 409
        ? "This record changed before the operation completed. Refresh the page and try again."
        : error.status === 403
          ? "You are not authorized to perform this engagement operation."
          : error.status === 429
            ? "This operation is temporarily rate limited. Wait briefly before trying again."
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
  capability: keyof EngagementDashboardCapabilities,
): Promise<ResolvedEngagementDashboardAccess> {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  const me = await requireAuthenticatedMe();
  const access = resolveEngagementDashboardAccess(me);

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

function revalidateEngagementWorkspace(
  input?: Readonly<{
    dealerOrgUnitId?: string;
    leadId?: string;
  }>,
): void {
  for (const path of DASHBOARD_PATHS) {
    revalidatePath(path);
  }

  if (input?.dealerOrgUnitId !== undefined) {
    revalidatePath(
      `/engagement/dashboard/dealers/${encodeURIComponent(input.dealerOrgUnitId)}`,
    );
  }

  if (input?.leadId !== undefined) {
    revalidatePath(
      `/engagement/dashboard/leads/${encodeURIComponent(input.leadId)}`,
    );
  }
}

export async function readEngagementDistrictDealersAction(
  input: z.input<typeof districtDealersQuerySchema>,
): Promise<ReadEngagementDistrictDealersActionResult> {
  try {
    const access = await requireActionAccess("canReadDealerPerformance");
    const values = districtDealersQuerySchema.parse(input);
    const dealers = await readDistrictDealers(values, access);

    return { ok: true, dealers };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function readEngagementDealerDetailAction(
  input: z.input<typeof dealerDialogQuerySchema>,
): Promise<ReadEngagementDealerDetailActionResult> {
  try {
    const access = await requireActionAccess("canReadDealerPerformance");
    const values = dealerDialogQuerySchema.parse(input);
    const dealer = await dashboardClient.request({
      path: `/dealers/${encodeURIComponent(values.dealerOrgUnitId)}`,
      query: {
        from: values.from,
        to: values.to,
        leadSourceId: values.leadSourceIds,
        ivrFlowCode: values.ivrFlowCodes,
        status: values.statuses,
        dealerOrgUnitId: values.dealerOrgUnitIds,
        district: values.districts,
        city: values.cities,
        assignmentState: values.assignmentStates,
        conversionState: values.conversionStates,
        followUpState: values.followUpStates,
        issueSeverity: values.issueSeverities,
        ...(values.q !== undefined ? { q: values.q } : {}),
      },
      schema: engagementDealerDetailSchema,
      refreshOnUnauthorized: false,
      ...(access.actorContext !== undefined
        ? { actorContext: access.actorContext }
        : {}),
    });

    return { ok: true, dealer };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function readEngagementLeadDetailAction(
  input: z.input<typeof leadDialogQuerySchema>,
): Promise<ReadEngagementLeadDetailActionResult> {
  try {
    const access = await requireActionAccess("canReadLeads");
    const values = leadDialogQuerySchema.parse(input);
    const lead = await dashboardClient.request({
      path: `/leads/${encodeURIComponent(values.leadId)}`,
      schema: engagementLeadDetailSchema,
      refreshOnUnauthorized: false,
      ...(access.actorContext !== undefined
        ? { actorContext: access.actorContext }
        : {}),
    });

    return { ok: true, lead };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function createEngagementLeadAdminSessionAction(
  input: Readonly<{
    values: z.input<typeof leadAdminSessionActionInputSchema>;
  }>,
): Promise<CreateEngagementLeadAdminSessionActionResult> {
  try {
    const access = await requireActionAccess("canUpdateLeads");
    const values = leadAdminSessionActionInputSchema.parse(input.values);
    const session = await supportClient.request({
      method: HTTP_METHODS.POST,
      path: `/leads/${encodeURIComponent(values.leadId)}/admin-session`,
      body: { reason: values.reason },
      schema: engagementLeadAdminSessionSchema,
      refreshOnUnauthorized: false,
      ...(access.actorContext !== undefined
        ? { actorContext: access.actorContext }
        : {}),
    });

    return {
      ok: true,
      href: `/public/dealer-leads/${encodeURIComponent(session.token)}`,
      expiresAt: session.expiresAt,
      canForward: session.allowedFields.includes("forwardFlow"),
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateEngagementIssueAction(
  input: Readonly<{ values: IssueActionInput }>,
): Promise<EngagementDashboardActionResult> {
  try {
    const access = await requireActionAccess("canIntervene");
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

    revalidateEngagementWorkspace();
    return {
      ok: true,
      message:
        values.state === "RESOLVED"
          ? "Issue resolved and recorded in the audit history."
          : "Issue acknowledged for follow-up.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function reassignEngagementLeadAction(
  input: Readonly<{ values: RetryOperationInput }>,
): Promise<EngagementDashboardActionResult> {
  try {
    const access = await requireActionAccess("canReassignLead");
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

    revalidateEngagementWorkspace({ leadId: values.resourceId });
    return {
      ok: true,
      message:
        result.outcome === "NO_ELIGIBLE_DEALER"
          ? "No assignment-ready dealer is currently available for this lead."
          : result.outcome === "NOOP"
            ? "This reassignment request was already processed."
            : "Nearest-dealer assignment was processed.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function retryEngagementDeliveryAction(
  input: Readonly<{
    kind: "OUTBOX" | "VIDEO_MESSAGE";
    values: RetryOperationInput;
  }>,
): Promise<EngagementDashboardActionResult> {
  try {
    const access = await requireActionAccess("canRetryDelivery");
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

    revalidateEngagementWorkspace();
    return {
      ok: true,
      message:
        result.outcome === "NOOP"
          ? "This retry request was already processed."
          : isOutbox
            ? "The idempotent outbox retry was queued."
            : "The failed video message retry was queued.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateEngagementDealerSettingsAction(
  input: Readonly<{ values: DealerSettingsActionInput }>,
): Promise<EngagementDealerConfigurationActionResult> {
  try {
    const access = await requireActionAccess("canUpdateDealerSettings");
    const values = dealerSettingsActionInputSchema.parse(input.values);

    const result = await dashboardClient.request({
      method: HTTP_METHODS.PATCH,
      path: `/dealers/${encodeURIComponent(values.dealerOrgUnitId)}/settings`,
      body: {
        rowVersion: values.rowVersion,
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

    revalidateEngagementWorkspace({
      dealerOrgUnitId: values.dealerOrgUnitId,
    });
    return {
      ok: true,
      message: "Vehicle-sales engagement settings were updated.",
      rowVersion: result.rowVersion,
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateEngagementDealerLocationAction(
  input: Readonly<{ values: DealerLocationActionInput }>,
): Promise<EngagementDealerConfigurationActionResult> {
  try {
    const access = await requireActionAccess("canUpdateDealerLocation");
    const values = dealerLocationActionInputSchema.parse(input.values);

    const result = await dashboardClient.request({
      method: HTTP_METHODS.PATCH,
      path: `/dealers/${encodeURIComponent(values.dealerOrgUnitId)}/location`,
      body: {
        rowVersion: values.rowVersion,
        latitude: values.latitude,
        longitude: values.longitude,
        googleMapsShortCode: values.googleMapsShortCode,
        engagementWhatsappNumber: values.engagementWhatsappNumber,
        reason: values.reason,
      },
      schema: dealerLocationMutationResultSchema,
      idempotencyKey: values.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext !== undefined
        ? { actorContext: access.actorContext }
        : {}),
    });

    revalidateEngagementWorkspace({
      dealerOrgUnitId: values.dealerOrgUnitId,
    });
    return {
      ok: true,
      message: "Dealer location and map configuration were updated.",
      rowVersion: result.rowVersion,
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateEngagementVideoSequenceItemAction(
  input: Readonly<{ values: VideoSequenceItemUpdateActionInput }>,
): Promise<EngagementDashboardActionResult> {
  try {
    const access = await requireActionAccess("canUpdateVideoSequences");
    const values = videoSequenceItemUpdateActionInputSchema.parse(input.values);

    await videoSequenceClient.request({
      method: HTTP_METHODS.PATCH,
      path: `/items/${encodeURIComponent(values.videoSequenceItemId)}`,
      body: {
        rowVersion: values.rowVersion,
        ...(values.videoTitle !== undefined
          ? { videoTitle: values.videoTitle }
          : {}),
        ...(values.videoUrl !== undefined ? { videoUrl: values.videoUrl } : {}),
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

    revalidateEngagementWorkspace();
    return {
      ok: true,
      message:
        values.videoTitle !== undefined || values.videoUrl !== undefined
          ? "Video details were updated for the schedule and every pending message."
          : "Video availability was updated.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

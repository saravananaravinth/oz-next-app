// oz-next-app/src/features/engagement/dealership-application-operations/actions/dealership-application.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import { ENGAGEMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { API_CONFIG, HTTP_METHODS } from "@/lib/api/http-contract";
import { ApiHttpError, isApiHttpError } from "@/lib/api/problem";
import { assertSameOriginMutation } from "@/server/security/origin";

import {
  dealershipApplicationActivityCreateActionInputSchema,
  dealershipApplicationActivityResultSchema,
  dealershipApplicationActivityUpdateActionInputSchema,
  dealershipApplicationAssignActionInputSchema,
  dealershipApplicationCancelActionInputSchema,
  dealershipApplicationCaseResultSchema,
  dealershipApplicationChecklistActionInputSchema,
  dealershipApplicationChecklistResultSchema,
  dealershipApplicationClaimActionInputSchema,
  dealershipApplicationCommunicationActionInputSchema,
  dealershipApplicationCommunicationResultSchema,
  dealershipApplicationDocumentBindActionInputSchema,
  dealershipApplicationDocumentResultSchema,
  dealershipApplicationDocumentReviewActionInputSchema,
  dealershipApplicationDownloadActionInputSchema,
  dealershipApplicationDownloadSchema,
  dealershipApplicationExitCompleteActionInputSchema,
  dealershipApplicationExitInitiateActionInputSchema,
  dealershipApplicationExitResultSchema,
  dealershipApplicationProvisionActionInputSchema,
  dealershipApplicationProvisionResultSchema,
  dealershipApplicationTransitionActionInputSchema,
  dealershipDistrictAssignmentMutationResultSchema,
  dealershipDistrictAssignmentsUpdateActionInputSchema,
  type DealershipApplicationActivityCreateActionInput,
  type DealershipApplicationActivityUpdateActionInput,
  type DealershipApplicationAssignActionInput,
  type DealershipApplicationCancelActionInput,
  type DealershipApplicationChecklistActionInput,
  type DealershipApplicationClaimActionInput,
  type DealershipApplicationCommunicationActionInput,
  type DealershipApplicationDocumentBindActionInput,
  type DealershipApplicationDocumentReviewActionInput,
  type DealershipApplicationExitCompleteActionInput,
  type DealershipApplicationExitInitiateActionInput,
  type DealershipApplicationProvisionActionInput,
  type DealershipApplicationTransitionActionInput,
  type DealershipDistrictAssignmentsUpdateActionInput,
} from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";
import {
  resolveDealershipApplicationAccess,
  type DealershipApplicationCapabilities,
  type ResolvedDealershipApplicationAccess,
} from "@/features/engagement/dealership-application-operations/policies/dealership-application.policy";

const client = createErpFeatureClient({
  featureName: "engagement.dealership-applications",
  basePath: ENGAGEMENT_ENDPOINTS.dealershipApplicationsBase,
});

const DASHBOARD_PATH = "/engagement/dealership-applications" as const;

type ActionFieldError = Readonly<{ path: string; message: string }>;

export type DealershipApplicationActionFailure = Readonly<{
  ok: false;
  code: string;
  message: string;
  requestId?: string;
  fieldErrors?: readonly ActionFieldError[];
  retryAfterSeconds?: number;
}>;

export type DealershipApplicationActionResult =
  Readonly<{ ok: true; message: string }> | DealershipApplicationActionFailure;

export type DealershipApplicationDownloadActionResult =
  | Readonly<{ ok: true; url: string; expiresAt: string }>
  | DealershipApplicationActionFailure;

export type DealershipDistrictAssignmentsActionResult =
  | Readonly<{ ok: true; message: string; affectedCaseCount: number }>
  | DealershipApplicationActionFailure;

function actionFailure(error: unknown): DealershipApplicationActionFailure {
  if (isApiHttpError(error)) {
    const requestId = error.requestId?.trim();
    const fieldErrors = error.problem?.invalid_params;
    const message =
      error.status === 401
        ? "Your session could not authorize this operation. Sign in again and retry."
        : error.status === 403
          ? "You are not authorized to perform this dealership operation."
          : error.status === 409
            ? "This application changed before the operation completed. Refresh the record and retry."
            : error.status === 422
              ? "The operation is not valid for the application’s current lifecycle state."
              : error.status === 429
                ? "This operation is temporarily rate limited. Wait briefly before retrying."
                : error.status >= 500
                  ? "The dealership operation is temporarily unavailable."
                  : "The dealership operation could not be completed. Review the values and retry.";

    return {
      ok: false,
      code: error.code,
      message,
      ...(requestId === undefined || requestId.length === 0
        ? {}
        : { requestId }),
      ...(fieldErrors === undefined || fieldErrors.length === 0
        ? {}
        : { fieldErrors }),
      ...(error.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: error.retryAfterSeconds }),
    };
  }

  return {
    ok: false,
    code: "dealership_application_operation_failed",
    message: "The dealership operation could not be completed safely.",
  };
}

async function requireCapability(
  capability: keyof DealershipApplicationCapabilities,
): Promise<ResolvedDealershipApplicationAccess> {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  const me = await requireAuthenticatedMe();
  const access = resolveDealershipApplicationAccess(me);

  if (access.kind !== "resolved" || !access.capabilities[capability]) {
    throw new ApiHttpError({
      message: "Dealership application action is not permitted.",
      status: 403,
      code: "dealership_application_action_forbidden",
    });
  }

  return access;
}

async function requireAnyCapability(
  capabilities: ReadonlyArray<keyof DealershipApplicationCapabilities>,
): Promise<ResolvedDealershipApplicationAccess> {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  const me = await requireAuthenticatedMe();
  const access = resolveDealershipApplicationAccess(me);

  if (
    access.kind !== "resolved" ||
    !capabilities.some((capability) => access.capabilities[capability])
  ) {
    throw new ApiHttpError({
      message: "Dealership application action is not permitted.",
      status: 403,
      code: "dealership_application_action_forbidden",
    });
  }

  return access;
}

function revalidateApplication(applicationId: string): void {
  revalidatePath(DASHBOARD_PATH);
  revalidatePath(`${DASHBOARD_PATH}/${encodeURIComponent(applicationId)}`);
}

function optional<TValue>(key: string, value: TValue | undefined) {
  return value === undefined ? {} : { [key]: value };
}

function transitionCapability(
  status: z.output<
    typeof dealershipApplicationTransitionActionInputSchema
  >["status"],
): keyof DealershipApplicationCapabilities {
  if (status === "APPROVED" || status === "REJECTED") return "canApprove";
  if (
    status === "DOCUMENTS_PENDING" ||
    status === "COMPLIANCE_REVIEW" ||
    status === "RISK_REVIEW" ||
    status === "APPROVAL_PENDING" ||
    status === "PROFILE_PROVISIONING" ||
    status === "TRAINING_PENDING" ||
    status === "ACTIVATION_PENDING" ||
    status === "ACTIVE"
  ) {
    return "canManageOnboarding";
  }
  if (
    status === "EXIT_INITIATED" ||
    status === "EXIT_CLEARANCE" ||
    status === "ACCESS_REVOCATION" ||
    status === "SETTLEMENT_PENDING" ||
    status === "EXITED"
  ) {
    return "canManageExit";
  }
  return "canEvaluate";
}

export async function claimDealershipApplicationAction(
  raw: DealershipApplicationClaimActionInput,
): Promise<DealershipApplicationActionResult> {
  try {
    const input = dealershipApplicationClaimActionInputSchema.parse(raw);
    const access = await requireCapability("canAssign");
    await client.request({
      method: HTTP_METHODS.POST,
      path: `/${input.applicationId}/claim`,
      body: { reason: input.reason, rowVersion: input.rowVersion },
      schema: dealershipApplicationCaseResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    revalidateApplication(input.applicationId);
    return { ok: true, message: "Application claimed successfully." };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function assignDealershipApplicationAction(
  raw: DealershipApplicationAssignActionInput,
): Promise<DealershipApplicationActionResult> {
  try {
    const input = dealershipApplicationAssignActionInputSchema.parse(raw);
    const access = await requireCapability("canAssign");
    await client.request({
      method: HTTP_METHODS.POST,
      path: `/${input.applicationId}/assign`,
      body: {
        ownerUserId: input.ownerUserId,
        ownerOrgUnitId: input.ownerOrgUnitId,
        reason: input.reason,
        rowVersion: input.rowVersion,
      },
      schema: dealershipApplicationCaseResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    revalidateApplication(input.applicationId);
    return { ok: true, message: "Application assignment updated." };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateDealershipDistrictAssignmentsAction(
  raw: DealershipDistrictAssignmentsUpdateActionInput,
): Promise<DealershipDistrictAssignmentsActionResult> {
  try {
    const input =
      dealershipDistrictAssignmentsUpdateActionInputSchema.parse(raw);
    const access = await requireCapability("canManageDistrictAssignments");
    const result = await client.request({
      method: HTTP_METHODS.PUT,
      path: "/district-assignments",
      body: {
        changes: input.changes,
        reason: input.reason,
      },
      schema: dealershipDistrictAssignmentMutationResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    revalidatePath(DASHBOARD_PATH);
    return {
      ok: true,
      message:
        result.affectedCaseCount === 1
          ? "District assignments saved; 1 application was reassigned."
          : `District assignments saved; ${String(result.affectedCaseCount)} applications were reassigned.`,
      affectedCaseCount: result.affectedCaseCount,
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function transitionDealershipApplicationAction(
  raw: DealershipApplicationTransitionActionInput,
): Promise<DealershipApplicationActionResult> {
  try {
    const input = dealershipApplicationTransitionActionInputSchema.parse(raw);
    const access = await requireCapability(transitionCapability(input.status));
    await client.request({
      method: HTTP_METHODS.POST,
      path: `/${input.applicationId}/transition`,
      body: {
        status: input.status,
        reason: input.reason,
        rowVersion: input.rowVersion,
        ...optional("note", input.note),
        ...optional("nextActionAt", input.nextActionAt),
        ...optional("priority", input.priority),
        ...optional("rejectionReason", input.rejectionReason),
      },
      schema: dealershipApplicationCaseResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    revalidateApplication(input.applicationId);
    return { ok: true, message: "Application lifecycle advanced." };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function cancelDealershipApplicationAction(
  raw: DealershipApplicationCancelActionInput,
): Promise<DealershipApplicationActionResult> {
  try {
    const input = dealershipApplicationCancelActionInputSchema.parse(raw);
    const access = await requireCapability("canEvaluate");
    await client.request({
      method: HTTP_METHODS.POST,
      path: `/${input.applicationId}/cancel`,
      body: { reason: input.reason, rowVersion: input.rowVersion },
      schema: dealershipApplicationCaseResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    revalidateApplication(input.applicationId);
    return { ok: true, message: "Application cancelled and closed." };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function createDealershipApplicationActivityAction(
  raw: DealershipApplicationActivityCreateActionInput,
): Promise<DealershipApplicationActionResult> {
  try {
    const input =
      dealershipApplicationActivityCreateActionInputSchema.parse(raw);
    const access = await requireCapability("canManageActivities");
    await client.request({
      method: HTTP_METHODS.POST,
      path: `/${input.applicationId}/activities`,
      body: {
        kind: input.kind,
        status: input.status,
        title: input.title,
        ...optional("note", input.note),
        ...optional("outcome", input.outcome),
        ...optional("dueAt", input.dueAt),
        ...optional("scheduledStartAt", input.scheduledStartAt),
        ...optional("scheduledEndAt", input.scheduledEndAt),
        ...optional("ownerUserId", input.ownerUserId),
        ...optional("audioFileId", input.audioFileId),
      },
      schema: dealershipApplicationActivityResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    revalidateApplication(input.applicationId);
    return { ok: true, message: "Activity recorded." };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateDealershipApplicationActivityAction(
  raw: DealershipApplicationActivityUpdateActionInput,
): Promise<DealershipApplicationActionResult> {
  try {
    const input =
      dealershipApplicationActivityUpdateActionInputSchema.parse(raw);
    const access = await requireCapability("canManageActivities");
    await client.request({
      method: HTTP_METHODS.PATCH,
      path: `/${input.applicationId}/activities/${input.activityId}`,
      body: {
        status: input.status,
        reason: input.reason,
        rowVersion: input.rowVersion,
        ...optional("note", input.note),
        ...optional("outcome", input.outcome),
        ...optional("dueAt", input.dueAt),
        ...optional("scheduledStartAt", input.scheduledStartAt),
        ...optional("scheduledEndAt", input.scheduledEndAt),
      },
      schema: dealershipApplicationActivityResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    revalidateApplication(input.applicationId);
    return { ok: true, message: "Activity updated." };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function bindDealershipApplicationDocumentAction(
  raw: DealershipApplicationDocumentBindActionInput,
): Promise<DealershipApplicationActionResult> {
  try {
    const input = dealershipApplicationDocumentBindActionInputSchema.parse(raw);
    const access = await requireCapability("canManageDocuments");
    await client.request({
      method: HTTP_METHODS.POST,
      path: `/${input.applicationId}/documents`,
      body: {
        fileId: input.fileId,
        kind: input.kind,
        ...optional("expiresAt", input.expiresAt),
        ...optional("note", input.note),
      },
      schema: dealershipApplicationDocumentResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    revalidateApplication(input.applicationId);
    return { ok: true, message: "CLEAN centralized file attached." };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function reviewDealershipApplicationDocumentAction(
  raw: DealershipApplicationDocumentReviewActionInput,
): Promise<DealershipApplicationActionResult> {
  try {
    const input =
      dealershipApplicationDocumentReviewActionInputSchema.parse(raw);
    const access = await requireCapability("canManageDocuments");
    await client.request({
      method: HTTP_METHODS.PATCH,
      path: `/${input.applicationId}/documents/${input.documentId}/review`,
      body: {
        status: input.status,
        reason: input.reason,
        rowVersion: input.rowVersion,
      },
      schema: dealershipApplicationDocumentResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    revalidateApplication(input.applicationId);
    return { ok: true, message: "Document review saved." };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateDealershipApplicationChecklistAction(
  raw: DealershipApplicationChecklistActionInput,
): Promise<DealershipApplicationActionResult> {
  try {
    const input = dealershipApplicationChecklistActionInputSchema.parse(raw);
    const access = await requireAnyCapability([
      "canManageOnboarding",
      "canManageExit",
    ]);
    await client.request({
      method: HTTP_METHODS.PATCH,
      path: `/${input.applicationId}/checklist/${input.checklistItemId}`,
      body: {
        status: input.status,
        reason: input.reason,
        rowVersion: input.rowVersion,
        ...optional("note", input.note),
        ...optional("dueAt", input.dueAt),
      },
      schema: dealershipApplicationChecklistResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    revalidateApplication(input.applicationId);
    return { ok: true, message: "Checklist item updated." };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function provisionDealershipApplicationDealerAction(
  raw: DealershipApplicationProvisionActionInput,
): Promise<DealershipApplicationActionResult> {
  try {
    const input = dealershipApplicationProvisionActionInputSchema.parse(raw);
    const access = await requireCapability("canProvisionDealer");
    await client.request({
      method: HTTP_METHODS.POST,
      path: `/${input.applicationId}/dealer/provision`,
      body: {
        parentOrgUnitId: input.parentOrgUnitId,
        orgUnitType: input.orgUnitType,
        dealerName: input.dealerName,
        loginDisplayName: input.loginDisplayName,
        loginEmail: input.loginEmail,
        loginPhoneE164: input.loginPhoneE164,
        roleName: input.roleName,
        addressLine1: input.addressLine1,
        city: input.city,
        district: input.district,
        state: input.state,
        postalCode: input.postalCode,
        contactVerified: input.contactVerified,
        reason: input.reason,
        rowVersion: input.rowVersion,
        ...optional("marginSourceOrgUnitId", input.marginSourceOrgUnitId),
        ...optional("addressLine2", input.addressLine2),
        ...optional("latitude", input.latitude),
        ...optional("longitude", input.longitude),
      },
      schema: dealershipApplicationProvisionResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    revalidateApplication(input.applicationId);
    return {
      ok: true,
      message:
        "Dealer profile, login, role, membership, and active margins were provisioned.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function sendDealershipApplicationCommunicationAction(
  raw: DealershipApplicationCommunicationActionInput,
): Promise<DealershipApplicationActionResult> {
  try {
    const input =
      dealershipApplicationCommunicationActionInputSchema.parse(raw);
    const access = await requireCapability("canCommunicate");
    const body =
      input.channel === "EMAIL"
        ? {
            channel: input.channel,
            templateCode: input.templateCode,
            locale: input.locale,
            templateVariables: input.templateVariables,
            reason: input.reason,
          }
        : {
            channel: input.channel,
            templateCode: input.templateCode,
            languageCode: input.languageCode,
            templateVariables: input.templateVariables,
            reason: input.reason,
          };
    await client.request({
      method: HTTP_METHODS.POST,
      path: `/${input.applicationId}/communications`,
      body,
      schema: dealershipApplicationCommunicationResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    revalidateApplication(input.applicationId);
    return { ok: true, message: `${input.channel} communication queued.` };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function initiateDealershipApplicationExitAction(
  raw: DealershipApplicationExitInitiateActionInput,
): Promise<DealershipApplicationActionResult> {
  try {
    const input = dealershipApplicationExitInitiateActionInputSchema.parse(raw);
    const access = await requireCapability("canManageExit");
    await client.request({
      method: HTTP_METHODS.POST,
      path: `/${input.applicationId}/exit/initiate`,
      body: {
        reason: input.reason,
        effectiveDate: input.effectiveDate,
        rowVersion: input.rowVersion,
        ...optional("note", input.note),
      },
      schema: dealershipApplicationCaseResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    revalidateApplication(input.applicationId);
    return { ok: true, message: "Controlled dealer exit initiated." };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function completeDealershipApplicationExitAction(
  raw: DealershipApplicationExitCompleteActionInput,
): Promise<DealershipApplicationActionResult> {
  try {
    const input = dealershipApplicationExitCompleteActionInputSchema.parse(raw);
    const access = await requireCapability("canManageExit");
    await client.request({
      method: HTTP_METHODS.POST,
      path: `/${input.applicationId}/exit/complete`,
      body: { reason: input.reason, rowVersion: input.rowVersion },
      schema: dealershipApplicationExitResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    revalidateApplication(input.applicationId);
    return {
      ok: true,
      message:
        "Dealer access, sessions, organization, and active margins were closed.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function readDealershipApplicationDocumentDownloadAction(
  raw: z.input<typeof dealershipApplicationDownloadActionInputSchema>,
): Promise<DealershipApplicationDownloadActionResult> {
  try {
    const input = dealershipApplicationDownloadActionInputSchema.parse(raw);
    const access = await requireCapability("canReadApplications");
    const result = await client.request({
      path: `/${input.applicationId}/documents/${input.documentId}/download`,
      schema: dealershipApplicationDownloadSchema,
      ...(access.actorContext === undefined
        ? {}
        : { actorContext: access.actorContext }),
    });
    return { ok: true, url: result.url, expiresAt: result.expiresAt };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

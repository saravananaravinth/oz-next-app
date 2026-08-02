"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import {
  resolveDealershipApplicationAccess,
  type DealershipApplicationCapabilities,
  type ResolvedDealershipApplicationAccess,
} from "@/features/engagement/dealership-application-operations/policies/dealership-application.policy";
import { ENGAGEMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { API_CONFIG, HTTP_METHODS } from "@/lib/api/http-contract";
import { ApiHttpError, isApiHttpError } from "@/lib/api/problem";
import { assertSameOriginMutation } from "@/server/security/origin";

import {
  dealerCancelledUploadSchema,
  dealerDocumentBindActionInputSchema,
  dealerDocumentDownloadActionInputSchema,
  dealerDocumentDownloadSchema,
  dealerDocumentReviewActionInputSchema,
  dealerDocumentSchema,
  dealerFileStatusActionInputSchema,
  dealerFileStatusSchema,
  dealerMarginActionInputSchema,
  dealerMarginMutationResultSchema,
  dealerOperationDetailSchema,
  dealerProfileActionInputSchema,
  dealerUploadCancelActionInputSchema,
  dealerUploadFinalizeActionInputSchema,
  dealerUploadIntentActionInputSchema,
  dealerUploadIntentResultSchema,
  dealerUserCreateActionInputSchema,
  dealerUserUpdateActionInputSchema,
  dealerOperationUserSchema,
  directOnboardingActionInputSchema,
  directOnboardingPreflightActionInputSchema,
  directOnboardingPreflightResultSchema,
  directOnboardingResultSchema,
  type DealerDocument,
  type DealerDocumentBindActionInput,
  type DealerDocumentReviewActionInput,
  type DealerFileStatus,
  type DealerMarginActionInput,
  type DealerProfileActionInput,
  type DealerUploadFinalizeActionInput,
  type DealerUploadIntentActionInput,
  type DealerUploadIntentResult,
  type DealerOperationUser,
  type DealerUserCreateActionInput,
  type DealerUserUpdateActionInput,
  type DirectOnboardingActionInput,
  type DirectOnboardingPreflightActionInput,
  type DirectOnboardingPreflightResult,
  type DirectOnboardingResult,
} from "@/features/engagement/dealer-operations/contracts/dealer-operations.schema";

const client = createErpFeatureClient({
  featureName: "engagement.dealer-operations",
  basePath: ENGAGEMENT_ENDPOINTS.dealerOperationsBase,
});

const ROOT_PATH = "/engagement/dealership-applications" as const;
const DEALERS_PATH = `${ROOT_PATH}/dealers` as const;

type ActionFieldError = Readonly<{ path: string; message: string }>;

export type DealerOperationsActionFailure = Readonly<{
  ok: false;
  code: string;
  message: string;
  requestId?: string;
  fieldErrors?: readonly ActionFieldError[];
  retryAfterSeconds?: number;
}>;

export type DealerOperationsActionResult =
  Readonly<{ ok: true; message: string }> | DealerOperationsActionFailure;

export type DealerOperationsDataResult<TData> =
  Readonly<{ ok: true; data: TData }> | DealerOperationsActionFailure;

function actionFailure(error: unknown): DealerOperationsActionFailure {
  if (isApiHttpError(error)) {
    const message =
      error.status === 401
        ? "Your authenticated session could not authorize this operation."
        : error.status === 403
          ? "The active actor is not authorized for this dealer operation."
          : error.status === 409
            ? "The dealer record changed or a duplicate application/dealer was detected. Reload and review the latest state."
            : error.status === 415
              ? "The selected file type is not approved for this upload purpose."
              : error.status === 422
                ? "One or more values are invalid for this operation."
                : error.status === 429
                  ? "The operation is rate limited. Wait briefly and retry using the same intent."
                  : error.status >= 500
                    ? "Dealer operations are temporarily unavailable."
                    : "The dealer operation could not be completed.";
    const requestId = error.requestId?.trim();
    const fieldErrors = error.problem?.invalid_params;
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
    code: "dealer_operation_failed",
    message: "The dealer operation could not be completed safely.",
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
      message: "Dealer operation is not permitted.",
      status: 403,
      code: "dealer_operation_forbidden",
    });
  }
  return access;
}

function actorOptions(access: ResolvedDealershipApplicationAccess) {
  return access.actorContext === undefined
    ? {}
    : { actorContext: access.actorContext };
}

function revalidateDealer(dealerOrgUnitId: string): void {
  revalidatePath(DEALERS_PATH);
  revalidatePath(`${DEALERS_PATH}/${encodeURIComponent(dealerOrgUnitId)}`);
  revalidatePath(ROOT_PATH);
}

export async function createDealerUserAction(
  raw: DealerUserCreateActionInput,
): Promise<DealerOperationsDataResult<DealerOperationUser>> {
  try {
    const input = dealerUserCreateActionInputSchema.parse(raw);
    const access = await requireCapability("canManageDealerUsers");
    const data = await client.request({
      method: HTTP_METHODS.POST,
      path: `/dealers/${encodeURIComponent(input.dealerOrgUnitId)}/users`,
      body: {
        displayName: input.displayName,
        email: input.email,
        phoneE164: input.phoneE164,
        roleName: input.roleName,
        title: input.title,
      },
      schema: dealerOperationUserSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...actorOptions(access),
    });
    revalidateDealer(input.dealerOrgUnitId);
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateDealerUserAction(
  raw: DealerUserUpdateActionInput,
): Promise<DealerOperationsDataResult<DealerOperationUser>> {
  try {
    const input = dealerUserUpdateActionInputSchema.parse(raw);
    const access = await requireCapability("canManageDealerUsers");
    const data = await client.request({
      method: HTTP_METHODS.PATCH,
      path: `/dealers/${encodeURIComponent(input.dealerOrgUnitId)}/users/${encodeURIComponent(input.dealerUserId)}`,
      body: {
        expectedUpdatedAt: input.expectedUpdatedAt,
        displayName: input.displayName,
        roleName: input.roleName,
        title: input.title,
        status: input.status,
        reason: input.reason,
      },
      schema: dealerOperationUserSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...actorOptions(access),
    });
    revalidateDealer(input.dealerOrgUnitId);
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateDealerProfileAction(
  raw: DealerProfileActionInput,
): Promise<DealerOperationsActionResult> {
  try {
    const input = dealerProfileActionInputSchema.parse(raw);
    const access = await requireCapability("canUpdateDealers");
    await client.request({
      method: HTTP_METHODS.PATCH,
      path: `/dealers/${encodeURIComponent(input.dealerOrgUnitId)}/profile`,
      body: {
        expectedUpdatedAt: input.expectedUpdatedAt,
        name: input.name,
        isActive: input.isActive,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        district: input.district,
        state: input.state,
        postalCode: input.postalCode,
        latitude: input.latitude,
        longitude: input.longitude,
        reason: input.reason,
      },
      schema: dealerOperationDetailSchema,
      refreshOnUnauthorized: false,
      ...actorOptions(access),
    });
    revalidateDealer(input.dealerOrgUnitId);
    return { ok: true, message: "Dealer profile updated." };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function changeDealerMarginsAction(
  raw: DealerMarginActionInput,
): Promise<DealerOperationsActionResult> {
  try {
    const input = dealerMarginActionInputSchema.parse(raw);
    const access = await requireCapability("canManageDealerMargins");
    await client.request({
      method: HTTP_METHODS.POST,
      path: `/dealers/${encodeURIComponent(input.dealerOrgUnitId)}/margins/change-set`,
      body: {
        effectiveFrom: input.effectiveFrom,
        reason: input.reason,
        margins: input.margins,
      },
      schema: dealerMarginMutationResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...actorOptions(access),
    });
    revalidateDealer(input.dealerOrgUnitId);
    return { ok: true, message: "Effective-dated dealer margins updated." };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function bindDealerDocumentAction(
  raw: DealerDocumentBindActionInput,
): Promise<DealerOperationsDataResult<DealerDocument>> {
  try {
    const input = dealerDocumentBindActionInputSchema.parse(raw);
    const access = await requireCapability("canUploadDealerFiles");
    const data = await client.request({
      method: HTTP_METHODS.POST,
      path: `/dealers/${encodeURIComponent(input.dealerOrgUnitId)}/documents`,
      body: {
        fileId: input.fileId,
        kind: input.kind,
        ...(input.expiresAt === undefined
          ? {}
          : { expiresAt: input.expiresAt }),
        ...(input.note === undefined ? {} : { note: input.note }),
      },
      schema: dealerDocumentSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...actorOptions(access),
    });
    revalidateDealer(input.dealerOrgUnitId);
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function reviewDealerDocumentAction(
  raw: DealerDocumentReviewActionInput,
): Promise<DealerOperationsDataResult<DealerDocument>> {
  try {
    const input = dealerDocumentReviewActionInputSchema.parse(raw);
    const access = await requireCapability("canUploadDealerFiles");
    const data = await client.request({
      method: HTTP_METHODS.PATCH,
      path: `/dealers/${encodeURIComponent(input.dealerOrgUnitId)}/documents/${encodeURIComponent(input.dealerDocumentId)}/review`,
      body: {
        status: input.status,
        expectedRowVersion: input.expectedRowVersion,
        reviewNote: input.reviewNote,
      },
      schema: dealerDocumentSchema,
      refreshOnUnauthorized: false,
      ...actorOptions(access),
    });
    revalidateDealer(input.dealerOrgUnitId);
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function getDealerDocumentDownloadAction(
  raw: unknown,
): Promise<
  DealerOperationsDataResult<
    Readonly<{ url: string; expiresAt: string; fileName: string }>
  >
> {
  try {
    const input = dealerDocumentDownloadActionInputSchema.parse(raw);
    const access = await requireCapability("canReadDealers");
    const data = await client.request({
      path: `/dealers/${encodeURIComponent(input.dealerOrgUnitId)}/documents/${encodeURIComponent(input.dealerDocumentId)}/download`,
      schema: dealerDocumentDownloadSchema,
      refreshOnUnauthorized: false,
      ...actorOptions(access),
    });
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function preflightDirectOnboardingAction(
  raw: DirectOnboardingPreflightActionInput,
): Promise<DealerOperationsDataResult<DirectOnboardingPreflightResult>> {
  try {
    const input = directOnboardingPreflightActionInputSchema.parse(raw);
    const access = await requireCapability("canDirectOnboard");
    const data = await client.request({
      method: HTTP_METHODS.POST,
      path: "/onboarding/preflight",
      body: input,
      schema: directOnboardingPreflightResultSchema,
      refreshOnUnauthorized: false,
      ...actorOptions(access),
    });
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function directOnboardDealerAction(
  raw: DirectOnboardingActionInput,
): Promise<DealerOperationsDataResult<DirectOnboardingResult>> {
  try {
    const input = directOnboardingActionInputSchema.parse(raw);
    const access = await requireCapability("canDirectOnboard");
    const data = await client.request({
      method: HTTP_METHODS.POST,
      path: "/onboarding/direct",
      body: {
        preflightToken: input.preflightToken,
        parentOrgUnitId: input.parentOrgUnitId,
        orgUnitType: input.orgUnitType,
        dealerName: input.dealerName,
        loginDisplayName: input.loginDisplayName,
        loginEmail: input.loginEmail,
        loginPhoneE164: input.loginPhoneE164,
        roleName: input.roleName,
        marginSourceOrgUnitId: input.marginSourceOrgUnitId,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        district: input.district,
        state: input.state,
        postalCode: input.postalCode,
        latitude: input.latitude,
        longitude: input.longitude,
      },
      schema: directOnboardingResultSchema,
      idempotencyKey: input.idempotencyKey,
      refreshOnUnauthorized: false,
      ...actorOptions(access),
    });
    revalidatePath(ROOT_PATH);
    revalidatePath(DEALERS_PATH);
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function createDealerUploadIntentAction(
  raw: DealerUploadIntentActionInput,
): Promise<DealerOperationsDataResult<DealerUploadIntentResult>> {
  try {
    const input = dealerUploadIntentActionInputSchema.parse(raw);
    const access = await requireCapability("canUploadDealerFiles");
    const data = await client.request({
      method: HTTP_METHODS.POST,
      path: "/uploads",
      body: input,
      schema: dealerUploadIntentResultSchema,
      refreshOnUnauthorized: false,
      ...actorOptions(access),
    });
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function finalizeDealerUploadAction(
  raw: DealerUploadFinalizeActionInput,
): Promise<DealerOperationsDataResult<DealerFileStatus>> {
  try {
    const input = dealerUploadFinalizeActionInputSchema.parse(raw);
    const access = await requireCapability("canUploadDealerFiles");
    const data = await client.request({
      method: HTTP_METHODS.POST,
      path: `/uploads/${encodeURIComponent(input.uploadId)}/finalize`,
      body: {
        checksumSha256: input.checksumSha256,
        sizeBytes: input.sizeBytes,
      },
      schema: dealerFileStatusSchema,
      refreshOnUnauthorized: false,
      ...actorOptions(access),
    });
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function cancelDealerUploadAction(
  raw: unknown,
): Promise<DealerOperationsActionResult> {
  try {
    const input = dealerUploadCancelActionInputSchema.parse(raw);
    const access = await requireCapability("canUploadDealerFiles");
    await client.request({
      method: HTTP_METHODS.DELETE,
      path: `/uploads/${encodeURIComponent(input.uploadId)}`,
      schema: dealerCancelledUploadSchema,
      refreshOnUnauthorized: false,
      ...actorOptions(access),
    });
    return { ok: true, message: "Upload cancelled." };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function getDealerFileStatusAction(
  raw: unknown,
): Promise<DealerOperationsDataResult<DealerFileStatus>> {
  try {
    const input = dealerFileStatusActionInputSchema.parse(raw);
    const access = await requireCapability("canUploadDealerFiles");
    const data = await client.request({
      path: `/files/${encodeURIComponent(input.fileId)}`,
      schema: dealerFileStatusSchema,
      refreshOnUnauthorized: false,
      ...actorOptions(access),
    });
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

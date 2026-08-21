// oz-next-app/src/features/engagement/dealer-onboarding/actions/dealer-onboarding.actions.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { API_CONFIG } from "@/lib/api/http-contract";
import { assertSameOriginMutation } from "@/server/security/origin";

import {
  dealerContactCreateActionInputSchema,
  dealerContactUpdateActionInputSchema,
  dealerDocumentBindBodySchema,
  dealerDocumentDownloadActionInputSchema,
  dealerFileStatusActionInputSchema,
  dealerMarginUpdateActionInputSchema,
  dealerOnboardingGstinPrefillActionInputSchema,
  dealerOnboardingMarginsActionInputSchema,
  dealerOnboardingOptionsActionInputSchema,
  dealerOnboardingPreflightActionInputSchema,
  dealerOnboardingProvisionActionInputSchema,
  dealerProfileUpdateActionInputSchema,
  dealerUploadFinalizeBodySchema,
  dealerUploadIntentBodySchema,
  type DealerDirectoryDetail,
  type DealerDocument,
  type DealerDocumentDownloadResult,
  type DealerFileStatus,
  type DealerOnboardingGstinPrefillResult,
  type DealerOnboardingMarginGrid,
  type DealerOnboardingOptions,
  type DealerOnboardingPreflightResult,
  type DealerOnboardingProvisionResult,
  type DealerUploadIntentResult,
} from "@/features/engagement/dealer-onboarding/contracts/dealer-onboarding.schema";
import {
  dealerOnboardingActionFailure,
  type DealerOnboardingActionFailure,
} from "@/features/engagement/dealer-onboarding/actions/dealer-onboarding-action-failure";
import {
  resolveDealerOnboardingAccess,
  type DealerAdministrationCapabilities,
  type ResolvedDealerAdministrationAccess,
} from "@/features/engagement/dealer-onboarding/policies/dealer-onboarding.policy";
import {
  bindDealerDocument,
  createDealerContact,
  cancelDealerDocumentUpload,
  createDealerDocumentUploadIntent,
  finalizeDealerDocumentUpload,
  provisionDealerOnboarding,
  readDealerDocumentDownload,
  readDealerDocumentFileStatus,
  readDealerOnboardingGstinPrefill,
  readDealerOnboardingMargins,
  readDealerOnboardingOptions,
  runDealerOnboardingPreflight,
  updateDealerContact,
  updateDealerDirectoryMargins,
  updateDealerDirectoryProfile,
} from "@/features/engagement/dealer-onboarding/server/dealer-onboarding.server";

const ADMIN_PATH = "/engagement/dealers";

type ActionSuccess<TData> = Readonly<{ ok: true; data: TData }>;
type ActionResult<TData> = ActionSuccess<TData> | DealerOnboardingActionFailure;

export type DealerOnboardingPreflightActionResult =
  ActionResult<DealerOnboardingPreflightResult>;
export type DealerOnboardingGstinActionResult =
  ActionResult<DealerOnboardingGstinPrefillResult>;
export type DealerOnboardingOptionsActionResult =
  ActionResult<DealerOnboardingOptions>;
export type DealerOnboardingMarginsActionResult =
  ActionResult<DealerOnboardingMarginGrid>;
export type DealerOnboardingProvisionActionResult =
  ActionResult<DealerOnboardingProvisionResult>;
export type DealerProfileUpdateActionResult =
  ActionResult<DealerDirectoryDetail>;
export type DealerContactMutationActionResult =
  ActionResult<DealerDirectoryDetail>;
export type DealerMarginUpdateActionResult =
  ActionResult<DealerDirectoryDetail>;
export type DealerUploadIntentActionResult =
  ActionResult<DealerUploadIntentResult>;
export type DealerFileStatusActionResult = ActionResult<DealerFileStatus>;
export type DealerDocumentBindActionResult = ActionResult<DealerDocument>;
export type DealerDocumentDownloadActionResult =
  ActionResult<DealerDocumentDownloadResult>;
export type DealerUploadCancelActionResult = ActionResult<
  Readonly<{ cancelled: true }>
>;

async function resolveActionAccess(
  capability:
    | keyof DealerAdministrationCapabilities
    | ReadonlyArray<keyof DealerAdministrationCapabilities>,
): Promise<ResolvedDealerAdministrationAccess> {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  const me = await requireAuthenticatedMe();
  const access = resolveDealerOnboardingAccess(me);

  const required = typeof capability === "string" ? [capability] : capability;
  if (
    access.kind !== "resolved" ||
    !required.some((candidate) => access.capabilities[candidate])
  ) {
    throw new TypeError("dealer_onboarding_access_forbidden");
  }

  return access;
}

function detailPath(dealerOrgUnitId: string): string {
  return `${ADMIN_PATH}/${encodeURIComponent(dealerOrgUnitId)}`;
}

export async function preflightDealerOnboardingAction(
  input: unknown,
): Promise<DealerOnboardingPreflightActionResult> {
  try {
    const body = dealerOnboardingPreflightActionInputSchema.parse(input);
    const access = await resolveActionAccess("canOnboard");
    return {
      ok: true,
      data: await runDealerOnboardingPreflight({ access, body }),
    };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

export async function lookupDealerOnboardingGstinAction(
  input: unknown,
): Promise<DealerOnboardingGstinActionResult> {
  try {
    const body = dealerOnboardingGstinPrefillActionInputSchema.parse(input);
    const access = await resolveActionAccess("canUseGstinPrefill");
    return {
      ok: true,
      data: await readDealerOnboardingGstinPrefill({ access, body }),
    };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

export async function loadDealerOnboardingOptionsAction(
  input: unknown,
): Promise<DealerOnboardingOptionsActionResult> {
  try {
    const query = dealerOnboardingOptionsActionInputSchema.parse(input);
    const access = await resolveActionAccess([
      "canReadDirectory",
      "canOnboard",
    ]);
    return {
      ok: true,
      data: await readDealerOnboardingOptions({ access, query }),
    };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

export async function loadDealerOnboardingMarginsAction(
  input: unknown,
): Promise<DealerOnboardingMarginsActionResult> {
  try {
    const query = dealerOnboardingMarginsActionInputSchema.parse(input);
    const access = await resolveActionAccess([
      "canReadDirectory",
      "canOnboard",
    ]);
    return {
      ok: true,
      data: await readDealerOnboardingMargins({ access, query }),
    };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

export async function provisionDealerOnboardingAction(
  input: unknown,
): Promise<DealerOnboardingProvisionActionResult> {
  try {
    const parsed = dealerOnboardingProvisionActionInputSchema.parse(input);
    const access = await resolveActionAccess("canProvision");
    const data = await provisionDealerOnboarding({
      access,
      body: parsed.body,
      idempotencyKey: parsed.idempotencyKey,
    });
    revalidatePath(ADMIN_PATH);
    revalidatePath(detailPath(data.dealerOrgUnitId));
    return { ok: true, data };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

export async function createDealerContactAction(
  input: unknown,
): Promise<DealerContactMutationActionResult> {
  try {
    const parsed = dealerContactCreateActionInputSchema.parse(input);
    const access = await resolveActionAccess("canManageContacts");
    const data = await createDealerContact({
      access,
      dealerOrgUnitId: parsed.dealerOrgUnitId,
      body: parsed.body,
    });
    revalidatePath(ADMIN_PATH);
    revalidatePath(detailPath(parsed.dealerOrgUnitId));
    return { ok: true, data };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

export async function updateDealerContactAction(
  input: unknown,
): Promise<DealerContactMutationActionResult> {
  try {
    const parsed = dealerContactUpdateActionInputSchema.parse(input);
    const access = await resolveActionAccess("canManageContacts");
    const data = await updateDealerContact({
      access,
      dealerOrgUnitId: parsed.dealerOrgUnitId,
      userId: parsed.userId,
      body: parsed.body,
    });
    revalidatePath(ADMIN_PATH);
    revalidatePath(detailPath(parsed.dealerOrgUnitId));
    return { ok: true, data };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

export async function updateDealerProfileAction(
  input: unknown,
): Promise<DealerProfileUpdateActionResult> {
  try {
    const parsed = dealerProfileUpdateActionInputSchema.parse(input);
    const access = await resolveActionAccess("canUpdateDealer");
    const data = await updateDealerDirectoryProfile({
      access,
      dealerOrgUnitId: parsed.dealerOrgUnitId,
      body: parsed.body,
    });
    revalidatePath(ADMIN_PATH);
    revalidatePath(detailPath(parsed.dealerOrgUnitId));
    return { ok: true, data };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

export async function updateDealerMarginsAction(
  input: unknown,
): Promise<DealerMarginUpdateActionResult> {
  try {
    const parsed = dealerMarginUpdateActionInputSchema.parse(input);
    const access = await resolveActionAccess("canUpdateMargins");
    const data = await updateDealerDirectoryMargins({
      access,
      dealerOrgUnitId: parsed.dealerOrgUnitId,
      body: parsed.body,
    });
    revalidatePath(ADMIN_PATH);
    revalidatePath(detailPath(parsed.dealerOrgUnitId));
    return { ok: true, data };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

export async function createDealerUploadIntentAction(
  input: unknown,
): Promise<DealerUploadIntentActionResult> {
  try {
    const body = dealerUploadIntentBodySchema.parse(input);
    const access = await resolveActionAccess("canManageDocuments");
    return {
      ok: true,
      data: await createDealerDocumentUploadIntent({ access, body }),
    };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

export async function finalizeDealerUploadAction(
  input: unknown,
): Promise<DealerFileStatusActionResult> {
  try {
    const body = dealerUploadFinalizeBodySchema.parse(input);
    const access = await resolveActionAccess("canManageDocuments");
    return {
      ok: true,
      data: await finalizeDealerDocumentUpload({ access, body }),
    };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

export async function cancelDealerUploadAction(
  input: unknown,
): Promise<DealerUploadCancelActionResult> {
  try {
    const parsed = dealerUploadFinalizeBodySchema
      .pick({ uploadId: true })
      .parse(input);
    const access = await resolveActionAccess("canManageDocuments");
    await cancelDealerDocumentUpload({ access, uploadId: parsed.uploadId });
    return { ok: true, data: { cancelled: true } };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

export async function getDealerFileStatusAction(
  input: unknown,
): Promise<DealerFileStatusActionResult> {
  try {
    const parsed = dealerFileStatusActionInputSchema.parse(input);
    const access = await resolveActionAccess("canReadDocuments");
    return {
      ok: true,
      data: await readDealerDocumentFileStatus({
        access,
        fileId: parsed.fileId,
      }),
    };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

export async function bindDealerDocumentAction(
  input: unknown,
): Promise<DealerDocumentBindActionResult> {
  try {
    const body = dealerDocumentBindBodySchema.parse(input);
    const access = await resolveActionAccess("canManageDocuments");
    const data = await bindDealerDocument({ access, body });
    revalidatePath(ADMIN_PATH);
    revalidatePath(detailPath(body.dealerOrgUnitId));
    return { ok: true, data };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

export async function getDealerDocumentDownloadAction(
  input: unknown,
): Promise<DealerDocumentDownloadActionResult> {
  try {
    const parsed = dealerDocumentDownloadActionInputSchema.parse(input);
    const access = await resolveActionAccess("canReadDocuments");
    return {
      ok: true,
      data: await readDealerDocumentDownload({
        access,
        dealerOrgUnitId: parsed.dealerOrgUnitId,
        dealerDocumentId: parsed.dealerDocumentId,
      }),
    };
  } catch (error: unknown) {
    return dealerOnboardingActionFailure(error);
  }
}

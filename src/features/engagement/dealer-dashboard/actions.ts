// oz-next-app/src/features/engagement/dealer-dashboard/actions.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { createErpFeatureClient } from "@/features/erp/shared/clients/erp-feature.server";
import { ENGAGEMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { ApiHttpError, isApiHttpError } from "@/lib/api/problem";
import { API_CONFIG, HTTP_METHODS } from "@/lib/constants";
import type { ServerActorContextHeaders } from "@/server/api/request-context";
import { assertSameOriginMutation } from "@/server/security/origin";

import {
  resolveDealerDashboardAccess,
  type DealerDashboardCapabilities,
} from "./access";
import {
  dealerDashboardContextSchema,
  ownerGuideAssignmentEligibilityActionInputSchema,
  ownerGuideDetailSchema,
  ownerGuideEditFormSchema,
  ownerGuideLifecycleActionInputSchema,
  ownerGuideOnboardFormSchema,
  sendOwnerGuideAppLinkResultSchema,
  type DealerDashboardContext,
  type OwnerGuideEditFormValues,
  type OwnerGuideOnboardFormValues,
} from "./schemas";

const DASHBOARD_PATH = "/dashboard";

const dealerEngagementClient = createErpFeatureClient({
  featureName: "engagement.dealer",
  basePath: ENGAGEMENT_ENDPOINTS.dealerBase,
});

export type DealerDashboardActionResult =
  | Readonly<{
      ok: true;
      message: string;
    }>
  | Readonly<{
      ok: false;
      code: string;
      message: string;
      requestId?: string;
    }>;

type SecuredActionContext = Readonly<{
  actorContext?: ServerActorContextHeaders;
}>;

function optionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function nullableText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function optionalChassisNumber(value: string): string | undefined {
  return optionalText(value)?.toUpperCase();
}

function actionFailure(error: unknown): DealerDashboardActionResult {
  if (isApiHttpError(error)) {
    const requestId = error.requestId?.trim();

    return {
      ok: false,
      code: error.code,
      message:
        error.status === 409
          ? "The Owner Guide changed before this request completed. Refresh the dashboard and try again."
          : error.status === 403
            ? "You are not authorized to perform this dealer operation."
            : error.status >= 500
              ? "The dealer operation is temporarily unavailable."
              : "The dealer operation could not be completed. Review the values and try again.",
      ...(requestId !== undefined && requestId.length > 0 ? { requestId } : {}),
    };
  }

  return {
    ok: false,
    code: "dealer_dashboard_operation_failed",
    message: "The dealer operation could not be completed safely.",
  };
}

async function requireActionContext(
  contextInput: DealerDashboardContext,
  capability: keyof Pick<
    DealerDashboardCapabilities,
    | "canCreateOwnerGuide"
    | "canUpdateOwnerGuide"
    | "canDisableOwnerGuide"
    | "canSendOwnerGuideAppLink"
  >,
): Promise<SecuredActionContext> {
  await assertSameOriginMutation(API_CONFIG.appOrigin);

  const context = dealerDashboardContextSchema.parse(contextInput);
  const me = await requireAuthenticatedMe();
  const access = resolveDealerDashboardAccess(me, context);

  if (
    access.kind === "unsupported" ||
    access.kind === "context_required" ||
    !access.capabilities[capability]
  ) {
    throw new ApiHttpError({
      message:
        "Dealer dashboard action is not permitted for this actor context.",
      status: 403,
      code: "dealer_dashboard_action_forbidden",
    });
  }

  return access.actorContext === undefined
    ? {}
    : { actorContext: access.actorContext };
}

function refreshDealerDashboard(): void {
  revalidatePath(DASHBOARD_PATH);
}

export async function onboardOwnerGuideAction(
  input: Readonly<{
    context: DealerDashboardContext;
    values: OwnerGuideOnboardFormValues;
  }>,
): Promise<DealerDashboardActionResult> {
  try {
    const secured = await requireActionContext(
      input.context,
      "canCreateOwnerGuide",
    );
    const values = ownerGuideOnboardFormSchema.parse(input.values);
    const vehicleChassisNo = optionalChassisNumber(values.vehicleChassisNo);

    await dealerEngagementClient.request({
      method: HTTP_METHODS.POST,
      path: "/happy-customers",
      body: {
        mobileNumber: values.mobileNumber,
        displayName: values.displayName,
        assignmentEnabled: values.assignmentEnabled,
        ...(optionalText(values.vehicleModel) !== undefined
          ? { vehicleModel: optionalText(values.vehicleModel) }
          : {}),
        ...(optionalText(values.vehicleVariant) !== undefined
          ? { vehicleVariant: optionalText(values.vehicleVariant) }
          : {}),
        ...(vehicleChassisNo !== undefined ? { vehicleChassisNo } : {}),
        ...(optionalText(values.vehicleDeliveryDate) !== undefined
          ? { vehicleDeliveryDate: values.vehicleDeliveryDate }
          : {}),
        ...(values.maxAssignmentDistanceKm !== undefined
          ? { maxAssignmentDistanceKm: values.maxAssignmentDistanceKm }
          : {}),
        ...(values.dailyAssignmentLimit !== undefined
          ? { dailyAssignmentLimit: values.dailyAssignmentLimit }
          : {}),
        idempotencyKey: values.idempotencyKey,
      },
      schema: ownerGuideDetailSchema,
      idempotencyKey: values.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(secured.actorContext !== undefined
        ? { actorContext: secured.actorContext }
        : {}),
    });

    refreshDealerDashboard();

    return {
      ok: true,
      message: values.assignmentEnabled
        ? "Owner Guide was onboarded and enabled for assignment."
        : "Owner Guide was onboarded with assignment paused.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateOwnerGuideAction(
  input: Readonly<{
    context: DealerDashboardContext;
    values: OwnerGuideEditFormValues;
  }>,
): Promise<DealerDashboardActionResult> {
  try {
    const secured = await requireActionContext(
      input.context,
      "canUpdateOwnerGuide",
    );
    const values = ownerGuideEditFormSchema.parse(input.values);
    const ownerGuideId = encodeURIComponent(values.ownerGuideId);
    const vehicleChassisNo = optionalChassisNumber(
      values.replacementVehicleChassisNo,
    );

    await dealerEngagementClient.request({
      method: HTTP_METHODS.PATCH,
      path: `/happy-customers/${ownerGuideId}`,
      body: {
        displayName: values.displayName,
        vehicleModel: nullableText(values.vehicleModel),
        vehicleVariant: nullableText(values.vehicleVariant),
        assignmentEnabled: values.assignmentEnabled,
        ...(vehicleChassisNo !== undefined ? { vehicleChassisNo } : {}),
        maxAssignmentDistanceKm: values.maxAssignmentDistanceKm ?? null,
        dailyAssignmentLimit: values.dailyAssignmentLimit ?? null,
        rowVersion: values.rowVersion,
      },
      schema: ownerGuideDetailSchema,
      idempotencyKey: values.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(secured.actorContext !== undefined
        ? { actorContext: secured.actorContext }
        : {}),
    });

    refreshDealerDashboard();

    return {
      ok: true,
      message: "Owner Guide profile and assignment eligibility were updated.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updateOwnerGuideAssignmentEligibilityAction(
  input: Readonly<{
    context: DealerDashboardContext;
    ownerGuideId: string;
    assignmentEnabled: boolean;
    rowVersion: number;
    idempotencyKey: string;
  }>,
): Promise<DealerDashboardActionResult> {
  try {
    const secured = await requireActionContext(
      input.context,
      "canUpdateOwnerGuide",
    );
    const values = ownerGuideAssignmentEligibilityActionInputSchema.parse({
      ownerGuideId: input.ownerGuideId,
      assignmentEnabled: input.assignmentEnabled,
      rowVersion: input.rowVersion,
      idempotencyKey: input.idempotencyKey,
    });
    const ownerGuideId = encodeURIComponent(values.ownerGuideId);

    await dealerEngagementClient.request({
      method: HTTP_METHODS.PATCH,
      path: `/happy-customers/${ownerGuideId}`,
      body: {
        assignmentEnabled: values.assignmentEnabled,
        rowVersion: values.rowVersion,
      },
      schema: ownerGuideDetailSchema,
      idempotencyKey: values.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(secured.actorContext !== undefined
        ? { actorContext: secured.actorContext }
        : {}),
    });

    refreshDealerDashboard();

    return {
      ok: true,
      message: values.assignmentEnabled
        ? "Owner Guide assignment was enabled."
        : "Owner Guide assignment was paused.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function ownerGuideLifecycleAction(
  input: Readonly<{
    context: DealerDashboardContext;
    ownerGuideId: string;
    operation: "activate" | "deactivate" | "send-app-link";
    idempotencyKey: string;
  }>,
): Promise<DealerDashboardActionResult> {
  try {
    const operationInput = ownerGuideLifecycleActionInputSchema.parse({
      ownerGuideId: input.ownerGuideId,
      operation: input.operation,
      idempotencyKey: input.idempotencyKey,
    });
    const validatedOperationInput = operationInput;
    const requiredCapability =
      validatedOperationInput.operation === "deactivate"
        ? "canDisableOwnerGuide"
        : validatedOperationInput.operation === "send-app-link"
          ? "canSendOwnerGuideAppLink"
          : "canUpdateOwnerGuide";
    const secured = await requireActionContext(
      input.context,
      requiredCapability,
    );
    const ownerGuideId = encodeURIComponent(
      validatedOperationInput.ownerGuideId,
    );
    const commonOptions = {
      method: HTTP_METHODS.POST,
      path: `/happy-customers/${ownerGuideId}/${validatedOperationInput.operation}`,
      idempotencyKey: validatedOperationInput.idempotencyKey,
      refreshOnUnauthorized: false,
      ...(secured.actorContext !== undefined
        ? { actorContext: secured.actorContext }
        : {}),
    } as const;

    if (validatedOperationInput.operation === "send-app-link") {
      await dealerEngagementClient.request({
        ...commonOptions,
        schema: sendOwnerGuideAppLinkResultSchema,
      });
    } else {
      await dealerEngagementClient.request({
        ...commonOptions,
        schema: ownerGuideDetailSchema,
      });
    }

    refreshDealerDashboard();

    return {
      ok: true,
      message:
        validatedOperationInput.operation === "send-app-link"
          ? "Owner Guide application link was queued."
          : validatedOperationInput.operation === "activate"
            ? "Owner Guide profile was activated."
            : "Owner Guide profile was deactivated.",
    };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

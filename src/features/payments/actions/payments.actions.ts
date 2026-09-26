// oz-next-app/src/features/payments/actions/payments.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { resolveTenantAccess } from "@/features/tenant-context";
import {
  configurePaymentAccountActionInputSchema,
  paymentRefreshActionInputSchema,
  paymentRefundActionInputSchema,
  rotatePaymentCredentialsActionInputSchema,
  updatePaymentAccountActionInputSchema,
  type PaymentProviderAccount,
  type PaymentTransactionDetail,
} from "@/features/payments/contracts/payments.schema";
import {
  configurePaymentAccount,
  issuePaymentRefund,
  refreshPaymentTransaction,
  rotatePaymentCredentials,
  updatePaymentAccount,
  type PaymentsAccess,
} from "@/features/payments/server/payments.server";
import { API_CONFIG } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";
import { assertSameOriginMutation } from "@/server/security/origin";

const PAYMENTS_PATH = "/settings/integrations/payments";

const PAYMENT_PERMISSION = {
  configure: "payment:configure",
  refund: "payment:refund",
  reconcile: "payment:reconcile",
} as const;

type PaymentsActionFailure = Readonly<{
  ok: false;
  code: string;
  message: string;
  requestId?: string;
  fieldErrors?: ReadonlyArray<Readonly<{ path: string; message: string }>>;
}>;

type PaymentsActionResult<T> =
  Readonly<{ ok: true; data: T }> | PaymentsActionFailure;

async function resolveActionAccess(
  permission: string,
): Promise<PaymentsAccess> {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  const me = await requireAuthenticatedMe();
  if (!me.permissions.includes(permission)) {
    throw new TypeError("payment_action_forbidden");
  }
  const access = resolveTenantAccess(me);
  if (access.kind !== "resolved") {
    throw new TypeError("payment_tenant_context_required");
  }
  return {
    ...access,
    capabilities: {
      canConfigure: me.permissions.includes(PAYMENT_PERMISSION.configure),
      canRefund: me.permissions.includes(PAYMENT_PERMISSION.refund),
      canReconcile: me.permissions.includes(PAYMENT_PERMISSION.reconcile),
    },
  };
}

function safeRequestId(value: string | undefined): string | undefined {
  const normalized = value?.trim() ?? "";
  return /^[A-Za-z0-9_.:/@-]{1,128}$/u.test(normalized)
    ? normalized
    : undefined;
}

function actionFailure(error: unknown): PaymentsActionFailure {
  if (error instanceof TypeError) {
    if (error.message === "payment_action_forbidden") {
      return {
        ok: false,
        code: "payment_action_forbidden",
        message: "You are not authorized to perform this payment operation.",
      };
    }
    if (error.message === "payment_tenant_context_required") {
      return {
        ok: false,
        code: "payment_tenant_context_required",
        message: "Select an authorized tenant context and retry.",
      };
    }
  }

  if (error instanceof z.ZodError) {
    return {
      ok: false,
      code: "payment_validation_failed",
      message: "Review the payment configuration and retry.",
      fieldErrors: error.issues.slice(0, 16).map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    };
  }

  if (isApiHttpError(error)) {
    const requestId = safeRequestId(error.requestId);
    const message =
      error.status === 401
        ? "Your ERP session is no longer authorized for this operation."
        : error.status === 403
          ? "You do not have permission to perform this payment operation."
          : error.status === 404
            ? "The requested payment resource is no longer available."
            : error.status === 409
              ? "Payment state changed. Refresh the workspace before retrying."
              : error.status === 422
                ? "The payment request failed validation. Review the inputs and retry."
                : error.status === 429
                  ? "Payment operations are temporarily rate limited. Retry shortly."
                  : error.status >= 500
                    ? "The payment provider or ERP payment service is temporarily unavailable."
                    : "The payment operation could not be completed safely.";
    return {
      ok: false,
      code: error.code,
      message,
      ...(requestId === undefined ? {} : { requestId }),
      ...(error.problem?.invalid_params === undefined
        ? {}
        : {
            fieldErrors: error.problem.invalid_params
              .slice(0, 16)
              .map((item) => ({
                path: item.path,
                message: item.message,
              })),
          }),
    };
  }

  return {
    ok: false,
    code: "payment_request_failed",
    message: "The payment operation could not be completed safely.",
  };
}

export async function configurePaymentAccountAction(
  input: unknown,
): Promise<PaymentsActionResult<PaymentProviderAccount>> {
  try {
    const body = configurePaymentAccountActionInputSchema.parse(input);
    const access = await resolveActionAccess(PAYMENT_PERMISSION.configure);
    const data = await configurePaymentAccount(access, {
      ...body,
      metadata: {},
    });
    revalidatePath(PAYMENTS_PATH);
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function rotatePaymentCredentialsAction(
  input: unknown,
): Promise<PaymentsActionResult<PaymentProviderAccount>> {
  try {
    const body = rotatePaymentCredentialsActionInputSchema.parse(input);
    const access = await resolveActionAccess(PAYMENT_PERMISSION.configure);
    const data = await rotatePaymentCredentials(
      access,
      body.providerAccountId,
      {
        providerCode: body.providerCode,
        environment: body.environment,
        clientKeyId: body.clientKeyId,
        apiSecret: body.apiSecret,
        webhookSecret: body.webhookSecret,
        rowVersion: body.rowVersion,
      },
    );
    revalidatePath(PAYMENTS_PATH);
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function updatePaymentAccountAction(
  input: unknown,
): Promise<PaymentsActionResult<PaymentProviderAccount>> {
  try {
    const body = updatePaymentAccountActionInputSchema.parse(input);
    const access = await resolveActionAccess(PAYMENT_PERMISSION.configure);
    const data = await updatePaymentAccount(access, body.providerAccountId, {
      ...(body.accountReference === undefined
        ? {}
        : { accountReference: body.accountReference }),
      ...(body.status === undefined ? {} : { status: body.status }),
      ...(body.isDefault === undefined ? {} : { isDefault: body.isDefault }),
      rowVersion: body.rowVersion,
    });
    revalidatePath(PAYMENTS_PATH);
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function issuePaymentRefundAction(
  input: unknown,
): Promise<
  PaymentsActionResult<Readonly<{ refundId: string; status: string }>>
> {
  try {
    const body = paymentRefundActionInputSchema.parse(input);
    const access = await resolveActionAccess(PAYMENT_PERMISSION.refund);
    const data = await issuePaymentRefund(access, body);
    revalidatePath(PAYMENTS_PATH);
    return { ok: true, data: { refundId: data.refundId, status: data.status } };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function refreshPaymentTransactionAction(
  input: unknown,
): Promise<PaymentsActionResult<PaymentTransactionDetail>> {
  try {
    const body = paymentRefreshActionInputSchema.parse(input);
    const access = await resolveActionAccess(PAYMENT_PERMISSION.reconcile);
    const data = await refreshPaymentTransaction(access, body.chargeId);
    revalidatePath(PAYMENTS_PATH);
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

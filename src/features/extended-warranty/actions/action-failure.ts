// oz-next-app/src/features/extended-warranty/actions/action-failure.ts
import { z } from "zod";

import { isApiHttpError } from "@/lib/api/problem";

export type ExtendedWarrantyActionFailure = Readonly<{
  ok: false;
  code: string;
  message: string;
  requestId?: string;
  retryAfterSeconds?: number;
  fieldErrors?: ReadonlyArray<Readonly<{ path: string; message: string }>>;
}>;

export type ExtendedWarrantyActionResult<TData> =
  Readonly<{ ok: true; data: TData }> | ExtendedWarrantyActionFailure;

export type ExtendedWarrantyActionContext =
  | "PAYMENT_RECONCILIATION"
  | "FULFILLMENT_RECONCILIATION"
  | "INSTALLATION_REVIEW";

function safeRequestId(value: string | undefined): string | undefined {
  const normalized = value?.trim() ?? "";
  return /^[A-Za-z0-9_.:/@-]{1,128}$/u.test(normalized)
    ? normalized
    : undefined;
}

function localFailure(error: Error): ExtendedWarrantyActionFailure | null {
  if (error.message === "forbidden") {
    return {
      ok: false,
      code: "extended_warranty_action_forbidden",
      message: "You are not authorized to perform this warranty operation.",
    };
  }

  if (error.message === "invalid_tenant_context") {
    return {
      ok: false,
      code: "extended_warranty_tenant_context_required",
      message: "Select an authorized tenant context and retry.",
    };
  }

  if (error.message === "No payment to reconcile") {
    return {
      ok: false,
      code: "extended_warranty_payment_not_reconcilable",
      message:
        "This warranty order does not currently have a payment to reconcile.",
    };
  }

  if (
    error.message === "cross_origin_mutation_rejected" ||
    error.message === "cross_site_mutation_rejected"
  ) {
    return {
      ok: false,
      code: "extended_warranty_origin_rejected",
      message:
        "The operation was rejected by the ERP same-origin security policy. Refresh the page and retry from the active session.",
    };
  }

  return null;
}

function contextualConflictMessage(
  context: ExtendedWarrantyActionContext,
): string {
  if (context === "INSTALLATION_REVIEW") {
    return "The installation evidence changed while you were reviewing it. Refresh the latest evidence before making a decision.";
  }

  if (context === "PAYMENT_RECONCILIATION") {
    return "Payment state changed while the reconciliation request was being prepared. Refresh the warranty record before retrying.";
  }

  return "Fulfillment state changed while the reconciliation request was being prepared. Refresh the warranty record before retrying.";
}

function contextualServerMessage(
  context: ExtendedWarrantyActionContext,
): string {
  if (context === "INSTALLATION_REVIEW") {
    return "The installation review service is temporarily unavailable. No successful review decision should be assumed.";
  }

  if (context === "PAYMENT_RECONCILIATION") {
    return "The payment reconciliation service is temporarily unavailable. No successful reconciliation should be assumed.";
  }

  return "The fulfillment reconciliation service is temporarily unavailable. No successful reconciliation should be assumed.";
}

export function extendedWarrantyActionFailure(
  error: unknown,
  context: ExtendedWarrantyActionContext,
): ExtendedWarrantyActionFailure {
  if (error instanceof Error) {
    const failure = localFailure(error);
    if (failure !== null) return failure;
  }

  if (error instanceof z.ZodError) {
    return {
      ok: false,
      code: "extended_warranty_validation_failed",
      message:
        "The warranty operation failed validation. Refresh the record and retry.",
      fieldErrors: error.issues.slice(0, 16).map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    };
  }

  if (isApiHttpError(error)) {
    const requestId = safeRequestId(error.requestId);
    let message: string;

    if (error.status === 401) {
      message = "Your ERP session is no longer authorized for this operation.";
    } else if (error.status === 403) {
      message =
        "You do not have permission to perform this warranty operation.";
    } else if (error.status === 404) {
      message =
        "The warranty resource is no longer available. Refresh the workspace.";
    } else if (error.status === 409) {
      message = contextualConflictMessage(context);
    } else if (error.status === 422) {
      message =
        "The warranty operation did not satisfy the current validation contract. Refresh the record and retry.";
    } else if (error.status === 429) {
      message =
        error.retryAfterSeconds === undefined
          ? "Warranty operations are temporarily rate limited. Retry shortly."
          : `Warranty operations are temporarily rate limited. Retry after approximately ${String(error.retryAfterSeconds)} seconds.`;
    } else if (error.status >= 500) {
      message = contextualServerMessage(context);
    } else {
      message = "The warranty operation could not be completed safely.";
    }

    return {
      ok: false,
      code: error.code,
      message,
      ...(requestId === undefined ? {} : { requestId }),
      ...(error.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: error.retryAfterSeconds }),
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
    code: "extended_warranty_request_failed",
    message: "The warranty operation could not be completed safely.",
  };
}

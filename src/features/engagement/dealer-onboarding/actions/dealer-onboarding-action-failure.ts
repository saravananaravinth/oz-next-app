// oz-next-app/src/features/engagement/dealer-onboarding/actions/dealer-onboarding-action-failure.ts
import { z } from "zod";

import { isApiHttpError } from "@/lib/api/problem";

export type DealerOnboardingActionFailure = Readonly<{
  ok: false;
  code: string;
  message: string;
  requestId?: string;
  retryAfterSeconds?: number;
  fieldErrors?: ReadonlyArray<Readonly<{ path: string; message: string }>>;
  requiresPreflightRestart?: boolean;
}>;

const PREFLIGHT_RESTART_CODES = new Set([
  "DEALER_ONBOARDING_PREFLIGHT_CONSUMED",
  "DEALER_ONBOARDING_PREFLIGHT_EXPIRED",
  "DEALER_ONBOARDING_PREFLIGHT_INVALID",
  "DEALER_ONBOARDING_PREFLIGHT_ORIGIN_CHANGED",
  "DEALER_ONBOARDING_PREFLIGHT_IDENTITY_CHANGED",
  "DEALER_ONBOARDING_DEALER_CONFLICT_AFTER_PREFLIGHT",
  "DEALER_ONBOARDING_APPLICATION_CONFLICT_AFTER_PREFLIGHT",
]);

function requestId(value: string | undefined): string | undefined {
  const normalized = value?.trim() ?? "";
  return /^[A-Za-z0-9_.:/@-]{1,128}$/u.test(normalized)
    ? normalized
    : undefined;
}

function apiMessage(status: number, code: string): string {
  if (code === "GSTIN_LOOKUP_NOT_CONFIGURED") {
    return "GSTIN lookup is not configured. Continue with the permission-controlled manual tax workflow.";
  }
  if (code === "DEALER_LEGAL_ENTITY_LINK_REQUIRED") {
    return "The preflight matched an existing legal entity. Link that legal entity before provisioning.";
  }
  if (code === "DEALER_ONBOARDING_PLACE_OF_SUPPLY_MISMATCH") {
    return "Place of supply must match the operating state for this onboarding contract.";
  }
  if (code === "DEALER_ONBOARDING_COMMERCIAL_COVERAGE_INCOMPLETE") {
    return "The selected price book or margin template does not cover every required active variant.";
  }
  if (PREFLIGHT_RESTART_CODES.has(code)) {
    return "The onboarding identity or preflight is no longer valid. Retry the submission so the automatic existing-record check can run again.";
  }
  if (status === 401)
    return "Your ERP session is no longer authorized for this operation.";
  if (status === 403)
    return "You are not authorized to perform this dealer onboarding operation.";
  if (status === 404)
    return "The requested onboarding reference is no longer available in the authorized tenant.";
  if (status === 409)
    return "The onboarding state changed or conflicts with an existing record. Refresh the workflow before retrying.";
  if (status === 422)
    return "The onboarding information did not satisfy the backend validation contract.";
  if (status === 429)
    return "Too many onboarding requests were submitted. Wait briefly before retrying.";
  if (status >= 500)
    return "Dealer onboarding is temporarily unavailable. No partial dealer should be assumed.";
  return "The dealer onboarding request could not be completed safely.";
}

function localFailure(error: TypeError): DealerOnboardingActionFailure | null {
  if (error.message === "dealer_onboarding_access_forbidden") {
    return {
      ok: false,
      code: "dealer_onboarding_access_forbidden",
      message:
        "The active ERP actor is not authorized to use dealer onboarding.",
    };
  }
  if (error.message === "dealer_onboarding_tenant_context_mismatch") {
    return {
      ok: false,
      code: "dealer_onboarding_tenant_context_mismatch",
      message:
        "The globally selected tenant changed. Reopen dealer administration from the active tenant context.",
    };
  }
  if (error.message === "dealer_onboarding_provision_forbidden") {
    return {
      ok: false,
      code: "dealer_onboarding_provision_forbidden",
      message:
        "The active ERP actor can review onboarding but does not have the complete dealer provisioning permission set.",
    };
  }
  return null;
}

export function dealerOnboardingActionFailure(
  error: unknown,
): DealerOnboardingActionFailure {
  if (error instanceof TypeError) {
    const failure = localFailure(error);
    if (failure !== null) return failure;
  }

  if (error instanceof z.ZodError) {
    return {
      ok: false,
      code: "dealer_onboarding_validation_failed",
      message: "Review the highlighted onboarding fields and retry.",
      fieldErrors: error.issues.slice(0, 16).map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    };
  }

  if (isApiHttpError(error)) {
    const safeRequestId = requestId(error.requestId);
    const invalidParams = error.problem?.invalid_params
      ?.slice(0, 16)
      .map((item) => ({
        path: item.path,
        message: item.message,
      }));

    const baseMessage = apiMessage(error.status, error.code);
    const message =
      error.status === 429 && error.retryAfterSeconds !== undefined
        ? `${baseMessage} Retry after ${String(error.retryAfterSeconds)} seconds.`
        : baseMessage;

    return {
      ok: false,
      code: error.code,
      message,
      ...(safeRequestId !== undefined ? { requestId: safeRequestId } : {}),
      ...(error.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: error.retryAfterSeconds }
        : {}),
      ...(invalidParams !== undefined && invalidParams.length > 0
        ? { fieldErrors: invalidParams }
        : {}),
      ...(PREFLIGHT_RESTART_CODES.has(error.code)
        ? { requiresPreflightRestart: true }
        : {}),
    };
  }

  return {
    ok: false,
    code: "dealer_onboarding_request_failed",
    message: "The dealer onboarding request could not be completed safely.",
  };
}

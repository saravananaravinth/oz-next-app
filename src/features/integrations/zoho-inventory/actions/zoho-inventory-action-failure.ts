// oz-next-app/src/features/integrations/zoho-inventory/actions/zoho-inventory-action-failure.ts
import { z } from "zod";

import { isApiHttpError } from "@/lib/api/problem";

export type ZohoInventoryActionFailure = Readonly<{
  ok: false;
  code: string;
  message: string;
  requestId?: string;
  retryAfterSeconds?: number;
  fieldErrors?: ReadonlyArray<Readonly<{ path: string; message: string }>>;
}>;

function safeRequestId(value: string | undefined): string | undefined {
  const normalized = value?.trim() ?? "";

  return /^[A-Za-z0-9_.:/@-]{1,128}$/u.test(normalized)
    ? normalized
    : undefined;
}

function localFailure(error: TypeError): ZohoInventoryActionFailure | null {
  if (error.message === "zoho_integration_access_forbidden") {
    return {
      ok: false,
      code: "zoho_integration_access_forbidden",
      message:
        "The active ERP actor is not authorized to perform this Zoho Inventory operation.",
    };
  }

  if (error.message === "zoho_authorization_url_invalid") {
    return {
      ok: false,
      code: "zoho_authorization_url_invalid",
      message:
        "The Zoho authorization target failed the frontend origin policy and was not opened.",
    };
  }

  if (
    error.message === "zoho_oauth_cookie_payload_too_large" ||
    error.message === "zoho_oauth_cookie_chunk_limit_exceeded" ||
    error.message === "zoho_pending_grant_organization_limit_exceeded"
  ) {
    return {
      ok: false,
      code: "zoho_oauth_state_too_large",
      message:
        "The authorized Zoho account exposes too much organization metadata for the bounded browser handoff. Retry with an account containing fewer organizations or add a backend pending-grant read endpoint.",
    };
  }

  return null;
}

function apiMessage(status: number): string {
  if (status === 401) {
    return "Your ERP session is no longer authorized for this operation.";
  }

  if (status === 403) {
    return "You do not have permission to manage Zoho Inventory for the active tenant.";
  }

  if (status === 404) {
    return "The requested Zoho Inventory connection is no longer available in the active tenant.";
  }

  if (status === 409) {
    return "The Zoho Inventory connection or authorization state changed. Refresh the workspace before retrying.";
  }

  if (status === 422) {
    return "The Zoho Inventory request did not satisfy the backend validation contract.";
  }

  if (status === 429) {
    return "Zoho integration requests are temporarily rate limited. Wait briefly before retrying.";
  }

  if (status >= 500) {
    return "Zoho Inventory integration is temporarily unavailable. No successful provider change should be assumed.";
  }

  return "The Zoho Inventory request could not be completed safely.";
}

export function zohoInventoryActionFailure(
  error: unknown,
): ZohoInventoryActionFailure {
  if (error instanceof TypeError) {
    const failure = localFailure(error);

    if (failure !== null) {
      return failure;
    }
  }

  if (error instanceof z.ZodError) {
    return {
      ok: false,
      code: "zoho_integration_validation_failed",
      message: "Review the Zoho Inventory integration input and retry.",
      fieldErrors: error.issues.slice(0, 16).map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    };
  }

  if (isApiHttpError(error)) {
    const requestId = safeRequestId(error.requestId);
    const baseMessage = apiMessage(error.status);
    const message =
      error.status === 429 && error.retryAfterSeconds !== undefined
        ? `${baseMessage} Retry after ${String(error.retryAfterSeconds)} seconds.`
        : baseMessage;

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
    code: "zoho_integration_request_failed",
    message: "The Zoho Inventory request could not be completed safely.",
  };
}

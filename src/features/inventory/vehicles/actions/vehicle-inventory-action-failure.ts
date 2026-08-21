// oz-next-app/src/features/inventory/vehicles/actions/vehicle-inventory-action-failure.ts
import { isApiHttpError } from "@/lib/api/problem";
import { logger, type SafeLogValue } from "@/lib/observability/logger";

import type { VehicleInventoryRemediationCategory } from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";

const VALIDATION_ERROR_CODES = new Set([
  "api_response_validation_failed",
  "api_response_metadata_validation_failed",
]);
const MAX_LOGGED_VALIDATION_ISSUES = 8;

export type VehicleInventoryActionFailure = Readonly<{
  ok: false;
  code: string;
  message: string;
  requestId?: string;
}>;

export type VehicleInventoryActionFailureContext = Readonly<{
  operation:
    | "load_data_quality_issues"
    | "run_remediation"
    | "email_data_quality_report";
  category?: VehicleInventoryRemediationCategory | undefined;
}>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validationIssues(details: unknown): readonly SafeLogValue[] {
  if (!Array.isArray(details)) {
    return [];
  }

  return details.slice(0, MAX_LOGGED_VALIDATION_ISSUES).flatMap((issue) => {
    if (!isRecord(issue)) {
      return [];
    }

    const path = issue["path"];
    const message = issue["message"];
    if (typeof path !== "string" || typeof message !== "string") {
      return [];
    }

    return [{ path, message }];
  });
}

export function vehicleInventoryActionFailure(
  error: unknown,
  context: VehicleInventoryActionFailureContext,
): VehicleInventoryActionFailure {
  if (isApiHttpError(error)) {
    const requestId = error.requestId?.trim();

    if (VALIDATION_ERROR_CODES.has(error.code)) {
      logger.error("vehicle_inventory_api_response_validation_failed", {
        operation: context.operation,
        category: context.category,
        requestId:
          requestId !== undefined && requestId.length > 0 ? requestId : null,
        validationIssues: validationIssues(error.details),
      });
    }

    const message =
      context.operation === "load_data_quality_issues"
        ? error.status === 403
          ? "You are not authorized to review inventory details for this inventory scope."
          : error.status === 429
            ? "Too many inventory review requests were submitted. Wait briefly and retry."
            : error.status >= 500
              ? "Inventory review details are temporarily unavailable."
              : "The inventory review details could not be loaded."
        : error.code === "INVENTORY_REMEDIATION_TIMEOUT"
          ? "The correction reached its safe database processing limit and was rolled back. Retry the same correction once."
          : error.code === "INVENTORY_REMEDIATION_CONFLICT"
            ? "Another inventory change is using the same vehicle or variant configuration. Retry this correction shortly."
            : error.status === 403
              ? "You are not authorized to correct inventory data for this inventory scope."
              : error.status === 422
                ? "The correction could not be applied to the submitted inventory records."
                : error.status === 429
                  ? "Too many inventory correction requests were submitted. Wait briefly and retry."
                  : error.status >= 500
                    ? "Inventory correction is temporarily unavailable."
                    : "The inventory correction request could not be completed.";

    return {
      ok: false,
      code: error.code,
      message,
      ...(requestId !== undefined && requestId.length > 0 ? { requestId } : {}),
    };
  }

  return {
    ok: false,
    code: "vehicle_inventory_remediation_failed",
    message: "The inventory correction request could not be completed safely.",
  };
}

// oz-next-app/src/features/inventory/vehicles/actions/vehicle-inventory.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { API_CONFIG } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";
import { assertSameOriginMutation } from "@/server/security/origin";

import {
  vehicleInventoryRemediationActionInputSchema,
  vehicleInventoryRemediationContextSchema,
  vehicleInventorySearchParamsSchema,
  VEHICLE_INVENTORY_REMEDIATION_CATEGORIES,
  type VehicleInventoryDataQualityIssuesResult,
  type VehicleInventoryRemediationResult,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
import { resolveVehicleInventoryAccess } from "@/features/inventory/vehicles/policies/vehicle-inventory.policy";
import {
  emailVehicleInventoryDataQualityReport,
  readVehicleInventoryDataQualityIssues,
  runVehicleInventoryRemediation,
} from "@/features/inventory/vehicles/server/vehicle-inventory.server";

const INVENTORY_PATH = "/inventory/vehicles";

const reportActionInputSchema =
  vehicleInventoryRemediationActionInputSchema.refine(
    (value) => value.category !== "UNKNOWN_ARRIVAL_DATE",
    {
      path: ["category"],
      message:
        "Unknown arrival dates require the audited arrival-date workflow.",
    },
  );

const issuesActionInputSchema = z
  .object({
    context: vehicleInventoryRemediationContextSchema,
    query: vehicleInventorySearchParamsSchema,
    category: z.enum(VEHICLE_INVENTORY_REMEDIATION_CATEGORIES),
  })
  .strict();

export type VehicleInventoryIssuesActionResult =
  | Readonly<{
      ok: true;
      data: VehicleInventoryDataQualityIssuesResult;
    }>
  | Readonly<{
      ok: false;
      code: string;
      message: string;
      requestId?: string;
    }>;

export type VehicleInventoryRemediationActionResult =
  | Readonly<{
      ok: true;
      data: VehicleInventoryRemediationResult;
    }>
  | Readonly<{
      ok: false;
      code: string;
      message: string;
      requestId?: string;
    }>;

function actionFailure(
  error: unknown,
): Exclude<VehicleInventoryRemediationActionResult, { ok: true }> {
  if (isApiHttpError(error)) {
    const requestId = error.requestId?.trim();
    const message =
      error.status === 403
        ? "You are not authorized to correct inventory data for this dealer scope."
        : error.status === 409
          ? "Inventory changed while the correction was running. Refresh the page and retry."
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

async function requireRemediationAccess(
  context: z.output<typeof vehicleInventoryRemediationContextSchema>,
  query: z.output<typeof vehicleInventorySearchParamsSchema>,
) {
  await assertSameOriginMutation(API_CONFIG.appOrigin);

  const me = await requireAuthenticatedMe();
  const access = resolveVehicleInventoryAccess(me, {
    tenantId: context.tenantId,
    dealerOrgUnitId: context.dealerOrgUnitId,
  });

  if (
    access.kind === "forbidden" ||
    access.kind === "context_required" ||
    !access.capabilities.canRemediateDataQuality
  ) {
    throw new TypeError("vehicle_inventory_remediation_forbidden");
  }

  if (
    query.tenantId !== undefined &&
    query.tenantId !== access.context.tenantId
  ) {
    throw new TypeError("vehicle_inventory_tenant_context_mismatch");
  }

  if (
    query.dealerOrgUnitId !== undefined &&
    query.dealerOrgUnitId !== access.context.dealerOrgUnitId
  ) {
    throw new TypeError("vehicle_inventory_dealer_context_mismatch");
  }

  return access;
}

export async function loadVehicleInventoryDataQualityIssuesAction(
  input: z.input<typeof issuesActionInputSchema>,
): Promise<VehicleInventoryIssuesActionResult> {
  try {
    const parsed = issuesActionInputSchema.parse(input);
    const access = await requireRemediationAccess(parsed.context, parsed.query);
    const data = await readVehicleInventoryDataQualityIssues({
      query: parsed.query,
      access,
      category: parsed.category,
    });

    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function runVehicleInventoryRemediationAction(
  input: z.input<typeof vehicleInventoryRemediationActionInputSchema>,
): Promise<VehicleInventoryRemediationActionResult> {
  try {
    const parsed = vehicleInventoryRemediationActionInputSchema.parse(input);
    const access = await requireRemediationAccess(parsed.context, parsed.query);
    const data = await runVehicleInventoryRemediation({
      query: parsed.query,
      access,
      category: parsed.category,
      idempotencyKey: parsed.idempotencyKey,
      ...(parsed.arrivals === undefined ? {} : { arrivals: parsed.arrivals }),
    });

    revalidatePath(INVENTORY_PATH);
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

export async function emailVehicleInventoryDataQualityReportAction(
  input: z.input<typeof reportActionInputSchema>,
): Promise<VehicleInventoryRemediationActionResult> {
  try {
    const parsed = reportActionInputSchema.parse(input);
    const access = await requireRemediationAccess(parsed.context, parsed.query);
    const data = await emailVehicleInventoryDataQualityReport({
      query: parsed.query,
      access,
      category: parsed.category,
      idempotencyKey: parsed.idempotencyKey,
    });

    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error);
  }
}

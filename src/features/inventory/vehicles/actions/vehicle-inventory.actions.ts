// oz-next-app/src/features/inventory/vehicles/actions/vehicle-inventory.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { API_CONFIG } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";
import { assertSameOriginMutation } from "@/server/security/origin";

import { vehicleInventoryActionFailure } from "@/features/inventory/vehicles/actions/vehicle-inventory-action-failure";

import {
  vehicleInventoryPriceHistoryActionInputSchema,
  vehicleInventoryTransferHistoryActionInputSchema,
  vehicleInventoryRemediationActionInputSchema,
  vehicleInventoryRemediationContextSchema,
  vehicleInventorySearchParamsSchema,
  VEHICLE_INVENTORY_REMEDIATION_CATEGORIES,
  type VehicleInventoryDataQualityIssuesResult,
  type VehicleInventoryPriceHistoryResult,
  type VehicleInventoryTransferHistoryResult,
  type VehicleInventoryRemediationResult,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
import { resolveVehicleInventoryAccess } from "@/features/inventory/vehicles/policies/vehicle-inventory.policy";
import {
  emailVehicleInventoryDataQualityReport,
  readVehicleInventoryDataQualityIssues,
  readVehicleInventoryPriceHistory,
  readVehicleInventoryTransferHistory,
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

export type VehicleInventoryPriceHistoryActionResult =
  | Readonly<{
      ok: true;
      data: VehicleInventoryPriceHistoryResult;
    }>
  | Readonly<{
      ok: false;
      code: string;
      message: string;
      requestId?: string;
    }>;

export type VehicleInventoryTransferHistoryActionResult =
  | Readonly<{
      ok: true;
      data: VehicleInventoryTransferHistoryResult;
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
  context: Parameters<typeof vehicleInventoryActionFailure>[1],
): Exclude<VehicleInventoryRemediationActionResult, { ok: true }> {
  return vehicleInventoryActionFailure(error, context);
}

function priceHistoryFailure(
  error: unknown,
): Exclude<VehicleInventoryPriceHistoryActionResult, { ok: true }> {
  if (isApiHttpError(error)) {
    const requestId = error.requestId?.trim();
    const message =
      error.status === 403
        ? "You are not authorized to view price history for this inventory scope."
        : error.status === 404
          ? "Price history is not available for this vehicle and stock location."
          : error.status === 429
            ? "Too many price-history requests were submitted. Wait briefly and retry."
            : error.status >= 500
              ? "Vehicle price history is temporarily unavailable."
              : "Vehicle price history could not be loaded.";

    return {
      ok: false,
      code: error.code,
      message,
      ...(requestId !== undefined && requestId.length > 0 ? { requestId } : {}),
    };
  }

  return {
    ok: false,
    code: "vehicle_inventory_price_history_failed",
    message: "Vehicle price history could not be loaded safely.",
  };
}

function transferHistoryFailure(
  error: unknown,
): Exclude<VehicleInventoryTransferHistoryActionResult, { ok: true }> {
  if (isApiHttpError(error)) {
    const requestId = error.requestId?.trim();
    const message =
      error.status === 403
        ? "You are not authorized to view transfer history for this inventory scope."
        : error.status === 404
          ? "Transfer history is not available for this vehicle in the authorized inventory scope."
          : error.status === 429
            ? "Too many transfer-history requests were submitted. Wait briefly and retry."
            : error.status >= 500
              ? "Vehicle transfer history is temporarily unavailable."
              : "Vehicle transfer history could not be loaded.";

    return {
      ok: false,
      code: error.code,
      message,
      ...(requestId !== undefined && requestId.length > 0 ? { requestId } : {}),
    };
  }

  return {
    ok: false,
    code: "vehicle_inventory_transfer_history_failed",
    message: "Vehicle transfer history could not be loaded safely.",
  };
}

async function requireInventoryReadAccess(
  context: z.output<typeof vehicleInventoryRemediationContextSchema>,
) {
  await assertSameOriginMutation(API_CONFIG.appOrigin);

  const me = await requireAuthenticatedMe();
  const access = resolveVehicleInventoryAccess(me, {
    tenantId: context.tenantId,
    dealerOrgUnitId: context.dealerOrgUnitId ?? undefined,
  });

  if (access.kind === "forbidden" || !access.capabilities.canRead) {
    throw new TypeError("vehicle_inventory_read_forbidden");
  }

  if (
    access.context.tenantId !== context.tenantId ||
    access.context.dealerOrgUnitId !== context.dealerOrgUnitId
  ) {
    throw new TypeError("vehicle_inventory_read_context_mismatch");
  }

  return access;
}

async function requireRemediationAccess(
  context: z.output<typeof vehicleInventoryRemediationContextSchema>,
  query: z.output<typeof vehicleInventorySearchParamsSchema>,
) {
  await assertSameOriginMutation(API_CONFIG.appOrigin);

  const me = await requireAuthenticatedMe();
  const access = resolveVehicleInventoryAccess(me, {
    tenantId: context.tenantId,
    dealerOrgUnitId: context.dealerOrgUnitId ?? undefined,
  });

  if (
    access.kind === "forbidden" ||
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
    access.context.dealerOrgUnitId !== null &&
    query.dealerOrgUnitId !== undefined &&
    query.dealerOrgUnitId !== access.context.dealerOrgUnitId
  ) {
    throw new TypeError("vehicle_inventory_dealer_context_mismatch");
  }

  return access;
}

export async function loadVehicleInventoryPriceHistoryAction(
  input: z.input<typeof vehicleInventoryPriceHistoryActionInputSchema>,
): Promise<VehicleInventoryPriceHistoryActionResult> {
  try {
    const parsed = vehicleInventoryPriceHistoryActionInputSchema.parse(input);
    const access = await requireInventoryReadAccess(parsed.context);
    const data = await readVehicleInventoryPriceHistory({
      access,
      variantId: parsed.variantId,
      storeId: parsed.storeId,
    });

    return { ok: true, data };
  } catch (error: unknown) {
    return priceHistoryFailure(error);
  }
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
    return actionFailure(error, {
      operation: "load_data_quality_issues",
      category: input.category,
    });
  }
}

export async function loadVehicleInventoryTransferHistoryAction(
  input: z.input<typeof vehicleInventoryTransferHistoryActionInputSchema>,
): Promise<VehicleInventoryTransferHistoryActionResult> {
  try {
    const parsed =
      vehicleInventoryTransferHistoryActionInputSchema.parse(input);
    const access = await requireInventoryReadAccess(parsed.context);
    const data = await readVehicleInventoryTransferHistory({
      access,
      unitId: parsed.unitId,
    });

    return { ok: true, data };
  } catch (error: unknown) {
    return transferHistoryFailure(error);
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
      ...(parsed.chargerSelections === undefined
        ? {}
        : { chargerSelections: parsed.chargerSelections }),
      ...(parsed.batteryConfigurations === undefined
        ? {}
        : { batteryConfigurations: parsed.batteryConfigurations }),
    });

    revalidatePath(INVENTORY_PATH);
    return { ok: true, data };
  } catch (error: unknown) {
    return actionFailure(error, {
      operation: "run_remediation",
      category: input.category,
    });
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
    return actionFailure(error, {
      operation: "email_data_quality_report",
      category: input.category,
    });
  }
}

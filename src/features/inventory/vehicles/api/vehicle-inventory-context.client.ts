// oz-next-app/src/features/inventory/vehicles/api/vehicle-inventory-context.client.ts
"use client";

import { sameOriginFetch } from "@/lib/api/same-origin-client";
import { HTTP_METHODS } from "@/lib/api/http-contract";

import {
  vehicleInventoryDealerContextQuerySchema,
  vehicleInventoryDealerContextResultSchema,
  type VehicleInventoryDealerContextQuery,
  type VehicleInventoryDealerContextResult,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";

const DEALER_CONTEXT_ENDPOINT = "/api/inventory/dealer-contexts" as const;

export async function fetchVehicleInventoryDealerContexts(
  input: VehicleInventoryDealerContextQuery,
  signal?: AbortSignal,
): Promise<VehicleInventoryDealerContextResult> {
  const query = vehicleInventoryDealerContextQuerySchema.parse(input);
  const search = new URLSearchParams({
    tenantId: query.tenantId,
    limit: String(query.limit),
  });

  if (query.q !== undefined) {
    search.set("q", query.q);
  }

  if (query.cursor !== undefined) {
    search.set("cursor", query.cursor);
  }

  return await sameOriginFetch(`${DEALER_CONTEXT_ENDPOINT}?${search}`, {
    method: HTTP_METHODS.GET,
    schema: vehicleInventoryDealerContextResultSchema,
    ...(signal === undefined ? {} : { signal }),
  });
}

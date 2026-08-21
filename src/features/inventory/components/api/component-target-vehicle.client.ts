// oz-next-app/src/features/inventory/components/api/component-target-vehicle.client.ts
"use client";

import { z } from "zod";

import { sameOriginFetch } from "@/lib/api/same-origin-client";
import { HTTP_METHODS } from "@/lib/api/http-contract";

const targetVehicleSearchResponseSchema = z
  .object({
    asOf: z.iso.datetime({ offset: true }),
    truncated: z.boolean(),
    items: z
      .array(
        z
          .object({
            id: z.string().trim().min(1).max(512),
            unitId: z.uuid(),
            href: z.string().trim().min(1).max(2_048),
            category: z.literal("vehicle"),
            vin: z.string().trim().min(1).max(160).nullable(),
            modelName: z.string().trim().min(1).max(160).nullable(),
            variantName: z.string().trim().min(1).max(160).nullable(),
            colorName: z.string().trim().min(1).max(160).nullable(),
            storeName: z.string().trim().min(1).max(160),
            dealerName: z.string().trim().min(1).max(160),
            inventoryStatus: z.string().trim().min(1).max(80),
            matchedComponentSerials: z
              .array(z.string().trim().min(1).max(256))
              .max(5)
              .readonly(),
          })
          .strict(),
      )
      .max(8)
      .readonly(),
  })
  .strict();

export type ComponentTargetVehicle = Readonly<{
  unitId: string;
  vin: string | null;
  modelName: string | null;
  variantName: string | null;
  storeName: string;
  dealerName: string;
  inventoryStatus: string;
}>;

export async function searchComponentTargetVehicles(
  input: Readonly<{ tenantId: string; query: string }>,
  signal?: AbortSignal,
): Promise<readonly ComponentTargetVehicle[]> {
  const tenantId = z.uuid().parse(input.tenantId);
  const query = z.string().trim().min(3).max(100).parse(input.query);
  const search = new URLSearchParams({
    q: query,
    tenantId,
    includeMyStock: "true",
    includeSubDealerStock: "true",
  });

  const response = await sameOriginFetch(
    `/api/inventory/vehicles/search?${search.toString()}`,
    {
      method: HTTP_METHODS.GET,
      schema: targetVehicleSearchResponseSchema,
      timeoutMs: 8_000,
      ...(signal === undefined ? {} : { signal }),
    },
  );

  return response.items.map((item) => ({
    unitId: item.unitId,
    vin: item.vin,
    modelName: item.modelName,
    variantName: item.variantName,
    storeName: item.storeName,
    dealerName: item.dealerName,
    inventoryStatus: item.inventoryStatus,
  }));
}

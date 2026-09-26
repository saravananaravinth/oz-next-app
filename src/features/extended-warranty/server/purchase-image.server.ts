// oz-next-app/src/features/extended-warranty/server/purchase-image.server.ts
import "server-only";

import { buildExtendedWarrantyPurchaseOptionImageEdgePath } from "@/features/extended-warranty/contracts/purchase.schema";
import { CT, HTTP_METHODS } from "@/lib/api/http-contract";
import { serverApiClient } from "@/server/api/edge-api-client";

export async function readExtendedWarrantyPurchaseOptionImageResponse(
  input: Readonly<{ token: string; offerOptionId: string }>,
): Promise<Response> {
  return await serverApiClient.raw(
    buildExtendedWarrantyPurchaseOptionImageEdgePath(
      input.token,
      input.offerOptionId,
    ),
    {
      method: HTTP_METHODS.GET,
      auth: false,
      refreshOnUnauthorized: false,
      cache: "no-store",
      timeoutMs: 15_000,
      accept: CT.IMAGE_ANY,
    },
  );
}

// oz-next-app/src/features/erp/shared/server/erp-feature.server.ts
import "server-only";

import { AUTH_ENDPOINTS } from "@/lib/api/endpoints";
import { meResponseSchema } from "@/lib/api/schemas";
import { serverApiClient } from "@/lib/api-server";
import { HTTP_METHODS } from "@/lib/constants";
import type { ServerActorContextHeaders } from "@/server/api/request-context";

import { erpActorScopeFromMe } from "../queries/erp-query-scope";
import {
  erpActorContextHeadersSchema,
  erpRoutePathSchema,
  type ErpActorContextHeaders,
  type ErpActorScope,
} from "../schemas/erp-common.schema";

export function assertErpServerPath(path: `/erp/${string}`): `/erp/${string}` {
  return erpRoutePathSchema("/erp/").parse(path) as `/erp/${string}`;
}

export async function readCurrentErpActorScope(): Promise<ErpActorScope> {
  const me = await serverApiClient.request(AUTH_ENDPOINTS.me, {
    method: HTTP_METHODS.GET,
    auth: true,
    refreshOnUnauthorized: true,
    cache: "no-store",
    schema: meResponseSchema,
  });

  return erpActorScopeFromMe(me);
}

export function actorContextHeadersFromSelection(
  selection: ErpActorContextHeaders,
): ServerActorContextHeaders {
  const parsed = erpActorContextHeadersSchema.parse(selection);

  return {
    ...(parsed.tenantId != null ? { tenantId: parsed.tenantId } : {}),
    ...(parsed.orgUnitId != null ? { orgUnitId: parsed.orgUnitId } : {}),
    ...(parsed.dealerOrgUnitId != null
      ? { dealerOrgUnitId: parsed.dealerOrgUnitId }
      : {}),
    ...(parsed.financierId != null ? { financierId: parsed.financierId } : {}),
    ...(parsed.customerId != null ? { customerId: parsed.customerId } : {}),
  };
}

export function createStableIdempotencyKey(prefix: string): string {
  const normalizedPrefix = prefix
    .trim()
    .replace(/[^A-Za-z0-9._:-]/gu, "-")
    .replace(/-+/gu, "-")
    .slice(0, 48);

  return `${normalizedPrefix || "erp"}:${crypto.randomUUID()}`;
}

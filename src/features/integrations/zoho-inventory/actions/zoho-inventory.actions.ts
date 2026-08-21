// oz-next-app/src/features/integrations/zoho-inventory/actions/zoho-inventory.actions.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { API_CONFIG } from "@/lib/api/http-contract";
import { assertSameOriginMutation } from "@/server/security/origin";

import {
  beginZohoAuthorizationActionInputSchema,
  createZohoConnectionActionInputSchema,
  runZohoReconciliationActionInputSchema,
  zohoConnectionActionInputSchema,
  type ZohoAuthorizationStartResult,
  type ZohoExternalConnection,
  type ZohoSyncJob,
  type ZohoVerifyResult,
} from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";
import {
  resolveZohoInventoryAccess,
  type ResolvedZohoInventoryAccess,
  type ZohoInventoryCapabilities,
} from "@/features/integrations/zoho-inventory/policies/zoho-inventory.policy";
import { assertZohoAuthorizationUrl } from "@/features/integrations/zoho-inventory/policies/zoho-oauth-provider.policy";
import {
  beginZohoAuthorization,
  createZohoConnection,
  disconnectZohoConnection,
  enqueueZohoReconciliation,
  verifyZohoConnection,
} from "@/features/integrations/zoho-inventory/server/zoho-inventory.server";
import {
  clearZohoPendingGrant,
  hashZohoOAuthState,
  storeZohoOAuthAttemptContext,
} from "@/features/integrations/zoho-inventory/server/zoho-oauth-session";
import {
  zohoInventoryActionFailure,
  type ZohoInventoryActionFailure,
} from "@/features/integrations/zoho-inventory/actions/zoho-inventory-action-failure";

const INTEGRATION_PATH = "/settings/integrations/zoho-inventory";

type ActionSuccess<TData> = Readonly<{ ok: true; data: TData }>;
type ActionResult<TData> = ActionSuccess<TData> | ZohoInventoryActionFailure;

export type BeginZohoAuthorizationActionResult =
  ActionResult<ZohoAuthorizationStartResult>;
export type CreateZohoConnectionActionResult =
  ActionResult<ZohoExternalConnection>;
export type VerifyZohoConnectionActionResult = ActionResult<ZohoVerifyResult>;
export type DisconnectZohoConnectionActionResult = ActionResult<
  Readonly<{ disconnected: true }>
>;
export type RunZohoReconciliationActionResult = ActionResult<ZohoSyncJob>;

async function resolveActionAccess(
  capability: keyof ZohoInventoryCapabilities,
): Promise<ResolvedZohoInventoryAccess> {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  const me = await requireAuthenticatedMe();
  const access = resolveZohoInventoryAccess(me);

  if (access.kind !== "resolved" || !access.capabilities[capability]) {
    throw new TypeError("zoho_integration_access_forbidden");
  }

  return access;
}

export async function beginZohoAuthorizationAction(
  input: unknown,
): Promise<BeginZohoAuthorizationActionResult> {
  try {
    const body = beginZohoAuthorizationActionInputSchema.parse(input);
    const access = await resolveActionAccess("canConfigure");
    const data = await beginZohoAuthorization({
      access,
      dataCenter: body.dataCenter,
      forceConsent: body.forceConsent,
    });

    const redirectUri = new URL(
      "/api/integrations/zoho/callback",
      API_CONFIG.appOrigin,
    ).toString();
    const state = assertZohoAuthorizationUrl({
      authorizationUrl: data.authorizationUrl,
      dataCenter: body.dataCenter,
      redirectUri,
    });
    const stateHash = await hashZohoOAuthState(state);

    await clearZohoPendingGrant();
    await storeZohoOAuthAttemptContext({
      authorizationId: data.authorizationId,
      tenantId: access.tenantId,
      actorContextTenantId: access.actorContext?.tenantId ?? null,
      dataCenter: body.dataCenter,
      stateHash,
      expiresAt: data.expiresAt,
    });

    return { ok: true, data };
  } catch (error: unknown) {
    return zohoInventoryActionFailure(error);
  }
}

export async function createZohoConnectionAction(
  input: unknown,
): Promise<CreateZohoConnectionActionResult> {
  try {
    const body = createZohoConnectionActionInputSchema.parse(input);
    const access = await resolveActionAccess("canConfigure");
    const data = await createZohoConnection({
      access,
      authorizationId: body.authorizationId,
      organizationId: body.organizationId,
      isDefault: body.isDefault,
    });

    await clearZohoPendingGrant();
    revalidatePath(INTEGRATION_PATH);

    return { ok: true, data };
  } catch (error: unknown) {
    return zohoInventoryActionFailure(error);
  }
}

export async function verifyZohoConnectionAction(
  input: unknown,
): Promise<VerifyZohoConnectionActionResult> {
  try {
    const body = zohoConnectionActionInputSchema.parse(input);
    const access = await resolveActionAccess("canConfigure");
    const data = await verifyZohoConnection({
      access,
      connectionId: body.connectionId,
    });

    revalidatePath(INTEGRATION_PATH);
    return { ok: true, data };
  } catch (error: unknown) {
    return zohoInventoryActionFailure(error);
  }
}

export async function disconnectZohoConnectionAction(
  input: unknown,
): Promise<DisconnectZohoConnectionActionResult> {
  try {
    const body = zohoConnectionActionInputSchema.parse(input);
    const access = await resolveActionAccess("canConfigure");

    await disconnectZohoConnection({
      access,
      connectionId: body.connectionId,
    });

    revalidatePath(INTEGRATION_PATH);
    return { ok: true, data: { disconnected: true } };
  } catch (error: unknown) {
    return zohoInventoryActionFailure(error);
  }
}

export async function runZohoReconciliationAction(
  input: unknown,
): Promise<RunZohoReconciliationActionResult> {
  try {
    const body = runZohoReconciliationActionInputSchema.parse(input);
    const access = await resolveActionAccess("canRunSync");
    const data = await enqueueZohoReconciliation({
      access,
      connectionId: body.connectionId,
      idempotencyKey: body.idempotencyKey,
    });

    revalidatePath(INTEGRATION_PATH);
    return { ok: true, data };
  } catch (error: unknown) {
    return zohoInventoryActionFailure(error);
  }
}

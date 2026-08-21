// oz-next-app/src/app/api/integrations/zoho/callback/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isApiHttpError } from "@/lib/api/problem";
import { HTTP_STATUS } from "@/lib/api/http-contract";

import { parseZohoOAuthCallbackSearchParams } from "@/features/integrations/zoho-inventory/contracts/zoho-oauth-callback";
import type { ZohoOAuthAttemptContext } from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";
import { isZohoOAuthCallbackProviderValid } from "@/features/integrations/zoho-inventory/policies/zoho-oauth-provider.policy";
import { exchangeZohoAuthorization } from "@/features/integrations/zoho-inventory/server/zoho-inventory.server";
import {
  clearZohoOAuthAttemptContext,
  hashZohoOAuthState,
  readZohoOAuthAttemptContext,
  storeZohoPendingGrant,
} from "@/features/integrations/zoho-inventory/server/zoho-oauth-session";

const INTEGRATION_PATH = "/settings/integrations/zoho-inventory";

type CallbackStatus =
  | "authorized"
  | "denied"
  | "invalid-callback"
  | "context-lost"
  | "session-expired"
  | "exchange-failed"
  | "selection-unavailable";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function redirectToIntegration(
  request: NextRequest,
  status: CallbackStatus,
): NextResponse {
  const url = new URL(INTEGRATION_PATH, request.url);
  url.searchParams.set("oauth", status);

  const response = NextResponse.redirect(url, 303);
  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Vary", "Cookie");

  return response;
}

async function clearAttemptBestEffort(): Promise<void> {
  try {
    await clearZohoOAuthAttemptContext();
  } catch {
    // Backend OAuth state remains authoritative and expires independently.
  }
}

function stateHashesMatch(left: string, right: string): boolean {
  if (left.length !== right.length || left.length === 0) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

async function callbackMatchesAttempt(
  input: Readonly<{
    attempt: ZohoOAuthAttemptContext;
    state: string;
    location?: string;
    accountsServer?: string;
  }>,
): Promise<boolean> {
  const stateHash = await hashZohoOAuthState(input.state);

  if (!stateHashesMatch(stateHash, input.attempt.stateHash)) {
    return false;
  }

  return isZohoOAuthCallbackProviderValid({
    dataCenter: input.attempt.dataCenter,
    ...(input.location === undefined ? {} : { location: input.location }),
    ...(input.accountsServer === undefined
      ? {}
      : { accountsServer: input.accountsServer }),
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const callback = parseZohoOAuthCallbackSearchParams(
    request.nextUrl.searchParams,
  );

  if (callback === null) {
    return redirectToIntegration(request, "invalid-callback");
  }

  const attempt = await readZohoOAuthAttemptContext();

  if (attempt === null) {
    return redirectToIntegration(request, "context-lost");
  }

  if (callback.kind === "denied") {
    if (callback.data.state === undefined) {
      return redirectToIntegration(request, "invalid-callback");
    }

    const valid = await callbackMatchesAttempt({
      attempt,
      state: callback.data.state,
      ...(callback.data.location === undefined
        ? {}
        : { location: callback.data.location }),
      ...(callback.data.accountsServer === undefined
        ? {}
        : { accountsServer: callback.data.accountsServer }),
    });

    if (!valid) {
      return redirectToIntegration(request, "invalid-callback");
    }

    await clearAttemptBestEffort();
    return redirectToIntegration(request, "denied");
  }

  const valid = await callbackMatchesAttempt({
    attempt,
    state: callback.data.state,
    ...(callback.data.location === undefined
      ? {}
      : { location: callback.data.location }),
    ...(callback.data.accountsServer === undefined
      ? {}
      : { accountsServer: callback.data.accountsServer }),
  });

  if (!valid) {
    return redirectToIntegration(request, "invalid-callback");
  }

  try {
    const exchange = await exchangeZohoAuthorization({
      code: callback.data.code,
      state: callback.data.state,
      ...(attempt.actorContextTenantId === null
        ? {}
        : { actorContext: { tenantId: attempt.actorContextTenantId } }),
    });

    if (exchange.authorizationId !== attempt.authorizationId) {
      await clearAttemptBestEffort();
      return redirectToIntegration(request, "invalid-callback");
    }

    await storeZohoPendingGrant({
      authorizationId: exchange.authorizationId,
      tenantId: attempt.tenantId,
      expiresAt: exchange.expiresAt,
      organizations: exchange.organizations.map((organization) => ({
        organizationId: organization.organizationId,
        name: organization.name,
        isDefault: organization.isDefault,
      })),
    });

    await clearAttemptBestEffort();
    return redirectToIntegration(request, "authorized");
  } catch (error: unknown) {
    await clearAttemptBestEffort();

    if (error instanceof TypeError && error.message.startsWith("zoho_")) {
      return redirectToIntegration(request, "selection-unavailable");
    }

    if (isApiHttpError(error) && error.status === HTTP_STATUS.UNAUTHORIZED) {
      return redirectToIntegration(request, "session-expired");
    }

    return redirectToIntegration(request, "exchange-failed");
  }
}

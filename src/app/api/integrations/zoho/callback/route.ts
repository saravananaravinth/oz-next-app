// oz-next-app/src/app/api/integrations/zoho/callback/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isApiHttpError } from "@/lib/api/problem";
import { HTTP_STATUS } from "@/lib/api/http-contract";

import {
  zohoOAuthCallbackQuerySchema,
  zohoOAuthDeniedQuerySchema,
} from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";
import { exchangeZohoAuthorization } from "@/features/integrations/zoho-inventory/server/zoho-inventory.server";
import {
  clearZohoOAuthAttemptContext,
  hashZohoOAuthState,
  readZohoOAuthAttemptContext,
  storeZohoPendingGrant,
} from "@/features/integrations/zoho-inventory/server/zoho-oauth-session";

const INTEGRATION_PATH = "/settings/integrations/zoho-inventory";
const ALLOWED_QUERY_KEYS = new Set(["code", "state", "error"] as const);

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

function hasDuplicateOrUnknownQuery(searchParams: URLSearchParams): boolean {
  const seen = new Set<string>();

  for (const key of searchParams.keys()) {
    if (
      !ALLOWED_QUERY_KEYS.has(key as "code" | "state" | "error") ||
      seen.has(key)
    ) {
      return true;
    }

    seen.add(key);
  }

  return false;
}

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
    // The backend state remains the authority and expires independently.
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (hasDuplicateOrUnknownQuery(request.nextUrl.searchParams)) {
    return redirectToIntegration(request, "invalid-callback");
  }

  const error = request.nextUrl.searchParams.get("error");
  const state = request.nextUrl.searchParams.get("state");
  const attempt = await readZohoOAuthAttemptContext();

  if (error !== null) {
    const denied = zohoOAuthDeniedQuerySchema.safeParse({
      error,
      ...(state === null ? {} : { state }),
    });

    if (
      !denied.success ||
      denied.data.state === undefined ||
      attempt === null
    ) {
      return redirectToIntegration(
        request,
        attempt === null ? "context-lost" : "invalid-callback",
      );
    }

    const stateHash = await hashZohoOAuthState(denied.data.state);

    if (stateHash !== attempt.stateHash) {
      return redirectToIntegration(request, "invalid-callback");
    }

    await clearAttemptBestEffort();
    return redirectToIntegration(request, "denied");
  }

  const parsed = zohoOAuthCallbackQuerySchema.safeParse({
    code: request.nextUrl.searchParams.get("code"),
    state,
  });

  if (!parsed.success) {
    return redirectToIntegration(request, "invalid-callback");
  }

  if (attempt === null) {
    return redirectToIntegration(request, "context-lost");
  }

  const stateHash = await hashZohoOAuthState(parsed.data.state);

  if (stateHash !== attempt.stateHash) {
    return redirectToIntegration(request, "invalid-callback");
  }

  try {
    const exchange = await exchangeZohoAuthorization({
      code: parsed.data.code,
      state: parsed.data.state,
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

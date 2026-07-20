// oz-next-app/src/features/engagement/dealer-lead-updates/server/dealer-lead.server.ts
import "server-only";

import { isApiHttpError } from "@/lib/api/problem";
import { serverApiClient } from "@/server/api/edge-api-client";

import {
  buildPublicDealerLeadViewPath,
  dealerLeadPublicViewSchema,
  publicDealerLeadTokenSchema,
  type DealerLeadPublicView,
} from "@/features/engagement/dealer-lead-updates/contracts/dealer-lead.schema";

const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/u;

export type PublicDealerLeadLoadResult =
  | Readonly<{
      ok: true;
      lead: DealerLeadPublicView;
    }>
  | Readonly<{
      ok: false;
      reason: "invalid-token" | "not-found" | "unavailable";
      requestId?: string;
    }>;

function safeRequestId(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (
    normalized === undefined ||
    normalized.length === 0 ||
    !SAFE_REQUEST_ID_PATTERN.test(normalized)
  ) {
    return undefined;
  }

  return normalized;
}

export async function getPublicDealerLeadByToken(
  token: string,
): Promise<PublicDealerLeadLoadResult> {
  const parsedToken = publicDealerLeadTokenSchema.safeParse(token);

  if (!parsedToken.success) {
    return {
      ok: false,
      reason: "invalid-token",
    };
  }

  try {
    const lead = await serverApiClient.get<DealerLeadPublicView>(
      buildPublicDealerLeadViewPath(parsedToken.data),
      dealerLeadPublicViewSchema,
      {
        auth: false,
        cache: "no-store",
        timeoutMs: 10_000,
        refreshOnUnauthorized: false,
      },
    );

    return {
      ok: true,
      lead,
    };
  } catch (error: unknown) {
    if (isApiHttpError(error)) {
      const requestId = safeRequestId(error.requestId);

      return {
        ok: false,
        reason:
          error.status === 404 || error.status === 410
            ? "not-found"
            : "unavailable",
        ...(requestId === undefined ? {} : { requestId }),
      };
    }

    return {
      ok: false,
      reason: "unavailable",
    };
  }
}

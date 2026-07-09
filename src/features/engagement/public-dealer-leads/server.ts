// oz-next-app/src/features/engagement/public-dealer-leads/server.ts
import "server-only";

import { isApiHttpError } from "@/lib/api/problem";
import { serverApiClient } from "@/lib/api-server";

import {
  buildPublicDealerLeadViewPath,
  dealerLeadPublicViewSchema,
  publicDealerLeadTokenSchema,
  type DealerLeadPublicView,
} from "./schemas";

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
    const lead = await serverApiClient.get(
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
      return {
        ok: false,
        reason:
          error.status === 404 || error.status === 410
            ? "not-found"
            : "unavailable",
        ...(error.requestId === undefined
          ? {}
          : { requestId: error.requestId }),
      };
    }

    return {
      ok: false,
      reason: "unavailable",
    };
  }
}

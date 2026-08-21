// oz-next-app/src/features/engagement/dealer-onboarding/utils/dealer-onboarding-url.ts
import type { Route } from "next";

import {
  dealerDirectoryRawSearchParamsSchema,
  dealerDirectorySearchParamsSchema,
  type DealerDirectoryRawSearchParams,
  type DealerDirectorySearchParams,
} from "@/features/engagement/dealer-onboarding/contracts/dealer-onboarding.schema";

export const DEALER_ADMINISTRATION_ROUTE =
  "/engagement/dealers" as const satisfies Route;
export const DEALER_ONBOARDING_ROUTE =
  "/engagement/dealers/onboarding" as const satisfies Route;

export function parseDealerDirectorySearchParams(
  raw: DealerDirectoryRawSearchParams,
) {
  const input = dealerDirectoryRawSearchParamsSchema.safeParse(raw);
  if (!input.success) return input;

  return dealerDirectorySearchParamsSchema.safeParse({
    ...(input.data.q === undefined || input.data.q.trim() === ""
      ? {}
      : { q: input.data.q }),
    ...(input.data.dealerType === undefined ||
    input.data.dealerType.trim() === ""
      ? {}
      : { dealerType: input.data.dealerType }),
    ...(input.data.active === undefined || input.data.active.trim() === ""
      ? {}
      : { active: input.data.active }),
    ...(input.data.cursor === undefined || input.data.cursor.trim() === ""
      ? {}
      : { cursor: input.data.cursor }),
  });
}

export function dealerDirectoryHref(
  filters: DealerDirectorySearchParams = {},
): Route {
  const search = new URLSearchParams();
  if (filters.q !== undefined) search.set("q", filters.q);
  if (filters.dealerType !== undefined)
    search.set("dealerType", filters.dealerType);
  if (filters.active !== undefined) search.set("active", filters.active);
  if (filters.cursor !== undefined) search.set("cursor", filters.cursor);
  const query = search.toString();
  return `${DEALER_ADMINISTRATION_ROUTE}${query.length === 0 ? "" : `?${query}`}` as Route;
}

export function dealerOnboardingHref(): Route {
  return DEALER_ONBOARDING_ROUTE;
}

export function dealerDetailHref(dealerOrgUnitId: string): Route {
  return `${DEALER_ADMINISTRATION_ROUTE}/${encodeURIComponent(dealerOrgUnitId)}` as Route;
}

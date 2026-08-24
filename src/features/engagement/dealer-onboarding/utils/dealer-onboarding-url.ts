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

  const active = input.data.active?.trim();

  return dealerDirectorySearchParamsSchema.safeParse({
    ...(input.data.q === undefined || input.data.q.trim() === ""
      ? {}
      : { q: input.data.q }),
    ...(input.data.dealerType === undefined ||
    input.data.dealerType.trim() === ""
      ? {}
      : { dealerType: input.data.dealerType }),
    active: active === undefined || active === "" ? "true" : active,
    ...(input.data.sortBy === undefined || input.data.sortBy.trim() === ""
      ? {}
      : { sortBy: input.data.sortBy }),
    ...(input.data.sortDirection === undefined ||
    input.data.sortDirection.trim() === ""
      ? {}
      : { sortDirection: input.data.sortDirection }),
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
  if (filters.dealerType !== undefined) {
    search.set("dealerType", filters.dealerType);
  }
  if (filters.active !== undefined && filters.active !== "true") {
    search.set("active", filters.active);
  }
  if (filters.sortBy !== undefined && filters.sortBy !== "DISPLAY_NAME") {
    search.set("sortBy", filters.sortBy);
  }
  if (filters.sortDirection !== undefined && filters.sortDirection !== "ASC") {
    search.set("sortDirection", filters.sortDirection);
  }
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

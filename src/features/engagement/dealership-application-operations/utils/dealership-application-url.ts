// oz-next-app/src/features/engagement/dealership-application-operations/utils/dealership-application-url.ts
import type { Route } from "next";

import type { DealershipApplicationSearchParams } from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";

export const DEALERSHIP_APPLICATION_ROUTES = {
  dashboard: "/engagement/dealership-applications" as Route,
  detail(applicationId: string): Route {
    return `/engagement/dealership-applications/${encodeURIComponent(applicationId)}` as Route;
  },
} as const;

type QueryOverride = Readonly<{
  from?: string | null;
  to?: string | null;
  grain?: DealershipApplicationSearchParams["grain"] | null;
  phases?: readonly string[] | null;
  statuses?: readonly string[] | null;
  priorities?: readonly string[] | null;
  sourceKinds?: readonly string[] | null;
  sourceIds?: readonly string[] | null;
  ownerUserIds?: readonly string[] | null;
  ownerOrgUnitIds?: readonly string[] | null;
  districts?: readonly string[] | null;
  cities?: readonly string[] | null;
  q?: string | null;
  sortBy?: DealershipApplicationSearchParams["sortBy"] | null;
  sortDirection?: DealershipApplicationSearchParams["sortDirection"] | null;
  limit?: number | null;
  cursor?: string | null;
}>;

function setArray(
  params: URLSearchParams,
  key: string,
  values: readonly string[] | null | undefined,
): void {
  if (values === undefined) return;
  params.delete(key);
  if (values === null) return;
  for (const value of values) params.append(key, value);
}

function baseSearchParams(
  query: DealershipApplicationSearchParams,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("from", query.from);
  params.set("to", query.to);
  params.set("grain", query.grain);
  setArray(params, "phase", query.phases);
  setArray(params, "status", query.statuses);
  setArray(params, "priority", query.priorities);
  setArray(params, "sourceKind", query.sourceKinds);
  setArray(params, "sourceId", query.sourceIds);
  setArray(params, "ownerUserId", query.ownerUserIds);
  setArray(params, "ownerOrgUnitId", query.ownerOrgUnitIds);
  setArray(params, "district", query.districts);
  setArray(params, "city", query.cities);
  if (query.q !== undefined) params.set("q", query.q);
  params.set("sortBy", query.sortBy);
  params.set("sortDirection", query.sortDirection);
  params.set("limit", String(query.limit));
  if (query.cursor !== undefined) params.set("cursor", query.cursor);
  return params;
}

function applyOptional(
  params: URLSearchParams,
  key: string,
  value: string | number | null | undefined,
): void {
  if (value === undefined) return;
  if (value === null || value === "") params.delete(key);
  else params.set(key, String(value));
}

export function dealershipApplicationDashboardHref(
  query: DealershipApplicationSearchParams,
  override: QueryOverride = {},
): Route {
  const params = baseSearchParams(query);
  applyOptional(params, "from", override.from);
  applyOptional(params, "to", override.to);
  applyOptional(params, "grain", override.grain);
  setArray(params, "phase", override.phases);
  setArray(params, "status", override.statuses);
  setArray(params, "priority", override.priorities);
  setArray(params, "sourceKind", override.sourceKinds);
  setArray(params, "sourceId", override.sourceIds);
  setArray(params, "ownerUserId", override.ownerUserIds);
  setArray(params, "ownerOrgUnitId", override.ownerOrgUnitIds);
  setArray(params, "district", override.districts);
  setArray(params, "city", override.cities);
  applyOptional(params, "q", override.q);
  applyOptional(params, "sortBy", override.sortBy);
  applyOptional(params, "sortDirection", override.sortDirection);
  applyOptional(params, "limit", override.limit);
  applyOptional(params, "cursor", override.cursor);
  const search = params.toString();
  return `${DEALERSHIP_APPLICATION_ROUTES.dashboard}${search.length === 0 ? "" : `?${search}`}` as Route;
}

export function dealershipApplicationDetailHref(
  applicationId: string,
  query: DealershipApplicationSearchParams,
): Route {
  const params = baseSearchParams(query);
  params.delete("cursor");
  const search = params.toString();
  return `${DEALERSHIP_APPLICATION_ROUTES.detail(applicationId)}${search.length === 0 ? "" : `?${search}`}` as Route;
}

export function dealershipApplicationResetHref(): Route {
  return DEALERSHIP_APPLICATION_ROUTES.dashboard;
}

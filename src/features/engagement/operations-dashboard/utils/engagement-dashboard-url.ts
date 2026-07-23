// oz-next-app/src/features/engagement/operations-dashboard/utils/engagement-dashboard-url.ts
import type { Route } from "next";

import type {
  EngagementDashboardDealerSortField,
  EngagementDashboardSearchParams,
  EngagementDashboardSortDirection,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";

export const ENGAGEMENT_DASHBOARD_PATH =
  "/engagement/dashboard" satisfies Route;

type DashboardPatch = Readonly<{
  tenantId?: string | null;
  from?: string | null;
  to?: string | null;
  comparison?: EngagementDashboardSearchParams["comparison"] | null;
  grain?: EngagementDashboardSearchParams["grain"] | null;
  leadSourceIds?: readonly string[] | null;
  ivrFlowCodes?: readonly string[] | null;
  leadTypes?: readonly string[] | null;
  statuses?: readonly string[] | null;
  dealerOrgUnitIds?: readonly string[] | null;
  districts?: readonly string[] | null;
  cities?: readonly string[] | null;
  assignmentStates?: EngagementDashboardSearchParams["assignmentStates"] | null;
  conversionStates?: EngagementDashboardSearchParams["conversionStates"] | null;
  followUpStates?: EngagementDashboardSearchParams["followUpStates"] | null;
  issueSeverities?: EngagementDashboardSearchParams["issueSeverities"] | null;
  q?: string | null;
  dealerSortBy?: EngagementDashboardDealerSortField | null;
  dealerSortDirection?: EngagementDashboardSortDirection | null;
  dealerLimit?: 25 | 50 | 100 | null;
  dealerCursor?: string | null;
  issueLimit?: 25 | 50 | 100 | null;
  issueCursor?: string | null;
}>;

function appendMany(
  search: URLSearchParams,
  key: string,
  values: readonly string[],
): void {
  for (const value of [...new Set(values)].sort((left, right) =>
    left.localeCompare(right),
  )) {
    search.append(key, value);
  }
}

function resolved<TValue>(
  current: TValue,
  patch: TValue | null | undefined,
): TValue | null {
  return patch === undefined ? current : patch;
}

export function engagementDashboardHref(
  query: EngagementDashboardSearchParams,
  patch: DashboardPatch = {},
  hash?: string,
): Route {
  const search = new URLSearchParams();
  const tenantId = resolved(query.tenantId, patch.tenantId);
  const from = resolved(query.from, patch.from);
  const to = resolved(query.to, patch.to);
  const comparison = resolved(query.comparison, patch.comparison);
  const grain = resolved(query.grain, patch.grain);
  const q = resolved(query.q, patch.q);
  const dealerSortBy = resolved(query.dealerSortBy, patch.dealerSortBy);
  const dealerSortDirection = resolved(
    query.dealerSortDirection,
    patch.dealerSortDirection,
  );
  const dealerLimit = resolved(query.dealerLimit, patch.dealerLimit);
  const dealerCursor = resolved(query.dealerCursor, patch.dealerCursor);
  const issueLimit = resolved(query.issueLimit, patch.issueLimit);
  const issueCursor = resolved(query.issueCursor, patch.issueCursor);

  if (tenantId !== null && tenantId !== undefined)
    search.set("tenantId", tenantId);
  if (from !== null) search.set("from", from);
  if (to !== null) search.set("to", to);
  if (comparison !== null) search.set("comparison", comparison);
  if (grain !== null) search.set("grain", grain);
  if (q !== null && q !== undefined && q.trim().length > 0)
    search.set("q", q.trim());
  if (dealerSortBy !== null) search.set("dealerSortBy", dealerSortBy);
  if (dealerSortDirection !== null) {
    search.set("dealerSortDirection", dealerSortDirection);
  }
  if (dealerLimit !== null) search.set("dealerLimit", String(dealerLimit));
  if (dealerCursor !== null && dealerCursor !== undefined) {
    search.set("dealerCursor", dealerCursor);
  }
  if (issueLimit !== null) search.set("issueLimit", String(issueLimit));
  if (issueCursor !== null && issueCursor !== undefined) {
    search.set("issueCursor", issueCursor);
  }

  appendMany(
    search,
    "leadSourceId",
    resolved(query.leadSourceIds, patch.leadSourceIds) ?? [],
  );
  appendMany(
    search,
    "ivrFlowCode",
    resolved(query.ivrFlowCodes, patch.ivrFlowCodes) ?? [],
  );
  appendMany(
    search,
    "leadType",
    resolved(query.leadTypes, patch.leadTypes) ?? [],
  );
  appendMany(search, "status", resolved(query.statuses, patch.statuses) ?? []);
  appendMany(
    search,
    "dealerOrgUnitId",
    resolved(query.dealerOrgUnitIds, patch.dealerOrgUnitIds) ?? [],
  );
  appendMany(
    search,
    "district",
    resolved(query.districts, patch.districts) ?? [],
  );
  appendMany(search, "city", resolved(query.cities, patch.cities) ?? []);
  appendMany(
    search,
    "assignmentState",
    resolved(query.assignmentStates, patch.assignmentStates) ?? [],
  );
  appendMany(
    search,
    "conversionState",
    resolved(query.conversionStates, patch.conversionStates) ?? [],
  );
  appendMany(
    search,
    "followUpState",
    resolved(query.followUpStates, patch.followUpStates) ?? [],
  );
  appendMany(
    search,
    "issueSeverity",
    resolved(query.issueSeverities, patch.issueSeverities) ?? [],
  );

  const serialized = search.toString();
  const fragment: "" | `#${string}` =
    hash === undefined || hash.length === 0
      ? ""
      : `#${hash.replace(/^#/u, "")}`;
  return serialized.length > 0
    ? `${ENGAGEMENT_DASHBOARD_PATH}?${serialized}${fragment}`
    : `${ENGAGEMENT_DASHBOARD_PATH}${fragment}`;
}

export function engagementDashboardResetHref(
  query: EngagementDashboardSearchParams,
): Route {
  const search = new URLSearchParams();
  if (query.tenantId !== undefined) {
    search.set("tenantId", query.tenantId);
  }
  const serialized = search.toString();
  return serialized.length > 0
    ? `${ENGAGEMENT_DASHBOARD_PATH}?${serialized}`
    : ENGAGEMENT_DASHBOARD_PATH;
}

export function engagementDealerDetailHref(
  dealerOrgUnitId: string,
  query: EngagementDashboardSearchParams,
): Route {
  const search = new URLSearchParams();
  search.set("from", query.from);
  search.set("to", query.to);
  if (query.tenantId !== undefined) search.set("tenantId", query.tenantId);
  appendMany(search, "leadSourceId", query.leadSourceIds);
  appendMany(search, "ivrFlowCode", query.ivrFlowCodes);
  appendMany(search, "leadType", query.leadTypes);
  appendMany(search, "status", query.statuses);
  const serialized = search.toString();
  return `${ENGAGEMENT_DASHBOARD_PATH}/dealers/${encodeURIComponent(dealerOrgUnitId)}?${serialized}` as Route;
}

export function engagementLeadDetailHref(
  leadId: string,
  query: EngagementDashboardSearchParams,
): Route {
  const search = new URLSearchParams();
  if (query.tenantId !== undefined) search.set("tenantId", query.tenantId);
  const serialized = search.toString();
  return (
    serialized.length > 0
      ? `${ENGAGEMENT_DASHBOARD_PATH}/leads/${encodeURIComponent(leadId)}?${serialized}`
      : `${ENGAGEMENT_DASHBOARD_PATH}/leads/${encodeURIComponent(leadId)}`
  ) as Route;
}

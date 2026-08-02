// oz-next-app/src/features/engagement/operations-dashboard/utils/engagement-dashboard-url.ts
import type { Route } from "next";

import type {
  EngagementDashboardDealerEngagementState,
  EngagementDashboardDealerSortField,
  EngagementDashboardSearchParams,
  EngagementDashboardSortDirection,
  EngagementIssueCategory,
  EngagementIssueState,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";

export const ENGAGEMENT_DASHBOARD_ROUTES = {
  overview: "/engagement/dashboard",
  dealers: "/engagement/dashboard/dealers",
  issues: "/engagement/dashboard/issues",
  coverage: "/engagement/dashboard/coverage",
  videoSequences: "/engagement/dashboard/configuration/video-sequences",
} as const satisfies Readonly<Record<string, Route>>;

export type EngagementDashboardRoute =
  (typeof ENGAGEMENT_DASHBOARD_ROUTES)[keyof typeof ENGAGEMENT_DASHBOARD_ROUTES];

export type EngagementDashboardPatch = Readonly<{
  from?: string | null;
  to?: string | null;
  comparison?: EngagementDashboardSearchParams["comparison"] | null;
  grain?: EngagementDashboardSearchParams["grain"] | null;
  leadSourceIds?: readonly string[] | null;
  ivrFlowCodes?: readonly string[] | null;
  statuses?: readonly string[] | null;
  dealerOrgUnitIds?: readonly string[] | null;
  districts?: readonly string[] | null;
  cities?: readonly string[] | null;
  assignmentStates?: EngagementDashboardSearchParams["assignmentStates"] | null;
  conversionStates?: EngagementDashboardSearchParams["conversionStates"] | null;
  followUpStates?: EngagementDashboardSearchParams["followUpStates"] | null;
  issueSeverities?: EngagementDashboardSearchParams["issueSeverities"] | null;
  issueCategories?: readonly EngagementIssueCategory[] | null;
  issueStates?: readonly EngagementIssueState[] | null;
  q?: string | null;
  dealerEngagementState?: EngagementDashboardDealerEngagementState | null;
  dealerSortBy?: EngagementDashboardDealerSortField | null;
  dealerSortDirection?: EngagementDashboardSortDirection | null;
  dealerLimit?: 25 | 50 | 100 | null;
  dealerCursor?: string | null;
  leadLimit?: 25 | 50 | 100 | null;
  leadCursor?: string | null;
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

export function engagementWorkspaceHref(
  route: Route,
  query: EngagementDashboardSearchParams,
  patch: EngagementDashboardPatch = {},
): Route {
  const search = new URLSearchParams();
  const from = resolved(query.from, patch.from);
  const to = resolved(query.to, patch.to);
  const comparison = resolved(query.comparison, patch.comparison);
  const grain = resolved(query.grain, patch.grain);
  const q = resolved(query.q, patch.q);
  const dealerEngagementState = resolved(
    query.dealerEngagementState,
    patch.dealerEngagementState,
  );
  const dealerSortBy = resolved(query.dealerSortBy, patch.dealerSortBy);
  const dealerSortDirection = resolved(
    query.dealerSortDirection,
    patch.dealerSortDirection,
  );
  const dealerLimit = resolved(query.dealerLimit, patch.dealerLimit);
  const dealerCursor = resolved(query.dealerCursor, patch.dealerCursor);
  const leadLimit = resolved(query.leadLimit, patch.leadLimit);
  const leadCursor = resolved(query.leadCursor, patch.leadCursor);
  const issueLimit = resolved(query.issueLimit, patch.issueLimit);
  const issueCursor = resolved(query.issueCursor, patch.issueCursor);

  if (from !== null) search.set("from", from);
  if (to !== null) search.set("to", to);
  if (comparison !== null) search.set("comparison", comparison);
  if (grain !== null) search.set("grain", grain);
  if (q !== null && q !== undefined && q.trim().length > 0) {
    search.set("q", q.trim());
  }
  if (dealerEngagementState !== null) {
    search.set("dealerEngagementState", dealerEngagementState);
  }
  if (dealerSortBy !== null) search.set("dealerSortBy", dealerSortBy);
  if (dealerSortDirection !== null) {
    search.set("dealerSortDirection", dealerSortDirection);
  }
  if (dealerLimit !== null) search.set("dealerLimit", String(dealerLimit));
  if (dealerCursor !== null && dealerCursor !== undefined) {
    search.set("dealerCursor", dealerCursor);
  }
  if (leadLimit !== null) search.set("leadLimit", String(leadLimit));
  if (leadCursor !== null && leadCursor !== undefined) {
    search.set("leadCursor", leadCursor);
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
  appendMany(
    search,
    "issueCategory",
    resolved(query.issueCategories, patch.issueCategories) ?? [],
  );
  appendMany(
    search,
    "issueState",
    resolved(query.issueStates, patch.issueStates) ?? [],
  );

  const serialized = search.toString();
  return serialized.length > 0 ? (`${route}?${serialized}` as Route) : route;
}

export function engagementDashboardResetHref(
  route: EngagementDashboardRoute,
): Route {
  return route;
}

export function engagementDealerDetailHref(
  dealerOrgUnitId: string,
  query: EngagementDashboardSearchParams,
): Route {
  const route =
    `${ENGAGEMENT_DASHBOARD_ROUTES.dealers}/${encodeURIComponent(dealerOrgUnitId)}` as Route;
  return engagementWorkspaceHref(route, query, {
    dealerCursor: null,
    leadCursor: null,
    issueCursor: null,
  });
}

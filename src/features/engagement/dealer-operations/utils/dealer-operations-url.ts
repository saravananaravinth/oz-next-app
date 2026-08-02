import type { Route } from "next";

export const DEALER_OPERATIONS_ROUTES = {
  applications: "/engagement/dealership-applications",
  dealers: "/engagement/dealership-applications/dealers",
  directOnboarding: "/engagement/dealership-applications/direct-onboarding",
} as const satisfies Readonly<Record<string, Route>>;

export function dealerOperationDetailHref(dealerOrgUnitId: string): Route {
  return `${DEALER_OPERATIONS_ROUTES.dealers}/${encodeURIComponent(dealerOrgUnitId)}` as Route;
}

export function applicationDetailHref(applicationId: string): Route {
  return `${DEALER_OPERATIONS_ROUTES.applications}/${encodeURIComponent(applicationId)}` as Route;
}

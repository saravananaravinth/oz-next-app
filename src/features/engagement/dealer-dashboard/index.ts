export { resolveDealerDashboardAccess } from "./access";
export type {
  DealerDashboardAccess,
  DealerDashboardCapabilities,
} from "./access";
export { DealerDashboardPage } from "./components/dealer-dashboard-page";
export { SuperAdminDealerContext } from "./components/super-admin-context";
export { readDealerDashboardData } from "./server";
export type { DealerDashboardData } from "./server";
export {
  dealerDashboardContextSchema,
  dealerDashboardSearchParamsSchema,
  type DealerDashboardContext,
  type DealerDashboardSearchParams,
} from "./schemas";

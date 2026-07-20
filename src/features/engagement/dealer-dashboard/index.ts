// oz-next-app/src/features/engagement/dealer-dashboard/index.ts
export { resolveDealerDashboardAccess } from "@/features/engagement/dealer-dashboard/policies/dealer-dashboard.policy";
export type {
  DealerDashboardAccess,
  DealerDashboardCapabilities,
} from "@/features/engagement/dealer-dashboard/policies/dealer-dashboard.policy";
export { DealerDashboardPage } from "@/features/engagement/dealer-dashboard/ui/dealer-dashboard-page";
export { SuperAdminDealerContext } from "@/features/engagement/dealer-dashboard/ui/super-admin-context";
export { readDealerDashboardData } from "@/features/engagement/dealer-dashboard/server/dealer-dashboard.server";
export {
  dealerDashboardContextSchema,
  dealerDashboardSearchParamsSchema,
  type DealerDashboardContext,
  type DealerDashboardData,
  type DealerDashboardSearchParams,
} from "@/features/engagement/dealer-dashboard/contracts/dealer-dashboard.schema";

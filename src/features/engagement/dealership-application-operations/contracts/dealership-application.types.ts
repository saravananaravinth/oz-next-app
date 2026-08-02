// oz-next-app/src/features/engagement/dealership-application-operations/contracts/dealership-application.types.ts
import type { ApiHttpError } from "@/lib/api/problem";

import type {
  DealershipApplicationDashboardSummary,
  DealershipApplicationFilterOptions,
  DealershipApplicationFunnel,
  DealershipApplicationPage,
  DealershipApplicationSourceSeries,
} from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";

export type DealershipApplicationSectionResult<TData> =
  | Readonly<{ status: "ready"; data: TData }>
  | Readonly<{ status: "forbidden" }>
  | Readonly<{ status: "failed"; error: ApiHttpError | null }>;

export type DealershipApplicationDashboardData = Readonly<{
  summary: DealershipApplicationSectionResult<DealershipApplicationDashboardSummary>;
  sourceSeries: DealershipApplicationSectionResult<DealershipApplicationSourceSeries>;
  funnel: DealershipApplicationSectionResult<DealershipApplicationFunnel>;
  applications: DealershipApplicationSectionResult<DealershipApplicationPage>;
  filterOptions: DealershipApplicationSectionResult<DealershipApplicationFilterOptions>;
}>;

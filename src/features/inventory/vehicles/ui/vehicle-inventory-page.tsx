// oz-next-app/src/features/inventory/vehicles/ui/vehicle-inventory-page.tsx
import type { ReactElement } from "react";
import {
  AlertTriangle,
  CarFront,
  Download,
  PackageCheck,
  PackageOpen,
  ShieldAlert,
  ShieldCheck,
  Truck,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentHeader,
  ContentMetricCard,
  ContentMetrics,
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TenantMembership } from "@/lib/api/contracts";
import type { ApiHttpError } from "@/lib/api/problem";

import type {
  ResolvedVehicleInventoryAccess,
  VehicleInventoryAccess,
} from "@/features/inventory/vehicles/policies/vehicle-inventory.policy";
import type {
  VehicleInventorySearchParams,
  VehicleInventoryWorkspaceData,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
import { VehicleInventoryDataQuality } from "@/features/inventory/vehicles/ui/vehicle-inventory-data-quality";
import { VehicleInventoryFilters } from "@/features/inventory/vehicles/ui/vehicle-inventory-filters";
import { VehicleInventoryContextSelector } from "@/features/inventory/vehicles/ui/vehicle-inventory-context-selector";
import {
  VehicleInventoryTable,
  VehicleInventoryTableLegend,
} from "@/features/inventory/vehicles/ui/vehicle-inventory-table";
import {
  vehicleInventoryExportHref,
  vehicleInventoryPageHref,
} from "@/features/inventory/vehicles/utils/vehicle-inventory-url";

function kpiHref(
  query: VehicleInventorySearchParams,
  kpi: VehicleInventorySearchParams["kpi"],
): string {
  return vehicleInventoryPageHref(query, {
    kpi: query.kpi === kpi ? undefined : kpi,
    status: [],
    cursor: undefined,
  });
}

function KpiTooltip({
  children,
  content,
}: Readonly<{
  children: ReactElement;
  content: string;
}>): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="min-w-0">{children}</div>
      </TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}

export function VehicleInventoryPage({
  access,
  query,
  data,
}: Readonly<{
  access: ResolvedVehicleInventoryAccess;
  query: VehicleInventorySearchParams;
  data: VehicleInventoryWorkspaceData;
}>): ReactElement {
  const kpis = data.list.kpis;

  return (
    <ContentRoot width="full" aria-labelledby="vehicle-inventory-title">
      <ContentHeader
        variant="compact"
        title={<span id="vehicle-inventory-title">Vehicle inventory</span>}
        description="Monitor authorized dealer stock, transfer history, commercial readiness, aging, and data quality operational view."
        actions={
          access.capabilities.canExport ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild>
                  <a href={vehicleInventoryExportHref(query)}>
                    <Download aria-hidden="true" className="size-4" />
                    Export CSV
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Export the current authorized scope and active filters.
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button type="button" disabled>
                    <Download aria-hidden="true" className="size-4" />
                    Export unavailable
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Requires report:export permission.
              </TooltipContent>
            </Tooltip>
          )
        }
      />

      {data.cursorReset ? (
        <ContentStatus
          variant="warning"
          icon={<AlertTriangle aria-hidden="true" />}
          title="Pagination restarted"
          description="The previous cursor expired or no longer matched the current sort and filters. The first page has been loaded safely."
        />
      ) : null}

      {!access.capabilities.canExport ? (
        <ContentStatus
          variant="info"
          title="CSV export requires report:export"
          description="Inventory remains available for authorized viewing. The backend will not stream an export without the additional report permission."
        />
      ) : null}

      <ContentMetrics
        aria-label="Inventory KPIs"
        className="grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
      >
        <KpiTooltip content="All authorized current-stock and transfer-history rows in this filtered snapshot.">
          <ContentMetricCard
            href={vehicleInventoryPageHref(query, {
              kpi: undefined,
              status: [],
              cursor: undefined,
            })}
            label="Total"
            value={kpis.total.toLocaleString("en-IN")}
            description="Authorized rows"
            active={query.kpi === undefined}
            ariaLabel={`Total: ${kpis.total.toLocaleString("en-IN")}. Authorized inventory rows.`}
            icon={<CarFront aria-hidden="true" />}
            tone="primary"
          />
        </KpiTooltip>
        <KpiTooltip content="Current unit_stock rows whose authoritative inventory status is ON_HAND.">
          <ContentMetricCard
            href={kpiHref(query, "AVAILABLE")}
            label="Available"
            value={kpis.available.toLocaleString("en-IN")}
            description="On-hand stock"
            active={query.kpi === "AVAILABLE"}
            ariaLabel={`Available: ${kpis.available.toLocaleString("en-IN")}. On-hand stock.`}
            icon={<PackageOpen aria-hidden="true" />}
            tone="success"
          />
        </KpiTooltip>
        <KpiTooltip content="Current unit_stock rows whose authoritative inventory status is RESERVED.">
          <ContentMetricCard
            href={kpiHref(query, "RESERVED")}
            label="Reserved"
            value={kpis.reserved.toLocaleString("en-IN")}
            description="Reserved units"
            active={query.kpi === "RESERVED"}
            ariaLabel={`Reserved: ${kpis.reserved.toLocaleString("en-IN")}. Reserved units.`}
            icon={<PackageCheck aria-hidden="true" />}
            tone="info"
          />
        </KpiTooltip>
        <KpiTooltip content="Latest completed outbound transfer row per unit and sender dealer in the authorized scope.">
          <ContentMetricCard
            href={kpiHref(query, "TRANSFERRED")}
            label="Transferred"
            value={kpis.transferred.toLocaleString("en-IN")}
            description="Transfer history"
            active={query.kpi === "TRANSFERRED"}
            ariaLabel={`Transferred: ${kpis.transferred.toLocaleString("en-IN")}. Transfer history rows.`}
            icon={<Truck aria-hidden="true" />}
            tone="default"
          />
        </KpiTooltip>
        <KpiTooltip content="Current unit_stock rows whose authoritative inventory status is SOLD.">
          <ContentMetricCard
            href={kpiHref(query, "SOLD")}
            label="Sold"
            value={kpis.sold.toLocaleString("en-IN")}
            description="Completed sales"
            active={query.kpi === "SOLD"}
            ariaLabel={`Sold: ${kpis.sold.toLocaleString("en-IN")}. Completed sales.`}
            icon={<PackageCheck aria-hidden="true" />}
            tone="default"
          />
        </KpiTooltip>
        <KpiTooltip content="Current ON_HAND units whose verified arrival age exceeds 30 days.">
          <ContentMetricCard
            href={kpiHref(query, "AGING")}
            label="Aging"
            value={kpis.aging.toLocaleString("en-IN")}
            description="Over 30 days"
            active={query.kpi === "AGING"}
            ariaLabel={`Aging: ${kpis.aging.toLocaleString("en-IN")}. On-hand units over 30 days.`}
            icon={<AlertTriangle aria-hidden="true" />}
            tone="warning"
          />
        </KpiTooltip>
      </ContentMetrics>

      <VehicleInventoryFilters query={query} facets={data.facets} />

      <VehicleInventoryDataQuality
        counts={data.list.dataQuality}
        context={access.context}
        query={query}
        canRemediate={access.capabilities.canRemediateDataQuality}
      />

      <ContentDataSurface
        title="Authorized vehicle stock"
        description="Actor-scoped vehicle rows with resolved catalog, installed-component, location, arrival, and effective price-book context."
        toolbar={<VehicleInventoryTableLegend />}
        padded
      >
        <VehicleInventoryTable data={data} query={query} />
      </ContentDataSurface>
    </ContentRoot>
  );
}

function ContextForm({
  access,
  tenants,
}: Readonly<{
  access: Extract<VehicleInventoryAccess, { kind: "context_required" }>;
  tenants: readonly TenantMembership[];
}>): ReactElement {
  const tenantId = access.actorKind === "ADMIN" ? access.scope.tenantId : null;

  return (
    <ContentRoot width="narrow" aria-labelledby="inventory-context-title">
      <ContentHeader
        eyebrow={
          <Badge variant="secondary">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Explicit actor context
          </Badge>
        }
        title={
          <span id="inventory-context-title">
            Select dealer inventory scope
          </span>
        }
        description="Administrative actors must choose a tenant and dealer organization before inventory is requested. These identifiers are sent only as requested context headers; the API validates authorization and dealer ownership on every call."
      />

      <ContentSection
        title="Authorized context"
        description="Choose an authorized tenant and active dealer organization. The selection is carried in the URL for this workspace and is not stored in browser storage."
      >
        <VehicleInventoryContextSelector
          tenants={tenants}
          lockedTenantId={tenantId}
        />
      </ContentSection>
    </ContentRoot>
  );
}

export function VehicleInventoryAccessState({
  access,
  tenants,
}: Readonly<{
  access: Exclude<VehicleInventoryAccess, ResolvedVehicleInventoryAccess>;
  tenants: readonly TenantMembership[];
}>): ReactElement {
  if (access.kind === "context_required") {
    return <ContextForm access={access} tenants={tenants} />;
  }

  return (
    <ContentRoot width="narrow" aria-labelledby="inventory-forbidden-title">
      <ContentHeader
        eyebrow={
          <Badge variant="destructive">
            <ShieldAlert aria-hidden="true" className="size-3.5" />
            Access restricted
          </Badge>
        }
        title={
          <span id="inventory-forbidden-title">
            Vehicle inventory is unavailable
          </span>
        }
        description="The active actor, role, permission set, or dealer scope does not satisfy the protected inventory policy."
      />
      <ContentStatus
        variant="destructive"
        icon={<ShieldAlert aria-hidden="true" />}
        title="Authorization requirements were not met"
        description={access.reason}
      />
    </ContentRoot>
  );
}

export function VehicleInventoryRequestFailureState({
  error,
}: Readonly<{ error: ApiHttpError }>): ReactElement {
  const title =
    error.status === 403
      ? "Inventory access was denied"
      : error.status === 429
        ? "Inventory request rate limited"
        : error.status >= 500
          ? "Inventory service is unavailable"
          : "Inventory could not be loaded";
  const description =
    error.status === 403
      ? "The backend rejected the selected actor or dealer scope. Verify the active role, permissions, tenant, and dealer organization context."
      : error.status === 429
        ? `The protected inventory rate limit was reached.${error.retryAfterSeconds === undefined ? " Retry shortly." : ` Retry after approximately ${String(error.retryAfterSeconds)} seconds.`}`
        : error.status >= 500
          ? "The edge gateway or private ERP API could not complete the inventory request safely. No inventory data was cached."
          : "The strict inventory contract rejected the request or response. Reset the filters and retry.";

  return (
    <ContentRoot
      width="narrow"
      aria-labelledby="inventory-request-failure-title"
    >
      <ContentHeader
        eyebrow={<Badge variant="destructive">Request failed</Badge>}
        title={<span id="inventory-request-failure-title">{title}</span>}
        description="The inventory workspace did not receive a usable response."
      />
      <ContentStatus
        variant="destructive"
        icon={<AlertTriangle aria-hidden="true" />}
        title={error.code}
        description={
          <>
            <span>{description}</span>
            {error.requestId === undefined ? null : (
              <span className="mt-2 block text-caption">
                Reference: <code>{error.requestId}</code>
              </span>
            )}
          </>
        }
        actions={
          <Button variant="outline" asChild>
            <a href="/inventory/vehicles">Reset inventory request</a>
          </Button>
        }
      />
    </ContentRoot>
  );
}

export function VehicleInventoryInvalidQueryState({
  issues,
}: Readonly<{
  issues: ReadonlyArray<
    Readonly<{
      path: readonly PropertyKey[];
      message: string;
    }>
  >;
}>): ReactElement {
  return (
    <ContentRoot width="narrow" aria-labelledby="inventory-query-error-title">
      <ContentHeader
        eyebrow={<Badge variant="destructive">Invalid request</Badge>}
        title={
          <span id="inventory-query-error-title">
            Inventory filters could not be applied
          </span>
        }
        description="One or more URL parameters did not match the strict vehicle inventory contract. No inventory request was sent."
      />
      <ContentStatus
        variant="destructive"
        icon={<AlertTriangle aria-hidden="true" />}
        title="Correct the inventory request"
        description={
          <ul className="list-disc space-y-1 pl-5">
            {issues.slice(0, 8).map((issue, index) => (
              <li key={`${issue.path.join(".")}-${String(index)}`}>
                {issue.path.length > 0 ? `${issue.path.join(".")}: ` : ""}
                {issue.message}
              </li>
            ))}
          </ul>
        }
        actions={
          <Button variant="outline" asChild>
            <a href="/inventory/vehicles">Reset request</a>
          </Button>
        }
      />
    </ContentRoot>
  );
}

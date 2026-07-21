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
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TenantMembership } from "@/lib/api/contracts";
import type { ApiHttpError } from "@/lib/api/problem";
import { cn } from "@/lib/utils";

import type {
  ResolvedVehicleInventoryAccess,
  VehicleInventoryAccess,
} from "@/features/inventory/vehicles/policies/vehicle-inventory.policy";
import type {
  VehicleInventorySearchParams,
  VehicleInventoryWorkspaceData,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
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

const QUALITY_COUNT_LABELS = [
  ["Missing variant", "missingVariant"],
  ["Unknown arrival", "unknownArrivalDate"],
  ["Status mismatch", "statusMismatch"],
  ["Model mismatch", "metadataVariantModelMismatch"],
  ["Missing MRP", "missingMrp"],
  ["Missing tax", "missingTaxConfiguration"],
  ["Inactive store", "inactiveStore"],
] as const;

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

function KpiLink({
  href,
  label,
  value,
  description,
  active,
  icon,
}: Readonly<{
  href: string;
  label: string;
  value: number;
  description: string;
  active: boolean;
  icon: ReactElement;
}>): ReactElement {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={`${label}: ${value.toLocaleString("en-IN")}. ${description}`}
      className="group min-w-0 rounded-3xl outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
    >
      <Card
        className={cn(
          "relative h-full overflow-hidden border-border/75 bg-card/90 py-0 shadow-sm shadow-foreground/5 transition-[border-color,background-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none",
          active && "border-primary/40 bg-primary/[0.055] shadow-primary/10",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 top-0 h-0.5 bg-transparent",
            active && "bg-primary",
          )}
        />
        <CardContent className="grid gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-caption font-medium uppercase tracking-[0.08em] text-muted-readable">
              {label}
            </span>
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-xl bg-muted/70 text-muted-readable transition-colors group-hover:bg-primary/10 group-hover:text-primary motion-reduce:transition-none [&_svg]:size-4",
                active && "bg-primary/12 text-primary",
              )}
            >
              {icon}
            </span>
          </div>
          <div className="grid gap-0.5">
            <strong className="text-tabular text-2xl leading-none font-semibold tracking-tight text-foreground">
              {value.toLocaleString("en-IN")}
            </strong>
            <span className="truncate text-caption text-muted-readable">
              {description}
            </span>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

function DataQualitySummary({
  data,
}: Readonly<{ data: VehicleInventoryWorkspaceData }>): ReactElement | null {
  const counts = data.list.dataQuality;
  const total = QUALITY_COUNT_LABELS.reduce(
    (sum, [, key]) => sum + counts[key],
    0,
  );

  if (total === 0) {
    return null;
  }

  return (
    <ContentStatus
      variant="warning"
      icon={<AlertTriangle aria-hidden="true" />}
      title={`${total.toLocaleString("en-IN")} data-quality warning${total === 1 ? "" : "s"}`}
      description={
        <span className="flex flex-wrap gap-2">
          {QUALITY_COUNT_LABELS.filter(([, key]) => counts[key] > 0).map(
            ([label, key]) => (
              <Badge key={key} variant="outline">
                {label}: {counts[key].toLocaleString("en-IN")}
              </Badge>
            ),
          )}
        </span>
      }
    />
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
        title={<span id="vehicle-inventory-title">Vehicle inventory</span>}
        actions={
          access.capabilities.canExport ? (
            <Button asChild>
              <a href={vehicleInventoryExportHref(query)}>
                <Download aria-hidden="true" className="size-4" />
                Export CSV
              </a>
            </Button>
          ) : (
            <Button type="button" disabled>
              <Download aria-hidden="true" className="size-4" />
              Export unavailable
            </Button>
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

      <section
        aria-label="Inventory KPIs"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
      >
        <KpiLink
          href={vehicleInventoryPageHref(query, {
            kpi: undefined,
            status: [],
            cursor: undefined,
          })}
          label="Total"
          value={kpis.total}
          description="Authorized rows"
          active={query.kpi === undefined}
          icon={<CarFront aria-hidden="true" />}
        />
        <KpiLink
          href={kpiHref(query, "AVAILABLE")}
          label="Available"
          value={kpis.available}
          description="On-hand stock"
          active={query.kpi === "AVAILABLE"}
          icon={<PackageOpen aria-hidden="true" />}
        />
        <KpiLink
          href={kpiHref(query, "RESERVED")}
          label="Reserved"
          value={kpis.reserved}
          description="Reserved units"
          active={query.kpi === "RESERVED"}
          icon={<PackageCheck aria-hidden="true" />}
        />
        <KpiLink
          href={kpiHref(query, "TRANSFERRED")}
          label="Transferred"
          value={kpis.transferred}
          description="Transfer history"
          active={query.kpi === "TRANSFERRED"}
          icon={<Truck aria-hidden="true" />}
        />
        <KpiLink
          href={kpiHref(query, "SOLD")}
          label="Sold"
          value={kpis.sold}
          description="Completed sales"
          active={query.kpi === "SOLD"}
          icon={<PackageCheck aria-hidden="true" />}
        />
        <KpiLink
          href={kpiHref(query, "AGING")}
          label="Aging"
          value={kpis.aging}
          description="Over 30 days"
          active={query.kpi === "AGING"}
          icon={<AlertTriangle aria-hidden="true" />}
        />
      </section>

      <VehicleInventoryFilters query={query} facets={data.facets} />

      <DataQualitySummary data={data} />

      <ContentDataSurface
        title="Authorized vehicle stock"
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

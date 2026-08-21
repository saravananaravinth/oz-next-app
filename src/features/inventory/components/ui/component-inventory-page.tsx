// oz-next-app/src/features/inventory/components/ui/component-inventory-page.tsx
import type { ComponentProps, ReactElement } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Boxes,
  CircleSlash2,
  PackageCheck,
  PackageOpen,
  ShieldAlert,
  Truck,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentHeader,
  ContentMetricCard,
  ContentMetrics,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ApiHttpError } from "@/lib/api/problem";

import type {
  ComponentInventorySearchParams,
  ComponentInventoryWorkspaceData,
  ComponentOperationalState,
} from "@/features/inventory/components/contracts/component-inventory.schema";
import type {
  ComponentInventoryAccess,
  ResolvedComponentInventoryAccess,
} from "@/features/inventory/components/policies/component-inventory.policy";
import { ComponentInventoryFilters } from "@/features/inventory/components/ui/component-inventory-filters";
import { ComponentInventoryTable } from "@/features/inventory/components/ui/component-inventory-table";
import { componentInventoryPageHref } from "@/features/inventory/components/utils/component-inventory-url";

const KPI_CARD_CLASS_NAME =
  "[&_[data-slot=content-metric-card-value]]:text-[clamp(1.5rem,1.65vw,1.875rem)]";

type MetricTone = NonNullable<ComponentProps<typeof ContentMetricCard>["tone"]>;

function operationalStateCount(
  data: ComponentInventoryWorkspaceData,
  state: ComponentOperationalState,
): number {
  return (
    data.overview.operationalStates.find((facet) => facet.state === state)
      ?.count ?? 0
  );
}

function scopeOperationalStateHref(
  query: ComponentInventorySearchParams,
  state: ComponentOperationalState,
): ReturnType<typeof componentInventoryPageHref> {
  return componentInventoryPageHref(query, {
    q: undefined,
    focusComponentInventoryId: undefined,
    state: undefined,
    operationalState: state,
    includeAllStates: false,
    componentType: undefined,
    componentId: undefined,
    cursor: undefined,
  });
}

function isOperationalStateKpiActive(
  query: ComponentInventorySearchParams,
  state: ComponentOperationalState,
): boolean {
  return query.operationalState === state && query.state === undefined;
}

function KpiTooltip({
  children,
  content,
  operationalStateAvailable,
}: Readonly<{
  children: ReactElement;
  content: string;
  operationalStateAvailable: boolean;
}>): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="h-full min-w-0">{children}</div>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <span className="grid gap-1">
          <span>{content}</span>
          <span className="text-muted-readable">
            {operationalStateAvailable
              ? "For attached components, this status is inherited from the authoritative vehicle inventory status. Physical custody remains a separate field."
              : "Vehicle-derived component status is unavailable until the upgraded component API is active."}
          </span>
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

function OperationalKpi({
  data,
  query,
  state,
  label,
  description,
  icon,
  tone,
}: Readonly<{
  data: ComponentInventoryWorkspaceData;
  query: ComponentInventorySearchParams;
  state: ComponentOperationalState;
  label: string;
  description: string;
  icon: ReactElement;
  tone: MetricTone;
}>): ReactElement {
  const available = data.overview.operationalStateAvailable;
  const count = operationalStateCount(data, state);
  const active = available && isOperationalStateKpiActive(query, state);

  return (
    <KpiTooltip content={description} operationalStateAvailable={available}>
      <ContentMetricCard
        {...(available
          ? { href: scopeOperationalStateHref(query, state) }
          : {})}
        label={label}
        value={available ? count.toLocaleString("en-IN") : "—"}
        className={KPI_CARD_CLASS_NAME}
        active={active}
        ariaLabel={
          available
            ? `${label}: ${count.toLocaleString("en-IN")} components in the selected authorized scope.`
            : `${label}: vehicle-derived component status is not available from the current API revision.`
        }
        icon={icon}
        presentation="dashboard"
        tone={tone}
      />
    </KpiTooltip>
  );
}

export function ComponentInventoryPage({
  access,
  query,
  data,
}: Readonly<{
  access: ResolvedComponentInventoryAccess;
  query: ComponentInventorySearchParams;
  data: ComponentInventoryWorkspaceData;
}>): ReactElement {
  return (
    <ContentRoot
      width="full"
      aria-labelledby="component-inventory-title"
      className="lg:h-full lg:min-h-0 lg:overflow-hidden"
    >
      <ComponentInventoryFilters query={query} data={data} access={access} />

      <ContentMetrics
        aria-label="Component operational status summary"
        className="!grid-cols-[repeat(6,minmax(10rem,1fr))] gap-3 overflow-x-auto overscroll-x-contain pb-1"
      >
        <OperationalKpi
          data={data}
          query={query}
          state="AVAILABLE"
          label="Available"
          description="Components operationally available for authorized use. Attached components inherit Available when their vehicle inventory status is Available or On hand."
          icon={<PackageOpen aria-hidden="true" />}
          tone="success"
        />
        <OperationalKpi
          data={data}
          query={query}
          state="RESERVED"
          label="Reserved"
          description="Components reserved directly or attached to a vehicle whose authoritative inventory status is Reserved."
          icon={<PackageCheck aria-hidden="true" />}
          tone="info"
        />
        <OperationalKpi
          data={data}
          query={query}
          state="IN_TRANSIT"
          label="In transit"
          description="Components in component transfer or attached to vehicles currently moving through an in-transit or shipment workflow."
          icon={<Truck aria-hidden="true" />}
          tone="default"
        />
        <OperationalKpi
          data={data}
          query={query}
          state="QUARANTINED"
          label="Quarantined"
          description="Components quarantined directly, or attached to vehicles in inward-pending, production, QC, built, or quarantined stages."
          icon={<ShieldAlert aria-hidden="true" />}
          tone="warning"
        />
        <OperationalKpi
          data={data}
          query={query}
          state="SOLD"
          label="Sold"
          description="Components still attached to sold vehicles. Attach and replacement mutations on sold vehicles are restricted to administrators by the API."
          icon={<BadgeCheck aria-hidden="true" />}
          tone="default"
        />
        <OperationalKpi
          data={data}
          query={query}
          state="UNLOCATED"
          label="Unlocated"
          description="Components whose authoritative physical custody location cannot be verified."
          icon={<CircleSlash2 aria-hidden="true" />}
          tone="destructive"
        />
      </ContentMetrics>

      <ContentDataSurface
        padded
        className="min-h-[28rem] lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
        contentClassName="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
      >
        <ComponentInventoryTable data={data} query={query} access={access} />
      </ContentDataSurface>
    </ContentRoot>
  );
}

export function ComponentInventoryAccessState({
  access,
}: Readonly<{
  access: Exclude<ComponentInventoryAccess, ResolvedComponentInventoryAccess>;
}>): ReactElement {
  if (access.kind === "context_required") {
    return (
      <ContentRoot width="narrow" aria-labelledby="component-context-title">
        <ContentHeader
          eyebrow={<Badge variant="info">Tenant context required</Badge>}
          title={
            <span id="component-context-title">
              Select a tenant in the application header
            </span>
          }
          description="Component inventory follows the globally selected tenant. Super administrators must select an explicit tenant in the header before any component data is requested."
        />
        <ContentStatus
          variant="warning"
          icon={<Boxes aria-hidden="true" />}
          title="No component tenant is selected"
          description="Use the tenant selector in the global application header, then reopen or refresh Component inventory. This page intentionally does not maintain a second tenant selection."
        />
      </ContentRoot>
    );
  }

  return (
    <ContentRoot width="narrow" aria-labelledby="component-forbidden-title">
      <ContentHeader
        eyebrow={
          <Badge variant="destructive">
            <ShieldAlert aria-hidden="true" className="size-3.5" />
            Access restricted
          </Badge>
        }
        title={
          <span id="component-forbidden-title">
            Component inventory is unavailable
          </span>
        }
        description="Your current actor does not have access to this component inventory workspace."
      />
      <ContentStatus
        variant="destructive"
        icon={<ShieldAlert aria-hidden="true" />}
        title="Check component inventory access"
        description={
          <>
            <span>
              Confirm the actor has inventory:component:read and the required
              tenant, organization-unit, or dealer scope.
            </span>
            <span className="mt-2 block">
              If this workspace should be available, contact your ERP
              administrator and share this detail: {access.reason}
            </span>
          </>
        }
      />
    </ContentRoot>
  );
}

export function ComponentInventoryRequestFailureState({
  error,
}: Readonly<{ error: ApiHttpError }>): ReactElement {
  const title =
    error.status === 403
      ? "Component inventory access was denied"
      : error.status === 429
        ? "Component inventory request rate limited"
        : error.status >= 500
          ? "Component inventory service is unavailable"
          : "Component inventory could not be loaded";
  const description =
    error.status === 403
      ? "The backend rejected this actor or inventory scope. Verify permission and actor context before retrying."
      : error.status === 429
        ? `The protected component rate limit was reached.${error.retryAfterSeconds === undefined ? " Retry shortly." : ` Retry after approximately ${String(error.retryAfterSeconds)} seconds.`}`
        : error.status >= 500
          ? "The component service could not complete the request. Retry once. If it still fails, share the reference below with ERP support."
          : "One or more component filters or page parameters are invalid or no longer supported. Reset the request and try again.";

  return (
    <ContentRoot
      width="narrow"
      aria-labelledby="component-request-failure-title"
    >
      <ContentHeader
        eyebrow={<Badge variant="destructive">Request failed</Badge>}
        title={<span id="component-request-failure-title">{title}</span>}
        description="The page stopped instead of displaying incomplete or incorrectly scoped component data."
      />
      <ContentStatus
        variant="destructive"
        icon={<AlertTriangle aria-hidden="true" />}
        title="What you can do"
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
            <a href="/inventory/components">Reset component request</a>
          </Button>
        }
      />
    </ContentRoot>
  );
}

export function ComponentInventoryInvalidQueryState({
  issues,
}: Readonly<{
  issues: ReadonlyArray<
    Readonly<{ path: readonly PropertyKey[]; message: string }>
  >;
}>): ReactElement {
  return (
    <ContentRoot width="narrow" aria-labelledby="component-query-error-title">
      <ContentHeader
        eyebrow={<Badge variant="destructive">Invalid request</Badge>}
        title={
          <span id="component-query-error-title">
            Component filters could not be applied
          </span>
        }
        description="One or more values in this component inventory link are invalid or unsupported. No component inventory request was sent."
      />
      <ContentStatus
        variant="destructive"
        icon={<AlertTriangle aria-hidden="true" />}
        title="Reset the invalid filters"
        description={
          <>
            <span>
              Return to the default All status view, then apply the filters
              again.
            </span>
            {issues.length === 0 ? null : (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {issues.slice(0, 4).map((issue, index) => (
                  <li key={`${issue.path.join(".")}-${String(index)}`}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </>
        }
        actions={
          <Button variant="outline" asChild>
            <a href="/inventory/components">Reset request</a>
          </Button>
        }
      />
    </ContentRoot>
  );
}

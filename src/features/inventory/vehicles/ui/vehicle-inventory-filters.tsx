// oz-next-app/src/features/inventory/vehicles/ui/vehicle-inventory-filters.tsx
import type { ReactElement, ReactNode } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Filter,
  Layers3,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import {
  VEHICLE_INVENTORY_DATA_QUALITY_FLAGS,
  VEHICLE_INVENTORY_SORT_DIRECTIONS,
  VEHICLE_INVENTORY_SORT_FIELDS,
  type VehicleInventoryFacetOption,
  type VehicleInventoryFacetsResult,
  type VehicleInventorySearchParams,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
import { vehicleInventoryResetHref } from "@/features/inventory/vehicles/utils/vehicle-inventory-url";

const INVENTORY_PAGE_PATH = "/inventory/vehicles";
const MAX_RENDERED_FACET_OPTIONS = 200;
const CONTROL_CLASS_NAME =
  "h-11 w-full rounded-2xl border border-input bg-background px-3 text-body-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";

const SORT_LABELS: Readonly<Record<string, string>> = {
  VIN: "VIN",
  MODEL: "Model",
  VARIANT: "Variant",
  STATUS: "Status",
  ORG_UNIT: "Organization unit",
  MRP: "MRP",
  ARRIVAL_DATE: "Arrival date",
  AGE: "Vehicle age",
  TRANSFER_DATE: "Transfer date",
  LAST_UPDATE: "Last updated",
};

const QUALITY_LABELS: Readonly<Record<string, string>> = {
  MISSING_VARIANT: "Missing variant",
  UNKNOWN_ARRIVAL_DATE: "Unknown arrival date",
  STATUS_MISMATCH: "Status mismatch",
  METADATA_VARIANT_MODEL_MISMATCH: "Model metadata mismatch",
  MISSING_MRP: "Missing MRP",
  MISSING_TAX_CONFIGURATION: "Missing tax configuration",
  INACTIVE_STORE: "Inactive store",
};

function ContextHiddenFields({
  query,
}: Readonly<{ query: VehicleInventorySearchParams }>): ReactElement {
  return (
    <>
      {query.tenantId === undefined ? null : (
        <input type="hidden" name="tenantId" value={query.tenantId} />
      )}
      {query.dealerOrgUnitId === undefined ? null : (
        <input
          type="hidden"
          name="dealerOrgUnitId"
          value={query.dealerOrgUnitId}
        />
      )}
      <input type="hidden" name="scopeSubmitted" value="true" />
      <input type="hidden" name="limit" value={String(query.limit)} />
    </>
  );
}

function HiddenArrayFields({
  name,
  values,
}: Readonly<{ name: string; values: readonly string[] }>): ReactElement {
  return (
    <>
      {values.map((value) => (
        <input
          key={`${name}-${value}`}
          type="hidden"
          name={name}
          value={value}
        />
      ))}
    </>
  );
}

function AdvancedFilterHiddenFields({
  query,
}: Readonly<{ query: VehicleInventorySearchParams }>): ReactElement {
  return (
    <>
      <HiddenArrayFields name="status" values={query.status} />
      <HiddenArrayFields name="entryType" values={query.entryType} />
      <HiddenArrayFields name="orgUnitId" values={query.orgUnitId} />
      <HiddenArrayFields name="storeId" values={query.storeId} />
      <HiddenArrayFields name="modelId" values={query.modelId} />
      <HiddenArrayFields name="variantId" values={query.variantId} />
      <HiddenArrayFields name="fuel" values={query.fuel} />
      <HiddenArrayFields name="segment" values={query.segment} />
      <HiddenArrayFields name="color" values={query.color} />
      <HiddenArrayFields name="ageBucket" values={query.ageBucket} />
      <HiddenArrayFields name="warning" values={query.warning} />
      {query.metallic === undefined ? null : (
        <input type="hidden" name="metallic" value={String(query.metallic)} />
      )}
      {query.registrationRequired === undefined ? null : (
        <input
          type="hidden"
          name="registrationRequired"
          value={String(query.registrationRequired)}
        />
      )}
      {query.mrpMin === undefined ? null : (
        <input type="hidden" name="mrpMin" value={String(query.mrpMin)} />
      )}
      {query.mrpMax === undefined ? null : (
        <input type="hidden" name="mrpMax" value={String(query.mrpMax)} />
      )}
      {query.arrivalFrom === undefined ? null : (
        <input type="hidden" name="arrivalFrom" value={query.arrivalFrom} />
      )}
      {query.arrivalTo === undefined ? null : (
        <input type="hidden" name="arrivalTo" value={query.arrivalTo} />
      )}
      {query.transferFrom === undefined ? null : (
        <input type="hidden" name="transferFrom" value={query.transferFrom} />
      )}
      {query.transferTo === undefined ? null : (
        <input type="hidden" name="transferTo" value={query.transferTo} />
      )}
      {query.kpi === undefined ? null : (
        <input type="hidden" name="kpi" value={query.kpi} />
      )}
    </>
  );
}

function QuickFilterHiddenFields({
  query,
}: Readonly<{ query: VehicleInventorySearchParams }>): ReactElement {
  return (
    <>
      {query.q === undefined ? null : (
        <input type="hidden" name="q" value={query.q} />
      )}
      <input type="hidden" name="sortBy" value={query.sortBy} />
      <input type="hidden" name="sortDirection" value={query.sortDirection} />
      {query.includeMyStock ? (
        <input type="hidden" name="includeMyStock" value="true" />
      ) : null}
      {query.includeSubDealerStock ? (
        <input type="hidden" name="includeSubDealerStock" value="true" />
      ) : null}
    </>
  );
}

function FieldShell({
  label,
  hint,
  children,
}: Readonly<{
  label: string;
  hint?: string;
  children: ReactNode;
}>): ReactElement {
  return (
    <label className="grid min-w-0 gap-1.5 text-body-sm">
      <span className="text-foreground">{label}</span>
      {children}
      {hint === undefined ? null : (
        <span className="text-caption text-muted-readable">{hint}</span>
      )}
    </label>
  );
}

function FacetCheckboxGroup({
  label,
  name,
  options,
  selected,
}: Readonly<{
  label: string;
  name: string;
  options: readonly VehicleInventoryFacetOption[];
  selected: readonly string[];
}>): ReactElement {
  const selectedValues = new Set(selected);
  const rendered = options.slice(0, MAX_RENDERED_FACET_OPTIONS);
  const truncated = options.length > rendered.length;

  return (
    <fieldset className="grid min-w-0 gap-2 rounded-2xl border border-border/70 bg-background/65 p-3">
      <legend className="px-1 text-body-sm text-foreground">{label}</legend>
      {rendered.length === 0 ? (
        <p className="text-caption text-muted-readable">
          No authorized options are available.
        </p>
      ) : (
        <div className="max-h-52 space-y-1 overflow-y-auto overscroll-contain pr-1">
          {rendered.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-body-sm transition-colors hover:bg-muted/60 motion-reduce:transition-none",
                option.active === false && "opacity-60",
              )}
            >
              <input
                type="checkbox"
                name={name}
                value={option.value}
                defaultChecked={selectedValues.has(option.value)}
                className="size-4 rounded border-input accent-primary"
              />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              <span className="text-tabular text-caption text-muted-readable">
                {option.count.toLocaleString("en-IN")}
              </span>
            </label>
          ))}
        </div>
      )}
      {truncated ? (
        <p className="text-caption text-muted-readable">
          Showing the first {String(MAX_RENDERED_FACET_OPTIONS)} authorized
          options. Narrow another filter to refine the list.
        </p>
      ) : null}
    </fieldset>
  );
}

function StaticCheckboxGroup({
  label,
  name,
  options,
  selected,
}: Readonly<{
  label: string;
  name: string;
  options: ReadonlyArray<Readonly<{ value: string; label: string }>>;
  selected: readonly string[];
}>): ReactElement {
  const selectedValues = new Set(selected);

  return (
    <fieldset className="grid gap-2 rounded-2xl border border-border/70 bg-background/65 p-3">
      <legend className="px-1 text-body-sm text-foreground">{label}</legend>
      <div className="grid gap-1 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-body-sm transition-colors hover:bg-muted/60 motion-reduce:transition-none"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selectedValues.has(option.value)}
              className="size-4 rounded border-input accent-primary"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TriStateSelect({
  label,
  name,
  value,
  trueLabel,
  falseLabel,
}: Readonly<{
  label: string;
  name: string;
  value: boolean | undefined;
  trueLabel: string;
  falseLabel: string;
}>): ReactElement {
  return (
    <FieldShell label={label}>
      <select
        name={name}
        defaultValue={value === undefined ? "" : String(value)}
        className={CONTROL_CLASS_NAME}
      >
        <option value="">Any</option>
        <option value="true">{trueLabel}</option>
        <option value="false">{falseLabel}</option>
      </select>
    </FieldShell>
  );
}

function advancedFilterCount(query: VehicleInventorySearchParams): number {
  return [
    query.status.length > 0,
    query.entryType.length > 0,
    query.orgUnitId.length > 0,
    query.storeId.length > 0,
    query.modelId.length > 0,
    query.variantId.length > 0,
    query.fuel.length > 0,
    query.segment.length > 0,
    query.color.length > 0,
    query.metallic !== undefined,
    query.registrationRequired !== undefined,
    query.mrpMin !== undefined,
    query.mrpMax !== undefined,
    query.arrivalFrom !== undefined,
    query.arrivalTo !== undefined,
    query.transferFrom !== undefined,
    query.transferTo !== undefined,
    query.ageBucket.length > 0,
    query.warning.length > 0,
  ].filter(Boolean).length;
}

function InventoryScopeControls({
  query,
  canIncludeSubDealerStock,
}: Readonly<{
  query: VehicleInventorySearchParams;
  canIncludeSubDealerStock: boolean;
}>): ReactElement {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="text-body-sm text-foreground">Inventory scope</legend>
      <div className="flex min-h-11 flex-wrap items-center gap-1 rounded-2xl border border-input bg-background p-1 shadow-xs">
        <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-xl px-3 text-body-sm transition-colors has-[:checked]:bg-primary has-[:checked]:text-primary-foreground hover:bg-muted motion-reduce:transition-none">
          <input
            type="checkbox"
            name="includeMyStock"
            value="true"
            defaultChecked={query.includeMyStock}
            className="sr-only"
          />
          <Layers3 aria-hidden="true" className="size-4" />
          My stock
        </label>
        <label
          className={cn(
            "flex min-h-9 items-center gap-2 rounded-xl px-3 text-body-sm transition-colors has-[:checked]:bg-primary has-[:checked]:text-primary-foreground hover:bg-muted motion-reduce:transition-none",
            canIncludeSubDealerStock
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-50",
          )}
        >
          <input
            type="checkbox"
            name="includeSubDealerStock"
            value="true"
            defaultChecked={query.includeSubDealerStock}
            disabled={!canIncludeSubDealerStock}
            className="sr-only"
          />
          <Layers3 aria-hidden="true" className="size-4" />
          Sub-dealers
        </label>
      </div>
    </fieldset>
  );
}

function AdvancedFiltersDialog({
  query,
  facets,
  filterCount,
}: Readonly<{
  query: VehicleInventorySearchParams;
  facets: VehicleInventoryFacetsResult;
  filterCount: number;
}>): ReactElement {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="relative">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Filters
          {filterCount > 0 ? (
            <Badge variant="secondary" className="ml-1 min-w-6 justify-center">
              {String(filterCount)}
            </Badge>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter aria-hidden="true" className="size-5 text-muted-readable" />
            Inventory filters
          </DialogTitle>
          <DialogDescription>
            Refine authorized inventory using bounded server-side filters.
            Applying this dialog clears any active KPI shortcut to avoid
            conflicting status criteria.
          </DialogDescription>
        </DialogHeader>

        <form
          id="vehicle-inventory-advanced-filters"
          action={INVENTORY_PAGE_PATH}
          method="get"
          className="min-h-0 overflow-y-auto overscroll-contain pr-1"
        >
          <ContextHiddenFields query={query} />
          <QuickFilterHiddenFields query={query} />

          <div className="grid gap-5 pb-2">
            <section
              className="grid gap-3"
              aria-labelledby="inventory-state-filters"
            >
              <div>
                <h3 id="inventory-state-filters" className="text-card-title">
                  Stock state
                </h3>
                <p className="text-caption text-muted-readable">
                  Select one or more values without keyboard modifier keys.
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <FacetCheckboxGroup
                  label="Status"
                  name="status"
                  options={facets.statuses}
                  selected={query.status}
                />
                <FacetCheckboxGroup
                  label="Entry type"
                  name="entryType"
                  options={facets.entryTypes}
                  selected={query.entryType}
                />
                <FacetCheckboxGroup
                  label="Age bucket"
                  name="ageBucket"
                  options={facets.ageBuckets}
                  selected={query.ageBucket}
                />
              </div>
            </section>

            <Separator />

            <section
              className="grid gap-3"
              aria-labelledby="inventory-product-filters"
            >
              <div>
                <h3 id="inventory-product-filters" className="text-card-title">
                  Product configuration
                </h3>
                <p className="text-caption text-muted-readable">
                  Filter by resolved catalog and vehicle metadata.
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                <FacetCheckboxGroup
                  label="Models"
                  name="modelId"
                  options={facets.models}
                  selected={query.modelId}
                />
                <FacetCheckboxGroup
                  label="Variants"
                  name="variantId"
                  options={facets.variants}
                  selected={query.variantId}
                />
                <FacetCheckboxGroup
                  label="Colors"
                  name="color"
                  options={facets.colors}
                  selected={query.color}
                />
                <FacetCheckboxGroup
                  label="Fuel"
                  name="fuel"
                  options={facets.fuels}
                  selected={query.fuel}
                />
                <FacetCheckboxGroup
                  label="Segment"
                  name="segment"
                  options={facets.segments}
                  selected={query.segment}
                />
                <div className="grid content-start gap-3 rounded-2xl border border-border/70 bg-background/65 p-3">
                  <TriStateSelect
                    label="Finish"
                    name="metallic"
                    value={query.metallic}
                    trueLabel="Metallic"
                    falseLabel="Matt"
                  />
                  <TriStateSelect
                    label="Registration"
                    name="registrationRequired"
                    value={query.registrationRequired}
                    trueLabel="Required"
                    falseLabel="Not required"
                  />
                </div>
              </div>
            </section>

            <Separator />

            <section
              className="grid gap-3"
              aria-labelledby="inventory-location-filters"
            >
              <div>
                <h3 id="inventory-location-filters" className="text-card-title">
                  Location and commercial
                </h3>
                <p className="text-caption text-muted-readable">
                  Narrow organization, store, price, and lifecycle dates.
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <FacetCheckboxGroup
                  label="Organization units"
                  name="orgUnitId"
                  options={facets.orgUnits}
                  selected={query.orgUnitId}
                />
                <FacetCheckboxGroup
                  label="Stores"
                  name="storeId"
                  options={facets.stores}
                  selected={query.storeId}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FieldShell
                  label="Minimum MRP"
                  hint={
                    facets.mrp.minimum === null
                      ? "No configured price minimum"
                      : `Available from ${facets.mrp.minimum.toLocaleString("en-IN")}`
                  }
                >
                  <Input
                    type="number"
                    name="mrpMin"
                    min={0}
                    step="0.01"
                    defaultValue={query.mrpMin}
                    inputMode="decimal"
                  />
                </FieldShell>
                <FieldShell
                  label="Maximum MRP"
                  hint={
                    facets.mrp.maximum === null
                      ? "No configured price maximum"
                      : `Available to ${facets.mrp.maximum.toLocaleString("en-IN")}`
                  }
                >
                  <Input
                    type="number"
                    name="mrpMax"
                    min={0}
                    step="0.01"
                    defaultValue={query.mrpMax}
                    inputMode="decimal"
                  />
                </FieldShell>
                <FieldShell label="Arrival from">
                  <Input
                    type="date"
                    name="arrivalFrom"
                    defaultValue={query.arrivalFrom}
                  />
                </FieldShell>
                <FieldShell label="Arrival to">
                  <Input
                    type="date"
                    name="arrivalTo"
                    defaultValue={query.arrivalTo}
                  />
                </FieldShell>
                <FieldShell label="Transfer from">
                  <Input
                    type="date"
                    name="transferFrom"
                    defaultValue={query.transferFrom}
                  />
                </FieldShell>
                <FieldShell label="Transfer to">
                  <Input
                    type="date"
                    name="transferTo"
                    defaultValue={query.transferTo}
                  />
                </FieldShell>
              </div>
            </section>

            <Separator />

            <section
              className="grid gap-3"
              aria-labelledby="inventory-quality-filters"
            >
              <div>
                <h3 id="inventory-quality-filters" className="text-card-title">
                  Data quality
                </h3>
                <p className="text-caption text-muted-readable">
                  Find records requiring configuration or reconciliation.
                </p>
              </div>
              <StaticCheckboxGroup
                label="Warnings"
                name="warning"
                options={VEHICLE_INVENTORY_DATA_QUALITY_FLAGS.map((value) => ({
                  value,
                  label: QUALITY_LABELS[value] ?? value,
                }))}
                selected={query.warning}
              />
            </section>
          </div>
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button variant="outline" asChild>
            <a href={vehicleInventoryResetHref(query)}>
              <RotateCcw aria-hidden="true" className="size-4" />
              Reset all
            </a>
          </Button>
          <Button type="submit" form="vehicle-inventory-advanced-filters">
            <Filter aria-hidden="true" className="size-4" />
            Apply filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VehicleInventoryFilters({
  query,
  facets,
}: Readonly<{
  query: VehicleInventorySearchParams;
  facets: VehicleInventoryFacetsResult;
}>): ReactElement {
  const filterCount = advancedFilterCount(query);

  return (
    <section
      aria-label="Vehicle inventory controls"
      className="rounded-3xl border border-border/75 bg-card/90 p-4 shadow-sm shadow-foreground/5"
    >
      <form
        action={INVENTORY_PAGE_PATH}
        method="get"
        className="grid items-end gap-3 xl:grid-cols-[minmax(18rem,1.8fr)_minmax(10rem,0.8fr)_minmax(9rem,0.65fr)_minmax(18rem,1.35fr)_auto]"
      >
        <ContextHiddenFields query={query} />
        <AdvancedFilterHiddenFields query={query} />

        <FieldShell label="Search inventory">
          <span className="relative block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-readable"
            />
            <Input
              type="search"
              name="q"
              defaultValue={query.q}
              maxLength={100}
              placeholder="VIN, model, variant or color"
              className="pl-9"
            />
          </span>
        </FieldShell>

        <FieldShell label="Sort field">
          <select
            name="sortBy"
            defaultValue={query.sortBy}
            className={CONTROL_CLASS_NAME}
          >
            {VEHICLE_INVENTORY_SORT_FIELDS.map((value) => (
              <option key={value} value={value}>
                {SORT_LABELS[value] ?? value}
              </option>
            ))}
          </select>
        </FieldShell>

        <FieldShell label="Direction">
          <span className="relative block">
            {query.sortDirection === "ASC" ? (
              <ArrowUpAZ
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-readable"
              />
            ) : (
              <ArrowDownAZ
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-readable"
              />
            )}
            <select
              name="sortDirection"
              defaultValue={query.sortDirection}
              className={cn(CONTROL_CLASS_NAME, "pl-9")}
            >
              {VEHICLE_INVENTORY_SORT_DIRECTIONS.map((value) => (
                <option key={value} value={value}>
                  {value === "ASC" ? "Ascending" : "Descending"}
                </option>
              ))}
            </select>
          </span>
        </FieldShell>

        <InventoryScopeControls
          query={query}
          canIncludeSubDealerStock={facets.scope.canIncludeSubDealerStock}
        />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <AdvancedFiltersDialog
            query={query}
            facets={facets}
            filterCount={filterCount}
          />
          <Button type="submit">
            <Search aria-hidden="true" className="size-4" />
            Apply
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a
              href={vehicleInventoryResetHref(query)}
              aria-label="Reset inventory controls"
              title="Reset inventory controls"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
            </a>
          </Button>
        </div>
      </form>
    </section>
  );
}

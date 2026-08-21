// oz-next-app/src/features/inventory/components/ui/component-inventory-table.tsx
"use client";

import { useMemo, useState, type ReactElement } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Boxes,
  CircleSlash2,
  Clock3,
  Link2,
  MapPin,
  PackageCheck,
  PackageOpen,
  ShieldAlert,
  Truck,
} from "lucide-react";

import {
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentEmptyState,
  ContentList,
  ContentListItem,
  ContentScrollArea,
} from "@/components/common/content-shell";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  type ComponentInventoryItem,
  type ComponentOperationalState,
  type ComponentInventorySearchParams,
  type ComponentInventoryWorkspaceData,
} from "@/features/inventory/components/contracts/component-inventory.schema";
import type { ResolvedComponentInventoryAccess } from "@/features/inventory/components/policies/component-inventory.policy";
import { ComponentInventoryRecordDialog } from "@/features/inventory/components/ui/component-inventory-record-dialog";
import { ComponentReconciliationDialog } from "@/features/inventory/components/ui/component-reconciliation-dialog";
import {
  componentInventoryPageHref,
  componentInventoryResetHref,
} from "@/features/inventory/components/utils/component-inventory-url";
import { currentBatteryConfiguration } from "@/features/inventory/components/utils/component-battery-configuration";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
});
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

type StatePresentation = Readonly<{
  label: string;
  variant: BadgeProps["variant"];
  className?: string;
}>;

const OPERATIONAL_STATE_PRESENTATION: Readonly<
  Record<ComponentOperationalState, StatePresentation>
> = {
  AVAILABLE: { label: "Available", variant: "success" },
  RESERVED: { label: "Reserved", variant: "info" },
  IN_TRANSIT: { label: "In transit", variant: "secondary" },
  ATTACHED: { label: "Attached", variant: "default" },
  QUARANTINED: { label: "Quarantined", variant: "warning" },
  SOLD: { label: "Sold", variant: "outline" },
  RETIRED: {
    label: "Retired",
    variant: "outline",
    className: "text-muted-readable",
  },
  UNLOCATED: { label: "Unlocated", variant: "destructive" },
  OTHER: { label: "Other status", variant: "warning" },
};

function formatDate(value: string): string {
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`));
}

function formatDateTime(value: string): string {
  return DATE_TIME_FORMATTER.format(new Date(value));
}

function humanize(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll("_", " ")
    .replace(/(^|\s)\p{L}/gu, (match) => match.toLocaleUpperCase("en-US"));
}

function sameDisplayValue(left: string, right: string): boolean {
  return (
    left.trim().toLocaleLowerCase("en-US") ===
    right.trim().toLocaleLowerCase("en-US")
  );
}

function textMetadata(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function InventoryHeader({
  count,
  sticky = false,
}: Readonly<{ count: number; sticky?: boolean }>): ReactElement {
  return (
    <div
      className={cn(
        "flex min-h-12 items-center justify-between gap-3 border-b border-border/70 bg-card px-4",
        sticky && "sticky top-0 z-20",
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Boxes
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-readable"
        />
        <span className="truncate text-body-sm font-medium text-foreground">
          Authorized component stock
        </span>
      </div>
      <Badge variant="secondary" className="text-tabular">
        {count.toLocaleString("en-IN")} on page
      </Badge>
    </div>
  );
}

function IntegrityWarning({
  item,
}: Readonly<{ item: ComponentInventoryItem }>): ReactElement | null {
  if (item.integrityWarnings.length === 0) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={`${item.integrityWarnings.length.toLocaleString("en-IN")} integrity warning${item.integrityWarnings.length === 1 ? "" : "s"}`}
          className="inline-flex size-6 items-center justify-center rounded-full bg-warning/10 text-warning-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <AlertTriangle aria-hidden="true" className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {item.integrityWarnings.map(humanize).join(" · ")}
      </TooltipContent>
    </Tooltip>
  );
}

function ComponentIdentity({
  item,
}: Readonly<{ item: ComponentInventoryItem }>): ReactElement {
  const showCode = !sameDisplayValue(item.component.name, item.component.code);

  return (
    <div className="grid min-w-0 gap-1">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="truncate text-body-sm font-medium text-foreground">
          {item.component.name}
        </span>
        <IntegrityWarning item={item} />
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-caption text-muted-readable">
        <Badge variant="outline">{humanize(item.component.type)}</Badge>
        {showCode ? (
          <span className="truncate">{item.component.code}</span>
        ) : null}
      </div>
    </div>
  );
}

function PhysicalIdentity({
  item,
}: Readonly<{ item: ComponentInventoryItem }>): ReactElement {
  const primary =
    item.serialNumber ?? item.lotNumber ?? "Identity not recorded";
  const secondary = [
    item.serialNumber !== null && item.lotNumber !== null
      ? `Lot ${item.lotNumber}`
      : null,
    item.expiryDate === null ? null : `Expires ${formatDate(item.expiryDate)}`,
  ].filter((value): value is string => value !== null);

  return (
    <div className="grid min-w-0 gap-1">
      <span
        className={cn(
          "truncate text-body-sm text-foreground",
          item.serialNumber === null &&
            item.component.isSerialized &&
            "text-destructive",
        )}
      >
        {primary}
      </span>
      {secondary.length === 0 ? null : (
        <span className="truncate text-caption text-muted-readable">
          {secondary.join(" · ")}
        </span>
      )}
    </div>
  );
}

function StatusBadge({
  state,
}: Readonly<{ state: ComponentOperationalState }>): ReactElement {
  const presentation = OPERATIONAL_STATE_PRESENTATION[state];
  const Icon =
    state === "AVAILABLE"
      ? PackageOpen
      : state === "RESERVED"
        ? PackageCheck
        : state === "IN_TRANSIT"
          ? Truck
          : state === "ATTACHED"
            ? Link2
            : state === "QUARANTINED"
              ? ShieldAlert
              : state === "SOLD"
                ? BadgeCheck
                : state === "UNLOCATED"
                  ? CircleSlash2
                  : state === "OTHER"
                    ? AlertTriangle
                    : Boxes;

  return (
    <Badge variant={presentation.variant} className={presentation.className}>
      <Icon aria-hidden="true" className="size-3" />
      {presentation.label}
    </Badge>
  );
}

function CustodyValue({
  item,
}: Readonly<{ item: ComponentInventoryItem }>): ReactElement {
  const attachedVin = item.vehicle?.vin ?? null;
  const vehicleStatus = item.vehicle?.status ?? null;

  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge state={item.operationalState} />
        {item.operationalState === item.state ? null : (
          <Badge variant="outline">Custody {humanize(item.state)}</Badge>
        )}
        {item.vehicle?.statusMismatch === true ? (
          <Badge variant="warning">Vehicle status mismatch</Badge>
        ) : null}
        {item.store?.isActive === false ? (
          <Badge variant="warning">Inactive store</Badge>
        ) : null}
      </div>

      <span className="text-caption text-muted-readable">
        Status source:{" "}
        {item.statusSource === "VEHICLE"
          ? "Vehicle inventory"
          : "Component custody"}
        {item.operationalState === item.state
          ? ` · Custody ${humanize(item.state)}`
          : ""}
      </span>

      {item.vehicle === null ? null : (
        <span className="grid min-w-0 gap-0.5 text-caption">
          <span className="truncate text-foreground">
            {attachedVin === null
              ? "Vehicle VIN not recorded"
              : `VIN ${attachedVin}`}
          </span>
          <span className="truncate text-muted-readable">
            Vehicle status: {vehicleStatus ?? "Not available"}
          </span>
          {item.vehicle.statusMismatch ? (
            <span className="truncate text-warning-foreground">
              Inventory {item.vehicle.inventoryStatus ?? "—"} · Lifecycle{" "}
              {item.vehicle.lifecycleStatus ?? "—"}
            </span>
          ) : null}
        </span>
      )}

      {item.store !== null ? (
        <span className="inline-flex min-w-0 items-center gap-1.5 text-caption text-muted-readable">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">
            {item.store.name} · {item.store.orgUnitName}
          </span>
        </span>
      ) : item.state === "IN_TRANSIT" ? (
        <span className="inline-flex items-center gap-1.5 text-caption text-muted-readable">
          <Truck aria-hidden="true" className="size-3.5" />
          Between stock locations
        </span>
      ) : item.state === "RETIRED" ? (
        <span className="text-caption text-muted-readable">
          No verified stock location is recorded
        </span>
      ) : (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-caption",
            item.state === "UNLOCATED"
              ? "text-destructive"
              : "text-warning-foreground",
          )}
        >
          <CircleSlash2 aria-hidden="true" className="size-3.5" />
          {item.state === "UNLOCATED"
            ? "Current location not verified"
            : "Stock location not resolved"}
        </span>
      )}
    </div>
  );
}

function ConfigurationValue({
  item,
}: Readonly<{ item: ComponentInventoryItem }>): ReactElement {
  if (item.component.type === "BATTERY") {
    const configuration = currentBatteryConfiguration(item.metadata);
    if (configuration === null) {
      return (
        <span className="text-body-sm text-warning-foreground">
          Battery details not configured
        </span>
      );
    }

    const batteryType =
      configuration.batteryType === undefined ||
      sameDisplayValue(configuration.batteryType, item.component.name) ||
      sameDisplayValue(configuration.batteryType, item.component.code)
        ? null
        : configuration.batteryType;
    const primary = [
      batteryType,
      configuration.capacityKwh === undefined
        ? null
        : `${configuration.capacityKwh.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kWh`,
      configuration.voltageV === undefined
        ? null
        : `${configuration.voltageV.toLocaleString("en-IN", { maximumFractionDigits: 1 })} V`,
    ].filter((value): value is string => value !== null);
    const secondary = [
      configuration.bms === undefined
        ? null
        : `${humanize(configuration.bms)} BMS`,
      configuration.mounting === undefined
        ? null
        : humanize(configuration.mounting),
      configuration.batteryPackCount === undefined
        ? null
        : `${configuration.batteryPackCount.toLocaleString("en-IN")} pack${configuration.batteryPackCount === 1 ? "" : "s"}`,
    ].filter((value): value is string => value !== null);

    return (
      <div className="grid min-w-0 gap-0.5">
        <span className="line-clamp-1 text-body-sm text-foreground">
          {primary.length === 0
            ? "Configuration recorded"
            : primary.join(" · ")}
        </span>
        {secondary.length === 0 ? null : (
          <span className="truncate text-caption text-muted-readable">
            {secondary.join(" · ")}
          </span>
        )}
      </div>
    );
  }

  const imei = textMetadata(item.metadata["imei_number"]);
  if (imei !== null) {
    return (
      <div className="grid min-w-0 gap-0.5">
        <span className="text-body-sm text-foreground">IMEI {imei}</span>
      </div>
    );
  }

  return <span className="text-body-sm text-muted-readable">—</span>;
}

function MobileCards({
  items,
  access,
  data,
  query,
  selectedIds,
  onToggleSelection,
}: Readonly<{
  items: readonly ComponentInventoryItem[];
  access: ResolvedComponentInventoryAccess;
  data: ComponentInventoryWorkspaceData;
  query: ComponentInventorySearchParams;
  selectedIds: ReadonlySet<string>;
  onToggleSelection: (item: ComponentInventoryItem, checked: boolean) => void;
}>): ReactElement {
  return (
    <ContentList className="lg:hidden">
      {items.map((item) => (
        <ContentListItem
          key={item.componentInventoryId}
          title={<ComponentIdentity item={item} />}
          actions={
            <div className="flex items-center gap-3">
              {access.capabilities.canReconcile &&
              item.state === "UNLOCATED" ? (
                <Checkbox
                  checked={selectedIds.has(item.componentInventoryId)}
                  onCheckedChange={(checked) => {
                    onToggleSelection(item, checked === true);
                  }}
                  aria-label={`Select ${item.serialNumber ?? item.component.name} for reconciliation`}
                />
              ) : null}
              <ComponentInventoryRecordDialog
                item={item}
                context={{ tenantId: access.tenantId }}
                capabilities={access.capabilities}
                contextOptions={data.contextOptions}
                selectedStoreId={query.storeId}
              />
            </div>
          }
        >
          <ContentDescriptionList columns="one">
            <ContentDescriptionItem term="Physical identity">
              <PhysicalIdentity item={item} />
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Status & custody">
              <CustodyValue item={item} />
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Configuration">
              <ConfigurationValue item={item} />
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Updated">
              {formatDateTime(item.updatedAt)}
            </ContentDescriptionItem>
          </ContentDescriptionList>
        </ContentListItem>
      ))}
    </ContentList>
  );
}

function DesktopTable({
  items,
  access,
  data,
  query,
  selectedIds,
  selectableItems,
  onToggleSelection,
  onToggleAll,
}: Readonly<{
  items: readonly ComponentInventoryItem[];
  access: ResolvedComponentInventoryAccess;
  data: ComponentInventoryWorkspaceData;
  query: ComponentInventorySearchParams;
  selectedIds: ReadonlySet<string>;
  selectableItems: readonly ComponentInventoryItem[];
  onToggleSelection: (item: ComponentInventoryItem, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
}>): ReactElement {
  return (
    <ContentScrollArea
      label="Authorized component inventory table"
      className="hidden min-h-0 flex-1 overflow-x-hidden [scrollbar-gutter:stable] lg:block"
      style={{
        overflowX: "hidden",
        overflowY: "auto",
        overscrollBehavior: "auto",
      }}
    >
      <InventoryHeader count={items.length} sticky />
      <Table scrollMode="parent" className="w-full table-fixed">
        <TableHeader className="sticky top-12 z-20 bg-card/95 shadow-sm shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
          <TableRow className="h-11 bg-muted/20 hover:bg-muted/20">
            {access.capabilities.canReconcile ? (
              <TableHead className="w-[4%] text-muted-readable">
                <Checkbox
                  checked={
                    selectableItems.length > 0 &&
                    selectedIds.size === selectableItems.length
                      ? true
                      : selectedIds.size > 0
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(checked) => {
                    onToggleAll(checked === true);
                  }}
                  disabled={selectableItems.length === 0}
                  aria-label="Select all Unlocated components on this page"
                />
              </TableHead>
            ) : null}
            <TableHead className="w-[21%] text-muted-readable">
              Component
            </TableHead>
            <TableHead className="w-[19%] text-muted-readable">
              Physical identity
            </TableHead>
            <TableHead className="w-[27%] text-muted-readable">
              Status & custody
            </TableHead>
            <TableHead className="w-[17%] text-muted-readable">
              Configuration
            </TableHead>
            <TableHead className="w-[9%] text-muted-readable">
              Updated
            </TableHead>
            <TableHead className="w-[7%] text-right text-muted-readable">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.componentInventoryId}
              className="h-20 hover:bg-muted/35"
            >
              {access.capabilities.canReconcile ? (
                <TableCell className="h-20 py-2.5 align-middle">
                  {item.state === "UNLOCATED" ? (
                    <Checkbox
                      checked={selectedIds.has(item.componentInventoryId)}
                      onCheckedChange={(checked) => {
                        onToggleSelection(item, checked === true);
                      }}
                      aria-label={`Select ${item.serialNumber ?? item.component.name} for reconciliation`}
                    />
                  ) : null}
                </TableCell>
              ) : null}
              <TableCell className="h-20 whitespace-normal py-2.5 align-middle">
                <ComponentIdentity item={item} />
              </TableCell>
              <TableCell className="h-20 whitespace-normal py-2.5 align-middle">
                <PhysicalIdentity item={item} />
              </TableCell>
              <TableCell className="h-20 whitespace-normal py-2.5 align-middle">
                <CustodyValue item={item} />
              </TableCell>
              <TableCell className="h-20 whitespace-normal py-2.5 align-middle">
                <ConfigurationValue item={item} />
              </TableCell>
              <TableCell className="h-20 py-2.5 align-middle text-caption text-muted-readable">
                <span className="inline-flex items-center gap-1">
                  <Clock3 aria-hidden="true" className="size-3.5" />
                  {formatDateTime(item.updatedAt)}
                </span>
              </TableCell>
              <TableCell className="h-20 py-2.5 text-right align-middle">
                <ComponentInventoryRecordDialog
                  item={item}
                  context={{ tenantId: access.tenantId }}
                  capabilities={access.capabilities}
                  contextOptions={data.contextOptions}
                  selectedStoreId={query.storeId}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ContentScrollArea>
  );
}

export function ComponentInventoryTable({
  data,
  query,
  access,
}: Readonly<{
  data: ComponentInventoryWorkspaceData;
  query: ComponentInventorySearchParams;
  access: ResolvedComponentInventoryAccess;
}>): ReactElement {
  const items = data.list.items;
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const selectableItems = useMemo(
    () => items.filter((item) => item.state === "UNLOCATED").slice(0, 100),
    [items],
  );
  const selectedItems = useMemo(
    () =>
      selectableItems.filter((item) =>
        selectedIds.has(item.componentInventoryId),
      ),
    [selectableItems, selectedIds],
  );

  function toggleSelection(
    item: ComponentInventoryItem,
    checked: boolean,
  ): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(item.componentInventoryId);
      else next.delete(item.componentInventoryId);
      return next;
    });
  }

  function toggleAll(checked: boolean): void {
    setSelectedIds(
      checked
        ? new Set(selectableItems.map((item) => item.componentInventoryId))
        : new Set(),
    );
  }

  if (items.length === 0) {
    return (
      <div className="grid gap-4">
        <InventoryHeader count={0} />
        <ContentEmptyState
          icon={<Boxes aria-hidden="true" />}
          title="No components match this view"
          description="Change the organization, store, operational status, custody state, or component filter, or use global search for another serial number, lot number, component, or vehicle VIN."
          actions={
            <Button variant="outline" asChild>
              <a href={componentInventoryResetHref(query)}>
                Clear component filters
              </a>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {access.capabilities.canReconcile && selectableItems.length > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
          <p className="text-caption text-muted-readable">
            Select verified physical stock and assign one authorized location.
            Maximum 100 per batch.
          </p>
          <ComponentReconciliationDialog
            items={selectedItems}
            context={{ tenantId: access.tenantId }}
            contextOptions={data.contextOptions}
            onCompleted={() => {
              setSelectedIds(new Set());
            }}
          />
        </div>
      ) : null}
      <div className="shrink-0 lg:hidden">
        <InventoryHeader count={items.length} />
      </div>
      <MobileCards
        items={items}
        access={access}
        data={data}
        query={query}
        selectedIds={selectedIds}
        onToggleSelection={toggleSelection}
      />
      <DesktopTable
        items={items}
        access={access}
        data={data}
        query={query}
        selectedIds={selectedIds}
        selectableItems={selectableItems}
        onToggleSelection={toggleSelection}
        onToggleAll={toggleAll}
      />

      <div className="flex shrink-0 flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-muted-readable">
          Showing {items.length.toLocaleString("en-IN")} of up to{" "}
          {query.limit.toLocaleString("en-IN")} components on this page ·
          refreshed {formatDateTime(data.list.asOf)}.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {query.cursor === undefined ? null : (
            <Button variant="outline" asChild>
              <a
                href={componentInventoryPageHref(query, {
                  cursor: undefined,
                })}
              >
                First {query.limit}
              </a>
            </Button>
          )}

          {data.list.nextCursor !== null ? (
            <Button asChild>
              <a
                href={componentInventoryPageHref(query, {
                  cursor: data.list.nextCursor,
                })}
              >
                Next {query.limit}
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
            </Button>
          ) : (
            <Badge variant="secondary">End of results</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

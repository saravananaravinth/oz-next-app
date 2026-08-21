// oz-next-app/src/features/inventory/vehicles/ui/vehicle-inventory-table.tsx
import type { ReactElement } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  BadgeCheck,
  CalendarDays,
  CarFront,
  CheckCircle2,
  CircleHelp,
  Clock3,
  MapPin,
  Warehouse,
  type LucideIcon,
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
  VEHICLE_INVENTORY_PAGE_SIZE,
  type VehicleInventoryItem,
  type VehicleInventorySearchParams,
  type VehicleInventoryWorkspaceData,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
import type { VehicleInventoryContext } from "@/features/inventory/vehicles/policies/vehicle-inventory.policy";
import { VehicleInventoryComponentsHoverCard } from "@/features/inventory/vehicles/ui/vehicle-inventory-components-hover-card";
import { VehicleInventoryPriceHistory } from "@/features/inventory/vehicles/ui/vehicle-inventory-price-history";
import { VehicleInventoryTransferHistory } from "@/features/inventory/vehicles/ui/vehicle-inventory-transfer-history";
import { VehicleVin } from "@/features/inventory/vehicles/ui/vehicle-vin";
import {
  vehicleInventoryPageHref,
  vehicleInventoryResetHref,
} from "@/features/inventory/vehicles/utils/vehicle-inventory-url";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
});
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});
const MONEY_FORMATTERS = new Map<string, Intl.NumberFormat>();
const MODEL_VERSION_PATTERN = /\bV\d+(?:\.\d+)?\b/giu;

type ModelPresentation = Readonly<{
  name: string;
  versions: readonly string[];
}>;

type StatusPresentation = Readonly<{
  label: string;
  description: string;
  variant: BadgeProps["variant"];
  icon: LucideIcon;
  badgeClassName: string;
  iconClassName: string;
}>;

function formatDate(value: string): string {
  return DATE_FORMATTER.format(new Date(value));
}

function formatDateTime(value: string): string {
  return DATE_TIME_FORMATTER.format(new Date(value));
}

function humanizeToken(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll("_", " ")
    .replace(/(^|\s)\p{L}/gu, (match) => match.toLocaleUpperCase("en-US"));
}

function moneyFormatter(currency: string): Intl.NumberFormat {
  const existing = MONEY_FORMATTERS.get(currency);
  if (existing !== undefined) {
    return existing;
  }

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
  MONEY_FORMATTERS.set(currency, formatter);
  return formatter;
}

function formatMoney(amount: number | null, currency: string | null): string {
  if (amount === null) {
    return "Price not configured";
  }

  const resolvedCurrency = currency ?? "INR";

  try {
    return moneyFormatter(resolvedCurrency).format(amount);
  } catch {
    return `${resolvedCurrency} ${amount.toLocaleString("en-IN")}`;
  }
}

function displayModel(item: VehicleInventoryItem): string {
  return item.model.snapshotName ?? item.model.catalogName ?? "Unknown model";
}

function modelPresentation(item: VehicleInventoryItem): ModelPresentation {
  const modelName = displayModel(item);
  const versions = [...modelName.matchAll(MODEL_VERSION_PATTERN)].map((match) =>
    match[0].toLocaleUpperCase("en-US"),
  );
  const uniqueVersions = [...new Set(versions)];
  const nameWithoutVersions = modelName
    .replace(MODEL_VERSION_PATTERN, " ")
    .replace(/\s+/gu, " ")
    .trim();

  return {
    name: nameWithoutVersions.length > 0 ? nameWithoutVersions : modelName,
    versions: uniqueVersions,
  };
}

function batteryLabel(item: VehicleInventoryItem): string {
  if (item.variant.battery.label !== null) {
    return item.variant.battery.label;
  }

  const type = item.variant.battery.type;
  const power = item.variant.battery.powerKw;
  const formattedPower =
    power === null
      ? null
      : `${power.toLocaleString("en-IN", { maximumFractionDigits: 3 })} kW`;
  const parts = [type, formattedPower].filter(
    (value): value is string => value !== null,
  );

  return parts.length === 0 ? "Battery details unavailable" : parts.join(" · ");
}

function statusPresentation(item: VehicleInventoryItem): StatusPresentation {
  if (item.entryType === "TRANSFERRED") {
    return {
      label: "Transferred",
      description: "Transfer completed; this row is retained as stock history",
      variant: "secondary",
      icon: ArrowRightLeft,
      badgeClassName:
        "border-border/75 bg-muted/55 text-foreground dark:bg-muted/35",
      iconClassName:
        "border-border/80 bg-background/75 text-muted-readable dark:bg-background/20",
    };
  }

  switch (item.inventoryStatus) {
    case "ON_HAND":
      return {
        label: "Available",
        description: "Vehicle is available in current authorized stock",
        variant: "success",
        icon: CheckCircle2,
        badgeClassName:
          "border-success/25 bg-success/[0.08] text-success dark:bg-success/10",
        iconClassName:
          "border-success/20 bg-success/10 text-success dark:bg-success/15",
      };
    case "RESERVED":
      return {
        label: "Reserved",
        description: "Vehicle is held for a confirmed order",
        variant: "info",
        icon: Clock3,
        badgeClassName:
          "border-info/25 bg-info/[0.08] text-info dark:bg-info/10",
        iconClassName: "border-info/20 bg-info/10 text-info dark:bg-info/15",
      };
    case "SOLD":
      return {
        label: "Sold",
        description: "Vehicle sale is completed",
        variant: "secondary",
        icon: BadgeCheck,
        badgeClassName:
          "border-border/75 bg-secondary/75 text-secondary-foreground dark:bg-secondary/55",
        iconClassName:
          "border-border/80 bg-background/70 text-muted-readable dark:bg-background/20",
      };
    default:
      return {
        label: humanizeToken(item.inventoryStatus),
        description: "Inventory lifecycle status reported by ERP",
        variant: "outline",
        icon: CircleHelp,
        badgeClassName:
          "border-border/80 bg-background/70 text-foreground dark:bg-background/25",
        iconClassName:
          "border-border/80 bg-muted/55 text-muted-readable dark:bg-muted/35",
      };
  }
}

function districtDisplayLabel(value: string): string {
  const normalized = value.trim();
  return /\bdistrict$/iu.test(normalized)
    ? normalized
    : `${normalized} district`;
}

function resolvedStockLocation(
  item: VehicleInventoryItem,
): VehicleInventoryItem["stockLocation"] {
  if (item.stockLocation !== null) {
    return item.stockLocation;
  }

  return item.entryType === "CURRENT" ? item.perspective : null;
}

function compactLocationLabel(item: VehicleInventoryItem): string {
  const resolved = resolvedStockLocation(item);

  if (resolved === null) {
    return "Outside authorized stock scope";
  }

  const { city, district, state } = resolved.location;
  const resolvedCity = city ?? null;

  if (resolvedCity !== null && district !== null) {
    return `${resolvedCity} · ${districtDisplayLabel(district)}`;
  }

  if (resolvedCity !== null) {
    return resolvedCity;
  }

  if (district !== null) {
    return districtDisplayLabel(district);
  }

  return state ?? "Location details unavailable";
}

function fullLocationLabel(item: VehicleInventoryItem): string {
  const resolved = resolvedStockLocation(item);

  if (resolved === null) {
    return "The current stock location is outside your authorized dealer scope.";
  }

  const { city, district, state } = resolved.location;
  const parts = [
    city ?? null,
    district === null ? null : districtDisplayLabel(district),
    state,
  ].filter((value): value is string => value !== null);

  return parts.length === 0
    ? "Location details unavailable"
    : parts.join(" · ");
}

function ModelIdentity({
  item,
}: Readonly<{ item: VehicleInventoryItem }>): ReactElement {
  const model = modelPresentation(item);

  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-medium text-foreground">
          {model.name}
        </span>
        {model.versions.map((version) => (
          <Badge
            key={version}
            variant="secondary"
            className="h-5 shrink-0 rounded-md px-1.5 py-0 text-[0.625rem] leading-none tracking-[0.03em]"
          >
            {version}
          </Badge>
        ))}
      </div>
      <div className="flex min-w-0 items-center gap-2 text-caption text-muted-readable">
        <VehicleColorDot item={item} />
        <span className="truncate">
          {item.color.name ?? "Color not configured"}
        </span>
      </div>
    </div>
  );
}

function VehicleColorDot({
  item,
}: Readonly<{ item: VehicleInventoryItem }>): ReactElement {
  const colorHex = item.color.hex ?? "#A1A1AA";
  const metallic = item.color.metallic === true;
  const colorName = item.color.name ?? "Vehicle color";
  const finishLabel = metallic ? "Metallic finish" : "Standard finish";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="relative grid size-4 shrink-0 place-items-center rounded-full border border-foreground/20 bg-background shadow-sm ring-1 ring-background"
          aria-label={`${colorName}, ${finishLabel}`}
          role="img"
        >
          <span
            className="relative size-3 overflow-hidden rounded-full border border-black/10 dark:border-white/15"
            style={{ backgroundColor: colorHex }}
          >
            {metallic ? (
              <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.85)_0%,rgba(255,255,255,0.08)_38%,rgba(0,0,0,0.18)_68%,rgba(255,255,255,0.5)_100%)]" />
            ) : (
              <span className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.28),inset_0_-1px_1px_rgba(0,0,0,0.08)]" />
            )}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {colorName} · {finishLabel}
      </TooltipContent>
    </Tooltip>
  );
}

function VariantIdentity({
  item,
}: Readonly<{ item: VehicleInventoryItem }>): ReactElement {
  const unresolved = item.variant.name === null;

  return (
    <div className="grid min-w-0 gap-1">
      <span
        className={cn(
          "truncate font-medium",
          unresolved ? "text-warning" : "text-foreground",
        )}
      >
        {item.variant.name ?? "Variant needs review"}
      </span>
      <span className="truncate text-caption text-muted-readable">
        {batteryLabel(item)}
      </span>
    </div>
  );
}

function VinAndComponents({
  item,
}: Readonly<{ item: VehicleInventoryItem }>): ReactElement {
  return (
    <div className="grid min-w-0 gap-1.5">
      <VehicleVin vin={item.vin} />
      <VehicleInventoryComponentsHoverCard components={item.components} />
    </div>
  );
}

function StatusBadge({
  item,
}: Readonly<{ item: VehicleInventoryItem }>): ReactElement {
  const status = statusPresentation(item);
  const StatusIcon = status.icon;

  return (
    <Badge
      variant={status.variant}
      className={cn(
        "h-7 max-w-full min-w-0 justify-start gap-1.5 rounded-lg border px-2 py-0 shadow-none",
        status.badgeClassName,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-[0.3rem] border",
          status.iconClassName,
        )}
      >
        <StatusIcon className="size-2.5" strokeWidth={2.25} />
      </span>
      <span className="truncate leading-none">{status.label}</span>
    </Badge>
  );
}

function StatusValue({
  item,
  context,
}: Readonly<{
  item: VehicleInventoryItem;
  context: VehicleInventoryContext;
}>): ReactElement {
  const status = statusPresentation(item);

  if (item.entryType === "TRANSFERRED") {
    return (
      <VehicleInventoryTransferHistory
        key={`${context.tenantId}:${context.dealerOrgUnitId ?? "tenant-network"}:${item.unitId}`}
        context={context}
        unitId={item.unitId}
        vin={item.vin}
      >
        <button
          type="button"
          className="max-w-full rounded-lg text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={`${status.label}. View vehicle transfer history.`}
        >
          <StatusBadge item={item} />
        </button>
      </VehicleInventoryTransferHistory>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex max-w-full cursor-help">
          <StatusBadge item={item} />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {status.description}.
      </TooltipContent>
    </Tooltip>
  );
}

function StockLocation({
  item,
}: Readonly<{ item: VehicleInventoryItem }>): ReactElement {
  const location = resolvedStockLocation(item);

  if (location === null) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="grid min-w-0 cursor-help gap-1">
            <span className="flex min-w-0 items-center gap-1.5 font-medium text-muted-readable">
              <Warehouse aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">Outside authorized scope</span>
            </span>
            <span className="truncate text-caption text-muted-readable">
              Current location restricted
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          The vehicle has left the currently authorized dealer stock scope. Its
          later stock location is not exposed from this historical row.
        </TooltipContent>
      </Tooltip>
    );
  }

  const storeName = location.store.name;
  const dealerName = location.orgUnit.name;
  const sameStoreAndDealer =
    storeName.localeCompare(dealerName, "en", { sensitivity: "base" }) === 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="grid min-w-0 cursor-help gap-1">
          <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
            <Warehouse
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-readable"
            />
            <span className="truncate">{storeName}</span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-caption text-muted-readable">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{compactLocationLabel(item)}</span>
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <span className="grid gap-1">
          <strong>{storeName}</strong>
          {sameStoreAndDealer ? null : <span>Dealer · {dealerName}</span>}
          <span className="inline-flex items-center gap-1.5 text-muted-readable">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            {fullLocationLabel(item)}
          </span>
          {!location.store.isActive ? (
            <span className="text-warning">
              This stock location is currently inactive.
            </span>
          ) : null}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

function ArrivalAge({
  item,
}: Readonly<{ item: VehicleInventoryItem }>): ReactElement {
  if (item.arrival.deliveredAt === null || item.arrival.ageDays === null) {
    return (
      <div className="grid min-w-0 gap-1">
        <span className="flex items-center gap-1.5 font-medium text-warning">
          <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">Arrival date needed</span>
        </span>
        <span className="truncate text-caption text-muted-readable">
          Stock age unavailable
        </span>
      </div>
    );
  }

  const ageDays = item.arrival.ageDays;
  const aging = ageDays > 30;

  return (
    <div className="grid min-w-0 gap-1">
      <span
        className={cn(
          "truncate font-medium",
          aging ? "text-warning" : "text-foreground",
        )}
      >
        {ageDays.toLocaleString("en-IN")} day{ageDays === 1 ? "" : "s"} in stock
      </span>
      <span className="flex min-w-0 items-center gap-1.5 text-caption text-muted-readable">
        <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">
          Arrived {formatDate(item.arrival.deliveredAt)}
        </span>
      </span>
    </div>
  );
}

function PriceValue({
  item,
  context,
}: Readonly<{
  item: VehicleInventoryItem;
  context: VehicleInventoryContext;
}>): ReactElement {
  const missing = item.mrp.amount === null;
  const priceKind =
    item.mrp.kind === "EX_SHOWROOM" ? "Ex-showroom price" : "MRP";
  const stateName = item.mrp.priceBook?.stateName ?? null;
  const modelName = displayModel(item);

  return (
    <div className="grid min-w-0 justify-items-end gap-1 text-right">
      <div className="flex max-w-full items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "max-w-full truncate font-medium text-tabular",
                missing
                  ? "cursor-help text-warning"
                  : "cursor-help text-foreground",
              )}
            >
              {formatMoney(item.mrp.amount, item.mrp.currency)}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            {missing ? (
              "No effective vehicle price is configured for this inventory record."
            ) : (
              <span className="grid gap-1">
                <strong>{priceKind}</strong>
                <span>
                  {item.mrp.priceBook?.name ??
                    "Effective dealer price configuration"}
                </span>
                {stateName === null ? null : <span>{stateName}</span>}
              </span>
            )}
          </TooltipContent>
        </Tooltip>

        {missing ? null : (
          <VehicleInventoryPriceHistory
            context={context}
            variantId={item.variant.variantId}
            modelName={modelName}
            variantName={item.variant.name}
            storeId={item.perspective.store.storeId}
          />
        )}
      </div>

      <span
        className={cn(
          "max-w-full truncate text-caption",
          missing ? "text-warning" : "text-muted-readable",
        )}
      >
        {missing
          ? "Pricing needs review"
          : stateName === null
            ? priceKind
            : `${priceKind} · ${stateName}`}
      </span>
    </div>
  );
}

function InventoryStockHeader({
  count,
  sticky = false,
}: Readonly<{
  count: number;
  sticky?: boolean;
}>): ReactElement {
  return (
    <div
      className={cn(
        "flex h-16 items-center gap-3 border-b border-border/70 bg-card pb-2.5",
        sticky &&
          "sticky top-0 z-30 bg-card/95 shadow-sm shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
        <CarFront aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-card-title text-foreground">
          Authorized vehicle stock
        </h2>
        <p className="truncate text-caption text-muted-readable">
          Dealer-friendly stock details · {VEHICLE_INVENTORY_PAGE_SIZE} vehicles
          per page
        </p>
      </div>
      <Badge variant="secondary" className="text-tabular">
        {count.toLocaleString("en-IN")} shown
      </Badge>
    </div>
  );
}

function InventoryMobileCards({
  items,
  context,
}: Readonly<{
  items: readonly VehicleInventoryItem[];
  context: VehicleInventoryContext;
}>): ReactElement {
  return (
    <ContentList className="lg:hidden" density="compact">
      {items.map((item) => (
        <ContentListItem
          key={item.entryKey}
          title={<ModelIdentity item={item} />}
          meta={<StatusValue item={item} context={context} />}
        >
          <ContentDescriptionList columns="one">
            <ContentDescriptionItem term="VIN">
              <VinAndComponents item={item} />
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Variant">
              <VariantIdentity item={item} />
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Stock location">
              <StockLocation item={item} />
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Arrival / age">
              <ArrivalAge item={item} />
            </ContentDescriptionItem>
            <ContentDescriptionItem term="MRP" numeric>
              <PriceValue item={item} context={context} />
            </ContentDescriptionItem>
          </ContentDescriptionList>
        </ContentListItem>
      ))}
    </ContentList>
  );
}

function InventoryDesktopTable({
  items,
  context,
}: Readonly<{
  items: readonly VehicleInventoryItem[];
  context: VehicleInventoryContext;
}>): ReactElement {
  return (
    <ContentScrollArea
      label="Authorized vehicle stock table"
      className="hidden min-h-0 flex-1 overflow-x-hidden [scrollbar-gutter:stable] lg:block"
      style={{
        overflowX: "hidden",
        overflowY: "auto",
        overscrollBehavior: "auto",
      }}
    >
      <InventoryStockHeader count={items.length} sticky />
      <Table scrollMode="parent" className="w-full table-fixed">
        <TableHeader className="sticky top-16 z-20 bg-card/95 shadow-sm shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
          <TableRow className="h-11 bg-muted/20 hover:bg-muted/20">
            <TableHead className="w-[15%] pe-1.5 text-muted-readable">
              Vehicle
            </TableHead>
            <TableHead className="w-[19%] ps-1.5 text-muted-readable">
              VIN
            </TableHead>
            <TableHead className="w-[15%] text-muted-readable">
              Variant
            </TableHead>
            <TableHead className="w-[12%] text-muted-readable">
              Status
            </TableHead>
            <TableHead className="w-[17%] text-muted-readable">
              Stock location
            </TableHead>
            <TableHead className="w-[12%] text-muted-readable">
              Arrival / age
            </TableHead>
            <TableHead className="w-[10%] text-right text-muted-readable">
              MRP
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.entryKey} className="h-20 hover:bg-muted/35">
              <TableCell className="h-20 whitespace-normal py-2.5 pe-1.5 align-middle">
                <ModelIdentity item={item} />
              </TableCell>
              <TableCell className="h-20 whitespace-normal py-2.5 ps-1.5 align-middle">
                <VinAndComponents item={item} />
              </TableCell>
              <TableCell className="h-20 whitespace-normal py-2.5 align-middle">
                <VariantIdentity item={item} />
              </TableCell>
              <TableCell className="h-20 py-2.5 align-middle">
                <StatusValue item={item} context={context} />
              </TableCell>
              <TableCell className="h-20 whitespace-normal py-2.5 align-middle">
                <StockLocation item={item} />
              </TableCell>
              <TableCell className="h-20 py-2.5 align-middle">
                <ArrivalAge item={item} />
              </TableCell>
              <TableCell className="h-20 py-2.5 text-right align-middle">
                <PriceValue item={item} context={context} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ContentScrollArea>
  );
}

export function VehicleInventoryTable({
  data,
  query,
  context,
}: Readonly<{
  data: VehicleInventoryWorkspaceData;
  query: VehicleInventorySearchParams;
  context: VehicleInventoryContext;
}>): ReactElement {
  const items = data.list.items;

  if (items.length === 0) {
    return (
      <div className="grid gap-4">
        <InventoryStockHeader count={0} />
        <ContentEmptyState
          icon={<CarFront aria-hidden="true" />}
          title="No vehicles match this view"
          description="Try clearing a filter, changing the stock scope, or use the global search to look for another VIN, component serial, model, variant, store, or dealer."
          actions={
            <Button variant="outline" asChild>
              <a href={vehicleInventoryResetHref(query)}>
                Clear inventory filters
              </a>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0 lg:hidden">
        <InventoryStockHeader count={items.length} />
      </div>
      <InventoryMobileCards items={items} context={context} />
      <InventoryDesktopTable items={items} context={context} />

      <div className="shrink-0 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-muted-readable">
          Showing {items.length.toLocaleString("en-IN")} of up to{" "}
          {VEHICLE_INVENTORY_PAGE_SIZE.toLocaleString("en-IN")} vehicles on this
          page · refreshed {formatDateTime(data.list.asOf)}.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {query.cursor === undefined ? null : (
            <Button variant="outline" asChild>
              <a href={vehicleInventoryPageHref(query, { cursor: undefined })}>
                First {VEHICLE_INVENTORY_PAGE_SIZE}
              </a>
            </Button>
          )}

          {data.list.pagination.hasMore &&
          data.list.pagination.nextCursor !== null ? (
            <Button asChild>
              <a
                href={vehicleInventoryPageHref(query, {
                  cursor: data.list.pagination.nextCursor,
                })}
              >
                Next {VEHICLE_INVENTORY_PAGE_SIZE}
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

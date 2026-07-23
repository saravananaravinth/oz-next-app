// oz-next-app/src/features/inventory/vehicles/ui/vehicle-inventory-table.tsx
import type { ReactElement } from "react";
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  CircleDollarSign,
  Eye,
  MapPin,
  PackageSearch,
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

import type {
  VehicleInventoryItem,
  VehicleInventorySearchParams,
  VehicleInventoryWorkspaceData,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
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

function formatDate(value: string): string {
  return DATE_FORMATTER.format(new Date(value));
}

function formatDateTime(value: string): string {
  return DATE_TIME_FORMATTER.format(new Date(value));
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
    return "Not configured";
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

function formatBattery(item: VehicleInventoryItem): string {
  const type = item.variant.battery.type;
  const power = item.variant.battery.powerKw;

  if (type === null && power === null) {
    return "Battery specification unavailable";
  }

  const formattedPower =
    power === null
      ? null
      : `${power.toLocaleString("en-IN", { maximumFractionDigits: 3 })} kW`;

  return [type, formattedPower].filter((value) => value !== null).join(" ");
}

function statusVariant(status: string): BadgeProps["variant"] {
  switch (status) {
    case "SOLD":
      return "secondary";
    case "RESERVED":
      return "default";
    case "ON_HAND":
      return "outline";
    default:
      return "ghost";
  }
}

function locationLabel(item: VehicleInventoryItem): string {
  const { district, state } = item.perspective.location;

  if (district !== null && state !== null) {
    return `${district}, ${state}`;
  }

  return district ?? state ?? "Location not configured";
}

function ModelIdentity({
  item,
}: Readonly<{ item: VehicleInventoryItem }>): ReactElement {
  const model = modelPresentation(item);

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-foreground">{model.name}</span>
        {model.versions.map((version) => (
          <Badge key={version} variant="secondary" className="px-2 py-0.5">
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
  const colorHex = item.color.hex ?? "#D4D4D8";
  const metallic = item.color.metallic === true;
  const finishLabel = metallic ? "Metallic finish" : "Matt finish";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="relative size-4 shrink-0 overflow-hidden rounded-full border border-foreground/15 shadow-sm ring-1 ring-background"
          aria-label={finishLabel}
          role="img"
        >
          <span
            className="absolute inset-0"
            style={{ backgroundColor: colorHex }}
          />
          <span
            className={
              metallic
                ? "absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.12)_35%,rgba(0,0,0,0.22)_68%,rgba(255,255,255,0.55)_100%)]"
                : "absolute inset-0 bg-black/8 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
            }
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>{finishLabel}</TooltipContent>
    </Tooltip>
  );
}

function VariantIdentity({
  item,
}: Readonly<{ item: VehicleInventoryItem }>): ReactElement {
  return (
    <div className="grid gap-1">
      <span className="font-medium text-foreground">{formatBattery(item)}</span>
      <span className="text-caption text-muted-readable">
        {item.variant.name ?? "Variant not resolved"}
      </span>
    </div>
  );
}

function componentTypeLabel(item: VehicleInventoryItem): string {
  const types = item.components.map((component) => component.type);
  return types.length === 0 ? "No installed component type" : types.join(" · ");
}

function VinAndComponents({
  item,
}: Readonly<{ item: VehicleInventoryItem }>): ReactElement {
  return (
    <div className="grid gap-1.5">
      <VehicleVin vin={item.vin} />
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex min-w-0 cursor-help items-center gap-1.5 text-caption text-muted-readable">
            <PackageSearch aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{componentTypeLabel(item)}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          {item.components.length === 0 ? (
            "No active installed component records were resolved."
          ) : (
            <span className="grid gap-2">
              {item.components.map((component) => (
                <span key={component.type} className="grid gap-0.5">
                  <strong>{component.type}</strong>
                  <span className="font-mono text-[0.6875rem] text-muted-readable">
                    {component.serialNumbers.length === 0
                      ? "Serial number unavailable"
                      : component.serialNumbers.join(", ")}
                  </span>
                </span>
              ))}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function ArrivalAge({
  item,
}: Readonly<{ item: VehicleInventoryItem }>): ReactElement {
  if (item.arrival.deliveredAt === null || item.arrival.ageDays === null) {
    return (
      <div className="grid gap-1">
        <span className="flex items-center gap-1.5 text-warning-foreground">
          <CalendarDays aria-hidden="true" className="size-3.5" />
          Unknown arrival
        </span>
        <span className="text-caption text-muted-readable">
          Verification required
        </span>
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      <span className="flex items-center gap-1.5 text-foreground">
        <CalendarDays aria-hidden="true" className="size-3.5" />
        {formatDate(item.arrival.deliveredAt)}
      </span>
      <span className="flex flex-wrap items-center gap-1.5 text-caption text-muted-readable">
        {item.arrival.ageDays.toLocaleString("en-IN")} days ·{" "}
        {item.arrival.ageBucket}
        <Badge variant="outline" className="px-1.5 py-0 text-[0.625rem]">
          {item.arrival.source === "MANUAL" ? "Verified manual" : "Shipment"}
        </Badge>
      </span>
    </div>
  );
}

function PriceValue({
  item,
}: Readonly<{ item: VehicleInventoryItem }>): ReactElement {
  const priceBook = item.mrp.priceBook;
  const stateLabel =
    priceBook === null
      ? "Price state unavailable"
      : (priceBook.stateName ??
        (priceBook.stateId === null
          ? "All-India / default"
          : "State-specific"));
  const effectiveLabel =
    priceBook === null
      ? "No effective price book"
      : `Effective ${formatDate(priceBook.effectiveFrom)}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="grid justify-items-end gap-1 text-right">
          <span className="flex flex-wrap items-center justify-end gap-1.5 font-medium text-foreground text-tabular">
            {formatMoney(item.mrp.amount, item.mrp.currency)}
            {item.mrp.kind === "EX_SHOWROOM" ? (
              <Badge variant="warning" className="px-1.5 py-0 text-[0.625rem]">
                Ex-showroom
              </Badge>
            ) : null}
          </span>
          <span className="max-w-48 text-caption text-muted-readable">
            {stateLabel} · {effectiveLabel}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {priceBook === null
          ? "No effective state-specific or default price book was resolved."
          : `${item.mrp.kind === "EX_SHOWROOM" ? "Ex-showroom fallback from" : "MRP from"} ${priceBook.name}; ${stateLabel}; effective from ${formatDate(priceBook.effectiveFrom)}.`}
      </TooltipContent>
    </Tooltip>
  );
}

function InventoryMobileCards({
  items,
}: Readonly<{
  items: readonly VehicleInventoryItem[];
}>): ReactElement {
  return (
    <ContentList className="lg:hidden">
      {items.map((item) => (
        <ContentListItem
          key={item.entryKey}
          media={<CarFront aria-hidden="true" className="size-5" />}
          meta={
            <Badge variant={statusVariant(item.inventoryStatus)}>
              {item.inventoryStatus.replaceAll("_", " ")}
            </Badge>
          }
          title={<ModelIdentity item={item} />}
        >
          <ContentDescriptionList columns="one" className="mt-3">
            <ContentDescriptionItem term="VIN">
              <VinAndComponents item={item} />
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Variant">
              <VariantIdentity item={item} />
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Stock location">
              <span className="grid gap-0.5">
                <span>{item.perspective.orgUnit.name}</span>
                <span className="text-caption text-muted-readable">
                  {locationLabel(item)}
                </span>
              </span>
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Arrival / age">
              <ArrivalAge item={item} />
            </ContentDescriptionItem>
            <ContentDescriptionItem term="MRP" numeric>
              <PriceValue item={item} />
            </ContentDescriptionItem>
          </ContentDescriptionList>
        </ContentListItem>
      ))}
    </ContentList>
  );
}

function InventoryDesktopTable({
  items,
}: Readonly<{
  items: readonly VehicleInventoryItem[];
}>): ReactElement {
  return (
    <ContentScrollArea className="hidden lg:block">
      <Table className="min-w-[78rem]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[16%]">Vehicle</TableHead>
            <TableHead className="w-[17%]">VIN</TableHead>
            <TableHead className="w-[15%]">Variant</TableHead>
            <TableHead className="w-[10%]">Status</TableHead>
            <TableHead className="w-[18%]">Stock location</TableHead>
            <TableHead className="w-[13%]">Arrival / age</TableHead>
            <TableHead className="w-[11%] text-right">MRP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.entryKey} className="align-top">
              <TableCell className="whitespace-normal py-4">
                <ModelIdentity item={item} />
              </TableCell>
              <TableCell className="whitespace-normal py-4">
                <VinAndComponents item={item} />
              </TableCell>
              <TableCell className="whitespace-normal py-4">
                <VariantIdentity item={item} />
              </TableCell>
              <TableCell className="py-4">
                <div className="grid justify-items-start gap-1.5">
                  <Badge variant={statusVariant(item.inventoryStatus)}>
                    {item.inventoryStatus.replaceAll("_", " ")}
                  </Badge>
                  <span className="text-caption text-muted-readable">
                    {item.entryType === "CURRENT"
                      ? "Current stock"
                      : "Transfer history"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="whitespace-normal py-4">
                <div className="grid gap-1">
                  <span className="font-medium text-foreground">
                    {item.perspective.orgUnit.name}
                  </span>
                  <span className="flex items-center gap-1.5 text-caption text-muted-readable">
                    <MapPin aria-hidden="true" className="size-3.5" />
                    {locationLabel(item)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <ArrivalAge item={item} />
              </TableCell>
              <TableCell className="py-4 text-right">
                <PriceValue item={item} />
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
}: Readonly<{
  data: VehicleInventoryWorkspaceData;
  query: VehicleInventorySearchParams;
}>): ReactElement {
  const items = data.list.items;

  if (items.length === 0) {
    return (
      <ContentEmptyState
        icon={<CarFront aria-hidden="true" />}
        title="No vehicles match these filters"
        description="The authorized dealer scope returned no inventory rows. Clear filters or include another permitted stock scope."
        actions={
          <Button variant="outline" asChild>
            <a href={vehicleInventoryResetHref(query)}>Clear filters</a>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4">
      <InventoryMobileCards items={items} />
      <InventoryDesktopTable items={items} />

      <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-muted-readable">
          Showing {items.length.toLocaleString("en-IN")} authorized rows as of{" "}
          {formatDateTime(data.list.asOf)}.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {query.cursor === undefined ? null : (
            <Button variant="outline" asChild>
              <a href={vehicleInventoryPageHref(query, { cursor: undefined })}>
                First page
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
                Next page
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

export function VehicleInventoryTableLegend(): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-muted-readable">
      <span className="flex items-center gap-1.5">
        <CircleDollarSign aria-hidden="true" className="size-4" />
        Price context shows the resolved state and price-book effective date.
      </span>
      <span className="flex items-center gap-1.5">
        <PackageSearch aria-hidden="true" className="size-4" />
        Component types come from active installed manufacturing components.
      </span>
      <span className="flex items-center gap-1.5">
        <Eye aria-hidden="true" className="size-4" />
        Full VIN is revealed only after an explicit user action.
      </span>
    </div>
  );
}

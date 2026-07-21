// oz-next-app/src/features/inventory/vehicles/ui/vehicle-inventory-table.tsx
import type { ReactElement } from "react";
import {
  ArrowRight,
  CalendarDays,
  CarFront,
  CircleDollarSign,
  Eye,
  MapPin,
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
const DAY_MS = 86_400_000;

type ModelPresentation = Readonly<{
  name: string;
  versions: readonly string[];
}>;

type ArrivalPresentation = Readonly<{
  date: string;
  ageDays: number;
  ageBucket: string;
  usesCreatedFallback: boolean;
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

function ageBucket(ageDays: number): string {
  if (ageDays <= 30) return "0-30";
  if (ageDays <= 60) return "31-60";
  if (ageDays <= 90) return "61-90";
  return "91+";
}

function arrivalPresentation(
  item: VehicleInventoryItem,
  asOf: string,
): ArrivalPresentation {
  if (item.arrival.deliveredAt !== null && item.arrival.ageDays !== null) {
    return {
      date: item.arrival.deliveredAt,
      ageDays: item.arrival.ageDays,
      ageBucket: item.arrival.ageBucket,
      usesCreatedFallback: false,
    };
  }

  const asOfTime = new Date(asOf).getTime();
  const createdTime = new Date(item.arrival.fallbackCreatedAt).getTime();
  const calculatedAge = Math.max(
    0,
    Math.floor((asOfTime - createdTime) / DAY_MS),
  );

  return {
    date: item.arrival.fallbackCreatedAt,
    ageDays: calculatedAge,
    ageBucket: ageBucket(calculatedAge),
    usesCreatedFallback: true,
  };
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
      <VehicleVin vin={item.vin} />
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
    <span
      className="relative size-4 shrink-0 overflow-hidden rounded-full border border-foreground/15 shadow-sm ring-1 ring-background"
      title={finishLabel}
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

function ArrivalAge({
  item,
  asOf,
}: Readonly<{ item: VehicleInventoryItem; asOf: string }>): ReactElement {
  const arrival = arrivalPresentation(item, asOf);

  return (
    <div className="grid gap-1">
      <span className="flex items-center gap-1.5 text-foreground">
        <CalendarDays aria-hidden="true" className="size-3.5" />
        {formatDate(arrival.date)}
      </span>
      <span className="flex flex-wrap items-center gap-1.5 text-caption text-muted-readable">
        {String(arrival.ageDays)} days · {arrival.ageBucket}
        {arrival.usesCreatedFallback ? (
          <Badge variant="outline" className="px-1.5 py-0 text-[0.625rem]">
            Created date
          </Badge>
        ) : null}
      </span>
    </div>
  );
}

function PriceValue({
  item,
}: Readonly<{ item: VehicleInventoryItem }>): ReactElement {
  const priceBookName = item.mrp.priceBook?.name ?? "No effective price book";
  const priceKind =
    item.mrp.kind === "EX_SHOWROOM"
      ? "Ex-showroom fallback"
      : item.mrp.kind === "MRP"
        ? "MRP"
        : "Price unavailable";

  return (
    <div className="grid justify-items-end gap-1">
      <span className="font-medium text-foreground">
        {formatMoney(item.mrp.amount, item.mrp.currency)}
      </span>
      <span className="max-w-48 text-right text-caption text-muted-readable">
        {priceKind} · {priceBookName}
      </span>
    </div>
  );
}

function InventoryMobileCards({
  items,
  asOf,
}: Readonly<{
  items: readonly VehicleInventoryItem[];
  asOf: string;
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
              <ArrivalAge item={item} asOf={asOf} />
            </ContentDescriptionItem>
            <ContentDescriptionItem term="MRP" numeric>
              <PriceValue item={item} />
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Last updated">
              {formatDateTime(item.lastUpdatedAt)}
            </ContentDescriptionItem>
          </ContentDescriptionList>
        </ContentListItem>
      ))}
    </ContentList>
  );
}

function InventoryDesktopTable({
  items,
  asOf,
}: Readonly<{
  items: readonly VehicleInventoryItem[];
  asOf: string;
}>): ReactElement {
  return (
    <ContentScrollArea className="hidden lg:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehicle</TableHead>
            <TableHead>Variant</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stock location</TableHead>
            <TableHead>Arrival / age</TableHead>
            <TableHead className="text-right">MRP</TableHead>
            <TableHead>Last updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.entryKey}>
              <TableCell className="min-w-72 whitespace-normal align-top">
                <ModelIdentity item={item} />
              </TableCell>
              <TableCell className="min-w-52 whitespace-normal align-top">
                <VariantIdentity item={item} />
              </TableCell>
              <TableCell className="align-top">
                <div className="grid justify-items-start gap-1.5">
                  <Badge variant={statusVariant(item.inventoryStatus)}>
                    {item.inventoryStatus.replaceAll("_", " ")}
                  </Badge>
                  <span className="text-caption text-muted-readable">
                    {item.entryType === "CURRENT"
                      ? "Current stock"
                      : "Transferred stock"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="min-w-56 whitespace-normal align-top">
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
              <TableCell className="min-w-48 align-top">
                <ArrivalAge item={item} asOf={asOf} />
              </TableCell>
              <TableCell className="min-w-52 text-right align-top">
                <PriceValue item={item} />
              </TableCell>
              <TableCell className="align-top">
                <span className="text-caption text-muted-readable">
                  {formatDateTime(item.lastUpdatedAt)}
                </span>
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
      <InventoryMobileCards items={items} asOf={data.list.asOf} />
      <InventoryDesktopTable items={items} asOf={data.list.asOf} />

      <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-muted-readable">
          Showing {String(items.length)} authorized rows as of{" "}
          {formatDateTime(data.list.asOf)}.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {query.cursor === undefined ? null : (
            <Button variant="outline" asChild>
              <a
                href={vehicleInventoryPageHref(query, {
                  cursor: undefined,
                })}
              >
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
        MRP uses the effective price book; ex-showroom is shown only as a
        labeled fallback.
      </span>
      <span className="flex items-center gap-1.5">
        <Eye aria-hidden="true" className="size-4" />
        Full VIN is revealed only after an explicit user action.
      </span>
    </div>
  );
}

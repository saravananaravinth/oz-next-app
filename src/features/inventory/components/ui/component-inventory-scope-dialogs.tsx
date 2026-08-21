// oz-next-app/src/features/inventory/components/ui/component-inventory-scope-dialogs.tsx
"use client";

import * as React from "react";
import {
  Building2,
  Check,
  MapPin,
  Search,
  Store,
  Warehouse,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type {
  ComponentOrganizationOption,
  ComponentStoreOption,
} from "@/features/inventory/components/contracts/component-inventory.schema";

const CONTROL_HEIGHT_CLASS_NAME = "h-9";

export type ComponentOrganizationSelection = Readonly<{
  orgUnitId: string;
  storeId: string;
}>;

function humanize(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll("_", " ")
    .replace(/(^|\s)\p{L}/gu, (match) => match.toLocaleUpperCase("en-US"));
}

function clean(value: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length === 0 ? null : normalized;
}

function locationSummary(
  input: Readonly<{
    city: string | null;
    district: string | null;
    state: string | null;
  }>,
): string {
  const parts = [
    clean(input.city),
    clean(input.district),
    clean(input.state),
  ].filter((value): value is string => value !== null);
  return parts.length === 0
    ? "Location details not recorded"
    : parts.join(" · ");
}

function storeAddress(store: ComponentStoreOption): string {
  const parts = [
    clean(store.addressLine1),
    clean(store.addressLine2),
    clean(store.city),
    clean(store.district),
    clean(store.state),
    clean(store.postalCode),
  ].filter((value): value is string => value !== null);
  return parts.length === 0 ? "Address not recorded" : parts.join(", ");
}

function normalizedSearch(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function includesSearch(
  values: ReadonlyArray<string | null>,
  query: string,
): boolean {
  if (query.length === 0) return true;
  return values.some((value) =>
    value?.toLocaleLowerCase("en-US").includes(query),
  );
}

function storesForOrganization(
  stores: readonly ComponentStoreOption[],
  orgUnitId: string,
): readonly ComponentStoreOption[] {
  return stores.filter((store) => store.orgUnitId === orgUnitId);
}

function linkedStore(
  stores: readonly ComponentStoreOption[],
  orgUnitId: string,
): ComponentStoreOption | null {
  const matches = storesForOrganization(stores, orgUnitId);
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

function linkedStoreStatus(
  stores: readonly ComponentStoreOption[],
  orgUnitId: string,
): Readonly<{
  store: ComponentStoreOption | null;
  message: string | null;
}> {
  const matches = storesForOrganization(stores, orgUnitId);

  if (matches.length === 1) {
    return { store: matches[0] ?? null, message: null };
  }

  if (matches.length === 0) {
    return {
      store: null,
      message: "No authorized linked stock location is configured.",
    };
  }

  return {
    store: null,
    message: `${matches.length.toLocaleString("en-IN")} authorized stock locations are linked. Expected exactly one.`,
  };
}

type PickerButtonContentProps = Readonly<{
  label: string;
  secondary?: string | undefined;
  icon: React.ReactNode;
}>;

function PickerButtonContent({
  label,
  secondary,
  icon,
}: PickerButtonContentProps): React.ReactElement {
  return (
    <>
      {icon}
      <span className="grid min-w-0 text-left leading-tight">
        <span className="truncate text-body-sm">{label}</span>
        {secondary === undefined ? null : (
          <span className="truncate text-[0.675rem] text-muted-readable">
            {secondary}
          </span>
        )}
      </span>
    </>
  );
}

export function ComponentOrganizationPicker({
  organizations,
  stores,
  value,
  onValueChange,
  allowAll = true,
  disabled = false,
}: Readonly<{
  organizations: readonly ComponentOrganizationOption[];
  stores: readonly ComponentStoreOption[];
  value: string | undefined;
  onValueChange: (value: ComponentOrganizationSelection | undefined) => void;
  allowAll?: boolean;
  disabled?: boolean;
}>): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const selected = organizations.find((item) => item.orgUnitId === value);
  const selectedStore =
    selected === undefined ? null : linkedStore(stores, selected.orgUnitId);
  const query = normalizedSearch(search);
  const visible = organizations.filter((item) =>
    includesSearch(
      [item.code, item.name, item.type, item.city, item.district, item.state],
      query,
    ),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setSearch("");
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            CONTROL_HEIGHT_CLASS_NAME,
            "max-w-[19rem] justify-start gap-2 rounded-xl px-3",
          )}
          disabled={disabled}
        >
          <PickerButtonContent
            label={selected?.name ?? "All dealers"}
            secondary={
              selected === undefined
                ? "Authorized tenant scope"
                : selectedStore === null
                  ? `${selected.code} · linked store needs review`
                  : `${selected.code} · ${humanize(selected.type)}`
            }
            icon={
              <Building2 aria-hidden="true" className="size-3.5 shrink-0" />
            }
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Organization or dealer scope</DialogTitle>
          <DialogDescription>
            Select an authorized organization or dealer. Its linked stock
            location is applied automatically, so the scope remains a single,
            clear choice.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-readable"
            />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
              }}
              className="pl-9"
              placeholder="Search dealer code, name, type, city, district, or state"
              maxLength={120}
              aria-label="Search organizations and dealers"
            />
          </div>

          <div className="grid max-h-[min(60dvh,34rem)] gap-2 overflow-y-auto overscroll-contain pr-1">
            {allowAll ? (
              <button
                type="button"
                onClick={() => {
                  onValueChange(undefined);
                  setOpen(false);
                }}
                className={cn(
                  "grid w-full gap-1 rounded-2xl border p-4 text-left outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  value === undefined
                    ? "border-primary/40 bg-primary/8"
                    : "border-border/70 hover:bg-muted/45",
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">
                    All organizations / dealers
                  </span>
                  {value === undefined ? (
                    <Check aria-hidden="true" className="size-4 text-primary" />
                  ) : null}
                </span>
                <span className="text-caption text-muted-readable">
                  Tenant-wide read-only monitoring across every
                  backend-authorized organization and linked stock location.
                </span>
              </button>
            ) : null}

            {visible.map((item) => {
              const link = linkedStoreStatus(stores, item.orgUnitId);
              const itemSelected = item.orgUnitId === value;

              return (
                <button
                  key={item.orgUnitId}
                  type="button"
                  disabled={link.store === null}
                  onClick={() => {
                    if (link.store === null) return;
                    onValueChange({
                      orgUnitId: item.orgUnitId,
                      storeId: link.store.storeId,
                    });
                    setOpen(false);
                  }}
                  className={cn(
                    "grid w-full gap-3 rounded-2xl border p-4 text-left outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-65",
                    itemSelected
                      ? "border-primary/40 bg-primary/8"
                      : "border-border/70 hover:bg-muted/45 disabled:hover:bg-transparent",
                  )}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="block text-caption text-muted-readable">
                        {item.code} · {humanize(item.type)}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {link.store === null ? (
                        <Badge variant="destructive">
                          Linked store needs review
                        </Badge>
                      ) : !item.isActive || !link.store.isActive ? (
                        <Badge variant="warning">Inactive</Badge>
                      ) : null}
                      <Badge variant="outline" className="text-tabular">
                        {item.componentCount.toLocaleString("en-IN")} components
                      </Badge>
                    </span>
                  </span>

                  <span className="inline-flex items-center gap-1.5 text-caption text-muted-readable">
                    <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                    {locationSummary(item)}
                  </span>

                  {link.store === null ? (
                    <span className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-caption text-destructive">
                      {link.message}
                    </span>
                  ) : null}
                </button>
              );
            })}

            {visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-body-sm text-muted-readable">
                No authorized organization matches this search.
              </div>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ComponentStorePicker({
  stores,
  value,
  onValueChange,
  organizationId,
  allowAll = true,
  activeOnly = false,
  disabled = false,
  triggerLabel,
}: Readonly<{
  stores: readonly ComponentStoreOption[];
  value: string | undefined;
  onValueChange: (value: string | undefined) => void;
  organizationId?: string | undefined;
  allowAll?: boolean;
  activeOnly?: boolean;
  disabled?: boolean;
  triggerLabel?: string | undefined;
}>): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const selected = stores.find((item) => item.storeId === value);
  const query = normalizedSearch(search);
  const scopedStores = stores.filter(
    (item) =>
      (organizationId === undefined || item.orgUnitId === organizationId) &&
      (!activeOnly || item.isActive),
  );
  const visible = scopedStores.filter((item) =>
    includesSearch(
      [
        item.code,
        item.name,
        item.kind,
        item.orgUnitCode,
        item.orgUnitName,
        item.orgUnitType,
        item.addressLine1,
        item.addressLine2,
        item.city,
        item.district,
        item.state,
        item.postalCode,
      ],
      query,
    ),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setSearch("");
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            CONTROL_HEIGHT_CLASS_NAME,
            "max-w-[17rem] justify-start gap-2 rounded-xl px-3",
          )}
          disabled={disabled}
        >
          <PickerButtonContent
            label={selected?.name ?? triggerLabel ?? "All authorized stores"}
            secondary={
              selected === undefined
                ? organizationId === undefined
                  ? "Authorized stock locations"
                  : "Within selected organization"
                : `${selected.code} · ${selected.orgUnitName}`
            }
            icon={<MapPin aria-hidden="true" className="size-3.5 shrink-0" />}
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Stock location scope</DialogTitle>
          <DialogDescription>
            Select the physical stock location using store identity, owning
            organization, address, and operating status.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-readable"
            />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
              }}
              className="pl-9"
              placeholder="Search store, dealer, address, city, district, state, or PIN"
              maxLength={120}
              aria-label="Search authorized stock locations"
            />
          </div>

          <div className="grid max-h-[min(60dvh,34rem)] gap-2 overflow-y-auto overscroll-contain pr-1">
            {allowAll ? (
              <button
                type="button"
                onClick={() => {
                  onValueChange(undefined);
                  setOpen(false);
                }}
                className={cn(
                  "grid w-full gap-1 rounded-2xl border p-4 text-left outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  value === undefined
                    ? "border-primary/40 bg-primary/8"
                    : "border-border/70 hover:bg-muted/45",
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">
                    All authorized stores
                  </span>
                  {value === undefined ? (
                    <Check aria-hidden="true" className="size-4 text-primary" />
                  ) : null}
                </span>
                <span className="text-caption text-muted-readable">
                  Read-only monitoring scope. Direct component actions still use
                  each record&apos;s authoritative current store.
                </span>
              </button>
            ) : null}

            {visible.map((item) => (
              <button
                key={item.storeId}
                type="button"
                onClick={() => {
                  onValueChange(item.storeId);
                  setOpen(false);
                }}
                className={cn(
                  "grid w-full gap-2 rounded-2xl border p-4 text-left outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  item.storeId === value
                    ? "border-primary/40 bg-primary/8"
                    : "border-border/70 hover:bg-muted/45",
                )}
              >
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      {item.kind
                        .toLocaleLowerCase("en-US")
                        .includes("warehouse") ? (
                        <Warehouse
                          aria-hidden="true"
                          className="size-4 text-muted-readable"
                        />
                      ) : (
                        <Store
                          aria-hidden="true"
                          className="size-4 text-muted-readable"
                        />
                      )}
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="mt-0.5 block text-caption text-muted-readable">
                      {item.code} · {humanize(item.kind)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    {item.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="warning">Inactive</Badge>
                    )}
                    <Badge variant="outline" className="text-tabular">
                      {item.componentCount.toLocaleString("en-IN")}
                    </Badge>
                  </span>
                </span>
                <span className="text-body-sm text-foreground">
                  {item.orgUnitName}
                  <span className="text-muted-readable">
                    {" "}
                    · {item.orgUnitCode} · {humanize(item.orgUnitType)}
                  </span>
                </span>
                <span className="inline-flex items-start gap-1.5 text-caption text-muted-readable">
                  <MapPin
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0"
                  />
                  <span>{storeAddress(item)}</span>
                </span>
              </button>
            ))}

            {visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-body-sm text-muted-readable">
                No authorized stock location matches this search.
              </div>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

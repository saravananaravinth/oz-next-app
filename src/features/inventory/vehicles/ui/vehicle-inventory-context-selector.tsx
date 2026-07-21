// oz-next-app/src/features/inventory/vehicles/ui/vehicle-inventory-context-selector.tsx
"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Building2, LoaderCircle, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { fetchVehicleInventoryDealerContexts } from "@/features/inventory/vehicles/api/vehicle-inventory-context.client";
import type { VehicleInventoryDealerContextOption } from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
import type { TenantMembership } from "@/lib/api/contracts";

type TenantOption = Readonly<{
  value: string;
  label: string;
}>;

export type VehicleInventoryContextSelectorProps = Readonly<{
  tenants: readonly TenantMembership[];
  lockedTenantId: string | null;
}>;

const DEALER_PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 250;

function optionEquals<T extends { value: string }>(left: T, right: T): boolean {
  return left.value === right.value;
}

function dealerLabel(option: VehicleInventoryDealerContextOption): string {
  return `${option.name} · ${option.code}`;
}

function useDebouncedValue(value: string): string {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedValue(value.trim());
    }, SEARCH_DEBOUNCE_MS);

    return (): void => {
      window.clearTimeout(timeout);
    };
  }, [value]);

  return debouncedValue;
}

export function VehicleInventoryContextSelector({
  tenants,
  lockedTenantId,
}: VehicleInventoryContextSelectorProps): React.ReactElement {
  const tenantOptions = React.useMemo<readonly TenantOption[]>(() => {
    const options = tenants.map((tenant) => ({
      value: tenant.tenant_id,
      label: tenant.tenant_name,
    }));

    if (
      lockedTenantId !== null &&
      !options.some((option) => option.value === lockedTenantId)
    ) {
      return [{ value: lockedTenantId, label: "Current tenant" }, ...options];
    }

    return options;
  }, [lockedTenantId, tenants]);
  const initialTenant = React.useMemo(
    () =>
      lockedTenantId === null
        ? null
        : (tenantOptions.find((tenant) => tenant.value === lockedTenantId) ??
          null),
    [lockedTenantId, tenantOptions],
  );
  const [selectedTenant, setSelectedTenant] =
    React.useState<TenantOption | null>(initialTenant);
  const [selectedDealer, setSelectedDealer] =
    React.useState<VehicleInventoryDealerContextOption | null>(null);
  const [dealerSearch, setDealerSearch] = React.useState("");
  const debouncedDealerSearch = useDebouncedValue(dealerSearch);
  const tenantId = selectedTenant?.value ?? null;
  const dealerQuery = useInfiniteQuery({
    queryKey: ["inventory", "dealer-contexts", tenantId, debouncedDealerSearch],
    queryFn: async ({ pageParam, signal }) =>
      await fetchVehicleInventoryDealerContexts(
        {
          tenantId: tenantId ?? "",
          limit: DEALER_PAGE_SIZE,
          ...(debouncedDealerSearch.length === 0
            ? {}
            : { q: debouncedDealerSearch }),
          ...(pageParam === null ? {} : { cursor: pageParam }),
        },
        signal,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: tenantId !== null,
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const dealerOptions = React.useMemo(
    () => dealerQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [dealerQuery.data],
  );
  const dealerError = dealerQuery.isError
    ? "Dealer lookup failed. Retry or choose another tenant."
    : null;

  function changeTenant(value: TenantOption | null): void {
    setSelectedTenant(value);
    setSelectedDealer(null);
    setDealerSearch("");
  }

  function changeDealerSearch(value: string): void {
    setDealerSearch(value);

    if (
      selectedDealer !== null &&
      value.trim() !== dealerLabel(selectedDealer)
    ) {
      setSelectedDealer(null);
    }
  }

  return (
    <form action="/inventory/vehicles" method="get" className="grid gap-5">
      <div className="grid gap-1.5">
        <label
          className="text-body-sm text-foreground"
          htmlFor="inventory-tenant-context"
        >
          Tenant
        </label>
        <Combobox
          items={tenantOptions}
          value={selectedTenant}
          onValueChange={changeTenant}
          itemToStringLabel={(option) => option.label}
          itemToStringValue={(option) => option.value}
          isItemEqualToValue={optionEquals}
          readOnly={lockedTenantId !== null}
          required
        >
          <ComboboxInput
            id="inventory-tenant-context"
            placeholder="Search tenants"
            showClear={lockedTenantId === null}
            disabled={lockedTenantId !== null}
          />
          <ComboboxContent>
            <ComboboxList>
              {tenantOptions.map((option) => (
                <ComboboxItem key={option.value} value={option}>
                  <span className="truncate">{option.label}</span>
                </ComboboxItem>
              ))}
              <ComboboxEmpty>No authorized tenants found.</ComboboxEmpty>
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      <div className="grid gap-1.5">
        <label
          className="text-body-sm text-foreground"
          htmlFor="inventory-dealer-context"
        >
          Dealer organization
        </label>
        <Combobox
          items={dealerOptions}
          filteredItems={dealerOptions}
          value={selectedDealer}
          onValueChange={setSelectedDealer}
          inputValue={dealerSearch}
          onInputValueChange={changeDealerSearch}
          itemToStringLabel={dealerLabel}
          itemToStringValue={(option) => option.dealerOrgUnitId}
          isItemEqualToValue={(left, right) =>
            left.dealerOrgUnitId === right.dealerOrgUnitId
          }
          disabled={tenantId === null}
          required
        >
          <ComboboxInput
            id="inventory-dealer-context"
            placeholder={
              tenantId === null
                ? "Choose a tenant first"
                : "Search dealer name or code"
            }
            showClear
            disabled={tenantId === null}
            aria-describedby={
              dealerError === null ? undefined : "inventory-dealer-error"
            }
          >
            {dealerQuery.isFetching ? (
              <LoaderCircle
                aria-hidden="true"
                className="mr-1 size-4 animate-spin text-muted-readable motion-reduce:animate-none"
              />
            ) : null}
          </ComboboxInput>
          <ComboboxContent>
            <ComboboxList>
              {dealerOptions.map((option) => (
                <ComboboxItem key={option.dealerOrgUnitId} value={option}>
                  <span className="grid min-w-0">
                    <span className="truncate">{option.name}</span>
                    <span className="truncate text-caption text-muted-readable">
                      {option.code}
                    </span>
                  </span>
                </ComboboxItem>
              ))}
              <ComboboxEmpty>
                <span className="inline-flex items-center gap-2">
                  <SearchX aria-hidden="true" className="size-4" />
                  {dealerQuery.isFetching
                    ? "Searching dealers…"
                    : "No active dealers found."}
                </span>
              </ComboboxEmpty>
            </ComboboxList>
            {dealerQuery.hasNextPage ? (
              <div className="border-t border-border/70 p-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  disabled={dealerQuery.isFetchingNextPage}
                  onClick={() => void dealerQuery.fetchNextPage()}
                >
                  {dealerQuery.isFetchingNextPage
                    ? "Loading dealers…"
                    : "Load more dealers"}
                </Button>
              </div>
            ) : null}
          </ComboboxContent>
        </Combobox>
        {dealerError === null ? null : (
          <div className="flex items-center gap-3" role="alert">
            <p
              id="inventory-dealer-error"
              className="text-caption text-destructive"
            >
              {dealerError}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void dealerQuery.refetch()}
            >
              Retry dealer lookup
            </Button>
          </div>
        )}
      </div>

      {tenantId === null ? null : (
        <input type="hidden" name="tenantId" value={tenantId} />
      )}
      {selectedDealer === null ? null : (
        <input
          type="hidden"
          name="dealerOrgUnitId"
          value={selectedDealer.dealerOrgUnitId}
        />
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={tenantId === null || selectedDealer === null}
        >
          <Building2 aria-hidden="true" className="size-4" />
          Open vehicle inventory
        </Button>
      </div>
    </form>
  );
}

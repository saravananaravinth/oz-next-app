// oz-next-app/src/features/inventory/components/ui/component-inventory-filters.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Boxes, Filter, RotateCcw, SlidersHorizontal } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  COMPONENT_CUSTODY_STATES,
  COMPONENT_INVENTORY_TYPES,
  COMPONENT_OPERATIONAL_STATES,
  type ComponentCustodyState,
  type ComponentOperationalState,
  type ComponentInventorySearchParams,
  type ComponentInventoryType,
  type ComponentInventoryWorkspaceData,
} from "@/features/inventory/components/contracts/component-inventory.schema";
import type { ResolvedComponentInventoryAccess } from "@/features/inventory/components/policies/component-inventory.policy";
import { ComponentInventoryCreateDialog } from "@/features/inventory/components/ui/component-inventory-create-dialog";
import { ComponentOrganizationPicker } from "@/features/inventory/components/ui/component-inventory-scope-dialogs";
import {
  componentInventoryPageHref,
  componentInventoryResetHref,
} from "@/features/inventory/components/utils/component-inventory-url";

const ALL_STATES_VALUE = "__all_states__";
const ALL_OPERATIONAL_STATES_VALUE = "__all_operational_states__";
const ALL_TYPES_VALUE = "__all_types__";
const ALL_COMPONENTS_VALUE = "__all_components__";
const CONTROL_HEIGHT_CLASS_NAME = "h-9";

function humanize(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll("_", " ")
    .replace(/(^|\s)\p{L}/gu, (match) => match.toLocaleUpperCase("en-US"));
}

function selectedStateValue(query: ComponentInventorySearchParams): string {
  return query.state ?? ALL_STATES_VALUE;
}

function isComponentCustodyState(
  value: string,
): value is ComponentCustodyState {
  return COMPONENT_CUSTODY_STATES.some((state) => state === value);
}

function isComponentOperationalState(
  value: string,
): value is ComponentOperationalState {
  return COMPONENT_OPERATIONAL_STATES.some((state) => state === value);
}

function isComponentType(value: string): value is ComponentInventoryType {
  return COMPONENT_INVENTORY_TYPES.some((type) => type === value);
}

type Draft = Readonly<{
  operationalState: ComponentOperationalState | undefined;
  componentType: ComponentInventoryType | undefined;
  componentId: string | undefined;
}>;

function draftFromQuery(query: ComponentInventorySearchParams): Draft {
  return {
    operationalState: query.operationalState,
    componentType: query.componentType,
    componentId: query.componentId,
  };
}

function filterCount(query: ComponentInventorySearchParams): number {
  return [
    query.operationalState,
    query.componentType,
    query.componentId,
  ].filter((value) => value !== undefined).length;
}

function scopeDescription(
  query: ComponentInventorySearchParams,
  data: ComponentInventoryWorkspaceData,
): string {
  const store = data.contextOptions.stores.find(
    (item) => item.storeId === query.storeId,
  );
  if (store !== undefined) {
    return `${store.orgUnitName} · ${store.name}`;
  }

  const organization = data.contextOptions.organizations.find(
    (item) => item.orgUnitId === query.orgUnitId,
  );
  if (organization !== undefined) {
    return `${organization.name} · linked stock location not resolved`;
  }

  return "All authorized organizations · read-only monitoring";
}

function AdvancedFiltersDialog({
  query,
  data,
  pending,
  onApply,
}: Readonly<{
  query: ComponentInventorySearchParams;
  data: ComponentInventoryWorkspaceData;
  pending: boolean;
  onApply: (draft: Draft) => void;
}>): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(() => draftFromQuery(query));
  const activeCount = filterCount(query);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(draftFromQuery(query));
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`${CONTROL_HEIGHT_CLASS_NAME} rounded-xl`}
        >
          <SlidersHorizontal aria-hidden="true" className="size-3.5" />
          Filters
          {activeCount > 0 ? (
            <Badge
              variant="secondary"
              className="ml-0.5 h-5 min-w-5 justify-center px-1.5 text-tabular"
            >
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Component filters</DialogTitle>
          <DialogDescription>
            Narrow by vehicle-aware operational status, component family, or
            exact component master. Physical custody remains controlled by the
            toolbar state filter. Identity lookup remains in the application
            global search.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <div className="grid gap-2">
            <label
              className="text-body-sm font-medium"
              htmlFor="component-filter-operational-state"
            >
              Operational status
            </label>
            <Select
              value={draft.operationalState ?? ALL_OPERATIONAL_STATES_VALUE}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  operationalState: isComponentOperationalState(value)
                    ? value
                    : undefined,
                }));
              }}
              disabled={!data.facets.operationalStateAvailable}
            >
              <SelectTrigger id="component-filter-operational-state">
                <SelectValue placeholder="All operational statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_OPERATIONAL_STATES_VALUE}>
                  All operational statuses
                </SelectItem>
                {COMPONENT_OPERATIONAL_STATES.map((state) => {
                  const count = data.facets.operationalStates.find(
                    (item) => item.state === state,
                  )?.count;

                  return (
                    <SelectItem key={state} value={state}>
                      {humanize(state)}
                      {count === undefined
                        ? ""
                        : ` · ${count.toLocaleString("en-IN")}`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-caption text-muted-readable">
              {data.facets.operationalStateAvailable
                ? "Attached components inherit this status from the authoritative vehicle inventory state."
                : "Operational status filtering becomes available after the upgraded component API is active."}
            </p>
          </div>

          <div className="grid gap-2">
            <label
              className="text-body-sm font-medium"
              htmlFor="component-filter-type"
            >
              Component type
            </label>
            <Select
              value={draft.componentType ?? ALL_TYPES_VALUE}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  componentType: isComponentType(value) ? value : undefined,
                  componentId: undefined,
                }));
              }}
            >
              <SelectTrigger id="component-filter-type">
                <SelectValue placeholder="All component types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TYPES_VALUE}>
                  All component types
                </SelectItem>
                {COMPONENT_INVENTORY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {humanize(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label
              className="text-body-sm font-medium"
              htmlFor="component-filter-master"
            >
              Component master
            </label>
            <Select
              value={draft.componentId ?? ALL_COMPONENTS_VALUE}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  componentId:
                    value === ALL_COMPONENTS_VALUE ? undefined : value,
                }));
              }}
            >
              <SelectTrigger id="component-filter-master">
                <SelectValue placeholder="All component masters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_COMPONENTS_VALUE}>
                  All component masters
                </SelectItem>
                {data.facets.components
                  .filter(
                    (item) =>
                      draft.componentType === undefined ||
                      item.type === draft.componentType,
                  )
                  .map((item) => (
                    <SelectItem key={item.componentId} value={item.componentId}>
                      {item.name} · {item.code} ·{" "}
                      {item.count.toLocaleString("en-IN")}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={() => {
              onApply(draft);
              setOpen(false);
            }}
            disabled={pending}
          >
            <Filter aria-hidden="true" className="size-4" />
            Apply filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ComponentInventoryFilters({
  query,
  data,
  access,
}: Readonly<{
  query: ComponentInventorySearchParams;
  data: ComponentInventoryWorkspaceData;
  access: ResolvedComponentInventoryAccess;
}>): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const activeFilterCount = filterCount(query);

  const navigate = React.useCallback(
    (patch: Parameters<typeof componentInventoryPageHref>[1]): void => {
      const href = componentInventoryPageHref(query, {
        ...patch,
        focusComponentInventoryId: undefined,
        cursor: undefined,
      });
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [query, router],
  );

  function onStateChange(value: string): void {
    if (value === ALL_STATES_VALUE) {
      navigate({ q: undefined, state: undefined, includeAllStates: true });
      return;
    }
    if (isComponentCustodyState(value)) {
      navigate({ q: undefined, state: value, includeAllStates: false });
    }
  }

  return (
    <section
      aria-labelledby="component-inventory-title"
      aria-describedby="component-inventory-description"
      aria-busy={pending}
      className="relative h-[60px] min-h-[60px] max-h-[60px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs shadow-foreground/5"
    >
      <div className="no-scrollbar h-full overflow-x-auto overflow-y-hidden overscroll-x-contain">
        <div
          className="flex h-full min-w-max w-full items-center gap-3 px-4 sm:px-5"
          role="group"
          aria-label="Component inventory controls"
        >
          <div className="flex shrink-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-xs dark:bg-primary/10">
              <Boxes aria-hidden="true" className="size-4" />
            </span>
            <div className="flex shrink-0 flex-col justify-center gap-0.5">
              <h1
                id="component-inventory-title"
                className="whitespace-nowrap text-card-title leading-tight"
              >
                Component inventory
              </h1>
              <p
                id="component-inventory-description"
                className="max-w-[28rem] truncate whitespace-nowrap text-caption leading-tight text-muted-readable"
              >
                {scopeDescription(query, data)}
              </p>
            </div>
          </div>

          <div className="ms-auto flex shrink-0 items-center justify-end gap-2 ps-6">
            <ComponentOrganizationPicker
              organizations={data.contextOptions.organizations}
              stores={data.contextOptions.stores}
              value={query.orgUnitId}
              onValueChange={(selection) => {
                if (selection === undefined) {
                  navigate({ orgUnitId: undefined, storeId: undefined });
                  return;
                }

                navigate({
                  orgUnitId: selection.orgUnitId,
                  storeId: selection.storeId,
                });
              }}
            />

            <Select
              value={selectedStateValue(query)}
              onValueChange={onStateChange}
            >
              <SelectTrigger
                aria-label="Component custody status"
                className="w-[9.5rem] rounded-xl data-[size=default]:h-9"
              >
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATES_VALUE}>All status</SelectItem>
                {COMPONENT_CUSTODY_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {humanize(state)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilterCount > 0 ? (
              <Badge
                variant="secondary"
                className={`${CONTROL_HEIGHT_CLASS_NAME} shrink-0 rounded-xl px-2.5 text-tabular`}
              >
                {activeFilterCount} advanced
              </Badge>
            ) : null}

            <AdvancedFiltersDialog
              query={query}
              data={data}
              pending={pending}
              onApply={(draft) => {
                navigate({
                  operationalState: draft.operationalState,
                  componentType: draft.componentType,
                  componentId: draft.componentId,
                });
              }}
            />

            {access.capabilities.canCreate ? (
              <ComponentInventoryCreateDialog
                tenantId={access.tenantId}
                contextOptions={data.contextOptions}
                defaultStoreId={query.storeId}
              />
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={`${CONTROL_HEIGHT_CLASS_NAME} w-9 rounded-xl`}
                  asChild
                >
                  <a
                    href={componentInventoryResetHref(query)}
                    aria-label="Reset component inventory controls"
                  >
                    <RotateCcw aria-hidden="true" className="size-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Restore the default organization, custody and operational status
                filters. Global tenant selection is preserved by the
                authenticated application context.
              </TooltipContent>
            </Tooltip>

            {pending ? (
              <span
                role="status"
                aria-live="polite"
                className={`${CONTROL_HEIGHT_CLASS_NAME} inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2 text-caption text-muted-readable`}
              >
                <Spinner decorative />
                <span>Updating…</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

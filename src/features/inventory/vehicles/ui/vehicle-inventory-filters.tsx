// oz-next-app/src/features/inventory/vehicles/ui/vehicle-inventory-filters.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarRange,
  Check,
  Database,
  Filter,
  Layers3,
  MapPinned,
  PackageSearch,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/shared/hooks/use-debounce";

import {
  VEHICLE_INVENTORY_DATA_QUALITY_FLAGS,
  VEHICLE_INVENTORY_SORT_DIRECTIONS,
  VEHICLE_INVENTORY_SORT_FIELDS,
  vehicleInventorySearchParamsSchema,
  type VehicleInventoryFacetsResult,
  type VehicleInventorySearchParams,
  type VehicleInventorySortDirection,
  type VehicleInventorySortField,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
import {
  vehicleInventoryPageHref,
  vehicleInventoryResetHref,
} from "@/features/inventory/vehicles/utils/vehicle-inventory-url";

const MAX_RENDERED_FACET_OPTIONS = 200;
const MIN_LIVE_SEARCH_CHARACTERS = 3;
const LIVE_SEARCH_DELAY_MS = 350;
const FACET_SEARCH_THRESHOLD = 8;

const SORT_LABELS: Readonly<Record<VehicleInventorySortField, string>> = {
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

const SCOPE_VALUES = ["MY_STOCK", "SUB_DEALERS"] as const;
type ScopeValue = (typeof SCOPE_VALUES)[number];

type AdvancedFilterDraft = Readonly<{
  status: readonly string[];
  entryType: readonly string[];
  orgUnitId: readonly string[];
  storeId: readonly string[];
  modelId: readonly string[];
  variantId: readonly string[];
  fuel: readonly string[];
  segment: readonly string[];
  color: readonly string[];
  ageBucket: readonly string[];
  warning: readonly string[];
  metallic: boolean | undefined;
  registrationRequired: boolean | undefined;
  mrpMin: string;
  mrpMax: string;
  arrivalFrom: string;
  arrivalTo: string;
  transferFrom: string;
  transferTo: string;
}>;

type AdvancedArrayKey =
  | "status"
  | "entryType"
  | "orgUnitId"
  | "storeId"
  | "modelId"
  | "variantId"
  | "fuel"
  | "segment"
  | "color"
  | "ageBucket"
  | "warning";

type FilterOption = Readonly<{
  value: string;
  label: string;
  count?: number | undefined;
  active?: boolean | undefined;
}>;

type AdvancedSection = "lifecycle" | "product" | "location" | "quality";

type SectionPresentation = Readonly<{
  title: string;
  description: string;
  icon: LucideIcon;
}>;

const SECTION_PRESENTATION = {
  lifecycle: {
    title: "Lifecycle and age",
    description: "Stock state, transfer history, and aging.",
    icon: Database,
  },
  product: {
    title: "Product configuration",
    description: "Catalog, finish, fuel, and registration attributes.",
    icon: PackageSearch,
  },
  location: {
    title: "Location and commercial",
    description: "Authorized locations, MRP, and business dates.",
    icon: MapPinned,
  },
  quality: {
    title: "Data quality",
    description: "Configuration and reconciliation warnings.",
    icon: ShieldAlert,
  },
} as const satisfies Readonly<Record<AdvancedSection, SectionPresentation>>;

const MAX_SELECTIONS: Readonly<Record<AdvancedArrayKey, number>> = {
  status: 32,
  entryType: 2,
  orgUnitId: 100,
  storeId: 100,
  modelId: 100,
  variantId: 100,
  fuel: 32,
  segment: 64,
  color: 64,
  ageBucket: 5,
  warning: VEHICLE_INVENTORY_DATA_QUALITY_FLAGS.length,
};

function isSortField(value: string): value is VehicleInventorySortField {
  return VEHICLE_INVENTORY_SORT_FIELDS.some((candidate) => candidate === value);
}

function isSortDirection(
  value: string,
): value is VehicleInventorySortDirection {
  return VEHICLE_INVENTORY_SORT_DIRECTIONS.some(
    (candidate) => candidate === value,
  );
}

function isScopeValue(value: string): value is ScopeValue {
  return SCOPE_VALUES.some((candidate) => candidate === value);
}

function humanizeToken(value: string): string {
  if (!/^[A-Z0-9_]+$/u.test(value)) {
    return value;
  }

  return value
    .toLocaleLowerCase("en-US")
    .replaceAll("_", " ")
    .replace(/(^|\s)\p{L}/gu, (match) => match.toLocaleUpperCase("en-US"));
}

function createAdvancedDraft(
  query: VehicleInventorySearchParams,
): AdvancedFilterDraft {
  return {
    status: query.status,
    entryType: query.entryType,
    orgUnitId: query.orgUnitId,
    storeId: query.storeId,
    modelId: query.modelId,
    variantId: query.variantId,
    fuel: query.fuel,
    segment: query.segment,
    color: query.color,
    ageBucket: query.ageBucket,
    warning: query.warning,
    metallic: query.metallic,
    registrationRequired: query.registrationRequired,
    mrpMin: query.mrpMin === undefined ? "" : String(query.mrpMin),
    mrpMax: query.mrpMax === undefined ? "" : String(query.mrpMax),
    arrivalFrom: query.arrivalFrom ?? "",
    arrivalTo: query.arrivalTo ?? "",
    transferFrom: query.transferFrom ?? "",
    transferTo: query.transferTo ?? "",
  };
}

function createEmptyAdvancedDraft(): AdvancedFilterDraft {
  return {
    status: [],
    entryType: [],
    orgUnitId: [],
    storeId: [],
    modelId: [],
    variantId: [],
    fuel: [],
    segment: [],
    color: [],
    ageBucket: [],
    warning: [],
    metallic: undefined,
    registrationRequired: undefined,
    mrpMin: "",
    mrpMax: "",
    arrivalFrom: "",
    arrivalTo: "",
    transferFrom: "",
    transferTo: "",
  };
}

function countAdvancedFilters(draft: AdvancedFilterDraft): number {
  return (
    draft.status.length +
    draft.entryType.length +
    draft.orgUnitId.length +
    draft.storeId.length +
    draft.modelId.length +
    draft.variantId.length +
    draft.fuel.length +
    draft.segment.length +
    draft.color.length +
    draft.ageBucket.length +
    draft.warning.length +
    (draft.metallic === undefined ? 0 : 1) +
    (draft.registrationRequired === undefined ? 0 : 1) +
    (draft.mrpMin.length === 0 ? 0 : 1) +
    (draft.mrpMax.length === 0 ? 0 : 1) +
    (draft.arrivalFrom.length === 0 ? 0 : 1) +
    (draft.arrivalTo.length === 0 ? 0 : 1) +
    (draft.transferFrom.length === 0 ? 0 : 1) +
    (draft.transferTo.length === 0 ? 0 : 1)
  );
}

function sectionFilterCount(
  section: AdvancedSection,
  draft: AdvancedFilterDraft,
): number {
  switch (section) {
    case "lifecycle":
      return (
        draft.status.length + draft.entryType.length + draft.ageBucket.length
      );
    case "product":
      return (
        draft.modelId.length +
        draft.variantId.length +
        draft.color.length +
        draft.fuel.length +
        draft.segment.length +
        (draft.metallic === undefined ? 0 : 1) +
        (draft.registrationRequired === undefined ? 0 : 1)
      );
    case "location":
      return (
        draft.orgUnitId.length +
        draft.storeId.length +
        (draft.mrpMin.length === 0 ? 0 : 1) +
        (draft.mrpMax.length === 0 ? 0 : 1) +
        (draft.arrivalFrom.length === 0 ? 0 : 1) +
        (draft.arrivalTo.length === 0 ? 0 : 1) +
        (draft.transferFrom.length === 0 ? 0 : 1) +
        (draft.transferTo.length === 0 ? 0 : 1)
      );
    case "quality":
      return draft.warning.length;
  }
}

function defaultExpandedSections(
  draft: AdvancedFilterDraft,
): AdvancedSection[] {
  const active = (
    Object.keys(SECTION_PRESENTATION) as AdvancedSection[]
  ).filter((section) => sectionFilterCount(section, draft) > 0);

  return active.length > 0 ? active : ["lifecycle"];
}

function toggleArrayValue(
  values: readonly string[],
  value: string,
  checked: boolean,
  maximum: number,
): readonly string[] {
  if (checked) {
    if (values.includes(value) || values.length >= maximum) {
      return values;
    }

    return [...values, value];
  }

  return values.filter((candidate) => candidate !== value);
}

function optionalInput(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length === 0 ? undefined : normalized;
}

function validationMessage(
  error: Readonly<{ issues: ReadonlyArray<Readonly<{ message: string }>> }>,
): string {
  return error.issues[0]?.message ?? "Review the filter values and try again.";
}

function FieldShell({
  id,
  label,
  hint,
  children,
  className,
}: Readonly<{
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}>): React.ReactElement {
  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <Label htmlFor={id} className="text-caption text-foreground">
        {label}
      </Label>
      {children}
      {hint === undefined ? null : (
        <p className="min-h-4 text-caption text-muted-readable">{hint}</p>
      )}
    </div>
  );
}

function SearchInventoryControl({
  query,
  navigate,
  pending,
}: Readonly<{
  query: VehicleInventorySearchParams;
  navigate: (overrides: Partial<VehicleInventorySearchParams>) => void;
  pending: boolean;
}>): React.ReactElement {
  const inputId = React.useId();
  const [value, setValue] = React.useState(query.q ?? "");
  const debouncedValue = useDebounce(value, LIVE_SEARCH_DELAY_MS, {
    trailing: true,
    maxWait: 800,
  });
  const normalizedValue = value.trim();
  const waitingForMinimum =
    normalizedValue.length > 0 &&
    normalizedValue.length < MIN_LIVE_SEARCH_CHARACTERS;

  React.useEffect(() => {
    const normalized = debouncedValue.trim();

    if (
      normalized.length > 0 &&
      normalized.length < MIN_LIVE_SEARCH_CHARACTERS
    ) {
      return;
    }

    const nextQuery = normalized.length === 0 ? undefined : normalized;
    if (nextQuery === query.q) {
      return;
    }

    navigate({ q: nextQuery, cursor: undefined });
  }, [debouncedValue, navigate, query.q]);

  return (
    <FieldShell
      id={inputId}
      label="Search inventory"
      hint={
        waitingForMinimum
          ? `Enter at least ${String(MIN_LIVE_SEARCH_CHARACTERS)} characters. Existing results remain visible.`
          : "VIN, model, variant, color, store, or organization."
      }
      className="xl:min-w-[20rem]"
    >
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-readable"
        />
        <Input
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => {
            setValue(event.currentTarget.value.slice(0, 100));
          }}
          maxLength={100}
          placeholder="Search authorized stock…"
          className={cn(
            "h-11 pl-9 pr-10",
            waitingForMinimum && "border-warning/50",
          )}
          aria-describedby={`${inputId}-hint`}
          autoComplete="off"
          spellCheck={false}
        />
        {pending ? (
          <Spinner
            label="Updating inventory search"
            className="absolute right-3 top-1/2 size-4 -translate-y-1/2"
          />
        ) : value.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            aria-label="Clear inventory search"
            onClick={() => {
              setValue("");
            }}
          >
            <X aria-hidden="true" className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <span id={`${inputId}-hint`} className="sr-only">
        Live search starts after three characters and updates automatically.
      </span>
    </FieldShell>
  );
}

function InventoryScopeControl({
  query,
  canIncludeSubDealerStock,
  eligibleSubDealerCount,
  navigate,
}: Readonly<{
  query: VehicleInventorySearchParams;
  canIncludeSubDealerStock: boolean;
  eligibleSubDealerCount: number;
  navigate: (overrides: Partial<VehicleInventorySearchParams>) => void;
}>): React.ReactElement {
  const controlId = React.useId();
  const selected: ScopeValue[] = [
    ...(query.includeMyStock ? (["MY_STOCK"] as const) : []),
    ...(query.includeSubDealerStock ? (["SUB_DEALERS"] as const) : []),
  ];

  return (
    <FieldShell
      id={controlId}
      label="Inventory scope"
      hint={
        canIncludeSubDealerStock
          ? `${eligibleSubDealerCount.toLocaleString("en-IN")} authorized sub-dealer${eligibleSubDealerCount === 1 ? "" : "s"} available.`
          : "Sub-dealer stock is unavailable for this dealer hierarchy."
      }
      className="xl:min-w-[20rem]"
    >
      <ToggleGroup
        id={controlId}
        type="multiple"
        value={selected}
        onValueChange={(values) => {
          const normalized = values.filter(isScopeValue);
          if (normalized.length === 0) {
            return;
          }

          navigate({
            includeMyStock: normalized.includes("MY_STOCK"),
            includeSubDealerStock: normalized.includes("SUB_DEALERS"),
            cursor: undefined,
          });
        }}
        variant="outline"
        spacing={1}
        className="grid h-11 w-full grid-cols-2 rounded-2xl border border-border/70 bg-background/55 p-1"
        aria-label="Inventory scope"
      >
        <ToggleGroupItem
          value="MY_STOCK"
          className="h-9 min-w-0 justify-center rounded-xl px-3 data-[state=on]:border-primary/25 data-[state=on]:bg-primary/12 data-[state=on]:text-primary"
        >
          <Layers3 aria-hidden="true" className="size-4" />
          <span className="truncate">My stock</span>
        </ToggleGroupItem>
        <ToggleGroupItem
          value="SUB_DEALERS"
          disabled={!canIncludeSubDealerStock}
          className="h-9 min-w-0 justify-center rounded-xl px-3 data-[state=on]:border-primary/25 data-[state=on]:bg-primary/12 data-[state=on]:text-primary"
          aria-label={
            canIncludeSubDealerStock
              ? `Include stock from ${eligibleSubDealerCount.toLocaleString("en-IN")} authorized sub-dealers`
              : "Sub-dealer stock unavailable"
          }
          title={
            canIncludeSubDealerStock
              ? `Include stock from ${eligibleSubDealerCount.toLocaleString("en-IN")} authorized sub-dealer${eligibleSubDealerCount === 1 ? "" : "s"}.`
              : "No authorized sub-dealer inventory is available in this hierarchy."
          }
        >
          <Layers3 aria-hidden="true" className="size-4" />
          <span className="truncate">Sub-dealers</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </FieldShell>
  );
}

function FilterOptionGroup({
  label,
  description,
  options,
  selected,
  maximum,
  searchable = true,
  onChange,
}: Readonly<{
  label: string;
  description?: string;
  options: readonly FilterOption[];
  selected: readonly string[];
  maximum: number;
  searchable?: boolean;
  onChange: (values: readonly string[]) => void;
}>): React.ReactElement {
  const baseId = React.useId();
  const [searchValue, setSearchValue] = React.useState("");
  const selectedValues = React.useMemo(() => new Set(selected), [selected]);
  const normalizedSearch = searchValue.trim().toLocaleLowerCase("en-US");
  const optionValues = React.useMemo(
    () => new Set(options.map((option) => option.value)),
    [options],
  );
  const unavailableSelectionCount = selected.filter(
    (value) => !optionValues.has(value),
  ).length;

  const filteredOptions = React.useMemo(() => {
    const matched =
      normalizedSearch.length === 0
        ? options
        : options.filter((option) => {
            const labelValue = humanizeToken(option.label).toLocaleLowerCase(
              "en-US",
            );
            return (
              labelValue.includes(normalizedSearch) ||
              option.value.toLocaleLowerCase("en-US").includes(normalizedSearch)
            );
          });

    return [...matched].sort((left, right) => {
      const selectedOrder =
        Number(selectedValues.has(right.value)) -
        Number(selectedValues.has(left.value));

      return (
        selectedOrder ||
        humanizeToken(left.label).localeCompare(
          humanizeToken(right.label),
          "en-IN",
        )
      );
    });
  }, [normalizedSearch, options, selectedValues]);

  const rendered = filteredOptions.slice(0, MAX_RENDERED_FACET_OPTIONS);
  const truncated = filteredOptions.length > rendered.length;
  const selectionLimitReached = selected.length >= maximum;

  return (
    <fieldset className="grid min-w-0 content-start gap-3 rounded-2xl border border-border/70 bg-background/55 p-3.5 shadow-xs">
      <legend className="sr-only">{label}</legend>

      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-body-sm font-medium text-foreground">
              {label}
            </h4>
            {selected.length > 0 ? (
              <Badge variant="secondary" className="text-tabular">
                {selected.length.toLocaleString("en-IN")} selected
              </Badge>
            ) : null}
          </div>
          {description === undefined ? null : (
            <p className="mt-0.5 text-caption text-muted-readable">
              {description}
            </p>
          )}
        </div>

        {selected.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2"
            onClick={() => {
              onChange([]);
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {searchable && options.length >= FACET_SEARCH_THRESHOLD ? (
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-readable"
          />
          <Input
            type="search"
            value={searchValue}
            onChange={(event) => {
              setSearchValue(event.currentTarget.value.slice(0, 100));
            }}
            placeholder={`Search ${label.toLocaleLowerCase("en-US")}…`}
            className="h-9 pl-9 pr-9"
            aria-label={`Search ${label.toLocaleLowerCase("en-US")}`}
            autoComplete="off"
            spellCheck={false}
          />
          {searchValue.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              aria-label={`Clear ${label.toLocaleLowerCase("en-US")} search`}
              onClick={() => {
                setSearchValue("");
              }}
            >
              <X aria-hidden="true" className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="max-h-56 space-y-1 overflow-y-auto overscroll-contain pr-1">
        {rendered.length === 0 ? (
          <div className="grid place-items-center gap-2 rounded-xl border border-dashed border-border/70 px-3 py-7 text-center">
            <Search aria-hidden="true" className="size-5 text-muted-readable" />
            <p className="text-caption text-muted-readable">
              No authorized options match this search.
            </p>
          </div>
        ) : (
          rendered.map((option, index) => {
            const id = `${baseId}-${String(index)}`;
            const checked = selectedValues.has(option.value);
            const disabled = !checked && selectionLimitReached;

            return (
              <label
                key={option.value}
                htmlFor={id}
                className={cn(
                  "group flex min-h-10 items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-body-sm transition-colors hover:border-border/70 hover:bg-muted/55 motion-reduce:transition-none",
                  checked && "border-primary/15 bg-primary/[0.055]",
                  disabled && "cursor-not-allowed opacity-50",
                  option.active === false && "opacity-60",
                )}
              >
                <Checkbox
                  id={id}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(nextChecked) => {
                    onChange(
                      toggleArrayValue(
                        selected,
                        option.value,
                        nextChecked === true,
                        maximum,
                      ),
                    );
                  }}
                />
                <span className="min-w-0 flex-1 truncate">
                  {humanizeToken(option.label)}
                </span>
                {option.active === false ? (
                  <Badge variant="outline" className="shrink-0 text-[0.625rem]">
                    Inactive
                  </Badge>
                ) : null}
                {option.count === undefined ? null : (
                  <span className="shrink-0 text-tabular text-caption text-muted-readable">
                    {option.count.toLocaleString("en-IN")}
                  </span>
                )}
                {checked ? (
                  <Check
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-primary"
                  />
                ) : null}
              </label>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-readable">
        <span>
          {filteredOptions.length.toLocaleString("en-IN")} matching option
          {filteredOptions.length === 1 ? "" : "s"}
        </span>
        <span>
          Maximum {maximum.toLocaleString("en-IN")} selection
          {maximum === 1 ? "" : "s"}
        </span>
      </div>

      {selectionLimitReached ? (
        <p className="rounded-xl border border-warning/25 bg-warning/10 px-3 py-2 text-caption text-warning-foreground">
          The selection limit has been reached. Clear an existing value before
          adding another.
        </p>
      ) : null}

      {unavailableSelectionCount > 0 ? (
        <p className="rounded-xl border border-info/25 bg-info/10 px-3 py-2 text-caption text-info">
          {unavailableSelectionCount.toLocaleString("en-IN")} selected value
          {unavailableSelectionCount === 1 ? " is" : "s are"} retained but
          unavailable in the current facet snapshot.
        </p>
      ) : null}

      {truncated ? (
        <p className="text-caption text-muted-readable">
          Showing the first {MAX_RENDERED_FACET_OPTIONS.toLocaleString("en-IN")}{" "}
          matching options. Use the local search to narrow the list.
        </p>
      ) : null}
    </fieldset>
  );
}

function TriStateSelect({
  id,
  label,
  value,
  trueLabel,
  falseLabel,
  onChange,
}: Readonly<{
  id: string;
  label: string;
  value: boolean | undefined;
  trueLabel: string;
  falseLabel: string;
  onChange: (value: boolean | undefined) => void;
}>): React.ReactElement {
  const selected = value === undefined ? "ANY" : String(value);

  return (
    <FieldShell id={id} label={label}>
      <Select
        value={selected}
        onValueChange={(nextValue) => {
          onChange(nextValue === "ANY" ? undefined : nextValue === "true");
        }}
      >
        <SelectTrigger id={id} className="h-11 w-full">
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value="ANY">Any</SelectItem>
          <SelectItem value="true">{trueLabel}</SelectItem>
          <SelectItem value="false">{falseLabel}</SelectItem>
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

function SectionTrigger({
  section,
  count,
}: Readonly<{
  section: AdvancedSection;
  count: number;
}>): React.ReactElement {
  const presentation = SECTION_PRESENTATION[section];
  const Icon = presentation.icon;

  return (
    <AccordionTrigger className="rounded-2xl px-3 py-3 hover:bg-muted/45 hover:no-underline">
      <span className="flex min-w-0 items-center gap-3 pr-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border/70 bg-muted/55 text-muted-readable">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0 text-left">
          <span className="flex flex-wrap items-center gap-2 text-card-title">
            {presentation.title}
            {count > 0 ? (
              <Badge variant="secondary" className="text-tabular">
                {count.toLocaleString("en-IN")}
              </Badge>
            ) : null}
          </span>
          <span className="mt-0.5 block text-caption font-normal text-muted-readable">
            {presentation.description}
          </span>
        </span>
      </span>
    </AccordionTrigger>
  );
}

function AdvancedFiltersDialog({
  query,
  facets,
  filterCount,
  pending,
  onApply,
}: Readonly<{
  query: VehicleInventorySearchParams;
  facets: VehicleInventoryFacetsResult;
  filterCount: number;
  pending: boolean;
  onApply: (query: VehicleInventorySearchParams) => void;
}>): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<AdvancedFilterDraft>(() =>
    createAdvancedDraft(query),
  );
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );
  const accordionKey = React.useId();
  const draftFilterCount = countAdvancedFilters(draft);

  const modelLabels = React.useMemo(
    () => new Map(facets.models.map((option) => [option.value, option.label])),
    [facets.models],
  );
  const orgUnitLabels = React.useMemo(
    () =>
      new Map(facets.orgUnits.map((option) => [option.value, option.label])),
    [facets.orgUnits],
  );
  const variantOptions = React.useMemo<readonly FilterOption[]>(
    () =>
      facets.variants.map((option) => ({
        ...option,
        label:
          option.parentId === undefined || option.parentId === null
            ? option.label
            : `${option.label} · ${modelLabels.get(option.parentId) ?? "Model"}`,
      })),
    [facets.variants, modelLabels],
  );
  const storeOptions = React.useMemo<readonly FilterOption[]>(
    () =>
      facets.stores.map((option) => ({
        ...option,
        label:
          option.parentId === undefined || option.parentId === null
            ? option.label
            : `${option.label} · ${orgUnitLabels.get(option.parentId) ?? "Organization"}`,
      })),
    [facets.stores, orgUnitLabels],
  );

  function updateArray(key: AdvancedArrayKey, values: readonly string[]): void {
    setDraft((current) => ({ ...current, [key]: values }));
    setValidationError(null);
  }

  function applyDraft(event: React.SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();

    const candidate = vehicleInventorySearchParamsSchema.safeParse({
      ...query,
      status: [...draft.status],
      entryType: [...draft.entryType],
      orgUnitId: [...draft.orgUnitId],
      storeId: [...draft.storeId],
      modelId: [...draft.modelId],
      variantId: [...draft.variantId],
      fuel: [...draft.fuel],
      segment: [...draft.segment],
      color: [...draft.color],
      ageBucket: [...draft.ageBucket],
      warning: [...draft.warning],
      metallic: draft.metallic,
      registrationRequired: draft.registrationRequired,
      mrpMin: optionalInput(draft.mrpMin),
      mrpMax: optionalInput(draft.mrpMax),
      arrivalFrom: optionalInput(draft.arrivalFrom),
      arrivalTo: optionalInput(draft.arrivalTo),
      transferFrom: optionalInput(draft.transferFrom),
      transferTo: optionalInput(draft.transferTo),
      kpi: undefined,
      cursor: undefined,
    });

    if (!candidate.success) {
      setValidationError(validationMessage(candidate.error));
      return;
    }

    setValidationError(null);
    setOpen(false);
    onApply(candidate.data);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setDraft(createAdvancedDraft(query));
          setValidationError(null);
        }
        setOpen(nextOpen);
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="h-11 shrink-0">
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              Filters
              {filterCount > 0 ? (
                <Badge variant="secondary" className="ml-1 text-tabular">
                  {filterCount.toLocaleString("en-IN")}
                </Badge>
              ) : null}
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          Open advanced filters. Draft changes apply only after confirmation.
        </TooltipContent>
      </Tooltip>

      <DialogContent className="grid max-h-[min(92svh,58rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-border/70 px-5 py-5 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-4 pr-8">
            <div className="min-w-0">
              <DialogTitle>Filter vehicle inventory</DialogTitle>
              <DialogDescription className="mt-1 max-w-3xl">
                Refine authorized stock using bounded, server-validated filters.
                Quick controls remain unchanged; applying advanced filters
                clears an active KPI shortcut.
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-border/70 bg-muted/40 px-3 py-2">
              <Filter
                aria-hidden="true"
                className="size-4 text-muted-readable"
              />
              <span className="text-caption text-muted-readable">Draft</span>
              <Badge
                variant={draftFilterCount > 0 ? "default" : "secondary"}
                className="text-tabular"
              >
                {draftFilterCount.toLocaleString("en-IN")}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <form
          id="vehicle-inventory-advanced-filters"
          onSubmit={applyDraft}
          className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
        >
          <Accordion
            key={`${accordionKey}-${open ? "open" : "closed"}`}
            type="multiple"
            defaultValue={defaultExpandedSections(draft)}
            className="grid gap-3"
          >
            <AccordionItem
              value="lifecycle"
              className="rounded-2xl border border-border/70 bg-card/65 px-1"
            >
              <SectionTrigger
                section="lifecycle"
                count={sectionFilterCount("lifecycle", draft)}
              />
              <AccordionContent className="px-2 pb-4 sm:px-3">
                <div className="grid gap-3 lg:grid-cols-3">
                  <FilterOptionGroup
                    label="Statuses"
                    description="Authoritative inventory lifecycle states."
                    options={facets.statuses}
                    selected={draft.status}
                    maximum={MAX_SELECTIONS.status}
                    onChange={(values) => {
                      updateArray("status", values);
                    }}
                  />
                  <FilterOptionGroup
                    label="Entry types"
                    description="Current stock or historical transfers."
                    options={facets.entryTypes}
                    selected={draft.entryType}
                    maximum={MAX_SELECTIONS.entryType}
                    searchable={false}
                    onChange={(values) => {
                      updateArray("entryType", values);
                    }}
                  />
                  <FilterOptionGroup
                    label="Age buckets"
                    description="Elapsed days since verified arrival."
                    options={facets.ageBuckets}
                    selected={draft.ageBucket}
                    maximum={MAX_SELECTIONS.ageBucket}
                    searchable={false}
                    onChange={(values) => {
                      updateArray("ageBucket", values);
                    }}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="product"
              className="rounded-2xl border border-border/70 bg-card/65 px-1"
            >
              <SectionTrigger
                section="product"
                count={sectionFilterCount("product", draft)}
              />
              <AccordionContent className="px-2 pb-4 sm:px-3">
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  <FilterOptionGroup
                    label="Models"
                    options={facets.models}
                    selected={draft.modelId}
                    maximum={MAX_SELECTIONS.modelId}
                    onChange={(values) => {
                      updateArray("modelId", values);
                    }}
                  />
                  <FilterOptionGroup
                    label="Variants"
                    options={variantOptions}
                    selected={draft.variantId}
                    maximum={MAX_SELECTIONS.variantId}
                    onChange={(values) => {
                      updateArray("variantId", values);
                    }}
                  />
                  <FilterOptionGroup
                    label="Colors"
                    options={facets.colors}
                    selected={draft.color}
                    maximum={MAX_SELECTIONS.color}
                    onChange={(values) => {
                      updateArray("color", values);
                    }}
                  />
                  <FilterOptionGroup
                    label="Fuel"
                    options={facets.fuels}
                    selected={draft.fuel}
                    maximum={MAX_SELECTIONS.fuel}
                    onChange={(values) => {
                      updateArray("fuel", values);
                    }}
                  />
                  <FilterOptionGroup
                    label="Segment"
                    options={facets.segments}
                    selected={draft.segment}
                    maximum={MAX_SELECTIONS.segment}
                    onChange={(values) => {
                      updateArray("segment", values);
                    }}
                  />
                  <div className="grid content-start gap-4 rounded-2xl border border-border/70 bg-background/55 p-3.5 shadow-xs">
                    <div>
                      <h4 className="text-body-sm font-medium text-foreground">
                        Vehicle attributes
                      </h4>
                      <p className="mt-0.5 text-caption text-muted-readable">
                        Optional finish and registration characteristics.
                      </p>
                    </div>
                    <TriStateSelect
                      id="inventory-filter-metallic"
                      label="Finish"
                      value={draft.metallic}
                      trueLabel="Metallic"
                      falseLabel="Matt / non-metallic"
                      onChange={(value) => {
                        setDraft((current) => ({
                          ...current,
                          metallic: value,
                        }));
                        setValidationError(null);
                      }}
                    />
                    <TriStateSelect
                      id="inventory-filter-registration"
                      label="Registration"
                      value={draft.registrationRequired}
                      trueLabel="Required"
                      falseLabel="Not required"
                      onChange={(value) => {
                        setDraft((current) => ({
                          ...current,
                          registrationRequired: value,
                        }));
                        setValidationError(null);
                      }}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="location"
              className="rounded-2xl border border-border/70 bg-card/65 px-1"
            >
              <SectionTrigger
                section="location"
                count={sectionFilterCount("location", draft)}
              />
              <AccordionContent className="px-2 pb-4 sm:px-3">
                <div className="grid gap-3 lg:grid-cols-2">
                  <FilterOptionGroup
                    label="Organization units"
                    options={facets.orgUnits}
                    selected={draft.orgUnitId}
                    maximum={MAX_SELECTIONS.orgUnitId}
                    onChange={(values) => {
                      updateArray("orgUnitId", values);
                    }}
                  />
                  <FilterOptionGroup
                    label="Stores"
                    options={storeOptions}
                    selected={draft.storeId}
                    maximum={MAX_SELECTIONS.storeId}
                    onChange={(values) => {
                      updateArray("storeId", values);
                    }}
                  />
                </div>

                <Separator className="my-5" />

                <div className="grid gap-5 xl:grid-cols-2">
                  <section
                    className="grid gap-3 rounded-2xl border border-border/70 bg-background/55 p-4"
                    aria-labelledby="inventory-price-range-title"
                  >
                    <div>
                      <h4
                        id="inventory-price-range-title"
                        className="text-body-sm font-medium text-foreground"
                      >
                        MRP range
                      </h4>
                      <p className="mt-0.5 text-caption text-muted-readable">
                        Available facet range:{" "}
                        {facets.mrp.minimum === null
                          ? "not configured"
                          : facets.mrp.minimum.toLocaleString("en-IN")}{" "}
                        –{" "}
                        {facets.mrp.maximum === null
                          ? "not configured"
                          : facets.mrp.maximum.toLocaleString("en-IN")}{" "}
                        {facets.mrp.currency ?? ""}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FieldShell
                        id="inventory-filter-mrp-min"
                        label="Minimum MRP"
                      >
                        <Input
                          id="inventory-filter-mrp-min"
                          type="number"
                          min={0}
                          max={1_000_000_000}
                          step="0.01"
                          value={draft.mrpMin}
                          onChange={(event) => {
                            setDraft((current) => ({
                              ...current,
                              mrpMin: event.currentTarget.value,
                            }));
                            setValidationError(null);
                          }}
                          inputMode="decimal"
                          placeholder="No minimum"
                        />
                      </FieldShell>
                      <FieldShell
                        id="inventory-filter-mrp-max"
                        label="Maximum MRP"
                      >
                        <Input
                          id="inventory-filter-mrp-max"
                          type="number"
                          min={0}
                          max={1_000_000_000}
                          step="0.01"
                          value={draft.mrpMax}
                          onChange={(event) => {
                            setDraft((current) => ({
                              ...current,
                              mrpMax: event.currentTarget.value,
                            }));
                            setValidationError(null);
                          }}
                          inputMode="decimal"
                          placeholder="No maximum"
                        />
                      </FieldShell>
                    </div>
                  </section>

                  <section
                    className="grid gap-4 rounded-2xl border border-border/70 bg-background/55 p-4"
                    aria-labelledby="inventory-date-range-title"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border/70 bg-muted/55 text-muted-readable">
                        <CalendarRange aria-hidden="true" className="size-4" />
                      </span>
                      <div>
                        <h4
                          id="inventory-date-range-title"
                          className="text-body-sm font-medium text-foreground"
                        >
                          Business date ranges
                        </h4>
                        <p className="mt-0.5 text-caption text-muted-readable">
                          Arrival and transfer boundaries are inclusive.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FieldShell
                        id="inventory-filter-arrival-from"
                        label="Arrival from"
                      >
                        <Input
                          id="inventory-filter-arrival-from"
                          type="date"
                          value={draft.arrivalFrom}
                          max={
                            draft.arrivalTo.length === 0
                              ? undefined
                              : draft.arrivalTo
                          }
                          onChange={(event) => {
                            setDraft((current) => ({
                              ...current,
                              arrivalFrom: event.currentTarget.value,
                            }));
                            setValidationError(null);
                          }}
                        />
                      </FieldShell>
                      <FieldShell
                        id="inventory-filter-arrival-to"
                        label="Arrival to"
                      >
                        <Input
                          id="inventory-filter-arrival-to"
                          type="date"
                          value={draft.arrivalTo}
                          min={
                            draft.arrivalFrom.length === 0
                              ? undefined
                              : draft.arrivalFrom
                          }
                          onChange={(event) => {
                            setDraft((current) => ({
                              ...current,
                              arrivalTo: event.currentTarget.value,
                            }));
                            setValidationError(null);
                          }}
                        />
                      </FieldShell>
                      <FieldShell
                        id="inventory-filter-transfer-from"
                        label="Transfer from"
                      >
                        <Input
                          id="inventory-filter-transfer-from"
                          type="date"
                          value={draft.transferFrom}
                          max={
                            draft.transferTo.length === 0
                              ? undefined
                              : draft.transferTo
                          }
                          onChange={(event) => {
                            setDraft((current) => ({
                              ...current,
                              transferFrom: event.currentTarget.value,
                            }));
                            setValidationError(null);
                          }}
                        />
                      </FieldShell>
                      <FieldShell
                        id="inventory-filter-transfer-to"
                        label="Transfer to"
                      >
                        <Input
                          id="inventory-filter-transfer-to"
                          type="date"
                          value={draft.transferTo}
                          min={
                            draft.transferFrom.length === 0
                              ? undefined
                              : draft.transferFrom
                          }
                          onChange={(event) => {
                            setDraft((current) => ({
                              ...current,
                              transferTo: event.currentTarget.value,
                            }));
                            setValidationError(null);
                          }}
                        />
                      </FieldShell>
                    </div>
                  </section>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="quality"
              className="rounded-2xl border border-border/70 bg-card/65 px-1"
            >
              <SectionTrigger
                section="quality"
                count={sectionFilterCount("quality", draft)}
              />
              <AccordionContent className="px-2 pb-4 sm:px-3">
                <FilterOptionGroup
                  label="Warnings"
                  description="Show records requiring controlled configuration or reconciliation."
                  options={VEHICLE_INVENTORY_DATA_QUALITY_FLAGS.map(
                    (value) => ({
                      value,
                      label: QUALITY_LABELS[value] ?? humanizeToken(value),
                    }),
                  )}
                  selected={draft.warning}
                  maximum={MAX_SELECTIONS.warning}
                  searchable={false}
                  onChange={(values) => {
                    updateArray("warning", values);
                  }}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {validationError === null ? null : (
            <p
              role="alert"
              className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-body-sm text-destructive"
            >
              {validationError}
            </p>
          )}
        </form>

        <DialogFooter className="mx-0 mb-0 flex-row flex-wrap items-center rounded-none rounded-b-3xl border-t border-border/70 bg-muted/35 px-4 py-4 sm:justify-between sm:px-6">
          <div className="mr-auto flex min-w-0 items-center gap-2 text-caption text-muted-readable">
            <Filter aria-hidden="true" className="size-4 shrink-0" />
            <span>
              {draftFilterCount === 0
                ? "No advanced filters selected"
                : `${draftFilterCount.toLocaleString("en-IN")} advanced filter${draftFilterCount === 1 ? "" : "s"} ready`}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={draftFilterCount === 0}
              onClick={() => {
                setDraft(createEmptyAdvancedDraft());
                setValidationError(null);
              }}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Clear advanced
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form="vehicle-inventory-advanced-filters"
              disabled={pending}
            >
              {pending ? (
                <Spinner decorative />
              ) : (
                <Filter aria-hidden="true" className="size-4" />
              )}
              Apply filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActiveFilterSummary({
  query,
  draft,
}: Readonly<{
  query: VehicleInventorySearchParams;
  draft: AdvancedFilterDraft;
}>): React.ReactElement | null {
  const sectionCounts = (Object.keys(SECTION_PRESENTATION) as AdvancedSection[])
    .map((section) => ({
      section,
      count: sectionFilterCount(section, draft),
    }))
    .filter((item) => item.count > 0);

  if (sectionCounts.length === 0 && query.kpi === undefined) {
    return null;
  }

  return (
    <div
      className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/65 pt-3"
      aria-label="Active inventory filter summary"
    >
      <span className="mr-1 text-caption font-medium text-muted-readable">
        Active:
      </span>
      {query.kpi === undefined ? null : (
        <Badge variant="default">KPI · {humanizeToken(query.kpi)}</Badge>
      )}
      {sectionCounts.map(({ section, count }) => (
        <Badge key={section} variant="outline" className="text-tabular">
          {SECTION_PRESENTATION[section].title} ·{" "}
          {count.toLocaleString("en-IN")}
        </Badge>
      ))}
    </div>
  );
}

export function VehicleInventoryFilters({
  query,
  facets,
}: Readonly<{
  query: VehicleInventorySearchParams;
  facets: VehicleInventoryFacetsResult;
}>): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const advancedDraft = createAdvancedDraft(query);
  const filterCount = countAdvancedFilters(advancedDraft);

  const navigate = React.useCallback(
    (overrides: Partial<VehicleInventorySearchParams>): void => {
      const href = vehicleInventoryPageHref(query, {
        ...overrides,
        cursor: undefined,
      });

      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [query, router],
  );

  return (
    <section
      aria-label="Vehicle inventory controls"
      aria-busy={pending}
      className="relative rounded-3xl border border-border/75 bg-card/90 p-4 shadow-sm shadow-foreground/5 supports-[backdrop-filter]:bg-card/80 supports-[backdrop-filter]:backdrop-blur-xl sm:p-5"
    >
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[minmax(20rem,2fr)_minmax(10rem,0.85fr)_minmax(10rem,0.85fr)_minmax(20rem,1.45fr)_auto]">
        <SearchInventoryControl
          key={query.q ?? ""}
          query={query}
          navigate={navigate}
          pending={pending}
        />

        <FieldShell id="vehicle-inventory-sort-field" label="Sort field">
          <Select
            value={query.sortBy}
            onValueChange={(value) => {
              if (isSortField(value)) {
                navigate({ sortBy: value });
              }
            }}
          >
            <SelectTrigger
              id="vehicle-inventory-sort-field"
              className="h-11 w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {VEHICLE_INVENTORY_SORT_FIELDS.map((value) => (
                <SelectItem key={value} value={value}>
                  {SORT_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>

        <FieldShell id="vehicle-inventory-sort-direction" label="Direction">
          <Select
            value={query.sortDirection}
            onValueChange={(value) => {
              if (isSortDirection(value)) {
                navigate({ sortDirection: value });
              }
            }}
          >
            <SelectTrigger
              id="vehicle-inventory-sort-direction"
              className="h-11 w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              <SelectItem value="ASC">
                <ArrowUpAZ aria-hidden="true" className="size-4" />
                Ascending
              </SelectItem>
              <SelectItem value="DESC">
                <ArrowDownAZ aria-hidden="true" className="size-4" />
                Descending
              </SelectItem>
            </SelectContent>
          </Select>
        </FieldShell>

        <InventoryScopeControl
          query={query}
          canIncludeSubDealerStock={facets.scope.canIncludeSubDealerStock}
          eligibleSubDealerCount={facets.scope.eligibleSubDealerCount}
          navigate={navigate}
        />

        <div className="flex h-full items-start justify-end gap-2 pt-[1.375rem] md:col-span-2 xl:col-span-1">
          <AdvancedFiltersDialog
            query={query}
            facets={facets}
            filterCount={filterCount}
            pending={pending}
            onApply={(nextQuery) => {
              navigate(nextQuery);
            }}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11" asChild>
                <a
                  href={vehicleInventoryResetHref(query)}
                  aria-label="Reset all vehicle inventory controls"
                >
                  <RotateCcw aria-hidden="true" className="size-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Reset search, sort, scope, KPI, and advanced filters.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ActiveFilterSummary query={query} draft={advancedDraft} />

      {pending ? (
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-x-4 bottom-1 flex justify-end text-caption text-muted-readable"
        >
          Updating inventory…
        </div>
      ) : null}
    </section>
  );
}

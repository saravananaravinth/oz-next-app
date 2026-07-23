// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-dashboard-filters.tsx
"use client";

import * as React from "react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarRange,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { TenantMembership } from "@/lib/api/contracts";

import {
  addDashboardDays,
  inclusiveDashboardDayCount,
  ENGAGEMENT_ASSIGNMENT_STATES,
  ENGAGEMENT_CONVERSION_STATES,
  ENGAGEMENT_FOLLOW_UP_STATES,
  ENGAGEMENT_ISSUE_SEVERITIES,
  type EngagementDashboardSearchParams,
  type EngagementFilterOptions,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import {
  engagementDashboardHref,
  engagementDashboardResetHref,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";
import { titleCaseDashboardToken } from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";

type FilterState = Readonly<{
  tenantId?: string;
  from: string;
  to: string;
  comparison: EngagementDashboardSearchParams["comparison"];
  grain: EngagementDashboardSearchParams["grain"];
  leadSourceIds: readonly string[];
  ivrFlowCodes: readonly string[];
  leadTypes: readonly string[];
  statuses: readonly string[];
  dealerOrgUnitIds: readonly string[];
  districts: readonly string[];
  cities: readonly string[];
  assignmentStates: EngagementDashboardSearchParams["assignmentStates"];
  conversionStates: EngagementDashboardSearchParams["conversionStates"];
  followUpStates: EngagementDashboardSearchParams["followUpStates"];
  issueSeverities: EngagementDashboardSearchParams["issueSeverities"];
  q: string;
}>;

function isDashboardComparison(
  value: string,
): value is EngagementDashboardSearchParams["comparison"] {
  return value === "PREVIOUS_PERIOD" || value === "NONE";
}

function isDashboardGrain(
  value: string,
): value is EngagementDashboardSearchParams["grain"] {
  return (
    value === "AUTO" || value === "DAY" || value === "WEEK" || value === "MONTH"
  );
}

function isAssignmentState(
  value: string,
): value is EngagementDashboardSearchParams["assignmentStates"][number] {
  return value === "ASSIGNED" || value === "UNASSIGNED";
}

function isConversionState(
  value: string,
): value is EngagementDashboardSearchParams["conversionStates"][number] {
  return value === "CONVERTED" || value === "NOT_CONVERTED";
}

function isFollowUpState(
  value: string,
): value is EngagementDashboardSearchParams["followUpStates"][number] {
  return (
    value === "OVERDUE" ||
    value === "DUE_TODAY" ||
    value === "DUE_TOMORROW" ||
    value === "SCHEDULED"
  );
}

function isIssueSeverity(
  value: string,
): value is EngagementDashboardSearchParams["issueSeverities"][number] {
  return (
    value === "CRITICAL" ||
    value === "HIGH" ||
    value === "MEDIUM" ||
    value === "LOW"
  );
}

export type EngagementDashboardFiltersProps = Readonly<{
  query: EngagementDashboardSearchParams;
  options: EngagementFilterOptions | null;
  tenants: readonly TenantMembership[];
  showTenantSelector: boolean;
}>;

function initialState(query: EngagementDashboardSearchParams): FilterState {
  return {
    ...(query.tenantId !== undefined ? { tenantId: query.tenantId } : {}),
    from: query.from,
    to: query.to,
    comparison: query.comparison,
    grain: query.grain,
    leadSourceIds: query.leadSourceIds,
    ivrFlowCodes: query.ivrFlowCodes,
    leadTypes: query.leadTypes,
    statuses: query.statuses,
    dealerOrgUnitIds: query.dealerOrgUnitIds,
    districts: query.districts,
    cities: query.cities,
    assignmentStates: query.assignmentStates,
    conversionStates: query.conversionStates,
    followUpStates: query.followUpStates,
    issueSeverities: query.issueSeverities,
    q: query.q ?? "",
  };
}

function activeFilterCount(state: FilterState): number {
  const arrays = [
    state.leadSourceIds,
    state.ivrFlowCodes,
    state.leadTypes,
    state.statuses,
    state.dealerOrgUnitIds,
    state.districts,
    state.cities,
    state.assignmentStates,
    state.conversionStates,
    state.followUpStates,
    state.issueSeverities,
  ];
  return (
    arrays.reduce((count, values) => count + values.length, 0) +
    (state.q.trim().length > 0 ? 1 : 0)
  );
}

function toggleValue(
  values: readonly string[],
  value: string,
  checked: boolean,
): readonly string[] {
  if (checked) {
    return values.includes(value) ? values : [...values, value];
  }
  return values.filter((item) => item !== value);
}

function FilterCheckboxList({
  label,
  values,
  selected,
  onChange,
  maxSelected,
}: Readonly<{
  label: string;
  values: ReadonlyArray<
    Readonly<{
      value: string;
      label: string;
      disabled?: boolean;
    }>
  >;
  selected: readonly string[];
  onChange: (values: readonly string[]) => void;
  maxSelected?: number;
}>): React.ReactElement {
  return (
    <fieldset className="grid gap-3 rounded-2xl border border-border/70 p-3">
      <legend className="px-1 text-caption text-muted-readable">{label}</legend>
      {maxSelected !== undefined ? (
        <p className="text-caption text-muted-readable">
          {selected.length} of {maxSelected} selected
        </p>
      ) : null}
      <div className="grid max-h-48 gap-2 overflow-y-auto pr-1">
        {values.length === 0 ? (
          <p className="text-caption text-muted-readable">
            No options available.
          </p>
        ) : (
          values.map((option) => {
            const id = `${label}-${option.value}`.replace(
              /[^A-Za-z0-9_-]/gu,
              "-",
            );
            return (
              <div key={option.value} className="flex items-start gap-2">
                <Checkbox
                  id={id}
                  checked={selected.includes(option.value)}
                  disabled={
                    option.disabled === true ||
                    (maxSelected !== undefined &&
                      selected.length >= maxSelected &&
                      !selected.includes(option.value))
                  }
                  onCheckedChange={(checked) => {
                    const nextChecked = checked === true;
                    if (
                      nextChecked &&
                      maxSelected !== undefined &&
                      selected.length >= maxSelected &&
                      !selected.includes(option.value)
                    ) {
                      return;
                    }
                    onChange(toggleValue(selected, option.value, nextChecked));
                  }}
                />
                <Label htmlFor={id} className="min-w-0 text-body-sm">
                  {option.label}
                </Label>
              </div>
            );
          })
        )}
      </div>
    </fieldset>
  );
}

export function EngagementDashboardFilters({
  query,
  options,
  tenants,
  showTenantSelector,
}: EngagementDashboardFiltersProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<FilterState>(() =>
    initialState(query),
  );
  const filterCount = activeFilterCount(state);
  const rangeError = React.useMemo((): string | null => {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
    if (!datePattern.test(state.from) || !datePattern.test(state.to)) {
      return "Select a valid start and end date.";
    }
    if (state.from > state.to) {
      return "The end date must be on or after the start date.";
    }
    if (inclusiveDashboardDayCount(state.from, state.to) > 366) {
      return "The dashboard date range cannot exceed 366 inclusive days.";
    }
    return null;
  }, [state.from, state.to]);

  const navigate = React.useCallback(
    (href: Route): void => {
      startTransition(() => {
        router.push(href);
      });
    },
    [router],
  );

  const apply = React.useCallback((): void => {
    if (rangeError !== null) return;

    const href = engagementDashboardHref(query, {
      tenantId: state.tenantId ?? null,
      from: state.from,
      to: state.to,
      comparison: state.comparison,
      grain: state.grain,
      leadSourceIds: state.leadSourceIds,
      ivrFlowCodes: state.ivrFlowCodes,
      leadTypes: state.leadTypes,
      statuses: state.statuses,
      dealerOrgUnitIds: state.dealerOrgUnitIds,
      districts: state.districts,
      cities: state.cities,
      assignmentStates: state.assignmentStates,
      conversionStates: state.conversionStates,
      followUpStates: state.followUpStates,
      issueSeverities: state.issueSeverities,
      q: state.q.trim() || null,
      dealerCursor: null,
      issueCursor: null,
    });
    setOpen(false);
    navigate(href);
  }, [navigate, query, rangeError, state]);

  const applyPreset = React.useCallback((days: 7 | 30 | 90): void => {
    setState((current) => ({
      ...current,
      from: addDashboardDays(current.to, -(days - 1)),
    }));
  }, []);

  return (
    <section
      aria-label="Engagement dashboard filters"
      className="sticky top-3 z-30 rounded-3xl border border-border/80 bg-background/92 p-3 shadow-lg shadow-foreground/5 backdrop-blur-xl"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(16rem,1.35fr)_repeat(5,minmax(9rem,auto))_auto] xl:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="engagement-dashboard-search">Search</Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-readable"
            />
            <Input
              id="engagement-dashboard-search"
              value={state.q}
              maxLength={100}
              onChange={(event) => {
                const value = event.currentTarget.value.slice(0, 100);
                setState((current) => ({
                  ...current,
                  q: value,
                }));
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  apply();
                }
              }}
              placeholder="Lead no, dealer, customer, masked contact"
              className="pl-9"
            />
          </div>
        </div>

        {showTenantSelector ? (
          <div className="grid gap-1.5">
            <Label>Tenant</Label>
            <Select
              value={state.tenantId ?? ""}
              onValueChange={(tenantId) => {
                setState((current) => ({ ...current, tenantId }));
              }}
            >
              <SelectTrigger className="w-full xl:w-48">
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.tenant_id} value={tenant.tenant_id}>
                    {tenant.tenant_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="grid gap-1.5">
          <Label htmlFor="engagement-from">From</Label>
          <Input
            id="engagement-from"
            type="date"
            value={state.from}
            onChange={(event) => {
              setState((current) => ({
                ...current,
                from: event.currentTarget.value,
              }));
            }}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="engagement-to">To</Label>
          <Input
            id="engagement-to"
            type="date"
            value={state.to}
            onChange={(event) => {
              setState((current) => ({
                ...current,
                to: event.currentTarget.value,
              }));
            }}
          />
        </div>

        <div className="grid gap-1.5">
          <Label>Comparison</Label>
          <Select
            value={state.comparison}
            onValueChange={(value) => {
              if (isDashboardComparison(value)) {
                setState((current) => ({
                  ...current,
                  comparison: value,
                }));
              }
            }}
          >
            <SelectTrigger className="w-full xl:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PREVIOUS_PERIOD">Previous period</SelectItem>
              <SelectItem value="NONE">No comparison</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Chart grain</Label>
          <Select
            value={state.grain}
            onValueChange={(value) => {
              if (isDashboardGrain(value)) {
                setState((current) => ({
                  ...current,
                  grain: value,
                }));
              }
            }}
          >
            <SelectTrigger className="w-full xl:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AUTO">Automatic</SelectItem>
              <SelectItem value="DAY">Daily</SelectItem>
              <SelectItem value="WEEK">Weekly</SelectItem>
              <SelectItem value="MONTH">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline">
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                Filters
                {filterCount > 0 ? (
                  <Badge variant="secondary">{filterCount}</Badge>
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full overflow-y-auto sm:max-w-xl"
            >
              <SheetHeader>
                <SheetTitle>Advanced engagement filters</SheetTitle>
                <SheetDescription>
                  Query parameters are allowlisted, deduplicated, bounded, and
                  applied to every compatible dashboard section.
                </SheetDescription>
              </SheetHeader>

              <div className="grid gap-4 px-4 py-2">
                <div className="grid gap-2 rounded-2xl border border-border/70 p-3">
                  <span className="text-caption text-muted-readable">
                    Quick range
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        applyPreset(7);
                      }}
                    >
                      7 days
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        applyPreset(30);
                      }}
                    >
                      30 days
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        applyPreset(90);
                      }}
                    >
                      90 days
                    </Button>
                  </div>
                </div>

                <FilterCheckboxList
                  label="Lead sources"
                  maxSelected={20}
                  selected={state.leadSourceIds}
                  values={(options?.leadSources ?? []).map((option) => ({
                    value: option.id,
                    label: `${option.name} · ${option.code}${option.active ? "" : " · inactive"}`,
                  }))}
                  onChange={(leadSourceIds) => {
                    setState((current) => ({ ...current, leadSourceIds }));
                  }}
                />
                <FilterCheckboxList
                  label="IVR flows"
                  maxSelected={16}
                  selected={state.ivrFlowCodes}
                  values={(options?.ivrFlows ?? []).map((option) => ({
                    value: option.code,
                    label: `${option.name} · ${option.code}${option.active ? "" : " · inactive"}`,
                  }))}
                  onChange={(ivrFlowCodes) => {
                    setState((current) => ({ ...current, ivrFlowCodes }));
                  }}
                />
                <FilterCheckboxList
                  label="Dealers"
                  maxSelected={50}
                  selected={state.dealerOrgUnitIds}
                  values={(options?.dealers ?? []).map((option) => ({
                    value: option.id,
                    label: `${option.name} · ${option.code}${option.active ? "" : " · inactive"}`,
                  }))}
                  onChange={(dealerOrgUnitIds) => {
                    setState((current) => ({ ...current, dealerOrgUnitIds }));
                  }}
                />
                <FilterCheckboxList
                  label="Lead types"
                  maxSelected={16}
                  selected={state.leadTypes}
                  values={(options?.leadTypes ?? []).map((value) => ({
                    value,
                    label: titleCaseDashboardToken(value),
                  }))}
                  onChange={(leadTypes) => {
                    setState((current) => ({ ...current, leadTypes }));
                  }}
                />
                <FilterCheckboxList
                  label="Lead statuses"
                  maxSelected={32}
                  selected={state.statuses}
                  values={(options?.statuses ?? []).map((value) => ({
                    value,
                    label: titleCaseDashboardToken(value),
                  }))}
                  onChange={(statuses) => {
                    setState((current) => ({ ...current, statuses }));
                  }}
                />
                <FilterCheckboxList
                  label="Districts"
                  maxSelected={50}
                  selected={state.districts}
                  values={(options?.districts ?? []).map((value) => ({
                    value,
                    label: value,
                  }))}
                  onChange={(districts) => {
                    setState((current) => ({ ...current, districts }));
                  }}
                />
                <FilterCheckboxList
                  label="Cities"
                  maxSelected={50}
                  selected={state.cities}
                  values={(options?.cities ?? []).map((value) => ({
                    value,
                    label: value,
                  }))}
                  onChange={(cities) => {
                    setState((current) => ({ ...current, cities }));
                  }}
                />
                <FilterCheckboxList
                  label="Assignment state"
                  maxSelected={2}
                  selected={state.assignmentStates}
                  values={ENGAGEMENT_ASSIGNMENT_STATES.map((value) => ({
                    value,
                    label: titleCaseDashboardToken(value),
                  }))}
                  onChange={(values) => {
                    setState((current) => ({
                      ...current,
                      assignmentStates: values.filter(
                        (value): value is "ASSIGNED" | "UNASSIGNED" =>
                          isAssignmentState(value),
                      ),
                    }));
                  }}
                />
                <FilterCheckboxList
                  label="Conversion state"
                  maxSelected={2}
                  selected={state.conversionStates}
                  values={ENGAGEMENT_CONVERSION_STATES.map((value) => ({
                    value,
                    label: titleCaseDashboardToken(value),
                  }))}
                  onChange={(values) => {
                    setState((current) => ({
                      ...current,
                      conversionStates: values.filter(
                        (value): value is "CONVERTED" | "NOT_CONVERTED" =>
                          isConversionState(value),
                      ),
                    }));
                  }}
                />
                <FilterCheckboxList
                  label="Follow-up state"
                  maxSelected={4}
                  selected={state.followUpStates}
                  values={ENGAGEMENT_FOLLOW_UP_STATES.map((value) => ({
                    value,
                    label: titleCaseDashboardToken(value),
                  }))}
                  onChange={(values) => {
                    setState((current) => ({
                      ...current,
                      followUpStates: values.filter(
                        (
                          value,
                        ): value is FilterState["followUpStates"][number] =>
                          isFollowUpState(value),
                      ),
                    }));
                  }}
                />
                <FilterCheckboxList
                  label="Issue severity"
                  maxSelected={4}
                  selected={state.issueSeverities}
                  values={ENGAGEMENT_ISSUE_SEVERITIES.map((value) => ({
                    value,
                    label: titleCaseDashboardToken(value),
                  }))}
                  onChange={(values) => {
                    setState((current) => ({
                      ...current,
                      issueSeverities: values.filter(
                        (
                          value,
                        ): value is FilterState["issueSeverities"][number] =>
                          isIssueSeverity(value),
                      ),
                    }));
                  }}
                />
              </div>

              <SheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setState(initialState(query));
                  }}
                >
                  <RotateCcw aria-hidden="true" className="size-4" />
                  Revert
                </Button>
                <Button
                  type="button"
                  onClick={apply}
                  disabled={pending || rangeError !== null}
                >
                  <Filter aria-hidden="true" className="size-4" />
                  Apply filters
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Button
            type="button"
            onClick={apply}
            disabled={pending || rangeError !== null}
          >
            <CalendarRange aria-hidden="true" className="size-4" />
            Apply
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Reset engagement dashboard filters"
            title="Reset filters"
            onClick={() => {
              navigate(engagementDashboardResetHref(query));
            }}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Refresh engagement dashboard"
            title="Refresh dashboard"
            disabled={pending}
            onClick={() => {
              startTransition(() => {
                router.refresh();
              });
            }}
          >
            <RefreshCw
              aria-hidden="true"
              className={pending ? "size-4 animate-spin" : "size-4"}
            />
          </Button>
        </div>
      </div>

      {rangeError !== null ? (
        <p className="mt-3 text-body-sm text-destructive" role="alert">
          {rangeError}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-caption text-muted-readable">
        <Badge variant="outline">{filterCount} active filters</Badge>
        <span>URL-synchronized view</span>
        <span aria-hidden="true">·</span>
        <span>{pathname}</span>
      </div>
    </section>
  );
}

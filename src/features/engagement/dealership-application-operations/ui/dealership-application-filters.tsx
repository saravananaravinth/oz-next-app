// oz-next-app/src/features/engagement/dealership-application-operations/ui/dealership-application-filters.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { Filter, RefreshCw, RotateCcw, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { ContentToolbar } from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  DEALERSHIP_APPLICATION_PHASES,
  DEALERSHIP_APPLICATION_PRIORITIES,
  DEALERSHIP_APPLICATION_STATUSES,
  type DealershipApplicationFilterOptions,
  type DealershipApplicationSearchParams,
} from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";
import { titleCaseDealershipToken } from "@/features/engagement/dealership-application-operations/utils/dealership-application-format";
import {
  dealershipApplicationDashboardHref,
  dealershipApplicationResetHref,
} from "@/features/engagement/dealership-application-operations/utils/dealership-application-url";

export type DealershipApplicationFiltersProps = Readonly<{
  query: DealershipApplicationSearchParams;
  filterOptions: DealershipApplicationFilterOptions | null;
}>;

type FilterState = Readonly<{
  phases: readonly string[];
  statuses: readonly string[];
  priorities: readonly string[];
  sourceIds: readonly string[];
  ownerUserIds: readonly string[];
  ownerOrgUnitIds: readonly string[];
}>;

function activeFilterCount(query: DealershipApplicationSearchParams): number {
  return (
    query.phases.length +
    query.statuses.length +
    query.priorities.length +
    query.sourceKinds.length +
    query.sourceIds.length +
    query.ownerUserIds.length +
    query.ownerOrgUnitIds.length +
    query.districts.length +
    query.cities.length +
    (query.q === undefined ? 0 : 1)
  );
}

function initialState(query: DealershipApplicationSearchParams): FilterState {
  return {
    phases: query.phases,
    statuses: query.statuses,
    priorities: query.priorities,
    sourceIds: query.sourceIds,
    ownerUserIds: query.ownerUserIds,
    ownerOrgUnitIds: query.ownerOrgUnitIds,
  };
}

function toggle(values: readonly string[], value: string): readonly string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

type CheckGroupProps = Readonly<{
  title: string;
  options: ReadonlyArray<Readonly<{ value: string; label: string }>>;
  selected: readonly string[];
  onChange: (values: readonly string[]) => void;
}>;

function CheckGroup({
  title,
  options,
  selected,
  onChange,
}: CheckGroupProps): React.ReactElement {
  return (
    <fieldset className="grid gap-3">
      <legend className="text-card-title">{title}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const id = `${title}-${option.value}`.replace(
            /[^A-Za-z0-9_-]/gu,
            "-",
          );
          return (
            <div
              key={option.value}
              className="flex min-w-0 items-start gap-2 rounded-xl border border-border/70 p-3"
            >
              <Checkbox
                id={id}
                checked={selected.includes(option.value)}
                onCheckedChange={() => {
                  onChange(toggle(selected, option.value));
                }}
              />
              <Label
                htmlFor={id}
                className="min-w-0 cursor-pointer text-body-sm"
              >
                {option.label}
              </Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function DealershipApplicationPeriodControls({
  query,
}: Readonly<{
  query: DealershipApplicationSearchParams;
}>): React.ReactElement {
  const router = useRouter();
  const [from, setFrom] = React.useState(query.from);
  const [to, setTo] = React.useState(query.to);

  function applyPeriod(): void {
    router.push(
      dealershipApplicationDashboardHref(query, {
        from,
        to,
        cursor: null,
      }),
    );
  }

  return (
    <>
      <div className="grid gap-1">
        <Label htmlFor="dealership-from" className="text-caption">
          From
        </Label>
        <Input
          id="dealership-from"
          type="date"
          placeholder="Select start date"
          value={from}
          max={to}
          onChange={(event) => {
            setFrom(event.currentTarget.value);
          }}
          className="w-40"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="dealership-to" className="text-caption">
          To
        </Label>
        <Input
          id="dealership-to"
          type="date"
          placeholder="Select end date"
          value={to}
          min={from}
          onChange={(event) => {
            setTo(event.currentTarget.value);
          }}
          className="w-40"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={from.length === 0 || to.length === 0 || from > to}
        onClick={applyPeriod}
      >
        Apply period
      </Button>
    </>
  );
}

export function DealershipApplicationFilters({
  query,
  filterOptions,
}: DealershipApplicationFiltersProps): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<FilterState>(() =>
    initialState(query),
  );
  const count = activeFilterCount(query);

  function applyFilters(): void {
    router.push(
      dealershipApplicationDashboardHref(query, {
        phases: filters.phases,
        statuses: filters.statuses,
        priorities: filters.priorities,
        sourceIds: filters.sourceIds,
        ownerUserIds: filters.ownerUserIds,
        ownerOrgUnitIds: filters.ownerOrgUnitIds,
        cursor: null,
      }),
    );
    setOpen(false);
  }

  return (
    <ContentToolbar variant="subtle" className="gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
        <DealershipApplicationPeriodControls
          key={`${query.from}:${query.to}`}
          query={query}
        />
        <div className="grid gap-1">
          <Label className="text-caption">Chart grain</Label>
          <Select
            value={query.grain}
            onValueChange={(value: "DAY" | "WEEK" | "MONTH") => {
              router.push(
                dealershipApplicationDashboardHref(query, {
                  grain: value,
                  cursor: null,
                }),
              );
            }}
          >
            <SelectTrigger className="w-36" aria-label="Chart grain">
              <SelectValue placeholder="Select chart grain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAY">Daily</SelectItem>
              <SelectItem value="WEEK">Weekly</SelectItem>
              <SelectItem value="MONTH">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (nextOpen) setFilters(initialState(query));
            setOpen(nextOpen);
          }}
        >
          <DialogTrigger asChild>
            <Button type="button" variant="outline">
              <Filter aria-hidden="true" className="size-4" />
              Filters
              {count > 0 ? <Badge variant="secondary">{count}</Badge> : null}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Filter dealership applications</DialogTitle>
              <DialogDescription>
                Narrow the tenant-scoped operating queue. Filters are
                URL-synchronized and safe to share within the same authorized
                scope.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-6">
              <CheckGroup
                title="Lifecycle phase"
                options={DEALERSHIP_APPLICATION_PHASES.map((value) => ({
                  value,
                  label: titleCaseDealershipToken(value),
                }))}
                selected={filters.phases}
                onChange={(phases) => {
                  setFilters((current) => ({ ...current, phases }));
                }}
              />
              <Separator />
              <CheckGroup
                title="Status"
                options={DEALERSHIP_APPLICATION_STATUSES.map((value) => ({
                  value,
                  label: titleCaseDealershipToken(value),
                }))}
                selected={filters.statuses}
                onChange={(statuses) => {
                  setFilters((current) => ({ ...current, statuses }));
                }}
              />
              <Separator />
              <CheckGroup
                title="Priority"
                options={DEALERSHIP_APPLICATION_PRIORITIES.map((value) => ({
                  value,
                  label: titleCaseDealershipToken(value),
                }))}
                selected={filters.priorities}
                onChange={(priorities) => {
                  setFilters((current) => ({ ...current, priorities }));
                }}
              />
              {filterOptions === null ? null : (
                <>
                  <Separator />
                  <CheckGroup
                    title="Lead source"
                    options={filterOptions.sources.map((source) => ({
                      value: source.sourceId,
                      label: `${source.name} · ${titleCaseDealershipToken(source.kind)}`,
                    }))}
                    selected={filters.sourceIds}
                    onChange={(sourceIds) => {
                      setFilters((current) => ({ ...current, sourceIds }));
                    }}
                  />
                  <Separator />
                  <CheckGroup
                    title="Assigned manager"
                    options={filterOptions.owners.map((owner) => ({
                      value: owner.userId,
                      label: owner.name,
                    }))}
                    selected={filters.ownerUserIds}
                    onChange={(ownerUserIds) => {
                      setFilters((current) => ({ ...current, ownerUserIds }));
                    }}
                  />
                  <Separator />
                  <CheckGroup
                    title="Owning organization"
                    options={filterOptions.ownerOrgUnits.map((orgUnit) => ({
                      value: orgUnit.orgUnitId,
                      label: `${orgUnit.name} · ${orgUnit.code}`,
                    }))}
                    selected={filters.ownerOrgUnitIds}
                    onChange={(ownerOrgUnitIds) => {
                      setFilters((current) => ({
                        ...current,
                        ownerOrgUnitIds,
                      }));
                    }}
                  />
                </>
              )}
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFilters({
                    phases: [],
                    statuses: [],
                    priorities: [],
                    sourceIds: [],
                    ownerUserIds: [],
                    ownerOrgUnitIds: [],
                  });
                }}
              >
                Clear dialog filters
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" onClick={applyFilters}>
                Apply filters
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Select
          value={query.sortBy}
          onValueChange={(
            value: DealershipApplicationSearchParams["sortBy"],
          ) => {
            router.push(
              dealershipApplicationDashboardHref(query, {
                sortBy: value,
                cursor: null,
              }),
            );
          }}
        >
          <SelectTrigger className="w-44" aria-label="Sort applications">
            <SelectValue placeholder="Select application sort order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CREATED_AT">Newest received</SelectItem>
            <SelectItem value="UPDATED_AT">Recently updated</SelectItem>
            <SelectItem value="NEXT_ACTION_AT">Next action</SelectItem>
            <SelectItem value="PRIORITY">Priority</SelectItem>
            <SelectItem value="APPLICATION_NO">Application number</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {query.q === undefined ? null : (
          <Badge variant="outline" className="max-w-64 gap-1.5">
            <Search aria-hidden="true" className="size-3" />
            <span className="truncate">{query.q}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Clear page search"
              onClick={() => {
                router.push(
                  dealershipApplicationDashboardHref(query, {
                    q: null,
                    cursor: null,
                  }),
                );
              }}
            >
              <X aria-hidden="true" className="size-3" />
            </Button>
          </Badge>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                router.refresh();
              }}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Refresh
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reload data without changing filters.</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" asChild>
              <Link href={dealershipApplicationResetHref()}>
                <RotateCcw aria-hidden="true" className="size-4" />
                Reset
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Restore the default 30-day view.</TooltipContent>
        </Tooltip>
      </div>
    </ContentToolbar>
  );
}

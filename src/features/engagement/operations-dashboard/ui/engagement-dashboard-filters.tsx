// oz-next-app/src/features/engagement/operations-dashboard/ui/engagement-dashboard-filters.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  CircleAlert,
  CircleDot,
  Filter,
  Info,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ContentStatus,
  ContentToolbar,
} from "@/components/common/content-shell";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type {
  EngagementDashboardSearchParams,
  EngagementFilterOptions,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { EngagementDashboardSectionResult } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.types";
import {
  ENGAGEMENT_DASHBOARD_ROUTES,
  engagementDashboardResetHref,
  engagementWorkspaceHref,
  type EngagementDashboardRoute,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type EngagementDashboardFiltersProps = Readonly<{
  route: EngagementDashboardRoute;
  query: EngagementDashboardSearchParams;
  filterOptions: EngagementDashboardSectionResult<EngagementFilterOptions>;
}>;

type FilterDraft = Readonly<{
  leadSourceIds: readonly string[];
  ivrFlowCodes: readonly string[];
  dealerOrgUnitIds: readonly string[];
  districts: readonly string[];
  cities: readonly string[];
  statuses: readonly string[];
  assignmentStates: EngagementDashboardSearchParams["assignmentStates"];
  conversionStates: EngagementDashboardSearchParams["conversionStates"];
  followUpStates: EngagementDashboardSearchParams["followUpStates"];
  issueSeverities: EngagementDashboardSearchParams["issueSeverities"];
}>;

type FilterOption = Readonly<{ value: string; label: string }>;

const ASSIGNMENT_OPTIONS = [
  { value: "ASSIGNED", label: "Assigned" },
  { value: "UNASSIGNED", label: "Unassigned" },
] as const satisfies readonly FilterOption[];

const CONVERSION_OPTIONS = [
  { value: "CONVERTED", label: "Converted" },
  { value: "NOT_CONVERTED", label: "Not converted" },
] as const satisfies readonly FilterOption[];

const FOLLOW_UP_OPTIONS = [
  { value: "OVERDUE", label: "Overdue" },
  { value: "DUE_TODAY", label: "Due today" },
  { value: "DUE_TOMORROW", label: "Due tomorrow" },
  { value: "SCHEDULED", label: "Scheduled" },
] as const satisfies readonly FilterOption[];

const ISSUE_SEVERITY_OPTIONS = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
] as const satisfies readonly FilterOption[];

function optionIncludes(
  options: readonly FilterOption[],
  value: string,
): boolean {
  return options.some((option) => option.value === value);
}

function isAssignmentState(
  value: string,
): value is EngagementDashboardSearchParams["assignmentStates"][number] {
  return optionIncludes(ASSIGNMENT_OPTIONS, value);
}

function isConversionState(
  value: string,
): value is EngagementDashboardSearchParams["conversionStates"][number] {
  return optionIncludes(CONVERSION_OPTIONS, value);
}

function isFollowUpState(
  value: string,
): value is EngagementDashboardSearchParams["followUpStates"][number] {
  return optionIncludes(FOLLOW_UP_OPTIONS, value);
}

function isIssueSeverity(
  value: string,
): value is EngagementDashboardSearchParams["issueSeverities"][number] {
  return optionIncludes(ISSUE_SEVERITY_OPTIONS, value);
}

function draftFromQuery(query: EngagementDashboardSearchParams): FilterDraft {
  return {
    leadSourceIds: query.leadSourceIds,
    ivrFlowCodes: query.ivrFlowCodes,
    dealerOrgUnitIds: query.dealerOrgUnitIds,
    districts: query.districts,
    cities: query.cities,
    statuses: query.statuses,
    assignmentStates: query.assignmentStates,
    conversionStates: query.conversionStates,
    followUpStates: query.followUpStates,
    issueSeverities: query.issueSeverities,
  };
}

function emptyDraft(): FilterDraft {
  return {
    leadSourceIds: [],
    ivrFlowCodes: [],
    dealerOrgUnitIds: [],
    districts: [],
    cities: [],
    statuses: [],
    assignmentStates: [],
    conversionStates: [],
    followUpStates: [],
    issueSeverities: [],
  };
}

function toggle(values: readonly string[], value: string): readonly string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function draftFilterCount(query: FilterDraft): number {
  return [
    query.leadSourceIds,
    query.ivrFlowCodes,
    query.statuses,
    query.dealerOrgUnitIds,
    query.districts,
    query.cities,
    query.assignmentStates,
    query.conversionStates,
    query.followUpStates,
    query.issueSeverities,
  ].reduce((sum, values) => sum + values.length, 0);
}

function activeFilterCount(query: EngagementDashboardSearchParams): number {
  return draftFilterCount(draftFromQuery(query));
}

function FieldLabel({
  htmlFor,
  children,
  help,
}: Readonly<{
  htmlFor?: string;
  children: React.ReactNode;
  help: string;
}>): React.ReactElement {
  return (
    <Label
      htmlFor={htmlFor}
      className="inline-flex items-center gap-1 text-caption"
    >
      {children}
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex size-4 items-center justify-center rounded"
            tabIndex={0}
          >
            <Info aria-hidden="true" className="size-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent>{help}</TooltipContent>
      </Tooltip>
    </Label>
  );
}

function FilterChecklist({
  label,
  options,
  values,
  onChange,
}: Readonly<{
  label: string;
  options: readonly FilterOption[];
  values: readonly string[];
  onChange: (values: readonly string[]) => void;
}>): React.ReactElement {
  const id = React.useId();
  const [search, setSearch] = React.useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("en-US");
  const visibleOptions = React.useMemo(
    () =>
      normalizedSearch.length === 0
        ? options
        : options.filter((option) =>
            option.label.toLocaleLowerCase("en-US").includes(normalizedSearch),
          ),
    [normalizedSearch, options],
  );
  const visibleValues = visibleOptions.map((option) => option.value);
  const allVisibleSelected =
    visibleValues.length > 0 &&
    visibleValues.every((value) => values.includes(value));

  return (
    <fieldset className="grid min-w-0 content-start gap-2.5 rounded-2xl border border-border/70 bg-card/65 p-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <legend className="min-w-0 truncate text-body-sm font-medium text-foreground">
          {label}
        </legend>
        <div className="flex shrink-0 items-center gap-1">
          {values.length > 0 ? (
            <Badge variant="secondary">{values.length}</Badge>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={values.length === 0}
            onClick={() => {
              onChange([]);
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {options.length > 8 ? (
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-readable"
          />
          <Input
            value={search}
            aria-label={`Search ${label}`}
            placeholder={`Search ${label.toLocaleLowerCase("en-US")}`}
            className="h-8 ps-8 text-caption"
            onChange={(event) => {
              setSearch(event.currentTarget.value);
            }}
          />
        </div>
      ) : null}

      <ScrollArea className="h-44 rounded-xl border border-border/60 bg-muted/20 p-1.5">
        <div className="grid gap-1">
          {visibleOptions.length === 0 ? (
            <p className="px-2 py-3 text-caption text-muted-readable">
              {options.length === 0
                ? "No options available."
                : "No options match this search."}
            </p>
          ) : (
            visibleOptions.map((option) => {
              const checked = values.includes(option.value);
              const optionId = `${id}-${option.value}`.replace(
                /[^A-Za-z0-9_-]/gu,
                "-",
              );
              return (
                <label
                  key={option.value}
                  htmlFor={optionId}
                  className="flex min-w-0 cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-body-sm hover:bg-muted/60"
                >
                  <Checkbox
                    id={optionId}
                    checked={checked}
                    onCheckedChange={() => {
                      onChange(toggle(values, option.value));
                    }}
                  />
                  <span className="truncate">{option.label}</span>
                </label>
              );
            })
          )}
        </div>
      </ScrollArea>

      {visibleValues.length > 1 ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="justify-self-start"
          onClick={() => {
            if (allVisibleSelected) {
              onChange(
                values.filter((value) => !visibleValues.includes(value)),
              );
            } else {
              onChange([...new Set([...values, ...visibleValues])]);
            }
          }}
        >
          {allVisibleSelected ? "Clear visible" : "Select visible"}
        </Button>
      ) : null}
    </fieldset>
  );
}

export function EngagementDashboardFilters({
  route,
  query,
  filterOptions,
}: EngagementDashboardFiltersProps): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<FilterDraft>(() =>
    draftFromQuery(query),
  );
  const count = activeFilterCount(query);

  function navigate(
    patch: Parameters<typeof engagementWorkspaceHref>[2],
  ): void {
    router.push(
      engagementWorkspaceHref(route, query, {
        ...patch,
        dealerCursor: null,
        leadCursor: null,
      }),
    );
  }

  const options = filterOptions.status === "ready" ? filterOptions.data : null;
  const draftCount = draftFilterCount(draft);
  const leadFilterCount =
    draft.leadSourceIds.length +
    draft.ivrFlowCodes.length +
    draft.statuses.length;
  const assignmentFilterCount =
    draft.dealerOrgUnitIds.length +
    draft.assignmentStates.length +
    draft.conversionStates.length +
    draft.followUpStates.length;
  const locationFilterCount = draft.districts.length + draft.cities.length;
  const attentionFilterCount = draft.issueSeverities.length;
  const isJourneyOverview = route === ENGAGEMENT_DASHBOARD_ROUTES.overview;

  return (
    <ContentToolbar
      variant="ghost"
      className="gap-3"
      aria-label="Dashboard filters"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2.5">
        <div className="grid w-full min-w-0 gap-1.5 sm:w-[11.5rem] sm:flex-none">
          <FieldLabel
            htmlFor="engagement-from"
            help={
              isJourneyOverview
                ? "First process-run date included in the authoritative journey cohort. The operational queue below uses the same calendar range against lead creation time."
                : "First lead creation date included in the selected workspace cohort."
            }
          >
            {isJourneyOverview ? "Cohort from" : "Created from"}
          </FieldLabel>
          <Input
            id="engagement-from"
            className="w-full"
            type="date"
            placeholder="Select start date"
            value={query.from}
            max={query.to}
            onChange={(event) => {
              const value = event.currentTarget.value;

              if (value.length > 0) {
                navigate({ from: value });
              }
            }}
          />
        </div>
        <div className="grid w-full min-w-0 gap-1.5 sm:w-[11.5rem] sm:flex-none">
          <FieldLabel
            htmlFor="engagement-to"
            help={
              isJourneyOverview
                ? "Last process-run date included in the authoritative journey cohort. The operational queue below uses the same calendar range against lead creation time."
                : "Last lead creation date included in the selected workspace cohort."
            }
          >
            {isJourneyOverview ? "Cohort to" : "Created to"}
          </FieldLabel>
          <Input
            id="engagement-to"
            className="w-full"
            type="date"
            placeholder="Select end date"
            value={query.to}
            min={query.from}
            onChange={(event) => {
              const value = event.currentTarget.value;

              if (value.length > 0) {
                navigate({ to: value });
              }
            }}
          />
        </div>
        {isJourneyOverview ? (
          <form
            className="grid w-full min-w-0 gap-1.5 sm:w-[13rem] sm:flex-none"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const rawValue = formData.get("engagement-maturity-hours");
              const value =
                typeof rawValue === "string" && /^\d+$/u.test(rawValue)
                  ? Number(rawValue)
                  : Number.NaN;

              if (Number.isInteger(value) && value >= 1 && value <= 720) {
                navigate({ maturityHours: value });
              }
            }}
          >
            <FieldLabel
              htmlFor="engagement-maturity-hours"
              help="Only runs older than this horizon can enter the matured conversion denominator. Current and incomplete runs remain visible as diagnostics."
            >
              Maturity horizon
            </FieldLabel>
            <div className="flex min-w-0 gap-1.5">
              <Input
                key={String(query.maturityHours)}
                id="engagement-maturity-hours"
                name="engagement-maturity-hours"
                type="number"
                inputMode="numeric"
                placeholder="24"
                min={1}
                max={720}
                step={1}
                defaultValue={query.maturityHours}
                aria-label="Journey maturity horizon in hours"
              />
              <Button type="submit" variant="outline">
                Apply
              </Button>
            </div>
          </form>
        ) : null}

        {isJourneyOverview ? (
          <form
            className="grid w-full min-w-0 gap-1.5 sm:w-[18rem] sm:flex-none"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const value = formData.get("engagement-lead-search");

              navigate({
                q:
                  typeof value === "string" && value.trim().length > 0
                    ? value.trim()
                    : null,
              });
            }}
          >
            <FieldLabel
              htmlFor="engagement-lead-search"
              help="Search backend-supported lead and customer fields within the selected actor, tenant, date, and flow scope."
            >
              Lead / customer search
            </FieldLabel>
            <div className="flex min-w-0 gap-1.5">
              <Input
                key={query.q ?? "engagement-lead-search-empty"}
                id="engagement-lead-search"
                name="engagement-lead-search"
                type="search"
                defaultValue={query.q ?? ""}
                maxLength={100}
                autoComplete="off"
                placeholder="Lead, customer, mobile..."
                className="min-w-0 flex-1"
              />
              <Button
                type="submit"
                variant="outline"
                size="icon"
                aria-label="Search engagement leads"
              >
                <Search aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </form>
        ) : null}

        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);

            if (nextOpen) {
              setDraft(draftFromQuery(query));
            }
          }}
        >
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="self-end">
              <Filter aria-hidden="true" className="size-4" />
              {isJourneyOverview ? "Queue filters" : "More filters"}
              {count > 0 ? <Badge variant="secondary">{count}</Badge> : null}
            </Button>
          </DialogTrigger>
          <DialogContent height="viewport" className="sm:max-w-6xl">
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle>
                  {isJourneyOverview
                    ? "Filter the operational lead queue"
                    : "Filter vehicle-sales engagement"}
                </DialogTitle>
                <Badge variant={draftCount > 0 ? "secondary" : "outline"}>
                  {draftCount} selected
                </Badge>
              </div>
              <DialogDescription>
                {isJourneyOverview
                  ? "These advanced filters apply to the operational lead queue only. Authoritative journey KPIs, outcomes, funnel, and latency use only the cohort dates and maturity horizon above."
                  : "Filters are grouped by business purpose and apply consistently across this workspace. Search long option lists independently without losing current selections."}
              </DialogDescription>
            </DialogHeader>

            <DialogBody>
              {options === null ? (
                <ContentStatus
                  variant={
                    filterOptions.status === "forbidden"
                      ? "warning"
                      : "destructive"
                  }
                  title="Filter options unavailable"
                  description="The current date controls remain usable. Retry before applying advanced filters."
                />
              ) : (
                <Tabs defaultValue="lead" className="grid gap-4">
                  <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
                    <TabsTrigger value="lead">
                      <CircleDot aria-hidden="true" />
                      Lead
                      {leadFilterCount > 0 ? (
                        <Badge variant="secondary">{leadFilterCount}</Badge>
                      ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="assignment">
                      <Building2 aria-hidden="true" />
                      Assignment
                      {assignmentFilterCount > 0 ? (
                        <Badge variant="secondary">
                          {assignmentFilterCount}
                        </Badge>
                      ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="location">
                      <MapPin aria-hidden="true" />
                      Location
                      {locationFilterCount > 0 ? (
                        <Badge variant="secondary">{locationFilterCount}</Badge>
                      ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="attention">
                      <CircleAlert aria-hidden="true" />
                      Attention
                      {attentionFilterCount > 0 ? (
                        <Badge variant="secondary">
                          {attentionFilterCount}
                        </Badge>
                      ) : null}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="lead"
                    className="m-0 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                  >
                    <FilterChecklist
                      label="Lead source"
                      options={options.leadSources.map((item) => ({
                        value: item.id,
                        label: item.active
                          ? item.name
                          : `${item.name} · Inactive`,
                      }))}
                      values={draft.leadSourceIds}
                      onChange={(leadSourceIds) => {
                        setDraft({ ...draft, leadSourceIds });
                      }}
                    />
                    <FilterChecklist
                      label="Vehicle-sales flow"
                      options={options.ivrFlows.map((item) => ({
                        value: item.code,
                        label: item.active
                          ? item.name
                          : `${item.name} · Inactive`,
                      }))}
                      values={draft.ivrFlowCodes}
                      onChange={(ivrFlowCodes) => {
                        setDraft({ ...draft, ivrFlowCodes });
                      }}
                    />
                    <FilterChecklist
                      label="Lead status"
                      options={options.statuses.map((item) => ({
                        value: item,
                        label: item.replaceAll("_", " "),
                      }))}
                      values={draft.statuses}
                      onChange={(statuses) => {
                        setDraft({ ...draft, statuses });
                      }}
                    />
                  </TabsContent>

                  <TabsContent
                    value="assignment"
                    className="m-0 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                  >
                    <FilterChecklist
                      label="Dealer"
                      options={options.dealers.map((item) => ({
                        value: item.id,
                        label: `${item.name} · ${item.code}${item.active ? "" : " · Inactive"}`,
                      }))}
                      values={draft.dealerOrgUnitIds}
                      onChange={(dealerOrgUnitIds) => {
                        setDraft({ ...draft, dealerOrgUnitIds });
                      }}
                    />
                    <FilterChecklist
                      label="Assignment state"
                      options={ASSIGNMENT_OPTIONS}
                      values={draft.assignmentStates}
                      onChange={(assignmentStates) => {
                        setDraft({
                          ...draft,
                          assignmentStates:
                            assignmentStates.filter(isAssignmentState),
                        });
                      }}
                    />
                    <FilterChecklist
                      label="Conversion state"
                      options={CONVERSION_OPTIONS}
                      values={draft.conversionStates}
                      onChange={(conversionStates) => {
                        setDraft({
                          ...draft,
                          conversionStates:
                            conversionStates.filter(isConversionState),
                        });
                      }}
                    />
                    <FilterChecklist
                      label="Follow-up state"
                      options={FOLLOW_UP_OPTIONS}
                      values={draft.followUpStates}
                      onChange={(followUpStates) => {
                        setDraft({
                          ...draft,
                          followUpStates:
                            followUpStates.filter(isFollowUpState),
                        });
                      }}
                    />
                  </TabsContent>

                  <TabsContent
                    value="location"
                    className="m-0 grid gap-4 md:grid-cols-2"
                  >
                    <FilterChecklist
                      label="District"
                      options={options.districts.map((item) => ({
                        value: item,
                        label: item,
                      }))}
                      values={draft.districts}
                      onChange={(districts) => {
                        setDraft({ ...draft, districts });
                      }}
                    />
                    <FilterChecklist
                      label="City"
                      options={options.cities.map((item) => ({
                        value: item,
                        label: item,
                      }))}
                      values={draft.cities}
                      onChange={(cities) => {
                        setDraft({ ...draft, cities });
                      }}
                    />
                  </TabsContent>

                  <TabsContent
                    value="attention"
                    className="m-0 grid gap-4 md:grid-cols-2"
                  >
                    <FilterChecklist
                      label="Attention severity"
                      options={ISSUE_SEVERITY_OPTIONS}
                      values={draft.issueSeverities}
                      onChange={(issueSeverities) => {
                        setDraft({
                          ...draft,
                          issueSeverities:
                            issueSeverities.filter(isIssueSeverity),
                        });
                      }}
                    />
                    <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed p-5 text-center">
                      <div>
                        <CircleAlert
                          aria-hidden="true"
                          className="mx-auto size-6 text-muted-readable"
                        />
                        <p className="mt-2 text-body-sm font-medium">
                          Detailed Support filters have been retired
                        </p>
                        <p className="mt-1 text-caption text-muted-readable">
                          Severity remains available because it still scopes
                          authoritative attention metrics in the current
                          dashboard.
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </DialogBody>

            <DialogFooter className="sm:justify-between">
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={draftCount === 0}
                  onClick={() => {
                    setDraft(emptyDraft());
                  }}
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDraft(draftFromQuery(query));
                  }}
                >
                  Restore applied
                </Button>
                <Button
                  type="button"
                  disabled={options === null}
                  onClick={() => {
                    navigate({ ...draft });
                    setOpen(false);
                  }}
                >
                  <SlidersHorizontal aria-hidden="true" />
                  Apply{" "}
                  {draftCount > 0 ? `${String(draftCount)} filters` : "filters"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {query.q !== undefined ? (
          <Badge variant="outline" className="max-w-72 gap-1.5">
            <Search aria-hidden="true" className="size-3" />
            <span className="truncate">{query.q}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Clear page search"
              onClick={() => {
                navigate({ q: null });
              }}
            >
              <X aria-hidden="true" className="size-3" />
            </Button>
          </Badge>
        ) : null}
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
          <TooltipContent>
            Reload dashboard data without changing the current filters.
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" asChild>
              <Link href={engagementDashboardResetHref(route)} prefetch={false}>
                <RotateCcw aria-hidden="true" className="size-4" />
                Reset
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Restore the default 30-day view, 72-hour journey maturity horizon,
            and clear every filter.
          </TooltipContent>
        </Tooltip>
      </div>
    </ContentToolbar>
  );
}

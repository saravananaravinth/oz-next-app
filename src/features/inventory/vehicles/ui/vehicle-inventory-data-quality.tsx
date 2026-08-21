// oz-next-app/src/features/inventory/vehicles/ui/vehicle-inventory-data-quality.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BatteryCharging,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Mail,
  RefreshCw,
  SlidersHorizontal,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { requestId } from "@/lib/security/request-identifiers";
import { cn } from "@/lib/utils";
import { useToast } from "@/shared/hooks/use-toast";

import {
  emailVehicleInventoryDataQualityReportAction,
  loadVehicleInventoryDataQualityIssuesAction,
  runVehicleInventoryRemediationAction,
  type VehicleInventoryRemediationActionResult,
} from "@/features/inventory/vehicles/actions/vehicle-inventory.actions";
import {
  vehicleInventorySearchParamsSchema,
  type VehicleInventoryArrivalUpdate,
  type VehicleInventoryBatteryConfigurationSelection,
  type VehicleInventoryBatteryConfigurationTarget,
  type VehicleInventoryChargerSelection,
  type VehicleInventoryDataQualityIssue,
  type VehicleInventoryDataQualityIssuesResult,
  type VehicleInventoryRemediationCategory,
  type VehicleInventoryRemediationResult,
  type VehicleInventorySearchParams,
  type VehicleInventoryVariantRecommendation,
  type VehicleInventoryVariantResolution,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
import type { VehicleInventoryContext } from "@/features/inventory/vehicles/policies/vehicle-inventory.policy";
import {
  inventoryReviewRecoveryPresentation,
  type InventoryReviewRecovery,
  type RemediationRetryIntent,
} from "@/features/inventory/vehicles/ui/vehicle-inventory-recovery";

export type VehicleInventoryDataQualityCounts = Readonly<{
  missingVariant: number;
  unknownArrivalDate: number;
  statusMismatch: number;
  metadataVariantModelMismatch: number;
  missingMrp: number;
  missingTaxConfiguration: number;
  inactiveStore: number;
}>;

type FlowStep =
  "CATEGORY" | "WORKING" | "ARRIVAL_DATES" | "CHARGERS" | "RESULT" | "ERROR";

type VehicleInventoryServerActionQuery = Parameters<
  typeof loadVehicleInventoryDataQualityIssuesAction
>[0]["query"];

const CATEGORY_META = {
  MISSING_VARIANT: {
    title: "Missing variant",
    description:
      "Resolve variants from installed battery evidence and ask for charger type only when the battery match is genuinely ambiguous.",
    icon: BatteryCharging,
  },
  UNKNOWN_ARRIVAL_DATE: {
    title: "Arrival date needed",
    description:
      "Record the verified date each affected vehicle reached the dealership.",
    icon: CalendarClock,
  },
} as const satisfies Readonly<
  Record<
    VehicleInventoryRemediationCategory,
    Readonly<{
      title: string;
      description: string;
      icon: LucideIcon;
    }>
  >
>;

const CATEGORY_ORDER = [
  "MISSING_VARIANT",
  "UNKNOWN_ARRIVAL_DATE",
] as const satisfies readonly VehicleInventoryRemediationCategory[];

const WORKING_STEPS_BY_CATEGORY = {
  MISSING_VARIANT: [
    "Checking your permission and inventory scope",
    "Inspecting installed batteries and their configuration",
    "Matching or generating the equivalent catalog variant",
    "Refreshing pricing, margins, metadata, and inventory quality",
  ],
  UNKNOWN_ARRIVAL_DATE: [
    "Checking your permission and inventory scope",
    "Loading vehicles that need an arrival date",
    "Checking each vehicle and stock location",
    "Preparing the arrival-date review",
  ],
} as const satisfies Readonly<
  Record<VehicleInventoryRemediationCategory, readonly string[]>
>;

const VARIANT_REASON_LABELS = {
  MODEL_METADATA_MISSING: "Model metadata is missing",
  BATTERY_NOT_INSTALLED: "Battery evidence is missing",
  MULTIPLE_BATTERY_CHEMISTRIES: "Multiple battery chemistries are installed",
  GRAPHENE_PACK_COUNT_UNSUPPORTED: "Graphene battery count is unsupported",
  GRAPHENE_VARIANT_NOT_CONFIGURED: "Graphene voltage variant is not configured",
  BATTERY_CONFIGURATION_INCOMPLETE: "Battery configuration is incomplete",
  VARIANT_NOT_CONFIGURED: "Equivalent variant is not configured",
  CHARGER_SELECTION_REQUIRED: "Charger type is required",
  MULTIPLE_ACTIVE_CHARGERS: "Multiple chargers are attached",
  CHARGER_NOT_COMPATIBLE: "Charger does not match the candidate variant",
  MULTIPLE_VARIANTS_MATCH: "Multiple variants still match",
} as const satisfies Readonly<
  Record<VehicleInventoryVariantResolution["reason"], string>
>;

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
});

function toServerActionQuery(
  query: VehicleInventorySearchParams,
): VehicleInventoryServerActionQuery {
  return {
    ...query,
    status: [...query.status],
    entryType: [...query.entryType],
    orgUnitId: [...query.orgUnitId],
    storeId: [...query.storeId],
    modelId: [...query.modelId],
    variantId: [...query.variantId],
    fuel: [...query.fuel],
    segment: [...query.segment],
    color: [...query.color],
    ageBucket: [...query.ageBucket],
    warning: [...query.warning],
  };
}

function dateToIso(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${String(year)}-${month}-${day}`;
}

function isoToLocalDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function countForCategory(
  counts: VehicleInventoryDataQualityCounts,
  category: VehicleInventoryRemediationCategory,
): number {
  switch (category) {
    case "MISSING_VARIANT":
      return counts.missingVariant;
    case "UNKNOWN_ARRIVAL_DATE":
      return counts.unknownArrivalDate;
  }
}

function totalWarnings(counts: VehicleInventoryDataQualityCounts): number {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

function actionableWarnings(counts: VehicleInventoryDataQualityCounts): number {
  return counts.missingVariant + counts.unknownArrivalDate;
}

function unsupportedWarnings(
  counts: VehicleInventoryDataQualityCounts,
): number {
  return Math.max(0, totalWarnings(counts) - actionableWarnings(counts));
}

function WarningSummary({
  counts,
}: Readonly<{
  counts: VehicleInventoryDataQualityCounts;
}>): React.ReactElement {
  const otherCount = unsupportedWarnings(counts);

  return (
    <div
      className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-caption text-muted-readable"
      aria-hidden="true"
    >
      {counts.missingVariant > 0 ? (
        <span className="shrink-0">
          {counts.missingVariant.toLocaleString("en-IN")} variant
          {counts.missingVariant === 1 ? "" : "s"}
        </span>
      ) : null}
      {counts.missingVariant > 0 && counts.unknownArrivalDate > 0 ? (
        <span className="text-border">•</span>
      ) : null}
      {counts.unknownArrivalDate > 0 ? (
        <span className="shrink-0">
          {counts.unknownArrivalDate.toLocaleString("en-IN")} arrival date
          {counts.unknownArrivalDate === 1 ? "" : "s"}
        </span>
      ) : null}
      {otherCount > 0 ? (
        <>
          {counts.missingVariant > 0 || counts.unknownArrivalDate > 0 ? (
            <span className="text-border">•</span>
          ) : null}
          <span className="shrink-0">
            {otherCount.toLocaleString("en-IN")} other check
            {otherCount === 1 ? "" : "s"}
          </span>
        </>
      ) : null}
    </div>
  );
}

function CategorySelector({
  counts,
  onSelect,
}: Readonly<{
  counts: VehicleInventoryDataQualityCounts;
  onSelect: (category: VehicleInventoryRemediationCategory) => void;
}>): React.ReactElement {
  const visibleCategories = CATEGORY_ORDER.filter(
    (category) => countForCategory(counts, category) > 0,
  );
  const otherCount = unsupportedWarnings(counts);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2.5">
        {visibleCategories.map((category) => {
          const meta = CATEGORY_META[category];
          const Icon = meta.icon;
          const count = countForCategory(counts, category);

          return (
            <button
              key={category}
              type="button"
              onClick={() => {
                onSelect(category);
              }}
              className="group flex min-h-20 w-full items-center gap-3.5 rounded-2xl border border-border/70 bg-card px-4 py-3 text-left shadow-xs outline-none transition-[background-color,border-color,box-shadow,transform] duration-[var(--motion-duration-fast)] ease-enterprise hover:-translate-y-px hover:border-warning/35 hover:bg-warning/[0.045] hover:shadow-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-warning/25 bg-warning/10 text-warning-foreground dark:text-warning">
                <Icon aria-hidden="true" className="size-4.5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-card-title text-foreground">
                    {meta.title}
                  </strong>
                  <Badge variant="warning" className="h-5 px-2 text-tabular">
                    {count.toLocaleString("en-IN")}
                  </Badge>
                </span>
                <span className="mt-0.5 block text-body-sm text-muted-readable">
                  {meta.description}
                </span>
              </span>

              <ChevronRight
                aria-hidden="true"
                className="size-4.5 shrink-0 text-muted-readable transition-transform duration-[var(--motion-duration-fast)] ease-enterprise group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
              />
            </button>
          );
        })}
      </div>

      <Alert variant="info">
        <ShieldCheck aria-hidden="true" />
        <AlertTitle>Controlled automatic correction</AlertTitle>
        <AlertDescription>
          Variant assignment uses verified model, battery, and charger evidence.
          Graphene uses its installed 12V battery count, and equivalent LFP/NMC
          variants are generated only from an existing counterpart
          configuration. Ambiguous charger-dependent matches always require
          confirmation.
          {otherCount > 0
            ? ` ${otherCount.toLocaleString("en-IN")} additional warning${otherCount === 1 ? "" : "s"} remain diagnostic and are not part of this automatic workflow.`
            : ""}
        </AlertDescription>
      </Alert>
    </div>
  );
}

function WorkingState({
  category,
  phase,
}: Readonly<{
  category: VehicleInventoryRemediationCategory;
  phase: number;
}>): React.ReactElement {
  const steps = WORKING_STEPS_BY_CATEGORY[category];
  const progress = Math.min(92, 18 + phase * 23);

  return (
    <div
      className="grid place-items-center gap-5 py-8 text-center"
      role="status"
    >
      <div className="relative grid size-16 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
        <span className="absolute inset-2 animate-ping rounded-xl border border-primary/20 motion-reduce:animate-none" />
        <Wrench aria-hidden="true" className="size-7" />
      </div>

      <div className="grid max-w-xl gap-1.5">
        <h3 className="text-subsection-title">
          {category === "MISSING_VARIANT"
            ? "Resolving vehicle variants"
            : "Preparing arrival-date review"}
        </h3>
        <p className="text-body-sm text-muted-readable" aria-live="polite">
          {steps[Math.min(phase, steps.length - 1)]}
        </p>
      </div>

      <Progress value={progress} className="w-full max-w-md" />

      <div className="grid w-full max-w-md gap-1.5 text-left">
        {steps.map((label, index) => (
          <div
            key={label}
            className={cn(
              "flex min-h-9 items-center gap-2 rounded-xl px-3 text-caption",
              index < phase
                ? "bg-success/10 text-success"
                : index === phase
                  ? "bg-primary/10 text-primary"
                  : "text-muted-readable",
            )}
          >
            {index < phase ? (
              <CheckCircle2 aria-hidden="true" className="size-4" />
            ) : index === phase ? (
              <Spinner decorative className="size-4" />
            ) : (
              <span aria-hidden="true" className="size-4 rounded-full border" />
            )}
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function IssueIdentity({
  issue,
}: Readonly<{ issue: VehicleInventoryDataQualityIssue }>): React.ReactElement {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-body-sm text-foreground">
          {issue.modelName ?? "Unknown model"}
        </strong>
        {issue.variantName === null ? null : (
          <Badge variant="outline">{issue.variantName}</Badge>
        )}
      </div>
      <p className="mt-1 font-mono text-caption text-foreground">
        {issue.vin ?? "VIN unavailable"}
      </p>
      <p className="mt-1 text-caption text-muted-readable">
        {[issue.colorName, ...issue.componentTypes]
          .filter((value): value is string => value !== null)
          .join(" · ") || "No component metadata"}
      </p>
    </div>
  );
}

function ArrivalDatePicker({
  value,
  onChange,
  label,
}: Readonly<{
  value: string | undefined;
  onChange: (value: string) => void;
  label: string;
}>): React.ReactElement {
  const selected = value === undefined ? undefined : isoToLocalDate(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-start text-left font-normal"
          aria-label={label}
        >
          <CalendarClock aria-hidden="true" className="size-4" />
          {selected === undefined
            ? "Select arrival date"
            : DATE_FORMATTER.format(selected)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date !== undefined) {
              onChange(dateToIso(date));
            }
          }}
          disabled={{ after: new Date() }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function ArrivalIssuesForm({
  issues,
  dates,
  onDateChange,
}: Readonly<{
  issues: VehicleInventoryDataQualityIssuesResult;
  dates: Readonly<Record<string, string | undefined>>;
  onDateChange: (unitId: string, value: string) => void;
}>): React.ReactElement {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-muted/35 px-4 py-3">
        <div className="min-w-0">
          <p className="text-card-title text-foreground">
            Verify arrival dates
          </p>
          <p className="mt-0.5 text-caption text-muted-readable">
            Record the confirmed dealership arrival date for every vehicle in
            this batch.
          </p>
        </div>
        <Badge variant="secondary" className="text-tabular">
          {issues.total.toLocaleString("en-IN")} affected
        </Badge>
      </div>

      <div className="grid gap-2.5">
        {issues.items.map((issue) => (
          <article
            key={issue.unitId}
            className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-xs lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] lg:items-center"
          >
            <IssueIdentity issue={issue} />
            <ArrivalDatePicker
              value={dates[issue.unitId]}
              onChange={(value) => {
                onDateChange(issue.unitId, value);
              }}
              label={`Arrival date for ${issue.vin ?? issue.unitId}`}
            />
          </article>
        ))}
      </div>

      {issues.truncated ? (
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>More vehicles remain</AlertTitle>
          <AlertDescription>
            This review is limited to the first 100 records. Complete this
            batch, then reopen the workflow for the remaining vehicles.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function chargerIssues(
  issues: VehicleInventoryDataQualityIssuesResult,
): readonly VehicleInventoryDataQualityIssue[] {
  return issues.items.filter(
    (issue) =>
      issue.variantResolution?.requiresChargerSelection === true &&
      issue.variantResolution.chargerOptions.length > 0,
  );
}

function ChargerSelectionForm({
  issues,
  selections,
  onChange,
}: Readonly<{
  issues: VehicleInventoryDataQualityIssuesResult;
  selections: Readonly<Record<string, string | undefined>>;
  onChange: (unitId: string, chargerComponentId: string) => void;
}>): React.ReactElement {
  const pendingIssues = chargerIssues(issues);

  return (
    <div className="grid gap-3">
      <Alert variant="info">
        <BatteryCharging aria-hidden="true" />
        <AlertTitle>Battery match needs one charger confirmation</AlertTitle>
        <AlertDescription>
          These vehicles have battery configurations shared by more than one
          variant. Select the charger that belongs to each vehicle. The ERP uses
          this answer only as a validated variant-resolution discriminator.
        </AlertDescription>
      </Alert>

      <div className="grid gap-2.5">
        {pendingIssues.map((issue) => {
          const resolution = issue.variantResolution;
          if (resolution === null) {
            return null;
          }

          return (
            <fieldset
              key={issue.unitId}
              className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-xs"
            >
              <legend className="sr-only">
                Charger type for {issue.vin ?? issue.unitId}
              </legend>
              <IssueIdentity issue={issue} />
              <p className="text-caption text-muted-readable">
                {resolution.detail}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {resolution.chargerOptions.map((option) => {
                  const checked =
                    selections[issue.unitId] === option.componentId;
                  return (
                    <label
                      key={option.componentId}
                      className={cn(
                        "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 outline-none transition-colors",
                        checked
                          ? "border-primary/45 bg-primary/10"
                          : "border-border/70 bg-background hover:bg-muted/45",
                      )}
                    >
                      <input
                        type="radio"
                        name={`charger-${issue.unitId}`}
                        value={option.componentId}
                        checked={checked}
                        onChange={() => {
                          onChange(issue.unitId, option.componentId);
                        }}
                        className="size-4 accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="block text-body-sm font-medium text-foreground">
                          {option.name}
                        </span>
                        <span className="block text-caption text-muted-readable">
                          {option.code}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      {issues.truncated ? (
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>More unresolved vehicles remain</AlertTitle>
          <AlertDescription>
            Complete this bounded batch, then reopen the workflow for the next
            group of vehicles.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function ResultMetric({
  label,
  value,
  tone = "neutral",
}: Readonly<{
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "destructive";
}>): React.ReactElement {
  const emphasized = value > 0;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card px-3.5 py-3 shadow-xs",
        tone === "success" &&
          emphasized &&
          "border-success/30 bg-success/[0.035]",
        tone === "warning" &&
          emphasized &&
          "border-warning/35 bg-warning/[0.045]",
        tone === "destructive" &&
          emphasized &&
          "border-destructive/30 bg-destructive/[0.035]",
        (tone === "neutral" || !emphasized) && "border-border/70",
      )}
    >
      <dt className="text-caption text-muted-readable">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-xl font-semibold leading-none text-tabular text-foreground",
          tone === "success" && emphasized && "text-success",
          tone === "warning" &&
            emphasized &&
            "text-warning-foreground dark:text-warning",
          tone === "destructive" && emphasized && "text-destructive",
        )}
      >
        {value.toLocaleString("en-IN")}
      </dd>
    </div>
  );
}

function VariantResolutionEvidence({
  resolution,
}: Readonly<{
  resolution: VehicleInventoryVariantResolution;
}>): React.ReactElement {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {resolution.batteryType === null ? null : (
        <Badge variant="outline">Battery: {resolution.batteryType}</Badge>
      )}
      {resolution.batteryPackCount > 0 ? (
        <Badge variant="outline">
          {resolution.batteryPackCount.toLocaleString("en-IN")} battery
          {resolution.batteryPackCount === 1 ? "" : " packs"}
        </Badge>
      ) : null}
      {resolution.expectedVoltageV === null ? null : (
        <Badge variant="outline">
          Expected: {resolution.expectedVoltageV.toLocaleString("en-IN")}V
        </Badge>
      )}
    </div>
  );
}

function fallbackVariantRecommendation(
  resolution: VehicleInventoryVariantResolution,
): VehicleInventoryVariantRecommendation {
  const action: VehicleInventoryVariantRecommendation["action"] =
    resolution.reason === "BATTERY_NOT_INSTALLED"
      ? "NO_ACTION"
      : resolution.reason === "BATTERY_CONFIGURATION_INCOMPLETE"
        ? "CONFIGURE_BATTERY"
        : resolution.reason === "VARIANT_NOT_CONFIGURED"
          ? "REQUEST_VARIANT_CREATION"
          : resolution.reason === "MULTIPLE_BATTERY_CHEMISTRIES"
            ? "REMOVE_BATTERY"
            : resolution.reason === "GRAPHENE_PACK_COUNT_UNSUPPORTED"
              ? resolution.batteryPackCount < 4
                ? "ADD_BATTERIES"
                : "REMOVE_BATTERIES"
              : resolution.requiresChargerSelection
                ? "SELECT_CHARGER"
                : "REVIEW_CONFIGURATION";

  return {
    decisionId: "frontend.compatibility-fallback",
    action,
    severity: action === "NO_ACTION" ? "INFO" : "WARNING",
    title: VARIANT_REASON_LABELS[resolution.reason],
    instruction: resolution.detail,
    automaticResolutionExpected:
      action === "CONFIGURE_BATTERY" || action === "SELECT_CHARGER",
    targetBatteryPackCount: null,
    batteryPackDelta: null,
    targetBatteryType: resolution.batteryType,
    targetComponentSerialNumbers: [],
  };
}

function effectiveVariantRecommendation(
  resolution: VehicleInventoryVariantResolution,
): VehicleInventoryVariantRecommendation {
  return resolution.recommendation ?? fallbackVariantRecommendation(resolution);
}

function batteryConfigurationOptionLabel(
  option: VehicleInventoryBatteryConfigurationTarget["options"][number],
): string {
  const details = [
    option.capacityKwh === null
      ? null
      : `${option.capacityKwh.toLocaleString("en-IN")} kWh`,
    option.voltageV === null
      ? null
      : `${option.voltageV.toLocaleString("en-IN")}V`,
    option.ampHours === null
      ? null
      : `${option.ampHours.toLocaleString("en-IN")}Ah`,
    option.bms,
    option.mounting,
  ].filter((value): value is string => value !== null && value.length > 0);

  return details.length === 0
    ? option.id
    : `${option.id} · ${details.join(" · ")}`;
}

function BatteryConfigurationDialog({
  issue,
  open,
  pending,
  onOpenChange,
  onSubmit,
}: Readonly<{
  issue: VehicleInventoryDataQualityIssue;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    selections: readonly VehicleInventoryBatteryConfigurationSelection[],
  ) => void;
}>): React.ReactElement {
  const targets = issue.variantResolution?.batteryConfigurations ?? [];
  const [selections, setSelections] = React.useState<
    Readonly<Record<string, string | undefined>>
  >({});
  const configurableTargets = targets.filter(
    (target) => target.options.length > 0,
  );
  const complete =
    configurableTargets.length > 0 &&
    configurableTargets.every(
      (target) => selections[target.compInvId] !== undefined,
    );

  function submit(): void {
    if (!complete) {
      return;
    }

    const values: VehicleInventoryBatteryConfigurationSelection[] = [];
    for (const target of configurableTargets) {
      const configurationId = selections[target.compInvId];
      if (configurationId === undefined) {
        return;
      }
      values.push({
        unitId: issue.unitId,
        compInvId: target.compInvId,
        configurationId,
      });
    }

    onSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Complete battery configuration</DialogTitle>
          <DialogDescription>
            Select the verified catalog configuration for the installed battery.
            The ERP validates the vehicle, installed component, and canonical
            model configuration again before saving.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <IssueIdentity issue={issue} />

          {configurableTargets.length === 0 ? (
            <Alert variant="warning">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>
                No safe configuration choices are available
              </AlertTitle>
              <AlertDescription>
                The installed battery is missing configuration metadata, but no
                canonical option could be derived safely for this vehicle model.
                Review the catalog configuration with ERP IT.
              </AlertDescription>
            </Alert>
          ) : (
            configurableTargets.map((target, targetIndex) => (
              <fieldset
                key={target.compInvId}
                className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4"
              >
                <legend className="px-1 text-card-title text-foreground">
                  Battery {targetIndex + 1}
                  {target.serialNumber === null
                    ? ""
                    : ` · ${target.serialNumber}`}
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{target.batteryType}</Badge>
                  <Badge variant="outline">
                    {target.options.length.toLocaleString("en-IN")} verified
                    option{target.options.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="grid gap-2">
                  {target.options.map((option) => {
                    const checked = selections[target.compInvId] === option.id;
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-body-sm outline-none transition-colors",
                          checked
                            ? "border-primary/45 bg-primary/10"
                            : "border-border/70 bg-background hover:bg-muted/45",
                        )}
                      >
                        <input
                          type="radio"
                          name={`battery-config-${target.compInvId}`}
                          value={option.id}
                          checked={checked}
                          onChange={() => {
                            setSelections((current) => ({
                              ...current,
                              [target.compInvId]: option.id,
                            }));
                          }}
                          className="mt-1 size-4 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-foreground">
                            {batteryConfigurationOptionLabel(option)}
                          </span>
                          <span className="mt-0.5 block text-caption text-muted-readable">
                            Choose only after confirming the physical battery
                            specification.
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={submit}
            disabled={!complete || pending}
          >
            {pending ? (
              <Spinner decorative />
            ) : (
              <SlidersHorizontal aria-hidden="true" className="size-4" />
            )}
            Save and resolve variant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnresolvedVariantReasons({
  issues,
  requestingVariantUnitId,
  onConfigureBattery,
  onRequestVariant,
}: Readonly<{
  issues: VehicleInventoryDataQualityIssuesResult;
  requestingVariantUnitId: string | null;
  onConfigureBattery: (issue: VehicleInventoryDataQualityIssue) => void;
  onRequestVariant: (issue: VehicleInventoryDataQualityIssue) => void;
}>): React.ReactElement | null {
  const unresolved = issues.items.filter((issue) => {
    const resolution = issue.variantResolution;
    if (resolution === null || resolution.reason === "BATTERY_NOT_INSTALLED") {
      return false;
    }

    return effectiveVariantRecommendation(resolution).action !== "NO_ACTION";
  });

  if (unresolved.length === 0) {
    return null;
  }

  return (
    <section
      className="grid gap-2.5"
      aria-labelledby="variant-unresolved-title"
    >
      <div>
        <h4
          id="variant-unresolved-title"
          className="text-card-title text-foreground"
        >
          Why these variants are still unresolved
        </h4>
        <p className="mt-0.5 text-caption text-muted-readable">
          Each item shows the next safe action. Automatic changes are made only
          when the evidence is deterministic.
        </p>
      </div>
      {unresolved.map((issue) => {
        const resolution = issue.variantResolution;
        if (resolution === null) {
          return null;
        }
        const recommendation = effectiveVariantRecommendation(resolution);
        const isBatteryConfiguration =
          resolution.reason === "BATTERY_CONFIGURATION_INCOMPLETE" &&
          recommendation.action === "CONFIGURE_BATTERY";
        const canRequestVariant =
          resolution.reason === "VARIANT_NOT_CONFIGURED" &&
          recommendation.action === "REQUEST_VARIANT_CREATION";
        const cardContent = (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <IssueIdentity issue={issue} />
              <Badge variant="warning">
                {VARIANT_REASON_LABELS[resolution.reason]}
              </Badge>
            </div>
            <div className="mt-3 rounded-xl border border-warning/25 bg-background/55 px-3 py-2.5">
              <p className="font-medium text-foreground">
                {recommendation.title}
              </p>
              <p className="mt-1 text-body-sm text-muted-readable">
                {recommendation.instruction}
              </p>
            </div>
            <VariantResolutionEvidence resolution={resolution} />
            {recommendation.targetComponentSerialNumbers.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recommendation.targetComponentSerialNumbers.map((serial) => (
                  <Badge key={serial} variant="outline">
                    Remove: {serial}
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <code className="text-[0.6875rem] text-muted-readable">
                {resolution.reason}
              </code>
              {isBatteryConfiguration ? (
                <span className="inline-flex items-center gap-1.5 text-caption font-medium text-primary">
                  <SlidersHorizontal aria-hidden="true" className="size-3.5" />
                  Configure battery
                </span>
              ) : canRequestVariant ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={requestingVariantUnitId !== null}
                  onClick={() => {
                    onRequestVariant(issue);
                  }}
                >
                  {requestingVariantUnitId === issue.unitId ? (
                    <Spinner decorative />
                  ) : (
                    <Mail aria-hidden="true" className="size-4" />
                  )}
                  Email IT to create variant
                </Button>
              ) : null}
            </div>
          </>
        );

        return isBatteryConfiguration ? (
          <button
            key={issue.unitId}
            type="button"
            onClick={() => {
              onConfigureBattery(issue);
            }}
            className="w-full rounded-2xl border border-warning/35 bg-warning/[0.045] p-4 text-left shadow-xs outline-none transition-colors hover:bg-warning/[0.075] focus-visible:ring-3 focus-visible:ring-ring/45"
          >
            {cardContent}
          </button>
        ) : (
          <article
            key={issue.unitId}
            className="rounded-2xl border border-warning/30 bg-warning/[0.035] p-4"
          >
            {cardContent}
          </article>
        );
      })}
    </section>
  );
}

function ResultState({
  result,
  category,
  issues,
  requestingVariantUnitId,
  onConfigureBattery,
  onRequestVariant,
}: Readonly<{
  result: VehicleInventoryRemediationResult;
  category: VehicleInventoryRemediationCategory;
  issues: VehicleInventoryDataQualityIssuesResult | null;
  requestingVariantUnitId: string | null;
  onConfigureBattery: (issue: VehicleInventoryDataQualityIssue) => void;
  onRequestVariant: (issue: VehicleInventoryDataQualityIssue) => void;
}>): React.ReactElement {
  const allResolved = result.unresolved === 0 && result.conflicts === 0;
  const resolutionPercent =
    result.attempted === 0
      ? 0
      : Math.min(100, Math.round((result.resolved / result.attempted) * 100));

  return (
    <div className="grid gap-4">
      <section
        className={cn(
          "rounded-2xl border p-4 shadow-xs",
          allResolved
            ? "border-success/30 bg-success/[0.045]"
            : "border-warning/35 bg-warning/[0.045]",
        )}
        aria-labelledby="inventory-review-outcome-title"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl border",
              allResolved
                ? "border-success/30 bg-success/10 text-success"
                : "border-warning/35 bg-warning/10 text-warning-foreground dark:text-warning",
            )}
          >
            {allResolved ? (
              <CheckCircle2 aria-hidden="true" className="size-5" />
            ) : (
              <AlertTriangle aria-hidden="true" className="size-5" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                id="inventory-review-outcome-title"
                className="text-card-title text-foreground"
              >
                {allResolved ? "Review complete" : "Follow-up required"}
              </h3>
              <Badge variant={allResolved ? "success" : "warning"}>
                {allResolved
                  ? "All resolved"
                  : `${result.unresolved.toLocaleString("en-IN")} remaining`}
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-body-sm text-muted-readable">
              {allResolved
                ? "All reviewed records were resolved using verified inventory data."
                : "Verified updates were saved. Records without deterministic evidence remain unchanged; the exact blocking reason is shown below when available."}
            </p>

            {result.attempted > 0 ? (
              <div className="mt-3 grid gap-1.5">
                <div className="flex items-center justify-between gap-3 text-caption text-muted-readable">
                  <span>
                    {result.resolved.toLocaleString("en-IN")} of{" "}
                    {result.attempted.toLocaleString("en-IN")} resolved
                  </span>
                  <span className="text-tabular">{resolutionPercent}%</span>
                </div>
                <Progress value={resolutionPercent} className="h-1.5" />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <ResultMetric label="Reviewed" value={result.attempted} />
        <ResultMetric label="Resolved" value={result.resolved} tone="success" />
        <ResultMetric
          label="Needs follow-up"
          value={result.unresolved}
          tone="warning"
        />
        <ResultMetric
          label="Conflicts"
          value={result.conflicts}
          tone="destructive"
        />
      </dl>

      {category === "MISSING_VARIANT" && issues !== null ? (
        <UnresolvedVariantReasons
          issues={issues}
          requestingVariantUnitId={requestingVariantUnitId}
          onConfigureBattery={onConfigureBattery}
          onRequestVariant={onRequestVariant}
        />
      ) : null}

      {result.hasMore ? (
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>More records remain</AlertTitle>
          <AlertDescription>
            This bounded review did not include every affected record. Reopen
            the workflow to continue with the next batch.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function dialogTitle(
  step: FlowStep,
  category: VehicleInventoryRemediationCategory | null,
): string {
  if (step === "CATEGORY") {
    return "Review inventory issues";
  }

  if (step === "CHARGERS") {
    return "Confirm charger type";
  }

  if (step === "RESULT") {
    return "Inventory review result";
  }

  if (step === "ERROR") {
    return "Inventory review could not continue";
  }

  if (category === null) {
    return "Inventory correction";
  }

  return CATEGORY_META[category].title;
}

function dialogDescription(
  step: FlowStep,
  category: VehicleInventoryRemediationCategory | null,
): string {
  if (step === "CATEGORY") {
    return "Choose an issue type to review. Only verified, permission-checked corrections are saved.";
  }

  if (step === "ARRIVAL_DATES") {
    return "Confirm each dealership arrival date before saving this bounded batch.";
  }

  if (step === "CHARGERS") {
    return "Confirm charger type only for vehicles whose battery evidence matches multiple charger-specific variants.";
  }

  if (step === "WORKING") {
    return "Checking authorized inventory and verified ERP data. No uncertain changes are applied automatically.";
  }

  if (step === "RESULT") {
    return "Review what was resolved and the exact reason for any record that remains unresolved.";
  }

  if (category !== null) {
    return CATEGORY_META[category].description;
  }

  return "Use the guidance below to recover or return to the issue list.";
}

export function VehicleInventoryDataQuality({
  counts,
  context,
  query,
  canRemediate,
}: Readonly<{
  counts: VehicleInventoryDataQualityCounts;
  context: VehicleInventoryContext;
  query: VehicleInventorySearchParams;
  canRemediate: boolean;
}>): React.ReactElement | null {
  const router = useRouter();
  const toast = useToast();
  const total = totalWarnings(counts);
  const actionableTotal = actionableWarnings(counts);
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<FlowStep>("CATEGORY");
  const [category, setCategory] =
    React.useState<VehicleInventoryRemediationCategory | null>(null);
  const [issues, setIssues] =
    React.useState<VehicleInventoryDataQualityIssuesResult | null>(null);
  const [dates, setDates] = React.useState<
    Readonly<Record<string, string | undefined>>
  >({});
  const [chargerSelections, setChargerSelections] = React.useState<
    Readonly<Record<string, string | undefined>>
  >({});
  const [result, setResult] =
    React.useState<VehicleInventoryRemediationResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState(0);
  const [recovery, setRecovery] =
    React.useState<InventoryReviewRecovery | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [variantEmailPending, startVariantEmailTransition] =
    React.useTransition();
  const [batteryConfigurationIssue, setBatteryConfigurationIssue] =
    React.useState<VehicleInventoryDataQualityIssue | null>(null);
  const [requestingVariantUnitId, setRequestingVariantUnitId] = React.useState<
    string | null
  >(null);
  const idempotencyKeyRef = React.useRef<string | null>(null);
  const variantEmailKeysRef = React.useRef(new Map<string, string>());

  React.useEffect(() => {
    if (step !== "WORKING" || !pending) {
      return;
    }

    const timer = setInterval(() => {
      setPhase((current) => Math.min(current + 1, 3));
    }, 900);

    return () => {
      clearInterval(timer);
    };
  }, [pending, step]);

  if (total === 0) {
    return null;
  }

  function newIntentKey(prefix: string): string {
    idempotencyKeyRef.current ??= requestId(prefix);
    return idempotencyKeyRef.current;
  }

  function resetFlow(): void {
    setStep("CATEGORY");
    setCategory(null);
    setIssues(null);
    setDates({});
    setChargerSelections({});
    setBatteryConfigurationIssue(null);
    setRequestingVariantUnitId(null);
    setResult(null);
    setErrorMessage(null);
    setPhase(0);
    setRecovery(null);
    idempotencyKeyRef.current = null;
  }

  function failureDescription(
    failure: Extract<VehicleInventoryRemediationActionResult, { ok: false }>,
  ): string {
    return failure.requestId === undefined
      ? failure.message
      : `${failure.message} Reference: ${failure.requestId}`;
  }

  function showFailure(
    actionResult: Extract<
      VehicleInventoryRemediationActionResult,
      { ok: false }
    >,
    title: string,
    nextRecovery: InventoryReviewRecovery | null = null,
  ): void {
    const description = failureDescription(actionResult);
    setRecovery(nextRecovery);
    setErrorMessage(description);
    setStep("ERROR");
    toast.error({
      title,
      description,
      replace: true,
    });
  }

  async function loadIssues(
    issueCategory: VehicleInventoryRemediationCategory,
  ) {
    return await loadVehicleInventoryDataQualityIssuesAction({
      context,
      query: toServerActionQuery(query),
      category: issueCategory,
    });
  }

  function showCompletedResult(
    completedResult: VehicleInventoryRemediationResult,
  ): void {
    setRecovery(null);
    setErrorMessage(null);
    setStep("RESULT");
    toast.success({
      title: "Inventory review completed",
      description:
        completedResult.unresolved === 0
          ? `${completedResult.resolved.toLocaleString("en-IN")} record${completedResult.resolved === 1 ? "" : "s"} resolved.`
          : `${completedResult.resolved.toLocaleString("en-IN")} resolved · ${completedResult.unresolved.toLocaleString("en-IN")} still need review.`,
      replace: true,
    });
    router.refresh();
  }

  function continueAfterVariantIssues(
    latestIssues: VehicleInventoryDataQualityIssuesResult,
    completedResult: VehicleInventoryRemediationResult,
  ): void {
    setIssues(latestIssues);

    if (chargerIssues(latestIssues).length > 0) {
      setRecovery(null);
      setChargerSelections({});
      setErrorMessage(null);
      setStep("CHARGERS");
      toast.info({
        title: "Charger confirmation required",
        description:
          "Automatic battery matching resolved what it could. Confirm charger type for the remaining ambiguous vehicles.",
        replace: true,
      });
      return;
    }

    showCompletedResult(completedResult);
  }

  function continueAfterArrivalIssues(
    latestIssues: VehicleInventoryDataQualityIssuesResult,
  ): void {
    setRecovery(null);

    if (latestIssues.items.length === 0) {
      setResult({
        category: "UNKNOWN_ARRIVAL_DATE",
        attempted: 0,
        resolved: 0,
        unresolved: 0,
        conflicts: 0,
        hasMore: false,
        emailQueued: false,
        messageId: null,
      });
      setStep("RESULT");
      toast.success({
        title: "Arrival dates are already complete",
        description:
          "No vehicles in this view need an arrival-date correction.",
        replace: true,
      });
      router.refresh();
      return;
    }

    setIssues(latestIssues);
    setDates({});
    setErrorMessage(null);
    setStep("ARRIVAL_DATES");
  }

  async function handleActionResult(
    actionResult: VehicleInventoryRemediationActionResult,
    retry: RemediationRetryIntent,
  ): Promise<void> {
    if (!actionResult.ok) {
      showFailure(actionResult, "Inventory correction could not continue", {
        kind: "REMEDIATION",
        intent: retry,
      });
      return;
    }

    setRecovery(null);
    idempotencyKeyRef.current = null;
    setResult(actionResult.data);

    if (actionResult.data.category === "MISSING_VARIANT") {
      const issueResult = await loadIssues("MISSING_VARIANT");
      if (!issueResult.ok) {
        showFailure(
          issueResult,
          "Remaining variant details could not be refreshed",
          {
            kind: "ISSUES",
            category: "MISSING_VARIANT",
            resume: "POST_REMEDIATION_VARIANTS",
          },
        );
        router.refresh();
        return;
      }

      const reconciledResult: VehicleInventoryRemediationResult = {
        ...actionResult.data,
        unresolved: issueResult.data.total,
        hasMore: actionResult.data.hasMore || issueResult.data.truncated,
      };
      setResult(reconciledResult);

      if (issueResult.data.items.length === 0) {
        setIssues(null);
        showCompletedResult(reconciledResult);
        return;
      }

      continueAfterVariantIssues(issueResult.data, reconciledResult);
      return;
    }

    showCompletedResult(actionResult.data);
  }

  function runRemediationIntent(intent: RemediationRetryIntent): void {
    setRecovery({ kind: "REMEDIATION", intent });
    setErrorMessage(null);
    setPhase(0);
    setStep("WORKING");

    startTransition(async () => {
      const actionQuery =
        intent.category === "MISSING_VARIANT" &&
        intent.targetUnitId !== undefined
          ? vehicleInventorySearchParamsSchema.parse({
              ...query,
              unitId: intent.targetUnitId,
              cursor: undefined,
            })
          : query;
      const common = {
        context,
        query: toServerActionQuery(actionQuery),
        idempotencyKey: newIntentKey(intent.idempotencyPrefix),
      };
      const actionResult =
        intent.category === "MISSING_VARIANT"
          ? await runVehicleInventoryRemediationAction({
              ...common,
              category: "MISSING_VARIANT",
              chargerSelections: [...intent.chargerSelections],
              batteryConfigurations: [...intent.batteryConfigurations],
            })
          : await runVehicleInventoryRemediationAction({
              ...common,
              category: "UNKNOWN_ARRIVAL_DATE",
              arrivals: [...intent.arrivals],
            });

      await handleActionResult(actionResult, intent);
    });
  }

  function retryFailure(): void {
    if (recovery === null || pending) {
      return;
    }

    if (recovery.kind === "REMEDIATION") {
      runRemediationIntent(recovery.intent);
      return;
    }

    const issueRecovery = recovery;
    setErrorMessage(null);
    setPhase(0);
    setStep("WORKING");
    startTransition(async () => {
      const issueResult = await loadIssues(issueRecovery.category);

      if (!issueResult.ok) {
        showFailure(
          issueResult,
          issueRecovery.resume === "POST_REMEDIATION_VARIANTS"
            ? "Remaining variant details could not be refreshed"
            : "Arrival review could not be opened",
          issueRecovery,
        );
        return;
      }

      if (issueRecovery.resume === "ARRIVAL_DATES") {
        continueAfterArrivalIssues(issueResult.data);
        return;
      }

      if (result === null) {
        resetFlow();
        return;
      }

      continueAfterVariantIssues(issueResult.data, result);
    });
  }

  function selectCategory(
    nextCategory: VehicleInventoryRemediationCategory,
  ): void {
    setCategory(nextCategory);
    setErrorMessage(null);
    setResult(null);
    setIssues(null);
    setChargerSelections({});
    setPhase(0);
    setRecovery(null);
    idempotencyKeyRef.current = null;

    if (nextCategory === "UNKNOWN_ARRIVAL_DATE") {
      setStep("WORKING");
      startTransition(async () => {
        const actionResult = await loadIssues(nextCategory);

        if (!actionResult.ok) {
          showFailure(actionResult, "Arrival review could not be opened", {
            kind: "ISSUES",
            category: "UNKNOWN_ARRIVAL_DATE",
            resume: "ARRIVAL_DATES",
          });
          return;
        }

        continueAfterArrivalIssues(actionResult.data);
      });
      return;
    }

    runRemediationIntent({
      category: "MISSING_VARIANT",
      idempotencyPrefix: "inventory-remediation",
      chargerSelections: [],
      batteryConfigurations: [],
    });
  }

  function submitArrivalDates(): void {
    if (issues === null) {
      return;
    }

    const arrivals: VehicleInventoryArrivalUpdate[] = [];
    for (const issue of issues.items) {
      const arrivalDate = dates[issue.unitId];
      if (arrivalDate === undefined) {
        setErrorMessage(
          "Select an arrival date for every vehicle in this batch.",
        );
        return;
      }
      arrivals.push({
        unitId: issue.unitId,
        storeId: issue.storeId,
        arrivalDate,
      });
    }

    runRemediationIntent({
      category: "UNKNOWN_ARRIVAL_DATE",
      idempotencyPrefix: "inventory-arrival",
      arrivals,
    });
  }

  function submitChargerSelections(): void {
    if (issues === null) {
      return;
    }

    const pendingIssues = chargerIssues(issues);
    const selections: VehicleInventoryChargerSelection[] = [];
    for (const issue of pendingIssues) {
      const chargerComponentId = chargerSelections[issue.unitId];
      if (chargerComponentId === undefined) {
        setErrorMessage(
          "Select a charger type for every vehicle that requires confirmation.",
        );
        return;
      }
      selections.push({
        unitId: issue.unitId,
        chargerComponentId,
      });
    }

    runRemediationIntent({
      category: "MISSING_VARIANT",
      idempotencyPrefix: "inventory-variant-charger",
      chargerSelections: selections,
      batteryConfigurations: [],
    });
  }

  function configureBattery(issue: VehicleInventoryDataQualityIssue): void {
    const resolution = issue.variantResolution;

    if (
      resolution === null ||
      effectiveVariantRecommendation(resolution).action !== "CONFIGURE_BATTERY"
    ) {
      return;
    }

    setBatteryConfigurationIssue(issue);
    setErrorMessage(null);
  }

  function submitBatteryConfigurations(
    selections: readonly VehicleInventoryBatteryConfigurationSelection[],
  ): void {
    const targetUnitId = selections[0]?.unitId;
    if (
      targetUnitId === undefined ||
      selections.length === 0 ||
      selections.some((selection) => selection.unitId !== targetUnitId)
    ) {
      return;
    }

    setBatteryConfigurationIssue(null);
    runRemediationIntent({
      category: "MISSING_VARIANT",
      idempotencyPrefix: "inventory-battery-configuration",
      targetUnitId,
      chargerSelections: [],
      batteryConfigurations: selections,
    });
  }

  function requestVariantCreation(
    issue: VehicleInventoryDataQualityIssue,
  ): void {
    const resolution = issue.variantResolution;

    if (
      variantEmailPending ||
      requestingVariantUnitId !== null ||
      resolution === null ||
      effectiveVariantRecommendation(resolution).action !==
        "REQUEST_VARIANT_CREATION"
    ) {
      return;
    }

    const intentKey = [
      issue.unitId,
      resolution.reason,
      resolution.detail,
      ...issue.componentSerialNumbers,
    ].join(":");
    const existingIdempotencyKey = variantEmailKeysRef.current.get(intentKey);
    const idempotencyKey =
      existingIdempotencyKey ?? requestId("inventory-variant-request");

    if (existingIdempotencyKey === undefined) {
      variantEmailKeysRef.current.set(intentKey, idempotencyKey);
    }

    const targetedQuery = vehicleInventorySearchParamsSchema.parse({
      ...query,
      unitId: issue.unitId,
      cursor: undefined,
    });

    setRequestingVariantUnitId(issue.unitId);
    startVariantEmailTransition(async () => {
      const actionResult = await emailVehicleInventoryDataQualityReportAction({
        context,
        query: toServerActionQuery(targetedQuery),
        category: "MISSING_VARIANT",
        idempotencyKey,
      });

      if (!actionResult.ok) {
        toast.error({
          title: "Variant request could not be sent",
          description: failureDescription(actionResult),
          replace: true,
        });
        setRequestingVariantUnitId(null);
        return;
      }

      if (actionResult.data.emailQueued) {
        toast.success({
          title: "Variant creation request sent",
          description:
            "ERP IT has been sent the verified vehicle and component evidence for this missing catalog variant.",
          replace: true,
        });
      } else {
        toast.info({
          title: "Variant request was not queued",
          description:
            "The record no longer qualifies for a variant-creation request. Refresh the review before retrying.",
          replace: true,
        });
      }

      setRequestingVariantUnitId(null);
    });
  }

  const recoveryPresentation = inventoryReviewRecoveryPresentation(recovery);
  const dialogHeading =
    step === "ERROR"
      ? recoveryPresentation.dialogTitle
      : dialogTitle(step, category);
  const dialogHelp = dialogDescription(step, category);

  return (
    <section
      aria-labelledby="inventory-data-quality-title"
      aria-describedby="inventory-data-quality-description"
      className="h-[60px] min-h-[60px] max-h-[60px] overflow-hidden rounded-2xl border border-warning/30 bg-warning/[0.055] shadow-xs shadow-warning/5 dark:border-warning/30 dark:bg-warning/[0.065]"
    >
      <p id="inventory-data-quality-description" className="sr-only">
        Some inventory records need attention. Supported corrections are
        permission-checked and audited; unresolved issues remain visible with
        their exact blocking reason.
      </p>

      <div className="flex h-full min-w-0 items-center gap-3 px-3 sm:px-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-warning/30 bg-warning/12 text-warning-foreground shadow-xs dark:text-warning">
          <AlertTriangle aria-hidden="true" className="size-4.5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h2
              id="inventory-data-quality-title"
              className="truncate whitespace-nowrap text-card-title text-foreground"
            >
              Inventory data needs attention
            </h2>
            <Badge
              variant="warning"
              className="hidden h-5 shrink-0 px-2 text-tabular sm:inline-flex"
            >
              {total.toLocaleString("en-IN")} issue{total === 1 ? "" : "s"}
            </Badge>
          </div>
          <WarningSummary counts={counts} />
        </div>

        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              resetFlow();
            }
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex shrink-0">
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canRemediate || actionableTotal === 0}
                    className="border-warning/35 bg-background/70 shadow-xs hover:border-warning/45 hover:bg-warning/10 dark:bg-background/45 dark:hover:bg-warning/10"
                  >
                    <Wrench aria-hidden="true" className="size-3.5" />
                    Review issues
                  </Button>
                </DialogTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {!canRemediate
                ? "You do not have permission to update inventory records."
                : actionableTotal === 0
                  ? "These warnings are diagnostic and require another controlled workflow."
                  : "Review automatic variant correction and verified arrival-date updates. Every saved change remains permission-checked and audited."}
            </TooltipContent>
          </Tooltip>

          <DialogContent height="default" className="sm:max-w-3xl">
            <DialogHeader>
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-xl border",
                    step === "ERROR" && recoveryPresentation.correctionCompleted
                      ? "border-success/25 bg-success/10 text-success"
                      : step === "ERROR"
                        ? "border-destructive/25 bg-destructive/10 text-destructive"
                        : step === "RESULT" && result?.unresolved === 0
                          ? "border-success/25 bg-success/10 text-success"
                          : "border-warning/30 bg-warning/10 text-warning-foreground dark:text-warning",
                  )}
                >
                  {(step === "RESULT" && result?.unresolved === 0) ||
                  (step === "ERROR" &&
                    recoveryPresentation.correctionCompleted) ? (
                    <CheckCircle2 aria-hidden="true" className="size-5.5" />
                  ) : step === "ERROR" ? (
                    <AlertTriangle aria-hidden="true" className="size-5.5" />
                  ) : category === null ? (
                    <AlertTriangle aria-hidden="true" className="size-5.5" />
                  ) : (
                    React.createElement(CATEGORY_META[category].icon, {
                      "aria-hidden": true,
                      className: "size-5.5",
                    })
                  )}
                </span>

                <div className="flex h-12 min-h-12 min-w-0 flex-1 flex-col justify-center gap-0.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <DialogTitle className="truncate whitespace-nowrap text-subsection-title leading-tight">
                      {dialogHeading}
                    </DialogTitle>
                    {step === "CATEGORY" ? (
                      <Badge
                        variant="warning"
                        className="h-5 shrink-0 px-2 text-tabular"
                      >
                        {actionableTotal.toLocaleString("en-IN")} reviewable
                      </Badge>
                    ) : null}
                  </div>
                  <DialogDescription className="max-w-2xl truncate whitespace-nowrap text-caption leading-tight">
                    {dialogHelp}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <DialogBody>
              {step === "CATEGORY" ? (
                <CategorySelector counts={counts} onSelect={selectCategory} />
              ) : null}

              {step === "WORKING" && category !== null ? (
                <WorkingState category={category} phase={phase} />
              ) : null}

              {step === "ARRIVAL_DATES" && issues !== null ? (
                <ArrivalIssuesForm
                  issues={issues}
                  dates={dates}
                  onDateChange={(unitId, value) => {
                    setDates((current) => ({ ...current, [unitId]: value }));
                  }}
                />
              ) : null}

              {step === "CHARGERS" && issues !== null ? (
                <ChargerSelectionForm
                  issues={issues}
                  selections={chargerSelections}
                  onChange={(unitId, chargerComponentId) => {
                    setChargerSelections((current) => ({
                      ...current,
                      [unitId]: chargerComponentId,
                    }));
                    setErrorMessage(null);
                  }}
                />
              ) : null}

              {step === "RESULT" && result !== null && category !== null ? (
                <ResultState
                  result={result}
                  category={category}
                  issues={issues}
                  requestingVariantUnitId={requestingVariantUnitId}
                  onConfigureBattery={configureBattery}
                  onRequestVariant={requestVariantCreation}
                />
              ) : null}

              {step === "ERROR" ? (
                <div className="grid gap-4 py-4">
                  <Alert
                    variant={
                      recoveryPresentation.correctionCompleted
                        ? "warning"
                        : "destructive"
                    }
                  >
                    <AlertTriangle aria-hidden="true" />
                    <AlertTitle>{recoveryPresentation.alertTitle}</AlertTitle>
                    <AlertDescription>
                      {errorMessage ??
                        "The inventory review request could not be completed."}
                    </AlertDescription>
                  </Alert>

                  <div className="rounded-2xl border border-border/70 bg-muted/35 p-4 text-body-sm text-muted-readable">
                    {recoveryPresentation.guidance}
                  </div>

                  {recovery !== null ? (
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={retryFailure}
                        disabled={pending}
                      >
                        {pending ? (
                          <Spinner decorative />
                        ) : (
                          <RefreshCw aria-hidden="true" className="size-4" />
                        )}
                        {recoveryPresentation.retryLabel}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {(step === "ARRIVAL_DATES" || step === "CHARGERS") &&
              errorMessage !== null ? (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle aria-hidden="true" />
                  <AlertTitle>
                    {step === "CHARGERS"
                      ? "Charger selection is incomplete"
                      : "Arrival dates are incomplete"}
                  </AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}
            </DialogBody>

            <DialogFooter className="flex-row flex-wrap items-center sm:justify-between">
              <div className="mr-auto flex items-center gap-2">
                {step !== "CATEGORY" && step !== "WORKING" ? (
                  <Button type="button" variant="ghost" onClick={resetFlow}>
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Issues
                  </Button>
                ) : (
                  <span className="hidden text-caption text-muted-readable sm:inline">
                    {step === "WORKING"
                      ? "Checking authorized inventory…"
                      : `${actionableTotal.toLocaleString("en-IN")} supported issue${actionableTotal === 1 ? "" : "s"} available`}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {step === "RESULT" ? "Done" : "Close"}
                  </Button>
                </DialogClose>

                {step === "ARRIVAL_DATES" ? (
                  <Button
                    type="button"
                    onClick={submitArrivalDates}
                    disabled={pending}
                  >
                    {pending ? (
                      <Spinner decorative />
                    ) : (
                      <CalendarClock aria-hidden="true" className="size-4" />
                    )}
                    Save arrival dates
                  </Button>
                ) : null}

                {step === "CHARGERS" ? (
                  <Button
                    type="button"
                    onClick={submitChargerSelections}
                    disabled={pending}
                  >
                    {pending ? (
                      <Spinner decorative />
                    ) : (
                      <BatteryCharging aria-hidden="true" className="size-4" />
                    )}
                    Resolve selected variants
                  </Button>
                ) : null}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {batteryConfigurationIssue === null ? null : (
          <BatteryConfigurationDialog
            key={batteryConfigurationIssue.unitId}
            issue={batteryConfigurationIssue}
            open
            pending={pending}
            onOpenChange={(nextOpen) => {
              if (!nextOpen && !pending) {
                setBatteryConfigurationIssue(null);
              }
            }}
            onSubmit={submitBatteryConfigurations}
          />
        )}
      </div>
    </section>
  );
}

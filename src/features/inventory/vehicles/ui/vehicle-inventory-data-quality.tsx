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
  CircleDollarSign,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
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

import {
  emailVehicleInventoryDataQualityReportAction,
  loadVehicleInventoryDataQualityIssuesAction,
  runVehicleInventoryRemediationAction,
  type VehicleInventoryRemediationActionResult,
} from "@/features/inventory/vehicles/actions/vehicle-inventory.actions";
import type {
  VehicleInventoryArrivalUpdate,
  VehicleInventoryDataQualityIssuesResult,
  VehicleInventoryRemediationCategory,
  VehicleInventoryRemediationResult,
  VehicleInventorySearchParams,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
import type { VehicleInventoryContext } from "@/features/inventory/vehicles/policies/vehicle-inventory.policy";

export type VehicleInventoryDataQualityCounts = Readonly<{
  missingVariant: number;
  unknownArrivalDate: number;
  statusMismatch: number;
  metadataVariantModelMismatch: number;
  missingMrp: number;
  missingTaxConfiguration: number;
  inactiveStore: number;
}>;

type FlowStep = "CATEGORY" | "WORKING" | "ARRIVAL_DATES" | "RESULT" | "ERROR";

type VehicleInventoryServerActionQuery = Parameters<
  typeof loadVehicleInventoryDataQualityIssuesAction
>[0]["query"];

const CATEGORY_META = {
  MISSING_VARIANT: {
    title: "Missing variant",
    description:
      "Resolve variants from installed battery evidence and model metadata without guessing ambiguous matches.",
    icon: BatteryCharging,
  },
  UNKNOWN_ARRIVAL_DATE: {
    title: "Unknown arrival date",
    description:
      "Review affected vehicles and record their verified dealership arrival dates.",
    icon: CalendarClock,
  },
  MISSING_MRP: {
    title: "Missing MRP",
    description:
      "Re-evaluate pricing after variant resolution and automatically escalate unresolved commercial records.",
    icon: CircleDollarSign,
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
  "MISSING_MRP",
] as const satisfies readonly VehicleInventoryRemediationCategory[];

const WORKING_STEPS_BY_CATEGORY = {
  MISSING_VARIANT: [
    "Validating actor and authorized dealer scope",
    "Inspecting active installed battery evidence",
    "Matching one deterministic catalog variant",
    "Recalculating inventory quality and pricing",
  ],
  UNKNOWN_ARRIVAL_DATE: [
    "Validating actor and authorized dealer scope",
    "Loading the current unknown-arrival batch",
    "Verifying each vehicle and stock location",
    "Preparing the audited arrival-date review",
  ],
  MISSING_MRP: [
    "Validating actor and authorized dealer scope",
    "Resolving deterministic variant evidence",
    "Re-evaluating effective state price books",
    "Preparing escalation for unresolved records",
  ],
} as const satisfies Readonly<
  Record<VehicleInventoryRemediationCategory, readonly string[]>
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
    case "MISSING_MRP":
      return counts.missingMrp;
  }
}

function totalWarnings(counts: VehicleInventoryDataQualityCounts): number {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

function actionableWarnings(counts: VehicleInventoryDataQualityCounts): number {
  return counts.missingVariant + counts.unknownArrivalDate + counts.missingMrp;
}

function CategorySelector({
  counts,
  onSelect,
}: Readonly<{
  counts: VehicleInventoryDataQualityCounts;
  onSelect: (category: VehicleInventoryRemediationCategory) => void;
}>): React.ReactElement {
  return (
    <div className="grid gap-3">
      {CATEGORY_ORDER.map((category) => {
        const meta = CATEGORY_META[category];
        const Icon = meta.icon;
        const count = countForCategory(counts, category);

        return (
          <button
            key={category}
            type="button"
            disabled={count === 0}
            onClick={() => {
              onSelect(category);
            }}
            className="group flex w-full items-center gap-4 rounded-2xl border border-border/75 bg-background/65 p-4 text-left shadow-xs outline-none transition-[border-color,background-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.035] hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/45 disabled:pointer-events-none disabled:opacity-45 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border/70 bg-muted/60 text-muted-readable group-hover:border-primary/20 group-hover:bg-primary/10 group-hover:text-primary">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-card-title">
                {meta.title}
                <Badge variant={count > 0 ? "warning" : "secondary"}>
                  {count.toLocaleString("en-IN")}
                </Badge>
              </span>
              <span className="mt-1 block text-body-sm text-muted-readable">
                {meta.description}
              </span>
            </span>
            <ChevronRight
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-readable transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
            />
          </button>
        );
      })}

      <div className="rounded-2xl border border-border/70 bg-muted/35 p-4 text-caption text-muted-readable">
        <div className="flex items-start gap-2">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            Corrections are tenant-scoped, permission-checked, idempotent, and
            audited by the backend. Ambiguous variant or price evidence is never
            applied automatically.
          </p>
        </div>
      </div>
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
      <div className="relative grid size-20 place-items-center rounded-full border border-primary/25 bg-primary/10">
        <span className="absolute inset-2 animate-ping rounded-full border border-primary/20 motion-reduce:animate-none" />
        <Wrench aria-hidden="true" className="size-8 text-primary" />
      </div>
      <div className="grid max-w-xl gap-2">
        <h3 className="text-section-title">
          {category === "MISSING_VARIANT"
            ? "Resolving vehicle variants"
            : category === "MISSING_MRP"
              ? "Re-evaluating commercial configuration"
              : "Preparing arrival-date review"}
        </h3>
        <p className="text-body-sm text-muted-readable" aria-live="polite">
          {steps[Math.min(phase, steps.length - 1)]}
        </p>
      </div>
      <Progress value={progress} className="w-full max-w-md" />
      <div className="grid w-full max-w-md gap-2 text-left">
        {steps.map((label, index) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-caption",
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
        <p className="text-body-sm text-muted-readable">
          Record a verified arrival date for each visible vehicle.
        </p>
        <Badge variant="secondary">
          {issues.total.toLocaleString("en-IN")} affected
        </Badge>
      </div>

      <div className="max-h-[52svh] space-y-3 overflow-y-auto overscroll-contain pr-1">
        {issues.items.map((issue) => (
          <article
            key={issue.unitId}
            className="grid gap-3 rounded-2xl border border-border/75 bg-background/65 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] lg:items-center"
          >
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
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-caption text-warning-foreground">
          This correction batch is bounded to the first 100 records. Complete
          this batch and reopen the workflow for the remaining records.
        </p>
      ) : null}
    </div>
  );
}

function ResultState({
  result,
  category,
  onEmail,
  emailPending,
  emailError,
}: Readonly<{
  result: VehicleInventoryRemediationResult;
  category: VehicleInventoryRemediationCategory;
  onEmail: () => void;
  emailPending: boolean;
  emailError: string | null;
}>): React.ReactElement {
  const allResolved = result.unresolved === 0 && result.conflicts === 0;

  return (
    <div className="grid place-items-center gap-5 py-6 text-center">
      <div
        className={cn(
          "grid size-16 place-items-center rounded-full border",
          allResolved
            ? "border-success/30 bg-success/10 text-success"
            : "border-warning/30 bg-warning/10 text-warning-foreground",
        )}
      >
        {allResolved ? (
          <CheckCircle2 aria-hidden="true" className="size-8" />
        ) : (
          <AlertTriangle aria-hidden="true" className="size-8" />
        )}
      </div>

      <div className="grid max-w-xl gap-2">
        <h3 className="text-section-title">
          {allResolved
            ? "Correction completed"
            : "Correction completed with review items"}
        </h3>
        <p className="text-body-sm text-muted-readable">
          Only deterministic updates were committed. Unresolved or conflicting
          records remain unchanged for technical review.
        </p>
      </div>

      <dl className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Attempted", result.attempted],
          ["Resolved", result.resolved],
          ["Unresolved", result.unresolved],
          ["Conflicts", result.conflicts],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-border/70 bg-muted/35 p-3"
          >
            <dt className="text-caption text-muted-readable">{label}</dt>
            <dd className="mt-1 text-xl font-semibold text-tabular">
              {Number(value).toLocaleString("en-IN")}
            </dd>
          </div>
        ))}
      </dl>

      {result.emailQueued ? (
        <div className="flex items-center gap-2 rounded-xl border border-info/25 bg-info/10 px-3 py-2 text-caption text-info">
          <Mail aria-hidden="true" className="size-4" />
          Technical review email queued for it@ozotecev.com.
        </div>
      ) : result.unresolved > 0 && category !== "UNKNOWN_ARRIVAL_DATE" ? (
        <Button
          type="button"
          variant="outline"
          onClick={onEmail}
          disabled={emailPending}
        >
          {emailPending ? (
            <Spinner decorative />
          ) : (
            <Mail aria-hidden="true" className="size-4" />
          )}
          Send technical review
        </Button>
      ) : null}

      {emailError !== null ? (
        <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-body-sm text-destructive">
          {emailError}
        </p>
      ) : null}

      {result.hasMore ? (
        <p className="text-caption text-muted-readable">
          More records remain outside this bounded batch. Reopen the workflow to
          continue safely.
        </p>
      ) : null}
    </div>
  );
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
  const [result, setResult] =
    React.useState<VehicleInventoryRemediationResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState(0);
  const [pending, startTransition] = React.useTransition();
  const [emailPending, startEmailTransition] = React.useTransition();
  const idempotencyKeyRef = React.useRef<string | null>(null);
  const emailIdempotencyKeyRef = React.useRef<string | null>(null);

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
    setResult(null);
    setErrorMessage(null);
    setPhase(0);
    idempotencyKeyRef.current = null;
    emailIdempotencyKeyRef.current = null;
  }

  function handleActionResult(
    actionResult: VehicleInventoryRemediationActionResult,
  ): void {
    if (!actionResult.ok) {
      setErrorMessage(actionResult.message);
      setStep("ERROR");
      return;
    }

    idempotencyKeyRef.current = null;
    setResult(actionResult.data);
    setStep("RESULT");
    router.refresh();
  }

  function selectCategory(
    nextCategory: VehicleInventoryRemediationCategory,
  ): void {
    setCategory(nextCategory);
    setErrorMessage(null);
    setResult(null);
    setPhase(0);
    idempotencyKeyRef.current = null;

    if (nextCategory === "UNKNOWN_ARRIVAL_DATE") {
      setStep("WORKING");
      startTransition(async () => {
        const actionResult = await loadVehicleInventoryDataQualityIssuesAction({
          context,
          query: toServerActionQuery(query),
          category: nextCategory,
        });

        if (!actionResult.ok) {
          setErrorMessage(actionResult.message);
          setStep("ERROR");
          return;
        }

        if (actionResult.data.items.length === 0) {
          setResult({
            category: nextCategory,
            attempted: 0,
            resolved: 0,
            unresolved: 0,
            conflicts: 0,
            hasMore: false,
            emailQueued: false,
            messageId: null,
          });
          setStep("RESULT");
          router.refresh();
          return;
        }

        setIssues(actionResult.data);
        setDates({});
        setStep("ARRIVAL_DATES");
      });
      return;
    }

    setStep("WORKING");
    startTransition(async () => {
      const actionResult = await runVehicleInventoryRemediationAction({
        context,
        query: toServerActionQuery(query),
        category: nextCategory,
        idempotencyKey: newIntentKey("inventory-remediation"),
      });
      handleActionResult(actionResult);
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

    setErrorMessage(null);
    setStep("WORKING");
    startTransition(async () => {
      const actionResult = await runVehicleInventoryRemediationAction({
        context,
        query: toServerActionQuery(query),
        category: "UNKNOWN_ARRIVAL_DATE",
        idempotencyKey: newIntentKey("inventory-arrival"),
        arrivals,
      });
      handleActionResult(actionResult);
    });
  }

  function emailIntentKey(): string {
    emailIdempotencyKeyRef.current ??= requestId("inventory-quality-email");
    return emailIdempotencyKeyRef.current;
  }

  function emailReport(): void {
    if (category === null) {
      return;
    }

    startEmailTransition(async () => {
      const actionResult = await emailVehicleInventoryDataQualityReportAction({
        context,
        query: toServerActionQuery(query),
        category,
        idempotencyKey: emailIntentKey(),
      });

      if (!actionResult.ok) {
        setErrorMessage(actionResult.message);
        return;
      }

      emailIdempotencyKeyRef.current = null;
      setResult(actionResult.data);
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="inventory-data-quality-title"
      className="rounded-3xl border border-warning/35 bg-warning/[0.075] p-4 shadow-sm shadow-warning/5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-warning/30 bg-warning/10 text-warning-foreground">
            <AlertTriangle aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 id="inventory-data-quality-title" className="text-card-title">
              {total.toLocaleString("en-IN")} data-quality warning
              {total === 1 ? "" : "s"}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {counts.missingVariant > 0 ? (
                <Badge variant="outline">
                  Missing variant:{" "}
                  {counts.missingVariant.toLocaleString("en-IN")}
                </Badge>
              ) : null}
              {counts.unknownArrivalDate > 0 ? (
                <Badge variant="outline">
                  Unknown arrival:{" "}
                  {counts.unknownArrivalDate.toLocaleString("en-IN")}
                </Badge>
              ) : null}
              {counts.missingMrp > 0 ? (
                <Badge variant="outline">
                  Missing MRP: {counts.missingMrp.toLocaleString("en-IN")}
                </Badge>
              ) : null}
              {counts.statusMismatch > 0 ? (
                <Badge variant="outline">
                  Status mismatch:{" "}
                  {counts.statusMismatch.toLocaleString("en-IN")}
                </Badge>
              ) : null}
              {counts.metadataVariantModelMismatch > 0 ? (
                <Badge variant="outline">
                  Model mismatch:{" "}
                  {counts.metadataVariantModelMismatch.toLocaleString("en-IN")}
                </Badge>
              ) : null}
              {counts.missingTaxConfiguration > 0 ? (
                <Badge variant="outline">
                  Missing tax:{" "}
                  {counts.missingTaxConfiguration.toLocaleString("en-IN")}
                </Badge>
              ) : null}
              {counts.inactiveStore > 0 ? (
                <Badge variant="outline">
                  Inactive store: {counts.inactiveStore.toLocaleString("en-IN")}
                </Badge>
              ) : null}
            </div>
          </div>
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
              <span className="inline-flex">
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    disabled={!canRemediate || actionableTotal === 0}
                  >
                    <Sparkles aria-hidden="true" className="size-4" />
                    Review &amp; resolve
                  </Button>
                </DialogTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {!canRemediate
                ? "Requires inventory:item:update permission."
                : actionableTotal === 0
                  ? "These warnings require a separate controlled workflow."
                  : "Open the guided inventory correction workflow."}
            </TooltipContent>
          </Tooltip>

          <DialogContent className="max-h-[92svh] overflow-hidden gap-0 p-0 sm:max-w-3xl">
            <DialogHeader className="border-b border-border/70 px-6 py-5">
              <DialogTitle>
                {step === "CATEGORY"
                  ? "Review and resolve inventory warnings"
                  : category === null
                    ? "Inventory correction"
                    : CATEGORY_META[category].title}
              </DialogTitle>
              <DialogDescription>
                Guided, bounded corrections preserve tenant isolation and avoid
                unsafe automatic guesses.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 overflow-y-auto px-6 py-5">
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

              {step === "RESULT" && result !== null && category !== null ? (
                <ResultState
                  result={result}
                  category={category}
                  onEmail={emailReport}
                  emailPending={emailPending}
                  emailError={errorMessage}
                />
              ) : null}

              {step === "ERROR" ? (
                <div className="grid place-items-center gap-4 py-8 text-center">
                  <span className="grid size-14 place-items-center rounded-full border border-destructive/25 bg-destructive/10 text-destructive">
                    <AlertTriangle aria-hidden="true" className="size-7" />
                  </span>
                  <div className="grid max-w-lg gap-2">
                    <h3 className="text-section-title">
                      Correction could not continue
                    </h3>
                    <p className="text-body-sm text-muted-readable">
                      {errorMessage ??
                        "The inventory correction request failed."}
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={resetFlow}>
                    <RefreshCw aria-hidden="true" className="size-4" />
                    Return to categories
                  </Button>
                </div>
              ) : null}

              {step === "ARRIVAL_DATES" && errorMessage !== null ? (
                <p className="mt-3 rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-body-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}
            </div>

            <DialogFooter className="mx-0 mb-0 rounded-none rounded-b-3xl border-t border-border/70 bg-muted/30 px-6 py-4">
              {step !== "CATEGORY" && step !== "WORKING" ? (
                <Button type="button" variant="ghost" onClick={resetFlow}>
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  Categories
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                }}
              >
                {step === "RESULT" ? "Done" : "Close"}
              </Button>
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

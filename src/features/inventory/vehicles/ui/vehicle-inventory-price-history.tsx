// oz-next-app/src/features/inventory/vehicles/ui/vehicle-inventory-price-history.tsx
"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  History,
  MapPin,
  Minus,
  RefreshCw,
  Tag,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  loadVehicleInventoryPriceHistoryAction,
  type VehicleInventoryPriceHistoryActionResult,
} from "@/features/inventory/vehicles/actions/vehicle-inventory.actions";
import type {
  VehicleInventoryPriceHistoryPeriod,
  VehicleInventoryPriceHistoryResult,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";
import type { VehicleInventoryContext } from "@/features/inventory/vehicles/policies/vehicle-inventory.policy";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
});
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});
const MONEY_FORMATTERS = new Map<string, Intl.NumberFormat>();

type PriceHistoryState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "loading" }>
  | Readonly<{
      kind: "success";
      data: VehicleInventoryPriceHistoryResult;
    }>
  | Readonly<{
      kind: "error";
      message: string;
      requestId: string | null;
    }>;

function moneyFormatter(currency: string): Intl.NumberFormat {
  const cached = MONEY_FORMATTERS.get(currency);
  if (cached !== undefined) {
    return cached;
  }

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
  MONEY_FORMATTERS.set(currency, formatter);
  return formatter;
}

function formatMoney(amount: number, currency: string): string {
  try {
    return moneyFormatter(currency).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }
}

function formatDateOnly(value: string): string {
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`));
}

function formatDateTime(value: string): string {
  return DATE_TIME_FORMATTER.format(new Date(value));
}

function scopeLabel(
  scope: VehicleInventoryPriceHistoryPeriod["scope"],
): string {
  switch (scope) {
    case "STATE":
      return "State-specific";
    case "GLOBAL_DEFAULT":
      return "Default fallback";
    case "GLOBAL":
      return "Global";
  }
}

function periodLabel(period: VehicleInventoryPriceHistoryPeriod): string {
  const start = formatDateOnly(period.effectiveFrom);
  if (period.effectiveTo === null) {
    return `${start} onward`;
  }

  if (period.effectiveFrom === period.effectiveTo) {
    return start;
  }

  return `${start} – ${formatDateOnly(period.effectiveTo)}`;
}

function PriceDelta({
  period,
}: Readonly<{
  period: VehicleInventoryPriceHistoryPeriod;
}>): React.ReactElement {
  if (period.deltaAmount === null || period.deltaPercent === null) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help items-center gap-1 rounded-md bg-muted/55 px-2 py-1 text-[0.6875rem] leading-none text-muted-readable">
            <Minus aria-hidden="true" className="size-3" />
            Baseline
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          No earlier comparable effective period is available for this price.
        </TooltipContent>
      </Tooltip>
    );
  }

  const increased = period.deltaAmount > 0;
  const decreased = period.deltaAmount < 0;
  const DeltaIcon = increased
    ? ArrowUpRight
    : decreased
      ? ArrowDownRight
      : Minus;
  const percentPrefix = increased ? "+" : "";
  const amountPrefix = period.deltaAmount > 0 ? "+" : "";
  const formattedPercent = period.deltaPercent.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex cursor-help items-center gap-1 rounded-md border border-border/60 bg-muted/35 px-2 py-1 text-[0.6875rem] leading-none text-foreground"
          aria-label={`Price changed by ${percentPrefix}${formattedPercent} percent from the previous effective period.`}
        >
          <DeltaIcon aria-hidden="true" className="size-3" />
          {percentPrefix}
          {formattedPercent}%
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        Compared with the previous effective period: {amountPrefix}
        {formatMoney(period.deltaAmount, period.currency)} ({percentPrefix}
        {formattedPercent}%).
      </TooltipContent>
    </Tooltip>
  );
}

function PriceHistorySkeleton(): React.ReactElement {
  return (
    <div className="grid gap-4" aria-hidden="true">
      <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-2">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-8 w-44 rounded-lg" />
            <Skeleton className="h-3.5 w-56 rounded-md" />
          </div>
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-2.5">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="grid gap-2">
              <Skeleton className="h-4 w-44 rounded-md" />
              <Skeleton className="h-3.5 w-60 rounded-md" />
            </div>
            <div className="grid justify-items-start gap-2 sm:justify-items-end">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PriceHistoryContent({
  result,
}: Readonly<{
  result: VehicleInventoryPriceHistoryResult;
}>): React.ReactElement {
  const currentPeriod =
    result.periods.find((period) => period.isCurrent) ??
    result.periods[0] ??
    null;

  if (result.periods.length === 0) {
    return (
      <Alert variant="info">
        <History aria-hidden="true" />
        <AlertTitle>No effective price periods found</AlertTitle>
        <AlertDescription>
          This authorized model and variant currently has no matching dealer
          price-book periods for the selected stock location.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4">
      {currentPeriod === null ? null : (
        <section
          className="rounded-2xl border border-primary/20 bg-primary/[0.035] p-4"
          aria-labelledby="inventory-price-history-current-title"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  id="inventory-price-history-current-title"
                  className="text-card-title text-foreground"
                >
                  {currentPeriod.isCurrent
                    ? "Current effective price"
                    : "Latest configured price"}
                </h3>
                <Badge
                  variant={currentPeriod.isCurrent ? "success" : "secondary"}
                >
                  {currentPeriod.isCurrent ? "Effective now" : "Latest period"}
                </Badge>
              </div>
              <p className="mt-1 text-caption text-muted-readable">
                {result.variant.modelName} · {result.variant.name}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-caption text-muted-readable">
                <MapPin aria-hidden="true" className="size-3.5" />
                {result.store.name}
                {result.store.district === null
                  ? ""
                  : ` · ${result.store.district}`}
                {result.store.state === null ? "" : ` · ${result.store.state}`}
              </p>
            </div>

            <div className="shrink-0 sm:text-right">
              <p className="text-2xl font-semibold tracking-tight text-tabular text-foreground">
                {formatMoney(currentPeriod.amount, currentPeriod.currency)}
              </p>
              <p className="mt-1 text-caption text-muted-readable">
                {currentPeriod.kind === "EX_SHOWROOM" ? "Ex-showroom" : "MRP"}
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-2.5" aria-label="Effective price periods">
        {result.periods.map((period) => (
          <article
            key={`${period.priceId}-${period.effectiveFrom}-${period.effectiveTo ?? "open"}`}
            className={cn(
              "relative grid gap-3 rounded-2xl border bg-card p-4 shadow-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
              period.isCurrent
                ? "border-primary/30 bg-primary/[0.025]"
                : "border-border/70",
            )}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-body-sm font-medium text-foreground">
                  <CalendarDays
                    aria-hidden="true"
                    className="size-3.5 text-muted-readable"
                  />
                  {periodLabel(period)}
                </span>
                {period.isCurrent ? (
                  <Badge variant="success">Current</Badge>
                ) : null}
                <Badge variant="outline">{scopeLabel(period.scope)}</Badge>
              </div>

              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-readable">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Tag aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="truncate">{period.priceBookName}</span>
                </span>
                {period.stateName === null ? null : (
                  <span>{period.stateName}</span>
                )}
                {period.isDefault ? <span>Default book</span> : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
              <PriceDelta period={period} />
              <div className="text-right">
                <p className="font-medium text-tabular text-foreground">
                  {formatMoney(period.amount, period.currency)}
                </p>
                <p className="mt-0.5 text-caption text-muted-readable">
                  {period.kind === "EX_SHOWROOM" ? "Ex-showroom" : "MRP"}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {result.truncated ? (
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Older price-book records are not shown</AlertTitle>
          <AlertDescription>
            This view is intentionally bounded to the latest 100 applicable
            price records. The current effective period is always retained in
            the response.
          </AlertDescription>
        </Alert>
      ) : null}

      <p className="text-caption text-muted-readable">
        Price history resolved at {formatDateTime(result.asOf)} using the same
        authorized stock location and price-book precedence as the inventory
        view.
      </p>
    </div>
  );
}

export function VehicleInventoryPriceHistory({
  context,
  variantId,
  modelName,
  variantName,
  storeId,
}: Readonly<{
  context: VehicleInventoryContext;
  variantId: string | null;
  modelName: string;
  variantName: string | null;
  storeId: string;
}>): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<PriceHistoryState>({ kind: "idle" });
  const [pending, startTransition] = React.useTransition();
  const requestGenerationRef = React.useRef(0);

  function applyResult(result: VehicleInventoryPriceHistoryActionResult): void {
    if (result.ok) {
      setState({ kind: "success", data: result.data });
      return;
    }

    setState({
      kind: "error",
      message: result.message,
      requestId: result.requestId ?? null,
    });
  }

  function loadHistory(): void {
    if (variantId === null || pending) {
      return;
    }

    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    setState({ kind: "loading" });
    startTransition(async () => {
      const result = await loadVehicleInventoryPriceHistoryAction({
        context,
        variantId,
        storeId,
      });

      if (requestGenerationRef.current !== generation) {
        return;
      }

      applyResult(result);
    });
  }

  if (variantId === null) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled
              className="size-7 rounded-lg"
              aria-label="Price history unavailable until the vehicle variant is resolved"
            >
              <History aria-hidden="true" className="size-3.5" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          Resolve the vehicle variant before viewing its dealer price history.
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && state.kind === "idle") {
          loadHistory();
        }
        if (!nextOpen) {
          requestGenerationRef.current += 1;
          setState({ kind: "idle" });
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-7 rounded-lg text-muted-readable hover:text-foreground"
              aria-label={`View price history for ${modelName}${variantName === null ? "" : ` ${variantName}`}`}
            >
              <History aria-hidden="true" className="size-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>View price history</TooltipContent>
      </Tooltip>

      <DialogContent height="viewport" className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex min-w-0 items-center gap-3 pr-8">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <History aria-hidden="true" className="size-5" />
            </span>
            <div className="flex min-h-11 min-w-0 flex-1 flex-col justify-center">
              <DialogTitle className="truncate text-subsection-title">
                Vehicle price history
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate text-caption">
                {modelName}
                {variantName === null ? "" : ` · ${variantName}`} · effective
                dealer pricing by period
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          {state.kind === "idle" || state.kind === "loading" ? (
            <PriceHistorySkeleton />
          ) : null}

          {state.kind === "error" ? (
            <div className="grid gap-4">
              <Alert variant="destructive">
                <AlertTriangle aria-hidden="true" />
                <AlertTitle>Price history could not be loaded</AlertTitle>
                <AlertDescription>
                  {state.message}
                  {state.requestId === null ? null : (
                    <span className="mt-1 block text-caption">
                      Reference: <code>{state.requestId}</code>
                    </span>
                  )}
                </AlertDescription>
              </Alert>
              <div>
                <Button type="button" variant="outline" onClick={loadHistory}>
                  <RefreshCw aria-hidden="true" className="size-4" />
                  Retry
                </Button>
              </div>
            </div>
          ) : null}

          {state.kind === "success" ? (
            <PriceHistoryContent result={state.data} />
          ) : null}
        </DialogBody>

        <DialogFooter className="items-center sm:justify-between">
          <span className="mr-auto hidden text-caption text-muted-readable sm:inline">
            Read-only pricing history · no inventory changes are made
          </span>
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

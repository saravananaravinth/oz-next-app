// oz-next-app/src/features/extended-warranty/ui/admin-workspace.tsx
"use client";

import * as React from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { Route } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  Boxes,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Filter,
  PackageCheck,
  RefreshCw,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  ContentMetricCard,
  ContentMetrics,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import {
  formatCapitalizedDisplayList,
  formatCapitalizedDisplayText,
  formatDisplayLabel,
} from "@/components/common/display-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { syncExtendedWarrantyStockAction } from "@/features/extended-warranty/actions/admin.actions";
import type {
  ExtendedWarrantyWorkspace,
  ExtendedWarrantyWorkspaceItem,
  ExtendedWarrantyWorkspaceQuery,
  PaymentProviderAccount,
} from "@/features/extended-warranty/contracts/admin.schema";
import { safeInternalHref } from "@/lib/security/navigation";
import type { ExtendedWarrantyWorkspaceDetailPayload } from "@/features/extended-warranty/ui/workspace-detail.types";
import {
  CertificateButton,
  formatWorkspaceDateTime as formatDateTime,
  PurchaseLinkActionButton,
  workspaceStatusBadge as statusBadge,
} from "@/features/extended-warranty/ui/workspace-shared";

type ExtendedWarrantyWorkspacePageProps = Readonly<{
  tenantId: string;
  data: ExtendedWarrantyWorkspace;
  query: ExtendedWarrantyWorkspaceQuery;
  detailPromise: Promise<ExtendedWarrantyWorkspaceDetailPayload> | null;
  canSend: boolean;
  canReconcile: boolean;
}>;

type WorkspaceStatus = ExtendedWarrantyWorkspaceQuery["status"];
type ReconciliationFilter = ExtendedWarrantyWorkspaceQuery["reconciliation"];

const STATUS_VALUES = [
  "ALL",
  "NOT_PURCHASED",
  "LINK_SENT",
  "PAYMENT_PENDING",
  "PAYMENT_RECONCILING",
  "ORDERED",
  "PROCESSING",
  "INVOICED",
  "PACKED",
  "SHIPPED",
  "PENDING",
  "DELIVERED",
  "INSTALLATION_PENDING",
  "REVIEW_PENDING",
  "APPROVED",
  "ACTIVATION_PENDING",
  "CERTIFICATE_PENDING",
  "INSTALLED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
  "FAILED",
] as const satisfies readonly WorkspaceStatus[];

const STATUS_OPTIONS: ReadonlyArray<
  Readonly<{ value: WorkspaceStatus; label: string }>
> = STATUS_VALUES.map((value) => ({
  value,
  label:
    value === "ALL"
      ? "All Statuses"
      : formatDisplayLabel(value, "Unknown Status"),
}));

const ROW_LIMIT_OPTIONS = [25, 50, 100] as const;

function isWorkspaceStatus(value: string): value is WorkspaceStatus {
  return STATUS_OPTIONS.some((option) => option.value === value);
}

function isReconciliationFilter(value: string): value is ReconciliationFilter {
  return value === "ALL" || value === "ATTENTION" || value === "CLEAR";
}

function preserveQuery(
  searchParams: URLSearchParams,
  next: Readonly<Record<string, string | null | undefined>>,
): string {
  const result = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(next)) {
    if (value === null || value === undefined || value.length === 0)
      result.delete(key);
    else result.set(key, value);
  }
  return result.toString();
}

function workspaceRoute(
  pathname: string,
  searchParams: URLSearchParams,
  next: Readonly<Record<string, string | null | undefined>>,
): Route {
  const serialized = preserveQuery(searchParams, next);
  const candidate =
    serialized.length === 0 ? pathname : `${pathname}?${serialized}`;
  return safeInternalHref(candidate, "/extended-warranty");
}

function AttentionIndicator({
  reasons,
}: Readonly<{ reasons: readonly string[] }>) {
  if (reasons.length === 0) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex size-5 items-center justify-center text-amber-500"
          aria-label="Needs reconciliation"
        >
          <AlertTriangle className="size-4" aria-hidden="true" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">{reasons.join(". ")}</TooltipContent>
    </Tooltip>
  );
}

function StaticMetric({
  title,
  value,
  icon,
  unavailable = false,
}: Readonly<{
  title: string;
  value: string;
  icon: React.ReactNode;
  unavailable?: boolean;
}>) {
  return (
    <div className="h-full rounded-xl border border-border/70 bg-card">
      <ContentMetricCard
        label={title}
        value={value}
        icon={icon}
        presentation="dashboard"
        className={
          unavailable
            ? "[&_[data-slot=content-metric-card-value]]:text-amber-500"
            : undefined
        }
      />
    </div>
  );
}

function FilterMetric({
  title,
  value,
  icon,
  active,
  onClick,
}: Readonly<{
  title: string;
  value: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-full rounded-xl border bg-card text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-primary/70 bg-primary/5"
          : "border-border/70 hover:bg-muted/40"
      }`}
    >
      <ContentMetricCard
        label={title}
        value={value}
        icon={icon}
        presentation="dashboard"
      />
    </button>
  );
}

function VehicleActionCluster({
  tenantId,
  item,
  canSend,
  openVehicle,
}: Readonly<{
  tenantId: string;
  item: ExtendedWarrantyWorkspaceItem;
  canSend: boolean;
  openVehicle: (unitId: string) => void;
}>) {
  return (
    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
      {canSend && item.certificateFileId === null ? (
        <PurchaseLinkActionButton tenantId={tenantId} item={item} />
      ) : null}
      {item.certificateFileId !== null ? (
        <CertificateButton tenantId={tenantId} unitId={item.unitId} />
      ) : null}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            aria-label="View Warranty Details"
            onClick={() => {
              openVehicle(item.unitId);
            }}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>View Warranty Details</TooltipContent>
      </Tooltip>
    </div>
  );
}

function WorkspaceDetailLoadingSheet({
  onClose,
}: Readonly<{ onClose: () => void }>): React.ReactElement {
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-[820px]"
      >
        <div className="grid min-h-full content-start gap-6 bg-background px-6 py-6">
          <SheetHeader className="text-left">
            <SheetTitle>Loading warranty details</SheetTitle>
            <SheetDescription>
              The workspace remains available while vehicle and review details
              are loaded.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-3" aria-busy="true" aria-live="polite">
            <div className="h-6 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
            <div className="h-40 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function WorkspaceDetailErrorSheet({
  onClose,
  onRetry,
}: Readonly<{
  onClose: () => void;
  onRetry: () => void;
}>): React.ReactElement {
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-[820px]"
      >
        <div className="grid min-h-full content-start gap-6 bg-background px-6 py-6">
          <SheetHeader className="text-left">
            <SheetTitle>Warranty details unavailable</SheetTitle>
            <SheetDescription>
              The main workspace is still available. Retry the detail request or
              close this panel.
            </SheetDescription>
          </SheetHeader>
          <ContentStatus
            variant="destructive"
            announce="assertive"
            title="Unable to load warranty details"
            description="The detail request failed. No mutation was performed."
            icon={<AlertTriangle className="size-4" aria-hidden="true" />}
            actions={
              <>
                <Button type="button" onClick={onRetry}>
                  Retry
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
              </>
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

const LazyWorkspaceDetailSheet = React.lazy(async () => {
  const detailSheetModule =
    await import("@/features/extended-warranty/ui/workspace-detail-sheet");

  return { default: detailSheetModule.ExtendedWarrantyWorkspaceDetailSheet };
});

export function ExtendedWarrantyWorkspacePage({
  tenantId,
  data,
  query,
  detailPromise,
  canSend,
  canReconcile,
}: ExtendedWarrantyWorkspacePageProps): React.ReactElement {
  const [syncingStock, startStockSync] = React.useTransition();
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [draftStatus, setDraftStatus] = React.useState<WorkspaceStatus>(
    query.status,
  );
  const [draftReconciliation, setDraftReconciliation] =
    React.useState<ReconciliationFilter>(query.reconciliation);
  const [draftLimit, setDraftLimit] = React.useState(String(query.limit));
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigate = React.useCallback(
    (next: Readonly<Record<string, string | null | undefined>>) => {
      router.push(
        workspaceRoute(
          pathname,
          new URLSearchParams(searchParams.toString()),
          next,
        ),
        {
          scroll: false,
        },
      );
    },
    [pathname, router, searchParams],
  );

  const openVehicle = React.useCallback(
    (unitId: string) => {
      navigate({ unitId });
    },
    [navigate],
  );
  const closeDetail = React.useCallback(() => {
    navigate({ unitId: null });
  }, [navigate]);

  const nextHref: Route | null =
    data.pageInfo.nextCursor === null
      ? null
      : workspaceRoute(pathname, new URLSearchParams(searchParams.toString()), {
          cursor: data.pageInfo.nextCursor,
          unitId: null,
        });

  const activeFilterCount =
    (query.status === "ALL" ? 0 : 1) + (query.reconciliation === "ALL" ? 0 : 1);
  const hasAnyFilter = activeFilterCount > 0 || query.q.length > 0;

  const applyKpiFilter = (status: WorkspaceStatus): void => {
    navigate({
      status: query.status === status ? "ALL" : status,
      cursor: null,
      unitId: null,
    });
  };

  const openFilters = (): void => {
    setDraftStatus(query.status);
    setDraftReconciliation(query.reconciliation);
    setDraftLimit(String(query.limit));
    setFiltersOpen(true);
  };

  return (
    <ContentRoot width="full" gutter="none">
      <div className="grid gap-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="grid gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              Extended Warranty
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor sold vehicles and their warranty lifecycle.
            </p>
          </div>
          {canSend ? (
            <Button
              variant="outline"
              className="min-w-[128px]"
              disabled={syncingStock}
              onClick={() => {
                startStockSync(async () => {
                  try {
                    const result = await syncExtendedWarrantyStockAction({
                      tenantId,
                    });
                    router.refresh();
                    if (result.availableStock === null) {
                      toast.warning(
                        result.stockReason ??
                          "Stock synchronization completed, but stock remains unavailable.",
                      );
                    } else {
                      toast.success(
                        `Stock synchronized. ${result.availableStock.toLocaleString("en-IN")} kits available.`,
                      );
                    }
                  } catch (error: unknown) {
                    toast.error(
                      error instanceof Error && error.message.trim().length > 0
                        ? error.message
                        : "Unable to synchronize Extended Warranty stock. Please retry.",
                    );
                  }
                });
              }}
            >
              <RefreshCw
                className={`mr-2 size-4 ${syncingStock ? "animate-spin motion-reduce:animate-none" : ""}`}
                aria-hidden="true"
              />
              {syncingStock ? "Syncing…" : "Sync Stock"}
            </Button>
          ) : null}
        </header>

        <ContentMetrics
          aria-label="Warranty summary"
          className="!grid-cols-[repeat(5,minmax(10rem,1fr))] gap-3 overflow-x-auto pb-1"
        >
          <StaticMetric
            title="Available Stock"
            value={
              data.overview.availableStock === null
                ? "Unavailable"
                : data.overview.availableStock.toLocaleString("en-IN")
            }
            unavailable={data.overview.availableStock === null}
            icon={<Boxes className="size-5" aria-hidden="true" />}
          />
          <FilterMetric
            title="Orders"
            value={String(data.overview.orders)}
            icon={<ClipboardList className="size-5" aria-hidden="true" />}
            active={query.status === "ORDERED"}
            onClick={() => {
              applyKpiFilter("ORDERED");
            }}
          />
          <FilterMetric
            title="Pending"
            value={String(data.overview.pending)}
            icon={<CalendarClock className="size-5" aria-hidden="true" />}
            active={query.status === "PENDING"}
            onClick={() => {
              applyKpiFilter("PENDING");
            }}
          />
          <FilterMetric
            title="Installed"
            value={String(data.overview.installed)}
            icon={<BadgeCheck className="size-5" aria-hidden="true" />}
            active={query.status === "INSTALLED"}
            onClick={() => {
              applyKpiFilter("INSTALLED");
            }}
          />
          <FilterMetric
            title="Rejected"
            value={String(data.overview.rejected)}
            icon={<CircleAlert className="size-5" aria-hidden="true" />}
            active={query.status === "REJECTED"}
            onClick={() => {
              applyKpiFilter("REJECTED");
            }}
          />
        </ContentMetrics>

        <Card className="overflow-hidden border-border/70">
          <CardHeader className="gap-4 border-b pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <CardTitle>Sold Vehicles</CardTitle>
                <CardDescription>
                  Latest sold vehicles by invoice date.
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
                <div className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                  {data.pageInfo.totalCount.toLocaleString("en-IN")} sold
                  vehicles
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Button
                    variant={
                      query.reconciliation === "ATTENTION"
                        ? "secondary"
                        : "outline"
                    }
                    aria-pressed={query.reconciliation === "ATTENTION"}
                    onClick={() => {
                      navigate({
                        reconciliation:
                          query.reconciliation === "ATTENTION"
                            ? "ALL"
                            : "ATTENTION",
                        cursor: null,
                        unitId: null,
                      });
                    }}
                  >
                    <AlertTriangle className="mr-2 size-4" aria-hidden="true" />
                    Needs Attention
                  </Button>
                  <Button variant="outline" onClick={openFilters}>
                    <Filter className="mr-2 size-4" aria-hidden="true" />
                    {activeFilterCount > 0
                      ? `Filters · ${String(activeFilterCount)}`
                      : "Filters"}
                  </Button>
                </div>
              </div>
            </div>

            {hasAnyFilter ? (
              <div
                className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3"
                aria-label="Active filters"
              >
                {query.q.length > 0 ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigate({ q: null, cursor: null, unitId: null });
                    }}
                  >
                    Global Search: {query.q}
                    <X className="ml-2 size-3.5" aria-hidden="true" />
                  </Button>
                ) : null}
                {query.status !== "ALL" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigate({ status: "ALL", cursor: null, unitId: null });
                    }}
                  >
                    {STATUS_OPTIONS.find(
                      (option) => option.value === query.status,
                    )?.label ?? query.status}
                    <X className="ml-2 size-3.5" aria-hidden="true" />
                  </Button>
                ) : null}
                {query.reconciliation !== "ALL" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigate({
                        reconciliation: "ALL",
                        cursor: null,
                        unitId: null,
                      });
                    }}
                  >
                    {query.reconciliation === "ATTENTION"
                      ? "Needs Attention"
                      : "Clear"}
                    <X className="ml-2 size-3.5" aria-hidden="true" />
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigate({
                      q: null,
                      status: "ALL",
                      reconciliation: "ALL",
                      cursor: null,
                      unitId: null,
                    });
                  }}
                >
                  Clear All
                </Button>
              </div>
            ) : null}
          </CardHeader>

          <CardContent className="p-0">
            {data.items.length === 0 ? (
              <div className="p-6">
                <ContentStatus
                  title="No sold vehicles match these filters."
                  description="Adjust the filters or use global search to broaden the result set."
                  icon={<PackageCheck className="size-5" aria-hidden="true" />}
                />
                {hasAnyFilter ? (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigate({
                          q: null,
                          status: "ALL",
                          reconciliation: "ALL",
                          cursor: null,
                          unitId: null,
                        });
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <Table className="min-w-[1280px]">
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        <TableHead className="w-[150px]">Invoice</TableHead>
                        <TableHead className="w-[180px]">Vehicle</TableHead>
                        <TableHead className="w-[145px]">Variant</TableHead>
                        <TableHead className="w-[180px]">Seller</TableHead>
                        <TableHead className="w-[200px]">Buyer</TableHead>
                        <TableHead className="w-[125px]">Contact</TableHead>
                        <TableHead className="w-[130px]">Status</TableHead>
                        <TableHead className="w-[180px] text-right">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.items.map((item) => (
                        <TableRow
                          key={item.unitId}
                          data-state={
                            query.unitId === item.unitId
                              ? "selected"
                              : undefined
                          }
                          className="cursor-pointer"
                          onClick={() => {
                            openVehicle(item.unitId);
                          }}
                        >
                          <TableCell className="align-middle py-3">
                            <div className="flex items-center gap-1.5 whitespace-nowrap font-medium">
                              <AttentionIndicator
                                reasons={item.reconciliationReasons}
                              />
                              <span>
                                {item.invoiceNumber ?? "Invoice Missing"}
                              </span>
                            </div>
                            <div className="mt-1 whitespace-nowrap text-xs text-muted-foreground">
                              {formatDateTime(item.invoiceAt)}
                            </div>
                          </TableCell>
                          <TableCell className="align-middle py-3">
                            <div className="truncate font-mono text-sm font-medium">
                              {item.vin ?? "—"}
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">
                              {formatCapitalizedDisplayList(
                                [item.modelName, item.colorName],
                                "—",
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-middle py-3">
                            <div className="truncate font-medium">
                              {formatCapitalizedDisplayText(
                                item.variantName,
                                "—",
                              )}
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">
                              {formatCapitalizedDisplayList(
                                [item.batteryType, item.batteryPowerKw],
                                "—",
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-middle py-3">
                            <div
                              className="truncate font-medium"
                              title={formatCapitalizedDisplayText(
                                item.sellerName,
                                "",
                              )}
                            >
                              {formatCapitalizedDisplayText(
                                item.sellerName,
                                "—",
                              )}
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">
                              {formatCapitalizedDisplayList(
                                [item.sellerDistrict, item.sellerState],
                                "—",
                                ", ",
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-middle py-3">
                            <div
                              className="truncate font-medium"
                              title={formatCapitalizedDisplayText(
                                item.buyerName,
                                "",
                              )}
                            >
                              {formatCapitalizedDisplayText(
                                item.buyerName,
                                "—",
                              )}
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">
                              {formatCapitalizedDisplayList(
                                [item.buyerDistrict, item.buyerState],
                                "—",
                                ", ",
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-middle py-3">
                            <div className="whitespace-nowrap font-medium tabular-nums">
                              {item.maskedMobile ?? "—"}
                            </div>
                            <div className="mt-1 whitespace-nowrap text-xs text-muted-foreground">
                              {formatCapitalizedDisplayText(
                                item.preferredMsgChannel,
                                "—",
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-middle py-3 whitespace-nowrap">
                            {statusBadge(item.status)}
                          </TableCell>
                          <TableCell
                            className="align-middle py-3 text-right"
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            <VehicleActionCluster
                              tenantId={tenantId}
                              item={item}
                              canSend={canSend}
                              openVehicle={openVehicle}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid gap-3 p-4 md:hidden">
                  {data.items.map((item) => (
                    <div
                      key={item.unitId}
                      className="grid gap-3 rounded-xl border p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-medium">
                            <AttentionIndicator
                              reasons={item.reconciliationReasons}
                            />
                            <span className="truncate">
                              {item.invoiceNumber ?? "Invoice Missing"}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(item.invoiceAt)}
                          </div>
                        </div>
                        {statusBadge(item.status)}
                      </div>
                      <div className="grid gap-1 text-sm">
                        <span className="font-mono font-medium">
                          {item.vin ?? "VIN Unavailable"}
                        </span>
                        <span className="text-muted-foreground">
                          {formatCapitalizedDisplayList(
                            [item.modelName, item.variantName, item.colorName],
                            "—",
                          )}
                        </span>
                        <span>
                          {formatCapitalizedDisplayText(
                            item.buyerName,
                            "Buyer Unavailable",
                          )}
                        </span>
                      </div>
                      <VehicleActionCluster
                        tenantId={tenantId}
                        item={item}
                        canSend={canSend}
                        openVehicle={openVehicle}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6">
              <span className="tabular-nums">
                Showing up to {Math.min(query.limit, data.items.length)} of{" "}
                {data.pageInfo.totalCount.toLocaleString("en-IN")}
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span>Rows</span>
                  <Select
                    value={String(query.limit)}
                    onValueChange={(value) => {
                      navigate({ limit: value, cursor: null, unitId: null });
                    }}
                  >
                    <SelectTrigger
                      className="h-8 w-[76px]"
                      aria-label="Rows per Page"
                    >
                      <SelectValue placeholder="25" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROW_LIMIT_OPTIONS.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {nextHref === null ? null : (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={nextHref}>
                      Next{" "}
                      <ChevronRight
                        className="ml-1 size-4"
                        aria-hidden="true"
                      />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              Refine the sold-vehicle operational dataset.
            </SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 content-start gap-5 p-6">
            <div className="grid gap-2">
              <Label htmlFor="ew-status-filter">Status</Label>
              <Select
                value={draftStatus}
                onValueChange={(value) => {
                  if (isWorkspaceStatus(value)) setDraftStatus(value);
                }}
              >
                <SelectTrigger id="ew-status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ew-reconciliation-filter">Reconciliation</Label>
              <Select
                value={draftReconciliation}
                onValueChange={(value) => {
                  if (isReconciliationFilter(value))
                    setDraftReconciliation(value);
                }}
              >
                <SelectTrigger id="ew-reconciliation-filter">
                  <SelectValue placeholder="All Vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Vehicles</SelectItem>
                  <SelectItem value="ATTENTION">Needs Attention</SelectItem>
                  <SelectItem value="CLEAR">Clear</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ew-limit-filter">Rows per Page</Label>
              <Select value={draftLimit} onValueChange={setDraftLimit}>
                <SelectTrigger id="ew-limit-filter">
                  <SelectValue placeholder="25" />
                </SelectTrigger>
                <SelectContent>
                  {ROW_LIMIT_OPTIONS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="sticky bottom-0 flex gap-2 border-t bg-background p-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setDraftStatus("ALL");
                setDraftReconciliation("ALL");
                setDraftLimit("25");
              }}
            >
              Reset
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setFiltersOpen(false);
                navigate({
                  status: draftStatus,
                  reconciliation: draftReconciliation,
                  limit: draftLimit,
                  cursor: null,
                  unitId: null,
                });
              }}
            >
              Apply Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {detailPromise === null ? null : (
        <ErrorBoundary
          resetKeys={[detailPromise]}
          fallbackRender={() => (
            <WorkspaceDetailErrorSheet
              onClose={closeDetail}
              onRetry={() => {
                router.refresh();
              }}
            />
          )}
        >
          <React.Suspense
            fallback={<WorkspaceDetailLoadingSheet onClose={closeDetail} />}
          >
            <LazyWorkspaceDetailSheet
              detailPromise={detailPromise}
              tenantId={tenantId}
              canSend={canSend}
              canReconcile={canReconcile}
              onClose={closeDetail}
            />
          </React.Suspense>
        </ErrorBoundary>
      )}
    </ContentRoot>
  );
}

export function PaymentProviderSettingsPage({
  accounts,
  tenantId,
}: Readonly<{
  accounts: readonly PaymentProviderAccount[];
  tenantId: string;
}>): React.ReactElement {
  return (
    <ContentRoot width="wide">
      <div className="grid gap-6">
        <header className="grid gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Settings
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Payment Integrations
          </h1>
          <p className="text-sm text-muted-foreground">
            Tenant-scoped payment provider accounts used by the Extended
            Warranty purchase flow.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Configured Accounts</CardTitle>
            <CardDescription>
              Tenant {tenantId} currently has {accounts.length} configured
              provider account{accounts.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <ContentStatus
                title="No payment provider accounts configured."
                description="Configure a supported payment account before enabling live Extended Warranty purchases."
                icon={<RefreshCw className="size-5" aria-hidden="true" />}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.providerAccountId}>
                        <TableCell className="font-medium">
                          {formatDisplayLabel(account.providerCode, "Provider")}
                        </TableCell>
                        <TableCell>
                          {formatDisplayLabel(
                            account.environment,
                            "Environment",
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatDisplayLabel(
                              account.status,
                              "Unknown Status",
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {account.isDefault ? "Yes" : "No"}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(account.updatedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ContentRoot>
  );
}

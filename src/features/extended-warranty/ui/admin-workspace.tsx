// oz-next-app/src/features/extended-warranty/ui/admin-workspace.tsx
"use client";

import * as React from "react";
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
  Download,
  ExternalLink,
  FileCheck2,
  Filter,
  PackageCheck,
  RefreshCw,
  Send,
  WandSparkles,
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
import {
  downloadExtendedWarrantyCertificateAction,
  prepareExtendedWarrantyPurchaseLinkAction,
  reconcileExtendedWarrantyPaymentAction,
  sendExtendedWarrantyPurchaseLinkAction,
  syncExtendedWarrantyStockAction,
} from "@/features/extended-warranty/actions/admin.actions";
import type {
  ExtendedWarrantyWorkspace,
  ExtendedWarrantyWorkspaceDetail,
  ExtendedWarrantyWorkspaceItem,
  ExtendedWarrantyWorkspaceQuery,
  PaymentProviderAccount,
} from "@/features/extended-warranty/contracts/admin.schema";
import type { ExtendedWarrantyReviewDetail } from "@/features/extended-warranty/contracts/review.schema";
import { safeInternalHref } from "@/lib/security/navigation";
import { ExtendedWarrantyReviewDecisionPanel } from "./review-decision-panel";

type ExtendedWarrantyWorkspacePageProps = Readonly<{
  tenantId: string;
  data: ExtendedWarrantyWorkspace;
  query: ExtendedWarrantyWorkspaceQuery;
  detail: ExtendedWarrantyWorkspaceDetail | null;
  review: ExtendedWarrantyReviewDetail | null;
  reviewUnavailable: string | null;
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

function formatDateTime(value: string | null): string {
  if (value === null) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function formatDate(value: string | null): string {
  if (value === null) return "—";
  const parsed = new Date(`${value}T00:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}

function formatMinorAmount(
  currency: string | null,
  minor: string | null,
): string {
  if (currency === null || minor === null) return "—";
  const amount = Number(minor) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusLabel(status: ExtendedWarrantyWorkspaceItem["status"]): string {
  return formatDisplayLabel(status, "Unknown Status");
}

function statusBadge(
  status: ExtendedWarrantyWorkspaceItem["status"],
): React.ReactElement {
  const neutral = new Set([
    "NOT_PURCHASED",
    "CANCELLED",
    "EXPIRED",
    "REFUNDED",
  ]);
  const failure = new Set(["REJECTED", "FAILED"]);
  const positive = new Set(["DELIVERED", "APPROVED", "INSTALLED"]);
  const waiting = new Set([
    "PAYMENT_PENDING",
    "PAYMENT_RECONCILING",
    "PENDING",
    "INSTALLATION_PENDING",
    "REVIEW_PENDING",
    "ACTIVATION_PENDING",
    "CERTIFICATE_PENDING",
  ]);

  const variant = failure.has(status)
    ? "destructive"
    : positive.has(status)
      ? "default"
      : neutral.has(status)
        ? "secondary"
        : waiting.has(status)
          ? "outline"
          : "outline";

  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {statusLabel(status)}
    </Badge>
  );
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

function safeExternalHttpHref(value: string | null): string | null {
  if (value === null) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function DetailField({
  label,
  value,
}: Readonly<{ label: string; value: React.ReactNode }>): React.ReactElement {
  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm text-foreground">{value}</div>
    </div>
  );
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

function PurchaseLinkActionButton({
  tenantId,
  item,
}: Readonly<{
  tenantId: string;
  item: Pick<
    ExtendedWarrantyWorkspaceItem,
    | "unitId"
    | "status"
    | "purchaseLinkAction"
    | "purchaseLinkActionEnabled"
    | "purchaseLinkActionReason"
    | "eligibilityBlockers"
  >;
}>): React.ReactElement | null {
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  if (item.purchaseLinkAction === "NONE") return null;

  const prepare = item.purchaseLinkAction === "PREPARE";
  const resend = !prepare && item.status === "LINK_SENT";
  const label = prepare ? "Prepare Link" : resend ? "Resend Link" : "Send Link";
  const pendingLabel = prepare
    ? "Preparing…"
    : resend
      ? "Resending…"
      : "Sending…";
  const blockerText = item.eligibilityBlockers.join("; ");
  const reason =
    item.purchaseLinkActionReason ??
    (blockerText.length > 0 ? blockerText : `${label} is unavailable.`);

  const button = (
    <Button
      size="sm"
      variant="outline"
      className="min-w-[112px] whitespace-nowrap"
      disabled={!item.purchaseLinkActionEnabled || pending}
      aria-label={label}
      onClick={() => {
        startTransition(async () => {
          try {
            if (prepare) {
              const result = await prepareExtendedWarrantyPurchaseLinkAction({
                tenantId,
                unitId: item.unitId,
              });
              if (result.outcome === "skipped") toast.warning(result.detail);
              else if (result.outcome === "deduplicated")
                toast.info(result.detail);
              else toast.success(result.detail);
            } else {
              const form = new FormData();
              form.set("tenantId", tenantId);
              form.set("unitId", item.unitId);
              const result = await sendExtendedWarrantyPurchaseLinkAction(form);
              if (result.outcome === "skipped") toast.info(result.detail);
              else toast.success(result.detail);
            }
            router.refresh();
          } catch (error: unknown) {
            toast.error(
              error instanceof Error && error.message.trim().length > 0
                ? error.message
                : prepare
                  ? "Unable to prepare the purchase link. Please retry."
                  : resend
                    ? "Unable to resend the purchase link. Please retry."
                    : "Unable to send the purchase link. Please retry.",
            );
          }
        });
      }}
    >
      {prepare ? (
        <WandSparkles className="mr-2 size-4" aria-hidden="true" />
      ) : (
        <Send className="mr-2 size-4" aria-hidden="true" />
      )}
      {pending ? pendingLabel : label}
    </Button>
  );

  if (item.purchaseLinkActionEnabled) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">{reason}</TooltipContent>
    </Tooltip>
  );
}

function CertificateButton({
  tenantId,
  unitId,
}: Readonly<{ tenantId: string; unitId: string }>) {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      className="min-w-[112px] whitespace-nowrap"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const result = await downloadExtendedWarrantyCertificateAction({
              tenantId,
              unitId,
            });
            const href = safeExternalHttpHref(result.url);
            if (href === null) throw new Error("Invalid certificate URL");
            window.location.assign(href);
          } catch {
            toast.error("Certificate download is unavailable. Please retry.");
          }
        });
      }}
    >
      <Download className="mr-2 size-4" aria-hidden="true" />
      {pending ? "Preparing…" : "Download"}
    </Button>
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

export function ExtendedWarrantyWorkspacePage({
  tenantId,
  data,
  query,
  detail,
  review,
  reviewUnavailable,
  canSend,
  canReconcile,
}: ExtendedWarrantyWorkspacePageProps): React.ReactElement {
  const [reconciling, startReconciliation] = React.useTransition();
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
                            detail?.unitId === item.unitId
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

      <Sheet
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-0 sm:max-w-[820px]"
        >
          {detail === null ? null : (
            <div className="min-h-full bg-background">
              <div className="sticky top-0 z-20 border-b bg-background/95 px-6 py-5 backdrop-blur supports-[backdrop-filter]:bg-background/85">
                <SheetHeader className="text-left">
                  <div className="flex items-start justify-between gap-4 pr-8">
                    <div className="min-w-0">
                      <SheetTitle className="flex flex-wrap items-center gap-3 text-xl">
                        <span className="truncate font-mono">
                          {detail.vin ?? detail.invoiceNumber ?? "Vehicle"}
                        </span>
                        {statusBadge(detail.status)}
                      </SheetTitle>
                      <SheetDescription className="mt-1">
                        {detail.invoiceNumber ?? "Invoice unavailable"} ·{" "}
                        {formatDateTime(detail.invoiceAt)}
                      </SheetDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {canSend && detail.certificateFileId === null ? (
                        <PurchaseLinkActionButton
                          tenantId={tenantId}
                          item={detail}
                        />
                      ) : null}
                      {detail.certificateFileId !== null ? (
                        <CertificateButton
                          tenantId={tenantId}
                          unitId={detail.unitId}
                        />
                      ) : null}
                    </div>
                  </div>
                </SheetHeader>
              </div>

              <div className="grid gap-6 px-6 py-6 pb-10">
                {detail.eligibilityBlockers.length > 0 ||
                detail.reconciliationReasons.length > 0 ? (
                  <ContentStatus
                    variant="warning"
                    title="Attention required"
                    description={Array.from(
                      new Set([
                        ...detail.eligibilityBlockers,
                        ...detail.reconciliationReasons,
                      ]),
                    ).join(". ")}
                  />
                ) : null}

                <section className="grid gap-4 border-b pb-6">
                  <div>
                    <h2 className="font-semibold">Purchase & Workflow</h2>
                    <p className="text-sm text-muted-foreground">
                      Current purchase, payment, fulfillment, and certificate
                      state.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailField
                      label="Order"
                      value={detail.orderNumber ?? "—"}
                    />
                    <DetailField
                      label="Order Status"
                      value={formatDisplayLabel(detail.orderStatus, "—")}
                    />
                    <DetailField
                      label="Amount"
                      value={formatMinorAmount(
                        detail.currency,
                        detail.totalAmountMinor,
                      )}
                    />
                    <DetailField
                      label="Payment Confirmed"
                      value={formatDateTime(detail.paymentConfirmedAt)}
                    />
                    <DetailField
                      label="Fulfillment"
                      value={formatDisplayLabel(detail.fulfillmentStatus, "—")}
                    />
                    <DetailField
                      label="Delivered At"
                      value={formatDateTime(detail.deliveredAt)}
                    />
                    <DetailField
                      label="Installation Submitted"
                      value={formatDateTime(detail.installationSubmittedAt)}
                    />
                    <DetailField
                      label="Review"
                      value={formatDisplayLabel(detail.reviewDecision, "—")}
                    />
                    <DetailField
                      label="Certificate"
                      value={detail.certificateNumber ?? "—"}
                    />
                    <DetailField
                      label="Certificate Issued"
                      value={formatDateTime(detail.certificateIssuedAt)}
                    />
                    <DetailField
                      label="Carrier"
                      value={formatCapitalizedDisplayText(
                        detail.carrierName,
                        "—",
                      )}
                    />
                    <DetailField
                      label="Tracking"
                      value={
                        detail.trackingUrl === null
                          ? (detail.trackingNumber ?? "—")
                          : (() => {
                              const href = safeExternalHttpHref(
                                detail.trackingUrl,
                              );
                              return href === null ? (
                                (detail.trackingNumber ?? "—")
                              ) : (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  {detail.trackingNumber ?? "Open Tracking"}
                                  <ExternalLink
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                </a>
                              );
                            })()
                      }
                    />
                  </div>
                </section>

                <section className="grid gap-4 border-b pb-6">
                  <h2 className="font-semibold">Vehicle, Customer & Seller</h2>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField
                      label="VIN"
                      value={
                        <span className="font-mono">{detail.vin ?? "—"}</span>
                      }
                    />
                    <DetailField
                      label="Model"
                      value={formatCapitalizedDisplayList(
                        [detail.modelName, detail.colorName],
                        "—",
                      )}
                    />
                    <DetailField
                      label="Variant"
                      value={formatCapitalizedDisplayList(
                        [
                          detail.variantName,
                          detail.batteryType,
                          detail.batteryPowerKw,
                        ],
                        "—",
                      )}
                    />
                    <DetailField
                      label="Buyer"
                      value={formatCapitalizedDisplayText(
                        detail.buyerName,
                        "—",
                      )}
                    />
                    <DetailField
                      label="Buyer Location"
                      value={formatCapitalizedDisplayList(
                        [detail.buyerDistrict, detail.buyerState],
                        "—",
                        ", ",
                      )}
                    />
                    <DetailField
                      label="Contact"
                      value={formatCapitalizedDisplayList(
                        [detail.maskedMobile, detail.preferredMsgChannel],
                        "—",
                      )}
                    />
                    <DetailField
                      label="Seller"
                      value={formatCapitalizedDisplayText(
                        detail.sellerName,
                        "—",
                      )}
                    />
                    <DetailField
                      label="Seller Location"
                      value={formatCapitalizedDisplayList(
                        [detail.sellerDistrict, detail.sellerState],
                        "—",
                        ", ",
                      )}
                    />
                    <DetailField
                      label="Invoice Date"
                      value={formatDate(detail.saleDate)}
                    />
                  </div>
                </section>

                <section className="grid gap-4 border-b pb-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-semibold">
                        Purchase Attempts & Payments
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Compact history of order attempts and payment
                        reconciliation.
                      </p>
                    </div>
                    {canReconcile && detail.paymentIntentId ? (
                      <Button
                        variant="outline"
                        disabled={reconciling}
                        onClick={() => {
                          startReconciliation(async () => {
                            try {
                              await reconcileExtendedWarrantyPaymentAction({
                                tenantId,
                                unitId: detail.unitId,
                              });
                              toast.success("Payment reconciliation queued.");
                              router.refresh();
                            } catch {
                              toast.error(
                                "Unable to queue reconciliation. Please retry.",
                              );
                            }
                          });
                        }}
                      >
                        {reconciling ? "Queuing…" : "Reconcile Payment"}
                      </Button>
                    ) : null}
                  </div>
                  {detail.attempts.length === 0 &&
                  detail.payments.length === 0 &&
                  detail.reconciliationJobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No purchase or payment activity yet.
                    </p>
                  ) : (
                    <div className="divide-y rounded-lg border">
                      {detail.attempts.map((attempt) => (
                        <div
                          key={attempt.orderId}
                          className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="font-medium">
                              {attempt.orderNumber}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(attempt.createdAt)}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <span>
                              {formatMinorAmount(
                                attempt.currency,
                                attempt.totalAmountMinor,
                              )}
                            </span>
                            <Badge variant="outline">
                              {formatDisplayLabel(
                                attempt.status,
                                "Unknown Status",
                              )}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {detail.payments.map((payment) => (
                        <div
                          key={payment.chargeId}
                          className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="font-medium">
                              Payment{" "}
                              {formatDisplayLabel(
                                payment.status,
                                "Unknown Status",
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(payment.createdAt)}
                            </div>
                          </div>
                          <div className="text-sm">
                            {formatMinorAmount(
                              payment.currency,
                              payment.amountMinor,
                            )}
                          </div>
                        </div>
                      ))}
                      {detail.reconciliationJobs.map((job) => (
                        <div
                          key={job.id}
                          className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="font-medium">{job.reason}</div>
                            <div className="text-xs text-muted-foreground">
                              Next Attempt {formatDateTime(job.nextAttemptAt)}
                            </div>
                          </div>
                          <Badge variant="outline">
                            {formatDisplayLabel(job.status, "Unknown Status")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {reviewUnavailable ? (
                  <ContentStatus
                    title="Installation review"
                    description={reviewUnavailable}
                  />
                ) : null}
                {review === null ? null : (
                  <section className="grid gap-4 border-b pb-6">
                    <h2 className="font-semibold">Installation & Review</h2>
                    <video
                      controls
                      preload="metadata"
                      src={review.videoUrl}
                      className="w-full rounded-lg border"
                    />
                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <span>
                        {review.fileName} · {formatDateTime(review.submittedAt)}
                      </span>
                      <span>
                        Location {review.latitude}, {review.longitude} ·
                        Accuracy {review.accuracyMeters ?? "Unknown"} m
                      </span>
                    </div>
                    <ExtendedWarrantyReviewDecisionPanel
                      orderId={review.orderId}
                      orderRowVersion={review.orderRowVersion}
                      evidenceRowVersion={review.evidenceRowVersion}
                      disabled={!review.pending || review.reviewId !== null}
                    />
                  </section>
                )}

                <section className="grid gap-4">
                  <div>
                    <h2 className="font-semibold">Activity Timeline</h2>
                    <p className="text-sm text-muted-foreground">
                      Latest 100 recorded warranty events, newest first.
                    </p>
                  </div>
                  {detail.events.length === 0 ? (
                    <ContentStatus
                      title="No events recorded yet."
                      description="This vehicle has not generated any Extended Warranty events."
                      icon={
                        <FileCheck2 className="size-5" aria-hidden="true" />
                      }
                    />
                  ) : (
                    <ol className="ml-2 border-l pl-5">
                      {detail.events.map((event) => (
                        <li key={event.id} className="relative pb-5 last:pb-0">
                          <span
                            className="absolute -left-[1.45rem] top-1.5 size-2 rounded-full bg-muted-foreground"
                            aria-hidden="true"
                          />
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="text-sm font-medium">
                                {formatDisplayLabel(
                                  event.eventType,
                                  "Warranty Event",
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDisplayLabel(
                                  event.actorKind,
                                  "Unknown Actor",
                                )}
                                {event.reasonCode === null
                                  ? ""
                                  : ` · ${formatDisplayLabel(
                                      event.reasonCode,
                                      "Reason",
                                    )}`}
                              </div>
                            </div>
                            <div className="text-xs tabular-nums text-muted-foreground">
                              {formatDateTime(event.occurredAt)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
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

// oz-next-app/src/features/extended-warranty/ui/admin-workspace.tsx
"use client";

import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CalendarClock,
  CircleAlert,
  ClipboardList,
  Download,
  ExternalLink,
  FileCheck2,
  Filter,
  PackageCheck,
  RefreshCw,
  Send,
} from "lucide-react";

import {
  ContentRoot,
  ContentStatus,
  ContentHeader,
  ContentMetrics,
  ContentMetricCard,
} from "@/components/common/content-shell";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { ExtendedWarrantyReviewDecisionPanel } from "./review-decision-panel";
import type { ExtendedWarrantyReviewDetail } from "../contracts/review.schema";
import {
  downloadExtendedWarrantyCertificateAction,
  reconcileExtendedWarrantyPaymentAction,
  syncExtendedWarrantyStockAction,
} from "../actions/admin.actions";
import { Label } from "@/components/ui/label";
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
import type {
  ExtendedWarrantyWorkspace,
  ExtendedWarrantyWorkspaceDetail,
  ExtendedWarrantyWorkspaceItem,
  ExtendedWarrantyWorkspaceQuery,
  PaymentProviderAccount,
} from "@/features/extended-warranty/contracts/admin.schema";
import { sendExtendedWarrantyPurchaseLinkAction } from "@/features/extended-warranty/actions/admin.actions";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { safeInternalHref } from "@/lib/security/navigation";

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

type MetricProps = Readonly<{
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}>;

function MetricCard({
  title,
  value,
  description,
  icon,
}: MetricProps): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          tabIndex={0}
          className="h-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${title}: ${value}. ${description}`}
        >
          <ContentMetricCard
            label={title}
            value={value}
            icon={icon}
            presentation="dashboard"
            className="[&_[data-slot=content-metric-card-value]]:text-[clamp(1.5rem,1.65vw,1.875rem)]"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{description}</TooltipContent>
    </Tooltip>
  );
}

function formatDateTime(value: string | null): string {
  if (value === null) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
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

function statusBadge(
  status: ExtendedWarrantyWorkspaceItem["status"],
): React.ReactElement {
  const mapping = {
    NOT_PURCHASED: { label: "Not purchased", variant: "secondary" as const },
    LINK_SENT: { label: "Link sent", variant: "outline" as const },
    ORDERED: { label: "Ordered", variant: "outline" as const },
    PENDING: { label: "Pending", variant: "default" as const },
    INSTALLED: { label: "Installed", variant: "default" as const },
    REJECTED: { label: "Rejected", variant: "destructive" as const },
  } as const;

  const entry =
    status in mapping
      ? mapping[status as keyof typeof mapping]
      : {
          label: status.toLowerCase().replaceAll("_", " "),
          variant: "outline" as const,
        };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

function preserveQuery(
  searchParams: URLSearchParams,
  next: Readonly<Record<string, string | null | undefined>>,
): string {
  const result = new URLSearchParams(searchParams.toString());

  for (const [key, value] of Object.entries(next)) {
    if (value === null || value === undefined || value.length === 0) {
      result.delete(key);
    } else {
      result.set(key, value);
    }
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
  if (value === null) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function SendLinkButton({
  tenantId,
  unitId,
  disabled,
  reason,
}: {
  tenantId: string;
  unitId: string;
  disabled: boolean;
  reason: string;
}): React.ReactElement {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={disabled || pending}
      title={reason || "Send purchase link"}
      onClick={() => {
        startTransition(async () => {
          const form = new FormData();
          form.set("tenantId", tenantId);
          form.set("unitId", unitId);
          try {
            const result = await sendExtendedWarrantyPurchaseLinkAction(form);
            if (result.outcome === "skipped") toast.info(result.detail);
            else toast.success(result.detail);
          } catch {
            toast.error("Unable to send purchase link. Please retry.");
          }
        });
      }}
    >
      <Send className="mr-2 size-4" aria-hidden="true" />
      {pending ? "Sending…" : "Send link"}
    </Button>
  );
}
function CertificateButton({
  tenantId,
  unitId,
}: {
  tenantId: string;
  unitId: string;
}): React.ReactElement {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const result = await downloadExtendedWarrantyCertificateAction({
              tenantId,
              unitId,
            });
            const href = safeExternalHttpHref(result.url);
            if (href) window.location.assign(href);
            else throw new Error("Invalid download");
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

function DetailField({
  label,
  value,
}: Readonly<{ label: string; value: React.ReactNode }>): React.ReactElement {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="text-sm text-foreground">{value}</div>
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
  const [reconciliationOpen, setReconciliationOpen] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const openVehicle = React.useCallback(
    (unitId: string): void => {
      const href = workspaceRoute(
        pathname,
        new URLSearchParams(searchParams.toString()),
        { unitId },
      );
      router.push(href, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const closeDetail = React.useCallback((): void => {
    const href = workspaceRoute(
      pathname,
      new URLSearchParams(searchParams.toString()),
      { unitId: null },
    );
    router.push(href, { scroll: false });
  }, [pathname, router, searchParams]);

  const nextHref: Route | null =
    data.pageInfo.nextCursor === null
      ? null
      : workspaceRoute(pathname, new URLSearchParams(searchParams.toString()), {
          cursor: data.pageInfo.nextCursor,
          unitId: null,
        });

  return (
    <ContentRoot width="full" gutter="default">
      <div className="grid gap-6">
        <ContentHeader
          title="Extended Warranty"
          description="Sold vehicles and their warranty journey"
          variant="compact"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={syncingStock || !canSend}
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
                            "Stock synchronization completed, but the kit stock is still unavailable.",
                        );
                      } else {
                        toast.success(
                          `Stock synchronized for ${result.synchronizedKitCount.toLocaleString("en-IN")} kit${result.synchronizedKitCount === 1 ? "" : "s"}. Available stock: ${result.availableStock.toLocaleString("en-IN")}.`,
                        );
                      }
                    } catch (error: unknown) {
                      toast.error(
                        error instanceof Error &&
                          error.message.trim().length > 0
                          ? error.message
                          : "Unable to synchronize Extended Warranty stock. Please retry.",
                      );
                    }
                  });
                }}
              >
                <RefreshCw
                  className={`mr-2 size-4 ${syncingStock ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                {syncingStock ? "Syncing…" : "Sync Now"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setReconciliationOpen(true);
                }}
              >
                <RefreshCw className="mr-2 size-4" />
                Reconciliation
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFiltersOpen(true);
                }}
              >
                <Filter className="mr-2 size-4" />
                Filters
              </Button>
            </div>
          }
        />
        {query.q ? (
          <div className="text-sm text-muted-foreground">
            Search: {query.q}{" "}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                router.push(
                  workspaceRoute(
                    pathname,
                    new URLSearchParams(searchParams.toString()),
                    { q: null, cursor: null, unitId: null },
                  ),
                );
              }}
            >
              Clear
            </Button>
          </div>
        ) : null}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter extended warranty</SheetTitle>
              <SheetDescription>
                Filter sold vehicles by warranty status and reconciliation
                needs.
              </SheetDescription>
            </SheetHeader>
            <form method="get" className="grid gap-4 p-6">
              <input type="hidden" name="q" value={query.q} />
              <input type="hidden" name="limit" value={query.limit} />
              <Label htmlFor="ew-status">Status</Label>
              <select
                id="ew-status"
                name="status"
                defaultValue={query.status}
                className="h-10 rounded-md border bg-background px-3"
              >
                <option value="ALL">All statuses</option>
                {[
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
                ].map((value) => (
                  <option key={value} value={value}>
                    {value.toLowerCase().replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <Label htmlFor="ew-reconciliation">Reconciliation</Label>
              <select
                id="ew-reconciliation"
                name="reconciliation"
                defaultValue={query.reconciliation}
                className="h-10 rounded-md border bg-background px-3"
              >
                <option value="ALL">All vehicles</option>
                <option value="ATTENTION">Needs attention</option>
                <option value="CLEAR">Clear</option>
              </select>
              <Button type="submit">Apply filters</Button>
              <Button variant="ghost" asChild>
                <Link href="/extended-warranty">Reset filters</Link>
              </Button>
            </form>
          </SheetContent>
        </Sheet>
        <Sheet open={reconciliationOpen} onOpenChange={setReconciliationOpen}>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Reconciliation</SheetTitle>
              <SheetDescription>
                Inspect data and workflow issues before taking action.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 p-6">
              {data.overview.stockReason ? (
                <ContentStatus
                  variant="warning"
                  title="Stock unavailable"
                  description={data.overview.stockReason}
                />
              ) : null}
              <Button
                variant="outline"
                onClick={() => {
                  setReconciliationOpen(false);
                  router.push(
                    workspaceRoute(
                      pathname,
                      new URLSearchParams(searchParams.toString()),
                      {
                        reconciliation: "ATTENTION",
                        cursor: null,
                        unitId: null,
                      },
                    ),
                  );
                }}
              >
                Show all vehicles needing attention
              </Button>
              <p className="text-sm text-muted-foreground">
                Issues on this page. Open a vehicle to inspect its history and
                available actions.
              </p>
              {data.items
                .filter((item) => item.isReconciliationAttention)
                .map((item) => (
                  <button
                    key={item.unitId}
                    className="rounded-md border p-3 text-left"
                    onClick={() => {
                      setReconciliationOpen(false);
                      openVehicle(item.unitId);
                    }}
                  >
                    <span className="font-medium">
                      {item.vin ?? "VIN unavailable"}
                    </span>
                    <ul className="mt-2 text-sm text-muted-foreground">
                      {item.reconciliationReasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </button>
                ))}
            </div>
          </SheetContent>
        </Sheet>

        <ContentMetrics
          aria-label="Warranty summary"
          className="!grid-cols-[repeat(5,minmax(10rem,1fr))] gap-3 overflow-x-auto pb-1"
        >
          <MetricCard
            title="Available stock"
            value={
              data.overview.availableStock === null
                ? "Unavailable"
                : data.overview.availableStock.toLocaleString("en-IN")
            }
            description={
              data.overview.stockReason ?? "Latest synchronized kit stock."
            }
            icon={<Boxes className="size-5" aria-hidden="true" />}
          />
          <MetricCard
            title="Orders"
            value={String(data.overview.orders)}
            description="Active orders still progressing until customer receipt."
            icon={<ClipboardList className="size-5" aria-hidden="true" />}
          />
          <MetricCard
            title="Pending"
            value={String(data.overview.pending)}
            description="Awaiting approval, activation, or certificate issuance."
            icon={<CalendarClock className="size-5" aria-hidden="true" />}
          />
          <MetricCard
            title="Installed"
            value={String(data.overview.installed)}
            description="Extended Warranty certificates already issued."
            icon={<BadgeCheck className="size-5" aria-hidden="true" />}
          />
          <MetricCard
            title="Rejected"
            value={String(data.overview.rejected)}
            description="Currently rejected warranty purchases."
            icon={<CircleAlert className="size-5" aria-hidden="true" />}
          />
        </ContentMetrics>

        <Card className="border-border/70">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Sold vehicles</CardTitle>
              <CardDescription>
                Showing only sold vehicles, ordered by latest invoice creation
                time.
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {data.pageInfo.totalCount.toLocaleString("en-IN")} records
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {data.items.length === 0 ? (
              <ContentStatus
                title="No sold vehicles matched this filter."
                description="Try adjusting the search, status, or reconciliation filters."
                icon={<PackageCheck className="size-5" aria-hidden="true" />}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[220px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => (
                      <TableRow
                        key={item.unitId}
                        className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        tabIndex={0}
                        aria-label={`View warranty for ${item.vin ?? "vehicle"}`}
                        onKeyDown={(event) => {
                          if (
                            event.target === event.currentTarget &&
                            (event.key === "Enter" || event.key === " ")
                          ) {
                            event.preventDefault();
                            openVehicle(item.unitId);
                          }
                        }}
                        onClick={() => {
                          openVehicle(item.unitId);
                        }}
                      >
                        <TableCell className="align-top">
                          <div className="font-medium">
                            {item.invoiceNumber ?? "Invoice missing"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(item.invoiceAt)}
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="font-medium">{item.vin ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {[item.modelName, item.colorName]
                              .filter(Boolean)
                              .join(" • ") || "—"}
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="font-medium">
                            {item.variantName ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {[item.batteryType, item.batteryPowerKw]
                              .filter(Boolean)
                              .join(" • ") || "—"}
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="font-medium">
                            {item.sellerName ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {[item.sellerDistrict, item.sellerState]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="font-medium">
                            {item.buyerName ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {[item.buyerDistrict, item.buyerState]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="font-medium">
                            {item.maskedMobile ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.preferredMsgChannel ?? "—"}
                          </div>
                        </TableCell>

                        <TableCell className="align-top">
                          <div className="flex flex-col gap-2">
                            {statusBadge(item.status)}
                            {item.isReconciliationAttention ? (
                              <Badge variant="destructive">Attention</Badge>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell
                          className="align-top"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <div className="flex flex-wrap gap-2">
                            {canSend && item.certificateFileId === null ? (
                              <SendLinkButton
                                tenantId={tenantId}
                                unitId={item.unitId}
                                disabled={!item.canSendPurchaseLink}
                                reason={item.eligibilityBlockers.join("; ")}
                              />
                            ) : null}

                            {item.certificateFileId !== null ? (
                              <CertificateButton
                                tenantId={tenantId}
                                unitId={item.unitId}
                              />
                            ) : null}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                openVehicle(item.unitId);
                              }}
                            >
                              View
                              <ArrowRight
                                className="ml-2 size-4"
                                aria-hidden="true"
                              />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {nextHref === null ? null : (
              <div className="mt-4 flex justify-end">
                <Button variant="outline" asChild>
                  <Link href={nextHref}>
                    Next page
                    <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-6 sm:max-w-3xl"
        >
          {detail === null ? null : (
            <div className="grid gap-6 px-1 pb-6">
              <SheetHeader className="text-left">
                <SheetTitle className="flex items-center gap-3">
                  <span className="truncate">
                    {detail.vin ?? detail.invoiceNumber}
                  </span>
                  {statusBadge(detail.status)}
                </SheetTitle>
                <SheetDescription>
                  Invoice {detail.invoiceNumber} ·{" "}
                  {formatDateTime(detail.invoiceAt)}
                </SheetDescription>
              </SheetHeader>

              {detail.eligibilityBlockers.length > 0 ? (
                <ContentStatus
                  variant="warning"
                  title="Purchase link unavailable"
                  description={detail.eligibilityBlockers.join(". ")}
                />
              ) : null}
              {detail.reconciliationReasons.length > 0 ? (
                <ContentStatus
                  variant="warning"
                  title="Needs attention"
                  description={detail.reconciliationReasons.join(". ")}
                />
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Vehicle</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <DetailField label="VIN" value={detail.vin ?? "—"} />
                    <DetailField
                      label="Model"
                      value={
                        [detail.modelName, detail.colorName]
                          .filter(Boolean)
                          .join(" • ") || "—"
                      }
                    />
                    <DetailField
                      label="Variant"
                      value={
                        [
                          detail.variantName,
                          detail.batteryType,
                          detail.batteryPowerKw,
                        ]
                          .filter(Boolean)
                          .join(" • ") || "—"
                      }
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Commercial</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <DetailField
                      label="Order"
                      value={detail.orderNumber ?? "—"}
                    />
                    <DetailField
                      label="Order status"
                      value={detail.orderStatus ?? "—"}
                    />
                    <DetailField
                      label="Amount"
                      value={formatMinorAmount(
                        detail.currency,
                        detail.totalAmountMinor,
                      )}
                    />
                    <DetailField
                      label="Payment confirmed"
                      value={formatDateTime(detail.paymentConfirmedAt)}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Seller</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <DetailField
                      label="Name"
                      value={detail.sellerName ?? "—"}
                    />
                    <DetailField
                      label="Location"
                      value={
                        [detail.sellerDistrict, detail.sellerState]
                          .filter(Boolean)
                          .join(", ") || "—"
                      }
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Buyer</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <DetailField label="Name" value={detail.buyerName ?? "—"} />
                    <DetailField
                      label="Location"
                      value={
                        [detail.buyerDistrict, detail.buyerState]
                          .filter(Boolean)
                          .join(", ") || "—"
                      }
                    />
                    <DetailField
                      label="Contact"
                      value={
                        [detail.maskedMobile, detail.preferredMsgChannel]
                          .filter(Boolean)
                          .join(" • ") || "—"
                      }
                    />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">Workflow</CardTitle>
                    <CardDescription>
                      Fulfillment, review, and certificate issuance summary.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canSend && detail.certificateFileId === null ? (
                      <SendLinkButton
                        tenantId={tenantId}
                        unitId={detail.unitId}
                        disabled={!detail.canSendPurchaseLink}
                        reason={detail.eligibilityBlockers.join("; ")}
                      />
                    ) : null}

                    {detail.certificateFileId !== null ? (
                      <CertificateButton
                        tenantId={tenantId}
                        unitId={detail.unitId}
                      />
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <DetailField
                    label="Fulfillment"
                    value={detail.fulfillmentStatus ?? "—"}
                  />
                  <DetailField
                    label="Delivered at"
                    value={formatDateTime(detail.deliveredAt)}
                  />
                  <DetailField
                    label="Installation submitted"
                    value={formatDateTime(detail.installationSubmittedAt)}
                  />
                  <DetailField
                    label="Review"
                    value={detail.reviewDecision ?? "—"}
                  />
                  <DetailField
                    label="Reviewed at"
                    value={formatDateTime(detail.reviewedAt)}
                  />
                  <DetailField
                    label="Certificate"
                    value={
                      detail.certificateNumber === null
                        ? "—"
                        : `${detail.certificateNumber} · ${formatDateTime(
                            detail.certificateIssuedAt,
                          )}`
                    }
                  />
                  <DetailField
                    label="Tracking"
                    value={
                      detail.trackingUrl === null
                        ? (detail.trackingNumber ?? "—")
                        : (() => {
                            const trackingHref = safeExternalHttpHref(
                              detail.trackingUrl,
                            );

                            return trackingHref === null ? (
                              (detail.trackingNumber ?? "—")
                            ) : (
                              <a
                                href={trackingHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                {detail.trackingNumber ?? "Open tracking"}
                                <ExternalLink
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              </a>
                            );
                          })()
                    }
                  />
                  <DetailField
                    label="Carrier"
                    value={detail.carrierName ?? "—"}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Purchase attempts & payments
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {detail.attempts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No purchases yet.
                    </p>
                  ) : (
                    detail.attempts.map((attempt) => (
                      <div
                        key={attempt.orderId}
                        className="rounded-md border p-3"
                      >
                        <div className="flex justify-between gap-2">
                          <span>{attempt.orderNumber}</span>
                          <Badge variant="outline">
                            {attempt.status.toLowerCase().replaceAll("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatMinorAmount(
                            attempt.currency,
                            attempt.totalAmountMinor,
                          )}{" "}
                          · {formatDateTime(attempt.createdAt)}
                        </p>
                        <p className="text-sm">
                          Payment confirmed:{" "}
                          {formatDateTime(attempt.paymentConfirmedAt)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Payment reconciliation
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {detail.payments.map((payment) => (
                    <div
                      key={payment.chargeId}
                      className="rounded-md border p-3 text-sm"
                    >
                      <Badge variant="outline">{payment.status}</Badge>
                      <p>
                        {formatMinorAmount(
                          payment.currency,
                          payment.amountMinor,
                        )}{" "}
                        · Refunded:{" "}
                        {formatMinorAmount(
                          payment.currency,
                          payment.refundedAmountMinor,
                        )}
                      </p>
                      <p className="text-muted-foreground">
                        {formatDateTime(payment.createdAt)}
                      </p>
                    </div>
                  ))}
                  {detail.reconciliationJobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No reconciliation jobs.
                    </p>
                  ) : (
                    detail.reconciliationJobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-md border p-3 text-sm"
                      >
                        <Badge variant="outline">{job.status}</Badge>
                        <p>
                          {job.reason} · Attempts: {job.attemptCount}
                        </p>
                        <p className="text-muted-foreground">
                          Next attempt: {formatDateTime(job.nextAttemptAt)}
                        </p>
                      </div>
                    ))
                  )}
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
                          } catch {
                            toast.error(
                              "Unable to queue reconciliation. Please retry.",
                            );
                          }
                        });
                      }}
                    >
                      {reconciling ? "Queuing…" : "Reconcile payment"}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
              {reviewUnavailable ? (
                <ContentStatus
                  title="Installation review"
                  description={reviewUnavailable}
                />
              ) : null}
              {review === null ? null : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Installation & review
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <video
                      controls
                      preload="metadata"
                      src={review.videoUrl}
                      className="w-full rounded-md"
                    />
                    <p className="text-sm text-muted-foreground">
                      {review.fileName} · {formatDateTime(review.submittedAt)}
                    </p>
                    <p className="text-sm">
                      Location: {review.latitude}, {review.longitude} ·
                      Accuracy: {review.accuracyMeters ?? "Unknown"} m
                    </p>
                    <ExtendedWarrantyReviewDecisionPanel
                      orderId={review.orderId}
                      orderRowVersion={review.orderRowVersion}
                      evidenceRowVersion={review.evidenceRowVersion}
                      disabled={!review.pending || review.reviewId !== null}
                    />
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Activity timeline</CardTitle>
                  <CardDescription>
                    Latest 100 recorded warranty events, newest first.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {detail.events.length === 0 ? (
                    <ContentStatus
                      title="No events recorded yet."
                      description="This vehicle has not generated any Extended Warranty events."
                      icon={
                        <FileCheck2 className="size-5" aria-hidden="true" />
                      }
                    />
                  ) : (
                    <ol className="grid gap-3">
                      {detail.events.map((event) => (
                        <li
                          key={event.id}
                          className="rounded-2xl border border-border/60 bg-muted/20 p-4"
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div className="grid gap-1">
                              <div className="font-medium">
                                {event.eventType}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {event.actorKind}
                                {event.reasonCode === null
                                  ? null
                                  : ` • ${event.reasonCode}`}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(event.occurredAt)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
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
            Payment integrations
          </h1>
          <p className="text-sm text-muted-foreground">
            Tenant-scoped payment provider accounts used by the Extended
            Warranty purchase flow.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Configured accounts</CardTitle>
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
                          {account.providerCode}
                        </TableCell>
                        <TableCell>{account.environment}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{account.status}</Badge>
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

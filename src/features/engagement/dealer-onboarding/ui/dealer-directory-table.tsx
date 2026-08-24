// oz-next-app/src/features/engagement/dealer-onboarding/ui/dealer-directory-table.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  Plus,
  Power,
  PowerOff,
  SlidersHorizontal,
  WalletCards,
  X,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentScrollArea,
} from "@/components/common/content-shell";
import {
  EnterpriseTableControls,
  type EnterpriseTableColumn,
  type EnterpriseTableDensity,
} from "@/components/common/enterprise-table-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateDealerBulkStatusAction } from "@/features/engagement/dealer-onboarding/actions/dealer-onboarding.actions";
import {
  DEALER_ONBOARDING_TYPES,
  type DealerDirectoryPage,
  type DealerDirectorySearchParams,
  type DealerDirectorySortDirection,
  type DealerDirectorySortField,
} from "@/features/engagement/dealer-onboarding/contracts/dealer-onboarding.schema";
import type { ResolvedDealerAdministrationAccess } from "@/features/engagement/dealer-onboarding/policies/dealer-onboarding.policy";
import { DealerWorkspaceHeader } from "@/features/engagement/dealer-onboarding/ui/dealer-workspace-header";
import {
  dealerDetailHref,
  dealerDirectoryHref,
  dealerOnboardingHref,
} from "@/features/engagement/dealer-onboarding/utils/dealer-onboarding-url";
import { UI_STORAGE_KEYS } from "@/lib/ui-preferences/storage-keys";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COLUMN_DEFINITIONS = [
  {
    id: "dealer",
    label: "Dealer",
    hideable: false,
    reorderable: false,
    weight: 2.1,
  },
  { id: "type", label: "Type", weight: 0.9 },
  { id: "contact", label: "Primary staff", weight: 1.8 },
  { id: "location", label: "Location", weight: 1.45 },
  { id: "tax", label: "GSTIN / Place of supply", weight: 1.75 },
  { id: "wallet", label: "Wallet", weight: 1.45 },
  { id: "source", label: "Source", weight: 0.95 },
  { id: "status", label: "Status", weight: 0.85 },
] as const satisfies ReadonlyArray<
  EnterpriseTableColumn & { readonly weight: number }
>;

type ColumnId = (typeof COLUMN_DEFINITIONS)[number]["id"];
type DealerTypeFilter = "DEALER" | "SUB_DEALER" | null;
type DealerStatusFilter = "true" | "false" | "all";

type TablePreferences = Readonly<{
  density: EnterpriseTableDensity;
  order: readonly ColumnId[];
  hidden: readonly ColumnId[];
}>;

const DEFAULT_ORDER = COLUMN_DEFINITIONS.map((column) => column.id);
const DEFAULT_VISIBLE = new Set<ColumnId>(DEFAULT_ORDER);

const ROW_CLASSES: Record<EnterpriseTableDensity, string> = {
  compact: "h-12",
  normal: "h-16",
  comfortable: "h-20",
};

const CELL_CLASSES: Record<EnterpriseTableDensity, string> = {
  compact: "py-1.5",
  normal: "py-2.5",
  comfortable: "py-4",
};

function isColumnId(value: string): value is ColumnId {
  return COLUMN_DEFINITIONS.some((column) => column.id === value);
}

function isUnknownRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePreferences(value: string | null): TablePreferences | null {
  if (value === null) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isUnknownRecord(parsed)) return null;
    const density = parsed["density"];
    const order = parsed["order"];
    const hidden = parsed["hidden"];

    if (
      density !== "compact" &&
      density !== "normal" &&
      density !== "comfortable"
    ) {
      return null;
    }
    if (!Array.isArray(order) || !Array.isArray(hidden)) return null;

    const normalizedOrder = order.filter(
      (candidate): candidate is ColumnId =>
        typeof candidate === "string" && isColumnId(candidate),
    );
    const normalizedHidden = hidden.filter(
      (candidate): candidate is ColumnId =>
        typeof candidate === "string" &&
        isColumnId(candidate) &&
        candidate !== "dealer",
    );
    const allOrderIds = new Set(normalizedOrder);
    const completeOrder: readonly ColumnId[] = [
      "dealer",
      ...normalizedOrder.filter((columnId) => columnId !== "dealer"),
      ...DEFAULT_ORDER.filter((columnId) => !allOrderIds.has(columnId)),
    ];

    return {
      density,
      order: Array.from(new Set(completeOrder)),
      hidden: Array.from(new Set(normalizedHidden)),
    };
  } catch {
    return null;
  }
}

function sourceVariant(
  code: string,
): React.ComponentProps<typeof Badge>["variant"] {
  const normalized = code.toUpperCase();
  if (
    normalized.includes("META") ||
    normalized.includes("FACEBOOK") ||
    normalized.includes("INSTAGRAM")
  ) {
    return "info";
  }
  if (normalized.includes("WEBSITE") || normalized.includes("WEB")) {
    return "success";
  }
  if (normalized.includes("REFERRAL")) return "warning";
  if (normalized.includes("ERP_DIRECT") || normalized.includes("DIRECT")) {
    return "secondary";
  }
  return "outline";
}

function sourceLabel(name: string, code: string): string {
  const normalizedName = name.trim().toLowerCase();
  const normalizedCode = code.trim().toUpperCase();
  return normalizedName === "unknown source" ||
    normalizedName === "unknown" ||
    normalizedCode === "UNKNOWN"
    ? "Direct"
    : name;
}

function countLabel(value: number): string {
  return value.toLocaleString("en-IN");
}

function sortIcon(
  active: boolean,
  direction: DealerDirectorySortDirection,
): React.ReactElement {
  if (!active) {
    return <ArrowUpDown aria-hidden="true" className="size-3.5 opacity-60" />;
  }
  return direction === "DESC" ? (
    <ArrowDown aria-hidden="true" className="size-3.5" />
  ) : (
    <ArrowUp aria-hidden="true" className="size-3.5" />
  );
}

export function DealerDirectoryTable({
  access,
  data,
  query,
}: Readonly<{
  access: ResolvedDealerAdministrationAccess;
  data: DealerDirectoryPage;
  query: DealerDirectorySearchParams;
}>): React.ReactElement {
  const router = useRouter();
  const summary = data.summary;
  const [density, setDensity] =
    React.useState<EnterpriseTableDensity>("normal");
  const [columnOrder, setColumnOrder] =
    React.useState<readonly ColumnId[]>(DEFAULT_ORDER);
  const [visibleColumns, setVisibleColumns] =
    React.useState<ReadonlySet<ColumnId>>(DEFAULT_VISIBLE);
  const [selectedIds, setSelectedIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [bulkTarget, setBulkTarget] = React.useState<boolean | null>(null);
  const [bulkReason, setBulkReason] = React.useState("");
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [bulkFeedback, setBulkFeedback] = React.useState<string | null>(null);
  const preferencesHydrated = React.useRef(false);

  React.useEffect(() => {
    const preferences = parsePreferences(
      window.localStorage.getItem(UI_STORAGE_KEYS.DEALER_DIRECTORY_TABLE),
    );
    queueMicrotask(() => {
      if (preferences !== null) {
        setDensity(preferences.density);
        setColumnOrder(preferences.order);
        setVisibleColumns(
          new Set(
            DEFAULT_ORDER.filter(
              (columnId) => !preferences.hidden.includes(columnId),
            ),
          ),
        );
      }
      preferencesHydrated.current = true;
    });
  }, []);

  React.useEffect(() => {
    if (!preferencesHydrated.current) return;
    const hidden = DEFAULT_ORDER.filter(
      (columnId) => !visibleColumns.has(columnId),
    );
    const preferences: TablePreferences = {
      density,
      order: columnOrder,
      hidden,
    };
    window.localStorage.setItem(
      UI_STORAGE_KEYS.DEALER_DIRECTORY_TABLE,
      JSON.stringify(preferences),
    );
  }, [columnOrder, density, visibleColumns]);

  const viewKey = [
    query.q ?? "",
    query.dealerType ?? "",
    query.active ?? "true",
    query.sortBy ?? "DISPLAY_NAME",
    query.sortDirection ?? "ASC",
    query.cursor ?? "",
  ].join("|");

  React.useEffect(() => {
    queueMicrotask(() => {
      setSelectedIds(new Set());
      setBulkFeedback(null);
      setBulkTarget(null);
      setBulkReason("");
    });
  }, [viewKey]);

  const navigate = React.useCallback(
    (
      patch: Readonly<{
        q?: string | null;
        dealerType?: DealerTypeFilter;
        active?: DealerStatusFilter;
        sortBy?: DealerDirectorySortField;
        sortDirection?: DealerDirectorySortDirection;
        cursor?: string | null;
      }>,
    ): void => {
      setSelectedIds(new Set());
      setBulkFeedback(null);
      const nextSearch = Object.hasOwn(patch, "q") ? patch.q : query.q;
      const nextDealerType = Object.hasOwn(patch, "dealerType")
        ? patch.dealerType
        : query.dealerType;
      const nextActive = Object.hasOwn(patch, "active")
        ? patch.active
        : (query.active ?? "true");
      const nextSortBy = Object.hasOwn(patch, "sortBy")
        ? patch.sortBy
        : (query.sortBy ?? "DISPLAY_NAME");
      const nextSortDirection = Object.hasOwn(patch, "sortDirection")
        ? patch.sortDirection
        : (query.sortDirection ?? "ASC");
      const nextCursor = Object.hasOwn(patch, "cursor")
        ? patch.cursor
        : query.cursor;

      router.push(
        dealerDirectoryHref({
          ...(nextSearch === undefined ||
          nextSearch === null ||
          nextSearch === ""
            ? {}
            : { q: nextSearch }),
          ...(nextDealerType === undefined || nextDealerType === null
            ? {}
            : { dealerType: nextDealerType }),
          active: nextActive ?? "true",
          sortBy: nextSortBy ?? "DISPLAY_NAME",
          sortDirection: nextSortDirection ?? "ASC",
          ...(nextCursor === undefined || nextCursor === null
            ? {}
            : { cursor: nextCursor }),
        }),
        { scroll: false },
      );
    },
    [
      query.active,
      query.cursor,
      query.dealerType,
      query.q,
      query.sortBy,
      query.sortDirection,
      router,
    ],
  );

  const setSort = React.useCallback(
    (sortBy: DealerDirectorySortField): void => {
      const currentSort = query.sortBy ?? "DISPLAY_NAME";
      const currentDirection = query.sortDirection ?? "ASC";
      navigate({
        sortBy,
        sortDirection:
          currentSort === sortBy && currentDirection === "ASC" ? "DESC" : "ASC",
        cursor: null,
      });
    },
    [navigate, query.sortBy, query.sortDirection],
  );

  const orderedVisibleColumns = React.useMemo(
    () => columnOrder.filter((columnId) => visibleColumns.has(columnId)),
    [columnOrder, visibleColumns],
  );
  const visibleColumnWeight = React.useMemo(
    () =>
      orderedVisibleColumns.reduce(
        (total, columnId) =>
          total +
          (COLUMN_DEFINITIONS.find((column) => column.id === columnId)
            ?.weight ?? 1),
        0,
      ),
    [orderedVisibleColumns],
  );
  const allVisibleSelected =
    data.items.length > 0 &&
    data.items.every((dealer) => selectedIds.has(dealer.dealerOrgUnitId));
  const someVisibleSelected = data.items.some((dealer) =>
    selectedIds.has(dealer.dealerOrgUnitId),
  );

  const updateColumnVisibility = React.useCallback(
    (columnId: string, visible: boolean): void => {
      if (!isColumnId(columnId) || columnId === "dealer") return;
      setVisibleColumns((current) => {
        const next = new Set(current);
        if (visible) next.add(columnId);
        else next.delete(columnId);
        return next;
      });
    },
    [],
  );

  const moveColumn = React.useCallback(
    (columnId: string, direction: "up" | "down"): void => {
      if (!isColumnId(columnId) || columnId === "dealer") return;
      setColumnOrder((current) => {
        const index = current.indexOf(columnId);
        if (index < 1) return current;
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 1 || target >= current.length) return current;
        const next = [...current];
        [next[index], next[target]] = [
          next[target] ?? columnId,
          next[index] ?? columnId,
        ];
        return next;
      });
    },
    [],
  );

  const selectedDealers = React.useMemo(
    () =>
      data.items.filter((dealer) => selectedIds.has(dealer.dealerOrgUnitId)),
    [data.items, selectedIds],
  );

  const submitBulkStatus = React.useCallback(async (): Promise<void> => {
    if (bulkTarget === null || bulkReason.trim().length < 3) return;
    setBulkBusy(true);
    setBulkFeedback(null);
    const result = await updateDealerBulkStatusAction({
      dealers: selectedDealers.map((dealer) => ({
        dealerOrgUnitId: dealer.dealerOrgUnitId,
        expectedUpdatedAt: dealer.updatedAt,
      })),
      isActive: bulkTarget,
      reason: bulkReason.trim(),
    });
    setBulkBusy(false);
    if (!result.ok) {
      setBulkFeedback(result.message);
      return;
    }
    setBulkTarget(null);
    setBulkReason("");
    setSelectedIds(new Set());
    router.refresh();
  }, [bulkReason, bulkTarget, router, selectedDealers]);

  const currentSort = query.sortBy ?? "DISPLAY_NAME";
  const currentDirection = query.sortDirection ?? "ASC";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DealerWorkspaceHeader
        titleId="dealer-directory-title"
        title="Dealers"
        description="Dealer and sub-dealer administration, staff access, tax, wallets, and operational readiness."
        icon={<Building2 aria-hidden="true" className="size-4" />}
        meta={
          summary === undefined ? undefined : (
            <span className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-xl border border-border/70 bg-muted/45 px-3 text-caption text-muted-readable">
              <strong className="font-medium text-foreground">
                {countLabel(summary.filtered)}
              </strong>
              <span className="ms-1">in view</span>
              <span aria-hidden="true" className="mx-2">
                ·
              </span>
              <span>{countLabel(summary.active)} active</span>
              <span aria-hidden="true" className="mx-2">
                ·
              </span>
              <span>{countLabel(summary.total)} total</span>
            </span>
          )
        }
        actions={
          <div className="flex shrink-0 items-center gap-2">
            {query.q === undefined ? null : (
              <Badge
                variant="secondary"
                className="h-8 max-w-72 gap-2 rounded-xl px-3"
              >
                <span className="truncate">Global search: {query.q}</span>
                <button
                  type="button"
                  className="rounded-md outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label="Clear global dealer search"
                  onClick={() => {
                    navigate({ q: null, cursor: null });
                  }}
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </Badge>
            )}

            <Select
              value={query.dealerType ?? "ALL"}
              onValueChange={(value) => {
                navigate({
                  dealerType:
                    value === "ALL"
                      ? null
                      : (DEALER_ONBOARDING_TYPES.find(
                          (candidate) => candidate === value,
                        ) ?? null),
                  cursor: null,
                });
              }}
            >
              <SelectTrigger size="compact" className="w-[10.5rem] shrink-0">
                <SlidersHorizontal aria-hidden="true" className="size-3.5" />
                <SelectValue placeholder="Dealer type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All dealer types</SelectItem>
                <SelectItem value="DEALER">Dealers</SelectItem>
                <SelectItem value="SUB_DEALER">Sub-dealers</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={query.active ?? "true"}
              onValueChange={(value) => {
                navigate({
                  active:
                    value === "true" || value === "false" || value === "all"
                      ? value
                      : "true",
                  cursor: null,
                });
              }}
            >
              <SelectTrigger size="compact" className="w-[8.5rem] shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
              </SelectContent>
            </Select>

            <EnterpriseTableControls
              density={density}
              onDensityChange={setDensity}
              columns={COLUMN_DEFINITIONS}
              columnOrder={columnOrder}
              visibleColumnIds={visibleColumns}
              onColumnVisibilityChange={updateColumnVisibility}
              onColumnMove={moveColumn}
              onResetColumns={() => {
                setDensity("normal");
                setColumnOrder(DEFAULT_ORDER);
                setVisibleColumns(new Set(DEFAULT_ORDER));
              }}
            />

            {access.capabilities.canOnboard ? (
              <Button asChild size="sm" className="h-9 shrink-0">
                <Link href={dealerOnboardingHref()}>
                  <Plus aria-hidden="true" className="size-4" />
                  Onboard Dealer
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <ContentDataSurface
        padded={false}
        className="min-h-0 flex-1 overflow-hidden [&>[data-slot=card-footer]]:shrink-0 [&>[data-slot=card-footer]]:p-0"
        contentClassName="flex min-h-0 flex-1 flex-col"
        footer={
          <div className="flex h-10 min-h-10 w-full items-center justify-between gap-3 px-4">
            <span className="text-caption text-muted-readable">
              Tenant-scoped, uncached operational data
            </span>
            <div className="flex gap-2">
              {query.cursor !== undefined ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    navigate({ cursor: null });
                  }}
                >
                  First page
                </Button>
              ) : null}
              {data.pagination.hasMore &&
              data.pagination.nextCursor !== null ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    navigate({ cursor: data.pagination.nextCursor });
                  }}
                >
                  Next
                </Button>
              ) : null}
            </div>
          </div>
        }
      >
        {bulkFeedback === null ? null : (
          <div
            role="alert"
            className="border-b border-destructive/25 bg-destructive/5 px-4 py-2 text-body-sm text-destructive"
          >
            {bulkFeedback}
          </div>
        )}
        <ContentScrollArea
          label="Dealer directory table"
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]"
          style={{ overscrollBehaviorY: "auto" }}
        >
          <Table scrollMode="parent" className="hidden table-fixed lg:table">
            <colgroup>
              {access.capabilities.canUpdateDealer ? (
                <col className="w-11" />
              ) : null}
              {orderedVisibleColumns.map((columnId) => {
                const weight =
                  COLUMN_DEFINITIONS.find((column) => column.id === columnId)
                    ?.weight ?? 1;
                return (
                  <col
                    key={columnId}
                    style={{
                      width: `${String((weight / visibleColumnWeight) * 100)}%`,
                    }}
                  />
                );
              })}
            </colgroup>
            <TableHeader className="sticky top-0 z-30 bg-card/95 shadow-sm shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-xl">
              <TableRow className="h-11 bg-muted/20 hover:bg-muted/20">
                {access.capabilities.canUpdateDealer ? (
                  <TableHead className="w-11 px-3 text-center">
                    <Checkbox
                      checked={
                        allVisibleSelected
                          ? true
                          : someVisibleSelected
                            ? "indeterminate"
                            : false
                      }
                      aria-label="Select all dealers on this page"
                      onCheckedChange={(checked) => {
                        setSelectedIds(
                          checked === true
                            ? new Set(
                                data.items.map(
                                  (dealer) => dealer.dealerOrgUnitId,
                                ),
                              )
                            : new Set(),
                        );
                      }}
                    />
                  </TableHead>
                ) : null}
                {orderedVisibleColumns.map((columnId) => (
                  <DirectoryHead
                    key={columnId}
                    columnId={columnId}
                    currentSort={currentSort}
                    currentDirection={currentDirection}
                    onSort={setSort}
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      orderedVisibleColumns.length +
                      (access.capabilities.canUpdateDealer ? 1 : 0)
                    }
                    className="h-44 text-center"
                  >
                    <div className="font-medium">
                      No dealers match this view
                    </div>
                    <div className="mt-1 text-body-sm text-muted-readable">
                      Change the search or filters to broaden the directory.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((dealer) => {
                  const detailHref = dealerDetailHref(dealer.dealerOrgUnitId);
                  return (
                    <TableRow
                      key={dealer.dealerOrgUnitId}
                      role="link"
                      tabIndex={0}
                      aria-label={`Open ${dealer.displayName}`}
                      className={cn(
                        ROW_CLASSES[density],
                        "cursor-pointer outline-none hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
                      )}
                      onClick={() => {
                        router.push(detailHref);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(detailHref);
                        }
                      }}
                    >
                      {access.capabilities.canUpdateDealer ? (
                        <TableCell className="w-11 px-3 text-center">
                          <Checkbox
                            checked={selectedIds.has(dealer.dealerOrgUnitId)}
                            aria-label={`Select ${dealer.displayName}`}
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                            onCheckedChange={(checked) => {
                              setSelectedIds((current) => {
                                const next = new Set(current);
                                if (checked === true) {
                                  next.add(dealer.dealerOrgUnitId);
                                } else {
                                  next.delete(dealer.dealerOrgUnitId);
                                }
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                      ) : null}
                      {orderedVisibleColumns.map((columnId) => (
                        <DirectoryCell
                          key={columnId}
                          columnId={columnId}
                          dealer={dealer}
                          detailHref={detailHref}
                          density={density}
                        />
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="grid gap-3 p-3 lg:hidden">
            {data.items.length === 0 ? (
              <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-border/80 p-6 text-center">
                <div>
                  <div className="font-medium">No dealers match this view</div>
                  <div className="mt-1 text-body-sm text-muted-readable">
                    Change the global search or filters to broaden the
                    directory.
                  </div>
                </div>
              </div>
            ) : (
              data.items.map((dealer) => (
                <DealerDirectoryCard
                  key={dealer.dealerOrgUnitId}
                  dealer={dealer}
                  visibleColumns={visibleColumns}
                  selected={selectedIds.has(dealer.dealerOrgUnitId)}
                  selectable={access.capabilities.canUpdateDealer}
                  onSelectedChange={(selected) => {
                    setSelectedIds((current) => {
                      const next = new Set(current);
                      if (selected) next.add(dealer.dealerOrgUnitId);
                      else next.delete(dealer.dealerOrgUnitId);
                      return next;
                    });
                  }}
                />
              ))
            )}
          </div>
        </ContentScrollArea>

        {selectedDealers.length === 0 ? null : (
          <div className="sticky bottom-3 z-40 mx-3 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/95 p-3 shadow-xl shadow-foreground/10 supports-[backdrop-filter]:backdrop-blur-xl">
            <div className="flex items-center gap-2 text-body-sm">
              <CheckCircle2
                aria-hidden="true"
                className="size-4 text-primary"
              />
              <strong>{countLabel(selectedDealers.length)} selected</strong>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedIds(new Set());
                  setBulkFeedback(null);
                }}
              >
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkTarget(false);
                  setBulkReason("");
                }}
              >
                <PowerOff aria-hidden="true" />
                Deactivate
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setBulkTarget(true);
                  setBulkReason("");
                }}
              >
                <Power aria-hidden="true" />
                Activate
              </Button>
            </div>
          </div>
        )}
      </ContentDataSurface>

      <AlertDialog
        open={bulkTarget !== null}
        onOpenChange={(open) => {
          if (!open && !bulkBusy) {
            setBulkTarget(null);
            setBulkReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              {bulkTarget === true ? (
                <Power aria-hidden="true" />
              ) : (
                <PowerOff aria-hidden="true" />
              )}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {bulkTarget === true ? "Activate" : "Deactivate"}{" "}
              {countLabel(selectedDealers.length)} dealer
              {selectedDealers.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This audited, all-or-nothing update checks every selected dealer
              for concurrent changes before applying the new status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dealer-bulk-status-reason">Reason</Label>
            <Textarea
              id="dealer-bulk-status-reason"
              value={bulkReason}
              maxLength={500}
              placeholder="Explain why this status change is required"
              onChange={(event) => {
                setBulkReason(event.target.value);
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant={bulkTarget === false ? "destructive" : "default"}
              disabled={bulkBusy || bulkReason.trim().length < 3}
              onClick={() => {
                void submitBulkStatus();
              }}
            >
              {bulkBusy ? "Updating…" : "Confirm status change"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DirectoryHead({
  columnId,
  currentSort,
  currentDirection,
  onSort,
}: Readonly<{
  columnId: ColumnId;
  currentSort: DealerDirectorySortField;
  currentDirection: DealerDirectorySortDirection;
  onSort: (sortBy: DealerDirectorySortField) => void;
}>): React.ReactElement {
  const config: Readonly<{
    label: string;
    sortBy: DealerDirectorySortField | null;
    className: string;
  }> = (() => {
    switch (columnId) {
      case "dealer":
        return {
          label: "Dealer",
          sortBy: "DISPLAY_NAME",
          className: "text-left",
        };
      case "type":
        return {
          label: "Type",
          sortBy: "DEALER_TYPE",
          className: "text-center",
        };
      case "contact":
        return { label: "Primary staff", sortBy: null, className: "text-left" };
      case "location":
        return {
          label: "Location",
          sortBy: "LOCATION",
          className: "text-left",
        };
      case "tax":
        return {
          label: "GSTIN / Place of supply",
          sortBy: null,
          className: "text-left",
        };
      case "wallet":
        return { label: "Wallet", sortBy: null, className: "text-right" };
      case "source":
        return { label: "Source", sortBy: null, className: "text-center" };
      case "status":
        return { label: "Status", sortBy: "STATUS", className: "text-center" };
    }
  })();

  const sortBy = config.sortBy;
  const active = sortBy !== null && currentSort === sortBy;

  return (
    <TableHead className={config.className}>
      {sortBy === null ? (
        config.label
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "-mx-2 h-8 gap-1.5 px-2",
            columnId === "type" || columnId === "status"
              ? "mx-auto"
              : "justify-start",
          )}
          aria-label={`Sort by ${config.label} ${
            active && currentDirection === "ASC" ? "descending" : "ascending"
          }`}
          onClick={() => {
            onSort(sortBy);
          }}
        >
          {config.label}
          {sortIcon(active, currentDirection)}
        </Button>
      )}
    </TableHead>
  );
}

function DirectoryCell({
  columnId,
  dealer,
  detailHref,
  density,
}: Readonly<{
  columnId: ColumnId;
  dealer: DealerDirectoryPage["items"][number];
  detailHref: ReturnType<typeof dealerDetailHref>;
  density: EnterpriseTableDensity;
}>): React.ReactElement {
  const base = CELL_CLASSES[density];

  switch (columnId) {
    case "dealer":
      return (
        <TableCell
          className={cn(base, "min-w-0 whitespace-normal align-middle")}
        >
          <div className="min-w-0">
            <Link
              href={detailHref}
              className="block truncate font-medium text-foreground outline-none hover:underline hover:underline-offset-4 focus-visible:underline"
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              {dealer.displayName}
            </Link>
            <div className="truncate text-caption text-muted-readable tabular-nums">
              {dealer.dealerCode}
            </div>
          </div>
        </TableCell>
      );
    case "type":
      return (
        <TableCell className={cn(base, "whitespace-normal text-center")}>
          <Badge
            variant={dealer.dealerType === "DEALER" ? "info" : "secondary"}
          >
            {dealer.dealerType === "DEALER" ? "Dealer" : "Sub-dealer"}
          </Badge>
        </TableCell>
      );
    case "contact":
      return (
        <TableCell className={cn(base, "min-w-0 whitespace-normal text-left")}>
          <div className="truncate font-medium">
            {dealer.primaryEmail ?? dealer.primaryEmailMasked}
          </div>
          <div className="truncate text-caption text-muted-readable tabular-nums">
            {dealer.primaryPhone ?? dealer.primaryPhoneMasked}
          </div>
        </TableCell>
      );
    case "location":
      return (
        <TableCell className={cn(base, "min-w-0 whitespace-normal text-left")}>
          <div className="truncate font-medium">{dealer.city ?? "—"}</div>
          <div className="truncate text-caption text-muted-readable">
            {[dealer.district, dealer.state].filter(Boolean).join(", ") || "—"}
          </div>
        </TableCell>
      );
    case "tax":
      return (
        <TableCell className={cn(base, "min-w-0 whitespace-normal text-left")}>
          <div className="truncate font-medium tabular-nums">
            {dealer.gstinMasked ?? "—"}
          </div>
          <div className="truncate text-caption text-muted-readable">
            {dealer.placeOfSupply ?? "Place of supply not configured"}
          </div>
        </TableCell>
      );
    case "wallet":
      return (
        <TableCell
          className={cn(
            base,
            "min-w-0 whitespace-normal text-right tabular-nums",
          )}
        >
          {dealer.walletBalance === null ? (
            <span className="text-muted-readable">—</span>
          ) : (
            <div className="inline-flex items-center justify-end gap-2">
              <WalletCards
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-readable"
              />
              <div className="text-right">
                <div className="font-medium">
                  {dealer.walletBalance.currency}{" "}
                  {money.format(Number(dealer.walletBalance.availableBalance))}
                </div>
                <div className="text-caption text-muted-readable">
                  {dealer.walletBalance.walletCount} wallet
                  {dealer.walletBalance.walletCount === 1 ? "" : "s"}
                </div>
              </div>
            </div>
          )}
        </TableCell>
      );
    case "source":
      return (
        <TableCell className={cn(base, "whitespace-normal text-center")}>
          <Badge variant={sourceVariant(dealer.source.code)}>
            {sourceLabel(dealer.source.name, dealer.source.code)}
          </Badge>
        </TableCell>
      );
    case "status":
      return (
        <TableCell className={cn(base, "whitespace-normal text-center")}>
          <Badge variant={dealer.isActive ? "success" : "secondary"}>
            {dealer.isActive ? "Active" : "Inactive"}
          </Badge>
        </TableCell>
      );
  }
}

function DealerDirectoryCard({
  dealer,
  visibleColumns,
  selected,
  selectable,
  onSelectedChange,
}: Readonly<{
  dealer: DealerDirectoryPage["items"][number];
  visibleColumns: ReadonlySet<ColumnId>;
  selected: boolean;
  selectable: boolean;
  onSelectedChange: (selected: boolean) => void;
}>): React.ReactElement {
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
      <div className="flex items-start gap-3">
        {selectable ? (
          <Checkbox
            checked={selected}
            aria-label={`Select ${dealer.displayName}`}
            className="mt-1"
            onCheckedChange={(checked) => {
              onSelectedChange(checked === true);
            }}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={dealerDetailHref(dealer.dealerOrgUnitId)}
                className="block truncate font-medium hover:underline hover:underline-offset-4"
              >
                {dealer.displayName}
              </Link>
              <div className="text-caption text-muted-readable tabular-nums">
                {dealer.dealerCode}
                {dealer.dicCode === null ? "" : ` · DIC ${dealer.dicCode}`}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              {visibleColumns.has("type") ? (
                <Badge
                  variant={
                    dealer.dealerType === "DEALER" ? "info" : "secondary"
                  }
                >
                  {dealer.dealerType === "DEALER" ? "Dealer" : "Sub-dealer"}
                </Badge>
              ) : null}
              {visibleColumns.has("status") ? (
                <Badge variant={dealer.isActive ? "success" : "secondary"}>
                  {dealer.isActive ? "Active" : "Inactive"}
                </Badge>
              ) : null}
            </div>
          </div>

          <dl className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">
            {visibleColumns.has("contact") ? (
              <MobileField
                label="Primary staff"
                value={dealer.primaryEmail ?? dealer.primaryEmailMasked}
                helper={dealer.primaryPhone ?? dealer.primaryPhoneMasked}
                tabular
              />
            ) : null}
            {visibleColumns.has("location") ? (
              <MobileField
                label="Location"
                value={dealer.city ?? "—"}
                helper={
                  [dealer.district, dealer.state].filter(Boolean).join(", ") ||
                  "—"
                }
              />
            ) : null}
            {visibleColumns.has("tax") ? (
              <MobileField
                label="GSTIN / Place of supply"
                value={dealer.gstinMasked ?? "—"}
                helper={dealer.placeOfSupply ?? "Not configured"}
                tabular
              />
            ) : null}
            {visibleColumns.has("wallet") ? (
              <MobileField
                label="Wallet"
                value={
                  dealer.walletBalance === null
                    ? "—"
                    : `${dealer.walletBalance.currency} ${money.format(
                        Number(dealer.walletBalance.availableBalance),
                      )}`
                }
                {...(dealer.walletBalance === null
                  ? {}
                  : {
                      helper: `${String(dealer.walletBalance.walletCount)} wallet${
                        dealer.walletBalance.walletCount === 1 ? "" : "s"
                      }`,
                    })}
                numeric
              />
            ) : null}
            {visibleColumns.has("source") ? (
              <div>
                <dt className="text-caption text-muted-readable">Source</dt>
                <dd className="mt-1">
                  <Badge variant={sourceVariant(dealer.source.code)}>
                    {sourceLabel(dealer.source.name, dealer.source.code)}
                  </Badge>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </article>
  );
}

function MobileField({
  label,
  value,
  helper,
  numeric = false,
  tabular = false,
}: Readonly<{
  label: string;
  value: string;
  helper?: string;
  numeric?: boolean;
  tabular?: boolean;
}>): React.ReactElement {
  return (
    <div className={cn(numeric && "text-end")}>
      <dt className="text-caption text-muted-readable">{label}</dt>
      <dd
        className={cn(
          "mt-1 break-words text-body-sm font-medium",
          (tabular || numeric) && "tabular-nums",
        )}
      >
        {value}
      </dd>
      {helper === undefined ? null : (
        <dd className="break-words text-caption text-muted-readable">
          {helper}
        </dd>
      )}
    </div>
  );
}

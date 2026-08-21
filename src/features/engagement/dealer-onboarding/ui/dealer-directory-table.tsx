// oz-next-app/src/features/engagement/dealer-onboarding/ui/dealer-directory-table.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, SlidersHorizontal, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DEALER_ONBOARDING_TYPES,
  type DealerDirectoryPage,
  type DealerDirectorySearchParams,
} from "@/features/engagement/dealer-onboarding/contracts/dealer-onboarding.schema";
import type { ResolvedDealerAdministrationAccess } from "@/features/engagement/dealer-onboarding/policies/dealer-onboarding.policy";
import {
  dealerDetailHref,
  dealerDirectoryHref,
  dealerOnboardingHref,
} from "@/features/engagement/dealer-onboarding/utils/dealer-onboarding-url";

const money = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function sourceVariant(
  code: string,
): React.ComponentProps<typeof Badge>["variant"] {
  const normalized = code.toUpperCase();
  if (
    normalized.includes("META") ||
    normalized.includes("FACEBOOK") ||
    normalized.includes("INSTAGRAM")
  )
    return "info";
  if (normalized.includes("WEBSITE") || normalized.includes("WEB"))
    return "success";
  if (normalized.includes("REFERRAL")) return "warning";
  if (normalized.includes("ERP_DIRECT") || normalized.includes("DIRECT"))
    return "secondary";
  return "outline";
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
  const [search, setSearch] = React.useState(query.q ?? "");

  const navigate = React.useCallback(
    (
      patch: Readonly<{
        q?: string | null;
        dealerType?: "DEALER" | "SUB_DEALER" | null;
        active?: "true" | "false" | null;
        cursor?: string | null;
      }>,
    ) => {
      const nextQ = Object.hasOwn(patch, "q") ? patch.q : query.q;
      const nextDealerType = Object.hasOwn(patch, "dealerType")
        ? patch.dealerType
        : query.dealerType;
      const nextActive = Object.hasOwn(patch, "active")
        ? patch.active
        : query.active;
      const nextCursor = Object.hasOwn(patch, "cursor")
        ? patch.cursor
        : query.cursor;
      router.push(
        dealerDirectoryHref({
          ...(nextQ === undefined || nextQ === null || nextQ.trim() === ""
            ? {}
            : { q: nextQ }),
          ...(nextDealerType === undefined || nextDealerType === null
            ? {}
            : { dealerType: nextDealerType }),
          ...(nextActive === undefined || nextActive === null
            ? {}
            : { active: nextActive }),
          ...(nextCursor === undefined || nextCursor === null
            ? {}
            : { cursor: nextCursor }),
        }),
      );
    },
    [query.active, query.cursor, query.dealerType, query.q, router],
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border/70 bg-card">
      <header className="flex flex-col gap-4 border-b border-border/70 p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-page-title">Dealers</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-muted-readable">
            Manage dealers and sub-dealers, contact and tax information,
            locations, wallets, welfare activity, and supporting documents.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            <SelectTrigger className="w-[11rem]">
              <SlidersHorizontal aria-hidden="true" />
              <SelectValue placeholder="Dealer type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All dealer types</SelectItem>
              <SelectItem value="DEALER">Dealers</SelectItem>
              <SelectItem value="SUB_DEALER">Sub-dealers</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={query.active ?? "ALL"}
            onValueChange={(value) => {
              navigate({
                active: value === "true" || value === "false" ? value : null,
                cursor: null,
              });
            }}
          >
            <SelectTrigger className="w-[9.5rem]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {access.capabilities.canOnboard ? (
            <Button asChild>
              <Link href={dealerOnboardingHref()}>
                <Plus aria-hidden="true" className="size-4" />
                Onboard Dealer
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-3">
        <form
          className="relative w-full max-w-md"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({
              q: search.trim() === "" ? null : search.trim(),
              cursor: null,
            });
          }}
        >
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-readable"
          />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
            className="pl-9"
            placeholder="Search name, code, GSTIN, email, phone or location"
            aria-label="Search dealers"
          />
        </form>
        <span className="text-caption text-muted-readable">
          Up to {data.pagination.limit.toLocaleString("en-IN")} dealers per page
        </span>
      </div>

      <div className="min-h-[30rem] flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dealer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>GSTIN / Place of Supply</TableHead>
              <TableHead className="text-right">Wallet Balance</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-44 text-center">
                  <div className="font-medium">No dealers match this view</div>
                  <div className="mt-1 text-body-sm text-muted-readable">
                    Adjust the filters or onboard a new dealer.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((dealer) => (
                <TableRow key={dealer.dealerOrgUnitId}>
                  <TableCell>
                    <Link
                      href={dealerDetailHref(dealer.dealerOrgUnitId)}
                      className="block min-w-44 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                    >
                      <div className="font-medium text-foreground hover:underline hover:underline-offset-4">
                        {dealer.displayName}
                      </div>
                      <div className="text-caption text-muted-readable">
                        {dealer.dealerCode}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        dealer.dealerType === "DEALER" ? "info" : "secondary"
                      }
                    >
                      {dealer.dealerType === "DEALER" ? "Dealer" : "Sub-dealer"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {dealer.primaryEmail ?? dealer.primaryEmailMasked}
                    </div>
                    <div className="text-caption text-muted-readable">
                      {dealer.primaryPhone ?? dealer.primaryPhoneMasked}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{dealer.city ?? "—"}</div>
                    <div className="text-caption text-muted-readable">
                      {[dealer.district, dealer.state]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium tabular-nums">
                      {dealer.gstinMasked ?? "—"}
                    </div>
                    <div className="text-caption text-muted-readable">
                      {dealer.placeOfSupply ?? "Place of supply not configured"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {dealer.walletBalance === null ? (
                      <span className="text-muted-readable">—</span>
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        <WalletCards
                          aria-hidden="true"
                          className="size-4 text-muted-readable"
                        />
                        <div>
                          <div className="font-medium tabular-nums">
                            {dealer.walletBalance.currency}{" "}
                            {money.format(
                              Number(dealer.walletBalance.availableBalance),
                            )}
                          </div>
                          <div className="text-caption text-muted-readable">
                            {dealer.walletBalance.walletCount} wallet
                            {dealer.walletBalance.walletCount === 1 ? "" : "s"}
                          </div>
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sourceVariant(dealer.source.code)}>
                      {dealer.source.name}
                    </Badge>
                    {dealer.applicationNo === null ? null : (
                      <div className="mt-1 text-caption text-muted-readable">
                        {dealer.applicationNo}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={dealer.isActive ? "success" : "secondary"}>
                      {dealer.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-border/70 px-5 py-3">
        <span className="text-caption text-muted-readable">
          Tenant-scoped, uncached operational data.
        </span>
        <div className="flex gap-2">
          {query.cursor !== undefined ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                router.push(
                  dealerDirectoryHref({
                    ...(query.q === undefined ? {} : { q: query.q }),
                    ...(query.dealerType === undefined
                      ? {}
                      : { dealerType: query.dealerType }),
                    ...(query.active === undefined
                      ? {}
                      : { active: query.active }),
                  }),
                );
              }}
            >
              First page
            </Button>
          ) : null}
          {data.pagination.hasMore && data.pagination.nextCursor !== null ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                navigate({ cursor: data.pagination.nextCursor });
              }}
            >
              Next
            </Button>
          ) : null}
        </div>
      </footer>
    </section>
  );
}

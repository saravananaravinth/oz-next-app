import type * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { Building2, ChevronRight, UserRoundPlus } from "lucide-react";

import {
  ContentDataSurface,
  ContentEmptyState,
  ContentRoot,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ResolvedDealershipApplicationAccess } from "@/features/engagement/dealership-application-operations/policies/dealership-application.policy";
import type {
  DealerOperationPage,
  DealerOperationsSearchParams,
} from "@/features/engagement/dealer-operations/contracts/dealer-operations.schema";
import {
  DEALER_OPERATIONS_ROUTES,
  dealerOperationDetailHref,
} from "@/features/engagement/dealer-operations/utils/dealer-operations-url";

export type DealerListPageProps = Readonly<{
  access: ResolvedDealershipApplicationAccess;
  query: DealerOperationsSearchParams;
  page: DealerOperationPage;
}>;

export function DealerListPage({
  access,
  query,
  page,
}: DealerListPageProps): React.ReactElement {
  return (
    <ContentRoot
      width="full"
      gutter="none"
      density="compact"
      className="max-w-none gap-4"
    >
      <ContentDataSurface
        title="Dealers and sub-dealers"
        description="Authorized ERP organizations with their administrator coverage, active margins, documents, and current operating status. Use global search to find a dealer by name, code, city, district, or state."
        padded={false}
        scrollable={false}
        actions={
          access.capabilities.canDirectOnboard ? (
            <Button asChild size="sm">
              <Link href={DEALER_OPERATIONS_ROUTES.directOnboarding}>
                <UserRoundPlus aria-hidden="true" className="size-4" />
                Direct onboarding
              </Link>
            </Button>
          ) : undefined
        }
        toolbar={<DealerListFilterBar query={query} />}
        footer={
          page.pagination.hasMore && page.pagination.nextCursor !== null ? (
            <div className="flex justify-end">
              <Button variant="outline" asChild>
                <Link href={dealerListHref(query, page.pagination.nextCursor)}>
                  Load next page
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-caption text-muted-readable">
              Showing {String(page.items.length)} authorized dealer organization
              {page.items.length === 1 ? "" : "s"}.
            </p>
          )
        }
      >
        {page.items.length === 0 ? (
          <ContentEmptyState
            icon={<Building2 aria-hidden="true" />}
            title="No dealers match this view"
            description={
              query.q.length > 0
                ? "No authorized dealer or sub-dealer matches the global search. Clear the search or change the type/status filters."
                : "No dealer organizations are available in the active actor scope."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dealer organization</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-end">ERP users</TableHead>
                  <TableHead className="text-end">Margins</TableHead>
                  <TableHead className="text-end">Documents</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16">
                    <span className="sr-only">Open</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((dealer) => (
                  <TableRow key={dealer.dealerOrgUnitId}>
                    <TableCell className="min-w-72">
                      <div className="grid gap-1">
                        <Link
                          href={dealerOperationDetailHref(
                            dealer.dealerOrgUnitId,
                          )}
                          className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
                        >
                          {dealer.name}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 text-caption text-muted-readable">
                          <span className="text-tabular">{dealer.code}</span>
                          <Badge variant="outline">
                            {dealer.orgUnitType === "SUB_DEALER"
                              ? "Sub-dealer"
                              : "Dealer"}
                          </Badge>
                          {dealer.parentName === null ? null : (
                            <span>Parent: {dealer.parentName}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-56 text-body-sm">
                      {[
                        dealer.location.city,
                        dealer.location.district,
                        dealer.location.state,
                      ]
                        .filter(
                          (value): value is string =>
                            value !== null && value.length > 0,
                        )
                        .join(", ") || "Not configured"}
                    </TableCell>
                    <TableCell className="text-end text-tabular">
                      {dealer.administratorCount}
                    </TableCell>
                    <TableCell className="text-end text-tabular">
                      {dealer.activeMarginCount}
                    </TableCell>
                    <TableCell className="text-end text-tabular">
                      {dealer.documentCount}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={dealer.isActive ? "default" : "secondary"}
                      >
                        {dealer.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link
                          href={dealerOperationDetailHref(
                            dealer.dealerOrgUnitId,
                          )}
                          aria-label={`Open ${dealer.name}`}
                        >
                          <ChevronRight aria-hidden="true" className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ContentDataSurface>
    </ContentRoot>
  );
}

function DealerListFilterBar({
  query,
}: Readonly<{ query: DealerOperationsSearchParams }>): React.ReactElement {
  const items = [
    { label: "All", orgUnitType: undefined, active: undefined },
    { label: "Dealers", orgUnitType: "DEALER" as const, active: query.active },
    {
      label: "Sub-dealers",
      orgUnitType: "SUB_DEALER" as const,
      active: query.active,
    },
    {
      label: "Active",
      orgUnitType: query.orgUnitType,
      active: "true" as const,
    },
    {
      label: "Inactive",
      orgUnitType: query.orgUnitType,
      active: "false" as const,
    },
  ];
  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {items.map((item) => {
        const active =
          query.orgUnitType === item.orgUnitType &&
          query.active === item.active;
        return (
          <Button
            key={item.label}
            variant={active ? "secondary" : "outline"}
            size="sm"
            asChild
          >
            <Link
              href={dealerListHref(
                {
                  ...query,
                  orgUnitType: item.orgUnitType,
                  active: item.active,
                },
                null,
              )}
            >
              {item.label}
            </Link>
          </Button>
        );
      })}
      {query.q.length > 0 ? (
        <Badge variant="secondary" className="ms-auto">
          Global search: {query.q}
        </Badge>
      ) : null}
    </div>
  );
}

function dealerListHref(
  query: DealerOperationsSearchParams,
  cursor: string | null,
): Route {
  const params = new URLSearchParams();
  if (query.q.length > 0) params.set("q", query.q);
  if (query.orgUnitType !== undefined)
    params.set("orgUnitType", query.orgUnitType);
  if (query.active !== undefined) params.set("active", query.active);
  if (query.limit !== 40) params.set("limit", String(query.limit));
  if (cursor !== null) params.set("cursor", cursor);
  const suffix = params.toString();
  return suffix.length === 0
    ? DEALER_OPERATIONS_ROUTES.dealers
    : `${DEALER_OPERATIONS_ROUTES.dealers}?${suffix}`;
}

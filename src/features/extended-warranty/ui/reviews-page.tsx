// oz-next-app/src/features/extended-warranty/ui/reviews-page.tsx
import Link from "next/link";
import type { ReactElement } from "react";

import {
  ContentRoot,
  ContentSection,
  ContentStatus,
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
import type { ExtendedWarrantyReviewQueue } from "@/features/extended-warranty/contracts/review.schema";

export type ExtendedWarrantyReviewsPageProps = Readonly<{
  data: ExtendedWarrantyReviewQueue;
  filter: "PENDING" | "HISTORY" | "ALL";
}>;

export function ExtendedWarrantyReviewsPage({
  data,
  filter,
}: ExtendedWarrantyReviewsPageProps): ReactElement {
  return (
    <ContentRoot>
      <ContentSection
        title="Extended Warranty reviews"
        description="Review clean installation evidence before warranty activation. Pending evidence is shown first."
      >
        <div className="flex flex-wrap gap-2">
          {(["PENDING", "HISTORY", "ALL"] as const).map((value) => (
            <Button
              key={value}
              asChild
              variant={filter === value ? "default" : "outline"}
            >
              <Link href={`/extended-warranty/reviews?filter=${value}`}>
                {humanize(value)}
              </Link>
            </Button>
          ))}
        </div>
      </ContentSection>

      <ContentSection
        title="Review queue"
        description={`${String(data.items.length)} records on this page.`}
      >
        {data.items.length === 0 ? (
          <ContentStatus
            title="No review records"
            description={
              filter === "PENDING"
                ? "There is no clean installation evidence waiting for review."
                : "No historical review records match this filter."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer / vehicle</TableHead>
                <TableHead>Kit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.evidenceId}>
                  <TableCell className="font-medium">
                    {item.orderNumber}
                  </TableCell>
                  <TableCell>
                    <div>{item.customerName}</div>
                    <div className="text-muted-foreground text-xs">
                      {maskVin(item.vehicleVin)}
                    </div>
                  </TableCell>
                  <TableCell>{item.kitName}</TableCell>
                  <TableCell>
                    <Badge variant={item.pending ? "secondary" : "outline"}>
                      {item.pending
                        ? "Pending"
                        : humanize(item.decision ?? item.evidenceStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(item.submittedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={{
                          pathname: "/extended-warranty/orders/[orderId]",
                          query: { orderId: item.orderId },
                        }}
                      >
                        Open review
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data.pageInfo.hasNextPage && data.pageInfo.nextCursor !== null ? (
          <div className="mt-4 flex justify-end">
            <Button asChild variant="outline">
              <Link
                href={`/extended-warranty/reviews?filter=${filter}&cursor=${encodeURIComponent(data.pageInfo.nextCursor)}`}
              >
                Next page
              </Link>
            </Button>
          </div>
        ) : null}
      </ContentSection>
    </ContentRoot>
  );
}

function maskVin(value: string | null): string {
  if (value === null || value.length < 6) return "VIN unavailable";
  return `••••••${value.slice(-6)}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./u, (character) => character.toUpperCase());
}

// oz-next-app/src/features/integrations/zoho-inventory/ui/zoho-webhook-receipts-table.tsx
"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Webhook } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ZohoWebhookReceipt } from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";

const WEBHOOK_RECEIPTS_PAGE_SIZE = 10;

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function humanizeToken(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("en-US")
    .replace(/^\p{L}/u, (character) => character.toLocaleUpperCase("en-US"));
}

function eventLabel(receipt: ZohoWebhookReceipt): string {
  if (receipt.eventName !== null && receipt.eventName.trim().length > 0) {
    return humanizeToken(receipt.eventName);
  }

  if (receipt.resourceType === "invoice") {
    return "Invoice notification";
  }

  if (receipt.resourceType === "composite_item") {
    return "Composite item notification";
  }

  if (receipt.resourceType === "item") {
    return "Item notification";
  }

  return "Webhook notification";
}

function resourceLabel(
  resourceType: ZohoWebhookReceipt["resourceType"],
): string {
  if (resourceType === "invoice") return "Invoice";
  if (resourceType === "composite_item") return "Composite item";
  if (resourceType === "item") return "Item";
  return "Resource";
}

function statusVariant(
  status: ZohoWebhookReceipt["status"],
): NonNullable<BadgeProps["variant"]> {
  if (status === "FAILED") return "destructive";
  if (status === "IGNORED") return "warning";
  if (status === "PROCESSED") return "success";
  if (status === "PROCESSING") return "info";
  return "secondary";
}

export function ZohoWebhookReceiptsTable({
  receipts,
}: Readonly<{
  receipts: readonly ZohoWebhookReceipt[];
}>): React.ReactElement | null {
  const pageCount = Math.max(
    1,
    Math.ceil(receipts.length / WEBHOOK_RECEIPTS_PAGE_SIZE),
  );
  const [pageIndex, setPageIndex] = React.useState(0);
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageStart = safePageIndex * WEBHOOK_RECEIPTS_PAGE_SIZE;
  const pageReceipts = receipts.slice(
    pageStart,
    pageStart + WEBHOOK_RECEIPTS_PAGE_SIZE,
  );

  if (receipts.length === 0) return null;

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/65 bg-muted/20 px-4 py-3">
        <div className="min-w-0">
          <h3 className="inline-flex items-center gap-2 text-body-sm font-semibold text-foreground">
            <Webhook aria-hidden="true" className="size-4 text-info" />
            Recent delivery outcomes
          </h3>
          <p className="mt-0.5 text-caption text-muted-readable">
            Provider notifications and their durable processing outcome.
          </p>
        </div>
        <Badge variant="outline">
          {receipts.length.toLocaleString("en-IN")} recent
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Received</TableHead>
            <TableHead>Event / item</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Failure</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageReceipts.map((receipt) => (
            <TableRow key={receipt.receiptId}>
              <TableCell className="text-tabular text-muted-readable">
                {formatDateTime(receipt.receivedAt)}
              </TableCell>
              <TableCell>
                <div className="grid min-w-0 gap-0.5">
                  <span className="font-medium text-foreground">
                    {eventLabel(receipt)}
                  </span>
                  <span className="max-w-[34rem] truncate text-caption text-muted-readable">
                    {resourceLabel(receipt.resourceType)} ·{" "}
                    {receipt.resourceId ??
                      "Provider resource was not identified"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(receipt.status)}>
                  {humanizeToken(receipt.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <code className="text-caption text-muted-readable">
                  {receipt.lastErrorCode ?? "—"}
                </code>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/65 bg-muted/15 px-4 py-2.5">
        <p className="text-caption text-muted-readable">
          Showing {String(pageStart + 1)}–
          {String(Math.min(pageStart + pageReceipts.length, receipts.length))}{" "}
          of {String(receipts.length)} · 10 per page
        </p>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePageIndex === 0}
                onClick={() => {
                  setPageIndex(Math.max(0, safePageIndex - 1));
                }}
              >
                <ChevronLeft aria-hidden="true" />
                Previous
              </Button>
            </PaginationItem>
            <PaginationItem>
              <span className="inline-flex h-8 items-center px-2 text-caption text-tabular text-muted-readable">
                Page {String(safePageIndex + 1)} of {String(pageCount)}
              </span>
            </PaginationItem>
            <PaginationItem>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePageIndex >= pageCount - 1}
                onClick={() => {
                  setPageIndex(Math.min(pageCount - 1, safePageIndex + 1));
                }}
              >
                Next
                <ChevronRight aria-hidden="true" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </section>
  );
}

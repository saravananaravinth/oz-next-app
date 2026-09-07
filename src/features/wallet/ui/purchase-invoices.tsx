// oz-next-app/src/features/wallet/ui/purchase-invoices.tsx
import type { ReactElement } from "react";
import Link from "next/link";
import {
  Download,
  Eye,
  FileSearch,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";

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

import type {
  PurchaseDetail,
  PurchaseInvoice,
  PurchasePage,
} from "../contracts/purchases.schema";
import type { WalletSearchParams } from "../contracts/wallet.schema";
import { purchaseDocumentHref, walletQuery } from "../utils/purchase-links";
import { formatMoney } from "../utils/wallet-money";
import {
  CreditNoteInset,
  CreditNoteMobileList,
  CreditNoteSection,
  CreditNoteTableViewport,
  CreditNoteToolbar,
} from "./credit-note-ui";

export const purchaseMonth = (date: string): string =>
  new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${date}T00:00:00+05:30`));

const invoiceDate = (date: string): string =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${date}T00:00:00+05:30`));

function purchaseTypeLabel(source: PurchaseInvoice["source"]): string {
  return source === "D2D" ? "Dealer-to-dealer" : "Company purchase";
}

function friendlyExclusionReason(reason: string): string {
  const normalized = reason.replaceAll("_", " ").toLowerCase();
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

function InvoiceActions({
  invoice,
  cycleId,
  query,
  canReadDocuments,
}: Readonly<{
  invoice: PurchaseInvoice;
  cycleId: string;
  query: WalletSearchParams;
  canReadDocuments: boolean;
}>): ReactElement {
  const detailQuery = {
    ...walletQuery(query),
    purchaseCycleId: cycleId,
    purchaseInvoiceId: invoice.invoiceId,
    purchaseInvoiceSource: invoice.source,
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button variant="outline" size="sm" asChild>
        <Link
          href={{
            pathname: "/wallet",
            query: detailQuery,
            hash: "purchase-detail",
          }}
        >
          <FileSearch aria-hidden="true" className="size-4" />
          Details
        </Link>
      </Button>
      {canReadDocuments && invoice.pdfAvailable ? (
        <>
          <Button variant="outline" size="sm" asChild>
            <a
              href={purchaseDocumentHref(
                cycleId,
                invoice.source,
                invoice.invoiceId,
                "inline",
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye aria-hidden="true" className="size-4" />
              View PDF<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a
              href={purchaseDocumentHref(
                cycleId,
                invoice.source,
                invoice.invoiceId,
                "attachment",
              )}
              aria-label={`Download invoice ${invoice.invoiceNumber ?? "document"}`}
            >
              <Download aria-hidden="true" className="size-4" />
              <span className="hidden xl:inline">Download</span>
            </a>
          </Button>
        </>
      ) : canReadDocuments ? (
        <Badge variant="outline">PDF unavailable</Badge>
      ) : null}
    </div>
  );
}

function CountExplanation({
  invoice,
}: Readonly<{ invoice: PurchaseInvoice }>): ReactElement | null {
  const explanation = !invoice.sourceAvailable
    ? "Original invoice unavailable; saved earning evidence is retained."
    : invoice.exclusionReason !== null
      ? `${friendlyExclusionReason(invoice.exclusionReason)}${invoice.approvedVehicleCount > 0 ? "; saved cycle evidence retained." : "."}`
      : invoice.approvedVehicleCount === 0
        ? "Not included in this cycle’s recorded earnings."
        : null;

  return explanation === null ? null : (
    <p className="mt-1 text-caption leading-5 text-muted-readable">
      {explanation}
    </p>
  );
}

export function PurchaseTable({
  page,
  query,
  canReadDocuments,
  activity = false,
}: Readonly<{
  page: PurchasePage | null;
  query: WalletSearchParams;
  canReadDocuments: boolean;
  activity?: boolean;
}>): ReactElement {
  if (page === null) {
    return (
      <div className="p-4 sm:p-5">
        <CreditNoteInset className="flex items-start gap-3">
          <ShoppingCart
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-muted-readable"
          />
          <div>
            <p className="font-semibold text-foreground">
              Purchase details are not available
            </p>
            <p className="mt-1 text-caption text-muted-readable">
              Purchase invoice access is required to inspect supporting
              evidence.
            </p>
          </div>
        </CreditNoteInset>
      </div>
    );
  }

  const cycle = page.cycle;
  if (cycle === null) {
    return (
      <div className="p-4 sm:p-5">
        <CreditNoteInset className="text-body-sm text-muted-readable">
          No purchase cycle is selected for this view.
        </CreditNoteInset>
      </div>
    );
  }

  const cursorKey = activity
    ? "creditNotePurchaseActivityCursor"
    : "creditNoteInvoiceCursor";
  const nextQuery = walletQuery(query);
  nextQuery["purchaseCycleId"] = cycle.cycleId;
  const firstQuery = Object.fromEntries(
    Object.entries(nextQuery).filter(([key]) => key !== cursorKey),
  );

  if (page.nextCursor !== null) {
    nextQuery[cursorKey] = page.nextCursor;
  }

  const targetHash = activity
    ? "credit-note-transactions"
    : "purchase-invoices";

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-2 border-b border-border/65 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="text-body-sm font-semibold text-foreground">
            {purchaseMonth(cycle.offerStart)}
          </p>
          <p className="mt-0.5 text-caption text-muted-readable">
            {String(cycle.approvedVehicleCount)} approved ·{" "}
            {formatMoney(cycle.amount, cycle.currency)}{" "}
            {cycle.finalized ? "finalized" : "accruing"}
          </p>
        </div>
        <Badge variant={cycle.finalized ? "success" : "info"}>
          {cycle.reconciledAt !== null
            ? "Evidence synced"
            : "Awaiting evidence"}
        </Badge>
      </div>

      {!page.evidenceConsistent ? (
        <div className="p-4 sm:p-5">
          <CreditNoteInset className="border-warning/30 bg-warning/[0.06]">
            <p className="font-semibold text-warning-foreground">
              Historical evidence needs reconciliation
            </p>
            <p className="mt-1 text-caption text-muted-readable">
              Saved evidence accounts for {String(page.evidenceVehicleCount)}{" "}
              vehicles and {formatMoney(page.evidenceAmount, cycle.currency)}.
              Recorded financial totals remain unchanged.
            </p>
          </CreditNoteInset>
        </div>
      ) : null}

      {page.items.length === 0 ? (
        <div className="grid min-h-44 place-items-center p-5 text-center">
          <div className="max-w-md">
            <span className="mx-auto grid size-11 place-items-center rounded-2xl border border-border/65 bg-muted/35 text-muted-readable">
              <ShoppingCart aria-hidden="true" className="size-5" />
            </span>
            <p className="mt-3 font-semibold text-foreground">
              No purchases match this view
            </p>
            <p className="mt-1 text-caption text-muted-readable">
              Choose another month or adjust the purchase filters.
            </p>
          </div>
        </div>
      ) : (
        <>
          <CreditNoteMobileList>
            {page.items.map((invoice) => (
              <article
                key={`${invoice.source}:${invoice.invoiceId}`}
                className="grid gap-3 rounded-2xl border border-border/65 bg-background/45 p-4 shadow-xs transition-[transform,border-color,box-shadow] duration-300 ease-enterprise hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-sm motion-reduce:transform-none motion-reduce:transition-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {invoice.invoiceNumber ?? "Invoice reference unavailable"}
                    </p>
                    <p className="mt-0.5 text-caption text-muted-readable">
                      {invoiceDate(invoice.invoiceDate)} ·{" "}
                      {invoice.seller ?? "Seller unavailable"}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {invoice.status ?? "Unavailable"}
                  </Badge>
                </div>

                <dl className="grid grid-cols-2 gap-2 text-caption">
                  <div className="rounded-xl bg-muted/35 p-2.5">
                    <dt className="text-muted-readable">Approved / total</dt>
                    <dd className="mt-0.5 font-semibold text-foreground text-tabular">
                      {String(invoice.approvedVehicleCount)} /{" "}
                      {invoice.vehicleCount === null
                        ? "—"
                        : String(invoice.vehicleCount)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-muted/35 p-2.5 text-right">
                    <dt className="text-muted-readable">Credit contribution</dt>
                    <dd className="mt-0.5 font-semibold text-foreground text-tabular">
                      {formatMoney(invoice.contribution, cycle.currency)}
                    </dd>
                  </div>
                  <div className="col-span-2 rounded-xl bg-muted/35 p-2.5">
                    <dt className="text-muted-readable">Invoice total</dt>
                    <dd className="mt-0.5 font-medium text-foreground text-tabular">
                      {invoice.total === null
                        ? "Unavailable"
                        : formatMoney(invoice.total, invoice.currency)}
                    </dd>
                  </div>
                </dl>
                <CountExplanation invoice={invoice} />
                <InvoiceActions
                  invoice={invoice}
                  cycleId={cycle.cycleId}
                  query={query}
                  canReadDocuments={canReadDocuments}
                />
              </article>
            ))}
          </CreditNoteMobileList>

          <CreditNoteTableViewport>
            <Table className="min-w-[78rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Approved / total</TableHead>
                  <TableHead className="text-right">Invoice total</TableHead>
                  <TableHead className="text-right">
                    Credit contribution
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((invoice) => (
                  <TableRow key={`${invoice.source}:${invoice.invoiceId}`}>
                    <TableCell>
                      <p className="font-medium text-foreground">
                        {invoice.invoiceNumber ??
                          "Invoice reference unavailable"}
                      </p>
                      <p className="mt-0.5 text-caption text-muted-readable">
                        {invoiceDate(invoice.invoiceDate)}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-64">
                      <p
                        className="truncate"
                        title={invoice.seller ?? undefined}
                      >
                        {invoice.seller ?? "Seller unavailable"}
                      </p>
                      <p className="mt-0.5 text-caption text-muted-readable">
                        {purchaseTypeLabel(invoice.source)}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-72 text-center">
                      <Badge variant="outline">
                        {invoice.status ?? "Unavailable"}
                      </Badge>
                      <CountExplanation invoice={invoice} />
                    </TableCell>
                    <TableCell className="text-right text-tabular">
                      {String(invoice.approvedVehicleCount)} /{" "}
                      {invoice.vehicleCount === null
                        ? "—"
                        : String(invoice.vehicleCount)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-tabular">
                      {invoice.total === null
                        ? "Unavailable"
                        : formatMoney(invoice.total, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-semibold text-tabular">
                      {formatMoney(invoice.contribution, cycle.currency)}
                    </TableCell>
                    <TableCell>
                      <InvoiceActions
                        invoice={invoice}
                        cycleId={cycle.cycleId}
                        query={query}
                        canReadDocuments={canReadDocuments}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CreditNoteTableViewport>
        </>
      )}

      <div className="flex flex-col gap-2 border-t border-border/65 bg-muted/20 px-4 py-3 text-caption text-muted-readable sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span>
          {String(page.items.length)} invoice
          {page.items.length === 1 ? "" : "s"} shown
        </span>
        <div className="flex items-center gap-2">
          {query[cursorKey] !== undefined ? (
            <Button variant="ghost" size="sm" asChild>
              <Link
                href={{
                  pathname: "/wallet",
                  query: firstQuery,
                  hash: targetHash,
                }}
                scroll={false}
              >
                First page
              </Link>
            </Button>
          ) : null}
          {page.nextCursor !== null ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={{
                  pathname: "/wallet",
                  query: nextQuery,
                  hash: targetHash,
                }}
                scroll={false}
              >
                Next page
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function PurchaseInvoices({
  page,
  query,
  canReadDocuments,
}: Readonly<{
  page: PurchasePage | null;
  query: WalletSearchParams;
  canReadDocuments: boolean;
}>): ReactElement {
  const selectClass =
    "h-9 min-w-36 rounded-xl border border-border/70 bg-background px-3 text-caption text-foreground outline-none transition-[border-color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 motion-reduce:transition-none";

  const filters =
    page === null ? undefined : (
      <form
        key={[
          page.cycle?.cycleId,
          query.purchaseSource,
          query.purchaseApprovedOnly,
        ].join(":")}
        action="/wallet"
      >
        <CreditNoteToolbar>
          <input type="hidden" name="tab" value="credit-note" />
          {query.walletId !== undefined ? (
            <input type="hidden" name="walletId" value={query.walletId} />
          ) : null}
          {query.creditNoteActivityTab !== undefined ? (
            <input
              type="hidden"
              name="creditNoteActivityTab"
              value={query.creditNoteActivityTab}
            />
          ) : null}
          <label className="grid gap-1 text-caption text-muted-readable">
            Purchase month
            <select
              name="purchaseCycleId"
              defaultValue={page.cycle?.cycleId ?? ""}
              className={selectClass}
            >
              <option value="">Active offer</option>
              {page.cycles.map((cycle) => (
                <option key={cycle.cycleId} value={cycle.cycleId}>
                  {purchaseMonth(cycle.offerStart)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-caption text-muted-readable">
            Purchase type
            <select
              name="purchaseSource"
              defaultValue={query.purchaseSource ?? ""}
              className={selectClass}
            >
              <option value="">All purchases</option>
              <option value="ZOHO">Company purchase</option>
              <option value="D2D">Dealer-to-dealer</option>
            </select>
          </label>
          <label className="grid gap-1 text-caption text-muted-readable">
            Evidence
            <select
              name="purchaseApprovedOnly"
              defaultValue={query.purchaseApprovedOnly ?? "false"}
              className={selectClass}
            >
              <option value="false">All evidence</option>
              <option value="true">Approved only</option>
            </select>
          </label>
          <Button type="submit" size="sm" className="h-9 rounded-xl px-4">
            Apply filters
          </Button>
        </CreditNoteToolbar>
      </form>
    );

  return (
    <CreditNoteSection
      id="purchase-invoices"
      title="Purchase invoices"
      description="Purchase invoices with the saved vehicle evidence behind your Credit Note earnings."
      icon={<ShoppingCart aria-hidden="true" />}
      actions={filters}
      padded={false}
    >
      <PurchaseTable
        page={page}
        query={query}
        canReadDocuments={canReadDocuments}
      />
    </CreditNoteSection>
  );
}

export function PurchaseEvidenceDetail({
  detail,
  canReadDocuments,
  query,
}: Readonly<{
  detail: PurchaseDetail | null;
  canReadDocuments: boolean;
  query: WalletSearchParams;
}>): ReactElement | null {
  if (detail === null) {
    return null;
  }

  return (
    <CreditNoteSection
      id="purchase-detail"
      title={`Purchase details · ${detail.invoice.invoiceNumber ?? "Saved invoice"}`}
      description={`${purchaseTypeLabel(detail.invoice.source)} · ${purchaseMonth(detail.cycle.offerStart)} purchase month`}
      icon={<ReceiptText aria-hidden="true" />}
      actions={
        <InvoiceActions
          invoice={detail.invoice}
          cycleId={detail.cycle.cycleId}
          query={query}
          canReadDocuments={canReadDocuments}
        />
      }
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2 text-caption text-muted-readable">
          <span>{detail.invoice.seller ?? "Seller unavailable"}</span>
          <span aria-hidden="true">•</span>
          <span>{invoiceDate(detail.invoice.invoiceDate)}</span>
          <span aria-hidden="true">•</span>
          <Badge variant="outline">
            {detail.invoice.status ?? "Status unavailable"}
          </Badge>
        </div>
        <CountExplanation invoice={detail.invoice} />

        {detail.vehicles.length === 0 ? (
          <CreditNoteInset className="text-body-sm text-muted-readable">
            No vehicles from this invoice are included in this cycle’s recorded
            earnings.
          </CreditNoteInset>
        ) : (
          <>
            <CreditNoteMobileList className="p-0">
              {detail.vehicles.map((vehicle, index) => (
                <article
                  key={`${vehicle.vin ?? "missing"}:${String(index)}`}
                  className="grid gap-2 rounded-2xl border border-border/65 bg-background/45 p-3.5"
                >
                  <p className="break-all font-mono text-body-sm text-foreground">
                    {vehicle.vin ?? "VIN unavailable in saved evidence"}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant={vehicle.finalized ? "success" : "info"}>
                      {vehicle.finalized ? "Finalized" : "Accruing"}
                    </Badge>
                    <span className="font-semibold text-foreground text-tabular">
                      {formatMoney(vehicle.contribution, detail.cycle.currency)}
                    </span>
                  </div>
                </article>
              ))}
            </CreditNoteMobileList>
            <CreditNoteTableViewport>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Approved VIN</TableHead>
                    <TableHead className="text-center">
                      Evidence state
                    </TableHead>
                    <TableHead className="text-right">
                      Credit contribution
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.vehicles.map((vehicle, index) => (
                    <TableRow
                      key={`${vehicle.vin ?? "missing"}:${String(index)}`}
                    >
                      <TableCell className="font-mono">
                        {vehicle.vin ?? "VIN unavailable in saved evidence"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={vehicle.finalized ? "success" : "info"}>
                          {vehicle.finalized ? "Finalized" : "Accruing"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-tabular">
                        {formatMoney(
                          vehicle.contribution,
                          detail.cycle.currency,
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CreditNoteTableViewport>
          </>
        )}

        <p className="text-caption text-muted-readable">
          Counts and credit contribution use saved cycle evidence. Finalized
          evidence remains authoritative for the recorded earning.
        </p>
      </div>
    </CreditNoteSection>
  );
}

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import {
  ContentDataSurface,
  ContentEmptyState,
  ContentStatus,
} from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatMoney } from "../utils/wallet-money";
import { purchaseDocumentHref, walletQuery } from "../utils/purchase-links";

export const purchaseMonth = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${date}T00:00:00+05:30`));
const invoiceDate = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${date}T00:00:00+05:30`));
const sourceLabel = (source: PurchaseInvoice["source"]) =>
  source === "D2D" ? "Dealer-to-dealer" : "Zoho";

function InvoiceActions({
  invoice,
  cycleId,
  query,
  canReadDocuments,
}: {
  invoice: PurchaseInvoice;
  cycleId: string;
  query: WalletSearchParams;
  canReadDocuments: boolean;
}) {
  const detailQuery = {
    ...walletQuery(query),
    purchaseCycleId: cycleId,
    purchaseInvoiceId: invoice.invoiceId,
    purchaseInvoiceSource: invoice.source,
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link
          href={{
            pathname: "/wallet",
            query: detailQuery,
            hash: "purchase-detail",
          }}
        >
          Details
        </Link>
      </Button>
      {canReadDocuments ? (
        invoice.pdfAvailable ? (
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
              >
                Download
              </a>
            </Button>
          </>
        ) : (
          <span className="self-center text-sm text-muted-foreground">
            PDF unavailable
          </span>
        )
      ) : null}
    </div>
  );
}

function CountExplanation({ invoice }: { invoice: PurchaseInvoice }) {
  return (
    <div className="text-xs text-muted-foreground">
      {!invoice.sourceAvailable
        ? "Original invoice unavailable; saved earning evidence is shown."
        : invoice.exclusionReason
          ? `${invoice.exclusionReason.replaceAll("_", " ").toLowerCase()}${invoice.approvedVehicleCount > 0 ? "; saved cycle evidence retained" : ""}`
          : invoice.approvedVehicleCount === 0
            ? "Not included in this cycle’s recorded earnings. Qualification, VIN eligibility and reconciliation determine the approved count."
            : null}
    </div>
  );
}

export function PurchaseTable({
  page,
  query,
  canReadDocuments,
  activity = false,
}: {
  page: PurchasePage | null;
  query: WalletSearchParams;
  canReadDocuments: boolean;
  activity?: boolean;
}) {
  if (page === null)
    return (
      <ContentStatus
        variant="default"
        icon={<ShoppingCart aria-hidden="true" />}
        title="Purchase details are not available"
        description="Your account needs purchase invoice access to view supporting invoices."
      />
    );
  const cycle = page.cycle;
  if (cycle === null)
    return (
      <ContentEmptyState
        icon={<ShoppingCart aria-hidden="true" />}
        title="No purchase cycle selected"
        description="Select a historical purchase month above when the current offer is not yet available."
      />
    );
  const cursorKey = activity
    ? "creditNotePurchaseActivityCursor"
    : "creditNoteInvoiceCursor";
  const next = walletQuery(query);
  next["purchaseCycleId"] = cycle.cycleId;
  const first = Object.fromEntries(
    Object.entries(next).filter(([key]) => key !== cursorKey),
  );
  if (page.nextCursor) next[cursorKey] = page.nextCursor;
  return (
    <div className="min-w-0">
      <div className="border-b px-4 py-3 text-sm text-muted-foreground">
        {purchaseMonth(cycle.offerStart)} · {cycle.approvedVehicleCount}{" "}
        approved vehicles · {formatMoney(cycle.amount, cycle.currency)}{" "}
        {cycle.finalized ? "finalized" : "accruing"}
        <p className="mt-1 text-xs">
          {cycle.reconciledAt
            ? `Evidence updated ${new Date(cycle.reconciledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`
            : "Purchase evidence has not been reconciled yet."}
        </p>
      </div>
      {!page.evidenceConsistent ? (
        <div
          role="status"
          className="m-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
        >
          The recorded earning total does not match the available saved
          evidence. Saved evidence currently accounts for{" "}
          {page.evidenceVehicleCount} vehicles and{" "}
          {formatMoney(page.evidenceAmount, cycle.currency)}. Contact support to
          reconcile this cycle; the recorded vehicle count and financial amount
          have not been changed.
        </div>
      ) : null}
      {page.items.length === 0 ? (
        <div className="p-4">
          <ContentEmptyState
            icon={<ShoppingCart aria-hidden="true" />}
            title="No purchases match this view"
            description="Try another purchase month or clear the filters. Only purchases included in recorded cycle earnings appear as approved."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 p-3 md:hidden">
            {page.items.map((invoice) => (
              <article
                key={`${invoice.source}:${invoice.invoiceId}`}
                className="grid gap-3 rounded-lg border p-4"
              >
                <div>
                  <Badge variant="outline">{sourceLabel(invoice.source)}</Badge>
                  <h3 className="mt-2 font-semibold">
                    {invoice.invoiceNumber ?? "Invoice reference unavailable"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Source reference: {invoice.sourceInvoiceIdentifier}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {invoiceDate(invoice.invoiceDate)} ·{" "}
                    {invoice.seller ?? "Seller unavailable"}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt>Status</dt>
                    <dd>{invoice.status ?? "Unavailable"}</dd>
                  </div>
                  <div>
                    <dt>Approved / total vehicles</dt>
                    <dd>
                      {invoice.approvedVehicleCount} /{" "}
                      {invoice.vehicleCount ?? "Unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt>Invoice total</dt>
                    <dd>
                      {invoice.total === null
                        ? "Unavailable"
                        : formatMoney(invoice.total, invoice.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt>Credit contribution</dt>
                    <dd className="font-semibold">
                      {formatMoney(invoice.contribution, cycle.currency)}
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
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Seller / source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    Approved / total vehicles
                  </TableHead>
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
                      <p className="font-medium">
                        {invoice.invoiceNumber ??
                          "Invoice reference unavailable"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoiceDate(invoice.invoiceDate)}
                      </p>
                      <p
                        className="max-w-56 truncate text-xs text-muted-foreground"
                        title={invoice.sourceInvoiceIdentifier}
                      >
                        Source reference: {invoice.sourceInvoiceIdentifier}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p>{invoice.seller ?? "Seller unavailable"}</p>
                      <Badge variant="outline">
                        {sourceLabel(invoice.source)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-64">
                      <p>{invoice.status ?? "Unavailable"}</p>
                      <CountExplanation invoice={invoice} />
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.approvedVehicleCount} /{" "}
                      {invoice.vehicleCount ?? "Unavailable"}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {invoice.total === null
                        ? "Unavailable"
                        : formatMoney(invoice.total, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-semibold">
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
          </div>
        </>
      )}
      <div className="flex items-center justify-between border-t p-3 text-sm">
        <span>{page.items.length} invoices shown</span>
        <div className="flex gap-2">
          {query[cursorKey] ? (
            <Button variant="ghost" size="sm" asChild>
              <Link
                href={{
                  pathname: "/wallet",
                  query: first,
                  hash: activity
                    ? "credit-note-transactions"
                    : "purchase-invoices",
                }}
              >
                First page
              </Link>
            </Button>
          ) : null}
          {page.nextCursor ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={{
                  pathname: "/wallet",
                  query: next,
                  hash: activity
                    ? "credit-note-transactions"
                    : "purchase-invoices",
                }}
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
}: {
  page: PurchasePage | null;
  query: WalletSearchParams;
  canReadDocuments: boolean;
}) {
  const selectClass = "h-10 rounded-md border bg-background px-3 text-sm";
  return (
    <section id="purchase-invoices" className="min-w-0 scroll-mt-6">
      <ContentDataSurface
        title="Purchase invoices"
        description="Zoho and dealer-to-dealer purchases, with the saved vehicle evidence behind your earnings."
        padded={false}
      >
        {page ? (
          <form
            key={[
              page.cycle?.cycleId,
              query.purchaseSource,
              query.purchaseApprovedOnly,
            ].join(":")}
            action="/wallet"
            className="flex flex-wrap items-end gap-3 border-b p-4"
          >
            <input type="hidden" name="tab" value="credit-note" />
            {query.walletId ? (
              <input type="hidden" name="walletId" value={query.walletId} />
            ) : null}
            {query.creditNoteActivityTab ? (
              <input
                type="hidden"
                name="creditNoteActivityTab"
                value={query.creditNoteActivityTab}
              />
            ) : null}
            <label className="grid gap-1 text-sm">
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
            <label className="grid gap-1 text-sm">
              Source
              <select
                name="purchaseSource"
                defaultValue={query.purchaseSource ?? ""}
                className={selectClass}
              >
                <option value="">All sources</option>
                <option value="ZOHO">Zoho</option>
                <option value="D2D">Dealer-to-dealer</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Show
              <select
                name="purchaseApprovedOnly"
                defaultValue={query.purchaseApprovedOnly ?? "false"}
                className={selectClass}
              >
                <option value="false">All purchases</option>
                <option value="true">Approved only</option>
              </select>
            </label>
            <Button type="submit">Apply filters</Button>
          </form>
        ) : null}
        <PurchaseTable
          page={page}
          query={query}
          canReadDocuments={canReadDocuments}
        />
      </ContentDataSurface>
    </section>
  );
}

export function PurchaseEvidenceDetail({
  detail,
  canReadDocuments,
  query,
}: {
  detail: PurchaseDetail | null;
  canReadDocuments: boolean;
  query: WalletSearchParams;
}) {
  if (!detail) return null;
  return (
    <section id="purchase-detail" className="scroll-mt-6">
      <ContentDataSurface
        title={`Purchase details · ${detail.invoice.invoiceNumber ?? "Saved invoice"}`}
        description={`${sourceLabel(detail.invoice.source)} · ${purchaseMonth(detail.cycle.offerStart)} purchase month`}
        padded
      >
        <div className="mb-4">
          <InvoiceActions
            invoice={detail.invoice}
            cycleId={detail.cycle.cycleId}
            query={query}
            canReadDocuments={canReadDocuments}
          />
        </div>
        <div className="mb-3 grid gap-1 text-sm text-muted-foreground">
          <p>Source reference: {detail.invoice.sourceInvoiceIdentifier}</p>
          <p>Seller: {detail.invoice.seller ?? "Seller unavailable"}</p>
        </div>
        <CountExplanation invoice={detail.invoice} />
        {detail.vehicles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No vehicles from this invoice are included in this cycle’s recorded
            earnings.
          </p>
        ) : (
          <>
            <div className="grid gap-2 md:hidden">
              {detail.vehicles.map((vehicle, index) => (
                <article
                  key={`${vehicle.vin ?? "missing"}:${String(index)}`}
                  className="grid gap-2 rounded-lg border p-3"
                >
                  <p className="break-all font-mono text-sm">
                    {vehicle.vin ?? "VIN unavailable in saved evidence"}
                  </p>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <Badge variant="outline">
                      {vehicle.finalized ? "Finalized" : "Accruing"}
                    </Badge>
                    <span className="font-semibold text-tabular">
                      {formatMoney(vehicle.contribution, detail.cycle.currency)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Approved VIN</TableHead>
                    <TableHead>Evidence state</TableHead>
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
                      <TableCell>
                        {vehicle.finalized ? "Finalized" : "Accruing"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(
                          vehicle.contribution,
                          detail.cycle.currency,
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Counts and credit contributions use saved cycle evidence. Invoice
          status and invoice total reflect the source document currently
          available.
        </p>
      </ContentDataSurface>
    </section>
  );
}

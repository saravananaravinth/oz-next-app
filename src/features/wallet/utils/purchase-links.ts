import type { WalletSearchParams } from "../contracts/wallet.schema";

export function walletQuery(query: WalletSearchParams): Record<string, string> {
  return Object.fromEntries(
    Object.entries({ ...query, tab: "credit-note" }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

export function purchaseCycleLink(query: WalletSearchParams, cycleId: string) {
  const next = walletQuery(query);
  delete next["creditNoteInvoiceCursor"];
  delete next["creditNotePurchaseActivityCursor"];
  delete next["purchaseInvoiceId"];
  delete next["purchaseInvoiceSource"];
  next["purchaseCycleId"] = cycleId;
  next["purchaseApprovedOnly"] = "true";
  delete next["purchaseSource"];
  return { pathname: "/wallet", query: next, hash: "purchase-invoices" };
}

export function creditNoteActivityLink(
  query: WalletSearchParams,
  tab: "purchases" | "postings",
) {
  const next = walletQuery(query);
  delete next["creditNotePurchaseActivityCursor"];
  delete next["creditNoteTransactionCursor"];
  next["creditNoteActivityTab"] = tab;
  return { pathname: "/wallet", query: next, hash: "credit-note-transactions" };
}

export function purchaseDocumentHref(
  cycleId: string,
  source: "ZOHO" | "D2D",
  invoiceId: string,
  disposition: "inline" | "attachment",
) {
  return `/api/credit-notes/purchases/${source}/${encodeURIComponent(invoiceId)}/document?cycleId=${encodeURIComponent(cycleId)}&disposition=${disposition}`;
}

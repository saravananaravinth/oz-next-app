// oz-next-app/src/features/wallet/server/wallet.server.ts
import "server-only";

import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import {
  CREDIT_NOTE_ENDPOINTS,
  WALLET_ENDPOINTS,
  WELFARE_ENDPOINTS,
} from "@/lib/api/endpoints";

import {
  WALLET_TABLE_PAGE_SIZE,
  creditNoteOverviewSchema,
  creditNotePurchaseInvoicePageSchema,
  walletEntryPageSchema,
  walletPageSchema,
  welfareAccrualPageSchema,
  type WalletSearchParams,
  type WalletSummary,
  type WalletWorkspaceData,
} from "@/features/wallet/contracts/wallet.schema";
import type { WalletCapabilities } from "@/features/wallet/policies/wallet.policy";
import { CT, HTTP_METHODS } from "@/lib/api/http-contract";
import { serverApiClient } from "@/server/api/edge-api-client";

const walletClient = createErpFeatureClient({
  featureName: "wallet",
  basePath: WALLET_ENDPOINTS.base,
});

const welfareClient = createErpFeatureClient({
  featureName: "welfare",
  basePath: WELFARE_ENDPOINTS.base,
});

const creditNoteClient = createErpFeatureClient({
  featureName: "credit-note",
  basePath: CREDIT_NOTE_ENDPOINTS.base,
});

function selectedWelfareWallet(
  wallets: readonly WalletSummary[],
  requestedWalletId: string | undefined,
): WalletSummary | null {
  if (requestedWalletId !== undefined) {
    const requested = wallets.find(
      (wallet) => wallet.walletId === requestedWalletId,
    );

    if (requested !== undefined) {
      return requested;
    }
  }

  return wallets[0] ?? null;
}

export async function readWalletWorkspace(
  input: Readonly<{
    query: WalletSearchParams;
    capabilities: WalletCapabilities;
  }>,
): Promise<WalletWorkspaceData> {
  const walletPage = await walletClient.list(walletPageSchema, { limit: 100 });
  const welfareWallets = walletPage.items.filter(
    (wallet) => wallet.walletType === "WELFARE_FUND",
  );
  const creditNoteWalletCount = walletPage.items.filter(
    (wallet) => wallet.walletType === "CREDIT_NOTE",
  ).length;
  const selectedWallet = selectedWelfareWallet(
    welfareWallets,
    input.query.walletId,
  );

  const entriesPromise =
    selectedWallet !== null && input.capabilities.canReadEntries
      ? walletClient.request({
          path: `/${selectedWallet.walletId}/entries`,
          query: {
            limit: WALLET_TABLE_PAGE_SIZE,
            ...(input.query.entryCursor !== undefined
              ? { cursor: input.query.entryCursor }
              : {}),
          },
          schema: walletEntryPageSchema,
        })
      : Promise.resolve(null);

  const accrualsPromise =
    selectedWallet !== null && input.capabilities.canReadWelfareAccruals
      ? welfareClient.request({
          path: "/v2/accruals",
          query: {
            limit: WALLET_TABLE_PAGE_SIZE,
            ...(input.query.accrualCursor !== undefined
              ? { cursor: input.query.accrualCursor }
              : {}),
            ...(input.query.accrualStatus !== undefined
              ? { status: input.query.accrualStatus }
              : {}),
          },
          schema: welfareAccrualPageSchema,
        })
      : Promise.resolve(null);

  const creditNoteOverviewPromise = input.capabilities.canReadCreditNoteOverview
    ? creditNoteClient.request({
        path: "/overview",
        schema: creditNoteOverviewSchema.nullable(),
      })
    : Promise.resolve(null);

  const creditNotePurchaseInvoicesPromise = input.capabilities
    .canReadCreditNotePurchaseInvoices
    ? creditNoteClient.request({
        path: "/purchase-invoices",
        query: {
          limit: WALLET_TABLE_PAGE_SIZE,
          ...(input.query.creditNoteInvoiceCursor !== undefined
            ? { cursor: input.query.creditNoteInvoiceCursor }
            : {}),
        },
        schema: creditNotePurchaseInvoicePageSchema,
      })
    : Promise.resolve(null);

  const [entries, accruals, creditNoteOverview, creditNotePurchaseInvoices] =
    await Promise.all([
      entriesPromise,
      accrualsPromise,
      creditNoteOverviewPromise,
      creditNotePurchaseInvoicesPromise,
    ]);

  return {
    welfareWallets,
    creditNoteWalletCount,
    selectedWallet,
    entries,
    accruals,
    creditNoteOverview,
    creditNotePurchaseInvoices,
  };
}

export async function readCreditNotePurchaseInvoiceDocumentResponse(
  input: Readonly<{
    invoiceProjectionId: string;
    disposition: "inline" | "attachment";
  }>,
): Promise<Response> {
  const path = `${CREDIT_NOTE_ENDPOINTS.purchaseInvoiceDocument(
    input.invoiceProjectionId,
  )}?disposition=${encodeURIComponent(input.disposition)}`;

  return await serverApiClient.raw(path, {
    method: HTTP_METHODS.GET,
    auth: true,
    refreshOnUnauthorized: true,
    cache: "no-store",
    timeoutMs: 120_000,
    accept: CT.PDF,
  });
}

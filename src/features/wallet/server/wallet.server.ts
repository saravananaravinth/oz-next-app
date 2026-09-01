// oz-next-app/src/features/wallet/server/wallet.server.ts
import "server-only";

import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import { WALLET_ENDPOINTS, WELFARE_ENDPOINTS } from "@/lib/api/endpoints";

import {
  WALLET_TABLE_PAGE_SIZE,
  walletEntryPageSchema,
  walletPageSchema,
  welfareAccrualPageSchema,
  type WalletSearchParams,
  type WalletSummary,
  type WalletWorkspaceData,
} from "@/features/wallet/contracts/wallet.schema";
import type { WalletCapabilities } from "@/features/wallet/policies/wallet.policy";

const walletClient = createErpFeatureClient({
  featureName: "wallet",
  basePath: WALLET_ENDPOINTS.base,
});

const welfareClient = createErpFeatureClient({
  featureName: "welfare",
  basePath: WELFARE_ENDPOINTS.base,
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

  if (selectedWallet === null) {
    return {
      welfareWallets,
      creditNoteWalletCount,
      selectedWallet: null,
      entries: null,
      accruals: null,
    };
  }

  const entriesPromise = input.capabilities.canReadEntries
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

  const accrualsPromise = input.capabilities.canReadWelfareAccruals
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

  const [entries, accruals] = await Promise.all([
    entriesPromise,
    accrualsPromise,
  ]);

  return {
    welfareWallets,
    creditNoteWalletCount,
    selectedWallet,
    entries,
    accruals,
  };
}

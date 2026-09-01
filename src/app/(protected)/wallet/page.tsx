// oz-next-app/src/app/(protected)/wallet/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  parseWalletSearchParams,
  readWalletWorkspace,
  resolveWalletAccess,
  WalletAccessState,
  WalletInvalidQueryState,
  WalletPage,
  WalletRequestFailureState,
  type WalletRawSearchParams,
  type WalletWorkspaceData,
} from "@/features/wallet";
import { isApiHttpError } from "@/lib/api/problem";

const PAGE_TITLE = "Wallet";
const PAGE_DESCRIPTION =
  "Dealer Welfare Fund and Credit Note eligibility, purchase offer, invoice, and settlement workspace.";

type WalletRoutePageProps = Readonly<{
  searchParams: Promise<WalletRawSearchParams>;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
} satisfies Metadata;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export default async function WalletRoutePage({
  searchParams,
}: WalletRoutePageProps): Promise<ReactElement> {
  const [me, rawSearchParams] = await Promise.all([
    requireAuthenticatedMe(),
    searchParams,
  ]);
  const parsedQuery = parseWalletSearchParams(rawSearchParams);

  if (!parsedQuery.success) {
    return <WalletInvalidQueryState issues={parsedQuery.error.issues} />;
  }

  const access = resolveWalletAccess(me);

  if (access.kind === "forbidden") {
    return <WalletAccessState access={access} />;
  }

  let data: WalletWorkspaceData;

  try {
    data = await readWalletWorkspace({
      query: parsedQuery.data,
      capabilities: access.capabilities,
    });
  } catch (error: unknown) {
    if (isApiHttpError(error)) {
      return <WalletRequestFailureState error={error} />;
    }

    throw error;
  }

  return (
    <WalletPage
      data={data}
      query={parsedQuery.data}
      capabilities={access.capabilities}
    />
  );
}

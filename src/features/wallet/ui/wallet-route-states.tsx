// oz-next-app/src/features/wallet/ui/wallet-route-states.tsx
import Link from "next/link";
import type { ReactElement } from "react";
import { CircleAlert, LockKeyhole, RefreshCw, WalletCards } from "lucide-react";
import type { z } from "zod";

import {
  ContentEmptyState,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";
import type { ApiHttpError } from "@/lib/api/problem";

import type { WalletAccess } from "@/features/wallet/policies/wallet.policy";

export function WalletAccessState({
  access,
}: Readonly<{ access: WalletAccess }>): ReactElement {
  return (
    <ContentRoot width="default">
      <ContentEmptyState
        icon={<LockKeyhole aria-hidden="true" />}
        title="Wallet access is unavailable"
        description={
          access.actorKind === "DEALER"
            ? "Your dealer account does not currently have permission to view wallet balances."
            : "This Phase 1 wallet workspace is available only to authenticated dealer and sub-dealer users."
        }
      />
    </ContentRoot>
  );
}

export function WalletInvalidQueryState({
  issues,
}: Readonly<{ issues: readonly z.core.$ZodIssue[] }>): ReactElement {
  return (
    <ContentRoot width="default">
      <ContentStatus
        variant="warning"
        title="Wallet view parameters are invalid"
        description="The wallet link contains an invalid account, filter, or pagination value. Open the wallet again without the invalid parameters."
        icon={<CircleAlert aria-hidden="true" />}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/wallet">Open wallet</Link>
          </Button>
        }
      />
      <p className="sr-only">
        Invalid fields: {issues.map((issue) => issue.path.join(".")).join(", ")}
      </p>
    </ContentRoot>
  );
}

export function WalletRequestFailureState({
  error,
}: Readonly<{ error: ApiHttpError }>): ReactElement {
  const requestReference = error.requestId?.trim();

  return (
    <ContentRoot width="default">
      <ContentStatus
        variant={error.status === 403 ? "warning" : "destructive"}
        title={
          error.status === 403
            ? "Wallet access could not be authorized"
            : "Wallet data could not be loaded"
        }
        description={
          error.status === 403
            ? "Your authenticated dealer scope or wallet permissions do not allow this request."
            : "The wallet service did not complete the request. Retry the page; no wallet data was changed."
        }
        icon={
          error.status === 403 ? (
            <LockKeyhole aria-hidden="true" />
          ) : (
            <WalletCards aria-hidden="true" />
          )
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/wallet">
              <RefreshCw aria-hidden="true" />
              Retry
            </Link>
          </Button>
        }
      />
      {requestReference !== undefined && requestReference.length > 0 ? (
        <p className="text-center text-caption text-muted-readable">
          Request reference: <code>{requestReference}</code>
        </p>
      ) : null}
    </ContentRoot>
  );
}

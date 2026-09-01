// oz-next-app/src/app/(protected)/wallet/error.tsx
"use client";

import Link from "next/link";
import { useTransition, type ReactElement } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { ContentRoot, ContentStatus } from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type WalletErrorProps = Readonly<{
  error: Error & { readonly digest?: string };
  reset: () => void;
}>;

const SAFE_DIGEST_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/u;

function safeDigest(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return SAFE_DIGEST_PATTERN.test(normalized) ? normalized : null;
}

export default function WalletError({
  error,
  reset,
}: WalletErrorProps): ReactElement {
  const [isPending, startTransition] = useTransition();
  const reference = safeDigest(error.digest);

  function retry(): void {
    startTransition(() => {
      reset();
    });
  }

  return (
    <ContentRoot width="default">
      <ContentStatus
        variant="destructive"
        title="Wallet workspace could not be rendered"
        description="Retry the wallet workspace. No wallet balance, Welfare Fund record, Credit Note eligibility, or settlement record was changed by this failure."
        icon={<TriangleAlert aria-hidden="true" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={retry}
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? (
                <Spinner className="size-4" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-4" aria-hidden="true" />
              )}
              {isPending ? "Retrying…" : "Retry"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        }
      />
      {reference !== null ? (
        <p className="text-center text-caption text-muted-readable">
          Reference: <code>{reference}</code>
        </p>
      ) : null}
    </ContentRoot>
  );
}

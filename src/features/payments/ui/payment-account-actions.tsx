// oz-next-app/src/features/payments/ui/payment-account-actions.tsx
"use client";

import * as React from "react";
import { CheckCircle2, LoaderCircle, Power } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { toast } from "@/shared/hooks";

import { updatePaymentAccountAction } from "@/features/payments/actions/payments.actions";
import type { PaymentProviderAccount } from "@/features/payments/contracts/payments.schema";

function failureDescription(
  result: Readonly<{ message: string; requestId?: string }>,
): string {
  return result.requestId === undefined
    ? result.message
    : `${result.message} Reference: ${result.requestId}`;
}

export function PaymentAccountActions({
  account,
}: Readonly<{ account: PaymentProviderAccount }>): React.ReactElement {
  const router = useRouter();
  const [pendingAction, setPendingAction] = React.useState<
    "default" | "status" | null
  >(null);
  const [pending, startTransition] = React.useTransition();

  function run(
    action: "default" | "status",
    input: Readonly<{
      status?: "ACTIVE" | "DISABLED";
      isDefault?: boolean;
    }>,
  ): void {
    setPendingAction(action);
    startTransition(() => {
      void updatePaymentAccountAction({
        providerAccountId: account.providerAccountId,
        rowVersion: account.rowVersion,
        ...input,
      }).then((result) => {
        setPendingAction(null);
        if (!result.ok) {
          toast.error({
            title: "Payment account could not be updated",
            description: failureDescription(result),
            replace: true,
          });
          return;
        }
        toast.success({
          title: "Payment account updated",
          description: "The provider account configuration is now current.",
          replace: true,
        });
        router.refresh();
      });
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {!account.isDefault && account.status === "ACTIVE" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            run("default", { isDefault: true });
          }}
        >
          {pending && pendingAction === "default" ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="size-4" />
          )}
          Make default
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          run("status", {
            status: account.status === "DISABLED" ? "ACTIVE" : "DISABLED",
            ...(account.status === "DISABLED" ? {} : { isDefault: false }),
          });
        }}
      >
        {pending && pendingAction === "status" ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Power aria-hidden="true" className="size-4" />
        )}
        {account.status === "DISABLED" ? "Enable" : "Disable"}
      </Button>
    </div>
  );
}

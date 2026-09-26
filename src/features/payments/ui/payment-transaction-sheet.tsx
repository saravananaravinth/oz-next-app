// oz-next-app/src/features/payments/ui/payment-transaction-sheet.tsx
"use client";

import * as React from "react";
import type { Route } from "next";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/shared/hooks";

import {
  issuePaymentRefundAction,
  refreshPaymentTransactionAction,
} from "@/features/payments/actions/payments.actions";
import type { PaymentTransactionDetail } from "@/features/payments/contracts/payments.schema";
import {
  formatPaymentDateTime,
  formatPaymentLabel,
  formatPaymentMoney,
} from "@/features/payments/utils/payment-format";

const refundFormSchema = z
  .object({
    amount: z
      .string()
      .trim()
      .regex(
        /^\d{1,12}(?:\.\d{1,2})?$/u,
        "Enter a valid amount with up to 2 decimal places.",
      ),
    reasonCode: z.string().trim().max(128),
  })
  .strict();

type RefundForm = z.infer<typeof refundFormSchema>;

function statusVariant(
  status: PaymentTransactionDetail["status"],
): React.ComponentProps<typeof Badge>["variant"] {
  if (["CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(status))
    return "success";
  if (status === "FAILED") return "destructive";
  if (status === "AUTHORIZED") return "warning";
  return "secondary";
}

function majorToMinor(value: string): bigint {
  const [whole = "0", fractional = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fractional.padEnd(2, "0"));
}

function failureDescription(
  result: Readonly<{ message: string; requestId?: string }>,
): string {
  return result.requestId === undefined
    ? result.message
    : `${result.message} Reference: ${result.requestId}`;
}

type SafeDisplayScalar = string | number | boolean | null;

function isSafeDisplayScalar(value: unknown): value is SafeDisplayScalar {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function safeDisplayScalarText(value: SafeDisplayScalar): string {
  if (value === null) return "—";
  if (typeof value === "string") return value;
  return String(value);
}

function DetailRow({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>): React.ReactElement {
  return (
    <div className="grid gap-1 border-b border-border/60 py-3 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium">{children}</dd>
    </div>
  );
}

function RefundDialog({
  transaction,
}: Readonly<{
  transaction: PaymentTransactionDetail;
}>): React.ReactElement | null {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [idempotencyKey, setIdempotencyKey] = React.useState(
    () => `payment-refund:${transaction.chargeId}:${crypto.randomUUID()}`,
  );
  const refundable =
    BigInt(transaction.capturedAmountMinor) -
    BigInt(transaction.refundedAmountMinor);
  const form = useForm<RefundForm>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: {
      amount: (Number(refundable) / 100).toFixed(2),
      reasonCode: "CUSTOMER_REQUEST",
    },
  });

  if (refundable <= 0n || transaction.status === "FAILED") return null;

  function submit(values: RefundForm): void {
    const amountMinor = majorToMinor(values.amount);
    if (amountMinor <= 0n || amountMinor > refundable) {
      form.setError("amount", {
        type: "validate",
        message: `Refund must be between 0.01 and ${formatPaymentMoney(
          transaction.currency,
          refundable.toString(),
        )}.`,
      });
      return;
    }

    startTransition(() => {
      void issuePaymentRefundAction({
        chargeId: transaction.chargeId,
        amountMinor: amountMinor.toString(),
        reasonCode:
          values.reasonCode.trim().length === 0
            ? null
            : values.reasonCode.trim(),
        idempotencyKey,
      }).then((result) => {
        if (!result.ok) {
          toast.error({
            title: "Refund could not be issued",
            description: failureDescription(result),
            replace: true,
          });
          return;
        }
        toast.success({
          title: "Refund submitted",
          description: `Refund ${result.data.refundId} is ${formatPaymentLabel(result.data.status)}.`,
          replace: true,
        });
        setIdempotencyKey(
          `payment-refund:${transaction.chargeId}:${crypto.randomUUID()}`,
        );
        setOpen(false);
        router.refresh();
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <RotateCcw aria-hidden="true" className="size-4" />
          Issue refund
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Issue refund</DialogTitle>
          <DialogDescription>
            This sends a refund request to the configured payment provider. The
            operation is idempotent and cannot be reversed from the ERP after
            the provider accepts it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-border/70 bg-muted/25 p-4 text-sm">
          <div>
            <p className="text-muted-foreground">Captured</p>
            <p className="mt-1 font-semibold">
              {formatPaymentMoney(
                transaction.currency,
                transaction.capturedAmountMinor,
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Refunded</p>
            <p className="mt-1 font-semibold">
              {formatPaymentMoney(
                transaction.currency,
                transaction.refundedAmountMinor,
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Refundable</p>
            <p className="mt-1 font-semibold">
              {formatPaymentMoney(transaction.currency, refundable.toString())}
            </p>
          </div>
        </div>
        <form className="grid gap-4" onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-2">
            <Label htmlFor="refund-amount">Refund amount</Label>
            <Input
              id="refund-amount"
              inputMode="decimal"
              disabled={pending}
              {...form.register("amount")}
            />
            {form.formState.errors.amount?.message === undefined ? null : (
              <p className="text-xs text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="refund-reason">Reason code</Label>
            <Input
              id="refund-reason"
              maxLength={128}
              disabled={pending}
              {...form.register("reasonCode")}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : null}
              {pending ? "Submitting…" : "Issue refund"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentTransactionSheet({
  transaction,
  closeHref,
  canRefund,
  canReconcile,
}: Readonly<{
  transaction: PaymentTransactionDetail;
  closeHref: Route;
  canRefund: boolean;
  canReconcile: boolean;
}>): React.ReactElement {
  const router = useRouter();
  const [refreshing, startRefresh] = React.useTransition();

  function refreshProvider(): void {
    startRefresh(() => {
      void refreshPaymentTransactionAction({
        chargeId: transaction.chargeId,
      }).then((result) => {
        if (!result.ok) {
          toast.error({
            title: "Provider refresh failed",
            description: failureDescription(result),
            replace: true,
          });
          return;
        }
        toast.success({
          title: "Payment refreshed",
          description: "The ERP payment state was reconciled with Razorpay.",
          replace: true,
        });
        router.refresh();
      });
    });
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.replace(closeHref, { scroll: false });
      }}
    >
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-3xl"
      >
        <SheetHeader className="border-b border-border/70 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="grid gap-1">
              <SheetTitle className="flex flex-wrap items-center gap-2">
                {formatPaymentMoney(
                  transaction.currency,
                  transaction.amountMinor,
                )}
                <Badge variant={statusVariant(transaction.status)}>
                  {formatPaymentLabel(transaction.status)}
                </Badge>
              </SheetTitle>
              <SheetDescription>
                {transaction.providerPaymentId} ·{" "}
                {formatPaymentDateTime(transaction.createdAt)}
              </SheetDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {canReconcile ? (
                <Button
                  variant="outline"
                  onClick={refreshProvider}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <RefreshCw aria-hidden="true" className="size-4" />
                  )}
                  Refresh from Razorpay
                </Button>
              ) : null}
              {canRefund ? <RefundDialog transaction={transaction} /> : null}
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-5">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="refunds">
              Refunds ({transaction.refunds.length})
            </TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="gateway">Gateway</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5 grid gap-6">
            <section>
              <h3 className="text-sm font-semibold">Payment</h3>
              <dl className="mt-2">
                <DetailRow label="Payment ID">
                  {transaction.providerPaymentId}
                </DetailRow>
                <DetailRow label="Order ID">
                  {transaction.providerOrderId ?? "—"}
                </DetailRow>
                <DetailRow label="ERP intent">
                  {transaction.paymentIntentId}
                </DetailRow>
                <DetailRow label="Business module">
                  {formatPaymentLabel(transaction.businessModule)}
                </DetailRow>
                <DetailRow label="Business reference">
                  {transaction.businessReferenceId}
                </DetailRow>
                <DetailRow label="Method">
                  {formatPaymentLabel(transaction.method)}
                </DetailRow>
                <DetailRow label="International">
                  {transaction.international === null
                    ? "—"
                    : transaction.international
                      ? "Yes"
                      : "No"}
                </DetailRow>
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-semibold">Amounts</h3>
              <dl className="mt-2">
                <DetailRow label="Authorized amount">
                  {formatPaymentMoney(
                    transaction.currency,
                    transaction.amountMinor,
                  )}
                </DetailRow>
                <DetailRow label="Captured">
                  {formatPaymentMoney(
                    transaction.currency,
                    transaction.capturedAmountMinor,
                  )}
                </DetailRow>
                <DetailRow label="Refunded">
                  {formatPaymentMoney(
                    transaction.currency,
                    transaction.refundedAmountMinor,
                  )}
                </DetailRow>
                <DetailRow label="Gateway fee">
                  {formatPaymentMoney(
                    transaction.currency,
                    transaction.gatewayFeeMinor,
                  )}
                </DetailRow>
                <DetailRow label="Gateway tax">
                  {formatPaymentMoney(
                    transaction.currency,
                    transaction.gatewayTaxMinor,
                  )}
                </DetailRow>
                <DetailRow label="Net captured">
                  {formatPaymentMoney(
                    transaction.currency,
                    transaction.netCapturedMinor,
                  )}
                </DetailRow>
              </dl>
            </section>

            {transaction.failureCode === null &&
            transaction.failureReason === null ? null : (
              <section className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
                <div className="flex items-start gap-3">
                  <TriangleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-5 text-destructive"
                  />
                  <div className="grid gap-1">
                    <h3 className="text-sm font-semibold">Failure details</h3>
                    <p className="text-sm text-muted-foreground">
                      {[transaction.failureCode, transaction.failureReason]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="refunds" className="mt-5">
            {transaction.refunds.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No refunds have been recorded for this payment.
              </div>
            ) : (
              <div className="divide-y rounded-xl border border-border/70">
                {transaction.refunds.map((refund) => (
                  <div
                    key={refund.refundId}
                    className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {refund.providerRefundId ?? refund.refundId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPaymentDateTime(refund.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {formatPaymentMoney(
                          refund.currency,
                          refund.amountMinor,
                        )}
                      </span>
                      <Badge
                        variant={
                          refund.status === "FAILED"
                            ? "destructive"
                            : refund.status === "PROCESSED"
                              ? "success"
                              : "secondary"
                        }
                      >
                        {formatPaymentLabel(refund.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="mt-5">
            {transaction.events.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No payment lifecycle events are recorded.
              </div>
            ) : (
              <ol className="ml-2 border-l border-border/80 pl-6">
                {transaction.events.map((event) => (
                  <li
                    key={event.paymentEventId}
                    className="relative pb-6 last:pb-0"
                  >
                    <span className="absolute -left-[1.72rem] top-1 flex size-5 items-center justify-center rounded-full border bg-background">
                      <CheckCircle2
                        aria-hidden="true"
                        className="size-3 text-emerald-600"
                      />
                    </span>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {formatPaymentLabel(event.eventType)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatPaymentLabel(event.actorKind)}
                          {event.reasonCode === null
                            ? ""
                            : ` · ${formatPaymentLabel(event.reasonCode)}`}
                        </p>
                      </div>
                      <time className="text-xs tabular-nums text-muted-foreground">
                        {formatPaymentDateTime(event.occurredAt)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>

          <TabsContent value="gateway" className="mt-5 grid gap-6">
            <section>
              <h3 className="text-sm font-semibold">Provider verification</h3>
              <dl className="mt-2">
                <DetailRow label="Provider">
                  {formatPaymentLabel(transaction.providerCode)}
                </DetailRow>
                <DetailRow label="Environment">
                  {transaction.environment}
                </DetailRow>
                <DetailRow label="Last verified">
                  {formatPaymentDateTime(transaction.lastVerifiedAt)}
                </DetailRow>
                <DetailRow label="Provider created">
                  {formatPaymentDateTime(transaction.providerCreatedAt)}
                </DetailRow>
                <DetailRow label="Authorized">
                  {formatPaymentDateTime(transaction.authorizedAt)}
                </DetailRow>
                <DetailRow label="Captured">
                  {formatPaymentDateTime(transaction.capturedAt)}
                </DetailRow>
              </dl>
            </section>
            <section>
              <div className="flex items-center gap-2">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-4 text-emerald-600"
                />
                <h3 className="text-sm font-semibold">
                  Safe provider references
                </h3>
              </div>
              <dl className="mt-2">
                {Object.entries(transaction.providerReferenceSafe)
                  .filter((entry): entry is [string, SafeDisplayScalar] =>
                    isSafeDisplayScalar(entry[1]),
                  )
                  .slice(0, 20)
                  .map(([key, value]) => (
                    <DetailRow key={key} label={formatPaymentLabel(key)}>
                      {safeDisplayScalarText(value)}
                    </DetailRow>
                  ))}
              </dl>
            </section>
            <section>
              <div className="flex items-center gap-2">
                <Clock3 aria-hidden="true" className="size-4" />
                <h3 className="text-sm font-semibold">Reconciliation</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {transaction.reconciliationJobs.length === 0
                  ? "No reconciliation jobs are associated with this payment intent."
                  : `${String(transaction.reconciliationJobs.length)} reconciliation job(s) recorded.`}
              </p>
            </section>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

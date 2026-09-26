// oz-next-app/src/features/payments/ui/payment-webhook-sheet.tsx
"use client";

import * as React from "react";
import type { Route } from "next";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import type { PaymentWebhookReceipt } from "@/features/payments/contracts/payments.schema";
import {
  formatPaymentDateTime,
  formatPaymentLabel,
} from "@/features/payments/utils/payment-format";

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

function WebhookDetailRow({
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

export function PaymentWebhookSheet({
  receipt,
  closeHref,
}: Readonly<{
  receipt: PaymentWebhookReceipt;
  closeHref: Route;
}>): React.ReactElement {
  const router = useRouter();
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.replace(closeHref, { scroll: false });
      }}
    >
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl lg:max-w-2xl"
      >
        <SheetHeader className="border-b border-border/70 pb-5">
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {formatPaymentLabel(receipt.eventType)}
            <Badge
              variant={
                receipt.status === "PROCESSED"
                  ? "success"
                  : receipt.status === "TERMINAL_FAILURE"
                    ? "destructive"
                    : "secondary"
              }
            >
              {formatPaymentLabel(receipt.status)}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Received {formatPaymentDateTime(receipt.receivedAt)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid gap-6">
          <section>
            <div className="flex items-center gap-2">
              {receipt.signatureVerified ? (
                <CheckCircle2
                  aria-hidden="true"
                  className="size-4 text-emerald-600"
                />
              ) : (
                <ShieldAlert
                  aria-hidden="true"
                  className="size-4 text-destructive"
                />
              )}
              <h3 className="text-sm font-semibold">Verification</h3>
            </div>
            <dl className="mt-2">
              <WebhookDetailRow label="Receipt ID">
                {receipt.webhookReceiptId}
              </WebhookDetailRow>
              <WebhookDetailRow label="Provider event ID">
                {receipt.providerEventId ?? "—"}
              </WebhookDetailRow>
              <WebhookDetailRow label="Signature">
                {receipt.signatureVerified ? "Verified" : "Not verified"}
              </WebhookDetailRow>
              <WebhookDetailRow label="Resource type">
                {formatPaymentLabel(receipt.resourceType)}
              </WebhookDetailRow>
              <WebhookDetailRow label="Resource ID">
                {receipt.resourceId ?? "—"}
              </WebhookDetailRow>
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Processing</h3>
            <dl className="mt-2">
              <WebhookDetailRow label="Attempts">
                {receipt.attemptCount.toLocaleString("en-IN")}
              </WebhookDetailRow>
              <WebhookDetailRow label="Started">
                {formatPaymentDateTime(receipt.processingStartedAt)}
              </WebhookDetailRow>
              <WebhookDetailRow label="Completed">
                {formatPaymentDateTime(receipt.processedAt)}
              </WebhookDetailRow>
              <WebhookDetailRow label="Error code">
                {receipt.lastErrorCode ?? "—"}
              </WebhookDetailRow>
              <WebhookDetailRow label="Error detail">
                {receipt.lastErrorDetail ?? "—"}
              </WebhookDetailRow>
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Safe payload</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Only the deliberately minimized provider payload retained by the
              ERP is shown here. Raw webhook bodies and signatures are never
              exposed.
            </p>
            <dl className="mt-2">
              {Object.entries(receipt.payloadSafe)
                .filter((entry): entry is [string, SafeDisplayScalar] =>
                  isSafeDisplayScalar(entry[1]),
                )
                .slice(0, 24)
                .map(([key, value]) => (
                  <WebhookDetailRow key={key} label={formatPaymentLabel(key)}>
                    {safeDisplayScalarText(value)}
                  </WebhookDetailRow>
                ))}
            </dl>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

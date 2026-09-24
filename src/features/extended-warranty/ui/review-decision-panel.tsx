// oz-next-app/src/features/extended-warranty/ui/review-decision-panel.tsx
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitExtendedWarrantyReviewDecision } from "@/features/extended-warranty/actions/review.actions";

export type ExtendedWarrantyReviewDecisionPanelProps = Readonly<{
  orderId: string;
  orderRowVersion: number;
  evidenceRowVersion: number;
  disabled: boolean;
}>;

export function ExtendedWarrantyReviewDecisionPanel({
  orderId,
  orderRowVersion,
  evidenceRowVersion,
  disabled,
}: ExtendedWarrantyReviewDecisionPanelProps): ReactElement {
  const router = useRouter();
  const [reasonCode, setReasonCode] = useState("INSTALLATION_VERIFIED");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const retryIntentRef = useRef<Readonly<{
    fingerprint: string;
    idempotencyKey: string;
  }> | null>(null);

  const submit = (decision: "APPROVED" | "REJECTED"): void => {
    setError(null);
    const normalizedReason = reasonCode.trim();
    const normalizedNotes = notes.trim().length === 0 ? null : notes.trim();
    const fingerprint = JSON.stringify({
      orderId,
      decision,
      reasonCode: normalizedReason,
      notes: normalizedNotes,
      orderRowVersion,
      evidenceRowVersion,
    });
    const currentIntent = retryIntentRef.current;
    const idempotencyKey =
      currentIntent !== null && currentIntent.fingerprint === fingerprint
        ? currentIntent.idempotencyKey
        : `ew-review:${crypto.randomUUID()}`;
    retryIntentRef.current = { fingerprint, idempotencyKey };

    startTransition(() => {
      void submitExtendedWarrantyReviewDecision({
        orderId,
        decision,
        reasonCode: normalizedReason,
        notes: normalizedNotes,
        orderRowVersion,
        evidenceRowVersion,
        idempotencyKey,
      })
        .then(() => {
          retryIntentRef.current = null;
          router.refresh();
        })
        .catch(() => {
          setError(
            "The review could not be saved. Refresh the order and try again.",
          );
        });
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="ew-review-reason" className="text-sm font-medium">
          Reason code
        </label>
        <Input
          id="ew-review-reason"
          value={reasonCode}
          onChange={(event) => {
            setReasonCode(event.target.value.toUpperCase());
          }}
          disabled={disabled || isPending}
          maxLength={64}
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="ew-review-notes" className="text-sm font-medium">
          Review notes
        </label>
        <Textarea
          id="ew-review-notes"
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
          }}
          disabled={disabled || isPending}
          maxLength={2000}
          rows={4}
          placeholder="Add concise evidence observations. Do not copy customer-sensitive data unnecessarily."
        />
      </div>
      {error === null ? null : (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isPending || reasonCode.trim().length < 2}
          onClick={() => {
            submit("REJECTED");
          }}
        >
          Reject evidence
        </Button>
        <Button
          type="button"
          disabled={disabled || isPending || reasonCode.trim().length < 2}
          onClick={() => {
            submit("APPROVED");
          }}
        >
          Approve & activate
        </Button>
      </div>
    </div>
  );
}

// oz-next-app/src/features/extended-warranty/ui/review-decision-panel.tsx
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactElement } from "react";

import { Button } from "@/components/ui/button";
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
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const retryIntentRef = useRef<Readonly<{
    fingerprint: string;
    idempotencyKey: string;
  }> | null>(null);

  const submit = (decision: "APPROVED" | "REJECTED"): void => {
    setError(null);
    const reasonCode =
      decision === "APPROVED" ? "INSTALLATION_VERIFIED" : "REUPLOAD_REQUIRED";
    const normalizedNotes = notes.trim().length === 0 ? null : notes.trim();
    const fingerprint = JSON.stringify({
      orderId,
      decision,
      reasonCode,
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
        reasonCode,
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
        <label htmlFor="ew-review-notes" className="text-sm font-medium">
          Review notes{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
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
          placeholder="Record concise evidence observations for the approval history."
        />
      </div>
      {error === null ? null : (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isPending}
          onClick={() => {
            submit("REJECTED");
          }}
        >
          Request new video
        </Button>
        <Button
          type="button"
          disabled={disabled || isPending}
          onClick={() => {
            submit("APPROVED");
          }}
        >
          Approve installation
        </Button>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        “Request new video” rejects only the current evidence revision. The
        customer can record a replacement and every prior decision remains in
        history.
      </p>
    </div>
  );
}

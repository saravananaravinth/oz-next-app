// oz-next-app/src/features/extended-warranty/ui/review-decision-panel.tsx
"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactElement } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ExtendedWarrantyActionFailure } from "@/features/extended-warranty/actions/action-failure";
import { submitExtendedWarrantyReviewDecision } from "@/features/extended-warranty/actions/review.actions";

export type ExtendedWarrantyReviewDecisionPanelProps = Readonly<{
  orderId: string;
  orderRowVersion: number;
  evidenceRowVersion: number;
  disabled: boolean;
  orderNumber?: string;
  evidenceRevisionNo?: number;
}>;

type ReviewDecision = "APPROVED" | "REJECTED";

function decisionLabel(decision: ReviewDecision): string {
  return decision === "APPROVED"
    ? "Approve installation"
    : "Request replacement video";
}

export function ExtendedWarrantyReviewDecisionPanel({
  orderId,
  orderRowVersion,
  evidenceRowVersion,
  disabled,
  orderNumber,
  evidenceRevisionNo,
}: ExtendedWarrantyReviewDecisionPanelProps): ReactElement {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [failure, setFailure] = useState<ExtendedWarrantyActionFailure | null>(
    null,
  );
  const [decisionToConfirm, setDecisionToConfirm] =
    useState<ReviewDecision | null>(null);
  const [isPending, startTransition] = useTransition();
  const retryIntentRef = useRef<Readonly<{
    fingerprint: string;
    idempotencyKey: string;
  }> | null>(null);

  const submit = (decision: ReviewDecision): void => {
    setFailure(null);
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
      void (async () => {
        const result = await submitExtendedWarrantyReviewDecision({
          orderId,
          decision,
          reasonCode,
          notes: normalizedNotes,
          orderRowVersion,
          evidenceRowVersion,
          idempotencyKey,
        });

        if (!result.ok) {
          setFailure(result);
          return;
        }

        retryIntentRef.current = null;
        setDecisionToConfirm(null);
        toast.success(
          decision === "APPROVED"
            ? "Installation review approved."
            : "Replacement installation video requested.",
        );
        router.refresh();
      })();
    });
  };

  const confirmationContext = [
    orderNumber === undefined ? null : `Order ${orderNumber}`,
    evidenceRevisionNo === undefined
      ? null
      : `Evidence revision ${String(evidenceRevisionNo)}`,
  ]
    .filter((value): value is string => value !== null)
    .join(" · ");

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
          aria-describedby="ew-review-guidance"
        />
      </div>

      {failure === null ? null : (
        <div
          className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm"
          role="alert"
        >
          <p className="font-medium text-destructive">{failure.message}</p>
          {failure.requestId === undefined ? null : (
            <p className="mt-1 text-xs text-muted-foreground">
              Support request ID:{" "}
              <span className="font-mono">{failure.requestId}</span>
            </p>
          )}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isPending}
          onClick={() => {
            setDecisionToConfirm("REJECTED");
          }}
        >
          Request new video
        </Button>
        <Button
          type="button"
          disabled={disabled || isPending}
          onClick={() => {
            setDecisionToConfirm("APPROVED");
          }}
        >
          Approve installation
        </Button>
      </div>

      <p
        id="ew-review-guidance"
        className="text-xs leading-5 text-muted-foreground"
      >
        Requesting a new video rejects only the current evidence revision. The
        customer can submit a replacement and every prior decision remains in
        history.
      </p>

      <div className="sr-only" aria-live="polite">
        {isPending ? "Saving installation review decision." : ""}
      </div>

      <AlertDialog
        open={decisionToConfirm !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) setDecisionToConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {decisionToConfirm === null
                ? "Confirm review decision"
                : `${decisionLabel(decisionToConfirm)}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {decisionToConfirm === "APPROVED"
                ? "Approval records the current evidence as verified and may start the downstream warranty activation workflow."
                : "The current evidence revision will be rejected and the customer can submit a replacement installation video."}
              {confirmationContext.length === 0
                ? ""
                : ` ${confirmationContext}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={decisionToConfirm === null || isPending}
              variant={
                decisionToConfirm === "REJECTED" ? "destructive" : "default"
              }
              onClick={() => {
                if (decisionToConfirm !== null) submit(decisionToConfirm);
              }}
            >
              {isPending
                ? "Saving…"
                : decisionToConfirm === null
                  ? "Confirm"
                  : decisionLabel(decisionToConfirm)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

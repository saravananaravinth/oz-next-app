// oz-next-app/src/features/integrations/zoho-inventory/ui/credit-note-settlement-operations.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { runCreditNoteSettlementCommandAction } from "../actions/zoho-inventory.actions";
import type { CreditNoteSettlementOperation } from "../contracts/zoho-inventory.schema";

export function CreditNoteSettlementOperations({
  settlements,
  canManage,
}: Readonly<{
  settlements: readonly CreditNoteSettlementOperation[];
  canManage: boolean;
}>) {
  return (
    <section className="mt-6 space-y-3" aria-label="Credit note settlements">
      <h3 className="font-semibold">Credit note settlements</h3>
      {settlements.length === 0 ? (
        <p className="text-muted-readable">
          No finalized credit notes are due.
        </p>
      ) : (
        settlements.map((item) => (
          <Settlement key={item.cycleId} item={item} canManage={canManage} />
        ))
      )}
    </section>
  );
}
function Settlement({
  item,
  canManage,
}: Readonly<{ item: CreditNoteSettlementOperation; canManage: boolean }>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [retry, setRetry] = useState<{
    version: number;
    allowed: boolean;
  } | null>(null);
  const [pending, setPending] = useState<{
    action: "reconcile" | "retry";
    version: number;
    key: string;
  } | null>(null);
  const recoverable = [
    "RECONCILIATION_REQUIRED",
    "BLOCKED_PROVIDER_CONFIGURATION",
    "POSTING",
  ].includes(item.settlementStatus);
  async function run(action: "reconcile" | "retry") {
    setBusy(true);
    setMessage(null);
    const command =
      pending?.action === action
        ? pending
        : {
            action,
            version: retry?.version ?? item.rowVersion,
            key: `credit-note:${crypto.randomUUID()}`,
          };
    setPending(command);
    try {
      const result = await runCreditNoteSettlementCommandAction({
        cycleId: item.cycleId,
        action,
        expectedRowVersion: command.version,
        idempotencyKey: command.key,
      });
      if (!result.ok) {
        setMessage(result.message);
        if (/conflict|validation|forbidden|not_found/i.test(result.code)) {
          setPending(null);
          setRetry(null);
          router.refresh();
        }
        return;
      }
      setPending(null);
      setRetry({
        version: result.data.rowVersion,
        allowed: result.data.outcome !== "QUEUED" && result.data.retryAllowed,
      });
      setMessage(
        result.data.outcome === "QUEUED"
          ? "Recovery queued. Refresh to see progress."
          : result.data.retryAllowed
            ? "Zoho reconciliation complete. Recovery can now be queued."
            : "The submission needs further review before recovery.",
      );
      router.refresh();
    } catch {
      setMessage(
        "The request could not complete. Retry the same action to check its outcome.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <p className="font-medium break-all">
        {item.requestedNumber ?? `Cycle ${item.cycleId.slice(0, 8)}`} · ₹
        {item.finalAmount ?? "0.00"}
      </p>
      <p className="text-caption text-muted-readable">
        {item.settlementStatus.replaceAll("_", " ")} · {item.attemptCount}{" "}
        attempts
      </p>
      {item.failureKind ? (
        <p className="text-caption text-muted-readable">
          {item.failureKind.replaceAll("_", " ")}
          {item.failurePhase ? ` during ${item.failurePhase}` : ""}
          {item.httpStatus ? ` · HTTP ${String(item.httpStatus)}` : ""}
          {item.providerCode ? ` · Zoho ${item.providerCode}` : ""}
        </p>
      ) : null}
      {item.nextAttemptAt ? (
        <p className="text-caption">
          Next retry:{" "}
          {new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Kolkata",
          }).format(new Date(item.nextAttemptAt))}
        </p>
      ) : null}
      {canManage && recoverable ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void run("reconcile")}
          >
            Reconcile with Zoho
          </Button>
          <Button
            disabled={busy || !(retry?.allowed ?? item.retryAllowed)}
            onClick={() => void run("retry")}
          >
            Queue recovery
          </Button>
        </div>
      ) : null}
      {message ? (
        <p role="status" className="text-caption">
          {message}
        </p>
      ) : null}
    </div>
  );
}

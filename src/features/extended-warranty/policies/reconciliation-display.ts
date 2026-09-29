// oz-next-app/src/features/extended-warranty/policies/reconciliation-display.ts
export function paymentVerificationTiming(
  job: Readonly<{
    status: string;
    nextAttemptAt: string;
    lastAttemptAt?: string | null | undefined;
    completedAt?: string | null | undefined;
  }>,
) {
  if (job.status === "PENDING")
    return { label: "Next attempt", at: job.nextAttemptAt };
  if (job.status === "RUNNING")
    return { label: "Started", at: job.lastAttemptAt ?? null };
  return {
    label: job.status === "FAILED" ? "Failed" : "Completed",
    at: job.completedAt ?? job.lastAttemptAt ?? null,
  };
}

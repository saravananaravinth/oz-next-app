// oz-next-app/src/features/extended-warranty/policies/workspace-detail-presentation.ts
import type { ExtendedWarrantyWorkspaceDetail } from "@/features/extended-warranty/contracts/admin.schema";
import { paymentVerificationTiming } from "@/features/extended-warranty/policies/reconciliation-display";

export const WARRANTY_LIFECYCLE_STAGE_KEYS = [
  "PAYMENT",
  "FULFILLMENT",
  "DELIVERY",
  "INSTALLATION",
  "REVIEW",
  "ACTIVATION",
  "CERTIFICATE",
] as const;

export type WarrantyLifecycleStageKey =
  (typeof WARRANTY_LIFECYCLE_STAGE_KEYS)[number];

export type WarrantyLifecycleStageState =
  "complete" | "current" | "attention" | "upcoming";

export type WarrantyLifecycleStage = Readonly<{
  key: WarrantyLifecycleStageKey;
  label: string;
  state: WarrantyLifecycleStageState;
}>;

const STAGE_LABELS: Readonly<Record<WarrantyLifecycleStageKey, string>> = {
  PAYMENT: "Payment",
  FULFILLMENT: "Fulfillment",
  DELIVERY: "Delivery",
  INSTALLATION: "Installation",
  REVIEW: "Review",
  ACTIVATION: "Activation",
  CERTIFICATE: "Certificate",
};

function stageIndex(key: WarrantyLifecycleStageKey): number {
  return WARRANTY_LIFECYCLE_STAGE_KEYS.indexOf(key);
}

function fallbackCurrentStage(
  detail: ExtendedWarrantyWorkspaceDetail,
): WarrantyLifecycleStageKey | null {
  if (
    detail.certificateFileId !== null ||
    detail.certificateIssuedAt !== null
  ) {
    return null;
  }
  if (detail.reviewDecision === "APPROVED") return "ACTIVATION";
  if (detail.reviewDecision === "REJECTED") return "REVIEW";
  if (detail.installationSubmittedAt !== null) return "REVIEW";
  if (detail.deliveredAt !== null) return "INSTALLATION";
  if (detail.fulfillmentStatus === "SHIPPED") return "DELIVERY";
  if (detail.paymentConfirmedAt !== null || detail.paidAt !== null) {
    return "FULFILLMENT";
  }
  return "PAYMENT";
}

export function currentWarrantyLifecycleStage(
  detail: ExtendedWarrantyWorkspaceDetail,
): WarrantyLifecycleStageKey | null {
  switch (detail.status) {
    case "NOT_PURCHASED":
    case "LINK_SENT":
    case "PAYMENT_PENDING":
    case "PAYMENT_RECONCILING":
      return "PAYMENT";
    case "ORDERED":
    case "PROCESSING":
    case "INVOICED":
    case "PACKED":
    case "PENDING":
      return "FULFILLMENT";
    case "SHIPPED":
      return "DELIVERY";
    case "DELIVERED":
    case "INSTALLATION_PENDING":
      return "INSTALLATION";
    case "REVIEW_PENDING":
    case "REJECTED":
      return "REVIEW";
    case "APPROVED":
    case "ACTIVATION_PENDING":
      return "ACTIVATION";
    case "CERTIFICATE_PENDING":
      return "CERTIFICATE";
    case "INSTALLED":
      return null;
    case "CANCELLED":
    case "EXPIRED":
    case "REFUNDED":
    case "FAILED":
      return fallbackCurrentStage(detail);
  }
}

export function buildWarrantyLifecycleStages(
  detail: ExtendedWarrantyWorkspaceDetail,
): readonly WarrantyLifecycleStage[] {
  const current = currentWarrantyLifecycleStage(detail);
  const currentIndex =
    current === null
      ? WARRANTY_LIFECYCLE_STAGE_KEYS.length
      : stageIndex(current);
  const attentionStage =
    detail.status === "FAILED" || detail.status === "REJECTED" ? current : null;

  return WARRANTY_LIFECYCLE_STAGE_KEYS.map((key, index) => {
    let state: WarrantyLifecycleStageState;

    if (index < currentIndex) {
      state = "complete";
    } else if (key === current) {
      state = attentionStage === key ? "attention" : "current";
    } else if (current === null) {
      state = "complete";
    } else {
      state = "upcoming";
    }

    return { key, label: STAGE_LABELS[key], state };
  });
}

export type WarrantyPaymentActivityKind =
  "ORDER_ATTEMPT" | "PAYMENT" | "RECONCILIATION";

export type WarrantyPaymentActivity = Readonly<{
  id: string;
  kind: WarrantyPaymentActivityKind;
  at: string;
  title: string;
  status: string;
  amountMinor: string | null;
  refundedAmountMinor: string | null;
  currency: string | null;
  timingLabel: string | null;
  failureCode: string | null;
  attemptCount: number | null;
}>;

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function buildWarrantyPaymentActivity(
  detail: Pick<
    ExtendedWarrantyWorkspaceDetail,
    "attempts" | "payments" | "reconciliationJobs"
  >,
): readonly WarrantyPaymentActivity[] {
  const items: WarrantyPaymentActivity[] = [];

  for (const attempt of detail.attempts) {
    items.push({
      id: `order:${attempt.orderId}`,
      kind: "ORDER_ATTEMPT",
      at: attempt.createdAt,
      title: attempt.orderNumber,
      status: attempt.status,
      amountMinor: attempt.totalAmountMinor,
      refundedAmountMinor: null,
      currency: attempt.currency,
      timingLabel: null,
      failureCode: null,
      attemptCount: null,
    });
  }

  for (const payment of detail.payments) {
    items.push({
      id: `payment:${payment.chargeId}`,
      kind: "PAYMENT",
      at: payment.createdAt,
      title: "Payment",
      status: payment.status,
      amountMinor: payment.amountMinor,
      refundedAmountMinor: payment.refundedAmountMinor,
      currency: payment.currency,
      timingLabel: null,
      failureCode: null,
      attemptCount: null,
    });
  }

  for (const job of detail.reconciliationJobs) {
    const timing = paymentVerificationTiming(job);
    items.push({
      id: `reconciliation:${job.id}`,
      kind: "RECONCILIATION",
      at: timing.at ?? job.nextAttemptAt,
      title: job.reason,
      status: job.status,
      amountMinor: null,
      refundedAmountMinor: null,
      currency: null,
      timingLabel: timing.label,
      failureCode: job.failureCode ?? null,
      attemptCount: job.attemptCount,
    });
  }

  return items.sort((left, right) => {
    const byTime = timestamp(right.at) - timestamp(left.at);
    return byTime === 0 ? left.id.localeCompare(right.id) : byTime;
  });
}

export function uniqueWarrantyMessages(
  values: readonly string[],
): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

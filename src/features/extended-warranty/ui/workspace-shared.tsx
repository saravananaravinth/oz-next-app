// oz-next-app/src/features/extended-warranty/ui/workspace-shared.tsx
"use client";

import { Download, Send, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { formatDisplayLabel } from "@/components/common/display-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  downloadExtendedWarrantyCertificateAction,
  prepareExtendedWarrantyPurchaseLinkAction,
  sendExtendedWarrantyPurchaseLinkAction,
} from "@/features/extended-warranty/actions/admin.actions";
import type { ExtendedWarrantyWorkspaceItem } from "@/features/extended-warranty/contracts/admin.schema";

export function formatWorkspaceDateTime(value: string | null): string {
  if (value === null) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function formatWorkspaceDate(value: string | null): string {
  if (value === null) return "—";
  const parsed = new Date(`${value}T00:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}

export function formatWorkspaceMinorAmount(
  currency: string | null,
  minor: string | null,
): string {
  if (currency === null || minor === null) return "—";
  const amount = Number(minor) / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function workspaceStatusBadge(
  status: ExtendedWarrantyWorkspaceItem["status"],
): React.ReactElement {
  const neutral = new Set([
    "NOT_PURCHASED",
    "CANCELLED",
    "EXPIRED",
    "REFUNDED",
  ]);
  const failure = new Set(["REJECTED", "FAILED"]);
  const positive = new Set(["DELIVERED", "APPROVED", "INSTALLED"]);
  const waiting = new Set([
    "PAYMENT_PENDING",
    "PAYMENT_RECONCILING",
    "PENDING",
    "INSTALLATION_PENDING",
    "REVIEW_PENDING",
    "ACTIVATION_PENDING",
    "CERTIFICATE_PENDING",
  ]);

  const variant = failure.has(status)
    ? "destructive"
    : positive.has(status)
      ? "default"
      : neutral.has(status)
        ? "secondary"
        : waiting.has(status)
          ? "outline"
          : "outline";

  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {formatDisplayLabel(status, "Unknown Status")}
    </Badge>
  );
}

export function safeExternalHttpHref(value: string | null): string | null {
  if (value === null) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function WorkspaceDetailField({
  label,
  value,
}: Readonly<{ label: string; value: React.ReactNode }>): React.ReactElement {
  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm text-foreground">{value}</div>
    </div>
  );
}

export function PurchaseLinkActionButton({
  tenantId,
  item,
}: Readonly<{
  tenantId: string;
  item: Pick<
    ExtendedWarrantyWorkspaceItem,
    | "unitId"
    | "status"
    | "purchaseLinkAction"
    | "purchaseLinkActionEnabled"
    | "purchaseLinkActionReason"
    | "eligibilityBlockers"
  >;
}>): React.ReactElement | null {
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  if (item.purchaseLinkAction === "NONE") return null;

  const prepare = item.purchaseLinkAction === "PREPARE";
  const resend = !prepare && item.status === "LINK_SENT";
  const label = prepare ? "Prepare Link" : resend ? "Resend Link" : "Send Link";
  const pendingLabel = prepare
    ? "Preparing…"
    : resend
      ? "Resending…"
      : "Sending…";
  const blockerText = item.eligibilityBlockers.join("; ");
  const reason =
    item.purchaseLinkActionReason ??
    (blockerText.length > 0 ? blockerText : `${label} is unavailable.`);

  const button = (
    <Button
      size="sm"
      variant="outline"
      className="min-w-[112px] whitespace-nowrap"
      disabled={!item.purchaseLinkActionEnabled || pending}
      aria-label={label}
      onClick={() => {
        startTransition(async () => {
          try {
            if (prepare) {
              const result = await prepareExtendedWarrantyPurchaseLinkAction({
                tenantId,
                unitId: item.unitId,
              });
              if (result.outcome === "skipped") toast.warning(result.detail);
              else if (result.outcome === "deduplicated")
                toast.info(result.detail);
              else toast.success(result.detail);
            } else {
              const form = new FormData();
              form.set("tenantId", tenantId);
              form.set("unitId", item.unitId);
              const result = await sendExtendedWarrantyPurchaseLinkAction(form);
              if (result.outcome === "skipped") toast.info(result.detail);
              else toast.success(result.detail);
            }
            router.refresh();
          } catch (error: unknown) {
            toast.error(
              error instanceof Error && error.message.trim().length > 0
                ? error.message
                : prepare
                  ? "Unable to prepare the purchase link. Please retry."
                  : resend
                    ? "Unable to resend the purchase link. Please retry."
                    : "Unable to send the purchase link. Please retry.",
            );
          }
        });
      }}
    >
      {prepare ? (
        <WandSparkles className="mr-2 size-4" aria-hidden="true" />
      ) : (
        <Send className="mr-2 size-4" aria-hidden="true" />
      )}
      {pending ? pendingLabel : label}
    </Button>
  );

  if (item.purchaseLinkActionEnabled) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">{reason}</TooltipContent>
    </Tooltip>
  );
}

export function CertificateButton({
  tenantId,
  unitId,
}: Readonly<{ tenantId: string; unitId: string }>): React.ReactElement {
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      className="min-w-[112px] whitespace-nowrap"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const result = await downloadExtendedWarrantyCertificateAction({
              tenantId,
              unitId,
            });
            const href = safeExternalHttpHref(result.url);
            if (href === null) throw new Error("Invalid certificate URL");
            window.location.assign(href);
          } catch {
            toast.error("Certificate download is unavailable. Please retry.");
          }
        });
      }}
    >
      <Download className="mr-2 size-4" aria-hidden="true" />
      {pending ? "Preparing…" : "Download"}
    </Button>
  );
}

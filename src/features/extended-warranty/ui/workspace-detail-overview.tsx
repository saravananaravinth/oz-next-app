// oz-next-app/src/features/extended-warranty/ui/workspace-detail-overview.tsx
"use client";

import * as React from "react";

import {
  formatCapitalizedDisplayList,
  formatCapitalizedDisplayText,
  formatDisplayLabel,
} from "@/components/common/display-label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ExtendedWarrantyWorkspaceDetailPayload } from "@/features/extended-warranty/ui/workspace-detail.types";
import {
  formatWorkspaceDate,
  formatWorkspaceDateTime,
  formatWorkspaceMinorAmount,
  WorkspaceDetailField,
} from "@/features/extended-warranty/ui/workspace-shared";

export function WarrantyOverviewSection({
  detail,
}: Readonly<{
  detail: ExtendedWarrantyWorkspaceDetailPayload;
}>): React.ReactElement {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Purchase & workflow</CardTitle>
          <CardDescription>
            Current commercial and warranty state.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <WorkspaceDetailField
            label="Order"
            value={detail.orderNumber ?? "Not ordered"}
          />
          <WorkspaceDetailField
            label="Order status"
            value={formatDisplayLabel(detail.orderStatus, "Not ordered")}
          />
          <WorkspaceDetailField
            label="Amount"
            value={formatWorkspaceMinorAmount(
              detail.currency,
              detail.totalAmountMinor,
            )}
          />
          <WorkspaceDetailField
            label="Payment confirmed"
            value={formatWorkspaceDateTime(detail.paymentConfirmedAt)}
          />
          <WorkspaceDetailField
            label="Delivered"
            value={formatWorkspaceDateTime(detail.deliveredAt)}
          />
          <WorkspaceDetailField
            label="Installation submitted"
            value={formatWorkspaceDateTime(detail.installationSubmittedAt)}
          />
          <WorkspaceDetailField
            label="Review"
            value={formatDisplayLabel(detail.reviewDecision, "Not reviewed")}
          />
          <WorkspaceDetailField
            label="Reviewed"
            value={formatWorkspaceDateTime(detail.reviewedAt)}
          />
          <WorkspaceDetailField
            label="Certificate"
            value={detail.certificateNumber ?? "Not issued"}
          />
          <WorkspaceDetailField
            label="Certificate issued"
            value={formatWorkspaceDateTime(detail.certificateIssuedAt)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle & customer</CardTitle>
          <CardDescription>
            Sold vehicle, buyer, and seller context.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <WorkspaceDetailField
            label="VIN"
            value={<span className="font-mono">{detail.vin ?? "—"}</span>}
          />
          <WorkspaceDetailField
            label="Model"
            value={formatCapitalizedDisplayList(
              [detail.modelName, detail.colorName],
              "—",
            )}
          />
          <WorkspaceDetailField
            label="Variant"
            value={formatCapitalizedDisplayList(
              [detail.variantName, detail.batteryType, detail.batteryPowerKw],
              "—",
            )}
          />
          <WorkspaceDetailField
            label="Invoice date"
            value={formatWorkspaceDate(detail.saleDate)}
          />
          <WorkspaceDetailField
            label="Buyer"
            value={formatCapitalizedDisplayText(detail.buyerName, "—")}
          />
          <WorkspaceDetailField
            label="Buyer location"
            value={formatCapitalizedDisplayList(
              [detail.buyerDistrict, detail.buyerState],
              "—",
              ", ",
            )}
          />
          <WorkspaceDetailField
            label="Contact"
            value={formatCapitalizedDisplayList(
              [detail.maskedMobile, detail.preferredMsgChannel],
              "—",
            )}
          />
          <WorkspaceDetailField
            label="Seller"
            value={formatCapitalizedDisplayText(detail.sellerName, "—")}
          />
          <WorkspaceDetailField
            label="Seller location"
            value={formatCapitalizedDisplayList(
              [detail.sellerDistrict, detail.sellerState],
              "—",
              ", ",
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

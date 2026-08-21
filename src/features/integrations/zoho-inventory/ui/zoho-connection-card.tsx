// oz-next-app/src/features/integrations/zoho-inventory/ui/zoho-connection-card.tsx
import type { ReactElement } from "react";
import type { Route } from "next";
import Link from "next/link";
import {
  Building2,
  CircleCheck,
  CircleOff,
  KeyRound,
  TriangleAlert,
} from "lucide-react";

import {
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentListItem,
} from "@/components/common/content-shell";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type {
  ZohoConnectionStatus,
  ZohoExternalConnection,
  ZohoInventoryDataCenter,
} from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";
import type { ZohoInventoryCapabilities } from "@/features/integrations/zoho-inventory/policies/zoho-inventory.policy";
import { ZohoConnectionActions } from "@/features/integrations/zoho-inventory/ui/zoho-connection-actions";

const DATA_CENTER_LABELS = {
  IN: "India",
  US: "United States",
  EU: "Europe",
  AU: "Australia",
  CA: "Canada",
} as const satisfies Record<ZohoInventoryDataCenter, string>;

function statusPresentation(status: ZohoConnectionStatus): Readonly<{
  label: string;
  variant: NonNullable<BadgeProps["variant"]>;
  icon: ReactElement;
}> {
  if (status === "ACTIVE") {
    return {
      label: "Connected",
      variant: "success",
      icon: <CircleCheck aria-hidden="true" />,
    };
  }

  if (status === "REAUTH_REQUIRED") {
    return {
      label: "Reauthorization required",
      variant: "warning",
      icon: <TriangleAlert aria-hidden="true" />,
    };
  }

  return {
    label: "Disconnected",
    variant: "outline",
    icon: <CircleOff aria-hidden="true" />,
  };
}

function formatDateTime(value: string | null): string {
  if (value === null) {
    return "Not yet";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export function ZohoConnectionCard({
  connection,
  capabilities,
  selectedForHistory,
}: Readonly<{
  connection: ZohoExternalConnection;
  capabilities: ZohoInventoryCapabilities;
  selectedForHistory: boolean;
}>): ReactElement {
  const status = statusPresentation(connection.status);
  const historyHref =
    `/settings/integrations/zoho-inventory?connection=${encodeURIComponent(connection.connectionId)}` as Route;

  return (
    <ContentListItem
      media={<Building2 aria-hidden="true" className="size-5" />}
      title={connection.organizationName}
      meta={
        <>
          <Badge variant={status.variant}>
            {status.icon}
            {status.label}
          </Badge>
          {connection.isDefault ? (
            <Badge variant="info">Tenant default</Badge>
          ) : null}
        </>
      }
      description={`Zoho organization ${connection.organizationId} · ${DATA_CENTER_LABELS[connection.dataCenter]} data center`}
      actions={
        <>
          <Button
            asChild
            variant={selectedForHistory ? "secondary" : "outline"}
          >
            <Link href={historyHref} scroll={false}>
              {selectedForHistory ? "History selected" : "View history"}
            </Link>
          </Button>
          <ZohoConnectionActions
            connection={connection}
            capabilities={capabilities}
          />
        </>
      }
    >
      <ContentDescriptionList columns="three" className="mt-3">
        <ContentDescriptionItem term="Connected">
          {formatDateTime(connection.connectedAt)}
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Last verified">
          {formatDateTime(connection.lastVerifiedAt)}
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Last successful sync">
          {formatDateTime(connection.lastSuccessfulSyncAt)}
        </ContentDescriptionItem>
        <ContentDescriptionItem term="OAuth scopes" className="sm:col-span-2">
          <span className="inline-flex items-start gap-1.5 break-all">
            <KeyRound
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0 text-muted-readable"
            />
            {connection.grantedScopes.join(", ")}
          </span>
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Row version" numeric>
          {connection.rowVersion.toLocaleString("en-IN")}
        </ContentDescriptionItem>
      </ContentDescriptionList>
    </ContentListItem>
  );
}

// oz-next-app/src/features/integrations/zoho-inventory/ui/zoho-connection-card.tsx
import type { ReactElement } from "react";
import Link from "next/link";
import {
  Building2,
  CircleCheck,
  CircleOff,
  Clock3,
  Globe2,
  History,
  KeyRound,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import {
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentListItem,
} from "@/components/common/content-shell";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  if (value === null) return "Not yet";

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function scopeLabel(scope: string): string {
  const segments = scope.split(".");
  const resource = segments.at(-2) ?? segments.at(-1) ?? scope;
  const permission = segments.at(-1) ?? "";
  return `${resource} ${permission}`.trim();
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

  return (
    <ContentListItem
      className={cn(
        "relative overflow-hidden border-border/75 bg-card shadow-xs shadow-foreground/[0.025]",
        selectedForHistory &&
          "border-info/35 bg-info/[0.025] ring-1 ring-info/10",
      )}
      media={
        <Building2
          aria-hidden="true"
          className={cn("size-5", selectedForHistory && "text-info")}
        />
      }
      title={connection.organizationName}
      meta={
        <>
          <Badge variant={status.variant}>
            {status.icon}
            {status.label}
          </Badge>
          {connection.isDefault ? (
            <Badge variant="info">
              <ShieldCheck aria-hidden="true" />
              Tenant default
            </Badge>
          ) : null}
          {selectedForHistory ? (
            <Badge variant="secondary">
              <History aria-hidden="true" />
              Activity selected
            </Badge>
          ) : null}
        </>
      }
      description={
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <Globe2 aria-hidden="true" className="size-3.5" />
            {DATA_CENTER_LABELS[connection.dataCenter]} data center
          </span>
          <span className="font-mono text-caption text-foreground/75">
            Org {connection.organizationId}
          </span>
        </span>
      }
      actions={
        <>
          <Button
            asChild
            size="sm"
            variant={selectedForHistory ? "secondary" : "outline"}
          >
            <Link
              href={{
                pathname: "/settings/integrations/zoho-inventory",
                query: { connection: connection.connectionId },
              }}
              scroll={false}
            >
              <History aria-hidden="true" />
              {selectedForHistory ? "Activity selected" : "View activity"}
            </Link>
          </Button>
          <ZohoConnectionActions
            connection={connection}
            capabilities={capabilities}
          />
        </>
      }
    >
      <ContentDescriptionList columns="three" className="mt-4">
        <ContentDescriptionItem term="Connected">
          <span className="inline-flex items-center gap-1.5">
            <Clock3
              aria-hidden="true"
              className="size-3.5 text-muted-readable"
            />
            {formatDateTime(connection.connectedAt)}
          </span>
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Last verified">
          {formatDateTime(connection.lastVerifiedAt)}
        </ContentDescriptionItem>
        <ContentDescriptionItem term="Last successful sync">
          {formatDateTime(connection.lastSuccessfulSyncAt)}
        </ContentDescriptionItem>
      </ContentDescriptionList>

      <div className="mt-3 grid gap-2 rounded-xl border border-border/65 bg-muted/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-caption font-medium text-foreground/80">
            <KeyRound aria-hidden="true" className="size-3.5" />
            Granted OAuth capabilities
          </span>
          <span className="text-caption text-tabular text-muted-readable">
            {connection.grantedScopes.length.toLocaleString("en-IN")} scopes ·
            row v{connection.rowVersion.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {connection.grantedScopes.map((scope) => (
            <Badge key={scope} variant="outline" className="max-w-full">
              <span className="truncate">{scopeLabel(scope)}</span>
            </Badge>
          ))}
        </div>
      </div>
    </ContentListItem>
  );
}

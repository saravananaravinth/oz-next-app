// oz-next-app/src/features/integrations/zoho-inventory/ui/zoho-inventory-page.tsx
import type { ReactElement } from "react";
import {
  CircleCheck,
  CloudCog,
  PlugZap,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentEmptyState,
  ContentHeader,
  ContentList,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";

import type {
  ZohoExternalConnection,
  ZohoIntegrationSearchParams,
  ZohoPendingGrant,
  ZohoSyncJob,
  ZohoConnectionOverview,
  ZohoItemsResult,
  ZohoWebhookEndpoint,
  ZohoWebhookReceipt,
  ZohoItemDetail,
  CreditNoteOperationsSnapshot,
} from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";
import type { ResolvedZohoInventoryAccess } from "@/features/integrations/zoho-inventory/policies/zoho-inventory.policy";
import { ZohoConnectControl } from "@/features/integrations/zoho-inventory/ui/zoho-connect-control";
import { ZohoConnectionCard } from "@/features/integrations/zoho-inventory/ui/zoho-connection-card";
import { ZohoOrganizationSelector } from "@/features/integrations/zoho-inventory/ui/zoho-organization-selector";
import { ZohoSyncHistory } from "@/features/integrations/zoho-inventory/ui/zoho-sync-history";
import { ZohoCatalogMonitor } from "@/features/integrations/zoho-inventory/ui/zoho-catalog-monitor";
import { CreditNoteInvoiceSyncButton } from "@/features/integrations/zoho-inventory/ui/zoho-catalog-actions";

function OAuthStatus({
  status,
}: Readonly<{
  status: ZohoIntegrationSearchParams["oauth"];
}>): ReactElement | null {
  if (status === undefined) return null;

  if (status === "authorized") {
    return (
      <ContentStatus
        variant="success"
        icon={<CircleCheck aria-hidden="true" />}
        title="Zoho authorization completed"
        description="Choose which authorized Zoho Inventory organization should be connected to the active ERP tenant."
      />
    );
  }

  if (status === "denied") {
    return (
      <ContentStatus
        variant="warning"
        icon={<XCircle aria-hidden="true" />}
        title="Zoho authorization was declined"
        description="No Zoho connection was created. Start the connection again when you are ready to grant the requested scope."
      />
    );
  }

  if (status === "session-expired") {
    return (
      <ContentStatus
        variant="warning"
        icon={<TriangleAlert aria-hidden="true" />}
        title="ERP session expired during OAuth callback"
        description="The Zoho grant code could not be exchanged safely. Sign in again and start a new Zoho connection so a fresh short-lived authorization code is issued."
      />
    );
  }

  if (status === "selection-unavailable") {
    return (
      <ContentStatus
        variant="warning"
        icon={<TriangleAlert aria-hidden="true" />}
        title="Organization selection could not be staged"
        description="The authorized Zoho account returned more organization metadata than the bounded frontend handoff accepts. No organization was connected."
      />
    );
  }

  return (
    <ContentStatus
      variant="destructive"
      icon={<TriangleAlert aria-hidden="true" />}
      title="Zoho authorization could not be completed"
      description={
        status === "context-lost"
          ? "The short-lived ERP OAuth context cookie was unavailable or expired. Start the Zoho connection again."
          : status === "invalid-callback"
            ? "The OAuth callback did not match the strict Zoho callback contract. No connection was created."
            : "The Zoho authorization exchange failed. No successful connection should be assumed; start a fresh authorization attempt."
      }
    />
  );
}

export function ZohoInventoryPage({
  access,
  connections,
  selectedConnection,
  jobs,
  pendingGrant,
  query,
  overview,
  items,
  webhooks,
  receipts,
  itemDetail,
  creditNoteOperations,
  canManageCreditNoteOperations,
}: Readonly<{
  access: ResolvedZohoInventoryAccess;
  connections: readonly ZohoExternalConnection[];
  selectedConnection: ZohoExternalConnection | null;
  jobs: readonly ZohoSyncJob[];
  pendingGrant: ZohoPendingGrant | null;
  query: ZohoIntegrationSearchParams;
  overview: ZohoConnectionOverview | null;
  items: ZohoItemsResult;
  webhooks: readonly ZohoWebhookEndpoint[];
  receipts: readonly ZohoWebhookReceipt[];
  itemDetail: ZohoItemDetail | null;
  creditNoteOperations: CreditNoteOperationsSnapshot | null;
  canManageCreditNoteOperations: boolean;
}>): ReactElement {
  const activeDefaultExists = connections.some(
    (connection) => connection.isDefault && connection.status !== "DISABLED",
  );

  return (
    <ContentRoot
      width="full"
      density="compact"
      className="min-h-[calc(100dvh-8rem)]"
    >
      <ContentHeader
        icon={<PlugZap aria-hidden="true" />}
        iconTone="info"
        title="Zoho Inventory Integration"
        description="Secure tenant-scoped OAuth connection management, organization verification, and durable synchronization operations. Ozotec ERP remains authoritative."
        actions={
          access.capabilities.canConfigure ? (
            <ZohoConnectControl
              label={
                connections.length === 0
                  ? "Connect Zoho"
                  : "Add Zoho organization"
              }
            />
          ) : undefined
        }
        surface="subtle"
      />

      <OAuthStatus status={query.oauth} />

      {pendingGrant !== null && access.capabilities.canConfigure ? (
        <ZohoOrganizationSelector
          grant={pendingGrant}
          defaultIsDefault={!activeDefaultExists}
        />
      ) : null}

      <ContentDataSurface
        title="Connections"
        description="Each connection is isolated by ERP tenant and Zoho organization. Access and refresh credentials never enter the browser."
        padded
      >
        {connections.length === 0 ? (
          <ContentEmptyState
            icon={<CloudCog aria-hidden="true" />}
            title="No Zoho Inventory organization connected"
            description="Authorize Zoho Inventory with the least-privilege scope, then select the organization to bind to this tenant."
            actions={
              access.capabilities.canConfigure ? (
                <ZohoConnectControl />
              ) : undefined
            }
          />
        ) : (
          <ContentList density="compact">
            {connections.map((connection) => (
              <ZohoConnectionCard
                key={connection.connectionId}
                connection={connection}
                capabilities={access.capabilities}
                selectedForHistory={
                  selectedConnection?.connectionId === connection.connectionId
                }
              />
            ))}
          </ContentList>
        )}
      </ContentDataSurface>

      {overview === null ? null : (
        <ZohoCatalogMonitor
          overview={overview}
          items={items}
          webhooks={webhooks}
          receipts={receipts}
          query={query}
          itemDetail={itemDetail}
          canSync={access.capabilities.canRunSync}
          canConfigure={access.capabilities.canConfigure}
        />
      )}

      {creditNoteOperations === null ? null : (
        <ContentDataSurface
          title="Credit Note Operations"
          description="Authoritative Zoho purchase-invoice discovery, VIN eligibility, dealer mapping coverage, and reconciliation health."
          padded
          actions={
            <div className="flex items-center gap-3">
              <span className="text-caption text-muted-readable">
                {String(creditNoteOperations.openIssueCount)} open issues
              </span>
              {access.capabilities.canRunSync &&
              canManageCreditNoteOperations ? (
                <CreditNoteInvoiceSyncButton
                  fromDate={creditNoteBackfillStart()}
                  toDate={new Date().toISOString().slice(0, 10)}
                />
              ) : null}
            </div>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OperationMetric
              label="Invoice source"
              value={
                creditNoteOperations.configured
                  ? (creditNoteOperations.locationName ??
                    creditNoteOperations.locationId ??
                    "Configured")
                  : "Not configured"
              }
            />
            <OperationMetric
              label="Coverage watermark"
              value={creditNoteOperations.coveredThrough ?? "Sync has not run"}
            />
            <OperationMetric
              label="Invoice eligibility"
              value={`${String(creditNoteOperations.eligibleInvoiceCount)} eligible · ${String(creditNoteOperations.excludedInvoiceCount)} excluded`}
            />
            <OperationMetric
              label="Dealer mappings"
              value={`${String(creditNoteOperations.mappedDealerCount)} / ${String(creditNoteOperations.activeDealerCount)}`}
            />
          </div>
          <p className="mt-3 text-caption text-muted-readable">
            {creditNoteOperations.lastSuccessfulSyncAt === null
              ? "No successful Credit Note invoice sync has completed. Configure Head Office by its stable Zoho location ID before accrual."
              : `Last successful sync: ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(creditNoteOperations.lastSuccessfulSyncAt))}. Manual backfills are bounded to 93 days and mapping changes require a reason and row version.`}
          </p>
        </ContentDataSurface>
      )}

      <ContentDataSurface
        title="Synchronization history"
        description={
          selectedConnection === null
            ? "Connect Zoho Inventory to begin organization reconciliation."
            : `Latest durable jobs for ${selectedConnection.organizationName}, including manual, scheduled, webhook, and internal work.`
        }
        padded
        actions={
          selectedConnection !== null ? (
            <span className="inline-flex items-center gap-1.5 text-caption text-muted-readable">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              PostgreSQL-authoritative · private task execution
            </span>
          ) : undefined
        }
      >
        <ZohoSyncHistory jobs={jobs} />
      </ContentDataSurface>
    </ContentRoot>
  );
}

function creditNoteBackfillStart(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 62);
  return date.toISOString().slice(0, 10);
}

function OperationMetric({
  label,
  value,
}: Readonly<{ label: string; value: string }>): ReactElement {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
      <p className="text-caption text-muted-readable">{label}</p>
      <p className="mt-1 text-body-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

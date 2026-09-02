// oz-next-app/src/features/integrations/zoho-inventory/ui/zoho-inventory-page.tsx
import type { ReactElement } from "react";
import {
  Activity,
  CircleCheck,
  CloudCog,
  FileCheck2,
  Link2,
  MapPinCheck,
  PlugZap,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentEmptyState,
  ContentList,
  ContentMetricCard,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { WorkspaceHeader } from "@/components/common/workspace-header";

import type {
  CreditNoteOperationsSnapshot,
  ZohoConnectionOverview,
  ZohoExternalConnection,
  ZohoIntegrationSearchParams,
  ZohoItemDetail,
  ZohoItemsResult,
  ZohoPendingGrant,
  ZohoSyncJob,
  ZohoWebhookEndpoint,
  ZohoWebhookReceipt,
} from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";
import type { ResolvedZohoInventoryAccess } from "@/features/integrations/zoho-inventory/policies/zoho-inventory.policy";
import { CreditNoteInvoiceSyncButton } from "@/features/integrations/zoho-inventory/ui/zoho-catalog-actions";
import { ZohoCatalogMonitor } from "@/features/integrations/zoho-inventory/ui/zoho-catalog-monitor";
import { ZohoConnectControl } from "@/features/integrations/zoho-inventory/ui/zoho-connect-control";
import { ZohoConnectionCard } from "@/features/integrations/zoho-inventory/ui/zoho-connection-card";
import { ZohoOrganizationSelector } from "@/features/integrations/zoho-inventory/ui/zoho-organization-selector";
import { ZohoSyncHistory } from "@/features/integrations/zoho-inventory/ui/zoho-sync-history";

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
      <WorkspaceHeader
        titleId="zoho-inventory-page-title"
        icon={<PlugZap aria-hidden="true" />}
        tone="info"
        title="Zoho Inventory Integration"
        description="Tenant-isolated OAuth, catalogue monitoring, webhooks, and durable synchronization. Ozotec ERP remains authoritative."
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
        description="Operational state for tenant-bound Zoho organizations. OAuth credentials remain server-side and never enter the browser."
        padded
        actions={
          connections.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/35 px-2.5 py-1 text-caption text-muted-readable">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              {connections.length.toLocaleString("en-IN")} organization
              {connections.length === 1 ? "" : "s"}
            </span>
          ) : undefined
        }
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
            <ContentMetricCard
              presentation="dashboard"
              tone={creditNoteOperations.configured ? "info" : "warning"}
              label="Invoice source"
              value={
                <span className="block truncate text-xl leading-tight font-semibold tracking-tight sm:text-2xl">
                  {creditNoteOperations.configured
                    ? (creditNoteOperations.locationName ??
                      creditNoteOperations.locationId ??
                      "Configured")
                    : "Not configured"}
                </span>
              }
              description="Zoho invoice location"
              icon={<MapPinCheck aria-hidden="true" />}
            />
            <ContentMetricCard
              presentation="dashboard"
              tone="primary"
              label="Coverage watermark"
              value={
                <span className="block whitespace-nowrap text-xl leading-none font-semibold tracking-tight sm:text-2xl">
                  {creditNoteOperations.coveredThrough ?? "Not started"}
                </span>
              }
              description="Invoice discovery coverage"
              icon={<Activity aria-hidden="true" />}
            />
            <ContentMetricCard
              presentation="dashboard"
              tone={
                creditNoteOperations.reconciliationRequiredInvoiceCount > 0
                  ? "warning"
                  : "success"
              }
              label="Invoice outcomes"
              value={`${String(creditNoteOperations.eligibleInvoiceCount)} / ${String(creditNoteOperations.excludedInvoiceCount)} / ${String(creditNoteOperations.reconciliationRequiredInvoiceCount)}`}
              description="Eligible / excluded / review"
              icon={<FileCheck2 aria-hidden="true" />}
            />
            <ContentMetricCard
              presentation="dashboard"
              tone={
                creditNoteOperations.mappedDealerCount ===
                creditNoteOperations.activeDealerCount
                  ? "success"
                  : "warning"
              }
              label="Dealer mappings"
              value={`${String(creditNoteOperations.mappedDealerCount)} / ${String(creditNoteOperations.activeDealerCount)}`}
              description="Mapped / active"
              icon={<Link2 aria-hidden="true" />}
            />
          </div>
          <p className="mt-3 text-caption text-muted-readable">
            {creditNoteOperations.lastSuccessfulSyncAt === null
              ? "No successful Credit Note invoice sync has completed. Configure Head Office by its stable Zoho location ID before accrual."
              : `Last successful sync: ${formatDateTime(creditNoteOperations.lastSuccessfulSyncAt)}. Manual backfills are bounded to 93 days and mapping changes require a reason and row version.`}
          </p>
        </ContentDataSurface>
      )}

      <ContentDataSurface
        title="Synchronization history"
        description={
          selectedConnection === null
            ? "Connect Zoho Inventory to begin organization reconciliation."
            : `Latest 10 durable synchronization records for ${selectedConnection.organizationName}.`
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

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

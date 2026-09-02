// oz-next-app/src/lib/api/endpoints.ts
const ERP_PREFIX = "/erp" as const;

export const ERP_API_PREFIX = ERP_PREFIX;

export const AUTH_ENDPOINTS = {
  jwks: `${ERP_PREFIX}/auth/.well-known/jwks.json`,
  loginOtpRequest: `${ERP_PREFIX}/auth/login/otp/request`,
  loginOtpVerify: `${ERP_PREFIX}/auth/login/otp/verify`,
  tokenRefresh: `${ERP_PREFIX}/auth/token/refresh`,
  me: `${ERP_PREFIX}/auth/me`,
  sessions: `${ERP_PREFIX}/auth/sessions`,
  revokeCurrentSession: `${ERP_PREFIX}/auth/sessions/current`,
  session: (sessionId: string) =>
    `${ERP_PREFIX}/auth/sessions/${encodeURIComponent(sessionId)}` as const,
  loginStart: `${ERP_PREFIX}/auth/login/otp/request`,
  loginVerify: `${ERP_PREFIX}/auth/login/otp/verify`,
  refresh: `${ERP_PREFIX}/auth/token/refresh`,
  logout: `${ERP_PREFIX}/auth/sessions/current`,
} as const;

export const INVENTORY_ENDPOINTS = {
  // The current API bootstrap mounts component routes under the dealer-inventory
  // base. Keep that compatibility mapping centralized here until the backend
  // component base path is migrated in a coordinated contract release.
  componentInventoryBase: `${ERP_PREFIX}/dealer/inventory`,
  dealerInventoryBase: `${ERP_PREFIX}/dealer/inventory`,
  dealerContexts: `${ERP_PREFIX}/dealer/inventory/contexts/dealers`,
  vehicles: `${ERP_PREFIX}/dealer/inventory/vehicles`,
  vehicleFacets: `${ERP_PREFIX}/dealer/inventory/vehicles/facets`,
  vehiclesExportCsv: `${ERP_PREFIX}/dealer/inventory/vehicles/export.csv`,
} as const;

export const ENGAGEMENT_ENDPOINTS = {
  base: `${ERP_PREFIX}/engagement`,
  dealerBase: `${ERP_PREFIX}/engagement/dealer`,
  dealerDashboard: `${ERP_PREFIX}/engagement/dealer/dashboard`,
  happyCustomers: `${ERP_PREFIX}/engagement/dealer/happy-customers`,
  happyCustomer: (ownerGuideId: string) =>
    `${ERP_PREFIX}/engagement/dealer/happy-customers/${encodeURIComponent(ownerGuideId)}` as const,
  happyCustomerSettings: `${ERP_PREFIX}/engagement/dealer/happy-customer-settings`,
  warrantyDocumentDownload: (fileId: string) =>
    `${ERP_PREFIX}/engagement/dealer/warranty-documents/${encodeURIComponent(fileId)}/download` as const,
  operationsDashboardBase: `${ERP_PREFIX}/engagement/dashboard`,
  operationsDashboardSummary: `${ERP_PREFIX}/engagement/dashboard/summary`,
  operationsDashboardLeadSourceSeries: `${ERP_PREFIX}/engagement/dashboard/lead-sources/timeseries`,
  operationsDashboardFunnel: `${ERP_PREFIX}/engagement/dashboard/funnel`,
  operationsDashboardDealers: `${ERP_PREFIX}/engagement/dashboard/dealers`,
  operationsDashboardIssues: `${ERP_PREFIX}/engagement/dashboard/issues`,
  operationsDashboardCoverage: `${ERP_PREFIX}/engagement/dashboard/coverage`,
  operationsDashboardFilterOptions: `${ERP_PREFIX}/engagement/dashboard/filter-options`,
  operationsDashboardDealer: (dealerOrgUnitId: string) =>
    `${ERP_PREFIX}/engagement/dashboard/dealers/${encodeURIComponent(dealerOrgUnitId)}` as const,
  operationsDashboardDealerSettings: (dealerOrgUnitId: string) =>
    `${ERP_PREFIX}/engagement/dashboard/dealers/${encodeURIComponent(dealerOrgUnitId)}/settings` as const,
  operationsDashboardDealerLocation: (dealerOrgUnitId: string) =>
    `${ERP_PREFIX}/engagement/dashboard/dealers/${encodeURIComponent(dealerOrgUnitId)}/location` as const,
  operationsDashboardLead: (leadId: string) =>
    `${ERP_PREFIX}/engagement/dashboard/leads/${encodeURIComponent(leadId)}` as const,
  videoSequencesBase: `${ERP_PREFIX}/engagement/video-sequences`,
  supportBase: `${ERP_PREFIX}/engagement/support`,
  supportIssueAction: (issueKey: string) =>
    `${ERP_PREFIX}/engagement/support/issues/${encodeURIComponent(issueKey)}/action` as const,
  supportLeadReassign: (leadId: string) =>
    `${ERP_PREFIX}/engagement/support/leads/${encodeURIComponent(leadId)}/reassign` as const,
  supportOutboxRetry: (outboxEventId: string) =>
    `${ERP_PREFIX}/engagement/support/outbox/${encodeURIComponent(outboxEventId)}/retry` as const,
  supportVideoMessageRetry: (videoMessageId: string) =>
    `${ERP_PREFIX}/engagement/support/video-messages/${encodeURIComponent(videoMessageId)}/retry` as const,
} as const;

export const WALLET_ENDPOINTS = {
  base: `${ERP_PREFIX}/wallets`,
  wallet: (walletId: string) =>
    `${ERP_PREFIX}/wallets/${encodeURIComponent(walletId)}` as const,
  entries: (walletId: string) =>
    `${ERP_PREFIX}/wallets/${encodeURIComponent(walletId)}/entries` as const,
} as const;

export const WELFARE_ENDPOINTS = {
  base: `${ERP_PREFIX}/welfare`,
  accruals: `${ERP_PREFIX}/welfare/accruals`,
  accrual: (accrualId: string) =>
    `${ERP_PREFIX}/welfare/accruals/${encodeURIComponent(accrualId)}` as const,
  accrualInvoiceDocument: (accrualId: string) =>
    `${ERP_PREFIX}/welfare/v3/accruals/${encodeURIComponent(accrualId)}/invoice-document` as const,
} as const;

export const CREDIT_NOTE_ENDPOINTS = {
  base: `${ERP_PREFIX}/credit-notes`,
  overview: `${ERP_PREFIX}/credit-notes/overview`,
  insights: `${ERP_PREFIX}/credit-notes/insights`,
  transactionHistory: `${ERP_PREFIX}/credit-notes/history/transactions`,
  earningHistory: `${ERP_PREFIX}/credit-notes/history/earnings`,
  settlementHistory: `${ERP_PREFIX}/credit-notes/history/settlements`,
  purchaseInvoices: `${ERP_PREFIX}/credit-notes/purchase-invoices`,
  purchaseInvoice: (invoiceProjectionId: string) =>
    `${ERP_PREFIX}/credit-notes/purchase-invoices/${encodeURIComponent(invoiceProjectionId)}` as const,
  purchaseInvoiceDocument: (invoiceProjectionId: string) =>
    `${ERP_PREFIX}/credit-notes/purchase-invoices/${encodeURIComponent(invoiceProjectionId)}/document` as const,
} as const;

export const ZOHO_INVENTORY_ENDPOINTS = {
  base: `${ERP_PREFIX}/integrations/zoho-inventory`,
  authorizations: `${ERP_PREFIX}/integrations/zoho-inventory/authorizations`,
  oauthExchange: `${ERP_PREFIX}/integrations/zoho-inventory/oauth/exchange`,
  connections: `${ERP_PREFIX}/integrations/zoho-inventory/connections`,
  verifyConnection: (connectionId: string) =>
    `${ERP_PREFIX}/integrations/zoho-inventory/connections/${encodeURIComponent(connectionId)}/verify` as const,
  disconnectConnection: (connectionId: string) =>
    `${ERP_PREFIX}/integrations/zoho-inventory/connections/${encodeURIComponent(connectionId)}/disconnect` as const,
  syncJobs: (connectionId: string) =>
    `${ERP_PREFIX}/integrations/zoho-inventory/connections/${encodeURIComponent(connectionId)}/sync-jobs` as const,
  syncs: (connectionId: string) =>
    `${ERP_PREFIX}/integrations/zoho-inventory/connections/${encodeURIComponent(connectionId)}/syncs` as const,
} as const;

export type AuthStaticEndpoint = Exclude<
  (typeof AUTH_ENDPOINTS)[keyof typeof AUTH_ENDPOINTS],
  (sessionId: string) => string
>;
export type AuthEndpoint =
  AuthStaticEndpoint | ReturnType<typeof AUTH_ENDPOINTS.session>;
export type ErpApiEndpoint = `${typeof ERP_PREFIX}/${string}`;
export type ApiEndpoint = AuthEndpoint | ErpApiEndpoint;

export function isErpApiEndpoint(path: string): path is ErpApiEndpoint {
  return path === ERP_PREFIX || path.startsWith(`${ERP_PREFIX}/`);
}

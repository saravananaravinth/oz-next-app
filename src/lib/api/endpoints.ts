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
  dealerInventoryBase: `${ERP_PREFIX}/dealer/inventory`,
  dealerContexts: `${ERP_PREFIX}/dealer/inventory/contexts/dealers`,
  vehicles: `${ERP_PREFIX}/dealer/inventory/vehicles`,
  vehicleFacets: `${ERP_PREFIX}/dealer/inventory/vehicles/facets`,
  vehiclesExportCsv: `${ERP_PREFIX}/dealer/inventory/vehicles/export.csv`,
} as const;

export const ENGAGEMENT_ENDPOINTS = {
  dealerBase: `${ERP_PREFIX}/engagement/dealer`,
  dealerDashboard: `${ERP_PREFIX}/engagement/dealer/dashboard`,
  happyCustomers: `${ERP_PREFIX}/engagement/dealer/happy-customers`,
  happyCustomer: (ownerGuideId: string) =>
    `${ERP_PREFIX}/engagement/dealer/happy-customers/${encodeURIComponent(ownerGuideId)}` as const,
  happyCustomerSettings: `${ERP_PREFIX}/engagement/dealer/happy-customer-settings`,
  warrantyDocumentDownload: (fileId: string) =>
    `${ERP_PREFIX}/engagement/dealer/warranty-documents/${encodeURIComponent(fileId)}/download` as const,
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

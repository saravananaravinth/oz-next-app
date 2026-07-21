// oz-next-app/src/lib/api/http-contract.ts
import { env } from "@/lib/env/public-env";

export type ValueOf<T> = T[keyof T];

export const PROJECTS = {
  ERP: "ERP",
  CHARZO: "CHARZO",
  CONZO: "CONZO",
  PUBLIC: "PUBLIC",
} as const;

export type Project = ValueOf<typeof PROJECTS>;

export const APP_ENVIRONMENTS = {
  DEVELOPMENT: "development",
  STAGING: "staging",
  PRODUCTION: "production",
  TEST: "test",
  LOCAL: "local",
} as const;

export type AppEnvironment = ValueOf<typeof APP_ENVIRONMENTS>;

export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
  HEAD: "HEAD",
} as const;

export type HttpMethod = ValueOf<typeof HTTP_METHODS>;

export const SAFE_HTTP_METHODS = [HTTP_METHODS.GET, HTTP_METHODS.HEAD] as const;
export const MUTATING_HTTP_METHODS = [
  HTTP_METHODS.POST,
  HTTP_METHODS.PUT,
  HTTP_METHODS.PATCH,
  HTTP_METHODS.DELETE,
] as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export type HttpStatus = ValueOf<typeof HTTP_STATUS>;

export const HDR = {
  ACCEPT: "accept",
  AUTHORIZATION: "authorization",
  CONTENT_TYPE: "content-type",
  REQUEST_ID: "x-request-id",
  CORRELATION_ID: "x-correlation-id",
  IDEMPOTENCY_KEY: "idempotency-key",
  X_IDEMPOTENCY_KEY: "x-idempotency-key",
  TRACEPARENT: "traceparent",
  ORIGIN: "origin",
  CACHE_CONTROL: "cache-control",
  RETRY_AFTER: "retry-after",
  RATE_LIMIT_SCOPE: "x-ratelimit-scope",
  RATE_LIMIT_LIMIT: "x-ratelimit-limit",
  RATE_LIMIT_REMAINING: "x-ratelimit-remaining",
  TENANT_ID: "x-tenant-id",
  ORG_UNIT_ID: "x-org-unit-id",
  DEALER_ORG_UNIT_ID: "x-dealer-org-unit-id",
  FINANCIER_ID: "x-financier-id",
  CUSTOMER_ID: "x-customer-id",
} as const;

export const CT = {
  JSON: "application/json",
  PROBLEM_JSON: "application/problem+json",
  JWK_SET: "application/jwk-set+json",
  TEXT: "text/plain; charset=utf-8",
  CSV: "text/csv",
} as const;

export const CACHE_CONTROL = {
  NO_STORE: "no-store",
  PRIVATE_NO_STORE: "private, no-store, no-cache, must-revalidate",
} as const;

export const AUTH_COOKIE = {
  ACCESS: "oz_access",
  REFRESH: "oz_refresh",
  ACCESS_TOKEN: "oz_access_token",
  REFRESH_TOKEN: "oz_refresh_token",
  DEVICE_FINGERPRINT: "oz_device_fingerprint",
  SESSION: "oz_session",
  HOST_ACCESS_TOKEN: "__Host-oz_access_token",
  HOST_REFRESH_TOKEN: "__Host-oz_refresh_token",
  HOST_DEVICE_FINGERPRINT: "__Host-oz_device_fingerprint",
  HOST_SESSION: "__Host-oz_session",
  SECURE_ACCESS_TOKEN: "__Secure-oz_access_token",
  SECURE_REFRESH_TOKEN: "__Secure-oz_refresh_token",
  SECURE_SESSION: "__Secure-oz_session",
} as const;

export type AuthCookieName = ValueOf<typeof AUTH_COOKIE>;

/**
 * Browser code is intentionally limited to anonymous/public ERP operations.
 * Protected ERP requests must cross a Next.js server boundary where the
 * HttpOnly access token can be injected as a Bearer token.
 */
export const BROWSER_API_ALLOWED_EXACT_PATHS = [
  "/erp/auth/login/otp/request",
] as const;
export const BROWSER_API_ALLOWED_PREFIXES = ["/erp/engagement/public"] as const;

/**
 * Same-origin Next.js routes callable from browser transports. Keep this list
 * exact so adding a route is an explicit security decision.
 */
export const BROWSER_SAME_ORIGIN_ALLOWED_EXACT_PATHS = [
  "/api/auth/refresh",
  "/api/inventory/dealer-contexts",
  "/api/inventory/vehicles/export",
] as const;

/**
 * Server-only callers may reach authenticated ERP routes through oz-erp-edge.
 * Add future protected modules here deliberately; never allow the whole origin.
 */
export const SERVER_API_ALLOWED_PREFIXES = [
  "/erp/auth",
  "/erp/engagement",
  "/erp/dealer/inventory",
] as const;

/**
 * Operational and internal backend surfaces must never be reachable from the
 * Next.js application, even if the edge Worker also blocks them.
 */
export const BLOCKED_PUBLIC_BACKEND_PATHS = [
  "/tasks",
  "/metrics",
  "/readyz",
  "/healthz",
  "/livez",
  "/version",
  "/erp/metrics",
  "/erp/readyz",
  "/erp/healthz",
  "/erp/livez",
  "/erp/version",
] as const;

export const API_CONFIG = {
  baseUrl: env.NEXT_PUBLIC_API_BASE_URL,
  appEnv: env.NEXT_PUBLIC_APP_ENV,
  appVersion: env.NEXT_PUBLIC_APP_VERSION,
  appOrigin: env.NEXT_PUBLIC_APP_ORIGIN,
  clientId: env.NEXT_PUBLIC_AUTH_CLIENT_ID,
  project: PROJECTS.ERP,
  timeoutMs: 30_000,
} as const;

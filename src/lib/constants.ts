// oz-next-app/src/lib/constants.ts
import { env } from "@/lib/env";

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
  SESSION: "oz_session",
  HOST_ACCESS_TOKEN: "__Host-oz_access_token",
  HOST_REFRESH_TOKEN: "__Host-oz_refresh_token",
  HOST_SESSION: "__Host-oz_session",
  SECURE_ACCESS_TOKEN: "__Secure-oz_access_token",
  SECURE_REFRESH_TOKEN: "__Secure-oz_refresh_token",
  SECURE_SESSION: "__Secure-oz_session",
} as const;

export type AuthCookieName = ValueOf<typeof AUTH_COOKIE>;

export const PUBLIC_API_ALLOWED_PREFIXES = ["/erp"] as const;
export const BLOCKED_PUBLIC_BACKEND_PATHS = [
  "/tasks",
  "/metrics",
  "/readyz",
  "/healthz",
  "/livez",
  "/version",
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

// oz-next-app/src/features/erp/shared/clients/erp-feature.server.ts
import "server-only";

import { z, type ZodType } from "zod";

import { serverApiClient } from "@/lib/api-server";
import { HTTP_METHODS, type HttpMethod } from "@/lib/constants";
import type { ServerActorContextHeaders } from "@/server/api/request-context";

import { erpRoutePathSchema } from "../schemas/erp-common.schema";

export type ErpFeatureClientConfig = Readonly<{
  featureName: string;
  basePath: `/erp/${string}`;
}>;

export type ErpFeatureQueryPrimitive = string | number | boolean;
export type ErpFeatureQueryValue =
  | ErpFeatureQueryPrimitive
  | readonly ErpFeatureQueryPrimitive[]
  | null
  | undefined;

export type ErpFeatureRequestOptions<TData> = Readonly<{
  method?: HttpMethod;
  path?: string;
  query?: Readonly<Record<string, ErpFeatureQueryValue>>;
  body?: unknown;
  schema: ZodType<TData>;
  idempotencyKey?: string;
  auth?: boolean;
  refreshOnUnauthorized?: boolean;
  actorContext?: ServerActorContextHeaders;
}>;

const QUERY_KEY_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/u;
const PATH_SEGMENT_PATTERN = /^[A-Za-z0-9._~:-]{1,256}$/u;

function cleanPathSegment(value: string): string {
  const normalized = value.trim();

  if (!PATH_SEGMENT_PATTERN.test(normalized)) {
    throw new Error("erp_path_segment_invalid");
  }

  return encodeURIComponent(normalized);
}

function appendQueryValue(
  search: URLSearchParams,
  key: string,
  value: ErpFeatureQueryValue,
): void {
  if (value === undefined || value === null) {
    return;
  }

  if (!QUERY_KEY_PATTERN.test(key)) {
    throw new Error("erp_query_key_invalid");
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      search.append(key, String(item));
    }

    return;
  }

  search.set(key, String(value));
}

function serializeQuery(
  query: Readonly<Record<string, ErpFeatureQueryValue>> | undefined,
): string {
  if (query === undefined) {
    return "";
  }

  const search = new URLSearchParams();

  for (const key of Object.keys(query).sort()) {
    appendQueryValue(search, key, query[key]);
  }

  const serialized = search.toString();

  return serialized.length > 0 ? `?${serialized}` : "";
}

function normalizeBasePath(basePath: `/erp/${string}`): `/erp/${string}` {
  const parsed = erpRoutePathSchema("/erp/").parse(basePath);

  return parsed.replace(/\/+$/u, "") as `/erp/${string}`;
}

function joinFeaturePath(
  basePath: `/erp/${string}`,
  path: string | undefined,
): `/erp/${string}` {
  const normalizedBase = normalizeBasePath(basePath);

  if (path === undefined || path.trim().length === 0 || path.trim() === "/") {
    return normalizedBase;
  }

  const normalizedPath = path.trim();

  if (!normalizedPath.startsWith("/")) {
    throw new Error("erp_relative_path_must_start_with_slash");
  }

  if (normalizedPath.includes("?") || normalizedPath.includes("#")) {
    throw new Error("erp_relative_path_must_not_include_query");
  }

  const joined = `${normalizedBase}${normalizedPath}` as `/erp/${string}`;

  return erpRoutePathSchema(normalizedBase).parse(joined) as `/erp/${string}`;
}

function requestBodyFor(method: HttpMethod, body: unknown): unknown {
  if (method === HTTP_METHODS.GET || method === HTTP_METHODS.HEAD) {
    if (body !== undefined && body !== null) {
      throw new Error("erp_read_request_body_not_allowed");
    }

    return undefined;
  }

  return body;
}

function shouldRefreshOnUnauthorized(
  method: HttpMethod,
  requested: boolean | undefined,
): boolean {
  if (requested !== undefined) {
    return requested;
  }

  return method === HTTP_METHODS.GET || method === HTTP_METHODS.HEAD;
}

export function createErpFeatureClient(config: ErpFeatureClientConfig) {
  const basePath = normalizeBasePath(config.basePath);

  async function request<TData>(
    options: ErpFeatureRequestOptions<TData>,
  ): Promise<TData> {
    const method = options.method ?? HTTP_METHODS.GET;
    const path = `${joinFeaturePath(basePath, options.path)}${serializeQuery(options.query)}`;

    return await serverApiClient.request(path, {
      method,
      body: requestBodyFor(method, options.body),
      schema: options.schema,
      auth: options.auth ?? true,
      refreshOnUnauthorized: shouldRefreshOnUnauthorized(
        method,
        options.refreshOnUnauthorized,
      ),
      cache: "no-store",
      ...(options.idempotencyKey !== undefined
        ? { idempotencyKey: options.idempotencyKey }
        : {}),
      ...(options.actorContext !== undefined
        ? { actorContext: options.actorContext }
        : {}),
    });
  }

  return {
    featureName: config.featureName,
    basePath,

    request,

    list: <TData>(
      schema: ZodType<TData>,
      query?: ErpFeatureRequestOptions<TData>["query"],
      actorContext?: ServerActorContextHeaders,
    ) =>
      request({
        method: HTTP_METHODS.GET,
        schema,
        ...(query !== undefined ? { query } : {}),
        ...(actorContext !== undefined ? { actorContext } : {}),
      }),

    detail: <TData>(
      id: string,
      schema: ZodType<TData>,
      query?: ErpFeatureRequestOptions<TData>["query"],
      actorContext?: ServerActorContextHeaders,
    ) =>
      request({
        method: HTTP_METHODS.GET,
        path: `/${cleanPathSegment(id)}`,
        schema,
        ...(query !== undefined ? { query } : {}),
        ...(actorContext !== undefined ? { actorContext } : {}),
      }),

    create: <TData>(
      body: unknown,
      schema: ZodType<TData>,
      idempotencyKey: string,
      path?: string,
      actorContext?: ServerActorContextHeaders,
    ) =>
      request({
        method: HTTP_METHODS.POST,
        ...(path !== undefined ? { path } : {}),
        body,
        schema,
        idempotencyKey,
        refreshOnUnauthorized: false,
        ...(actorContext !== undefined ? { actorContext } : {}),
      }),

    update: <TData>(
      id: string,
      body: unknown,
      schema: ZodType<TData>,
      idempotencyKey: string,
      actorContext?: ServerActorContextHeaders,
    ) =>
      request({
        method: HTTP_METHODS.PATCH,
        path: `/${cleanPathSegment(id)}`,
        body,
        schema,
        idempotencyKey,
        refreshOnUnauthorized: false,
        ...(actorContext !== undefined ? { actorContext } : {}),
      }),

    remove: <TData>(
      id: string,
      schema: ZodType<TData> = z.null().transform(() => null as TData),
      idempotencyKey: string,
      actorContext?: ServerActorContextHeaders,
    ) =>
      request({
        method: HTTP_METHODS.DELETE,
        path: `/${cleanPathSegment(id)}`,
        schema,
        idempotencyKey,
        refreshOnUnauthorized: false,
        ...(actorContext !== undefined ? { actorContext } : {}),
      }),
  } as const;
}

export type ErpFeatureClient = ReturnType<typeof createErpFeatureClient>;

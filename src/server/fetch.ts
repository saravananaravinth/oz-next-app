// oz-next-app/src/server/fetch.ts
import "server-only";

import type { ZodType } from "zod";

import type { ApiEnvelopeResult } from "@/lib/api/envelope";

import {
  serverEdgeFetch,
  serverEdgeFetchEnvelope,
  type ServerApiEnvelopeOptions,
  type ServerApiOptions,
} from "@/server/api/server-client";

export type ServerFetchOptions<TData> = ServerApiOptions<TData>;
export type ServerEnvelopeFetchOptions<TData, TMeta> = ServerApiEnvelopeOptions<
  TData,
  TMeta
>;

export async function serverFetch<TData>(
  path: string,
  options: ServerApiOptions<TData>,
): Promise<TData> {
  return await serverEdgeFetch(path, options);
}

export async function serverEnvelopeFetch<TData, TMeta>(
  path: string,
  options: ServerApiEnvelopeOptions<TData, TMeta>,
): Promise<ApiEnvelopeResult<TData, TMeta>> {
  return await serverEdgeFetchEnvelope(path, options);
}

export async function serverJson<TData>(
  path: string,
  schema: ZodType<TData>,
  options?: Omit<ServerApiOptions<TData>, "schema">,
): Promise<TData> {
  return await serverEdgeFetch(path, {
    ...(options ?? {}),
    schema,
  });
}

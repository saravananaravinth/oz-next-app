// oz-next-app/src/lib/query/query-client.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { ApiHttpError } from "@/lib/api/problem";

const AUTHENTICATED_QUERY_STALE_TIME_MS = 0;
const QUERY_GC_TIME_MS = 5 * 60_000;
const MAX_QUERY_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 250;
const MAX_RETRY_DELAY_MS = 5_000;

function isRetryableApiError(error: ApiHttpError): boolean {
  if ([401, 403, 404, 409, 422].includes(error.status)) return false;
  return (
    error.status === 408 ||
    error.status === 425 ||
    error.status === 429 ||
    error.status >= 500
  );
}

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false;
  return error instanceof ApiHttpError ? isRetryableApiError(error) : true;
}

function retryDelay(failureCount: number, error: unknown): number {
  if (error instanceof ApiHttpError && error.retryAfterSeconds !== undefined)
    return Math.min(Math.max(error.retryAfterSeconds, 0), 30) * 1_000;
  return Math.min(
    BASE_RETRY_DELAY_MS * 2 ** Math.max(0, failureCount - 1),
    MAX_RETRY_DELAY_MS,
  );
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: AUTHENTICATED_QUERY_STALE_TIME_MS,
        gcTime: QUERY_GC_TIME_MS,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: shouldRetryQuery,
        retryDelay,
      },
      mutations: { retry: false },
    },
  });
}

export function AppQueryProvider(props: Readonly<{ children: ReactNode }>) {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>{props.children}</QueryClientProvider>
  );
}

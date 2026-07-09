// oz-next-app/src/features/auth/hooks/use-me.ts
"use client";

import { useQuery } from "@tanstack/react-query";

import { meQuery } from "../mutations/auth-mutations";
import { authQueryKeys } from "../queries/auth-query-keys";

const DEFAULT_ME_STALE_TIME_MS = 0;
const DEFAULT_ME_GC_TIME_MS = 30_000;

export type UseMeOptions = Readonly<{
  enabled?: boolean;
}>;

export function useMe(options?: UseMeOptions) {
  return useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: async () => await meQuery(),
    enabled: options?.enabled ?? false,
    staleTime: DEFAULT_ME_STALE_TIME_MS,
    gcTime: DEFAULT_ME_GC_TIME_MS,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export type UseMeResult = ReturnType<typeof useMe>;

// oz-next-app/src/features/auth/hooks/use-logout.ts
"use client";

import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { logoutMutation } from "@/features/auth/api/auth.client";
import { authMutationKeys } from "@/features/auth/api/auth-query-keys";

const SIGNED_OUT_LOGIN_PATH = "/login?reason=signed-out";

async function clearAllSessionScopedQueries(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.clear();
}

function replaceWithSignedOutLogin(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.location.replace(SIGNED_OUT_LOGIN_PATH);
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: authMutationKeys.logout(),
    mutationFn: async () => await logoutMutation(),
    retry: false,
    onMutate: async () => {
      await clearAllSessionScopedQueries(queryClient);
    },
    onSettled: async () => {
      await clearAllSessionScopedQueries(queryClient);
      replaceWithSignedOutLogin();
    },
  });
}

export type UseLogoutResult = ReturnType<typeof useLogout>;

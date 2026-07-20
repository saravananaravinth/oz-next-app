// oz-next-app/src/features/auth/hooks/use-login-verify.ts
"use client";

import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import {
  loginVerifyMutation,
  type LoginVerifyMutationInput,
} from "@/features/auth/api/auth.client";
import { authMutationKeys } from "@/features/auth/api/auth-query-keys";

type LoginVerifyMutationResult = Awaited<
  ReturnType<typeof loginVerifyMutation>
>;

export type UseLoginVerifyResult = UseMutationResult<
  LoginVerifyMutationResult,
  Error,
  LoginVerifyMutationInput
>;

async function clearSessionScopedQueryCache(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.clear();
}

export function useLoginVerify(): UseLoginVerifyResult {
  const queryClient = useQueryClient();

  return useMutation<
    LoginVerifyMutationResult,
    Error,
    LoginVerifyMutationInput
  >({
    mutationKey: authMutationKeys.loginVerify(),
    mutationFn: loginVerifyMutation,
    retry: false,
    onSuccess: async () => {
      await clearSessionScopedQueryCache(queryClient);
    },
  });
}

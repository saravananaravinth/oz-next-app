// oz-next-app/src/features/auth/hooks/use-login-start.ts
"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import {
  loginStartMutation,
  type LoginStartMutationInput,
} from "@/features/auth/api/auth.client";
import { authMutationKeys } from "@/features/auth/api/auth-query-keys";

type LoginStartMutationResult = Awaited<ReturnType<typeof loginStartMutation>>;

export type UseLoginStartResult = UseMutationResult<
  LoginStartMutationResult,
  Error,
  LoginStartMutationInput
>;

export function useLoginStart(): UseLoginStartResult {
  return useMutation<LoginStartMutationResult, Error, LoginStartMutationInput>({
    mutationKey: authMutationKeys.loginStart(),
    mutationFn: loginStartMutation,
    retry: false,
  });
}

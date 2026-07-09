// oz-next-app/src/features/auth/queries/auth-query-keys.ts
const AUTH_QUERY_ROOT_KEY = ["auth"] as const;

export const authQueryKeys = {
  all: AUTH_QUERY_ROOT_KEY,
  me: () => [...AUTH_QUERY_ROOT_KEY, "me"] as const,
} as const;

export const authMutationKeys = {
  loginStart: () => [...AUTH_QUERY_ROOT_KEY, "login-start"] as const,
  loginVerify: () => [...AUTH_QUERY_ROOT_KEY, "login-verify"] as const,
  logout: () => [...AUTH_QUERY_ROOT_KEY, "logout"] as const,
} as const;

export type AuthQueryKey =
  (typeof authQueryKeys)["all"] | ReturnType<(typeof authQueryKeys)["me"]>;
export type AuthMutationKey = ReturnType<
  (typeof authMutationKeys)[keyof typeof authMutationKeys]
>;

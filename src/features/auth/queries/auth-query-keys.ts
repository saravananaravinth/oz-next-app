// oz-next-app/src/features/auth/queries/auth-query-keys.ts
const AUTH_QUERY_ROOT_KEY = ["auth"] as const;

export type AuthSessionQueryScope = Readonly<{
  actorKind: string;
  tenantId: string | null;
  orgUnitId: string | null;
  dealerOrgUnitId: string | null;
  financierId: string | null;
  financierOrgUnitId: string | null;
  userId: string | null;
  customerId: string | null;
  customerLevels: readonly string[];
  sessionId: string | null;
  authorizationVersion: number | null;
}>;

export const authQueryKeys = {
  all: AUTH_QUERY_ROOT_KEY,
  me: () => [...AUTH_QUERY_ROOT_KEY, "me"] as const,
  sessions: (
    scope: AuthSessionQueryScope,
    input: Readonly<{ cursor: string | null; limit: number }>,
  ) =>
    [
      ...AUTH_QUERY_ROOT_KEY,
      "sessions",
      scope.actorKind,
      scope.tenantId,
      scope.orgUnitId,
      scope.dealerOrgUnitId,
      scope.financierId,
      scope.financierOrgUnitId,
      scope.userId,
      scope.customerId,
      [...scope.customerLevels].sort((left, right) =>
        left.localeCompare(right),
      ),
      scope.sessionId,
      scope.authorizationVersion,
      input.limit,
      input.cursor,
    ] as const,
} as const;

export const authMutationKeys = {
  loginStart: () => [...AUTH_QUERY_ROOT_KEY, "login-start"] as const,
  loginVerify: () => [...AUTH_QUERY_ROOT_KEY, "login-verify"] as const,
  logout: () => [...AUTH_QUERY_ROOT_KEY, "logout"] as const,
  revokeSession: () => [...AUTH_QUERY_ROOT_KEY, "revoke-session"] as const,
} as const;

export type AuthQueryKey =
  | (typeof authQueryKeys)["all"]
  | ReturnType<(typeof authQueryKeys)["me"]>
  | ReturnType<(typeof authQueryKeys)["sessions"]>;
export type AuthMutationKey = ReturnType<
  (typeof authMutationKeys)[keyof typeof authMutationKeys]
>;

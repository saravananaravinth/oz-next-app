// oz-next-app/src/features/auth/index.ts
export {
  AuthSessionsPage,
  type AuthSessionsPageProps,
} from "@/features/auth/ui/auth-sessions-page";
export { AuthErrorAlert } from "@/features/auth/ui/auth-error-alert";
export { LoginBrandMark } from "@/features/auth/ui/login-brand-mark";
export { LoginClient } from "@/features/auth/ui/login-client";
export { LoginClientFallback } from "@/features/auth/ui/login-client-fallback";
export { LoginStartForm } from "@/features/auth/ui/login-start-form";
export { OtpVerifyForm } from "@/features/auth/ui/otp-verify-form";
export { SessionExpiredCard } from "@/features/auth/ui/session-expired-card";

export {
  useLoginStart,
  type UseLoginStartResult,
} from "@/features/auth/hooks/use-login-start";
export {
  useLoginVerify,
  type UseLoginVerifyResult,
} from "@/features/auth/hooks/use-login-verify";
export {
  useLogout,
  type UseLogoutResult,
} from "@/features/auth/hooks/use-logout";
export {
  useMe,
  type UseMeOptions,
  type UseMeResult,
} from "@/features/auth/hooks/use-me";

export {
  loginStartMutation,
  loginVerifyMutation,
  logoutMutation,
  meQuery,
  toLoginVerifyFailure,
  toUserFacingAuthError,
  type LoginStartMutationInput,
  type LoginVerifyFailure,
  type LoginVerifyFailureKind,
  type LoginVerifyMutationInput,
  type UserFacingAuthError,
} from "@/features/auth/api/auth.client";

export {
  authMutationKeys,
  authQueryKeys,
  type AuthMutationKey,
  type AuthQueryKey,
} from "@/features/auth/api/auth-query-keys";

export type {
  LoginStartFormValues,
  LoginStartResult,
  OtpVerifyFormValues,
} from "@/features/auth/contracts/auth-form.schema";

export {
  DEFAULT_AUTH_SUCCESS_PATH,
  loginNoticeFromReason,
  safeNextPath,
  type AuthSuccessPath,
  type LoginNotice,
} from "@/features/auth/utils/auth-redirect";
export { maskIdentifier } from "@/features/auth/utils/mask-identifier";

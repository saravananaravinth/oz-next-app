// oz-next-app/src/features/auth/index.ts
export { AuthErrorAlert } from "./components/auth-error-alert";
export { LoginBrandMark } from "./components/login-brand-mark";
export { LoginClient } from "./components/login-client";
export { LoginClientFallback } from "./components/login-client-fallback";
export { LoginStartForm } from "./components/login-start-form";
export { OtpVerifyForm } from "./components/otp-verify-form";
export { SessionExpiredCard } from "./components/session-expired-card";

export {
  useLoginStart,
  type UseLoginStartResult,
} from "./hooks/use-login-start";
export {
  useLoginVerify,
  type UseLoginVerifyResult,
} from "./hooks/use-login-verify";
export { useLogout, type UseLogoutResult } from "./hooks/use-logout";
export { useMe, type UseMeOptions, type UseMeResult } from "./hooks/use-me";

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
} from "./mutations/auth-mutations";

export {
  authMutationKeys,
  authQueryKeys,
  type AuthMutationKey,
  type AuthQueryKey,
} from "./queries/auth-query-keys";

export type {
  LoginStartFormValues,
  LoginStartResult,
  OtpVerifyFormValues,
} from "./schemas/auth-form-schemas";

export {
  DEFAULT_AUTH_SUCCESS_PATH,
  loginNoticeFromReason,
  safeNextPath,
  type AuthSuccessPath,
  type LoginNotice,
} from "./utils/auth-redirect";
export { maskIdentifier } from "./utils/mask-identifier";

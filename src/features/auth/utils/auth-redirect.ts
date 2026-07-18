// oz-next-app/src/features/auth/utils/auth-redirect.ts
export const DEFAULT_AUTH_SUCCESS_PATH = "/dashboard";

export type AuthSuccessPath = `/${string}`;

type LoginNoticeKind =
  "session-expired" | "signed-out" | "unauthorized" | "backend-unavailable";

export type LoginNotice = Readonly<{
  kind: LoginNoticeKind;
  title: string;
  description: string;
}>;

const MAX_NEXT_PATH_LENGTH = 1_500;
const DELETE_CONTROL_CHARACTER_CODE = 127;

const LOGIN_NOTICE_BY_REASON = {
  "session-expired": {
    kind: "session-expired",
    title: "Session expired",
    description: "Sign in again to continue working securely.",
  },
  "signed-out": {
    kind: "signed-out",
    title: "You have been signed out",
    description: "Sign in again when you are ready to continue.",
  },
  unauthorized: {
    kind: "unauthorized",
    title: "Sign-in required",
    description: "Your workspace requires a verified session.",
  },
  "backend-unavailable": {
    kind: "backend-unavailable",
    title: "Authentication is temporarily unavailable",
    description:
      "Your existing session was preserved. Retry when connectivity is restored.",
  },
} as const satisfies Record<LoginNoticeKind, LoginNotice>;

const PUBLIC_OR_UNSAFE_EXACT_PATHS = new Set<string>([
  "/",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/api",
]);

const PUBLIC_OR_UNSAFE_PREFIXES = [
  "/api/",
  "/_next/",
  "/images/",
  "/icons/",
  "/fonts/",
  "/tasks/",
  "/internal/",
  "/.well-known/",
] as const;

const UNSAFE_ENCODED_PATH_MARKERS = ["%00", "%2e", "%2f", "%5c"] as const;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code <= 31 || code === DELETE_CONTROL_CHARACTER_CODE) {
      return true;
    }
  }

  return false;
}

function hasBlockedPrefix(pathname: string): boolean {
  return PUBLIC_OR_UNSAFE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
}

function hasUnsafeEncoding(value: string): boolean {
  const lower = value.toLowerCase();

  return UNSAFE_ENCODED_PATH_MARKERS.some((marker) => lower.includes(marker));
}

function isLoginNoticeKind(value: string): value is LoginNoticeKind {
  return (
    value === "session-expired" ||
    value === "signed-out" ||
    value === "unauthorized" ||
    value === "backend-unavailable"
  );
}

function isSafeAppRelativePath(value: string): value is AuthSuccessPath {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !hasControlCharacter(value)
  );
}

function isAllowedAuthSuccessPath(
  pathname: string,
): pathname is AuthSuccessPath {
  return (
    isSafeAppRelativePath(pathname) &&
    !PUBLIC_OR_UNSAFE_EXACT_PATHS.has(pathname) &&
    !hasBlockedPrefix(pathname) &&
    !pathname.split("/").includes("..")
  );
}

export function safeNextPath(input: string | null): AuthSuccessPath {
  if (input === null) {
    return DEFAULT_AUTH_SUCCESS_PATH;
  }

  const value = input.trim();

  if (
    value.length === 0 ||
    value.length > MAX_NEXT_PATH_LENGTH ||
    !isSafeAppRelativePath(value) ||
    hasUnsafeEncoding(value)
  ) {
    return DEFAULT_AUTH_SUCCESS_PATH;
  }

  try {
    const parsed = new URL(value, "https://app.local");

    if (
      parsed.origin !== "https://app.local" ||
      !isAllowedAuthSuccessPath(parsed.pathname)
    ) {
      return DEFAULT_AUTH_SUCCESS_PATH;
    }

    const nextPath = `${parsed.pathname}${parsed.search}`;

    return nextPath.length <= MAX_NEXT_PATH_LENGTH &&
      isSafeAppRelativePath(nextPath)
      ? nextPath
      : DEFAULT_AUTH_SUCCESS_PATH;
  } catch {
    return DEFAULT_AUTH_SUCCESS_PATH;
  }
}

export function loginNoticeFromReason(
  input: string | null,
): LoginNotice | null {
  if (input === null) {
    return null;
  }

  const key = input.trim();

  return isLoginNoticeKind(key) ? LOGIN_NOTICE_BY_REASON[key] : null;
}

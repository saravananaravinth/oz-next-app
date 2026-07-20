// oz-next-app/src/features/auth/ui/auth-error-alert.tsx
import { TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import type { UserFacingAuthError } from "@/features/auth/api/auth.client";

const MAX_AUTH_ERROR_TITLE_LENGTH = 160;
const MAX_AUTH_ERROR_DESCRIPTION_LENGTH = 420;
const MAX_AUTH_ERROR_REFERENCE_LENGTH = 128;

const DEFAULT_AUTH_ERROR_TITLE = "Authentication failed";
const DEFAULT_AUTH_ERROR_DESCRIPTION =
  "Your sign-in request could not be completed. Please try again.";

const CONTROL_CHARACTER_REPLACEMENT = " ";
const DELETE_CONTROL_CHARACTER_CODE = 127;
const WHITESPACE_PATTERN = /\s+/gu;
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9_.:/@-]+$/u;

function isUnsafeControlCode(code: number): boolean {
  return code <= 31 || code === DELETE_CONTROL_CHARACTER_CODE;
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (isUnsafeControlCode(value.charCodeAt(index))) {
      return true;
    }
  }

  return false;
}

function replaceControlCharacters(value: string): string {
  let output = "";
  let changed = false;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (isUnsafeControlCode(code)) {
      output += CONTROL_CHARACTER_REPLACEMENT;
      changed = true;
      continue;
    }

    output += value.charAt(index);
  }

  return changed ? output : value;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizeUserFacingText(
  value: string,
  maxLength: number,
  fallback: string,
): string {
  const normalized = replaceControlCharacters(value)
    .replace(WHITESPACE_PATTERN, " ")
    .trim();

  return truncateText(normalized.length > 0 ? normalized : fallback, maxLength);
}

function safeReference(value: string | null | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }

  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_AUTH_ERROR_REFERENCE_LENGTH ||
    hasControlCharacter(normalized) ||
    !SAFE_REFERENCE_PATTERN.test(normalized)
  ) {
    return undefined;
  }

  return normalized;
}

export function AuthErrorAlert({
  error,
}: Readonly<{ error: UserFacingAuthError }>) {
  const title = normalizeUserFacingText(
    error.title,
    MAX_AUTH_ERROR_TITLE_LENGTH,
    DEFAULT_AUTH_ERROR_TITLE,
  );
  const description = normalizeUserFacingText(
    error.description,
    MAX_AUTH_ERROR_DESCRIPTION_LENGTH,
    DEFAULT_AUTH_ERROR_DESCRIPTION,
  );
  const requestId = safeReference(error.requestId);

  return (
    <Alert
      variant="destructive"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <TriangleAlert aria-hidden="true" />
      <AlertTitle className="text-card-title">{title}</AlertTitle>
      <AlertDescription className="text-body-sm">
        <span className="block break-words">{description}</span>
        {requestId !== undefined ? (
          <span className="mt-1 block text-caption">
            Reference ID:{" "}
            <code className="break-all text-tabular">{requestId}</code>
          </span>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

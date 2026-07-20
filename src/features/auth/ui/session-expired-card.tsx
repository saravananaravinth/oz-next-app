// oz-next-app/src/features/auth/ui/session-expired-card.tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import type { LoginNotice } from "@/features/auth/utils/auth-redirect";

const MAX_NOTICE_TITLE_LENGTH = 160;
const MAX_NOTICE_DESCRIPTION_LENGTH = 420;

const DEFAULT_NOTICE_TITLE = "Sign-in required";
const DEFAULT_NOTICE_DESCRIPTION = "Please sign in again to continue.";

const CONTROL_CHARACTER_REPLACEMENT = " ";
const DELETE_CONTROL_CHARACTER_CODE = 127;
const WHITESPACE_PATTERN = /\s+/gu;

function isUnsafeControlCode(code: number): boolean {
  return code <= 31 || code === DELETE_CONTROL_CHARACTER_CODE;
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

function truncateNoticeText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizeNoticeText(
  value: string,
  maxLength: number,
  fallback: string,
): string {
  const normalized = replaceControlCharacters(value)
    .replace(WHITESPACE_PATTERN, " ")
    .trim();

  return truncateNoticeText(
    normalized.length > 0 ? normalized : fallback,
    maxLength,
  );
}

export function SessionExpiredCard({
  notice,
}: Readonly<{ notice: LoginNotice }>) {
  const title = normalizeNoticeText(
    notice.title,
    MAX_NOTICE_TITLE_LENGTH,
    DEFAULT_NOTICE_TITLE,
  );
  const description = normalizeNoticeText(
    notice.description,
    MAX_NOTICE_DESCRIPTION_LENGTH,
    DEFAULT_NOTICE_DESCRIPTION,
  );

  return (
    <Alert role="status" aria-live="polite" aria-atomic="true">
      <AlertTitle className="text-card-title">{title}</AlertTitle>
      <AlertDescription className="text-body-sm text-muted-readable">
        {description}
      </AlertDescription>
    </Alert>
  );
}

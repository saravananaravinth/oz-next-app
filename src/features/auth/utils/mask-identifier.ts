// oz-next-app/src/features/auth/utils/mask-identifier.ts
const MAX_IDENTIFIER_LENGTH = 320;
const DELETE_CONTROL_CHARACTER_CODE = 127;
const EMAIL_SEPARATOR = "@";
const ACCOUNT_FALLBACK_LABEL = "your account";
const DIGIT_PATTERN = /\D/gu;

function isUnsafeControlCode(code: number): boolean {
  return code <= 31 || code === DELETE_CONTROL_CHARACTER_CODE;
}

function replaceControlCharacters(value: string): string {
  let output = "";
  let changed = false;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (isUnsafeControlCode(code)) {
      output += " ";
      changed = true;
      continue;
    }

    output += value.charAt(index);
  }

  return changed ? output : value;
}

function normalizeIdentifier(input: string): string {
  return replaceControlCharacters(input).trim().slice(0, MAX_IDENTIFIER_LENGTH);
}

function maskEmailLocalPart(value: string): string {
  if (value.length === 0) {
    return "*";
  }

  if (value.length <= 2) {
    return `${value.at(0) ?? "*"}***`;
  }

  return `${value.slice(0, 2)}***`;
}

function maskEmailDomain(value: string): string {
  if (value.length === 0) {
    return "***";
  }

  if (value.length <= 3) {
    return `${value.at(0) ?? "*"}***`;
  }

  return `${value.slice(0, 1)}***${value.slice(-3)}`;
}

function maskEmail(value: string): string | null {
  const segments = value.split(EMAIL_SEPARATOR);

  if (segments.length !== 2) {
    return null;
  }

  const [name, domain] = segments;
  if (
    name === undefined ||
    domain === undefined ||
    name.length === 0 ||
    domain.length === 0
  ) {
    return null;
  }

  return `${maskEmailLocalPart(name)}@${maskEmailDomain(domain)}`;
}

function maskPhoneLikeIdentifier(value: string): string | null {
  const digits = value.replace(DIGIT_PATTERN, "");
  const tail = digits.slice(-4);

  return tail.length > 0 ? `••••••${tail}` : null;
}

export function maskIdentifier(input: string): string {
  const value = normalizeIdentifier(input);

  if (value.length === 0) {
    return ACCOUNT_FALLBACK_LABEL;
  }

  const maskedEmail = maskEmail(value);
  if (maskedEmail !== null) {
    return maskedEmail;
  }

  return maskPhoneLikeIdentifier(value) ?? ACCOUNT_FALLBACK_LABEL;
}

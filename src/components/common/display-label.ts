// oz-next-app/src/components/common/display-label.ts
const DEFAULT_MAX_DISPLAY_LABEL_LENGTH = 120;
const MAX_DISPLAY_LABEL_LENGTH = 512;
const MAX_UNIQUE_DISPLAY_LABELS = 100;

const C0_CONTROL_CHARACTER_MAX_CODE = 0x1f;
const DELETE_CONTROL_CHARACTER_CODE = 0x7f;

const WHITESPACE_RE = /\s+/gu;
const WORD_SEPARATOR_RE = /[_\-.:/]+/gu;
const DISPLAY_WORD_TOKEN_RE = /[\p{L}\p{M}\p{N}]+/gu;
const LEADING_NUMBER_TOKEN_RE = /^(\p{N}+)(\p{L}+)$/u;
const TRAILING_NUMBER_TOKEN_RE = /^(\p{L}+)(\p{N}+)$/u;
const ACRONYM_BOUNDARY_RE = /([\p{Lu}]+)([\p{Lu}][\p{Ll}])/gu;
const CAMEL_CASE_BOUNDARY_RE = /([\p{Ll}])([\p{Lu}])/gu;

const ACRONYM_LABELS = new Map<string, string>([
  ["2fa", "2FA"],
  ["ac", "AC"],
  ["api", "API"],
  ["cin", "CIN"],
  ["crm", "CRM"],
  ["csv", "CSV"],
  ["db", "DB"],
  ["dc", "DC"],
  ["ekyc", "eKYC"],
  ["erp", "ERP"],
  ["ev", "EV"],
  ["gst", "GST"],
  ["hsn", "HSN"],
  ["id", "ID"],
  ["ifsc", "IFSC"],
  ["imei", "IMEI"],
  ["ivr", "IVR"],
  ["jwt", "JWT"],
  ["kyc", "KYC"],
  ["lfp", "LFP"],
  ["lmfp", "LMFP"],
  ["mfa", "MFA"],
  ["oem", "OEM"],
  ["nmc", "NMC"],
  ["otp", "OTP"],
  ["pan", "PAN"],
  ["pdf", "PDF"],
  ["r2", "R2"],
  ["rto", "RTO"],
  ["sku", "SKU"],
  ["sla", "SLA"],
  ["sms", "SMS"],
  ["std", "STD"],
  ["ui", "UI"],
  ["upi", "UPI"],
  ["url", "URL"],
  ["uuid", "UUID"],
  ["vin", "VIN"],
  ["whatsapp", "WhatsApp"],
]);

const MEASUREMENT_UNIT_LABELS = new Map<string, string>([
  ["a", "A"],
  ["ah", "Ah"],
  ["kw", "kW"],
  ["kwh", "kWh"],
  ["mah", "mAh"],
  ["v", "V"],
  ["w", "W"],
]);

function isControlCharacterCode(code: number): boolean {
  return (
    code <= C0_CONTROL_CHARACTER_MAX_CODE ||
    code === DELETE_CONTROL_CHARACTER_CODE
  );
}

function replaceControlCharacters(value: string): string {
  let output: string | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (isControlCharacterCode(code)) {
      output ??= value.slice(0, index);
      output += " ";
      continue;
    }

    if (output !== null) {
      output += value.charAt(index);
    }
  }

  return output ?? value;
}

function safeMaxLength(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_MAX_DISPLAY_LABEL_LENGTH;
  }

  return Math.min(Math.max(1, Math.trunc(value)), MAX_DISPLAY_LABEL_LENGTH);
}

function truncateDisplayText(value: string, maxLength: number): string {
  const boundedMaxLength = safeMaxLength(maxLength);

  if (value.length <= boundedMaxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, boundedMaxLength - 1)).trimEnd()}…`;
}

function normalizeDisplayText(value: string): string {
  return replaceControlCharacters(value).replace(WHITESPACE_RE, " ").trim();
}

export function cleanDisplayText(
  value: string | null | undefined,
  fallback: string,
  maxLength = DEFAULT_MAX_DISPLAY_LABEL_LENGTH,
): string {
  const normalized = normalizeDisplayText(value ?? "");
  const normalizedFallback = normalizeDisplayText(fallback);
  const resolved = normalized.length > 0 ? normalized : normalizedFallback;

  return truncateDisplayText(resolved, maxLength);
}

function capitalizeWord(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/^\p{L}/u, (character) => character.toLocaleUpperCase("en-US"));
}

function formatToken(value: string): string {
  const lower = value.toLocaleLowerCase("en-US");
  const acronym = ACRONYM_LABELS.get(lower);

  if (acronym !== undefined) {
    return acronym;
  }

  const leadingNumber = LEADING_NUMBER_TOKEN_RE.exec(value);
  if (leadingNumber !== null) {
    const numericPart = leadingNumber[1];
    const unitPart = leadingNumber[2];

    if (numericPart !== undefined && unitPart !== undefined) {
      const unit =
        MEASUREMENT_UNIT_LABELS.get(unitPart.toLocaleLowerCase("en-US")) ??
        capitalizeWord(unitPart);
      return `${numericPart}${unit}`;
    }
  }

  const trailingNumber = TRAILING_NUMBER_TOKEN_RE.exec(value);
  if (trailingNumber !== null) {
    const wordPart = trailingNumber[1];
    const numericPart = trailingNumber[2];

    if (wordPart !== undefined && numericPart !== undefined) {
      const word =
        ACRONYM_LABELS.get(wordPart.toLocaleLowerCase("en-US")) ??
        capitalizeWord(wordPart);
      return `${word}${numericPart}`;
    }
  }

  return capitalizeWord(value);
}

export function formatCapitalizedDisplayText(
  value: string | null | undefined,
  fallback: string,
  maxLength = DEFAULT_MAX_DISPLAY_LABEL_LENGTH,
): string {
  const cleaned = cleanDisplayText(value, fallback, maxLength);

  if (cleaned.length === 0) {
    return "";
  }

  const formatted = cleaned.replace(DISPLAY_WORD_TOKEN_RE, formatToken);

  return truncateDisplayText(formatted, maxLength);
}

export function formatCapitalizedDisplayList(
  values: ReadonlyArray<string | null | undefined>,
  fallback: string,
  separator = " · ",
  maxLength = DEFAULT_MAX_DISPLAY_LABEL_LENGTH,
): string {
  const formattedValues = values
    .map((value) => formatCapitalizedDisplayText(value, "", maxLength))
    .filter((value) => value.length > 0);

  if (formattedValues.length === 0) {
    return cleanDisplayText(fallback, "", maxLength);
  }

  return truncateDisplayText(formattedValues.join(separator), maxLength);
}

function normalizeLabelText(value: string): string {
  return value
    .replace(ACRONYM_BOUNDARY_RE, "$1 $2")
    .replace(CAMEL_CASE_BOUNDARY_RE, "$1 $2")
    .replace(WORD_SEPARATOR_RE, " ")
    .replace(WHITESPACE_RE, " ")
    .trim();
}

export function formatDisplayLabel(
  value: string | null | undefined,
  fallback: string,
  maxLength = DEFAULT_MAX_DISPLAY_LABEL_LENGTH,
): string {
  const cleaned = cleanDisplayText(value, fallback, maxLength);
  const normalized = normalizeLabelText(cleaned);

  if (normalized.length === 0) {
    return cleanDisplayText(fallback, "", maxLength);
  }

  const formatted = normalized
    .split(" ")
    .filter((part) => part.length > 0)
    .map(formatToken)
    .join(" ");

  return truncateDisplayText(formatted, maxLength);
}

export function formatRoleLabel(
  value: string | null | undefined,
  fallback = "Workspace user",
  maxLength = DEFAULT_MAX_DISPLAY_LABEL_LENGTH,
): string {
  return formatDisplayLabel(value, fallback, maxLength);
}

export function formatUniqueRoleLabels(
  values: readonly string[],
): readonly string[] {
  const roles: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (roles.length >= MAX_UNIQUE_DISPLAY_LABELS) {
      break;
    }

    const role = formatRoleLabel(value, "");
    const dedupeKey = role.toLocaleLowerCase("en-US");

    if (role.length === 0 || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    roles.push(role);
  }

  return roles;
}

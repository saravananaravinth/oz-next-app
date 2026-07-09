// oz-next-app/src/features/erp/shared/adapters/erp-adapter.ts
import type { Route } from "next";

const MAX_DISPLAY_TEXT_LENGTH = 240;
const MAX_HREF_LENGTH = 2_048;

const CONTROL_CHARACTER_PATTERN = new RegExp(
  String.raw`[\u0000-\u001F\u007F]`,
  "gu",
);
const CONTROL_CHARACTER_TEST_PATTERN = new RegExp(
  String.raw`[\u0000-\u001F\u007F]`,
  "u",
);
const WHITESPACE_PATTERN = /\s+/gu;
const UNSAFE_ENCODED_PATH_PATTERN = /%(?:00|2e|2f|5c)/iu;
const SENSITIVE_QUERY_PATTERN =
  /[?&#](?:access_token|refresh_token|id_token|token|jwt|session|secret|password|email|phone|mobile|tenant|tenant_id)=/iu;

export type StatusTone =
  "default" | "success" | "warning" | "destructive" | "muted";

export function toDisplayText(
  value: unknown,
  fallback = "—",
  maxLength = MAX_DISPLAY_TEXT_LENGTH,
): string {
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    return fallback;
  }

  const normalized = String(value)
    .replace(CONTROL_CHARACTER_PATTERN, " ")
    .replace(WHITESPACE_PATTERN, " ")
    .trim();

  if (normalized.length === 0) {
    return fallback;
  }

  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function toNullableDisplayText(
  value: unknown,
  maxLength = MAX_DISPLAY_TEXT_LENGTH,
): string | null {
  const normalized = toDisplayText(value, "", maxLength);

  return normalized.length > 0 ? normalized : null;
}

export function toIsoDateTime(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function toHumanDateTime(value: unknown): string {
  const iso = toIsoDateTime(value);

  if (iso === null) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function toStatusTone(value: unknown): StatusTone {
  const normalized =
    typeof value === "string" ? value.trim().toLowerCase() : "";

  if (
    normalized.includes("active") ||
    normalized.includes("approved") ||
    normalized.includes("completed") ||
    normalized.includes("success")
  ) {
    return "success";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("draft") ||
    normalized.includes("waiting")
  ) {
    return "warning";
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("rejected") ||
    normalized.includes("cancelled") ||
    normalized.includes("blocked") ||
    normalized.includes("error")
  ) {
    return "destructive";
  }

  if (normalized.length === 0 || normalized.includes("unknown")) {
    return "muted";
  }

  return "default";
}

function stripQueryHash(value: string): string {
  return value.split(/[?#]/u, 1)[0] ?? value;
}

function isSafeRelativeRoute(value: string): value is Route {
  return !(
    value.length === 0 ||
    value.length > MAX_HREF_LENGTH ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    CONTROL_CHARACTER_TEST_PATTERN.test(value) ||
    UNSAFE_ENCODED_PATH_PATTERN.test(value) ||
    SENSITIVE_QUERY_PATTERN.test(value) ||
    stripQueryHash(value).split("/").includes("..")
  );
}

export function toSafeRelativeRoute(
  value: unknown,
  fallback: Route = "/dashboard",
): Route {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();

  return isSafeRelativeRoute(normalized) ? normalized : fallback;
}

export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function toIntegerOrNull(value: unknown): number | null {
  const parsed = toNumberOrNull(value);

  return parsed === null ? null : Math.trunc(parsed);
}

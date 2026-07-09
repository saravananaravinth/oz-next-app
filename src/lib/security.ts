// oz-next-app/src/lib/security.ts
import type { Route } from "next";

const MAX_PATH_LENGTH = 2_048;
const DELETE_CHARACTER_CODE = 127;
const UNSAFE_ENCODED_PATH_RE = /%(?:00|2e|2f|5c)/iu;
const SAFE_PUBLIC_ASSET_RE =
  /^\/[A-Za-z0-9][A-Za-z0-9_./-]*\.(?:avif|bmp|gif|ico|jpg|jpeg|png|svg|webp|woff|woff2)$/iu;
const ALLOWED_IMAGE_ORIGINS = new Set([
  "https://erp.ozotecev.com",
  "https://www.ozotecev.com",
]);

function pathname(value: string): string {
  const separatorIndex = value.search(/[?#]/u);

  return separatorIndex === -1 ? value : value.slice(0, separatorIndex);
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code < 32 || code === DELETE_CHARACTER_CODE) {
      return true;
    }
  }

  return false;
}

function isSafeRelativePath(value: string): boolean {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.length > MAX_PATH_LENGTH
  ) {
    return false;
  }

  if (
    value.includes("\\") ||
    hasControlCharacter(value) ||
    UNSAFE_ENCODED_PATH_RE.test(value)
  ) {
    return false;
  }

  return !pathname(value).split("/").includes("..");
}

export function safeInternalHref(
  value: string | null | undefined,
  fallback: Route = "/dashboard",
): Route {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  return isSafeRelativePath(trimmed) ? (trimmed as Route) : fallback;
}

export function safeAssetPath(
  value: string | null | undefined,
  fallback: `/${string}`,
): `/${string}` {
  const trimmed = value?.trim() ?? "";

  if (SAFE_PUBLIC_ASSET_RE.test(trimmed) && isSafeRelativePath(trimmed)) {
    return trimmed as `/${string}`;
  }

  return fallback;
}

export function safeImageSrc(
  value: string | null | undefined,
  fallback = "/icon-light.svg",
): string {
  const trimmed = value?.trim() ?? "";

  if (trimmed.length === 0) {
    return fallback;
  }

  if (trimmed.startsWith("/") && isSafeRelativePath(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);

    return ALLOWED_IMAGE_ORIGINS.has(url.origin) &&
      !hasControlCharacter(trimmed)
      ? url.toString()
      : fallback;
  } catch {
    return fallback;
  }
}

export function maskText(value: string, visibleEnd = 4): string {
  const normalized = value.trim();

  if (normalized.length <= visibleEnd) {
    return "•".repeat(Math.max(4, normalized.length));
  }

  return `${"•".repeat(Math.max(4, normalized.length - visibleEnd))}${normalized.slice(-visibleEnd)}`;
}

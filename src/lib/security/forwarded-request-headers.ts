// oz-next-app/src/lib/security/forwarded-request-headers.ts

export type ForwardedRequestContext = Readonly<{
  requestId: string;
  correlationId: string;
  currentPath: string;
}>;

const FORWARDED_REQUEST_HEADER_NAMES = [
  "accept",
  "accept-encoding",
  "accept-language",
  "cache-control",
  "content-length",
  "content-type",
  "cookie",
  "host",
  "if-match",
  "if-modified-since",
  "if-none-match",
  "if-unmodified-since",
  "origin",
  "pragma",
  "purpose",
  "range",
  "referer",
  "rsc",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "sec-fetch-user",
  "sec-purpose",
  "traceparent",
  "tracestate",
  "user-agent",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-nextjs-data",
  "x-nextjs-postponed",
  "x-nextjs-resume",
  "x-requested-with",
  "next-action",
  "next-router-prefetch",
  "next-router-segment-prefetch",
  "next-router-state-tree",
  "next-url",
] as const;

const MAX_FORWARDED_HEADER_VALUE_CHARS = 64 * 1024;
const ASCII_HORIZONTAL_TAB = 0x09;
const ASCII_PRINTABLE_MIN = 0x20;
const ASCII_PRINTABLE_MAX = 0x7e;

function isAsciiHeaderValue(value: string): boolean {
  if (value.length > MAX_FORWARDED_HEADER_VALUE_CHARS) {
    return false;
  }

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code === ASCII_HORIZONTAL_TAB) {
      continue;
    }

    if (code < ASCII_PRINTABLE_MIN || code > ASCII_PRINTABLE_MAX) {
      return false;
    }
  }

  return true;
}

function copyHeaderIfSafe(
  source: Headers,
  target: Headers,
  name: (typeof FORWARDED_REQUEST_HEADER_NAMES)[number],
): void {
  const value = source.get(name);

  if (value !== null && isAsciiHeaderValue(value)) {
    target.set(name, value);
  }
}

export function buildForwardedRequestHeaders(
  source: Headers,
  context: ForwardedRequestContext,
): Headers {
  const target = new Headers();

  for (const name of FORWARDED_REQUEST_HEADER_NAMES) {
    copyHeaderIfSafe(source, target, name);
  }

  target.set("x-request-id", context.requestId);
  target.set("x-correlation-id", context.correlationId);
  target.set("x-oz-current-path", context.currentPath);

  return target;
}

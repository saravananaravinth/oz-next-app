// oz-next-app/src/lib/observability/logger.ts
export type LogLevel = "debug" | "info" | "warn" | "error";
export type SafeLogValue =
  | string
  | number
  | boolean
  | null
  | readonly SafeLogValue[]
  | { readonly [key: string]: SafeLogValue | undefined };

export type SafeLogFields = Readonly<Record<string, SafeLogValue | undefined>>;

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const JWT_RE =
  /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gu;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/giu;
const LONG_NUMBER_RE = /\b\d{7,}\b/gu;

function redactString(value: string): string {
  return value
    .replace(BEARER_RE, "Bearer [redacted]")
    .replace(JWT_RE, "[jwt-redacted]")
    .replace(EMAIL_RE, "[email-redacted]")
    .replace(LONG_NUMBER_RE, "[number-redacted]");
}

function sanitize(value: SafeLogValue | undefined): SafeLogValue | undefined {
  if (typeof value === "string") {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map(
      (item: SafeLogValue): SafeLogValue => sanitize(item) ?? null,
    );
  }

  if (value !== null && typeof value === "object") {
    const output: Record<string, SafeLogValue> = {};

    for (const [key, nested] of Object.entries(value)) {
      if (nested !== undefined) {
        output[key] = sanitize(nested) ?? null;
      }
    }

    return output;
  }

  return value;
}

function write(
  level: LogLevel,
  event: string,
  fields: SafeLogFields = {},
): void {
  const payload: Record<string, SafeLogValue> = { event };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      payload[key] = sanitize(value) ?? null;
    }
  }

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
  }
}

export const logger = {
  debug(event: string, fields?: SafeLogFields): void {
    write("debug", event, fields);
  },
  info(event: string, fields?: SafeLogFields): void {
    write("info", event, fields);
  },
  warn(event: string, fields?: SafeLogFields): void {
    write("warn", event, fields);
  },
  error(event: string, fields?: SafeLogFields): void {
    write("error", event, fields);
  },
} as const;

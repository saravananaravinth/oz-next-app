// oz-next-app/src/lib/uuid.ts
const SAFE_ID_PREFIX_RE = /^[A-Za-z][A-Za-z0-9_-]{0,24}$/u;
const MAX_REQUEST_ID_LENGTH = 128;

function normalizePrefix(prefix: string): string {
  return SAFE_ID_PREFIX_RE.test(prefix) ? prefix : "req";
}

export function requestId(prefix = "req"): string {
  const value = `${normalizePrefix(prefix)}_${crypto.randomUUID()}`;
  return value.slice(0, MAX_REQUEST_ID_LENGTH);
}

export function correlationId(prefix = "corr"): string {
  return requestId(prefix);
}

export function idempotencyKey(prefix = "idem"): string {
  return requestId(prefix);
}

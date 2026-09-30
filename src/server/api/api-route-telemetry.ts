// oz-next-app/src/server/api/api-route-telemetry.ts
const UUID_SEGMENT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const INTEGER_IDENTIFIER_PATTERN = /^\d{6,}$/u;
const OPAQUE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{24,}$/u;
const SAFE_ROUTE_SEGMENT_PATTERN = /^[a-z][a-z0-9-]{0,63}$/u;
const LONG_UNDELIMITED_SEGMENT_PATTERN = /^[a-z0-9]{16,}$/u;

export const SLOW_SERVER_API_REQUEST_MS = 750;

function telemetrySegment(segment: string): string {
  if (segment.length === 0) {
    return segment;
  }

  if (
    UUID_SEGMENT_PATTERN.test(segment) ||
    INTEGER_IDENTIFIER_PATTERN.test(segment) ||
    OPAQUE_IDENTIFIER_PATTERN.test(segment) ||
    !SAFE_ROUTE_SEGMENT_PATTERN.test(segment) ||
    LONG_UNDELIMITED_SEGMENT_PATTERN.test(segment)
  ) {
    return ":id";
  }

  return segment;
}

export function apiRouteTelemetryLabel(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segments = normalized.split("/").map(telemetrySegment);
  const label = segments.join("/");

  return label.length > 512 ? `${label.slice(0, 511)}…` : label;
}

export function shouldWarnSlowServerApiRequest(durationMs: number): boolean {
  return durationMs >= SLOW_SERVER_API_REQUEST_MS;
}

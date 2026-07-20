// oz-next-app/src/lib/security/scanner-routes.ts
const SCANNER_PATH_PATTERNS: readonly RegExp[] = Object.freeze([
  /^\/production\/assembly(?:\/.*)?$/u,
]);

export const SCANNER_ROUTE_SOURCES: readonly string[] = Object.freeze([
  "/production/assembly",
  "/production/assembly/:path*",
]);

export function isScannerPath(pathname: string): boolean {
  return SCANNER_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

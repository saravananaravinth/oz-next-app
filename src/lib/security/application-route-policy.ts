// oz-next-app/src/lib/security/application-route-policy.ts
const PROTECTED_APP_ROOTS: ReadonlySet<string> = new Set([
  "account",
  "dashboard",
  "engagement",
  "extended-warranty",
  "inventory",
  "settings",
  "wallet",
] as const);

const SENSITIVE_DOT_SEGMENT_PATTERN =
  /^\.(?:env(?:\..*)?|git(?:.*)?|hg|svn|ds_store|npmrc|yarnrc|pnpmfile|dockerignore)$/iu;

function pathSegments(pathname: string): readonly string[] {
  return pathname.split("/").filter((segment) => segment.length > 0);
}

export function isKnownProtectedAppPath(pathname: string): boolean {
  const [root] = pathSegments(pathname);

  return root !== undefined && PROTECTED_APP_ROOTS.has(root);
}

export function isSensitiveProbePath(pathname: string): boolean {
  return pathSegments(pathname).some((segment) =>
    SENSITIVE_DOT_SEGMENT_PATTERN.test(segment),
  );
}

// oz-next-app/src/features/auth/server/auth-error-diagnostics.ts
import { z } from "zod";

export type SchemaIssueDiagnostics = Readonly<{
  paths: readonly string[];
  codes: readonly string[];
}>;

const MAX_DIAGNOSTIC_ITEMS = 32;
const ROOT_PATH = "$";
const MAX_CAUSE_DEPTH = 4;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedPath(path: readonly unknown[]): string {
  return path.length > 0 ? path.map(String).join(".") : ROOT_PATH;
}

function collectIssueDiagnostics(
  issue: unknown,
  paths: Set<string>,
  codes: Set<string>,
): void {
  if (
    !isRecord(issue) ||
    (paths.size >= MAX_DIAGNOSTIC_ITEMS && codes.size >= MAX_DIAGNOSTIC_ITEMS)
  ) {
    return;
  }

  const code = issue["code"];

  if (typeof code === "string" && codes.size < MAX_DIAGNOSTIC_ITEMS) {
    codes.add(code);
  }

  const path: readonly unknown[] = Array.isArray(issue["path"])
    ? (issue["path"] as readonly unknown[])
    : [];
  const keys: readonly unknown[] = Array.isArray(issue["keys"])
    ? (issue["keys"] as readonly unknown[])
    : [];

  if (paths.size < MAX_DIAGNOSTIC_ITEMS) {
    if (keys.length > 0) {
      for (const key of keys) {
        if (paths.size >= MAX_DIAGNOSTIC_ITEMS) {
          break;
        }

        paths.add(normalizedPath([...path, key]));
      }
    } else if (code !== "invalid_union") {
      paths.add(normalizedPath(path));
    }
  }

  const nestedErrors = issue["errors"];

  if (Array.isArray(nestedErrors)) {
    for (const branch of nestedErrors) {
      if (!Array.isArray(branch)) {
        continue;
      }

      for (const nestedIssue of branch) {
        collectIssueDiagnostics(nestedIssue, paths, codes);
      }
    }
  }
}

export function schemaIssueDiagnostics(
  error: z.ZodError,
): SchemaIssueDiagnostics {
  const paths = new Set<string>();
  const codes = new Set<string>();

  for (const issue of error.issues) {
    collectIssueDiagnostics(issue, paths, codes);
  }

  return {
    paths: [...paths],
    codes: [...codes],
  };
}

export function schemaIssueDiagnosticsFromError(
  error: unknown,
): SchemaIssueDiagnostics | null {
  let current = error;
  const visited = new Set<unknown>();

  for (let depth = 0; depth <= MAX_CAUSE_DEPTH; depth += 1) {
    if (current instanceof z.ZodError) {
      return schemaIssueDiagnostics(current);
    }

    if (!isRecord(current) || visited.has(current)) {
      return null;
    }

    visited.add(current);
    current = current["cause"];
  }

  return null;
}

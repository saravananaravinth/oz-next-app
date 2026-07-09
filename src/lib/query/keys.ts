// oz-next-app/src/lib/query/keys.ts
export type QueryPrimitive = string | number | boolean | null;
export type QuerySerializable =
  | QueryPrimitive
  | readonly QuerySerializable[]
  | { readonly [key: string]: QuerySerializable | undefined };

export type ActorQueryScope = Readonly<{
  project?: string | null;
  actorKind?: string | null;
  userId?: string | null;
  tenantId?: string | null;
  orgUnitId?: string | null;
  dealerOrgUnitId?: string | null;
  financierId?: string | null;
  customerId?: string | null;
  sessionId?: string | null;
}>;

const EMPTY_SCOPE_VALUE = "none" as const;
const DEFAULT_PROJECT = "ERP" as const;
const DELETE_CHARACTER_CODE = 127;
const WHITESPACE_PATTERN = /\s+/gu;

function removeControlCharacters(value: string): string {
  let output = "";

  for (let index = 0; index < value.length; index += 1) {
    const character = value.charAt(index);
    const code = value.charCodeAt(index);

    output += code < 32 || code === DELETE_CHARACTER_CODE ? " " : character;
  }

  return output;
}

function cleanScopeValue(value: string | null | undefined): string {
  const normalized = removeControlCharacters(value ?? "")
    .replace(WHITESPACE_PATTERN, " ")
    .trim();

  return normalized.length > 0 ? normalized : EMPTY_SCOPE_VALUE;
}

export function actorScopeKey(scope: ActorQueryScope | null | undefined) {
  return [
    "scope",
    cleanScopeValue(scope?.project ?? DEFAULT_PROJECT),
    cleanScopeValue(scope?.actorKind),
    cleanScopeValue(scope?.tenantId),
    cleanScopeValue(scope?.orgUnitId),
    cleanScopeValue(scope?.dealerOrgUnitId),
    cleanScopeValue(scope?.financierId),
    cleanScopeValue(scope?.customerId),
    cleanScopeValue(scope?.userId),
    cleanScopeValue(scope?.sessionId),
  ] as const;
}

function isPlainRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unsupportedQueryValueTag(value: unknown): string {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "symbol") {
    return value.description === undefined
      ? "symbol"
      : `symbol:${value.description}`;
  }

  if (typeof value === "function") {
    return value.name.length === 0 ? "function" : `function:${value.name}`;
  }

  return Object.prototype.toString.call(value);
}

export function stableQueryValue(value: unknown): QuerySerializable {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => stableQueryValue(item));
  }

  if (isPlainRecord(value)) {
    const output: Record<string, QuerySerializable> = {};

    for (const key of Object.keys(value).sort()) {
      const nestedValue = value[key];

      if (nestedValue !== undefined) {
        output[key] = stableQueryValue(nestedValue);
      }
    }

    return output;
  }

  return unsupportedQueryValueTag(value);
}

export const queryKeys = {
  auth: {
    root: ["auth"] as const,
    me: (scope?: ActorQueryScope | null) =>
      ["auth", "me", actorScopeKey(scope)] as const,
    sessions: (scope?: ActorQueryScope | null, filters?: unknown) =>
      [
        "auth",
        "sessions",
        actorScopeKey(scope),
        stableQueryValue(filters),
      ] as const,
  },
  erp: {
    root: ["erp"] as const,
    list: (
      resource: string,
      scope?: ActorQueryScope | null,
      filters?: unknown,
    ) =>
      [
        "erp",
        resource,
        "list",
        actorScopeKey(scope),
        stableQueryValue(filters),
      ] as const,
    detail: (resource: string, id: string, scope?: ActorQueryScope | null) =>
      ["erp", resource, "detail", actorScopeKey(scope), id] as const,
  },
} as const;

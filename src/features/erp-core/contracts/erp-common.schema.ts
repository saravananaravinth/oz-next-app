// oz-next-app/src/features/erp-core/contracts/erp-common.schema.ts
import { z } from "zod";

import { actorKindSchema, authCustomerLevelSchema } from "@/lib/api/contracts";

const INTERNAL_BACKEND_PATH_SEGMENTS = [
  "tasks",
  "metrics",
  "readyz",
  "healthz",
  "livez",
  "version",
  "internal",
] as const;

const INTERNAL_BACKEND_PATH_SEGMENT_SET = new Set<string>(
  INTERNAL_BACKEND_PATH_SEGMENTS,
);

const SAFE_HEADER_VALUE_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/u;
const UNSAFE_ENCODED_PATH_PATTERN = /%(?:00|2e|2f|5c)/iu;

export const erpUuidSchema = z.string().trim().pipe(z.uuid());

export const erpIsoDateTimeSchema = z.union([
  z.iso.datetime({ offset: true }),
  z.iso.datetime(),
]);

export const erpCursorSchema = z
  .string()
  .trim()
  .min(1)
  .max(1_024)
  .regex(/^[A-Za-z0-9._~:/+=-]+$/u);

export const erpSortDirectionSchema = z.enum(["asc", "desc"]);

export const erpRequestIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(SAFE_HEADER_VALUE_PATTERN);

export const erpSearchQuerySchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[\p{L}\p{N}\s._:/@#+-]+$/u);

const erpBooleanishSchema = z.union([
  z.boolean(),
  z
    .string()
    .trim()
    .toLowerCase()
    .transform((value, context) => {
      if (value === "true" || value === "1") {
        return true;
      }

      if (value === "false" || value === "0") {
        return false;
      }

      context.addIssue({
        code: "custom",
        message: "Expected a boolean value.",
      });

      return z.NEVER;
    }),
]);

export const erpPaginationQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: erpCursorSchema.optional(),
    includeTotal: erpBooleanishSchema.optional(),
    include_total: erpBooleanishSchema.optional(),
  })
  .strict()
  .transform((value) => ({
    limit: value.limit,
    ...(value.cursor !== undefined ? { cursor: value.cursor } : {}),
    ...(value.includeTotal !== undefined || value.include_total !== undefined
      ? { includeTotal: value.includeTotal ?? value.include_total }
      : {}),
  }));

export const erpOffsetPaginationQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
    includeTotal: erpBooleanishSchema.optional(),
    include_total: erpBooleanishSchema.optional(),
  })
  .strict()
  .transform((value) => ({
    limit: value.limit,
    offset: value.offset,
    ...(value.includeTotal !== undefined || value.include_total !== undefined
      ? { includeTotal: value.includeTotal ?? value.include_total }
      : {}),
  }));

export const erpPaginationMetaSchema = z
  .object({
    nextCursor: erpCursorSchema.nullable().optional(),
    previousCursor: erpCursorSchema.nullable().optional(),
    hasNextPage: z.boolean().optional(),
    hasPreviousPage: z.boolean().optional(),
    total: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();

export function erpListSchema<TItem>(itemSchema: z.ZodType<TItem>) {
  return z
    .object({
      items: z.array(itemSchema).readonly(),
      pagination: erpPaginationMetaSchema.optional(),
    })
    .strict();
}

export const erpActorScopeSchema = z
  .object({
    project: z.string().trim().min(1).max(32).default("ERP"),
    actorKind: actorKindSchema,
    userId: erpUuidSchema.nullable(),
    tenantId: erpUuidSchema.nullable(),
    orgUnitId: erpUuidSchema.nullable(),
    dealerOrgUnitId: erpUuidSchema.nullable(),
    financierId: erpUuidSchema.nullable(),
    financierOrgUnitId: erpUuidSchema.nullable(),
    customerId: erpUuidSchema.nullable(),
    customerLevels: z.array(authCustomerLevelSchema).max(16).readonly(),
    sessionId: z.string().trim().min(1).max(256).nullable(),
    authorizationVersion: z.number().int().nonnegative().nullable(),
  })
  .strict();

export type ErpActorScope = z.infer<typeof erpActorScopeSchema>;

export const erpActorContextHeadersSchema = z
  .object({
    tenantId: erpUuidSchema.nullish(),
    orgUnitId: erpUuidSchema.nullish(),
    dealerOrgUnitId: erpUuidSchema.nullish(),
    financierId: erpUuidSchema.nullish(),
    customerId: erpUuidSchema.nullish(),
  })
  .strict();

export type ErpActorContextHeaders = z.infer<
  typeof erpActorContextHeadersSchema
>;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);

    if (codePoint <= 31 || codePoint === 127) {
      return true;
    }
  }

  return false;
}

function pathWithoutQuery(value: string): string {
  return value.split(/[?#]/u, 1)[0] ?? value;
}

function pathSegments(value: string): readonly string[] {
  return pathWithoutQuery(value)
    .split("/")
    .filter((segment) => segment.length > 0);
}

function hasPathTraversal(value: string): boolean {
  return pathSegments(value).includes("..");
}

function isInternalBackendPath(value: string): boolean {
  const segments = pathSegments(value);
  const [first, second] = segments;

  if (first !== undefined && INTERNAL_BACKEND_PATH_SEGMENT_SET.has(first)) {
    return true;
  }

  if (
    first === "erp" &&
    second !== undefined &&
    INTERNAL_BACKEND_PATH_SEGMENT_SET.has(second)
  ) {
    return true;
  }

  return false;
}

export function erpRoutePathSchema(prefix: `/erp/${string}`) {
  return z
    .string()
    .trim()
    .min(prefix.length)
    .max(2_048)
    .refine(
      (value) => value.startsWith(prefix),
      `ERP path must start with ${prefix}.`,
    )
    .refine(
      (value) => value.startsWith("/erp/"),
      "ERP path must stay under /erp/**.",
    )
    .refine(
      (value) => !value.startsWith("//"),
      "Scheme-relative paths are not allowed.",
    )
    .refine(
      (value) => !value.includes("\\"),
      "Backslashes are not allowed in ERP paths.",
    )
    .refine(
      (value) => !hasControlCharacter(value),
      "Path contains control characters.",
    )
    .refine(
      (value) => !UNSAFE_ENCODED_PATH_PATTERN.test(value),
      "Path contains unsafe encoding.",
    )
    .refine(
      (value) => !hasPathTraversal(value),
      "Path traversal is not allowed.",
    )
    .refine(
      (value) => !isInternalBackendPath(value),
      "Internal backend paths are not allowed.",
    );
}

export const erpIdParamSchema = z
  .object({
    id: erpUuidSchema,
  })
  .strict();

export const erpMutationResultSchema = z
  .looseObject({
    id: erpUuidSchema.optional(),
    accepted: z.boolean().optional(),
    updated: z.boolean().optional(),
    deleted: z.boolean().optional(),
    requestId: erpRequestIdSchema.optional(),
    request_id: erpRequestIdSchema.optional(),
  })
  .transform((value) => ({
    ...value,
    ...(value.requestId === undefined && value.request_id !== undefined
      ? { requestId: value.request_id }
      : {}),
  }));

export type ErpPaginationQuery = z.infer<typeof erpPaginationQuerySchema>;
export type ErpOffsetPaginationQuery = z.infer<
  typeof erpOffsetPaginationQuerySchema
>;
export type ErpPaginationMeta = z.infer<typeof erpPaginationMetaSchema>;
export type ErpMutationResult = z.infer<typeof erpMutationResultSchema>;

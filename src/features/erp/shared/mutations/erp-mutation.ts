// oz-next-app/src/features/erp/shared/mutations/erp-mutation.ts
"use client";

import type { QueryClient, QueryFilters } from "@tanstack/react-query";

import type { QuerySerializable } from "@/lib/query";

import type { ErpActorScope } from "../schemas/erp-common.schema";
import { erpFeatureQueryKeys } from "../queries/erp-query-keys";

export type ErpMutationScope = Readonly<{
  feature: string;
  actorScope: ErpActorScope;
}>;

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9:_./@-]{16,128}$/u;

function queryKeyPartEquals(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (
    !Array.isArray(left) ||
    !Array.isArray(right) ||
    left.length !== right.length
  ) {
    return false;
  }

  return left.every((item, index) => queryKeyPartEquals(item, right[index]));
}

function queryKeyIncludesPart(
  queryKey: readonly unknown[],
  expectedPart: readonly unknown[],
): boolean {
  return queryKey.some((part) => queryKeyPartEquals(part, expectedPart));
}

function actorScopedQueryFilter(actorScope: ErpActorScope): QueryFilters {
  const actorScopeKey = erpFeatureQueryKeys.actorScope(actorScope);

  return {
    queryKey: erpFeatureQueryKeys.root,
    exact: false,
    predicate: (query) => queryKeyIncludesPart(query.queryKey, actorScopeKey),
  };
}

export function createClientIdempotencyKey(prefix: string): string {
  const normalizedPrefix = prefix
    .trim()
    .replace(/[^A-Za-z0-9._:-]/gu, "-")
    .replace(/-+/gu, "-")
    .slice(0, 48);

  return `${normalizedPrefix || "erp"}:${crypto.randomUUID()}`;
}

export function assertClientIdempotencyKey(value: string): string {
  const normalized = value.trim();

  if (!IDEMPOTENCY_KEY_PATTERN.test(normalized)) {
    throw new Error("idempotency_key_invalid");
  }

  return normalized;
}

export async function invalidateErpFeatureQueries(
  queryClient: QueryClient,
  scope: ErpMutationScope,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: erpFeatureQueryKeys.feature(scope.feature, scope.actorScope),
    exact: false,
  });
}

export async function invalidateErpFeatureListQueries(
  queryClient: QueryClient,
  scope: ErpMutationScope,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: erpFeatureQueryKeys.list(scope.feature, scope.actorScope),
    exact: false,
  });
}

export async function invalidateErpFeatureDetailQuery(
  queryClient: QueryClient,
  scope: ErpMutationScope,
  id: string,
  params?: QuerySerializable | null,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: erpFeatureQueryKeys.detail(
      scope.feature,
      scope.actorScope,
      id,
      params ?? null,
    ),
    exact: false,
  });
}

export async function clearErpActorScopedQueries(
  queryClient: QueryClient,
  actorScope: ErpActorScope,
): Promise<void> {
  const filter = actorScopedQueryFilter(actorScope);

  await queryClient.cancelQueries(filter);
  queryClient.removeQueries(filter);
}

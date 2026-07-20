// oz-next-app/src/features/erp-core/queries/erp-query-keys.ts
import { stableQueryValue, type QuerySerializable } from "@/lib/query/index";

import type { ErpActorScope } from "@/features/erp-core/contracts/erp-common.schema";
import { erpActorScopeKeyInput } from "@/features/erp-core/queries/erp-query-scope";

export type ErpFeatureName = string;

const ERP_QUERY_ROOT_KEY = ["erp"] as const;
const EMPTY_SCOPE_VALUE = "none" as const;
const CONTROL_CHARACTER_PATTERN = new RegExp(
  String.raw`[\u0000-\u001F\u007F]`,
  "gu",
);
const WHITESPACE_PATTERN = /\s+/gu;

function cleanQueryKeyPart(value: string | null | undefined): string {
  const normalized =
    value
      ?.replace(CONTROL_CHARACTER_PATTERN, " ")
      .replace(WHITESPACE_PATTERN, " ")
      .trim() ?? "";

  return normalized.length > 0 ? normalized : EMPTY_SCOPE_VALUE;
}

function authorizationVersionKeyPart(value: number | null): string {
  return value === null ? EMPTY_SCOPE_VALUE : String(value);
}

function customerLevelsKeyPart(values: readonly string[]): string {
  return values.length === 0
    ? EMPTY_SCOPE_VALUE
    : [...values].sort((left, right) => left.localeCompare(right)).join(",");
}

export function erpActorScopeQueryKey(scope: ErpActorScope) {
  const input = erpActorScopeKeyInput(scope);

  return [
    "scope",
    cleanQueryKeyPart(input.project),
    cleanQueryKeyPart(input.actorKind),
    cleanQueryKeyPart(input.tenantId),
    cleanQueryKeyPart(input.orgUnitId),
    cleanQueryKeyPart(input.dealerOrgUnitId),
    cleanQueryKeyPart(input.financierId),
    cleanQueryKeyPart(input.financierOrgUnitId),
    cleanQueryKeyPart(input.customerId),
    customerLevelsKeyPart(input.customerLevels),
    cleanQueryKeyPart(input.userId),
    cleanQueryKeyPart(input.sessionId),
    authorizationVersionKeyPart(input.authorizationVersion),
  ] as const;
}

export const erpFeatureQueryKeys = {
  root: ERP_QUERY_ROOT_KEY,

  actorScope: erpActorScopeQueryKey,

  feature: (feature: ErpFeatureName, scope: ErpActorScope) =>
    [
      ...ERP_QUERY_ROOT_KEY,
      cleanQueryKeyPart(feature),
      erpActorScopeQueryKey(scope),
    ] as const,

  list: (
    feature: ErpFeatureName,
    scope: ErpActorScope,
    params?: QuerySerializable | null,
  ) =>
    [
      ...ERP_QUERY_ROOT_KEY,
      cleanQueryKeyPart(feature),
      "list",
      erpActorScopeQueryKey(scope),
      stableQueryValue(params),
    ] as const,

  detail: (
    feature: ErpFeatureName,
    scope: ErpActorScope,
    id: string,
    params?: QuerySerializable | null,
  ) =>
    [
      ...ERP_QUERY_ROOT_KEY,
      cleanQueryKeyPart(feature),
      "detail",
      erpActorScopeQueryKey(scope),
      cleanQueryKeyPart(id),
      stableQueryValue(params),
    ] as const,

  lookup: (
    feature: ErpFeatureName,
    scope: ErpActorScope,
    params?: QuerySerializable | null,
  ) =>
    [
      ...ERP_QUERY_ROOT_KEY,
      cleanQueryKeyPart(feature),
      "lookup",
      erpActorScopeQueryKey(scope),
      stableQueryValue(params),
    ] as const,
} as const;

export type ErpFeatureQueryKey =
  | typeof erpFeatureQueryKeys.root
  | ReturnType<typeof erpFeatureQueryKeys.feature>
  | ReturnType<typeof erpFeatureQueryKeys.list>
  | ReturnType<typeof erpFeatureQueryKeys.detail>
  | ReturnType<typeof erpFeatureQueryKeys.lookup>;

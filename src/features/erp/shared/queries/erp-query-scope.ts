// oz-next-app/src/features/erp/shared/queries/erp-query-scope.ts
import type { MeResponse } from "@/lib/api/schemas";

import {
  erpActorScopeSchema,
  type ErpActorScope,
} from "../schemas/erp-common.schema";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readField(
  record: Readonly<Record<string, unknown>> | null,
  key: string,
): unknown {
  return record?.[key];
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readNestedActor(
  me: MeResponse,
): Readonly<Record<string, unknown>> | null {
  const auth = isRecord(me) ? readField(me, "auth") : undefined;

  if (!isRecord(auth)) {
    return null;
  }

  const actor = readField(auth, "actor");

  return isRecord(actor) ? actor : null;
}

function firstString(...values: readonly unknown[]): string | null {
  for (const value of values) {
    const normalized = stringValue(value);

    if (normalized !== null) {
      return normalized;
    }
  }

  return null;
}

export function erpActorScopeFromMe(me: MeResponse): ErpActorScope {
  const meRecord = isRecord(me) ? me : null;
  const actor = readNestedActor(me);
  const parsed = erpActorScopeSchema.safeParse({
    project: firstString(readField(meRecord, "project")) ?? "ERP",
    actorKind:
      firstString(
        readField(actor, "actorKind"),
        readField(actor, "actor_kind"),
      ) ?? "STAFF",
    userId: firstString(
      readField(actor, "userId"),
      readField(actor, "user_id"),
      readField(meRecord, "user_id"),
    ),
    tenantId: firstString(
      readField(actor, "tenantId"),
      readField(actor, "tenant_id"),
      readField(meRecord, "tenant_id"),
    ),
    orgUnitId: firstString(
      readField(actor, "orgUnitId"),
      readField(actor, "org_unit_id"),
    ),
    dealerOrgUnitId: firstString(
      readField(actor, "dealerOrgUnitId"),
      readField(actor, "dealer_org_unit_id"),
    ),
    financierId: firstString(
      readField(actor, "financierId"),
      readField(actor, "financier_id"),
    ),
    financierOrgUnitId: firstString(
      readField(actor, "financierOrgUnitId"),
      readField(actor, "financier_org_unit_id"),
    ),
    customerId: firstString(
      readField(actor, "customerId"),
      readField(actor, "customer_id"),
    ),
    sessionId: firstString(
      readField(actor, "sessionId"),
      readField(actor, "session_id"),
    ),
  });

  if (parsed.success) {
    return parsed.data;
  }

  return {
    project: "ERP",
    actorKind: "STAFF",
    userId: stringValue(readField(meRecord, "user_id")),
    tenantId: stringValue(readField(meRecord, "tenant_id")),
    orgUnitId: null,
    dealerOrgUnitId: null,
    financierId: null,
    financierOrgUnitId: null,
    customerId: null,
    sessionId: null,
  };
}

export function erpActorScopeKeyInput(scope: ErpActorScope) {
  return {
    project: scope.project,
    actorKind: scope.actorKind,
    userId: scope.userId,
    tenantId: scope.tenantId,
    orgUnitId: scope.orgUnitId,
    dealerOrgUnitId: scope.dealerOrgUnitId,
    financierId: scope.financierId,
    financierOrgUnitId: scope.financierOrgUnitId,
    customerId: scope.customerId,
    sessionId: scope.sessionId,
  } as const;
}

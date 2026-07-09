// oz-next-app/src/server/api/request-context.ts
import "server-only";

import { headers } from "next/headers";
import { z } from "zod";

import { API_CONFIG, CT, HDR } from "@/lib/constants";
import { requestId as createRequestId } from "@/lib/uuid";

export type ServerActorContextHeaders = Readonly<{
  tenantId?: string | null | undefined;
  orgUnitId?: string | null | undefined;
  dealerOrgUnitId?: string | null | undefined;
  financierId?: string | null | undefined;
  customerId?: string | null | undefined;
}>;

export type ServerRequestContextHeadersOptions = Readonly<{
  includeJsonContentType?: boolean;
  requestId?: string | undefined;
  correlationId?: string | undefined;
  actorContext?: ServerActorContextHeaders | undefined;
}>;

const SAFE_HEADER_ID_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/u;
const TRACEPARENT_PATTERN = /^[\da-f]{2}-[\da-f]{32}-[\da-f]{16}-[\da-f]{2}$/iu;
const FORWARDED_USER_AGENT_MAX_LENGTH = 512;
const CONTROL_CHARACTER_MAX_CODE = 0x1f;
const DELETE_CHARACTER_CODE = 0x7f;

const actorContextHeadersSchema = z
  .object({
    tenantId: z.uuid().nullish(),
    orgUnitId: z.uuid().nullish(),
    dealerOrgUnitId: z.uuid().nullish(),
    financierId: z.uuid().nullish(),
    customerId: z.uuid().nullish(),
  })
  .strict();

function containsHeaderControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);

    if (
      codePoint <= CONTROL_CHARACTER_MAX_CODE ||
      codePoint === DELETE_CHARACTER_CODE
    ) {
      return true;
    }
  }

  return false;
}

function normalizeHeaderId(
  value: string | null | undefined,
  fallback: string,
): string {
  const normalized = value?.trim() ?? "";

  return SAFE_HEADER_ID_PATTERN.test(normalized) ? normalized : fallback;
}

function normalizeTraceparent(value: string | null): string | null {
  const normalized = value?.trim() ?? "";

  return TRACEPARENT_PATTERN.test(normalized) ? normalized : null;
}

function normalizeForwardedHeaderValue(
  value: string | null,
  maxLength: number,
): string | null {
  const normalized = value?.trim() ?? "";

  if (
    normalized.length === 0 ||
    normalized.length > maxLength ||
    containsHeaderControlCharacter(normalized)
  ) {
    return null;
  }

  return normalized;
}

function appendActorContextHeaders(
  outboundHeaders: Headers,
  actorContext: ServerActorContextHeaders | undefined,
): void {
  if (actorContext === undefined) {
    return;
  }

  const parsed = actorContextHeadersSchema.safeParse(actorContext);

  if (!parsed.success) {
    throw new TypeError("invalid_actor_context_headers");
  }

  if (parsed.data.tenantId != null) {
    outboundHeaders.set(HDR.TENANT_ID, parsed.data.tenantId);
  }

  if (parsed.data.orgUnitId != null) {
    outboundHeaders.set(HDR.ORG_UNIT_ID, parsed.data.orgUnitId);
  }

  if (parsed.data.dealerOrgUnitId != null) {
    outboundHeaders.set(HDR.DEALER_ORG_UNIT_ID, parsed.data.dealerOrgUnitId);
  }

  if (parsed.data.financierId != null) {
    outboundHeaders.set(HDR.FINANCIER_ID, parsed.data.financierId);
  }

  if (parsed.data.customerId != null) {
    outboundHeaders.set(HDR.CUSTOMER_ID, parsed.data.customerId);
  }
}

export async function serverRequestContextHeaders(
  options: ServerRequestContextHeadersOptions = {},
): Promise<Headers> {
  const incomingHeaders = await headers();
  const outboundHeaders = new Headers();

  const resolvedRequestId = normalizeHeaderId(
    options.requestId ?? incomingHeaders.get(HDR.REQUEST_ID),
    createRequestId("srv"),
  );

  const resolvedCorrelationId = normalizeHeaderId(
    options.correlationId ?? incomingHeaders.get(HDR.CORRELATION_ID),
    resolvedRequestId,
  );

  const traceparent = normalizeTraceparent(
    incomingHeaders.get(HDR.TRACEPARENT),
  );
  const userAgent = normalizeForwardedHeaderValue(
    incomingHeaders.get("user-agent"),
    FORWARDED_USER_AGENT_MAX_LENGTH,
  );

  outboundHeaders.set(HDR.ACCEPT, CT.JSON);
  outboundHeaders.set(HDR.ORIGIN, API_CONFIG.appOrigin);
  outboundHeaders.set(HDR.REQUEST_ID, resolvedRequestId);
  outboundHeaders.set(HDR.CORRELATION_ID, resolvedCorrelationId);

  if (options.includeJsonContentType === true) {
    outboundHeaders.set(HDR.CONTENT_TYPE, CT.JSON);
  }

  if (traceparent !== null) {
    outboundHeaders.set(HDR.TRACEPARENT, traceparent);
  }

  if (userAgent !== null) {
    outboundHeaders.set("user-agent", userAgent);
  }

  appendActorContextHeaders(outboundHeaders, options.actorContext);

  return outboundHeaders;
}

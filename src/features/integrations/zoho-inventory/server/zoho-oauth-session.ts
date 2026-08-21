// oz-next-app/src/features/integrations/zoho-inventory/server/zoho-oauth-session.ts
import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";

import { isProduction } from "@/lib/env/public-env";

import {
  zohoOAuthAttemptContextSchema,
  zohoPendingGrantSchema,
  type ZohoOAuthAttemptContext,
  type ZohoPendingGrant,
} from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";

const ATTEMPT_COOKIE_BASE = isProduction
  ? "__Host-oz_zoho_oauth_attempt"
  : "oz_zoho_oauth_attempt";
const PENDING_GRANT_COOKIE_BASE = isProduction
  ? "__Host-oz_zoho_pending_grant"
  : "oz_zoho_pending_grant";

const COOKIE_CHUNK_CHARS = 2_800;
const MAX_COOKIE_CHUNKS = 3;
const MAX_SERIALIZED_COOKIE_CHARS = COOKIE_CHUNK_CHARS * MAX_COOKIE_CHUNKS;
const MAX_PENDING_ORGANIZATIONS = 64;
const MAX_COOKIE_AGE_SECONDS = 10 * 60;
const COOKIE_VALUE_PATTERN = /^[A-Za-z0-9_-]+$/u;

const compactAttemptSchema = z
  .object({
    a: z.uuid(),
    t: z.uuid(),
    c: z.uuid().nullable(),
    s: z.string().regex(/^[a-f0-9]{64}$/u),
    e: z.string().min(1).max(64),
  })
  .strict();

const compactPendingGrantSchema = z
  .object({
    a: z.uuid(),
    t: z.uuid(),
    e: z.string().min(1).max(64),
    o: z
      .array(
        z.tuple([
          z.string().trim().min(1).max(128),
          z.string().trim().min(1).max(512),
          z.boolean(),
        ]),
      )
      .min(1)
      .max(MAX_PENDING_ORGANIZATIONS),
  })
  .strict();

type CookieStore = Awaited<ReturnType<typeof cookies>>;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
} as const;

function chunkName(baseName: string, index: number): string {
  return `${baseName}.${String(index)}`;
}

function secondsUntil(expiresAt: string): number {
  const expiryMs = Date.parse(expiresAt);

  if (!Number.isFinite(expiryMs)) {
    throw new TypeError("zoho_oauth_cookie_expiry_invalid");
  }

  return Math.max(
    1,
    Math.min(
      MAX_COOKIE_AGE_SECONDS,
      Math.ceil((expiryMs - Date.now()) / 1_000),
    ),
  );
}

function isExpired(expiresAt: string): boolean {
  const expiryMs = Date.parse(expiresAt);

  return !Number.isFinite(expiryMs) || expiryMs <= Date.now();
}

export async function hashZohoOAuthState(state: string): Promise<string> {
  const normalized = state.trim();

  if (!/^[A-Za-z0-9_-]{32,512}$/u.test(normalized)) {
    throw new TypeError("zoho_oauth_state_invalid");
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/gu, "");
}

function fromBase64Url(value: string): string | null {
  if (value.length === 0 || !COOKIE_VALUE_PATTERN.test(value)) {
    return null;
  }

  const base64 = value.replace(/-/gu, "+").replace(/_/gu, "/");
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;

  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function clearFamily(cookieStore: CookieStore, baseName: string): void {
  for (let index = 0; index < MAX_COOKIE_CHUNKS; index += 1) {
    cookieStore.set(chunkName(baseName, index), "", {
      ...COOKIE_OPTIONS,
      maxAge: 0,
      expires: new Date(0),
    });
  }
}

function writeFamily(
  cookieStore: CookieStore,
  baseName: string,
  encoded: string,
  expiresAt: string,
): void {
  if (encoded.length === 0 || encoded.length > MAX_SERIALIZED_COOKIE_CHARS) {
    throw new TypeError("zoho_oauth_cookie_payload_too_large");
  }

  clearFamily(cookieStore, baseName);

  const maxAge = secondsUntil(expiresAt);
  const expires = new Date(Date.now() + maxAge * 1_000);
  let chunkCount = 0;

  for (let offset = 0; offset < encoded.length; offset += COOKIE_CHUNK_CHARS) {
    const value = encoded.slice(offset, offset + COOKIE_CHUNK_CHARS);

    if (chunkCount >= MAX_COOKIE_CHUNKS) {
      throw new TypeError("zoho_oauth_cookie_chunk_limit_exceeded");
    }

    cookieStore.set(chunkName(baseName, chunkCount), value, {
      ...COOKIE_OPTIONS,
      maxAge,
      expires,
    });
    chunkCount += 1;
  }
}

function readFamily(cookieStore: CookieStore, baseName: string): string | null {
  const chunks: string[] = [];

  for (let index = 0; index < MAX_COOKIE_CHUNKS; index += 1) {
    const value = cookieStore.get(chunkName(baseName, index))?.value;

    if (value === undefined) {
      break;
    }

    if (
      value.length === 0 ||
      value.length > COOKIE_CHUNK_CHARS ||
      !COOKIE_VALUE_PATTERN.test(value)
    ) {
      return null;
    }

    chunks.push(value);
  }

  if (chunks.length === 0) {
    return null;
  }

  const encoded = chunks.join("");

  return encoded.length <= MAX_SERIALIZED_COOKIE_CHARS ? encoded : null;
}

export async function storeZohoOAuthAttemptContext(
  input: ZohoOAuthAttemptContext,
): Promise<void> {
  const parsed = zohoOAuthAttemptContextSchema.parse(input);
  const compact = compactAttemptSchema.parse({
    a: parsed.authorizationId,
    t: parsed.tenantId,
    c: parsed.actorContextTenantId,
    s: parsed.stateHash,
    e: parsed.expiresAt,
  });
  const encoded = toBase64Url(JSON.stringify(compact));
  const cookieStore = await cookies();

  writeFamily(cookieStore, ATTEMPT_COOKIE_BASE, encoded, parsed.expiresAt);
}

export async function readZohoOAuthAttemptContext(): Promise<ZohoOAuthAttemptContext | null> {
  const cookieStore = await cookies();
  const encoded = readFamily(cookieStore, ATTEMPT_COOKIE_BASE);

  if (encoded === null) {
    return null;
  }

  const decoded = fromBase64Url(encoded);

  if (decoded === null) {
    return null;
  }

  try {
    const compact = compactAttemptSchema.parse(JSON.parse(decoded) as unknown);
    const parsed = zohoOAuthAttemptContextSchema.parse({
      authorizationId: compact.a,
      tenantId: compact.t,
      actorContextTenantId: compact.c,
      stateHash: compact.s,
      expiresAt: compact.e,
    });

    return isExpired(parsed.expiresAt) ? null : parsed;
  } catch {
    return null;
  }
}

export async function clearZohoOAuthAttemptContext(): Promise<void> {
  clearFamily(await cookies(), ATTEMPT_COOKIE_BASE);
}

export async function storeZohoPendingGrant(
  input: ZohoPendingGrant,
): Promise<void> {
  const parsed = zohoPendingGrantSchema.parse(input);

  if (parsed.organizations.length > MAX_PENDING_ORGANIZATIONS) {
    throw new TypeError("zoho_pending_grant_organization_limit_exceeded");
  }

  const compact = compactPendingGrantSchema.parse({
    a: parsed.authorizationId,
    t: parsed.tenantId,
    e: parsed.expiresAt,
    o: parsed.organizations.map(
      (organization) =>
        [
          organization.organizationId,
          organization.name,
          organization.isDefault,
        ] as const,
    ),
  });
  const encoded = toBase64Url(JSON.stringify(compact));

  writeFamily(
    await cookies(),
    PENDING_GRANT_COOKIE_BASE,
    encoded,
    parsed.expiresAt,
  );
}

export async function readZohoPendingGrant(): Promise<ZohoPendingGrant | null> {
  const cookieStore = await cookies();
  const encoded = readFamily(cookieStore, PENDING_GRANT_COOKIE_BASE);

  if (encoded === null) {
    return null;
  }

  const decoded = fromBase64Url(encoded);

  if (decoded === null) {
    return null;
  }

  try {
    const compact = compactPendingGrantSchema.parse(
      JSON.parse(decoded) as unknown,
    );
    const parsed = zohoPendingGrantSchema.parse({
      authorizationId: compact.a,
      tenantId: compact.t,
      expiresAt: compact.e,
      organizations: compact.o.map(([organizationId, name, isDefault]) => ({
        organizationId,
        name,
        isDefault,
      })),
    });

    return isExpired(parsed.expiresAt) ? null : parsed;
  } catch {
    return null;
  }
}

export async function clearZohoPendingGrant(): Promise<void> {
  clearFamily(await cookies(), PENDING_GRANT_COOKIE_BASE);
}

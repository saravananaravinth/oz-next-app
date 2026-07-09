// oz-next-app/src/server/auth/jwt-metadata.ts
import "server-only";

import { z } from "zod";

const JWT_PART_PATTERN = /^[A-Za-z0-9_-]+$/u;
const MAX_JWT_PART_CHARS = 32_768;
const SECONDS_PER_MILLISECOND = 1_000;

const sessionTokenTypeSchema = z.enum(["access", "refresh"]);

const jwtPayloadMetadataSchema = z.looseObject({
  exp: z.number().int().nonnegative().optional(),
  type: sessionTokenTypeSchema.optional(),
  token_use: sessionTokenTypeSchema.optional(),
  actor_kind: z.string().min(1).optional(),
  session_id: z.string().min(1).optional(),
  permissions: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
});

export type SessionTokenType = z.infer<typeof sessionTokenTypeSchema>;

type JwtPayloadMetadata = z.infer<typeof jwtPayloadMetadataSchema>;
type JwtParts = readonly [header: string, payload: string, signature: string];

function isJwtPart(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAX_JWT_PART_CHARS &&
    JWT_PART_PATTERN.test(value)
  );
}

function splitJwt(token: string): JwtParts | null {
  const parts = token.trim().split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [header, payload, signature] = parts;

  if (
    header === undefined ||
    payload === undefined ||
    signature === undefined ||
    !isJwtPart(header) ||
    !isJwtPart(payload) ||
    !isJwtPart(signature)
  ) {
    return null;
  }

  return [header, payload, signature];
}

function decodeBase64Url(value: string): string | null {
  try {
    const padded = value
      .replace(/-/gu, "+")
      .replace(/_/gu, "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "=");

    return decodeURIComponent(
      Array.from(
        atob(padded),
        (char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`,
      ).join(""),
    );
  } catch {
    return null;
  }
}

function readSessionTokenPayload(token: string): JwtPayloadMetadata | null {
  const parts = splitJwt(token);

  if (parts === null) {
    return null;
  }

  const decoded = decodeBase64Url(parts[1]);

  if (decoded === null) {
    return null;
  }

  try {
    const parsed = jwtPayloadMetadataSchema.safeParse(
      JSON.parse(decoded) as unknown,
    );

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function inferSessionTokenType(
  payload: JwtPayloadMetadata,
): SessionTokenType | null {
  if (payload.token_use !== undefined) {
    return payload.token_use;
  }

  if (payload.type !== undefined) {
    return payload.type;
  }

  if (
    payload.actor_kind !== undefined ||
    payload.permissions !== undefined ||
    payload.roles !== undefined ||
    payload.session_id !== undefined
  ) {
    return "access";
  }

  return null;
}

export function hasSessionTokenType(
  token: string,
  expectedType: SessionTokenType,
): boolean {
  const payload = readSessionTokenPayload(token);

  return payload !== null && inferSessionTokenType(payload) === expectedType;
}

export function isSessionTokenExpired(token: string, skewSeconds = 0): boolean {
  const payload = readSessionTokenPayload(token);

  if (payload?.exp === undefined) {
    return true;
  }

  return (
    payload.exp <=
    Math.floor(Date.now() / SECONDS_PER_MILLISECOND) +
      Math.max(0, Math.trunc(skewSeconds))
  );
}

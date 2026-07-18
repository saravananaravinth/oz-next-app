// oz-next-app/src/lib/api/schemas.ts
import { z } from "zod";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;
const PHONE_RE = /^\+?[1-9]\d{9,14}$/u;
const SAFE_SLUG_RE = /^[A-Za-z0-9._:-]+$/u;
const SAFE_IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9:_./@-]+$/u;
const SAFE_PERMISSION_RE = /^[A-Za-z0-9:._/-]+$/u;
const DEFAULT_OTP_LENGTH = 6;
const DEFAULT_OTP_MAX_ATTEMPTS = 5;
const MAX_ACCESS_TTL_SECONDS = 24 * 60 * 60;
const MAX_REFRESH_TTL_SECONDS = 366 * 24 * 60 * 60;
const MAX_SESSION_JWT_CHARS = 36_000;
const DEFAULT_PROJECT = "ERP" as const;

export const uuidSchema = z.string().trim().regex(UUID_RE);
export const jwtTokenSchema = z
  .string()
  .trim()
  .min(32)
  .max(MAX_SESSION_JWT_CHARS)
  .regex(JWT_RE);
export const isoDateTimeStringSchema = z
  .string()
  .trim()
  .pipe(z.iso.datetime({ offset: true }));
export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(SAFE_IDEMPOTENCY_KEY_RE);
export const clientIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(SAFE_SLUG_RE);
export const projectSchema = z.enum(["ERP", "CHARZO", "CONZO", "PUBLIC"]);
export const principalKindSchema = z.enum(["AUTH_USER", "CUSTOMER"]);
export const authCustomerLevelSchema = z.enum(["HAPPY_CUSTOMER"]);
export const authRefreshTokenTransportSchema = z.enum([
  "BODY",
  "HTTP_ONLY_COOKIE",
]);
export const authOtpDeliveryChannelSchema = z.enum([
  "EMAIL",
  "SMS",
  "WHATSAPP",
]);
export const actorKindSchema = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "STAFF",
  "DEALER",
  "FINANCIER",
  "CUSTOMER",
  "SYSTEM",
]);

const safeTextSchema = z.string().trim().min(1).max(512);
export const deviceFingerprintSchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(SAFE_SLUG_RE);
const nullableUuidSchema = uuidSchema.nullable();
const optionalNullableUuidSchema = uuidSchema.nullable().optional();
const permissionStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(SAFE_PERMISSION_RE);
const roleNameSchema = z.string().trim().min(1).max(255);
const emailAddressSchema = z.string().trim().pipe(z.email().max(320));
const emailSchema = emailAddressSchema.transform((value) =>
  value.toLowerCase(),
);
const nullableEmailSchema = emailAddressSchema.nullable();
const phoneSchema = z
  .string()
  .trim()
  .min(10)
  .max(16)
  .regex(PHONE_RE)
  .transform((value) => normalizePhoneInput(value));

function normalizePhoneInput(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith("+")) {
    return trimmed;
  }

  if (/^[6-9]\d{9}$/u.test(trimmed)) {
    return `+91${trimmed}`;
  }

  return `+${trimmed}`;
}

function secondsUntilIso(seconds: number): string {
  const normalizedSeconds = Math.max(1, Math.trunc(seconds));
  return new Date(Date.now() + normalizedSeconds * 1_000).toISOString();
}

function secondsUntil(fromIso: string, fallbackSeconds: number): number {
  const expiresAtMs = Date.parse(fromIso);

  if (!Number.isFinite(expiresAtMs)) {
    return fallbackSeconds;
  }

  return Math.max(1, Math.floor((expiresAtMs - Date.now()) / 1_000));
}

export const loginIdentifierSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("EMAIL"),
      value: emailSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("PHONE"),
      value: phoneSchema,
    })
    .strict(),
]);

export type LoginIdentifier = z.infer<typeof loginIdentifierSchema>;

function inferLoginIdentifier(rawIdentifier: string): LoginIdentifier {
  const value = rawIdentifier.trim();

  if (value.includes("@")) {
    return {
      type: "EMAIL",
      value: emailSchema.parse(value),
    };
  }

  return {
    type: "PHONE",
    value: phoneSchema.parse(value),
  };
}

export const authLoginOtpRequestBodySchema = z
  .object({
    clientId: clientIdSchema,
    tenantId: uuidSchema.optional(),
    principalKind: principalKindSchema,
    identifier: loginIdentifierSchema,
    preferredChannel: authOtpDeliveryChannelSchema.optional(),
    idempotencyKey: idempotencyKeySchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.identifier.type === "EMAIL" &&
      value.preferredChannel !== undefined &&
      value.preferredChannel !== "EMAIL"
    ) {
      context.addIssue({
        code: "custom",
        path: ["preferredChannel"],
        message: "EMAIL identifiers can only use EMAIL delivery.",
      });
    }

    if (
      value.identifier.type === "PHONE" &&
      value.preferredChannel === "EMAIL"
    ) {
      context.addIssue({
        code: "custom",
        path: ["preferredChannel"],
        message: "PHONE identifiers can only use SMS or WHATSAPP delivery.",
      });
    }
  });

export const loginStartRequestSchema = z
  .object({
    clientId: clientIdSchema,
    tenantId: uuidSchema.optional(),
    principalKind: principalKindSchema.optional(),
    identifier: z
      .union([z.string().trim().min(3).max(320), loginIdentifierSchema])
      .optional(),
    preferredChannel: authOtpDeliveryChannelSchema.optional(),
    idempotencyKey: idempotencyKeySchema.optional(),

    // Backward-compatible client form fields. These are intentionally not sent to the API.
    email: emailSchema.optional(),
    project: projectSchema.optional(),
    device_fp: safeTextSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.identifier === undefined && value.email === undefined) {
      context.addIssue({
        code: "custom",
        path: ["identifier"],
        message: "Either identifier or email is required.",
      });
    }
  })
  .transform((value): z.input<typeof authLoginOtpRequestBodySchema> => {
    const source = value.identifier ?? value.email;
    const identifier =
      typeof source === "string"
        ? inferLoginIdentifier(source)
        : loginIdentifierSchema.parse(source);

    return {
      clientId: value.clientId,
      principalKind: value.principalKind ?? "AUTH_USER",
      identifier,
      ...(value.tenantId !== undefined ? { tenantId: value.tenantId } : {}),
      ...(value.preferredChannel !== undefined
        ? { preferredChannel: value.preferredChannel }
        : {}),
      ...(value.idempotencyKey !== undefined
        ? { idempotencyKey: value.idempotencyKey }
        : {}),
    };
  })
  .pipe(authLoginOtpRequestBodySchema);

const legacyLoginStartResponseSchema = z
  .object({
    challenge_id: uuidSchema,
    expires_in: z.number().int().min(1).max(900),
    length: z.number().int().min(4).max(8),
    max_attempts: z.number().int().min(1).max(20),
    attempts_remaining: z.number().int().min(0).max(20),
    destination: z
      .object({
        kind: z.enum(["EMAIL", "PHONE"]),
        value_masked: z.string().trim().min(1).max(320),
        channel: authOtpDeliveryChannelSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const backendLoginOtpRequestResultSchema = z
  .object({
    accepted: z.literal(true),
    challengeId: uuidSchema,
    deliveryChannel: authOtpDeliveryChannelSchema.nullable(),
    deliveryTargetMasked: z.string().trim().min(1).max(320).nullable(),
    expiresAt: isoDateTimeStringSchema,
    resendAfter: isoDateTimeStringSchema,
    codeLength: z.number().int().min(4).max(8).optional(),
    maxAttempts: z.number().int().min(1).max(20).optional(),
    attemptsRemaining: z.number().int().min(0).max(20).optional(),
  })
  .strict();

export const loginStartResponseSchema = z.union([
  legacyLoginStartResponseSchema,
  backendLoginOtpRequestResultSchema.transform(
    (value): z.infer<typeof legacyLoginStartResponseSchema> => {
      const destination =
        value.deliveryTargetMasked === null
          ? undefined
          : {
              kind:
                value.deliveryChannel === "EMAIL"
                  ? ("EMAIL" as const)
                  : ("PHONE" as const),
              value_masked: value.deliveryTargetMasked,
              ...(value.deliveryChannel !== null
                ? { channel: value.deliveryChannel }
                : {}),
            };

      const maxAttempts = value.maxAttempts ?? DEFAULT_OTP_MAX_ATTEMPTS;
      const attemptsRemaining = Math.min(
        value.attemptsRemaining ?? maxAttempts,
        maxAttempts,
      );

      return {
        challenge_id: value.challengeId,
        expires_in: secondsUntil(value.expiresAt, 5 * 60),
        length: value.codeLength ?? DEFAULT_OTP_LENGTH,
        max_attempts: maxAttempts,
        attempts_remaining: attemptsRemaining,
        ...(destination !== undefined ? { destination } : {}),
      };
    },
  ),
]);

export const loginVerifyRequestSchema = z
  .object({
    clientId: clientIdSchema,
    challengeId: uuidSchema,
    otp: z
      .string()
      .trim()
      .regex(/^\d{4,8}$/u),
    deviceFingerprint: deviceFingerprintSchema.nullable().optional(),
  })
  .strict()
  .transform((value) => ({
    clientId: value.clientId,
    challengeId: value.challengeId,
    otp: value.otp,
    ...(value.deviceFingerprint != null
      ? { deviceFingerprint: value.deviceFingerprint }
      : {}),
  }));

const userSummarySchema = z
  .object({
    id: uuidSchema.optional(),
    user_id: uuidSchema.optional(),
    display_name: z.string().trim().max(256).nullable().optional(),
    primary_email: nullableEmailSchema.optional(),
  })
  .loose();

const authorizationVersionSchema = z.number().int().nonnegative().nullable();
const customerLevelsSchema = z
  .array(authCustomerLevelSchema)
  .max(16)
  .readonly();

const authTokenSessionViewSchema = z
  .object({
    sessionId: uuidSchema,
    principalKind: principalKindSchema,
    tenantId: nullableUuidSchema,
    userId: nullableUuidSchema,
    customerId: nullableUuidSchema,
    customerLevels: customerLevelsSchema,
    expiresAt: isoDateTimeStringSchema,
    clientId: clientIdSchema,
    authorizationVersion: authorizationVersionSchema,
  })
  .strict();

const authTokenActorViewSchema = z
  .object({
    actorKind: actorKindSchema,
    subject: z.string().trim().min(1).max(256),
    tenantId: nullableUuidSchema,
    userId: nullableUuidSchema,
    customerId: nullableUuidSchema,
    customerLevels: customerLevelsSchema,
    clientId: clientIdSchema,
    roles: z.array(roleNameSchema).readonly(),
    permissions: z.array(permissionStringSchema).readonly(),
    authorizationVersion: authorizationVersionSchema,
  })
  .strict();

const backendAuthTokenPairSharedShape = {
  tokenType: z.literal("Bearer"),
  accessToken: jwtTokenSchema,
  expiresInSeconds: z.number().int().min(1).max(MAX_ACCESS_TTL_SECONDS),
  refreshExpiresInSeconds: z.number().int().min(1).max(MAX_REFRESH_TTL_SECONDS),
  session: authTokenSessionViewSchema,
  actor: authTokenActorViewSchema,
} as const;

const backendBodyAuthTokenPairResultSchema = z
  .object({
    ...backendAuthTokenPairSharedShape,
    refreshToken: jwtTokenSchema,
    refreshTokenTransport: z.literal("BODY"),
  })
  .strict();

const backendCookieAuthTokenPairResultSchema = z
  .object({
    ...backendAuthTokenPairSharedShape,
    refreshToken: z.null(),
    refreshTokenTransport: z.literal("HTTP_ONLY_COOKIE"),
  })
  .strict();

const backendAuthTokenPairResultSchema = z.discriminatedUnion(
  "refreshTokenTransport",
  [
    backendBodyAuthTokenPairResultSchema,
    backendCookieAuthTokenPairResultSchema,
  ],
);

const legacyCamelAuthTokenResponseSchema = z
  .object({
    accessToken: jwtTokenSchema,
    refreshToken: jwtTokenSchema,
    tokenType: z.literal("Bearer").default("Bearer"),
    expiresIn: z.number().int().min(1).max(MAX_ACCESS_TTL_SECONDS),
    refreshExpiresAt: isoDateTimeStringSchema.optional(),
  })
  .loose();

const snakeAuthTokenResponseSchema = z
  .object({
    access_token: jwtTokenSchema,
    refresh_token: jwtTokenSchema,
    refresh_token_transport: z.literal("BODY").optional(),
    token_type: z.literal("Bearer"),
    expires_in: z.number().int().min(1).max(MAX_ACCESS_TTL_SECONDS),
    refresh_expires_at: isoDateTimeStringSchema.optional(),
    user: userSummarySchema.optional(),
    permissions: z.array(permissionStringSchema).readonly().default([]),
    customer_levels: customerLevelsSchema.default([]),
    authorization_version: authorizationVersionSchema.optional(),
    session: authTokenSessionViewSchema.optional(),
    actor: authTokenActorViewSchema.optional(),
  })
  .loose();

type UserSummary = z.infer<typeof userSummarySchema>;
type AuthTokenActorView = z.infer<typeof authTokenActorViewSchema>;

const normalizedAuthTokenSharedShape = {
  access_token: jwtTokenSchema,
  token_type: z.literal("Bearer"),
  expires_in: z.number().int().min(1).max(MAX_ACCESS_TTL_SECONDS),
  refresh_expires_at: isoDateTimeStringSchema.optional(),
  user: userSummarySchema.optional(),
  permissions: z.array(permissionStringSchema).readonly(),
  customer_levels: customerLevelsSchema,
  authorization_version: authorizationVersionSchema,
  session: authTokenSessionViewSchema.optional(),
  actor: authTokenActorViewSchema.optional(),
} as const;

const normalizedBodyAuthTokenResponseSchema = z
  .object({
    ...normalizedAuthTokenSharedShape,
    refresh_token: jwtTokenSchema,
    refresh_token_transport: z.literal("BODY"),
  })
  .strict();

const normalizedCookieAuthTokenResponseSchema = z
  .object({
    ...normalizedAuthTokenSharedShape,
    refresh_token: z.null(),
    refresh_token_transport: z.literal("HTTP_ONLY_COOKIE"),
  })
  .strict();

const normalizedAuthTokenResponseSchema = z.discriminatedUnion(
  "refresh_token_transport",
  [
    normalizedBodyAuthTokenResponseSchema,
    normalizedCookieAuthTokenResponseSchema,
  ],
);

type NormalizedAuthTokenResponse = z.infer<
  typeof normalizedAuthTokenResponseSchema
>;

function normalizedUserFromTokenActor(
  actor: AuthTokenActorView,
): UserSummary | undefined {
  if (actor.userId === null) {
    return undefined;
  }

  return {
    id: actor.userId,
    user_id: actor.userId,
    display_name: null,
    primary_email: null,
  };
}

export const authTokenResponseSchema = z
  .union([
    backendAuthTokenPairResultSchema.transform(
      (value): NormalizedAuthTokenResponse => {
        const normalizedUser = normalizedUserFromTokenActor(value.actor);
        const shared = {
          access_token: value.accessToken,
          token_type: value.tokenType,
          expires_in: value.expiresInSeconds,
          refresh_expires_at: secondsUntilIso(value.refreshExpiresInSeconds),
          permissions: value.actor.permissions,
          customer_levels: value.actor.customerLevels,
          authorization_version: value.actor.authorizationVersion,
          ...(normalizedUser !== undefined ? { user: normalizedUser } : {}),
          session: value.session,
          actor: value.actor,
        } as const;

        return value.refreshTokenTransport === "BODY"
          ? {
              ...shared,
              refresh_token: value.refreshToken,
              refresh_token_transport: value.refreshTokenTransport,
            }
          : {
              ...shared,
              refresh_token: null,
              refresh_token_transport: value.refreshTokenTransport,
            };
      },
    ),
    legacyCamelAuthTokenResponseSchema.transform(
      (value): z.infer<typeof normalizedBodyAuthTokenResponseSchema> => ({
        access_token: value.accessToken,
        refresh_token: value.refreshToken,
        refresh_token_transport: "BODY",
        token_type: value.tokenType,
        expires_in: value.expiresIn,
        ...(value.refreshExpiresAt !== undefined
          ? { refresh_expires_at: value.refreshExpiresAt }
          : {}),
        permissions: [],
        customer_levels: [],
        authorization_version: null,
      }),
    ),
    snakeAuthTokenResponseSchema.transform(
      (value): z.infer<typeof normalizedBodyAuthTokenResponseSchema> => ({
        access_token: value.access_token,
        refresh_token: value.refresh_token,
        refresh_token_transport: "BODY",
        token_type: value.token_type,
        expires_in: value.expires_in,
        ...(value.refresh_expires_at !== undefined
          ? { refresh_expires_at: value.refresh_expires_at }
          : {}),
        ...(value.user !== undefined ? { user: value.user } : {}),
        permissions: value.permissions,
        customer_levels:
          value.actor?.customerLevels ??
          value.session?.customerLevels ??
          value.customer_levels,
        authorization_version:
          value.actor?.authorizationVersion ??
          value.session?.authorizationVersion ??
          value.authorization_version ??
          null,
        ...(value.session !== undefined ? { session: value.session } : {}),
        ...(value.actor !== undefined ? { actor: value.actor } : {}),
      }),
    ),
  ])
  .pipe(normalizedAuthTokenResponseSchema);

export const authBodyTokenResponseSchema = authTokenResponseSchema.pipe(
  normalizedBodyAuthTokenResponseSchema,
);

export const authSessionResponseSchema = authBodyTokenResponseSchema.transform(
  (value) => ({
    authenticated: true as const,
    token_type: value.token_type,
    expires_in: value.expires_in,
    refresh_token_transport: value.refresh_token_transport,
    customer_levels: value.customer_levels,
    authorization_version: value.authorization_version,
    ...(value.refresh_expires_at !== undefined
      ? { refresh_expires_at: value.refresh_expires_at }
      : {}),
    ...(value.user !== undefined ? { user: value.user } : {}),
    permissions: value.permissions,
  }),
);

export const refreshRequestSchema = z
  .object({
    clientId: clientIdSchema,
    refreshToken: jwtTokenSchema,
    deviceFingerprint: deviceFingerprintSchema.nullable().optional(),
  })
  .strict()
  .transform((value) => ({
    clientId: value.clientId,
    refreshToken: value.refreshToken,
    ...(value.deviceFingerprint != null
      ? { deviceFingerprint: value.deviceFingerprint }
      : {}),
  }));

export const refreshTokenRequestSchema = refreshRequestSchema;

export const logoutRequestSchema = z
  .object({})
  .loose()
  .transform(() => ({}));
export const logoutTokenRequestSchema = z
  .object({
    refresh_token: jwtTokenSchema.optional(),
  })
  .loose();
export const logoutResponseSchema = z
  .union([
    z.null().transform(() => ({ revoked: true as const })),
    z.undefined().transform(() => ({ revoked: true as const })),
    z
      .object({
        revoked: z.boolean().default(true),
      })
      .loose(),
  ])
  .transform((value) => ({ revoked: value.revoked }));

export const tenantMembershipSchema = z
  .object({
    tenant_id: uuidSchema,
    tenant_name: z.string().trim().min(1).max(255),
    role: roleNameSchema.nullable().optional(),
  })
  .loose();

const menuScopeSchema = z
  .object({
    tenant_id: optionalNullableUuidSchema,
    org_unit_id: optionalNullableUuidSchema,
  })
  .loose();

const menuBadgeSchema = z
  .object({
    text: z.string().trim().min(1).max(32).optional(),
    color: z.string().trim().min(1).max(32).optional(),
  })
  .loose();

const menuBaseSchema = z
  .object({
    menuid: z.string().trim().min(1).max(128),
    title: z.string().trim().min(1).max(160),
    url: z.string().trim().min(1).max(2_048),
    menugroup: z.string().trim().min(1).max(160).nullable().optional(),
    parentid: z.string().trim().min(1).max(128).nullable().optional(),
    icon: z.string().trim().min(1).max(64).nullable().optional(),
    description: z.string().trim().min(1).max(512).nullable().optional(),
    sortorder: z.number().default(0),
    isvisible: z.boolean().default(true),
    isactive: z.boolean().default(true),
    scope: menuScopeSchema.optional(),
    badgeconfig: menuBadgeSchema.nullable().optional(),
  })
  .loose();

export type MenuItem = z.infer<typeof menuBaseSchema> & {
  readonly children?: readonly MenuItem[] | undefined;
};

export const menuItemSchema: z.ZodType<MenuItem> = z.lazy(() =>
  menuBaseSchema.extend({
    children: z.array(menuItemSchema).readonly().optional(),
  }),
);

export const authActorViewSchema = z
  .object({
    userId: uuidSchema,
    tenantId: nullableUuidSchema,
    orgUnitId: nullableUuidSchema,
    actorKind: actorKindSchema,
    clientId: clientIdSchema.nullable(),
    roles: z.array(roleNameSchema).readonly(),
    permissions: z.array(permissionStringSchema).readonly(),
    customerId: nullableUuidSchema,
    customerLevels: customerLevelsSchema,
    dealerOrgUnitId: nullableUuidSchema,
    financierId: nullableUuidSchema,
    financierOrgUnitId: nullableUuidSchema,
    sessionId: uuidSchema.nullable(),
    authorizationVersion: authorizationVersionSchema,
    requestId: z.string().trim().min(1).max(128),
    correlationId: z.string().trim().min(1).max(128),
  })
  .strict();

export const authRoleGrantSchema = z
  .object({
    roleId: uuidSchema,
    roleName: roleNameSchema,
    scope: z.string().trim().min(1).max(128),
    tenantId: nullableUuidSchema,
    permissions: z.array(permissionStringSchema).readonly(),
  })
  .strict();

export const authTenantMembershipSchema = z
  .object({
    tenantId: uuidSchema,
    tenantName: z.string().trim().min(1).max(256),
    code: z.string().trim().min(1).max(64).nullable(),
    status: z.string().trim().min(1).max(64),
    dataRegion: z.string().trim().min(1).max(64).nullable(),
    defaultLocale: z.string().trim().min(1).max(64).nullable(),
    defaultTimezone: z.string().trim().min(1).max(128).nullable(),
  })
  .strict();

export const authUserProfileSchema = z
  .object({
    userId: uuidSchema,
    displayName: z.string().trim().max(256).nullable(),
    status: z.string().trim().min(1).max(64),
    locale: z.string().trim().min(1).max(64).nullable(),
    pictureUrl: z.string().trim().max(2_048).nullable(),
    primaryEmail: nullableEmailSchema,
    primaryPhoneMasked: z.string().trim().max(64).nullable(),
    lastLoginAt: isoDateTimeStringSchema.nullable(),
    createdAt: isoDateTimeStringSchema,
    updatedAt: isoDateTimeStringSchema,
  })
  .strict();

export const authCustomerProfileSchema = z
  .object({
    customerId: uuidSchema,
    tenantId: uuidSchema,
    name: z.string().trim().min(1).max(256),
    email: nullableEmailSchema,
    phoneMasked: z.string().trim().max(64).nullable(),
    primaryPhoneId: uuidSchema.nullable(),
    preferredMsgChannel: z.string().trim().min(1).max(64).nullable(),
    preferredMsgLanguage: z.string().trim().min(1).max(64).nullable(),
    levels: customerLevelsSchema,
    createdAt: isoDateTimeStringSchema,
  })
  .strict();

export const authUserPermissionResolutionSchema = z
  .object({
    rolePermissions: z.array(permissionStringSchema).readonly(),
    directAllows: z.array(permissionStringSchema).readonly(),
    directDenies: z.array(permissionStringSchema).readonly(),
    effectivePermissions: z.array(permissionStringSchema).readonly(),
    usesRoleFallback: z.boolean(),
  })
  .strict();

export const authMeResultSchema = z
  .object({
    actor: authActorViewSchema,
    principalKind: principalKindSchema,
    user: authUserProfileSchema.nullable(),
    customer: authCustomerProfileSchema.nullable(),
    roles: z.array(authRoleGrantSchema).readonly(),
    tenants: z.array(authTenantMembershipSchema).default([]),
    effectivePermissions: z.array(permissionStringSchema).readonly(),
    permissionResolution: authUserPermissionResolutionSchema.nullable(),
  })
  .strict();

export const authSessionSummarySchema = z
  .object({
    sessionId: uuidSchema,
    principalKind: principalKindSchema,
    project: z.string().trim().min(1).max(64),
    createdAt: isoDateTimeStringSchema,
    expiresAt: isoDateTimeStringSchema.nullable(),
    isCurrent: z.boolean(),
    isExpired: z.boolean(),
    hasActiveRefreshToken: z.boolean(),
    ipAddress: z.string().trim().min(1).max(128).nullable(),
    userAgent: z.string().trim().min(1).max(1_024).nullable(),
    deviceFingerprintPresent: z.boolean(),
  })
  .strict();

export const authPaginationSchema = z
  .object({
    limit: z.number().int().min(1).max(100),
    hasNextPage: z.boolean(),
    nextCursor: z
      .string()
      .trim()
      .min(16)
      .max(512)
      .regex(/^[A-Za-z0-9_-]+$/u)
      .nullable(),
  })
  .strict();

export const authSessionsMetaSchema = z
  .object({
    pagination: authPaginationSchema,
  })
  .strict();

export const authListSessionsQuerySchema = z
  .object({
    limit: z.number().int().min(1).max(100).default(20),
    cursor: z
      .string()
      .trim()
      .min(16)
      .max(512)
      .regex(/^[A-Za-z0-9_-]+$/u)
      .optional(),
  })
  .strict();

const flatMeResponseSchema = z
  .object({
    user_id: uuidSchema.nullable(),
    client_id: clientIdSchema.nullable(),
    device_fp: z.string().trim().min(1).max(512).nullable(),
    tenant_id: uuidSchema.nullable(),
    permissions: z.array(permissionStringSchema).readonly(),
    project: projectSchema.nullable(),
    display_name: z.string().trim().min(1).max(256).nullable(),
    primary_email: nullableEmailSchema,
    picture_url: z.string().trim().max(2_048).nullable(),
    roles: z.array(roleNameSchema).readonly(),
    primary_role: roleNameSchema.nullable(),
    tenants: z.array(tenantMembershipSchema).readonly(),
    menus: z.array(menuItemSchema).readonly(),
    auth: authMeResultSchema.optional(),
  })
  .loose();

export const meResponseSchema = z.union([
  flatMeResponseSchema,
  authMeResultSchema.transform(
    (value): z.infer<typeof flatMeResponseSchema> => {
      const roleNames = value.roles.map((role) => role.roleName);
      const fallbackRoles =
        roleNames.length > 0 ? roleNames : [...value.actor.roles];
      const primaryRole = fallbackRoles[0] ?? null;
      const userId = value.actor.userId;
      const displayName =
        value.user?.displayName ?? value.customer?.name ?? null;
      const primaryEmail =
        value.user?.primaryEmail ?? value.customer?.email ?? null;
      const pictureUrl = value.user?.pictureUrl ?? null;
      const tenants = value.tenants.map((tenant) => ({
        tenant_id: tenant.tenantId,
        tenant_name: tenant.tenantName,
      }));

      return {
        user_id: userId,
        client_id: value.actor.clientId,
        device_fp: null,
        tenant_id: value.actor.tenantId,
        permissions: value.effectivePermissions,
        project: DEFAULT_PROJECT,
        display_name: displayName,
        primary_email: primaryEmail,
        picture_url: pictureUrl,
        roles: fallbackRoles,
        primary_role: primaryRole,
        tenants,
        menus: [],
        auth: value,
      };
    },
  ),
]);

export type Project = z.infer<typeof projectSchema>;
export type PrincipalKind = z.infer<typeof principalKindSchema>;
export type AuthCustomerLevel = z.infer<typeof authCustomerLevelSchema>;
export type AuthRefreshTokenTransport = z.infer<
  typeof authRefreshTokenTransportSchema
>;
export type AuthOtpDeliveryChannel = z.infer<
  typeof authOtpDeliveryChannelSchema
>;
export type ActorKind = z.infer<typeof actorKindSchema>;
export type LoginStartRequest = z.infer<typeof loginStartRequestSchema>;
export type LoginStartResponse = z.infer<typeof loginStartResponseSchema>;
export type LoginVerifyRequest = z.infer<typeof loginVerifyRequestSchema>;
export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;
export type AuthBodyTokenResponse = z.infer<typeof authBodyTokenResponseSchema>;
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;
export type LogoutTokenRequest = z.infer<typeof logoutTokenRequestSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
export type TenantMembership = z.infer<typeof tenantMembershipSchema>;
export type AuthUserPermissionResolution = z.infer<
  typeof authUserPermissionResolutionSchema
>;
export type AuthMeResult = z.infer<typeof authMeResultSchema>;
export type AuthSessionSummary = z.infer<typeof authSessionSummarySchema>;
export type AuthPagination = z.infer<typeof authPaginationSchema>;
export type AuthSessionsMeta = z.infer<typeof authSessionsMetaSchema>;
export type AuthListSessionsQuery = z.infer<typeof authListSessionsQuerySchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;

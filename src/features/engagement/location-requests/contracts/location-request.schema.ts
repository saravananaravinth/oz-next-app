// oz-next-app/src/features/engagement/location-requests/contracts/location-request.schema.ts
import { z } from "zod";

const SAFE_PUBLIC_LOCATION_TOKEN_PATTERN = /^[A-Za-z0-9._~:-]+$/u;

export const publicLocationTokenSchema = z
  .string()
  .trim()
  .min(32)
  .max(256)
  .regex(SAFE_PUBLIC_LOCATION_TOKEN_PATTERN);

export const publicLocationSubmitRequestSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracyMeters: z.number().min(0).max(100_000).optional(),
  })
  .strict();

export const publicLocationSubmitResponseSchema = z
  .object({
    accepted: z.literal(true),
    tenantId: z.uuid(),
    leadId: z.uuid(),
  })
  .strict();

export type PublicLocationSubmitRequest = z.infer<
  typeof publicLocationSubmitRequestSchema
>;

export type PublicLocationSubmitResponse = z.infer<
  typeof publicLocationSubmitResponseSchema
>;

export function buildPublicLocationSubmitPath(
  token: string,
): `/erp/engagement/public/location/${string}` {
  const safeToken = publicLocationTokenSchema.parse(token);

  return `/erp/engagement/public/location/${encodeURIComponent(safeToken)}`;
}

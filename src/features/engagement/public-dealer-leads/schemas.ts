// oz-next-app/src/features/engagement/public-dealer-leads/schemas.ts
import { z } from "zod";

const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9._~:-]+$/u;
const isoOffsetDateTimeSchema = z
  .string()
  .trim()
  .pipe(z.iso.datetime({ offset: true }));
const trimmedUrlSchema = z.string().trim().pipe(z.url());

export const DEALER_LEAD_STATUS_VALUES = [
  "CONTACTED",
  "NOT_REACHABLE",
  "INTERESTED",
  "NOT_INTERESTED",
] as const;

export const IVR_FLOW_CODE_VALUES = [
  "VEHICLE_ENQUIRIES",
  "DEALERSHIP",
  "WARRANTY_TAMIL",
  "SERVICE_ENQUIRIES",
] as const;

export const publicDealerLeadTokenSchema = z
  .string()
  .trim()
  .min(32)
  .max(256)
  .regex(SAFE_TOKEN_PATTERN);

export const dealerLeadStatusSchema = z.enum(DEALER_LEAD_STATUS_VALUES);
export const ivrFlowCodeSchema = z.enum(IVR_FLOW_CODE_VALUES);

export type DealerLeadStatus = z.infer<typeof dealerLeadStatusSchema>;
export type IvrFlowCode = z.infer<typeof ivrFlowCodeSchema>;

export const dealerLeadPublicViewSchema = z
  .object({
    tenantId: z.uuid(),
    leadId: z.uuid(),
    leadNo: z.string().trim().min(1).max(128),
    leadType: z.string().trim().min(1).max(128),
    status: z.string().trim().min(1).max(128),
    createdAt: isoOffsetDateTimeSchema,
    updatedAt: isoOffsetDateTimeSchema,
    nextFollowUpAt: isoOffsetDateTimeSchema.nullable(),
    dealerOrgUnitId: z.uuid().nullable(),
    pipeline: z
      .object({
        code: z.string().trim().max(128).nullable(),
        name: z.string().trim().max(256).nullable(),
      })
      .strict(),
    stage: z
      .object({
        code: z.string().trim().max(128).nullable(),
        name: z.string().trim().max(256).nullable(),
      })
      .strict(),
    source: z
      .object({
        code: z.string().trim().max(128).nullable(),
        name: z.string().trim().max(256).nullable(),
      })
      .strict(),
    customer: z
      .object({
        name: z.string().trim().max(256).nullable(),
        phoneMasked: z.string().trim().max(64).nullable(),
        city: z.string().trim().max(128).nullable(),
        district: z.string().trim().max(128).nullable(),
        state: z.string().trim().max(128).nullable(),
        postalCode: z.string().trim().max(16).nullable(),
        latitude: z.number().min(-90).max(90).nullable(),
        longitude: z.number().min(-180).max(180).nullable(),
        googleMapsUrl: trimmedUrlSchema.nullable(),
      })
      .strict(),
    dealerUpdate: z
      .object({
        latestCustomerName: z.string().trim().max(256).nullable(),
        latestNote: z.string().trim().max(4_000).nullable(),
        latestStatus: z.string().trim().max(128).nullable(),
        editableFields: z.array(z.string().trim().min(1).max(128)).max(32),
        canUpdate: z.boolean(),
        canForward: z.boolean(),
        expiresAt: isoOffsetDateTimeSchema,
        remainingUses: z.number().int().min(0).max(10_000),
      })
      .strict(),
  })
  .strict();

export type DealerLeadPublicView = z.infer<typeof dealerLeadPublicViewSchema>;

export const dealerLeadUpdateRequestSchema = z
  .object({
    customerName: z.string().trim().min(1).max(256).optional(),
    note: z.string().trim().min(1).max(4_000).optional(),
    followUpAt: isoOffsetDateTimeSchema.optional(),
    status: dealerLeadStatusSchema.optional(),
  })
  .strict();

export type DealerLeadUpdateRequest = z.infer<
  typeof dealerLeadUpdateRequestSchema
>;

export const dealerLeadForwardRequestSchema = z
  .object({
    targetIvrFlowCode: ivrFlowCodeSchema,
    reason: z.string().trim().min(1).max(1_000),
  })
  .strict();

export type DealerLeadForwardRequest = z.infer<
  typeof dealerLeadForwardRequestSchema
>;

export const dealerLeadMutationResponseSchema = z
  .object({
    accepted: z.literal(true),
    tenantId: z.uuid(),
    leadId: z.uuid(),
    dealerOrgUnitId: z.uuid().nullable(),
  })
  .strict();

export type DealerLeadMutationResponse = z.infer<
  typeof dealerLeadMutationResponseSchema
>;

export const dealerLeadUpdateFormSchema = z
  .object({
    customerName: z.string().trim().max(256, "Customer name is too long."),
    status: z.union([dealerLeadStatusSchema, z.literal("")]),
    followUpAtLocal: z.string().trim().max(32),
    note: z.string().trim().max(4_000, "Note is too long."),
  })
  .strict();

export type DealerLeadUpdateFormValues = z.infer<
  typeof dealerLeadUpdateFormSchema
>;

export const dealerLeadForwardFormSchema = z
  .object({
    targetIvrFlowCode: ivrFlowCodeSchema,
    reason: z.string().trim().min(1, "Forward reason is required.").max(1_000),
  })
  .strict();

export type DealerLeadForwardFormValues = z.infer<
  typeof dealerLeadForwardFormSchema
>;

export function buildPublicDealerLeadViewPath(
  token: string,
): `/erp/engagement/public/dealer-leads/${string}` {
  const parsedToken = publicDealerLeadTokenSchema.parse(token);

  return `/erp/engagement/public/dealer-leads/${encodeURIComponent(parsedToken)}`;
}

export function buildPublicDealerLeadUpdatePath(
  token: string,
): `/erp/engagement/public/dealer-leads/${string}/update` {
  const parsedToken = publicDealerLeadTokenSchema.parse(token);

  return `/erp/engagement/public/dealer-leads/${encodeURIComponent(parsedToken)}/update`;
}

export function buildPublicDealerLeadForwardPath(
  token: string,
): `/erp/engagement/public/dealer-leads/${string}/forward` {
  const parsedToken = publicDealerLeadTokenSchema.parse(token);

  return `/erp/engagement/public/dealer-leads/${encodeURIComponent(parsedToken)}/forward`;
}

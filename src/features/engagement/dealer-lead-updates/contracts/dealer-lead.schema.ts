// oz-next-app/src/features/engagement/dealer-lead-updates/contracts/dealer-lead.schema.ts
import { z } from "zod";

const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9._~:-]+$/u;
const DATE_TIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u;

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

export const DEALER_LEAD_ACTION_VALUES = ["UPDATE", "FORWARD"] as const;

export const DEALER_LEAD_WORKFLOW_STEP_VALUES = [
  "ACTION",
  "FOLLOW_UP_DETAILS",
  "NEXT_FOLLOW_UP",
  "CALL_NOTE",
  "HISTORY",
] as const;

export const DEALER_LEAD_HISTORY_KIND_VALUES = [
  "CALL",
  "FOLLOW_UP",
  "WHATSAPP",
  "ROUTING",
  "STATUS",
  "NOTE",
  "ASSIGNMENT",
  "SYSTEM",
] as const;

export const DEALER_LEAD_EDITABLE_FIELD_VALUES = [
  "customerName",
  "note",
  "followUpAt",
  "status",
  "forwardFlow",
] as const;

export const publicDealerLeadTokenSchema = z
  .string()
  .trim()
  .min(32)
  .max(256)
  .regex(SAFE_TOKEN_PATTERN);

export const dealerLeadStatusSchema = z.enum(DEALER_LEAD_STATUS_VALUES);
export const ivrFlowCodeSchema = z.enum(IVR_FLOW_CODE_VALUES);
export const dealerLeadActionSchema = z.enum(DEALER_LEAD_ACTION_VALUES);
export const dealerLeadWorkflowStepSchema = z.enum(
  DEALER_LEAD_WORKFLOW_STEP_VALUES,
);
export const dealerLeadHistoryKindSchema = z.enum(
  DEALER_LEAD_HISTORY_KIND_VALUES,
);
export const dealerLeadEditableFieldSchema = z.enum(
  DEALER_LEAD_EDITABLE_FIELD_VALUES,
);

export type DealerLeadStatus = z.infer<typeof dealerLeadStatusSchema>;
export type IvrFlowCode = z.infer<typeof ivrFlowCodeSchema>;
export type DealerLeadAction = z.infer<typeof dealerLeadActionSchema>;
export type DealerLeadWorkflowStep = z.infer<
  typeof dealerLeadWorkflowStepSchema
>;
export type DealerLeadHistoryKind = z.infer<typeof dealerLeadHistoryKindSchema>;
export type DealerLeadEditableField = z.infer<
  typeof dealerLeadEditableFieldSchema
>;

function isValidDateTimeLocal(value: string): boolean {
  if (value.length === 0) return true;
  const match = DATE_TIME_LOCAL_PATTERN.exec(value);
  if (match === null) return false;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0,
  );
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day) &&
    date.getHours() === Number(hour) &&
    date.getMinutes() === Number(minute)
  );
}

const dealerVehicleCandidateSchema = z
  .object({
    dealerOrgUnitId: z.uuid(),
    name: z.string().trim().min(1).max(256),
    district: z.string().trim().max(128).nullable(),
    distanceKm: z.number().min(0).max(50_000),
    isCurrent: z.boolean(),
  })
  .strict();

const dealerLeadHistoryItemSchema = z
  .object({
    id: z.string().trim().min(1).max(256),
    kind: dealerLeadHistoryKindSchema,
    title: z.string().trim().min(1).max(256),
    description: z.string().trim().max(4_000).nullable(),
    occurredAt: isoOffsetDateTimeSchema,
    status: z.string().trim().max(128).nullable(),
    channel: z.enum(["CALL", "WHATSAPP", "SYSTEM"]).nullable(),
    actorLabel: z.string().trim().max(256).nullable(),
  })
  .strict();

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
    workflow: z
      .object({
        nextStep: dealerLeadWorkflowStepSchema,
        completedSteps: z.array(dealerLeadWorkflowStepSchema).max(5),
      })
      .strict(),
    vehicleRouting: z
      .object({
        locationAvailable: z.boolean(),
        currentDealer: z
          .object({
            dealerOrgUnitId: z.uuid(),
            name: z.string().trim().min(1).max(256),
            district: z.string().trim().max(128).nullable(),
          })
          .strict()
          .nullable(),
        options: z.array(dealerVehicleCandidateSchema).max(50),
      })
      .strict(),
    history: z
      .object({
        items: z.array(dealerLeadHistoryItemSchema).max(200),
        truncated: z.boolean(),
      })
      .strict(),
    dealerUpdate: z
      .object({
        latestAction: dealerLeadActionSchema.nullable(),
        latestCustomerName: z.string().trim().max(256).nullable(),
        latestNote: z.string().trim().max(4_000).nullable(),
        latestStatus: z.string().trim().max(128).nullable(),
        editableFields: z.array(dealerLeadEditableFieldSchema).max(5),
        canUpdate: z.boolean(),
        canForward: z.boolean(),
        expiresAt: isoOffsetDateTimeSchema,
        remainingUses: z.number().int().min(0).max(10_000),
      })
      .strict(),
  })
  .strict();

export type DealerLeadPublicView = z.infer<typeof dealerLeadPublicViewSchema>;
export type DealerLeadHistoryItem = z.infer<typeof dealerLeadHistoryItemSchema>;
export type DealerVehicleCandidate = z.infer<
  typeof dealerVehicleCandidateSchema
>;

export const dealerLeadUpdateRequestSchema = z
  .object({
    customerName: z.string().trim().min(1).max(256).optional(),
    note: z.string().trim().min(1).max(4_000).optional(),
    followUpAt: isoOffsetDateTimeSchema.optional(),
    status: dealerLeadStatusSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.customerName !== undefined ||
      value.note !== undefined ||
      value.followUpAt !== undefined ||
      value.status !== undefined,
    "At least one follow-up field must be updated.",
  );

export type DealerLeadUpdateRequest = z.infer<
  typeof dealerLeadUpdateRequestSchema
>;

export const dealerLeadForwardRequestSchema = z
  .object({
    targetIvrFlowCode: ivrFlowCodeSchema,
    targetDealerOrgUnitId: z.uuid().optional(),
    reason: z.string().trim().min(1).max(1_000),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.targetDealerOrgUnitId !== undefined &&
      value.targetIvrFlowCode !== "VEHICLE_ENQUIRIES"
    ) {
      context.addIssue({
        code: "custom",
        path: ["targetDealerOrgUnitId"],
        message: "A dealer can be selected only for a vehicle enquiry.",
      });
    }
  });

export type DealerLeadForwardRequest = z.infer<
  typeof dealerLeadForwardRequestSchema
>;

export const dealerLeadMutationResponseSchema = z
  .object({
    accepted: z.literal(true),
    tenantId: z.uuid(),
    leadId: z.uuid(),
    dealerOrgUnitId: z.uuid().nullable(),
    linkStillValid: z.boolean(),
  })
  .strict();

export type DealerLeadMutationResponse = z.infer<
  typeof dealerLeadMutationResponseSchema
>;

export const dealerLeadUpdateFormSchema = z
  .object({
    customerName: z.string().trim().max(256, "Customer name is too long."),
    status: z.union([dealerLeadStatusSchema, z.literal("")]),
    followUpAtLocal: z
      .string()
      .trim()
      .max(32)
      .refine(isValidDateTimeLocal, "Enter a valid follow-up date and time."),
    note: z.string().trim().max(4_000, "Call note is too long."),
  })
  .strict();

export type DealerLeadUpdateFormValues = z.infer<
  typeof dealerLeadUpdateFormSchema
>;

export const dealerLeadFollowUpDetailsFormSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(1, "Enter the customer name.")
      .max(256, "Customer name is too long."),
    status: dealerLeadStatusSchema,
  })
  .strict();

export const dealerLeadNextFollowUpFormSchema = z
  .object({
    followUpAtLocal: z
      .string()
      .trim()
      .min(1, "Choose the next follow-up date and time.")
      .max(32)
      .refine(isValidDateTimeLocal, "Enter a valid follow-up date and time."),
  })
  .strict();

export const dealerLeadCallNoteFormSchema = z
  .object({
    note: z
      .string()
      .trim()
      .min(1, "Add a short call note.")
      .max(4_000, "Call note is too long."),
  })
  .strict();

export const dealerLeadForwardFormSchema = z
  .object({
    targetIvrFlowCode: ivrFlowCodeSchema,
    targetDealerOrgUnitId: z.union([z.uuid(), z.literal("")]),
    reason: z
      .string()
      .trim()
      .min(1, "Please explain why this enquiry should be routed.")
      .max(1_000, "Routing note is too long."),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.targetDealerOrgUnitId.length > 0 &&
      value.targetIvrFlowCode !== "VEHICLE_ENQUIRIES"
    ) {
      context.addIssue({
        code: "custom",
        path: ["targetDealerOrgUnitId"],
        message: "A dealer can be selected only for a vehicle enquiry.",
      });
    }
  });

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

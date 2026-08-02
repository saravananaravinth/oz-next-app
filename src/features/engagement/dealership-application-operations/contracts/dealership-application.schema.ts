// oz-next-app/src/features/engagement/dealership-application-operations/contracts/dealership-application.schema.ts
import { z } from "zod";

const DASHBOARD_TIMEZONE = "Asia/Kolkata" as const;
const DAY_MS = 86_400_000;
const DEFAULT_RANGE_DAYS = 30;
const SAFE_CODE_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/u;
const INDIA_MOBILE_PATTERN = /^\+91[6-9][0-9]{9}$/u;

export const DEALERSHIP_APPLICATION_PHASES = [
  "APPLICATION",
  "ONBOARDING",
  "ACTIVE",
  "EXIT",
  "CLOSED",
] as const;

export const DEALERSHIP_APPLICATION_STATUSES = [
  "AWAITING_FORM",
  "NEW",
  "UNDER_REVIEW",
  "CONTACT_PENDING",
  "APPOINTMENT_SCHEDULED",
  "EVALUATION_IN_PROGRESS",
  "QUALIFIED",
  "REJECTED",
  "WITHDRAWN",
  "CANCELLED",
  "DOCUMENTS_PENDING",
  "COMPLIANCE_REVIEW",
  "RISK_REVIEW",
  "APPROVAL_PENDING",
  "APPROVED",
  "PROFILE_PROVISIONING",
  "TRAINING_PENDING",
  "ACTIVATION_PENDING",
  "ACTIVE",
  "EXIT_INITIATED",
  "EXIT_CLEARANCE",
  "ACCESS_REVOCATION",
  "SETTLEMENT_PENDING",
  "EXITED",
] as const;

export const DEALERSHIP_APPLICATION_PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
] as const;

export const DEALERSHIP_APPLICATION_ACTIVITY_KINDS = [
  "CALL",
  "FOLLOW_UP",
  "APPOINTMENT",
  "MEETING_NOTE_TEXT",
  "MEETING_NOTE_AUDIO",
  "INTERNAL_NOTE",
  "EMAIL",
  "WHATSAPP",
  "TRAINING",
  "COMPLIANCE_REVIEW",
  "RISK_REVIEW",
  "EXIT_REVIEW",
] as const;

export const DEALERSHIP_APPLICATION_ACTIVITY_STATUSES = [
  "OPEN",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export const DEALERSHIP_APPLICATION_DOCUMENT_KINDS = [
  "BUSINESS_REGISTRATION",
  "GST_REGISTRATION",
  "PAN_CARD",
  "IDENTITY_PROOF",
  "ADDRESS_PROOF",
  "BANK_PROOF",
  "FINANCIAL_STATEMENT",
  "SITE_OWNERSHIP_OR_LEASE",
  "SITE_PHOTOS",
  "SIGNED_DEALER_AGREEMENT",
  "SECURITY_DEPOSIT_PROOF",
  "TRAINING_CERTIFICATE",
  "EXIT_SETTLEMENT",
  "EXIT_HANDOVER",
  "OTHER",
] as const;

export const DEALERSHIP_APPLICATION_DOCUMENT_STATUSES = [
  "REQUESTED",
  "UPLOADED",
  "VERIFIED",
  "REJECTED",
  "EXPIRED",
] as const;

export const DEALERSHIP_APPLICATION_CHECKLIST_PHASES = [
  "ONBOARDING",
  "EXIT",
] as const;

export const DEALERSHIP_APPLICATION_CHECKLIST_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "WAIVED",
  "BLOCKED",
] as const;

export const DEALERSHIP_APPLICATION_GRAINS = ["DAY", "WEEK", "MONTH"] as const;
export const DEALERSHIP_APPLICATION_SORT_FIELDS = [
  "CREATED_AT",
  "UPDATED_AT",
  "NEXT_ACTION_AT",
  "PRIORITY",
  "APPLICATION_NO",
] as const;
export const DEALERSHIP_APPLICATION_SORT_DIRECTIONS = ["ASC", "DESC"] as const;
export const DEALERSHIP_APPLICATION_PAGE_LIMITS = [25, 50, 100] as const;
export const DEALER_ORG_UNIT_TYPES = ["DEALER", "SUB_DEALER"] as const;

const uuidSchema = z.string().trim().pipe(z.uuid());
const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Date must use YYYY-MM-DD.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Invalid date.");
const isoDateTimeSchema = z.iso.datetime({ offset: true });
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const rowVersionSchema = z.number().int().min(1);
const reasonSchema = z.string().trim().min(3).max(2_000);
const noteSchema = z.string().trim().min(1).max(10_000);
const safeTextSchema = z.string().trim().min(1).max(256);
const safeCodeSchema = z.string().trim().regex(SAFE_CODE_PATTERN);
const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(IDEMPOTENCY_KEY_PATTERN);
const jsonValueSchema: z.ZodType = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);
const jsonObjectSchema = z.record(z.string(), jsonValueSchema);
const templateValueSchema = z.union([
  z.string().max(10_000),
  z.number(),
  z.boolean(),
]);

function firstValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function optionalSingleSchema<TSchema extends z.ZodType>(schema: TSchema) {
  return z.preprocess((value) => {
    const single = firstValue(value);
    return single === "" ? undefined : single;
  }, schema.optional());
}

function csvArraySchema<TSchema extends z.ZodType>(
  schema: TSchema,
  maximumItems: number,
) {
  return z.preprocess(
    (value: unknown): unknown => {
      if (value === undefined || value === null || value === "") {
        return [];
      }

      const rawValues = Array.isArray(value) ? value : [value];
      const flattened: unknown[] = [];

      for (const entry of rawValues) {
        if (typeof entry === "string") {
          flattened.push(...entry.split(",").map((item) => item.trim()));
        } else {
          flattened.push(entry);
        }
      }

      return flattened.filter((item) => item !== "");
    },
    z
      .array(schema)
      .max(maximumItems)
      .transform((values) => [...new Set(values)]),
  );
}

function pageLimitSchema() {
  return z.preprocess((value) => {
    const single = firstValue(value);
    if (single === undefined || single === "") return 25;
    return typeof single === "string" && /^\d+$/u.test(single)
      ? Number(single)
      : single;
  }, z.number().int().min(1).max(100));
}

function dateInKolkata(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");

  if (year === undefined || month === undefined || day === undefined) {
    throw new Error("dealership_dashboard_current_date_unavailable");
  }

  return `${year}-${month}-${day}`;
}

export function addDealershipApplicationDays(
  value: string,
  days: number,
): string {
  return new Date(Date.parse(`${value}T00:00:00.000Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function inclusiveDealershipApplicationDayCount(
  from: string,
  to: string,
): number {
  return (
    Math.floor(
      (Date.parse(`${to}T00:00:00.000Z`) -
        Date.parse(`${from}T00:00:00.000Z`)) /
        DAY_MS,
    ) + 1
  );
}

const rawSearchParamsSchema = z
  .object({
    from: optionalSingleSchema(isoDateSchema),
    to: optionalSingleSchema(isoDateSchema),
    grain: optionalSingleSchema(z.enum(DEALERSHIP_APPLICATION_GRAINS)),
    phase: csvArraySchema(z.enum(DEALERSHIP_APPLICATION_PHASES), 5),
    status: csvArraySchema(z.enum(DEALERSHIP_APPLICATION_STATUSES), 26),
    priority: csvArraySchema(z.enum(DEALERSHIP_APPLICATION_PRIORITIES), 4),
    sourceKind: csvArraySchema(safeCodeSchema, 16),
    sourceId: csvArraySchema(uuidSchema, 32),
    ownerUserId: csvArraySchema(uuidSchema, 50),
    ownerOrgUnitId: csvArraySchema(uuidSchema, 50),
    district: csvArraySchema(z.string().trim().min(1).max(128), 50),
    city: csvArraySchema(z.string().trim().min(1).max(128), 50),
    q: optionalSingleSchema(z.string().trim().min(2).max(100)),
    sortBy: optionalSingleSchema(z.enum(DEALERSHIP_APPLICATION_SORT_FIELDS)),
    sortDirection: optionalSingleSchema(
      z.enum(DEALERSHIP_APPLICATION_SORT_DIRECTIONS),
    ),
    limit: pageLimitSchema(),
    cursor: optionalSingleSchema(z.string().trim().min(1).max(2_048)),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.from === undefined || value.to === undefined) return;

    if (value.from > value.to) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "to must be on or after from.",
      });
      return;
    }

    if (inclusiveDealershipApplicationDayCount(value.from, value.to) > 366) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "Date range cannot exceed 366 days.",
      });
    }
  })
  .transform((value) => {
    const to = value.to ?? dateInKolkata();
    const from =
      value.from ?? addDealershipApplicationDays(to, -(DEFAULT_RANGE_DAYS - 1));

    return {
      from,
      to,
      grain: value.grain ?? "DAY",
      phases: value.phase,
      statuses: value.status,
      priorities: value.priority,
      sourceKinds: value.sourceKind,
      sourceIds: value.sourceId,
      ownerUserIds: value.ownerUserId,
      ownerOrgUnitIds: value.ownerOrgUnitId,
      districts: value.district,
      cities: value.city,
      q: value.q,
      sortBy: value.sortBy ?? "CREATED_AT",
      sortDirection: value.sortDirection ?? "DESC",
      limit: value.limit,
      cursor: value.cursor,
    } as const;
  });

export type DealershipApplicationRawSearchParams = Readonly<
  Record<string, string | string[] | undefined>
>;
export type DealershipApplicationSearchParams = z.output<
  typeof rawSearchParamsSchema
>;
export type DealershipApplicationPhase =
  (typeof DEALERSHIP_APPLICATION_PHASES)[number];
export type DealershipApplicationStatus =
  (typeof DEALERSHIP_APPLICATION_STATUSES)[number];
export type DealershipApplicationPriority =
  (typeof DEALERSHIP_APPLICATION_PRIORITIES)[number];
export type DealershipApplicationActivityKind =
  (typeof DEALERSHIP_APPLICATION_ACTIVITY_KINDS)[number];
export type DealershipApplicationActivityStatus =
  (typeof DEALERSHIP_APPLICATION_ACTIVITY_STATUSES)[number];
export type DealershipApplicationDocumentKind =
  (typeof DEALERSHIP_APPLICATION_DOCUMENT_KINDS)[number];
export type DealershipApplicationDocumentStatus =
  (typeof DEALERSHIP_APPLICATION_DOCUMENT_STATUSES)[number];
export type DealershipApplicationChecklistPhase =
  (typeof DEALERSHIP_APPLICATION_CHECKLIST_PHASES)[number];
export type DealershipApplicationChecklistStatus =
  (typeof DEALERSHIP_APPLICATION_CHECKLIST_STATUSES)[number];
export type DealershipApplicationGrain =
  (typeof DEALERSHIP_APPLICATION_GRAINS)[number];
export type DealerOrgUnitType = (typeof DEALER_ORG_UNIT_TYPES)[number];

export function parseDealershipApplicationSearchParams(
  raw: DealershipApplicationRawSearchParams,
) {
  return rawSearchParamsSchema.safeParse(raw);
}

export const dealershipApplicationListItemSchema = z
  .object({
    applicationId: uuidSchema,
    leadId: uuidSchema,
    leadNo: z.string().min(1).max(128),
    formSubmissionId: uuidSchema.nullable(),
    applicationNo: z.string().max(128).nullable(),
    applicantName: z.string().min(1).max(256),
    applicantMobileMasked: z.string().max(64).nullable(),
    applicantEmail: z.string().max(320).nullable(),
    sourceId: uuidSchema.nullable(),
    sourceCode: z.string().max(128).nullable(),
    sourceName: z.string().max(256).nullable(),
    sourceKind: z.string().max(128).nullable(),
    phase: z.enum(DEALERSHIP_APPLICATION_PHASES),
    status: z.enum(DEALERSHIP_APPLICATION_STATUSES),
    priority: z.enum(DEALERSHIP_APPLICATION_PRIORITIES),
    ownerUserId: uuidSchema.nullable(),
    ownerName: z.string().max(256).nullable(),
    ownerOrgUnitId: uuidSchema.nullable(),
    ownerOrgUnitName: z.string().max(256).nullable(),
    district: z.string().max(128).nullable(),
    city: z.string().max(128).nullable(),
    state: z.string().max(128).nullable(),
    nextActionAt: isoDateTimeSchema.nullable(),
    overdue: z.boolean(),
    openActivityCount: nonNegativeIntegerSchema,
    pendingMandatoryChecklistCount: nonNegativeIntegerSchema,
    dealerOrgUnitId: uuidSchema.nullable(),
    dealerName: z.string().max(256).nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    rowVersion: rowVersionSchema,
  })
  .strict();

export const dealershipApplicationPageSchema = z
  .object({
    asOf: isoDateTimeSchema,
    items: z.array(dealershipApplicationListItemSchema),
    pagination: z
      .object({
        limit: z.number().int().min(1).max(100),
        hasMore: z.boolean(),
        nextCursor: z.string().min(1).max(2_048).nullable(),
      })
      .strict(),
  })
  .strict();

export const dealershipApplicationDashboardSummarySchema = z
  .object({
    asOf: isoDateTimeSchema,
    range: z.object({ from: isoDateSchema, to: isoDateSchema }).strict(),
    kpis: z.array(
      z
        .object({
          key: z.string().min(1).max(128),
          label: z.string().min(1).max(256),
          value: z.number().nonnegative(),
          trendPercentage: z.number().nullable(),
          comparisonValue: z.number().nonnegative().nullable(),
          severity: z.enum(["NEUTRAL", "GOOD", "WARNING", "CRITICAL"]),
        })
        .strict(),
    ),
    workQueue: z
      .object({
        unassigned: nonNegativeIntegerSchema,
        overdueFollowUps: nonNegativeIntegerSchema,
        appointmentsToday: nonNegativeIntegerSchema,
        complianceBlocked: nonNegativeIntegerSchema,
        activationPending: nonNegativeIntegerSchema,
        exitPending: nonNegativeIntegerSchema,
      })
      .strict(),
  })
  .strict();

export const dealershipApplicationSourceSeriesSchema = z
  .object({
    asOf: isoDateTimeSchema,
    grain: z.enum(DEALERSHIP_APPLICATION_GRAINS),
    points: z.array(
      z
        .object({
          bucketStart: isoDateTimeSchema,
          bucketEnd: isoDateTimeSchema,
          total: nonNegativeIntegerSchema,
          sources: z.record(
            z.string().min(1).max(300),
            nonNegativeIntegerSchema,
          ),
        })
        .strict(),
    ),
    sourceKeys: z.array(
      z
        .object({
          key: z.string().min(1).max(300),
          sourceId: uuidSchema.nullable(),
          code: z.string().min(1).max(128),
          name: z.string().min(1).max(256),
          kind: z.string().min(1).max(128),
        })
        .strict(),
    ),
  })
  .strict();

export const dealershipApplicationFunnelSchema = z
  .object({
    asOf: isoDateTimeSchema,
    stages: z.array(
      z
        .object({
          status: z.enum(DEALERSHIP_APPLICATION_STATUSES),
          label: z.string().min(1).max(256),
          count: nonNegativeIntegerSchema,
          conversionFromPreviousPercentage: z
            .number()
            .min(0)
            .max(100)
            .nullable(),
        })
        .strict(),
    ),
  })
  .strict();

const dealershipDistrictAssignmentSchema = z
  .object({
    districtId: uuidSchema,
    staffUserId: uuidSchema,
    staffName: z.string().min(1).max(256),
    staffOrgUnitId: uuidSchema,
    staffOrgUnitName: z.string().min(1).max(256),
    rowVersion: rowVersionSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const dealershipDistrictAssignmentCatalogSchema = z
  .object({
    asOf: isoDateTimeSchema,
    districts: z.array(
      z
        .object({
          districtId: uuidSchema,
          stateId: uuidSchema,
          stateName: z.string().min(1).max(128),
          districtName: z.string().min(1).max(128),
        })
        .strict(),
    ),
    staff: z.array(
      z
        .object({
          userId: uuidSchema,
          name: z.string().min(1).max(256),
          orgUnitId: uuidSchema,
          orgUnitName: z.string().min(1).max(256),
        })
        .strict(),
    ),
    assignments: z.array(dealershipDistrictAssignmentSchema),
  })
  .strict();

export const dealershipDistrictAssignmentMutationResultSchema = z
  .object({
    assignments: z.array(dealershipDistrictAssignmentSchema),
    affectedCaseCount: nonNegativeIntegerSchema,
  })
  .strict();

export const dealershipApplicationActivitySchema = z
  .object({
    activityId: uuidSchema,
    kind: z.enum(DEALERSHIP_APPLICATION_ACTIVITY_KINDS),
    status: z.enum(DEALERSHIP_APPLICATION_ACTIVITY_STATUSES),
    title: z.string().min(1).max(256),
    note: z.string().max(10_000).nullable(),
    outcome: z.string().max(1_000).nullable(),
    dueAt: isoDateTimeSchema.nullable(),
    scheduledStartAt: isoDateTimeSchema.nullable(),
    scheduledEndAt: isoDateTimeSchema.nullable(),
    startedAt: isoDateTimeSchema.nullable(),
    completedAt: isoDateTimeSchema.nullable(),
    cancelledAt: isoDateTimeSchema.nullable(),
    ownerUserId: uuidSchema.nullable(),
    ownerName: z.string().max(256).nullable(),
    audioFileId: uuidSchema.nullable(),
    communicationMessageId: uuidSchema.nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    rowVersion: rowVersionSchema,
  })
  .strict();

export const dealershipApplicationDocumentSchema = z
  .object({
    documentId: uuidSchema,
    kind: z.enum(DEALERSHIP_APPLICATION_DOCUMENT_KINDS),
    status: z.enum(DEALERSHIP_APPLICATION_DOCUMENT_STATUSES),
    fileId: uuidSchema,
    originalFilename: z.string().max(512).nullable(),
    mimeType: z.string().max(256).nullable(),
    sizeBytes: nonNegativeIntegerSchema.nullable(),
    expiresAt: isoDateTimeSchema.nullable(),
    verifiedAt: isoDateTimeSchema.nullable(),
    verifiedBy: uuidSchema.nullable(),
    rejectionReason: z.string().max(2_000).nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    rowVersion: rowVersionSchema,
  })
  .strict();

export const dealershipApplicationChecklistItemSchema = z
  .object({
    checklistItemId: uuidSchema,
    phase: z.enum(DEALERSHIP_APPLICATION_CHECKLIST_PHASES),
    code: z.string().min(1).max(128),
    label: z.string().min(1).max(256),
    status: z.enum(DEALERSHIP_APPLICATION_CHECKLIST_STATUSES),
    mandatory: z.boolean(),
    sequence: z.number().int().nonnegative(),
    dueAt: isoDateTimeSchema.nullable(),
    completedAt: isoDateTimeSchema.nullable(),
    completedBy: uuidSchema.nullable(),
    note: z.string().max(2_000).nullable(),
    rowVersion: rowVersionSchema,
  })
  .strict();

export const dealershipApplicationEventSchema = z
  .object({
    eventId: uuidSchema,
    eventType: z.string().min(1).max(256),
    fromPhase: z.enum(DEALERSHIP_APPLICATION_PHASES).nullable(),
    toPhase: z.enum(DEALERSHIP_APPLICATION_PHASES).nullable(),
    fromStatus: z.enum(DEALERSHIP_APPLICATION_STATUSES).nullable(),
    toStatus: z.enum(DEALERSHIP_APPLICATION_STATUSES).nullable(),
    actorUserId: uuidSchema.nullable(),
    actorName: z.string().max(256).nullable(),
    reason: z.string().max(2_000).nullable(),
    occurredAt: isoDateTimeSchema,
  })
  .strict();

export const dealershipApplicationSubmissionSchema = z
  .object({
    formSubmissionId: uuidSchema,
    applicationNo: z.string().max(128).nullable(),
    submittedAt: isoDateTimeSchema,
    current: z.boolean(),
  })
  .strict();

export const dealershipApplicationDetailSchema = z
  .object({
    application: dealershipApplicationListItemSchema
      .extend({
        validatedPayload: jsonObjectSchema,
        rejectionReason: z.string().max(2_000).nullable(),
        closureReason: z.string().max(2_000).nullable(),
        proposedOrgUnitType: z.enum(DEALER_ORG_UNIT_TYPES).nullable(),
        marginSourceOrgUnitId: uuidSchema.nullable(),
        dealerUserId: uuidSchema.nullable(),
        activatedAt: isoDateTimeSchema.nullable(),
        exitInitiatedAt: isoDateTimeSchema.nullable(),
        exitedAt: isoDateTimeSchema.nullable(),
      })
      .strict(),
    activities: z.array(dealershipApplicationActivitySchema),
    documents: z.array(dealershipApplicationDocumentSchema),
    checklist: z.array(dealershipApplicationChecklistItemSchema),
    submissions: z.array(dealershipApplicationSubmissionSchema),
    events: z.array(dealershipApplicationEventSchema),
  })
  .strict();

export const dealershipApplicationFilterOptionsSchema = z
  .object({
    sources: z.array(
      z
        .object({
          sourceId: uuidSchema,
          code: z.string().min(1).max(128),
          name: z.string().min(1).max(256),
          kind: z.string().min(1).max(128),
        })
        .strict(),
    ),
    owners: z.array(
      z
        .object({ userId: uuidSchema, name: z.string().min(1).max(256) })
        .strict(),
    ),
    ownerOrgUnits: z.array(
      z
        .object({
          orgUnitId: uuidSchema,
          code: z.string().min(1).max(128),
          name: z.string().min(1).max(256),
        })
        .strict(),
    ),
    marginTemplates: z.array(
      z
        .object({
          orgUnitId: uuidSchema,
          code: z.string().min(1).max(128),
          name: z.string().min(1).max(256),
          type: z.enum(DEALER_ORG_UNIT_TYPES),
          activeMarginCount: nonNegativeIntegerSchema,
          preferred: z.boolean(),
        })
        .strict(),
    ),
  })
  .strict();

export const dealershipApplicationCaseResultSchema = z
  .object({
    applicationId: uuidSchema,
    status: z.enum(DEALERSHIP_APPLICATION_STATUSES),
    phase: z.enum(DEALERSHIP_APPLICATION_PHASES),
    rowVersion: rowVersionSchema,
  })
  .strict();
export const dealershipApplicationActivityResultSchema = z
  .object({
    applicationId: uuidSchema,
    activityId: uuidSchema,
    status: z.enum(DEALERSHIP_APPLICATION_ACTIVITY_STATUSES),
    rowVersion: rowVersionSchema,
  })
  .strict();
export const dealershipApplicationDocumentResultSchema = z
  .object({
    applicationId: uuidSchema,
    documentId: uuidSchema,
    fileId: uuidSchema,
    status: z.enum(DEALERSHIP_APPLICATION_DOCUMENT_STATUSES),
    rowVersion: rowVersionSchema,
  })
  .strict();
export const dealershipApplicationChecklistResultSchema = z
  .object({
    applicationId: uuidSchema,
    checklistItemId: uuidSchema,
    status: z.enum(DEALERSHIP_APPLICATION_CHECKLIST_STATUSES),
    rowVersion: rowVersionSchema,
  })
  .strict();
export const dealershipApplicationProvisionResultSchema = z
  .object({
    applicationId: uuidSchema,
    dealerOrgUnitId: uuidSchema,
    dealerCode: z.string().min(1).max(128),
    dealerUserId: uuidSchema,
    marginSourceOrgUnitId: uuidSchema,
    activeMarginCount: z.number().int().positive(),
    rowVersion: rowVersionSchema,
  })
  .strict();
export const dealershipApplicationCommunicationResultSchema = z
  .object({
    applicationId: uuidSchema,
    messageId: uuidSchema,
    activityId: uuidSchema,
    channel: z.enum(["EMAIL", "WHATSAPP"]),
    status: z.string().min(1).max(128),
    taskStatus: z.enum(["created", "deduplicated", "disabled"]),
  })
  .strict();
export const dealershipApplicationExitResultSchema = z
  .object({
    applicationId: uuidSchema,
    dealerOrgUnitId: uuidSchema,
    dealerUserId: uuidSchema,
    revokedSessionCount: nonNegativeIntegerSchema,
    closedMarginCount: nonNegativeIntegerSchema,
    rowVersion: rowVersionSchema,
  })
  .strict();
export const dealershipApplicationDownloadSchema = z
  .object({ url: z.url(), expiresAt: isoDateTimeSchema })
  .strict();

export const dealershipDistrictAssignmentsUpdateActionInputSchema = z
  .object({
    changes: z
      .array(
        z
          .object({
            districtId: uuidSchema,
            staffUserId: uuidSchema.nullable(),
            expectedRowVersion: rowVersionSchema.nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    reason: reasonSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .superRefine((value, context) => {
    const seen = new Set<string>();
    for (const [index, change] of value.changes.entries()) {
      if (seen.has(change.districtId)) {
        context.addIssue({
          code: "custom",
          path: ["changes", index, "districtId"],
          message: "Each district may appear only once.",
        });
      }
      seen.add(change.districtId);
    }
  });

export const dealershipApplicationClaimActionInputSchema = z
  .object({
    applicationId: uuidSchema,
    reason: reasonSchema,
    rowVersion: rowVersionSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const dealershipApplicationAssignActionInputSchema = z
  .object({
    applicationId: uuidSchema,
    ownerUserId: uuidSchema.nullable(),
    ownerOrgUnitId: uuidSchema,
    reason: reasonSchema,
    rowVersion: rowVersionSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const dealershipApplicationCancelActionInputSchema = z
  .object({
    applicationId: uuidSchema,
    reason: reasonSchema,
    rowVersion: rowVersionSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const dealershipApplicationTransitionActionInputSchema = z
  .object({
    applicationId: uuidSchema,
    status: z.enum(DEALERSHIP_APPLICATION_STATUSES),
    reason: reasonSchema,
    note: noteSchema.optional(),
    nextActionAt: isoDateTimeSchema.nullable().optional(),
    priority: z.enum(DEALERSHIP_APPLICATION_PRIORITIES).optional(),
    rejectionReason: reasonSchema.optional(),
    rowVersion: rowVersionSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "REJECTED" && value.rejectionReason === undefined) {
      context.addIssue({
        code: "custom",
        path: ["rejectionReason"],
        message: "A rejection reason is required.",
      });
    }
  });

export const dealershipApplicationActivityCreateActionInputSchema = z
  .object({
    applicationId: uuidSchema,
    kind: z.enum(DEALERSHIP_APPLICATION_ACTIVITY_KINDS),
    status: z.enum(DEALERSHIP_APPLICATION_ACTIVITY_STATUSES).default("OPEN"),
    title: safeTextSchema,
    note: noteSchema.optional(),
    outcome: z.string().trim().min(1).max(1_000).optional(),
    dueAt: isoDateTimeSchema.optional(),
    scheduledStartAt: isoDateTimeSchema.optional(),
    scheduledEndAt: isoDateTimeSchema.optional(),
    ownerUserId: uuidSchema.optional(),
    audioFileId: uuidSchema.optional(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.kind === "MEETING_NOTE_AUDIO" &&
      value.audioFileId === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["audioFileId"],
        message: "A CLEAN centralized audio file is required.",
      });
    }

    if (value.kind === "APPOINTMENT") {
      if (
        value.scheduledStartAt === undefined ||
        value.scheduledEndAt === undefined
      ) {
        context.addIssue({
          code: "custom",
          path: ["scheduledStartAt"],
          message: "Appointment start and end times are required.",
        });
      } else if (value.scheduledStartAt >= value.scheduledEndAt) {
        context.addIssue({
          code: "custom",
          path: ["scheduledEndAt"],
          message: "Appointment end time must be after the start time.",
        });
      }
    }
  });

export const dealershipApplicationActivityUpdateActionInputSchema = z
  .object({
    applicationId: uuidSchema,
    activityId: uuidSchema,
    status: z.enum(DEALERSHIP_APPLICATION_ACTIVITY_STATUSES),
    note: noteSchema.optional(),
    outcome: z.string().trim().min(1).max(1_000).optional(),
    dueAt: isoDateTimeSchema.nullable().optional(),
    scheduledStartAt: isoDateTimeSchema.nullable().optional(),
    scheduledEndAt: isoDateTimeSchema.nullable().optional(),
    reason: reasonSchema,
    rowVersion: rowVersionSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const dealershipApplicationDocumentBindActionInputSchema = z
  .object({
    applicationId: uuidSchema,
    fileId: uuidSchema,
    kind: z.enum(DEALERSHIP_APPLICATION_DOCUMENT_KINDS),
    expiresAt: isoDateTimeSchema.optional(),
    note: z.string().trim().min(1).max(1_000).optional(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const dealershipApplicationDocumentReviewActionInputSchema = z
  .object({
    applicationId: uuidSchema,
    documentId: uuidSchema,
    status: z.enum(["VERIFIED", "REJECTED", "EXPIRED"]),
    reason: reasonSchema,
    rowVersion: rowVersionSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const dealershipApplicationChecklistActionInputSchema = z
  .object({
    applicationId: uuidSchema,
    checklistItemId: uuidSchema,
    status: z.enum(DEALERSHIP_APPLICATION_CHECKLIST_STATUSES),
    note: z.string().trim().min(1).max(2_000).nullable().optional(),
    dueAt: isoDateTimeSchema.nullable().optional(),
    reason: reasonSchema,
    rowVersion: rowVersionSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const dealershipApplicationProvisionActionInputSchema = z
  .object({
    applicationId: uuidSchema,
    parentOrgUnitId: uuidSchema,
    orgUnitType: z.enum(DEALER_ORG_UNIT_TYPES),
    dealerName: z.string().trim().min(2).max(256),
    loginDisplayName: z.string().trim().min(2).max(256),
    loginEmail: z.email().max(320),
    loginPhoneE164: z.string().trim().regex(INDIA_MOBILE_PATTERN),
    marginSourceOrgUnitId: uuidSchema.optional(),
    roleName: z.literal("dealer_admin").default("dealer_admin"),
    addressLine1: z.string().trim().min(3).max(512),
    addressLine2: z.string().trim().max(512).optional(),
    city: z.string().trim().min(2).max(128),
    district: z.string().trim().min(2).max(128),
    state: z.string().trim().min(2).max(128),
    postalCode: z
      .string()
      .trim()
      .regex(/^[1-9][0-9]{5}$/u),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    contactVerified: z.literal(true),
    reason: reasonSchema,
    rowVersion: rowVersionSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.latitude === undefined) !== (value.longitude === undefined)) {
      context.addIssue({
        code: "custom",
        path: ["longitude"],
        message: "Latitude and longitude must be provided together.",
      });
    }
  });

const emailVariablesSchema = z
  .record(
    z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z][a-z0-9_]*$/u),
    templateValueSchema,
  )
  .refine((value) => Object.keys(value).length <= 96, {
    message: "Template variables cannot contain more than 96 entries.",
  });
const whatsappVariablesSchema = z
  .record(
    z
      .string()
      .trim()
      .regex(/^(?:body|header|button)_[1-9][0-9]*$/u),
    templateValueSchema,
  )
  .refine((value) => Object.keys(value).length <= 96, {
    message: "Template variables cannot contain more than 96 entries.",
  });

export const dealershipApplicationCommunicationActionInputSchema =
  z.discriminatedUnion("channel", [
    z
      .object({
        applicationId: uuidSchema,
        channel: z.literal("EMAIL"),
        templateCode: z
          .string()
          .trim()
          .min(3)
          .max(128)
          .regex(/^[a-z][a-z0-9._-]+$/u),
        locale: z
          .string()
          .trim()
          .regex(/^[a-z]{2}(-[A-Z]{2})?$/u)
          .default("en-IN"),
        templateVariables: emailVariablesSchema,
        reason: reasonSchema,
        idempotencyKey: idempotencyKeySchema,
      })
      .strict(),
    z
      .object({
        applicationId: uuidSchema,
        channel: z.literal("WHATSAPP"),
        templateCode: safeCodeSchema,
        languageCode: z
          .string()
          .trim()
          .regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/u)
          .default("en"),
        templateVariables: whatsappVariablesSchema,
        reason: reasonSchema,
        idempotencyKey: idempotencyKeySchema,
      })
      .strict(),
  ]);

export const dealershipApplicationExitInitiateActionInputSchema = z
  .object({
    applicationId: uuidSchema,
    reason: reasonSchema,
    effectiveDate: isoDateSchema,
    note: noteSchema.optional(),
    rowVersion: rowVersionSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const dealershipApplicationExitCompleteActionInputSchema = z
  .object({
    applicationId: uuidSchema,
    reason: reasonSchema,
    rowVersion: rowVersionSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const dealershipApplicationDownloadActionInputSchema = z
  .object({ applicationId: uuidSchema, documentId: uuidSchema })
  .strict();

export type DealershipApplicationListItem = z.infer<
  typeof dealershipApplicationListItemSchema
>;
export type DealershipApplicationPage = z.infer<
  typeof dealershipApplicationPageSchema
>;
export type DealershipApplicationDashboardSummary = z.infer<
  typeof dealershipApplicationDashboardSummarySchema
>;
export type DealershipApplicationSourceSeries = z.infer<
  typeof dealershipApplicationSourceSeriesSchema
>;
export type DealershipApplicationFunnel = z.infer<
  typeof dealershipApplicationFunnelSchema
>;
export type DealershipDistrictAssignmentCatalog = z.infer<
  typeof dealershipDistrictAssignmentCatalogSchema
>;
export type DealershipDistrictAssignmentMutationResult = z.infer<
  typeof dealershipDistrictAssignmentMutationResultSchema
>;
export type DealershipApplicationActivity = z.infer<
  typeof dealershipApplicationActivitySchema
>;
export type DealershipApplicationDocument = z.infer<
  typeof dealershipApplicationDocumentSchema
>;
export type DealershipApplicationChecklistItem = z.infer<
  typeof dealershipApplicationChecklistItemSchema
>;
export type DealershipApplicationDetail = z.infer<
  typeof dealershipApplicationDetailSchema
>;
export type DealershipApplicationFilterOptions = z.infer<
  typeof dealershipApplicationFilterOptionsSchema
>;
export type DealershipDistrictAssignmentsUpdateActionInput = z.input<
  typeof dealershipDistrictAssignmentsUpdateActionInputSchema
>;
export type DealershipApplicationClaimActionInput = z.input<
  typeof dealershipApplicationClaimActionInputSchema
>;
export type DealershipApplicationAssignActionInput = z.input<
  typeof dealershipApplicationAssignActionInputSchema
>;
export type DealershipApplicationCancelActionInput = z.input<
  typeof dealershipApplicationCancelActionInputSchema
>;
export type DealershipApplicationTransitionActionInput = z.input<
  typeof dealershipApplicationTransitionActionInputSchema
>;
export type DealershipApplicationActivityCreateActionInput = z.input<
  typeof dealershipApplicationActivityCreateActionInputSchema
>;
export type DealershipApplicationActivityUpdateActionInput = z.input<
  typeof dealershipApplicationActivityUpdateActionInputSchema
>;
export type DealershipApplicationDocumentBindActionInput = z.input<
  typeof dealershipApplicationDocumentBindActionInputSchema
>;
export type DealershipApplicationDocumentReviewActionInput = z.input<
  typeof dealershipApplicationDocumentReviewActionInputSchema
>;
export type DealershipApplicationChecklistActionInput = z.input<
  typeof dealershipApplicationChecklistActionInputSchema
>;
export type DealershipApplicationProvisionActionInput = z.input<
  typeof dealershipApplicationProvisionActionInputSchema
>;
export type DealershipApplicationCommunicationActionInput = z.input<
  typeof dealershipApplicationCommunicationActionInputSchema
>;
export type DealershipApplicationExitInitiateActionInput = z.input<
  typeof dealershipApplicationExitInitiateActionInputSchema
>;
export type DealershipApplicationExitCompleteActionInput = z.input<
  typeof dealershipApplicationExitCompleteActionInputSchema
>;

// oz-next-app/src/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema.ts
import { z } from "zod";

const DASHBOARD_TIMEZONE = "Asia/Kolkata" as const;
const DAY_MS = 86_400_000;
const DEFAULT_RANGE_DAYS = 30;
const SOURCE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/u;
const STATUS_TOKEN_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/u;
const SAFE_CURSOR_PATTERN = /^[A-Za-z0-9_-]{1,2048}$/u;
const SAFE_ISSUE_KEY_PATTERN =
  /^(?:lead:(?:unassigned|response-overdue|follow-up-overdue|location-missing)|dealer:(?:location-missing|inactive)|outbox:failed|video:failed):[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]+$/u;

export const ENGAGEMENT_DASHBOARD_GRAINS = [
  "AUTO",
  "DAY",
  "WEEK",
  "MONTH",
] as const;
export const ENGAGEMENT_DASHBOARD_API_GRAINS = [
  "DAY",
  "WEEK",
  "MONTH",
] as const;
export const ENGAGEMENT_DASHBOARD_COMPARISON_MODES = [
  "PREVIOUS_PERIOD",
  "NONE",
] as const;
export const ENGAGEMENT_DASHBOARD_DEALER_SORT_FIELDS = [
  "DEALER_NAME",
  "ASSIGNED_COUNT",
  "CONVERSION_RATE",
  "RESPONSE_SLA_RATE",
  "OVERDUE_FOLLOW_UP_COUNT",
  "OPEN_LEAD_COUNT",
  "ISSUE_COUNT",
  "LAST_ACTIVITY_AT",
] as const;
export const ENGAGEMENT_DASHBOARD_SORT_DIRECTIONS = ["ASC", "DESC"] as const;
export const ENGAGEMENT_DASHBOARD_PAGE_LIMITS = [25, 50, 100] as const;
export const ENGAGEMENT_ASSIGNMENT_STATES = ["ASSIGNED", "UNASSIGNED"] as const;
export const ENGAGEMENT_CONVERSION_STATES = [
  "CONVERTED",
  "NOT_CONVERTED",
] as const;
export const ENGAGEMENT_FOLLOW_UP_STATES = [
  "OVERDUE",
  "DUE_TODAY",
  "DUE_TOMORROW",
  "SCHEDULED",
] as const;
export const ENGAGEMENT_ISSUE_SEVERITIES = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;
export const ENGAGEMENT_ISSUE_CATEGORIES = [
  "UNASSIGNED_LEAD",
  "DEALER_RESPONSE_OVERDUE",
  "FOLLOW_UP_OVERDUE",
  "CUSTOMER_LOCATION_MISSING",
  "DEALER_LOCATION_MISSING",
  "DEALER_INACTIVE",
  "OUTBOX_FAILED",
  "VIDEO_MESSAGE_FAILED",
] as const;

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
const isoDateTimeSchema = z.union([
  z.iso.datetime({ offset: true }),
  z.iso.datetime(),
]);
const statusTokenSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(STATUS_TOKEN_PATTERN);
const safeTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[\p{L}\p{N} ._+\-/()]+$/u, "Contains unsupported characters.");
const sourceCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(SOURCE_CODE_PATTERN);
const sourceIdentifierSchema = z.union([
  uuidSchema,
  z.literal("00000000-0000-0000-0000-000000000000"),
]);
const nonNegativeIntSchema = z.number().int().nonnegative();
const nonNegativeNumberSchema = z.number().nonnegative();
const percentageSchema = z.number().min(0).max(100);
const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(IDEMPOTENCY_KEY_PATTERN);

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
  itemSchema: TSchema,
  maximumItems: number,
) {
  return z.preprocess(
    (value: unknown): unknown => {
      if (value === undefined || value === null || value === "") return [];
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
      .array(itemSchema)
      .max(maximumItems)
      .transform((values) => [...new Set(values)]),
  );
}

function pageLimitSchema(defaultValue: 25 | 50 | 100) {
  return z.preprocess(
    (value) => {
      const single = firstValue(value);
      if (single === undefined || single === "") return defaultValue;
      return typeof single === "string" && /^\d+$/u.test(single)
        ? Number(single)
        : single;
    },
    z.union([z.literal(25), z.literal(50), z.literal(100)]),
  );
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
    throw new Error("dashboard_current_date_unavailable");
  }
  return `${year}-${month}-${day}`;
}

export function addDashboardDays(value: string, days: number): string {
  return new Date(Date.parse(`${value}T00:00:00.000Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function inclusiveDashboardDayCount(from: string, to: string): number {
  return (
    Math.floor(
      (Date.parse(`${to}T00:00:00.000Z`) -
        Date.parse(`${from}T00:00:00.000Z`)) /
        DAY_MS,
    ) + 1
  );
}

export function previousDashboardRange(
  from: string,
  to: string,
): Readonly<{ from: string; to: string }> {
  const days = inclusiveDashboardDayCount(from, to);
  const previousTo = addDashboardDays(from, -1);
  return { from: addDashboardDays(previousTo, -(days - 1)), to: previousTo };
}

export function resolvedDashboardGrain(
  from: string,
  to: string,
  requested: EngagementDashboardGrain,
): EngagementDashboardApiGrain {
  if (requested !== "AUTO") return requested;
  const days = inclusiveDashboardDayCount(from, to);
  if (days <= 45) return "DAY";
  if (days <= 180) return "WEEK";
  return "MONTH";
}

const engagementDashboardSearchParamsSchema = z
  .object({
    tenantId: optionalSingleSchema(uuidSchema),
    from: optionalSingleSchema(isoDateSchema),
    to: optionalSingleSchema(isoDateSchema),
    comparison: optionalSingleSchema(
      z.enum(ENGAGEMENT_DASHBOARD_COMPARISON_MODES),
    ),
    grain: optionalSingleSchema(z.enum(ENGAGEMENT_DASHBOARD_GRAINS)),
    leadSourceId: csvArraySchema(uuidSchema, 20),
    ivrFlowCode: csvArraySchema(statusTokenSchema, 16),
    leadType: csvArraySchema(statusTokenSchema, 16),
    status: csvArraySchema(statusTokenSchema, 32),
    dealerOrgUnitId: csvArraySchema(uuidSchema, 50),
    district: csvArraySchema(safeTextSchema, 50),
    city: csvArraySchema(safeTextSchema, 50),
    assignmentState: csvArraySchema(z.enum(ENGAGEMENT_ASSIGNMENT_STATES), 2),
    conversionState: csvArraySchema(z.enum(ENGAGEMENT_CONVERSION_STATES), 2),
    followUpState: csvArraySchema(z.enum(ENGAGEMENT_FOLLOW_UP_STATES), 4),
    issueSeverity: csvArraySchema(z.enum(ENGAGEMENT_ISSUE_SEVERITIES), 4),
    q: optionalSingleSchema(z.string().trim().min(1).max(100)),
    dealerSortBy: optionalSingleSchema(
      z.enum(ENGAGEMENT_DASHBOARD_DEALER_SORT_FIELDS),
    ),
    dealerSortDirection: optionalSingleSchema(
      z.enum(ENGAGEMENT_DASHBOARD_SORT_DIRECTIONS),
    ),
    dealerLimit: pageLimitSchema(25),
    dealerCursor: optionalSingleSchema(
      z.string().trim().min(1).max(2048).regex(SAFE_CURSOR_PATTERN),
    ),
    issueLimit: pageLimitSchema(25),
    issueCursor: optionalSingleSchema(
      z.string().trim().min(1).max(2048).regex(SAFE_CURSOR_PATTERN),
    ),
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
    if (inclusiveDashboardDayCount(value.from, value.to) > 366) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "Date range cannot exceed 366 days.",
      });
    }
  })
  .transform((value) => {
    const to = value.to ?? dateInKolkata();
    const from = value.from ?? addDashboardDays(to, -(DEFAULT_RANGE_DAYS - 1));
    return {
      tenantId: value.tenantId,
      from,
      to,
      comparison: value.comparison ?? "PREVIOUS_PERIOD",
      grain: value.grain ?? "AUTO",
      leadSourceIds: value.leadSourceId,
      ivrFlowCodes: value.ivrFlowCode,
      leadTypes: value.leadType,
      statuses: value.status,
      dealerOrgUnitIds: value.dealerOrgUnitId,
      districts: value.district,
      cities: value.city,
      assignmentStates: value.assignmentState,
      conversionStates: value.conversionState,
      followUpStates: value.followUpState,
      issueSeverities: value.issueSeverity,
      q: value.q,
      dealerSortBy: value.dealerSortBy ?? "ISSUE_COUNT",
      dealerSortDirection: value.dealerSortDirection ?? "DESC",
      dealerLimit: value.dealerLimit,
      dealerCursor: value.dealerCursor,
      issueLimit: value.issueLimit,
      issueCursor: value.issueCursor,
    } as const;
  });

export type EngagementDashboardRawSearchParams = Readonly<
  Record<string, string | string[] | undefined>
>;
export type EngagementDashboardSearchParams = z.output<
  typeof engagementDashboardSearchParamsSchema
>;
export type EngagementDashboardGrain =
  (typeof ENGAGEMENT_DASHBOARD_GRAINS)[number];
export type EngagementDashboardApiGrain =
  (typeof ENGAGEMENT_DASHBOARD_API_GRAINS)[number];
export type EngagementDashboardDealerSortField =
  (typeof ENGAGEMENT_DASHBOARD_DEALER_SORT_FIELDS)[number];
export type EngagementDashboardSortDirection =
  (typeof ENGAGEMENT_DASHBOARD_SORT_DIRECTIONS)[number];
export type EngagementIssueSeverity =
  (typeof ENGAGEMENT_ISSUE_SEVERITIES)[number];
export type EngagementIssueCategory =
  (typeof ENGAGEMENT_ISSUE_CATEGORIES)[number];

export function parseEngagementDashboardSearchParams(
  raw: EngagementDashboardRawSearchParams,
) {
  return engagementDashboardSearchParamsSchema.safeParse(raw);
}

const rangeSchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    timezone: z.literal(DASHBOARD_TIMEZONE),
  })
  .strict();
const comparisonSchema = z
  .object({
    value: nonNegativeIntSchema,
    previousValue: nonNegativeIntSchema,
    changePct: z.number().nullable(),
    direction: z.enum(["UP", "DOWN", "UNCHANGED"]),
  })
  .strict();

export const engagementDashboardSummarySchema = z
  .object({
    range: rangeSchema,
    generatedAt: isoDateTimeSchema,
    kpis: z
      .object({
        newLeads: comparisonSchema
          .extend({ averagePerDay: nonNegativeNumberSchema })
          .strict(),
        assignmentHealth: z
          .object({
            assignedCount: nonNegativeIntSchema,
            assignableCount: nonNegativeIntSchema,
            unassignedCount: nonNegativeIntSchema,
            ratePct: percentageSchema,
            medianAssignmentMinutes: nonNegativeNumberSchema.nullable(),
          })
          .strict(),
        dealerResponseSla: z
          .object({
            respondedCount: nonNegativeIntSchema,
            eligibleCount: nonNegativeIntSchema,
            breachedCount: nonNegativeIntSchema,
            ratePct: percentageSchema,
            medianResponseMinutes: nonNegativeNumberSchema.nullable(),
          })
          .strict(),
        followUpCompliance: z
          .object({
            completedOnTimeCount: nonNegativeIntSchema,
            dueCount: nonNegativeIntSchema,
            overdueCount: nonNegativeIntSchema,
            ratePct: percentageSchema,
          })
          .strict(),
        conversion: z
          .object({
            convertedCount: nonNegativeIntSchema,
            eligibleCount: nonNegativeIntSchema,
            ratePct: percentageSchema,
            completedInPeriodCount: nonNegativeIntSchema,
            bookingCount: nonNegativeIntSchema,
          })
          .strict(),
        needsAttention: z
          .object({
            totalCount: nonNegativeIntSchema,
            criticalCount: nonNegativeIntSchema,
            highCount: nonNegativeIntSchema,
            mediumCount: nonNegativeIntSchema,
            lowCount: nonNegativeIntSchema,
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

const sourceSchema = z
  .object({
    leadSourceId: sourceIdentifierSchema,
    code: sourceCodeSchema,
    name: z.string().trim().min(1).max(256),
    totalCount: nonNegativeIntSchema,
  })
  .strict();

export const engagementLeadSourceSeriesSchema = z
  .object({
    range: rangeSchema
      .extend({ grain: z.enum(ENGAGEMENT_DASHBOARD_API_GRAINS) })
      .strict(),
    generatedAt: isoDateTimeSchema,
    sources: z.array(sourceSchema).max(7).readonly(),
    points: z
      .array(
        z
          .object({
            periodStart: isoDateSchema,
            totalCount: nonNegativeIntSchema,
            sourceCounts: z
              .record(sourceCodeSchema, nonNegativeIntSchema)
              .readonly(),
          })
          .strict(),
      )
      .max(366)
      .readonly(),
  })
  .strict()
  .superRefine((value, context) => {
    const sourceCodes = new Set(value.sources.map((source) => source.code));
    for (const [pointIndex, point] of value.points.entries()) {
      let total = 0;
      for (const [code, count] of Object.entries(point.sourceCounts)) {
        total += count;
        if (!sourceCodes.has(code)) {
          context.addIssue({
            code: "custom",
            path: ["points", pointIndex, "sourceCounts", code],
            message: "Source count key is not declared in sources.",
          });
        }
      }
      if (total !== point.totalCount) {
        context.addIssue({
          code: "custom",
          path: ["points", pointIndex, "totalCount"],
          message: "totalCount must equal the sum of sourceCounts.",
        });
      }
    }
  });

export const engagementFunnelSchema = z
  .object({
    range: rangeSchema,
    generatedAt: isoDateTimeSchema,
    stages: z
      .array(
        z
          .object({
            code: z.enum([
              "NEW",
              "ASSIGNED",
              "CONTACTED",
              "BOOKED",
              "CONVERTED",
            ]),
            name: z.string().trim().min(1).max(128),
            count: nonNegativeIntSchema,
            previousStageCount: nonNegativeIntSchema.nullable(),
            dropOffPct: percentageSchema.nullable(),
            medianMinutesFromPrevious: nonNegativeNumberSchema.nullable(),
          })
          .strict(),
      )
      .length(5)
      .readonly(),
  })
  .strict();

export const engagementDealerPerformanceItemSchema = z
  .object({
    dealerOrgUnitId: uuidSchema,
    dealerCode: z.string().trim().min(1).max(128),
    dealerName: z.string().trim().min(1).max(256),
    orgUnitActive: z.boolean(),
    engagementActive: z.boolean(),
    district: z.string().trim().max(128).nullable(),
    city: z.string().trim().max(128).nullable(),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    googleMapsUrl: z.url().max(2048).nullable(),
    locationStatus: z.enum([
      "READY",
      "MISSING_COORDINATES",
      "MISSING_LOCATION",
      "INACTIVE_LOCATION",
    ]),
    supportsVehicleEnquiries: z.boolean(),
    supportsServiceEnquiries: z.boolean(),
    supportsWarranty: z.boolean(),
    assignedCount: nonNegativeIntSchema,
    openLeadCount: nonNegativeIntSchema,
    bookedCount: nonNegativeIntSchema,
    convertedCount: nonNegativeIntSchema,
    conversionRatePct: percentageSchema,
    responseSlaRatePct: percentageSchema,
    medianFirstResponseMinutes: nonNegativeNumberSchema.nullable(),
    followUpsDueCount: nonNegativeIntSchema,
    overdueFollowUpCount: nonNegativeIntSchema,
    failedCommunicationCount: nonNegativeIntSchema,
    issueCount: nonNegativeIntSchema,
    oldestUntouchedLeadAt: isoDateTimeSchema.nullable(),
    lastActivityAt: isoDateTimeSchema.nullable(),
    health: z
      .object({
        status: z.enum([
          "HEALTHY",
          "WATCH",
          "AT_RISK",
          "CONFIGURATION_ISSUE",
          "INACTIVE",
        ]),
        reasons: z.array(z.string().trim().min(1).max(500)).max(20).readonly(),
      })
      .strict(),
    rowVersion: nonNegativeIntSchema,
  })
  .strict();

const keysetPaginationSchema = z
  .object({
    limit: z.number().int().min(1).max(100),
    hasMore: z.boolean(),
    nextCursor: z.string().trim().min(1).max(2048).nullable(),
  })
  .strict();

export const engagementDealerPerformanceResultSchema = z
  .object({
    asOf: isoDateTimeSchema,
    items: z.array(engagementDealerPerformanceItemSchema).max(100).readonly(),
    pagination: keysetPaginationSchema,
  })
  .strict();

export const engagementDashboardIssueSchema = z
  .object({
    issueKey: z.string().trim().min(8).max(128).regex(SAFE_ISSUE_KEY_PATTERN),
    category: z.enum(ENGAGEMENT_ISSUE_CATEGORIES),
    severity: z.enum(ENGAGEMENT_ISSUE_SEVERITIES),
    title: z.string().trim().min(1).max(256),
    detail: z.string().trim().min(1).max(2000),
    leadId: uuidSchema.nullable(),
    leadNo: z.string().trim().min(1).max(128).nullable(),
    dealerOrgUnitId: uuidSchema.nullable(),
    dealerName: z.string().trim().min(1).max(256).nullable(),
    customerName: z.string().trim().min(1).max(256).nullable(),
    customerContactMasked: z.string().trim().min(1).max(128).nullable(),
    flowCode: z.string().trim().min(1).max(64).nullable(),
    issueAgeMinutes: nonNegativeNumberSchema,
    occurredAt: isoDateTimeSchema,
    lastSuccessfulAt: isoDateTimeSchema.nullable(),
    recommendedAction: z.string().trim().min(1).max(1000),
    retryEligible: z.boolean(),
    state: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]),
    resolutionNote: z.string().trim().min(1).max(2000).nullable(),
    rowVersion: nonNegativeIntSchema,
  })
  .strict();

export const engagementDashboardIssueResultSchema = z
  .object({
    asOf: isoDateTimeSchema,
    items: z.array(engagementDashboardIssueSchema).max(100).readonly(),
    pagination: keysetPaginationSchema,
  })
  .strict();

export const engagementCoverageResultSchema = z
  .object({
    generatedAt: isoDateTimeSchema,
    items: z
      .array(
        z
          .object({
            district: z.string().trim().min(1).max(128),
            leadCount: nonNegativeIntSchema,
            activeDealerCount: nonNegativeIntSchema,
            unassignedLeadCount: nonNegativeIntSchema,
            convertedCount: nonNegativeIntSchema,
            conversionRatePct: percentageSchema,
            medianAssignmentDistanceKm: nonNegativeNumberSchema.nullable(),
            risk: z.enum([
              "NONE",
              "LOW_COVERAGE",
              "NO_ACTIVE_DEALER",
              "HIGH_UNASSIGNED",
            ]),
          })
          .strict(),
      )
      .max(500)
      .readonly(),
  })
  .strict();

export const engagementFilterOptionsSchema = z
  .object({
    leadSources: z
      .array(
        z
          .object({
            id: uuidSchema,
            code: sourceCodeSchema,
            name: z.string().trim().min(1).max(256),
            active: z.boolean(),
          })
          .strict(),
      )
      .max(1000)
      .readonly(),
    dealers: z
      .array(
        z
          .object({
            id: uuidSchema,
            code: z.string().trim().min(1).max(128),
            name: z.string().trim().min(1).max(256),
            active: z.boolean(),
          })
          .strict(),
      )
      .max(5000)
      .readonly(),
    districts: z.array(safeTextSchema).max(1000).readonly(),
    cities: z.array(safeTextSchema).max(5000).readonly(),
    leadTypes: z.array(statusTokenSchema).max(100).readonly(),
    statuses: z.array(statusTokenSchema).max(200).readonly(),
    ivrFlows: z
      .array(
        z
          .object({
            code: statusTokenSchema,
            name: z.string().trim().min(1).max(256),
            active: z.boolean(),
          })
          .strict(),
      )
      .max(500)
      .readonly(),
  })
  .strict();

export const engagementDealerDetailSchema =
  engagementDealerPerformanceItemSchema
    .extend({
      address: z
        .object({
          line1: z.string().trim().max(512).nullable(),
          line2: z.string().trim().max(512).nullable(),
          state: z.string().trim().max(128).nullable(),
          postalCode: z.string().trim().max(32).nullable(),
          country: z.string().trim().min(1).max(128),
          timezone: z.string().trim().min(1).max(128),
        })
        .strict(),
      settings: z
        .object({
          priority: z.number().int().min(1),
          assignmentWeight: z.number().positive(),
          maxOpenLeads: nonNegativeIntSchema.nullable(),
          maxAssignmentDistanceKm: nonNegativeNumberSchema.nullable(),
          businessHours: z.record(z.string(), z.unknown()).readonly(),
          updatedAt: isoDateTimeSchema,
        })
        .strict(),
    })
    .strict();

export const engagementLeadDetailSchema = z
  .object({
    leadId: uuidSchema,
    leadNo: z.string().trim().min(1).max(128),
    leadType: z.string().trim().min(1).max(64),
    status: z.string().trim().min(1).max(64),
    source: z
      .object({
        id: uuidSchema,
        code: sourceCodeSchema,
        name: z.string().trim().min(1).max(256),
      })
      .strict(),
    customer: z
      .object({
        prospectId: uuidSchema,
        name: z.string().trim().min(1).max(256).nullable(),
        contactMasked: z.string().trim().min(1).max(128).nullable(),
      })
      .strict(),
    dealer: z
      .object({
        id: uuidSchema,
        code: z.string().trim().min(1).max(128),
        name: z.string().trim().min(1).max(256),
      })
      .strict()
      .nullable(),
    location: z
      .object({
        city: z.string().trim().max(128).nullable(),
        district: z.string().trim().max(128).nullable(),
        state: z.string().trim().max(128).nullable(),
        postalCode: z.string().trim().max(32).nullable(),
        latitude: z.number().min(-90).max(90).nullable(),
        longitude: z.number().min(-180).max(180).nullable(),
      })
      .strict(),
    nextFollowUpAt: isoDateTimeSchema.nullable(),
    ownerAssignedAt: isoDateTimeSchema.nullable(),
    convertedAt: isoDateTimeSchema.nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    rowVersion: nonNegativeIntSchema,
    timeline: z
      .array(
        z
          .object({
            eventId: uuidSchema,
            type: z.string().trim().min(1).max(128),
            occurredAt: isoDateTimeSchema,
            actorKind: z.string().trim().min(1).max(64).nullable(),
            payload: z.record(z.string(), z.unknown()).readonly(),
          })
          .strict(),
      )
      .max(200)
      .readonly(),
  })
  .strict();

export const engagementSupportIssueActionResultSchema = z
  .object({
    issueKey: z.string().trim().min(8).max(128),
    state: z.enum(["ACKNOWLEDGED", "RESOLVED"]),
    resolutionNote: z.string().trim().min(1).max(2000).nullable(),
    rowVersion: nonNegativeIntSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const engagementSupportRetryResultSchema = z
  .object({
    accepted: z.boolean(),
    resourceId: uuidSchema,
    operation: z.enum(["OUTBOX_RETRY", "VIDEO_MESSAGE_RETRY", "LEAD_REASSIGN"]),
    outcome: z.enum(["QUEUED", "COMPLETED", "NO_ELIGIBLE_DEALER", "NOOP"]),
  })
  .strict();

export const dealerSettingsMutationResultSchema = z
  .object({
    dealerOrgUnitId: uuidSchema,
    orgUnitActive: z.boolean(),
    engagementActive: z.boolean(),
    supportsVehicleEnquiries: z.boolean(),
    supportsServiceEnquiries: z.boolean(),
    supportsWarranty: z.boolean(),
    priority: z.number().int().min(1),
    assignmentWeight: z.number().positive(),
    maxOpenLeads: nonNegativeIntSchema.nullable(),
    maxAssignmentDistanceKm: nonNegativeNumberSchema.nullable(),
    rowVersion: nonNegativeIntSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const dealerLocationMutationResultSchema = z
  .object({
    dealerOrgUnitId: uuidSchema,
    locationId: uuidSchema,
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    googleMapsUrl: z.url().max(2048).nullable(),
    rowVersion: nonNegativeIntSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const issueActionInputSchema = z
  .object({
    issueKey: z.string().trim().min(8).max(128).regex(SAFE_ISSUE_KEY_PATTERN),
    state: z.enum(["ACKNOWLEDGED", "RESOLVED"]),
    resolutionNote: z.string().trim().min(5).max(2000).nullable().optional(),
    rowVersion: nonNegativeIntSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.state === "RESOLVED" && value.resolutionNote == null) {
      context.addIssue({
        code: "custom",
        path: ["resolutionNote"],
        message: "A resolution note is required.",
      });
    }
  });

export const retryOperationInputSchema = z
  .object({
    resourceId: uuidSchema,
    reason: z.string().trim().min(5).max(500),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

const businessIntervalSchema = z
  .object({
    opensAt: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u),
    closesAt: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u),
  })
  .strict()
  .refine((value) => value.opensAt < value.closesAt, {
    message: "closesAt must be later than opensAt.",
    path: ["closesAt"],
  });
const businessDaySchema = z
  .object({
    closed: z.boolean(),
    intervals: z.array(businessIntervalSchema).max(4),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.closed && value.intervals.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["intervals"],
        message: "Closed days cannot contain intervals.",
      });
    }
    if (!value.closed && value.intervals.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["intervals"],
        message: "Open days require an interval.",
      });
    }
  });
export const dealerBusinessHoursSchema = z
  .object({
    monday: businessDaySchema.optional(),
    tuesday: businessDaySchema.optional(),
    wednesday: businessDaySchema.optional(),
    thursday: businessDaySchema.optional(),
    friday: businessDaySchema.optional(),
    saturday: businessDaySchema.optional(),
    sunday: businessDaySchema.optional(),
  })
  .strict();

export const dealerSettingsActionInputSchema = z
  .object({
    dealerOrgUnitId: uuidSchema,
    rowVersion: nonNegativeIntSchema,
    orgUnitActive: z.boolean(),
    engagementActive: z.boolean(),
    supportsVehicleEnquiries: z.boolean(),
    supportsServiceEnquiries: z.boolean(),
    supportsWarranty: z.boolean(),
    priority: z.number().int().min(1).max(10_000),
    assignmentWeight: z.number().positive().max(1000),
    maxOpenLeads: z.number().int().positive().max(1_000_000).nullable(),
    maxAssignmentDistanceKm: z.number().positive().max(5_000).nullable(),
    businessHours: dealerBusinessHoursSchema.optional(),
    reason: z.string().trim().min(5).max(500),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const dealerLocationActionInputSchema = z
  .object({
    dealerOrgUnitId: uuidSchema,
    rowVersion: nonNegativeIntSchema,
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    googleMapsUrl: z
      .url()
      .max(2048)
      .refine((value) => {
        const url = new URL(value);
        const host = url.hostname.toLowerCase();
        return (
          url.protocol === "https:" &&
          (host === "maps.google.com" ||
            host === "www.google.com" ||
            host === "google.com" ||
            host === "maps.app.goo.gl" ||
            host.endsWith(".google.com"))
        );
      }, "Only HTTPS Google Maps URLs are allowed.")
      .nullable(),
    name: z.string().trim().min(1).max(256).optional(),
    addressLine1: z.string().trim().min(1).max(512).optional(),
    addressLine2: z.string().trim().max(512).nullable().optional(),
    city: z.string().trim().min(1).max(128).optional(),
    district: z.string().trim().min(1).max(128).optional(),
    state: z.string().trim().min(1).max(128).optional(),
    postalCode: z
      .string()
      .trim()
      .regex(/^[1-9][0-9]{5}$/u)
      .optional(),
    reason: z.string().trim().min(5).max(500),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

const rowVersionStringSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]*$/u)
  .max(20);
const videoSequenceCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/u);
const videoTemplateCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/u);
const httpsVideoUrlSchema = z
  .url()
  .max(2048)
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Only HTTPS video URLs are allowed.",
  });

export const engagementVideoSequenceItemSchema = z
  .object({
    videoSequenceItemId: uuidSchema,
    dayNo: z.number().int().min(1).max(365),
    videoTitle: z.string().trim().min(1).max(256),
    videoUrl: httpsVideoUrlSchema,
    templateCode: videoTemplateCodeSchema,
    active: z.boolean(),
    rowVersion: rowVersionStringSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const engagementVideoSequenceSchema = z
  .object({
    videoSequenceId: uuidSchema,
    sequenceCode: videoSequenceCodeSchema,
    name: z.string().trim().min(1).max(256),
    description: z.string().trim().max(2000).nullable(),
    active: z.boolean(),
    activeLeadSequenceCount: nonNegativeIntSchema,
    pendingVideoMessageCount: nonNegativeIntSchema,
    rowVersion: rowVersionStringSchema,
    updatedAt: isoDateTimeSchema,
    items: z.array(engagementVideoSequenceItemSchema).max(365).readonly(),
  })
  .strict();

export const engagementVideoSequenceListResultSchema = z
  .object({
    items: z.array(engagementVideoSequenceSchema).max(200).readonly(),
    totalCount: z.number().int().min(0).max(200),
  })
  .strict()
  .refine((value) => value.totalCount === value.items.length, {
    message: "totalCount must equal the number of returned video sequences.",
    path: ["totalCount"],
  });

export const videoSequenceCreateActionInputSchema = z
  .object({
    sequenceCode: videoSequenceCodeSchema,
    name: z.string().trim().min(1).max(256),
    description: z.string().trim().max(2000).nullable().optional(),
    active: z.boolean(),
    reason: z.string().trim().min(5).max(500),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const videoSequenceUpdateActionInputSchema = z
  .object({
    videoSequenceId: uuidSchema,
    rowVersion: rowVersionStringSchema,
    name: z.string().trim().min(1).max(256).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    active: z.boolean().optional(),
    reason: z.string().trim().min(5).max(500),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.active !== undefined,
    {
      message: "At least one video-sequence field must be supplied.",
      path: ["name"],
    },
  );

export const videoSequenceItemCreateActionInputSchema = z
  .object({
    videoSequenceId: uuidSchema,
    dayNo: z.number().int().min(1).max(365),
    videoTitle: z.string().trim().min(1).max(256),
    videoUrl: httpsVideoUrlSchema,
    templateCode: videoTemplateCodeSchema,
    active: z.boolean(),
    reason: z.string().trim().min(5).max(500),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const videoSequenceItemUpdateActionInputSchema = z
  .object({
    videoSequenceItemId: uuidSchema,
    rowVersion: rowVersionStringSchema,
    dayNo: z.number().int().min(1).max(365).optional(),
    videoTitle: z.string().trim().min(1).max(256).optional(),
    videoUrl: httpsVideoUrlSchema.optional(),
    templateCode: videoTemplateCodeSchema.optional(),
    active: z.boolean().optional(),
    reason: z.string().trim().min(5).max(500),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .refine(
    (value) =>
      value.dayNo !== undefined ||
      value.videoTitle !== undefined ||
      value.videoUrl !== undefined ||
      value.templateCode !== undefined ||
      value.active !== undefined,
    {
      message: "At least one video-sequence item field must be supplied.",
      path: ["dayNo"],
    },
  );

export type EngagementDashboardSummary = z.infer<
  typeof engagementDashboardSummarySchema
>;
export type EngagementLeadSourceSeries = z.infer<
  typeof engagementLeadSourceSeriesSchema
>;
export type EngagementFunnel = z.infer<typeof engagementFunnelSchema>;
export type EngagementDealerPerformanceItem = z.infer<
  typeof engagementDealerPerformanceItemSchema
>;
export type EngagementDealerPerformanceResult = z.infer<
  typeof engagementDealerPerformanceResultSchema
>;
export type EngagementDashboardIssue = z.infer<
  typeof engagementDashboardIssueSchema
>;
export type EngagementDashboardIssueResult = z.infer<
  typeof engagementDashboardIssueResultSchema
>;
export type EngagementCoverageResult = z.infer<
  typeof engagementCoverageResultSchema
>;
export type EngagementFilterOptions = z.infer<
  typeof engagementFilterOptionsSchema
>;
export type EngagementDealerDetail = z.infer<
  typeof engagementDealerDetailSchema
>;
export type EngagementLeadDetail = z.infer<typeof engagementLeadDetailSchema>;
export type IssueActionInput = z.infer<typeof issueActionInputSchema>;
export type RetryOperationInput = z.infer<typeof retryOperationInputSchema>;
export type DealerBusinessHours = z.infer<typeof dealerBusinessHoursSchema>;
export type DealerSettingsActionInput = z.infer<
  typeof dealerSettingsActionInputSchema
>;
export type DealerLocationActionInput = z.infer<
  typeof dealerLocationActionInputSchema
>;
export type EngagementVideoSequenceItem = z.infer<
  typeof engagementVideoSequenceItemSchema
>;
export type EngagementVideoSequence = z.infer<
  typeof engagementVideoSequenceSchema
>;
export type EngagementVideoSequenceListResult = z.infer<
  typeof engagementVideoSequenceListResultSchema
>;
export type VideoSequenceCreateActionInput = z.infer<
  typeof videoSequenceCreateActionInputSchema
>;
export type VideoSequenceUpdateActionInput = z.infer<
  typeof videoSequenceUpdateActionInputSchema
>;
export type VideoSequenceItemCreateActionInput = z.infer<
  typeof videoSequenceItemCreateActionInputSchema
>;
export type VideoSequenceItemUpdateActionInput = z.infer<
  typeof videoSequenceItemUpdateActionInputSchema
>;

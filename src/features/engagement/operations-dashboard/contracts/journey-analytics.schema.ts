// oz-next-app/src/features/engagement/operations-dashboard/contracts/journey-analytics.schema.ts
import { z } from "zod";

export const ENGAGEMENT_JOURNEY_ANALYTICS_CONTRACT_VERSION =
  "ENGAGEMENT_JOURNEY_ANALYTICS_V1" as const;
export const ENGAGEMENT_JOURNEY_MATURITY_HOURS_DEFAULT = 72;
export const ENGAGEMENT_JOURNEY_MATURITY_HOURS_MAX = 720;

export const ENGAGEMENT_JOURNEY_FUNNEL_STAGE_CODES = [
  "STARTED",
  "LOCATION_REQUESTED",
  "LOCATION_REQUEST_SENT",
  "CUSTOMER_RESPONDED",
  "RESOLVER_DECIDED",
  "LOCATION_RESOLVED",
  "ASSIGNMENT_REQUESTED",
  "DEALER_ASSIGNED",
  "CUSTOMER_NOTIFICATION_SENT",
  "COMPLETED",
] as const;

export const ENGAGEMENT_JOURNEY_OUTCOME_CODES = [
  "COMPLETED",
  "NO_RESPONSE",
  "NO_DEALER",
] as const;

export const ENGAGEMENT_JOURNEY_LATENCY_CODES = [
  "SOURCE_TO_LOCATION_REQUEST",
  "LOCATION_REQUEST_TO_SENT",
  "SENT_TO_RESPONSE",
  "RESPONSE_TO_LOCATION_READY",
  "LOCATION_READY_TO_ASSIGNMENT_REQUEST",
  "ASSIGNMENT_REQUEST_TO_DEALER_ASSIGNED",
  "DEALER_ASSIGNED_TO_CUSTOMER_NOTIFICATION",
  "SOURCE_TO_TERMINAL",
] as const;

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
const nullablePercentageSchema = z.number().min(0).max(100).nullable();
const nullableMinutesSchema = z.number().nonnegative().nullable();

export const engagementJourneyDiagnosticsSchema = z
  .object({
    currentRuns: nonNegativeIntegerSchema,
    supersededRuns: nonNegativeIntegerSchema,
    incompleteRuns: nonNegativeIntegerSchema,
    unknownRuns: nonNegativeIntegerSchema,
    inProgressRuns: nonNegativeIntegerSchema,
    projectionMissingRuns: nonNegativeIntegerSchema,
    maturedExcludedRuns: nonNegativeIntegerSchema,
    projectionCoveragePct: nullablePercentageSchema,
  })
  .strict();

export const engagementJourneySummarySchema = z
  .object({
    maturedRuns: nonNegativeIntegerSchema,
    conversionEligibleRuns: nonNegativeIntegerSchema,
    completedRuns: nonNegativeIntegerSchema,
    noResponseRuns: nonNegativeIntegerSchema,
    noDealerRuns: nonNegativeIntegerSchema,
    completionRatePct: nullablePercentageSchema,
    diagnostics: engagementJourneyDiagnosticsSchema,
  })
  .strict();

const engagementJourneyFunnelStageSchema = z
  .object({
    code: z.enum(ENGAGEMENT_JOURNEY_FUNNEL_STAGE_CODES),
    name: z.string().trim().min(1).max(96),
    reachedCount: nonNegativeIntegerSchema,
    bypassedCount: nonNegativeIntegerSchema,
    progressedCount: nonNegativeIntegerSchema,
    denominatorCount: nonNegativeIntegerSchema,
    conversionRatePct: nullablePercentageSchema,
    previousStageProgressedCount: nonNegativeIntegerSchema.nullable(),
    fromPreviousRatePct: nullablePercentageSchema,
    latencySampleCount: nonNegativeIntegerSchema,
    medianMinutesFromStart: nullableMinutesSchema,
    p95MinutesFromStart: nullableMinutesSchema,
  })
  .strict();

export const engagementJourneyFunnelSchema = z
  .object({
    denominatorRuns: nonNegativeIntegerSchema,
    diagnostics: engagementJourneyDiagnosticsSchema,
    stages: z
      .array(engagementJourneyFunnelStageSchema)
      .length(ENGAGEMENT_JOURNEY_FUNNEL_STAGE_CODES.length)
      .readonly(),
  })
  .strict();

const engagementJourneyOutcomeSchema = z
  .object({
    code: z.enum(ENGAGEMENT_JOURNEY_OUTCOME_CODES),
    name: z.string().trim().min(1).max(96),
    count: nonNegativeIntegerSchema,
    denominatorCount: nonNegativeIntegerSchema,
    ratePct: nullablePercentageSchema,
  })
  .strict();

export const engagementJourneyOutcomesSchema = z
  .object({
    denominatorRuns: nonNegativeIntegerSchema,
    items: z
      .array(engagementJourneyOutcomeSchema)
      .length(ENGAGEMENT_JOURNEY_OUTCOME_CODES.length)
      .readonly(),
    diagnostics: engagementJourneyDiagnosticsSchema,
  })
  .strict();

const engagementJourneyLatencyMetricSchema = z
  .object({
    code: z.enum(ENGAGEMENT_JOURNEY_LATENCY_CODES),
    name: z.string().trim().min(1).max(128),
    applicableCount: nonNegativeIntegerSchema,
    sampleCount: nonNegativeIntegerSchema,
    notObservedCount: nonNegativeIntegerSchema,
    medianMinutes: nullableMinutesSchema,
    p95Minutes: nullableMinutesSchema,
  })
  .strict();

export const engagementJourneyLatencySchema = z
  .object({
    denominatorRuns: nonNegativeIntegerSchema,
    diagnostics: engagementJourneyDiagnosticsSchema,
    metrics: z
      .array(engagementJourneyLatencyMetricSchema)
      .length(ENGAGEMENT_JOURNEY_LATENCY_CODES.length)
      .readonly(),
  })
  .strict();

const engagementJourneyMetadataSchema = z
  .object({
    generatedAt: isoDateTimeSchema,
    snapshotId: z.string().regex(/^[0-9a-f]{64}$/u),
    contractVersion: z.literal(ENGAGEMENT_JOURNEY_ANALYTICS_CONTRACT_VERSION),
    journeyVersion: z.string().trim().min(1).max(64),
    resolverVersion: z.string().trim().min(1).max(64),
    cohort: z
      .object({
        from: isoDateSchema,
        to: isoDateSchema,
        maturityHours: z
          .number()
          .int()
          .min(1)
          .max(ENGAGEMENT_JOURNEY_MATURITY_HOURS_MAX),
      })
      .strict(),
    totalRuns: nonNegativeIntegerSchema,
  })
  .strict();

export const engagementJourneySummaryResponseSchema =
  engagementJourneyMetadataSchema
    .extend({
      summary: engagementJourneySummarySchema,
    })
    .strict();

export const engagementJourneyFunnelResponseSchema =
  engagementJourneyMetadataSchema
    .extend({
      funnel: engagementJourneyFunnelSchema,
    })
    .strict();

export const engagementJourneyOutcomesResponseSchema =
  engagementJourneyMetadataSchema
    .extend({
      outcomes: engagementJourneyOutcomesSchema,
    })
    .strict();

export const engagementJourneyLatencyResponseSchema =
  engagementJourneyMetadataSchema
    .extend({
      latency: engagementJourneyLatencySchema,
    })
    .strict();

export const engagementJourneyAnalyticsSnapshotSchema =
  engagementJourneyMetadataSchema
    .extend({
      summary: engagementJourneySummarySchema,
      funnel: engagementJourneyFunnelSchema,
      outcomes: engagementJourneyOutcomesSchema,
      latency: engagementJourneyLatencySchema,
    })
    .strict();

export type EngagementJourneyDiagnostics = z.infer<
  typeof engagementJourneyDiagnosticsSchema
>;
export type EngagementJourneySummary = z.infer<
  typeof engagementJourneySummarySchema
>;
export type EngagementJourneyFunnel = z.infer<
  typeof engagementJourneyFunnelSchema
>;
export type EngagementJourneyOutcomes = z.infer<
  typeof engagementJourneyOutcomesSchema
>;
export type EngagementJourneyLatency = z.infer<
  typeof engagementJourneyLatencySchema
>;
export type EngagementJourneySummaryResponse = z.infer<
  typeof engagementJourneySummaryResponseSchema
>;
export type EngagementJourneyFunnelResponse = z.infer<
  typeof engagementJourneyFunnelResponseSchema
>;
export type EngagementJourneyOutcomesResponse = z.infer<
  typeof engagementJourneyOutcomesResponseSchema
>;
export type EngagementJourneyLatencyResponse = z.infer<
  typeof engagementJourneyLatencyResponseSchema
>;
export type EngagementJourneyAnalyticsSnapshot = z.infer<
  typeof engagementJourneyAnalyticsSnapshotSchema
>;

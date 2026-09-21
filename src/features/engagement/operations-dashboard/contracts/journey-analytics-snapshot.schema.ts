// oz-next-app/src/features/engagement/operations-dashboard/contracts/journey-analytics-snapshot.schema.ts
import { z } from "zod";

import type { EngagementJourneyAnalyticsSnapshot } from "@/features/engagement/operations-dashboard/contracts/journey-analytics.schema";

const JOURNEY_ANALYTICS_CONTRACT_VERSION =
  "ENGAGEMENT_JOURNEY_ANALYTICS_V1" as const;
const MAX_JOURNEY_MATURITY_HOURS = 720;
const JOURNEY_FUNNEL_STAGE_CODES = [
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
const JOURNEY_OUTCOME_CODES = [
  "COMPLETED",
  "NO_RESPONSE",
  "NO_DEALER",
] as const;
const JOURNEY_LATENCY_CODES = [
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
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Invalid date.");
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const nullablePercentageSchema = z.number().min(0).max(100).nullable();
const nullableMinutesSchema = z.number().nonnegative().nullable();

const diagnosticsSchema = z
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

const summarySchema = z
  .object({
    maturedRuns: nonNegativeIntegerSchema,
    conversionEligibleRuns: nonNegativeIntegerSchema,
    completedRuns: nonNegativeIntegerSchema,
    noResponseRuns: nonNegativeIntegerSchema,
    noDealerRuns: nonNegativeIntegerSchema,
    completionRatePct: nullablePercentageSchema,
    diagnostics: diagnosticsSchema,
  })
  .strict();

const funnelSchema = z
  .object({
    denominatorRuns: nonNegativeIntegerSchema,
    diagnostics: diagnosticsSchema,
    stages: z
      .array(
        z
          .object({
            code: z.enum(JOURNEY_FUNNEL_STAGE_CODES),
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
          .strict(),
      )
      .length(JOURNEY_FUNNEL_STAGE_CODES.length),
  })
  .strict();

const outcomesSchema = z
  .object({
    denominatorRuns: nonNegativeIntegerSchema,
    items: z
      .array(
        z
          .object({
            code: z.enum(JOURNEY_OUTCOME_CODES),
            name: z.string().trim().min(1).max(96),
            count: nonNegativeIntegerSchema,
            denominatorCount: nonNegativeIntegerSchema,
            ratePct: nullablePercentageSchema,
          })
          .strict(),
      )
      .length(JOURNEY_OUTCOME_CODES.length),
    diagnostics: diagnosticsSchema,
  })
  .strict();

const latencySchema = z
  .object({
    denominatorRuns: nonNegativeIntegerSchema,
    diagnostics: diagnosticsSchema,
    metrics: z
      .array(
        z
          .object({
            code: z.enum(JOURNEY_LATENCY_CODES),
            name: z.string().trim().min(1).max(128),
            applicableCount: nonNegativeIntegerSchema,
            sampleCount: nonNegativeIntegerSchema,
            notObservedCount: nonNegativeIntegerSchema,
            medianMinutes: nullableMinutesSchema,
            p95Minutes: nullableMinutesSchema,
          })
          .strict(),
      )
      .length(JOURNEY_LATENCY_CODES.length),
  })
  .strict();

export const engagementJourneyAnalyticsSnapshotSchema: z.ZodType<EngagementJourneyAnalyticsSnapshot> =
  z
    .object({
      generatedAt: z.iso.datetime({ offset: true }),
      snapshotId: z.string().regex(/^[0-9a-f]{64}$/u),
      contractVersion: z.literal(JOURNEY_ANALYTICS_CONTRACT_VERSION),
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
            .max(MAX_JOURNEY_MATURITY_HOURS),
        })
        .strict(),
      totalRuns: nonNegativeIntegerSchema,
      summary: summarySchema,
      funnel: funnelSchema,
      outcomes: outcomesSchema,
      latency: latencySchema,
    })
    .strict();

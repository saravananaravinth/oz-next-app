// oz-next-app/src/features/engagement/operations-dashboard/utils/journey-analytics.ts
import type {
  EngagementJourneyAnalyticsSnapshot,
  EngagementJourneyFunnelResponse,
  EngagementJourneyLatencyResponse,
  EngagementJourneyOutcomesResponse,
  EngagementJourneySummaryResponse,
} from "@/features/engagement/operations-dashboard/contracts/journey-analytics.schema";

export class EngagementJourneySnapshotMismatchError extends Error {
  public constructor() {
    super("Journey analytics responses do not belong to the same snapshot.");
    this.name = "EngagementJourneySnapshotMismatchError";
  }
}

type JourneyMetadata = Pick<
  EngagementJourneySummaryResponse,
  | "generatedAt"
  | "snapshotId"
  | "journeyVersion"
  | "resolverVersion"
  | "cohort"
  | "totalRuns"
>;

function sameMetadata(left: JourneyMetadata, right: JourneyMetadata): boolean {
  return (
    left.generatedAt === right.generatedAt &&
    left.snapshotId === right.snapshotId &&
    left.journeyVersion === right.journeyVersion &&
    left.resolverVersion === right.resolverVersion &&
    left.totalRuns === right.totalRuns &&
    left.cohort.from === right.cohort.from &&
    left.cohort.to === right.cohort.to &&
    left.cohort.maturityHours === right.cohort.maturityHours
  );
}

export function combineEngagementJourneySnapshot(
  input: Readonly<{
    summary: EngagementJourneySummaryResponse;
    funnel: EngagementJourneyFunnelResponse;
    outcomes: EngagementJourneyOutcomesResponse;
    latency: EngagementJourneyLatencyResponse;
  }>,
): EngagementJourneyAnalyticsSnapshot {
  const metadata = input.summary;
  if (
    !sameMetadata(metadata, input.funnel) ||
    !sameMetadata(metadata, input.outcomes) ||
    !sameMetadata(metadata, input.latency)
  ) {
    throw new EngagementJourneySnapshotMismatchError();
  }

  return {
    generatedAt: metadata.generatedAt,
    snapshotId: metadata.snapshotId,
    contractVersion: metadata.contractVersion,
    journeyVersion: metadata.journeyVersion,
    resolverVersion: metadata.resolverVersion,
    cohort: metadata.cohort,
    totalRuns: metadata.totalRuns,
    summary: input.summary.summary,
    funnel: input.funnel.funnel,
    outcomes: input.outcomes.outcomes,
    latency: input.latency.latency,
  };
}

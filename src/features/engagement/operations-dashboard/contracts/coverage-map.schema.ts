// oz-next-app/src/features/engagement/operations-dashboard/contracts/coverage-map.schema.ts
import { z } from "zod";

const uuidSchema = z.uuid();
const sha256HexSchema = z.string().regex(/^[0-9a-f]{64}$/u);
const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Invalid date.");
const isoDateTimeSchema = z.iso.datetime({ offset: true });
const statusTokenSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Z][A-Z0-9_]*$/u);
const safeTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[\p{L}\p{N} ._+\-/()]+$/u);
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const nonNegativeNumberSchema = z.number().nonnegative();
const percentageSchema = z.number().min(0).max(100);
const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);
const mapLatitudeSchema = z.number().min(-85).max(85);
const mapLongitudeSchema = z.number().min(-180).max(180);

const rangeSchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    timezone: z.literal("Asia/Kolkata"),
  })
  .strict();

const coordinatePolicySchema = z
  .object({
    customerDemand: z.literal("PRIVACY_GRID"),
    dealerLocations: z.literal("EXACT_CONFIGURED_LOCATION"),
    latitudeStepDegrees: z.literal(0.05),
    longitudeStepDegrees: z.literal(0.05),
  })
  .strict();

const dealerRoutingStateSchema = z.enum([
  "ROUTING_READY",
  "ENGAGEMENT_INACTIVE",
  "ORG_INACTIVE",
]);

const demandCellSchema = z
  .object({
    cellKey: z.string().trim().min(3).max(64),
    centerLatitude: latitudeSchema,
    centerLongitude: longitudeSchema,
    leadCount: nonNegativeIntegerSchema,
    assignedLeadCount: nonNegativeIntegerSchema,
    unassignedLeadCount: nonNegativeIntegerSchema,
    convertedLeadCount: nonNegativeIntegerSchema,
    noDealerJourneyCount: nonNegativeIntegerSchema,
    openLeadCount: nonNegativeIntegerSchema,
  })
  .strict();

const dealerSchema = z
  .object({
    dealerOrgUnitId: uuidSchema,
    code: z.string().trim().min(1).max(128),
    name: z.string().trim().min(1).max(256),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    district: z.string().trim().min(1).max(256).nullable(),
    city: z.string().trim().min(1).max(256).nullable(),
    routingState: dealerRoutingStateSchema,
    maxAssignmentDistanceKm: nonNegativeNumberSchema.nullable(),
    filteredAssignedLeadCount: nonNegativeIntegerSchema,
    filteredConvertedLeadCount: nonNegativeIntegerSchema,
    filteredOpenLeadCount: nonNegativeIntegerSchema,
  })
  .strict();

export const coverageMapViewportSchema = z
  .object({
    north: mapLatitudeSchema,
    south: mapLatitudeSchema,
    east: mapLongitudeSchema,
    west: mapLongitudeSchema,
    zoom: z.number().int().min(3).max(20),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.south >= value.north) {
      context.addIssue({
        code: "custom",
        path: ["north"],
        message: "north must be greater than south.",
      });
    }
    if (value.west >= value.east) {
      context.addIssue({
        code: "custom",
        path: ["east"],
        message: "east must be greater than west.",
      });
    }
  });

export const coverageMapFilterSchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    leadSourceIds: z.array(uuidSchema).max(20).readonly(),
    ivrFlowCodes: z.array(z.literal("VEHICLE_ENQUIRIES")).max(1).readonly(),
    statuses: z.array(statusTokenSchema).max(32).readonly(),
    dealerOrgUnitIds: z.array(uuidSchema).max(50).readonly(),
    districts: z.array(safeTextSchema).max(50).readonly(),
    cities: z.array(safeTextSchema).max(50).readonly(),
    assignmentStates: z
      .array(z.enum(["ASSIGNED", "UNASSIGNED"]))
      .max(2)
      .readonly(),
    conversionStates: z
      .array(z.enum(["CONVERTED", "NOT_CONVERTED"]))
      .max(2)
      .readonly(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.from > value.to) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "to must be on or after from.",
      });
      return;
    }

    const fromMs = Date.parse(`${value.from}T00:00:00.000Z`);
    const toMs = Date.parse(`${value.to}T00:00:00.000Z`);
    if (Math.floor((toMs - fromMs) / 86_400_000) + 1 > 366) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "Date range cannot exceed 366 days.",
      });
    }
  });

export const coverageMapRouteRequestSchema = z
  .object({
    viewport: coverageMapViewportSchema,
    filters: coverageMapFilterSchema,
    filterFingerprint: sha256HexSchema,
  })
  .strict();

const cohortSchema = z
  .object({
    locatedLeadCount: nonNegativeIntegerSchema,
    assignedLocatedLeadCount: nonNegativeIntegerSchema,
    unassignedLocatedLeadCount: nonNegativeIntegerSchema,
    unassignedRatePct: percentageSchema,
    convertedLocatedLeadCount: nonNegativeIntegerSchema,
    noDealerJourneyCount: nonNegativeIntegerSchema,
  })
  .strict();

const representedSchema = z
  .object({
    demandCellCount: nonNegativeIntegerSchema,
    dealerCount: nonNegativeIntegerSchema,
    locatedLeadCount: nonNegativeIntegerSchema,
    assignedLocatedLeadCount: nonNegativeIntegerSchema,
    unassignedLocatedLeadCount: nonNegativeIntegerSchema,
    convertedLocatedLeadCount: nonNegativeIntegerSchema,
    noDealerJourneyCount: nonNegativeIntegerSchema,
  })
  .strict();

export const coverageMapResponseSchema = z
  .object({
    contractVersion: z.literal("ENGAGEMENT_COVERAGE_VIEWPORT_V1"),
    generatedAt: isoDateTimeSchema,
    snapshotId: sha256HexSchema,
    filterFingerprint: sha256HexSchema,
    analysisBasis: z.literal("VEHICLE_ENQUIRY_LOCATED_LEADS"),
    range: rangeSchema,
    coordinatePolicy: coordinatePolicySchema,
    viewport: coverageMapViewportSchema,
    cohort: cohortSchema,
    represented: representedSchema,
    demandCells: z.array(demandCellSchema).max(400).readonly(),
    dealers: z.array(dealerSchema).max(250).readonly(),
    limits: z
      .object({
        demandCellLimit: z.literal(400),
        dealerLimit: z.literal(250),
        demandCellsTruncated: z.boolean(),
        dealersTruncated: z.boolean(),
      })
      .strict(),
  })
  .strict();

export type CoverageMapViewport = z.output<typeof coverageMapViewportSchema>;
export type CoverageMapFilters = z.output<typeof coverageMapFilterSchema>;
export type CoverageMapRouteRequest = z.output<
  typeof coverageMapRouteRequestSchema
>;
export type CoverageMapResponse = z.output<typeof coverageMapResponseSchema>;

// oz-next-app/src/features/engagement/dealer-dashboard/contracts/dealer-dashboard.schema.ts
import { z } from "zod";

import {
  erpIsoDateTimeSchema,
  erpUuidSchema,
} from "@/features/erp-core/contracts/erp-common.schema";

export const DEALER_DASHBOARD_ROLE = {
  SUPER_ADMIN: "super_admin",
  DEALER_ADMIN: "dealer_admin",
  DEALER_STAFF: "dealer_staff",
} as const;

export type DealerDashboardRole =
  (typeof DEALER_DASHBOARD_ROLE)[keyof typeof DEALER_DASHBOARD_ROLE];

const nonNegativeCountSchema = z.number().int().nonnegative();
const percentageSchema = z.number().min(0).max(100);
const nullablePositiveNumberSchema = z.number().positive().nullable();
const nullableDateTimeSchema = erpIsoDateTimeSchema.nullable();
const dateOnlySchema = z.string().trim().pipe(z.iso.date());

function emptyStringToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim().length === 0
    ? undefined
    : value;
}

const optionalDateSearchParamSchema = z.preprocess(
  emptyStringToUndefined,
  dateOnlySchema.optional(),
);
const optionalUuidSearchParamSchema = z.preprocess(
  emptyStringToUndefined,
  erpUuidSchema.optional(),
);
const vehicleChassisNumberPattern = /^[A-HJ-NPR-Z0-9]{11,17}$/iu;
const mobileNumberSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9][0-9]{7,14}$/u, {
    message: "Enter a valid mobile number with 8 to 15 digits.",
  });
const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[A-Za-z0-9:_./@-]+$/u);

export const ownerGuideStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
]);

export const ownerGuideOnboardingStatusSchema = z.enum([
  "INVITED",
  "APP_LOGIN_PENDING",
  "LOCATION_READY",
  "COMPLETED",
]);

export const dealerEngagementDashboardSchema = z
  .object({
    tenantId: erpUuidSchema,
    dealerOrgUnitId: erpUuidSchema,
    range: z
      .object({
        from: dateOnlySchema.nullable(),
        to: dateOnlySchema.nullable(),
      })
      .strict(),
    leads: z
      .object({
        assignedCount: nonNegativeCountSchema,
        openCount: nonNegativeCountSchema,
        bookedCount: nonNegativeCountSchema,
        convertedCount: nonNegativeCountSchema,
        forwardedCount: nonNegativeCountSchema,
        bookingRatePct: percentageSchema,
        conversionRatePct: percentageSchema,
      })
      .strict(),
    ownerGuides: z
      .object({
        totalCount: nonNegativeCountSchema,
        activeCount: nonNegativeCountSchema,
        inactiveCount: nonNegativeCountSchema,
        assignmentEnabledCount: nonNegativeCountSchema,
        assignmentPausedCount: nonNegativeCountSchema,
        assignmentReadyCount: nonNegativeCountSchema,
        freshLocationCount: nonNegativeCountSchema,
        staleLocationCount: nonNegativeCountSchema,
      })
      .strict(),
    ownerGuideAssignments: z
      .object({
        assignedCount: nonNegativeCountSchema,
        notifiedCount: nonNegativeCountSchema,
        acceptedCount: nonNegativeCountSchema,
        rejectedCount: nonNegativeCountSchema,
        visitedCount: nonNegativeCountSchema,
        testDriveCompletedCount: nonNegativeCountSchema,
        bookedCount: nonNegativeCountSchema,
        convertedCount: nonNegativeCountSchema,
        openCount: nonNegativeCountSchema,
        acceptanceRatePct: percentageSchema,
        visitRatePct: percentageSchema,
        testDriveCompletionRatePct: percentageSchema,
        conversionRatePct: percentageSchema,
      })
      .strict(),
  })
  .strict();

export const ownerGuideSummarySchema = z
  .object({
    ownerGuideId: erpUuidSchema,
    tenantId: erpUuidSchema,
    dealerOrgUnitId: erpUuidSchema,
    customerId: erpUuidSchema,
    customerPhoneId: erpUuidSchema,
    displayName: z.string().trim().min(1).max(256),
    phoneMasked: z.string().trim().min(1).max(64),
    status: ownerGuideStatusSchema,
    onboardingStatus: ownerGuideOnboardingStatusSchema,
    assignmentEnabled: z.boolean(),
    vehicleModel: z.string().trim().min(1).max(128).nullable(),
    vehicleVariant: z.string().trim().min(1).max(128).nullable(),
    vehicleChassisNoMasked: z.string().trim().min(1).max(64).nullable(),
    latestLocationCollectedAt: nullableDateTimeSchema,
    latestLocationExpiresAt: nullableDateTimeSchema,
    hasFreshLocation: z.boolean(),
    maxAssignmentDistanceKm: nullablePositiveNumberSchema,
    dailyAssignmentLimit: z.number().int().positive().nullable(),
    createdAt: erpIsoDateTimeSchema,
    updatedAt: erpIsoDateTimeSchema,
    rowVersion: z.number().int().min(1),
  })
  .strict();

export const ownerGuideDetailSchema = ownerGuideSummarySchema
  .extend({
    whatsappOptIn: z.boolean(),
    vehicleDeliveryDate: dateOnlySchema.nullable(),
    assignmentStats: z
      .object({
        assignedCount: nonNegativeCountSchema,
        acceptedCount: nonNegativeCountSchema,
        visitedCount: nonNegativeCountSchema,
        testDriveCompletedCount: nonNegativeCountSchema,
        bookedCount: nonNegativeCountSchema,
        convertedCount: nonNegativeCountSchema,
        openAssignmentCount: nonNegativeCountSchema,
      })
      .strict(),
  })
  .strict();

export const sendOwnerGuideAppLinkResultSchema = z
  .object({
    accepted: z.literal(true),
    ownerGuideId: erpUuidSchema,
    outboxQueued: z.boolean(),
  })
  .strict();

export const dealerDashboardSearchParamsSchema = z
  .object({
    from: optionalDateSearchParamSchema,
    to: optionalDateSearchParamSchema,
    tenantId: optionalUuidSearchParamSchema,
    dealerOrgUnitId: optionalUuidSearchParamSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.from !== undefined &&
      value.to !== undefined &&
      value.from > value.to
    ) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "The end date must be on or after the start date.",
      });
    }

    if (
      (value.tenantId === undefined) !==
      (value.dealerOrgUnitId === undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["dealerOrgUnitId"],
        message: "Tenant and dealer context must be provided together.",
      });
    }
  });

export const dealerDashboardContextSchema = z
  .object({
    tenantId: erpUuidSchema,
    dealerOrgUnitId: erpUuidSchema,
  })
  .strict();

export const ownerGuideLifecycleActionInputSchema = z
  .object({
    ownerGuideId: erpUuidSchema,
    operation: z.enum(["activate", "deactivate", "send-app-link"]),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const ownerGuideAssignmentEligibilityActionInputSchema = z
  .object({
    ownerGuideId: erpUuidSchema,
    assignmentEnabled: z.boolean(),
    rowVersion: z.number().int().min(1),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const ownerGuideOnboardFormSchema = z
  .object({
    mobileNumber: mobileNumberSchema,
    displayName: z.string().trim().min(1).max(256),
    vehicleModel: z.string().trim().max(128),
    vehicleVariant: z.string().trim().max(128),
    vehicleChassisNo: z.string().trim().max(17),
    vehicleDeliveryDate: z.string().trim(),
    assignmentEnabled: z.boolean(),
    maxAssignmentDistanceKm: z.number().min(1).max(250).optional(),
    dailyAssignmentLimit: z.number().int().min(1).max(100).optional(),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.vehicleChassisNo.length > 0 &&
      !vehicleChassisNumberPattern.test(value.vehicleChassisNo)
    ) {
      context.addIssue({
        code: "custom",
        path: ["vehicleChassisNo"],
        message:
          "Enter an 11 to 17 character chassis number without I, O, or Q.",
      });
    }

    if (
      value.vehicleDeliveryDate.length > 0 &&
      !z.iso.date().safeParse(value.vehicleDeliveryDate).success
    ) {
      context.addIssue({
        code: "custom",
        path: ["vehicleDeliveryDate"],
        message: "Enter a valid delivery date.",
      });
    }
  });

export const ownerGuideEditFormSchema = z
  .object({
    ownerGuideId: erpUuidSchema,
    displayName: z.string().trim().min(1).max(256),
    vehicleModel: z.string().trim().max(128),
    vehicleVariant: z.string().trim().max(128),
    replacementVehicleChassisNo: z.string().trim().max(17),
    assignmentEnabled: z.boolean(),
    maxAssignmentDistanceKm: z.number().min(1).max(250).optional(),
    dailyAssignmentLimit: z.number().int().min(1).max(100).optional(),
    rowVersion: z.number().int().min(1),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.replacementVehicleChassisNo.length > 0 &&
      !vehicleChassisNumberPattern.test(value.replacementVehicleChassisNo)
    ) {
      context.addIssue({
        code: "custom",
        path: ["replacementVehicleChassisNo"],
        message:
          "Enter an 11 to 17 character chassis number without I, O, or Q.",
      });
    }
  });

export type DealerEngagementDashboard = z.infer<
  typeof dealerEngagementDashboardSchema
>;
export type OwnerGuideSummary = z.infer<typeof ownerGuideSummarySchema>;
export type DealerDashboardData = Readonly<{
  dashboard: DealerEngagementDashboard;
  ownerGuides: readonly OwnerGuideSummary[];
}>;
export type OwnerGuideDetail = z.infer<typeof ownerGuideDetailSchema>;
export type DealerDashboardSearchParams = z.infer<
  typeof dealerDashboardSearchParamsSchema
>;
export type DealerDashboardContext = z.infer<
  typeof dealerDashboardContextSchema
>;
export type OwnerGuideOnboardFormValues = z.infer<
  typeof ownerGuideOnboardFormSchema
>;
export type OwnerGuideEditFormValues = z.infer<typeof ownerGuideEditFormSchema>;

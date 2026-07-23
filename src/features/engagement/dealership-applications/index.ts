// oz-next-app/src/features/engagement/dealership-applications/index.ts
export {
  DealershipMetaPixel,
  trackDealershipApplicationLead,
  type DealershipMetaPixelProps,
} from "@/features/engagement/dealership-applications/analytics/dealership-meta-pixel";
export { isDealershipMetaPixelTokenAllowed } from "@/features/engagement/dealership-applications/analytics/dealership-meta-pixel.policy";

export {
  PublicDealershipApplicationPage,
  type PublicDealershipApplicationPageProps,
} from "@/features/engagement/dealership-applications/ui/dealership-application-page";

export {
  buildPublicDealershipApplicationSubmitPath,
  dealershipApplicationSubmitRequestSchema,
  dealershipApplicationSubmitResponseSchema,
  dealershipInterestDraftSchema,
  dealershipInterestFormSchema,
  dealershipLocationModeSchema,
  dealershipSubmissionIdempotencyKeySchema,
  publicDealershipTokenSchema,
  type DealershipApplicationSubmitRequest,
  type DealershipApplicationSubmitResponse,
  type DealershipInterestDraftValues,
  type DealershipInterestFormValues,
  type DealershipLocationMode,
  type InvestmentBudget,
  type InvestmentTimeline,
  type RunningEvBusiness,
} from "@/features/engagement/dealership-applications/contracts/dealership-application.schema";

export {
  submitPublicDealershipApplication,
  type SubmitPublicDealershipApplicationInput,
} from "@/features/engagement/dealership-applications/api/dealership-application.client";

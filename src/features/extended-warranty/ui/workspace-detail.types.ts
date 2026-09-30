// oz-next-app/src/features/extended-warranty/ui/workspace-detail.types.ts
import type { ExtendedWarrantyWorkspaceDetail } from "@/features/extended-warranty/contracts/admin.schema";
import type { ExtendedWarrantyReviewDetail } from "@/features/extended-warranty/contracts/review.schema";

export type ExtendedWarrantyWorkspaceDetailPayload = Readonly<{
  detail: ExtendedWarrantyWorkspaceDetail;
  review: ExtendedWarrantyReviewDetail | null;
  reviewUnavailable: string | null;
}>;

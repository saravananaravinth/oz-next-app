// oz-next-app/src/features/extended-warranty/actions/review.actions.ts
"use server";

import type { ExtendedWarrantyReviewDecisionInput } from "@/features/extended-warranty/contracts/review.schema";
import { submitExtendedWarrantyReviewDecision as submitExtendedWarrantyReviewDecisionServer } from "@/features/extended-warranty/api/review.server";
import { API_CONFIG } from "@/lib/api/http-contract";
import { assertSameOriginMutation } from "@/server/security/origin";

export async function submitExtendedWarrantyReviewDecision(
  input: ExtendedWarrantyReviewDecisionInput,
): Promise<Readonly<{ reviewId: string; activationId: string | null }>> {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  return await submitExtendedWarrantyReviewDecisionServer(input);
}

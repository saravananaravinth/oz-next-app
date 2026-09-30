// oz-next-app/src/features/extended-warranty/actions/review.actions.ts
"use server";

import {
  extendedWarrantyActionFailure,
  type ExtendedWarrantyActionResult,
} from "@/features/extended-warranty/actions/action-failure";
import { submitExtendedWarrantyReviewDecision as submitExtendedWarrantyReviewDecisionServer } from "@/features/extended-warranty/api/review.server";
import type { ExtendedWarrantyReviewDecisionInput } from "@/features/extended-warranty/contracts/review.schema";
import { API_CONFIG } from "@/lib/api/http-contract";
import { assertSameOriginMutation } from "@/server/security/origin";

export async function submitExtendedWarrantyReviewDecision(
  input: ExtendedWarrantyReviewDecisionInput,
): Promise<
  ExtendedWarrantyActionResult<
    Readonly<{ reviewId: string; activationId: string | null }>
  >
> {
  try {
    await assertSameOriginMutation(API_CONFIG.appOrigin);
    const data = await submitExtendedWarrantyReviewDecisionServer(input);
    return { ok: true, data };
  } catch (error: unknown) {
    return extendedWarrantyActionFailure(error, "INSTALLATION_REVIEW");
  }
}

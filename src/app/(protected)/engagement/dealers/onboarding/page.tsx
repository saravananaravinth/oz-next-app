// oz-next-app/src/app/(protected)/engagement/dealers/onboarding/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  DealerOnboardingAccessState,
  resolveDealerOnboardingAccess,
} from "@/features/engagement/dealer-onboarding";
import { DealerOnboardingWorkbench } from "@/features/engagement/dealer-onboarding/ui/dealer-onboarding-workbench";

export const metadata = {
  title: "Onboard Dealer",
  description: "Duplicate-safe dealer and sub-dealer onboarding.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
} satisfies Metadata;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export default async function DealerOnboardingRoutePage(): Promise<ReactElement> {
  const me = await requireAuthenticatedMe();
  const access = resolveDealerOnboardingAccess(me);

  if (access.kind !== "resolved") {
    return <DealerOnboardingAccessState access={access} />;
  }

  if (!access.capabilities.canOnboard) {
    return (
      <DealerOnboardingAccessState
        access={{
          kind: "forbidden",
          actorKind: access.actorKind,
          role: access.role,
          scope: access.scope,
          capabilities: access.capabilities,
          reason:
            "The current actor can read the dealer directory but cannot onboard dealers.",
        }}
      />
    );
  }

  return <DealerOnboardingWorkbench access={access} />;
}

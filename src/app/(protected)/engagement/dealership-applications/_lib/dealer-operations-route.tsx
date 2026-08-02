import "server-only";

import type { ReactElement } from "react";
import { LockKeyhole } from "lucide-react";

import {
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  DealershipApplicationAccessState,
  resolveDealershipApplicationAccess,
  type DealershipApplicationCapabilities,
  type ResolvedDealershipApplicationAccess,
} from "@/features/engagement/dealership-application-operations";
import {
  parseDealerOperationsSearchParams,
  type DealerOperationsRawSearchParams,
  type DealerOperationsSearchParams,
} from "@/features/engagement/dealer-operations";

export type DealerOperationsAccessResolution =
  | Readonly<{
      kind: "ready";
      access: ResolvedDealershipApplicationAccess;
    }>
  | Readonly<{ kind: "blocked"; content: ReactElement }>;

type DealerOperationsListResolution =
  | Readonly<{
      kind: "ready";
      access: ResolvedDealershipApplicationAccess;
      query: DealerOperationsSearchParams;
    }>
  | Readonly<{ kind: "blocked"; content: ReactElement }>;

function restrictedState(label: string): ReactElement {
  return (
    <ContentRoot width="default">
      <ContentSection
        title={`${label} is restricted`}
        description="The active actor does not have the effective permission required for this dealership operation."
        padded
      >
        <ContentStatus
          variant="destructive"
          icon={<LockKeyhole aria-hidden="true" />}
          title="Permission required"
          description="No protected dealer-operation request was sent without the required capability."
        />
      </ContentSection>
    </ContentRoot>
  );
}

export async function resolveDealerOperationsAccess(
  requiredCapability: keyof DealershipApplicationCapabilities,
  label: string,
): Promise<DealerOperationsAccessResolution> {
  const me = await requireAuthenticatedMe();
  const access = resolveDealershipApplicationAccess(me);

  if (access.kind !== "resolved") {
    return {
      kind: "blocked",
      content: <DealershipApplicationAccessState access={access} />,
    };
  }

  if (!access.capabilities[requiredCapability]) {
    return { kind: "blocked", content: restrictedState(label) };
  }

  return { kind: "ready", access };
}

export async function resolveDealerOperationsListRoute(
  input: Readonly<{
    searchParams: Promise<DealerOperationsRawSearchParams>;
  }>,
): Promise<DealerOperationsListResolution> {
  const [accessResolution, rawSearchParams] = await Promise.all([
    resolveDealerOperationsAccess("canReadDealers", "Dealer administration"),
    input.searchParams,
  ]);

  if (accessResolution.kind === "blocked") return accessResolution;

  const parsed = parseDealerOperationsSearchParams(rawSearchParams);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 5)
      .map(
        (issue) =>
          `${issue.path.map(String).join(".") || "$"}: ${issue.message}`,
      )
      .join("; ");

    return {
      kind: "blocked",
      content: (
        <ContentRoot width="default">
          <ContentSection
            title="Dealer filters are invalid"
            description="The requested dealer list was not executed because one or more URL filters failed strict validation."
            padded
          >
            <ContentStatus
              variant="warning"
              title="Review the dealer search URL"
              description={issues}
            />
          </ContentSection>
        </ContentRoot>
      ),
    };
  }

  return {
    kind: "ready",
    access: accessResolution.access,
    query: parsed.data,
  };
}

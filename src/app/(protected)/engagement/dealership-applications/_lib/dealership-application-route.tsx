// oz-next-app/src/app/(protected)/engagement/dealership-applications/_lib/dealership-application-route.tsx
import "server-only";

import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { Clock3, LockKeyhole, ShieldAlert, TriangleAlert } from "lucide-react";

import {
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";
import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  DealershipApplicationAccessState,
  DealershipApplicationInvalidQueryState,
  parseDealershipApplicationSearchParams,
  resolveDealershipApplicationAccess,
  type DealershipApplicationCapabilities,
  type DealershipApplicationRawSearchParams,
  type DealershipApplicationSearchParams,
  type ResolvedDealershipApplicationAccess,
} from "@/features/engagement/dealership-application-operations";
import { isApiHttpError } from "@/lib/api/problem";

type RouteResolution =
  | Readonly<{
      kind: "ready";
      access: ResolvedDealershipApplicationAccess;
      query: DealershipApplicationSearchParams;
    }>
  | Readonly<{ kind: "blocked"; content: ReactElement }>;

export type ResolveDealershipApplicationRouteInput = Readonly<{
  searchParams: Promise<DealershipApplicationRawSearchParams>;
  requiredCapability?: keyof DealershipApplicationCapabilities;
}>;

const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

function queryIssues(
  issues: ReadonlyArray<
    Readonly<{ path: readonly PropertyKey[]; message: string }>
  >,
): readonly string[] {
  return issues.slice(0, 5).map((issue) => {
    const path =
      issue.path.length === 0 ? "$" : issue.path.map(String).join(".");
    return `${path}: ${issue.message}`;
  });
}

export async function resolveDealershipApplicationRoute(
  input: ResolveDealershipApplicationRouteInput,
): Promise<RouteResolution> {
  const [me, rawSearchParams] = await Promise.all([
    requireAuthenticatedMe(),
    input.searchParams,
  ]);
  const parsed = parseDealershipApplicationSearchParams(rawSearchParams);

  if (!parsed.success) {
    return {
      kind: "blocked",
      content: (
        <DealershipApplicationInvalidQueryState
          issues={queryIssues(parsed.error.issues)}
        />
      ),
    };
  }

  const access = resolveDealershipApplicationAccess(me);
  if (access.kind !== "resolved") {
    return {
      kind: "blocked",
      content: <DealershipApplicationAccessState access={access} />,
    };
  }

  if (
    input.requiredCapability !== undefined &&
    !access.capabilities[input.requiredCapability]
  ) {
    return {
      kind: "blocked",
      content: (
        <ContentRoot width="default">
          <ContentSection
            title="Dealership application details are restricted"
            description="The active actor cannot read applicant identity and lifecycle case details."
            padded
          >
            <ContentStatus
              variant="destructive"
              icon={<LockKeyhole aria-hidden="true" />}
              title="Permission required"
              description="No protected detail request was made without the required capability."
            />
          </ContentSection>
        </ContentRoot>
      ),
    };
  }

  return { kind: "ready", access, query: parsed.data };
}

function safeReference(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return SAFE_REFERENCE_PATTERN.test(normalized) ? normalized : null;
}

export function renderDealershipApplicationResourceFailure(
  error: unknown,
  options: Readonly<{
    resourceLabel: string;
    fallbackHref: Route;
    fallbackLabel: string;
  }>,
): ReactElement {
  if (!isApiHttpError(error)) throw error;
  if (error.status === 404) notFound();

  const isForbidden = error.status === 401 || error.status === 403;
  const isRateLimited = error.status === 429;
  const reference = safeReference(error.requestId);
  const icon = isForbidden ? (
    <ShieldAlert aria-hidden="true" />
  ) : isRateLimited ? (
    <Clock3 aria-hidden="true" />
  ) : (
    <TriangleAlert aria-hidden="true" />
  );
  const title = isForbidden
    ? `${options.resourceLabel} is outside the authorized scope`
    : isRateLimited
      ? `${options.resourceLabel} is temporarily rate limited`
      : `${options.resourceLabel} could not be opened`;
  const description = isForbidden
    ? "The active actor or tenant context cannot access this resource. No cross-tenant data was rendered."
    : error.status === 409
      ? "The application changed while this view was resolving. Return to the queue and reopen the latest record."
      : "The protected request did not complete. No stale or partially validated data was rendered.";

  return (
    <ContentRoot width="default">
      <ContentSection
        title={title}
        description={description}
        actions={
          <Button variant="outline" asChild>
            <Link href={options.fallbackHref}>{options.fallbackLabel}</Link>
          </Button>
        }
        padded
      >
        <ContentStatus
          variant={isRateLimited ? "warning" : "destructive"}
          icon={icon}
          title="Protected request not completed"
          description={
            reference === null
              ? "Retry from the authorized queue."
              : `Retry from the authorized queue. Reference: ${reference}`
          }
        />
      </ContentSection>
    </ContentRoot>
  );
}

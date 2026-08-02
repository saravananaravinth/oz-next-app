// oz-next-app/src/app/(protected)/engagement/dashboard/_lib/engagement-dashboard-route.tsx
import "server-only";

import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { Clock3, LockKeyhole, ShieldAlert, TriangleAlert } from "lucide-react";

import {
  ContentHeader,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";
import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  ENGAGEMENT_DASHBOARD_ROUTES,
  EngagementDashboardAccessState,
  EngagementDashboardInvalidQueryState,
  parseEngagementDashboardSearchParams,
  resolveEngagementDashboardAccess,
  type EngagementDashboardCapabilities,
  type EngagementDashboardRawSearchParams,
  type EngagementDashboardSearchParams,
  type ResolvedEngagementDashboardAccess,
} from "@/features/engagement/operations-dashboard";
import { isApiHttpError } from "@/lib/api/problem";

type EngagementDashboardReadCapability = Extract<
  keyof EngagementDashboardCapabilities,
  | "canReadDealerPerformance"
  | "canReadIssues"
  | "canReadLeads"
  | "canReadVideoSequences"
>;

type EngagementDashboardRouteReady = Readonly<{
  kind: "ready";
  access: ResolvedEngagementDashboardAccess;
  query: EngagementDashboardSearchParams;
}>;

type EngagementDashboardRouteBlocked = Readonly<{
  kind: "blocked";
  content: ReactElement;
}>;

export type EngagementDashboardRouteResolution =
  EngagementDashboardRouteReady | EngagementDashboardRouteBlocked;

export type ResolveEngagementDashboardRouteInput = Readonly<{
  searchParams: Promise<EngagementDashboardRawSearchParams>;
  requiredCapability?: EngagementDashboardReadCapability;
  capabilityFallbackHref?: Route;
}>;

export type EngagementDashboardResourceFailureOptions = Readonly<{
  resourceLabel: string;
  fallbackHref: Route;
  fallbackLabel: string;
}>;

type CapabilityCopy = Readonly<{
  title: string;
  description: string;
}>;

type ResourceFailureCopy = Readonly<{
  title: string;
  description: string;
  variant: "destructive" | "warning";
  icon: ReactElement;
}>;

const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

const CAPABILITY_COPY = {
  canReadDealerPerformance: {
    title: "Dealer performance access restricted",
    description:
      "The active actor cannot read dealer-level vehicle-sales engagement performance.",
  },
  canReadIssues: {
    title: "Support workbench access restricted",
    description:
      "The active actor cannot read vehicle-sales engagement support issues.",
  },
  canReadLeads: {
    title: "Lead access restricted",
    description:
      "The active actor cannot read vehicle-sales engagement lead details.",
  },
  canReadVideoSequences: {
    title: "Video schedule access restricted",
    description:
      "The active actor cannot read the customer video schedule configuration.",
  },
} as const satisfies Readonly<
  Record<EngagementDashboardReadCapability, CapabilityCopy>
>;

function formatQueryIssues(
  issues: ReadonlyArray<
    Readonly<{
      path: readonly PropertyKey[];
      message: string;
    }>
  >,
): readonly string[] {
  return issues.slice(0, 5).map((issue) => {
    const path =
      issue.path.length === 0 ? "$" : issue.path.map(String).join(".");
    return `${path}: ${issue.message}`;
  });
}

function capabilityRestrictedState(
  capability: EngagementDashboardReadCapability,
  fallbackHref: Route,
): ReactElement {
  const copy = CAPABILITY_COPY[capability];

  return (
    <ContentRoot width="default">
      <ContentHeader
        eyebrow="Vehicle sales engagement"
        icon={<LockKeyhole aria-hidden="true" />}
        iconTone="destructive"
        title={copy.title}
        description={copy.description}
        actions={
          <Button variant="outline" asChild>
            <Link href={fallbackHref}>Return to an authorized view</Link>
          </Button>
        }
      />

      <ContentStatus
        variant="destructive"
        title="Permission required"
        description="No protected engagement request was made for this view without the required capability."
      />
    </ContentRoot>
  );
}

export async function resolveEngagementDashboardRoute(
  input: ResolveEngagementDashboardRouteInput,
): Promise<EngagementDashboardRouteResolution> {
  const [me, rawSearchParams] = await Promise.all([
    requireAuthenticatedMe(),
    input.searchParams,
  ]);
  const parsedQuery = parseEngagementDashboardSearchParams(rawSearchParams);

  if (!parsedQuery.success) {
    return {
      kind: "blocked",
      content: (
        <EngagementDashboardInvalidQueryState
          issues={formatQueryIssues(parsedQuery.error.issues)}
        />
      ),
    };
  }

  const access = resolveEngagementDashboardAccess(me);

  if (access.kind !== "resolved") {
    return {
      kind: "blocked",
      content: <EngagementDashboardAccessState access={access} />,
    };
  }

  if (
    input.requiredCapability !== undefined &&
    !access.capabilities[input.requiredCapability]
  ) {
    return {
      kind: "blocked",
      content: capabilityRestrictedState(
        input.requiredCapability,
        input.capabilityFallbackHref ?? ENGAGEMENT_DASHBOARD_ROUTES.overview,
      ),
    };
  }

  return {
    kind: "ready",
    access,
    query: parsedQuery.data,
  };
}

function safeRequestReference(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return SAFE_REFERENCE_PATTERN.test(normalized) ? normalized : null;
}

function formatRetryDelay(seconds: number | undefined): string | null {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return null;
  }

  const boundedSeconds = Math.min(Math.ceil(seconds), 86_400);

  if (boundedSeconds < 60) {
    return `${String(Math.max(1, boundedSeconds))} seconds`;
  }

  const minutes = Math.ceil(boundedSeconds / 60);
  return `${String(minutes)} ${minutes === 1 ? "minute" : "minutes"}`;
}

function resourceFailureCopy(
  status: number,
  resourceLabel: string,
  retryAfterSeconds: number | undefined,
): ResourceFailureCopy {
  if (status === 401) {
    return {
      title: `${resourceLabel} could not be authorized`,
      description:
        "The current session could not authorize this request. Reopen the workspace after confirming the session is active.",
      variant: "destructive",
      icon: <LockKeyhole aria-hidden="true" />,
    };
  }

  if (status === 403) {
    return {
      title: `${resourceLabel} is outside the authorized scope`,
      description:
        "The active actor or tenant context cannot access this resource. No cross-tenant data was rendered.",
      variant: "destructive",
      icon: <ShieldAlert aria-hidden="true" />,
    };
  }

  if (status === 409) {
    return {
      title: `${resourceLabel} changed`,
      description:
        "The resource changed while this view was being resolved. Return to the workspace and reopen the latest record.",
      variant: "warning",
      icon: <TriangleAlert aria-hidden="true" />,
    };
  }

  if (status === 422) {
    return {
      title: `${resourceLabel} request is no longer valid`,
      description:
        "The saved link no longer matches the accepted engagement contract. Return to the workspace and open the record again.",
      variant: "warning",
      icon: <TriangleAlert aria-hidden="true" />,
    };
  }

  if (status === 429) {
    const retryDelay = formatRetryDelay(retryAfterSeconds);

    return {
      title: `${resourceLabel} is temporarily rate limited`,
      description:
        retryDelay === null
          ? "The engagement service is limiting requests. Wait briefly, then retry from the workspace."
          : `The engagement service is limiting requests. Retry after approximately ${retryDelay}.`,
      variant: "warning",
      icon: <Clock3 aria-hidden="true" />,
    };
  }

  if (status === 502 || status === 503 || status === 504) {
    return {
      title: `${resourceLabel} is temporarily unavailable`,
      description:
        "The protected engagement service did not complete the request. No stale or partially validated data was rendered.",
      variant: "destructive",
      icon: <TriangleAlert aria-hidden="true" />,
    };
  }

  return {
    title: `${resourceLabel} could not be opened`,
    description:
      "The protected request could not be completed without exposing unsafe backend details.",
    variant: "destructive",
    icon: <TriangleAlert aria-hidden="true" />,
  };
}

export function renderEngagementDashboardResourceFailure(
  error: unknown,
  options: EngagementDashboardResourceFailureOptions,
): ReactElement {
  if (!isApiHttpError(error)) {
    throw error;
  }

  if (error.status === 404) {
    notFound();
  }

  const copy = resourceFailureCopy(
    error.status,
    options.resourceLabel,
    error.retryAfterSeconds,
  );
  const reference = safeRequestReference(error.requestId);

  return (
    <ContentRoot width="default">
      <ContentHeader
        eyebrow="Vehicle sales engagement"
        icon={copy.icon}
        iconTone={copy.variant === "warning" ? "warning" : "destructive"}
        title={copy.title}
        description="The route failed closed and did not render unvalidated engagement data."
        actions={
          <Button variant="outline" asChild>
            <Link href={options.fallbackHref}>{options.fallbackLabel}</Link>
          </Button>
        }
      />

      <ContentStatus
        variant={copy.variant}
        role="alert"
        title="Request not completed"
        description={
          <>
            {copy.description}
            {reference === null ? null : (
              <span className="mt-2 block text-caption">
                Reference: <code>{reference}</code>
              </span>
            )}
          </>
        }
      />
    </ContentRoot>
  );
}

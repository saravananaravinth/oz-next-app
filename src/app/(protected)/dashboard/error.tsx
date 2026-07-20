// oz-next-app/src/app/(protected)/dashboard/error.tsx
"use client";

import type { ReactElement } from "react";
import {
  CircleCheck,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UsersRound,
} from "lucide-react";

import {
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentGrid,
  ContentHeader,
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const DASHBOARD_ERROR_TITLE_ID = "dealer-dashboard-error-title";
const SAFE_DIGEST_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

type DashboardErrorProps = Readonly<{
  error: Error & {
    readonly digest?: string;
  };
  reset: () => void;
}>;

function safeDigest(value: string | undefined): string | null {
  const normalized = value?.trim();

  if (normalized === undefined || normalized.length === 0) {
    return null;
  }

  return SAFE_DIGEST_PATTERN.test(normalized) ? normalized : null;
}

export default function DashboardError({
  error,
  reset,
}: DashboardErrorProps): ReactElement {
  const errorReference = safeDigest(error.digest);

  return (
    <ContentRoot width="full" aria-labelledby={DASHBOARD_ERROR_TITLE_ID}>
      <ContentHeader
        variant="default"
        eyebrow={
          <Badge variant="secondary">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Workspace dashboard
          </Badge>
        }
        title={<span id={DASHBOARD_ERROR_TITLE_ID}>Dashboard unavailable</span>}
        actions={
          <Button type="button" onClick={reset}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Retry dashboard
          </Button>
        }
      />

      <ContentGrid variant="main-aside">
        <ContentSection
          title="Operational data could not be loaded"
          description="The role-aware workspace could not load its current operational data."
        >
          <div className="grid gap-5">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/10 text-destructive">
              <ShieldAlert aria-hidden="true" className="size-6" />
            </div>

            <ContentStatus
              variant="destructive"
              role="alert"
              aria-live="assertive"
              icon={<ShieldAlert aria-hidden="true" className="size-4" />}
              title="The secure workspace did not respond"
              description="Retry the dashboard. This error view does not expose or modify ERP records."
            />

            <ContentStatus
              variant="info"
              role="note"
              icon={<UsersRound aria-hidden="true" className="size-4" />}
              title="Existing operations remain protected"
              description="Backend authorization and actor-scope checks remain authoritative while the dashboard is unavailable."
            />
          </div>
        </ContentSection>

        <ContentSection
          title="Recovery checklist"
          description="Use these steps before escalating the issue."
        >
          <ContentDescriptionList columns="one">
            <ContentDescriptionItem term="1. Retry">
              Reload the secure dealer data using the button above.
            </ContentDescriptionItem>
            <ContentDescriptionItem term="2. Confirm context">
              Administrators using a scoped workspace should verify the selected
              tenant and organization context.
            </ContentDescriptionItem>
            <ContentDescriptionItem term="3. Escalate">
              Share only the safe reference below with the support team.
            </ContentDescriptionItem>
          </ContentDescriptionList>

          <div className="mt-5 rounded-2xl border border-border/70 bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2 text-caption text-muted-readable">
              <CircleCheck aria-hidden="true" className="size-4" />
              Safe support reference
            </div>
            <code className="mt-2 block break-all text-body-sm text-foreground text-tabular">
              {errorReference ?? "Not provided"}
            </code>
          </div>
        </ContentSection>
      </ContentGrid>
    </ContentRoot>
  );
}

// oz-next-app/src/features/dashboard/ui/welcome-dashboard.tsx
import type { ReactElement, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  CheckCircle2,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Palette,
  PanelLeft,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  ContentGrid,
  ContentHeader,
  ContentMetrics,
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type WorkspaceSignal = Readonly<{
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}>;

type WorkspaceGuideItem = Readonly<{
  title: string;
  description: string;
  icon: LucideIcon;
}>;

type IconFrameProps = Readonly<{
  children: ReactNode;
  tone?: "muted" | "primary";
}>;

type WorkspaceBaseline = Readonly<{
  value: number;
  visibleLabel: string;
  ariaLabel: string;
  progressLabel: string;
}>;

const DASHBOARD_TITLE_ID = "welcome-dashboard-title";
const WORKSPACE_BASELINE_TITLE_ID = "workspace-baseline-title";

const WORKSPACE_BASELINE = {
  value: 100,
  visibleLabel: "100%",
  ariaLabel: "100 percent",
  progressLabel: "Protected workspace baseline is complete",
} as const satisfies WorkspaceBaseline;

const WORKSPACE_SIGNALS = [
  {
    title: "Session boundary",
    value: "Server-gated",
    description:
      "Protected routes render only after the authenticated workspace context is resolved.",
    icon: LockKeyhole,
  },
  {
    title: "Tenant data policy",
    value: "No-store",
    description:
      "Authenticated workspace surfaces avoid public caching and browser-visible secrets.",
    icon: ShieldCheck,
  },
  {
    title: "Workspace shell",
    value: "Unified",
    description:
      "Navigation, search, account controls, and notifications stay consistent across modules.",
    icon: PanelLeft,
  },
  {
    title: "Runtime posture",
    value: "Cloudflare-ready",
    description:
      "The page stays lightweight and avoids runtime-heavy client or server work.",
    icon: Gauge,
  },
] as const satisfies readonly WorkspaceSignal[];

const START_GUIDE_ITEMS = [
  {
    title: "Open modules from the sidebar",
    description:
      "Use the workspace navigation to access ERP modules allowed by your role.",
    icon: LayoutDashboard,
  },
  {
    title: "Use search for fast discovery",
    description:
      "Prefer global search as module count grows across operations, finance, and support.",
    icon: Search,
  },
  {
    title: "Review workspace notifications",
    description:
      "Check operational alerts from the shell without leaving the active workspace route.",
    icon: Bell,
  },
  {
    title: "Match your environment",
    description:
      "Use appearance controls to keep the workspace comfortable in light, dark, or system mode.",
    icon: Palette,
  },
] as const satisfies readonly WorkspaceGuideItem[];

const ENTERPRISE_BASELINE_ITEMS = [
  {
    title: "Tenant isolation",
    description:
      "Every protected feature should remain scoped to the authenticated organization context.",
    icon: Building2,
  },
  {
    title: "RBAC alignment",
    description:
      "Navigation and actions should follow permissions returned by the backend and Cloudflare Worker edge layer.",
    icon: KeyRound,
  },
  {
    title: "Typed edge contracts",
    description:
      "Frontend data access should stay centralized, Zod-validated, and aligned to problem JSON errors.",
    icon: ServerCog,
  },
] as const satisfies readonly WorkspaceGuideItem[];

function IconFrame({ children, tone = "muted" }: IconFrameProps): ReactElement {
  return (
    <span
      aria-hidden="true"
      className={
        tone === "primary"
          ? "flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"
          : "flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/70 text-muted-readable"
      }
    >
      {children}
    </span>
  );
}

function SignalCard({
  title,
  value,
  description,
  icon: Icon,
}: WorkspaceSignal): ReactElement {
  return (
    <Card size="sm" className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          <p className="text-overline text-muted-readable">{title}</p>
          <p className="text-card-title text-foreground text-pretty">{value}</p>
        </div>

        <IconFrame>
          <Icon className="size-5" />
        </IconFrame>
      </CardHeader>

      <div className="px-[var(--card-spacing)] pb-[var(--card-spacing)]">
        <p className="text-body-sm text-muted-readable text-pretty">
          {description}
        </p>
      </div>
    </Card>
  );
}

function GuideCard({
  title,
  description,
  icon: Icon,
}: WorkspaceGuideItem): ReactElement {
  return (
    <li className="min-w-0">
      <Card size="sm" className="h-full">
        <CardHeader className="gap-3">
          <IconFrame>
            <Icon className="size-5" />
          </IconFrame>

          <div className="grid min-w-0 gap-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription className="text-pretty">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </li>
  );
}

function BaselineItem({
  title,
  description,
  icon: Icon,
}: WorkspaceGuideItem): ReactElement {
  return (
    <li className="min-w-0">
      <Card size="sm" className="h-full">
        <CardHeader className="flex flex-row items-start gap-3">
          <IconFrame>
            <Icon className="size-5" />
          </IconFrame>

          <div className="grid min-w-0 gap-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription className="text-pretty">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </li>
  );
}

export function WelcomeDashboard(): ReactElement {
  return (
    <ContentRoot width="full" aria-labelledby={DASHBOARD_TITLE_ID}>
      <ContentHeader
        variant="hero"
        eyebrow={
          <Badge variant="secondary">
            <Sparkles aria-hidden="true" className="size-3.5" />
            Workspace home
          </Badge>
        }
        title={<span id={DASHBOARD_TITLE_ID}>Welcome to Ozotec EV</span>}
        description="A secure, tenant-aware workspace for enterprise operations. Start from the shell, keep actions scoped, and rely on validated edge contracts for protected data access."
        meta={
          <>
            <span>Server-authenticated route</span>
            <span aria-hidden="true">•</span>
            <span>No-store workspace data policy</span>
            <span aria-hidden="true">•</span>
            <span>Cloudflare-ready runtime posture</span>
          </>
        }
      >
        <ContentSection
          size="sm"
          aria-labelledby={WORKSPACE_BASELINE_TITLE_ID}
          contentClassName="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        >
          <div className="grid min-w-0 gap-1">
            <h2
              id={WORKSPACE_BASELINE_TITLE_ID}
              className="text-card-title text-foreground text-pretty"
            >
              Protected workspace baseline
            </h2>

            <p className="text-body-sm text-muted-readable text-pretty">
              Server-authenticated route, no-store policy, and shared shell are
              active.
            </p>
          </div>

          <p
            className="text-metric text-foreground text-tabular"
            aria-label={WORKSPACE_BASELINE.ariaLabel}
          >
            {WORKSPACE_BASELINE.visibleLabel}
          </p>

          <Progress
            value={WORKSPACE_BASELINE.value}
            className="sm:col-span-2"
            aria-label={WORKSPACE_BASELINE.progressLabel}
          />
        </ContentSection>
      </ContentHeader>

      <ContentMetrics>
        {WORKSPACE_SIGNALS.map((item) => (
          <SignalCard key={item.title} {...item} />
        ))}
      </ContentMetrics>

      <ContentGrid variant="main-aside">
        <ContentSection
          title="Start with the common workspace tools"
          description="The shared controls should remain consistent across protected ERP modules."
          actions={
            <IconFrame tone="primary">
              <CheckCircle2 className="size-6" />
            </IconFrame>
          }
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {START_GUIDE_ITEMS.map((item) => (
              <GuideCard key={item.title} {...item} />
            ))}
          </ul>
        </ContentSection>

        <ContentSection
          title="Enterprise baseline"
          description="Keep these constraints intact when adding module dashboards, grids, forms, and workflows."
        >
          <ul className="grid gap-3">
            {ENTERPRISE_BASELINE_ITEMS.map((item) => (
              <BaselineItem key={item.title} {...item} />
            ))}
          </ul>
        </ContentSection>
      </ContentGrid>

      <ContentStatus
        role="note"
        icon={<ShieldCheck aria-hidden="true" className="size-4" />}
        title="Security reminder"
        description="Do not share verification codes, customer data, session details, internal screenshots, or workspace access outside approved business channels."
      />
    </ContentRoot>
  );
}

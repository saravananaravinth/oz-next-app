// oz-next-app/src/components/common/content-shell.tsx
import type * as React from "react";
import Link from "next/link";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  type AlertProps,
} from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type ContentWidth = "narrow" | "default" | "wide" | "full";
export type ContentGutter = "none" | "compact" | "default";
export type ContentDensity = "comfortable" | "compact";
export type ContentHeaderVariant = "default" | "hero" | "compact";
export type ContentHeaderSurface = "plain" | "subtle" | "elevated" | "glass";
export type ContentGridVariant =
  | "single"
  | "two"
  | "three"
  | "four"
  | "metrics"
  | "main-aside"
  | "aside-main"
  | "workbench";
export type ContentSplitVariant =
  "equal" | "master-detail" | "detail-master" | "main-context";
export type ContentToolbarVariant = "default" | "subtle" | "ghost";
export type ContentToolbarAlign = "between" | "start" | "end";
export type ContentTone =
  "default" | "primary" | "success" | "warning" | "destructive" | "info";
export type ContentMetricPresentation = "default" | "dashboard";
export type ContentStatusVariant = NonNullable<AlertProps["variant"]>;
export type ContentAnnouncement = "off" | "polite" | "assertive";
export type ContentSkeletonVariant = "page" | "section" | "table" | "form";
export type ContentDescriptionColumns = "one" | "two" | "three";
export type ContentListDensity = "comfortable" | "compact";
export type ContentListVariant = "separated" | "divided";
export type ContentHeadingLevel = 2 | 3 | 4;

export type ContentRootProps = React.ComponentProps<"div"> &
  Readonly<{
    width?: ContentWidth;
    gutter?: ContentGutter;
    density?: ContentDensity;
  }>;

export type ContentHeaderProps = Omit<React.ComponentProps<"header">, "title"> &
  Readonly<{
    eyebrow?: React.ReactNode;
    icon?: React.ReactNode;
    iconTone?: ContentTone;
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    meta?: React.ReactNode;
    variant?: ContentHeaderVariant;
    surface?: ContentHeaderSurface;
    cardClassName?: string;
  }>;

export type ContentGridProps = React.ComponentProps<"div"> &
  Readonly<{
    variant?: ContentGridVariant;
  }>;

export type ContentSplitProps = React.ComponentProps<"div"> &
  Readonly<{
    variant?: ContentSplitVariant;
  }>;

export type ContentToolbarProps = React.ComponentProps<"div"> &
  Readonly<{
    sticky?: boolean;
    variant?: ContentToolbarVariant;
    align?: ContentToolbarAlign;
  }>;

export type ContentSectionProps = Omit<
  React.ComponentProps<typeof Card>,
  "title"
> &
  Readonly<{
    title?: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    footer?: React.ReactNode;
    headingLevel?: ContentHeadingLevel;
    padded?: boolean;
    contentClassName?: string;
  }>;

type ContentDataSurfaceBaseProps = Omit<
  React.ComponentProps<typeof Card>,
  "title"
> &
  Readonly<{
    title?: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    toolbar?: React.ReactNode;
    footer?: React.ReactNode;
    headingLevel?: ContentHeadingLevel;
    padded?: boolean;
    contentClassName?: string;
  }>;

type ContentDataSurfaceScrollProps =
  | Readonly<{
      scrollable?: false;
      scrollAreaLabel?: never;
    }>
  | Readonly<{
      scrollable: true;
      scrollAreaLabel: string;
    }>;

export type ContentDataSurfaceProps = ContentDataSurfaceBaseProps &
  ContentDataSurfaceScrollProps;

type MetricLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  "aria-current" | "aria-label" | "children" | "className" | "href"
>;

export type ContentMetricCardProps = Omit<
  React.ComponentProps<typeof Card>,
  "children" | "title"
> &
  Readonly<{
    label: React.ReactNode;
    value: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ReactNode;
    trend?: React.ReactNode;
    tone?: ContentTone;
    href?: React.ComponentProps<typeof Link>["href"];
    linkProps?: MetricLinkProps;
    active?: boolean;
    ariaLabel?: string;
    ariaCurrent?: React.AriaAttributes["aria-current"];
    presentation?: ContentMetricPresentation;
  }>;

export type ContentStatusProps = Omit<
  React.ComponentProps<typeof Alert>,
  "children" | "title" | "variant"
> &
  Readonly<{
    variant?: ContentStatusVariant;
    title?: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    announce?: ContentAnnouncement;
  }>;

export type ContentEmptyStateProps = Omit<
  React.ComponentProps<typeof Empty>,
  "children" | "title"
> &
  Readonly<{
    icon?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    headingLevel?: ContentHeadingLevel;
  }>;

export type ContentSkeletonProps = React.ComponentProps<"div"> &
  Readonly<{
    rows?: number;
    label?: string;
    variant?: ContentSkeletonVariant;
  }>;

export type ContentFormProps = React.ComponentProps<"form">;

export type ContentFormActionsProps = React.ComponentProps<"div"> &
  Readonly<{
    sticky?: boolean;
  }>;

export type ContentDescriptionListProps = React.ComponentProps<"dl"> &
  Readonly<{
    columns?: ContentDescriptionColumns;
  }>;

export type ContentDescriptionItemProps = Omit<
  React.ComponentProps<"div">,
  "title"
> &
  Readonly<{
    term: React.ReactNode;
    children: React.ReactNode;
    numeric?: boolean;
    termClassName?: string;
    valueClassName?: string;
  }>;

export type ContentListProps = React.ComponentProps<"ul"> &
  Readonly<{
    density?: ContentListDensity;
    variant?: ContentListVariant;
  }>;

export type ContentListItemProps = Omit<React.ComponentProps<"li">, "title"> &
  Readonly<{
    media?: React.ReactNode;
    title?: React.ReactNode;
    description?: React.ReactNode;
    meta?: React.ReactNode;
    actions?: React.ReactNode;
    headingLevel?: Extract<ContentHeadingLevel, 3 | 4>;
  }>;

export type ContentProseProps = React.ComponentProps<"article">;

export type ContentScrollAreaProps = React.ComponentProps<"div"> &
  Readonly<{
    label?: string;
  }>;

const CONTENT_WIDTH_CLASSES = {
  narrow: "max-w-4xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
} as const satisfies Record<ContentWidth, string>;

const CONTENT_GUTTER_CLASSES = {
  none: "",
  compact: "px-3 sm:px-4 lg:px-6",
  default: "px-4 sm:px-6 lg:px-8",
} as const satisfies Record<ContentGutter, string>;

const CONTENT_DENSITY_CLASSES = {
  comfortable:
    "[--content-gap:1.5rem] [--content-item-gap:1.25rem] [--content-control-gap:0.75rem]",
  compact:
    "[--content-gap:1rem] [--content-item-gap:1rem] [--content-control-gap:0.5rem]",
} as const satisfies Record<ContentDensity, string>;

const CONTENT_HEADER_SURFACE_CLASSES = {
  plain: "border-transparent bg-transparent shadow-none",
  subtle: "border-border/70 bg-card shadow-none",
  elevated: "border-border/70 bg-card shadow-sm shadow-foreground/5",
  glass:
    "border-border/70 bg-card/90 shadow-sm shadow-foreground/5 supports-[backdrop-filter]:bg-card/82 supports-[backdrop-filter]:backdrop-blur-md",
} as const satisfies Record<ContentHeaderSurface, string>;

const CONTENT_HEADER_TITLE_CLASSES = {
  default: "text-page-title",
  hero: "text-display",
  compact: "text-section-title",
} as const satisfies Record<ContentHeaderVariant, string>;

const CONTENT_HEADER_CONTENT_CLASSES = {
  default: "gap-5 sm:gap-6",
  hero: "gap-6 sm:gap-8",
  compact: "gap-4",
} as const satisfies Record<ContentHeaderVariant, string>;

const CONTENT_HEADER_ICON_CLASSES = {
  default:
    "size-12 rounded-2xl *:[svg:not([class*='size-'])]:size-5 sm:size-14 sm:*:[svg:not([class*='size-'])]:size-6",
  hero: "size-14 rounded-2xl *:[svg:not([class*='size-'])]:size-6 sm:size-16 sm:*:[svg:not([class*='size-'])]:size-7",
  compact: "size-10 rounded-xl *:[svg:not([class*='size-'])]:size-5 sm:size-11",
} as const satisfies Record<ContentHeaderVariant, string>;

const CONTENT_GRID_CLASSES = {
  single: "grid-cols-1",
  two: "grid-cols-1 @4xl/content-grid:grid-cols-2",
  three:
    "grid-cols-1 @3xl/content-grid:grid-cols-2 @6xl/content-grid:grid-cols-3",
  four: "grid-cols-1 @xl/content-grid:grid-cols-2 @5xl/content-grid:grid-cols-4",
  metrics:
    "grid-cols-1 @xl/content-grid:grid-cols-2 @5xl/content-grid:grid-cols-4",
  "main-aside":
    "grid-cols-1 @5xl/content-grid:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]",
  "aside-main":
    "grid-cols-1 @5xl/content-grid:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]",
  workbench:
    "grid-cols-1 @6xl/content-grid:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)_minmax(16rem,22rem)]",
} as const satisfies Record<ContentGridVariant, string>;

const CONTENT_SPLIT_CLASSES = {
  equal: "grid-cols-1 @4xl/content-split:grid-cols-2",
  "master-detail":
    "grid-cols-1 @5xl/content-split:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)]",
  "detail-master":
    "grid-cols-1 @5xl/content-split:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)]",
  "main-context":
    "grid-cols-1 @6xl/content-split:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]",
} as const satisfies Record<ContentSplitVariant, string>;

const CONTENT_TOOLBAR_VARIANT_CLASSES = {
  default:
    "border border-border/70 bg-card p-2.5 shadow-xs shadow-foreground/5",
  subtle: "border border-transparent bg-muted/45 p-2.5",
  ghost: "border border-transparent bg-transparent p-0",
} as const satisfies Record<ContentToolbarVariant, string>;

const CONTENT_TOOLBAR_ALIGN_CLASSES = {
  between:
    "@sm/content-toolbar:items-center @sm/content-toolbar:justify-between",
  start: "@sm/content-toolbar:items-center @sm/content-toolbar:justify-start",
  end: "@sm/content-toolbar:items-center @sm/content-toolbar:justify-end",
} as const satisfies Record<ContentToolbarAlign, string>;

const CONTENT_TONE_ICON_CLASSES = {
  default: "border-border/70 bg-muted/60 text-muted-readable",
  primary: "border-primary/20 bg-primary/10 text-primary",
  success: "border-success/25 bg-success/5 text-success",
  warning:
    "border-warning/30 bg-warning/10 text-warning-foreground dark:text-warning",
  destructive: "border-destructive/25 bg-destructive/5 text-destructive",
  info: "border-info/25 bg-info/5 text-info",
} as const satisfies Record<ContentTone, string>;

const CONTENT_TONE_ACCENT_CLASSES = {
  default: "bg-border",
  primary: "bg-primary/75",
  success: "bg-success/75",
  warning: "bg-warning/80",
  destructive: "bg-destructive/75",
  info: "bg-info/75",
} as const satisfies Record<ContentTone, string>;

const CONTENT_TONE_DASHBOARD_SURFACE_CLASSES = {
  default: "border-border/75 bg-card",
  primary: "border-primary/20 bg-primary/[0.025]",
  success: "border-success/20 bg-success/[0.03]",
  warning: "border-warning/25 bg-warning/[0.035]",
  destructive: "border-destructive/20 bg-destructive/[0.025]",
  info: "border-info/20 bg-info/[0.03]",
} as const satisfies Record<ContentTone, string>;

const CONTENT_TONE_DASHBOARD_ACTIVE_CLASSES = {
  default: "border-foreground/70 bg-foreground text-background",
  primary: "border-primary bg-primary text-primary-foreground",
  success: "border-success bg-success text-success-foreground",
  warning: "border-warning bg-warning text-warning-foreground",
  destructive: "border-destructive bg-destructive text-destructive-foreground",
  info: "border-info bg-info text-info-foreground",
} as const satisfies Record<ContentTone, string>;

const CONTENT_STATUS_ICON_CLASSES = {
  default: "text-muted-readable",
  destructive: "text-destructive",
  success: "text-success",
  warning: "text-warning-foreground dark:text-warning",
  info: "text-info",
} as const satisfies Record<ContentStatusVariant, string>;

const CONTENT_ANNOUNCEMENT_ROLES = {
  off: "note",
  polite: "status",
  assertive: "alert",
} as const satisfies Record<ContentAnnouncement, React.AriaRole>;

const CONTENT_DESCRIPTION_COLUMNS_CLASSES = {
  one: "grid-cols-1",
  two: "grid-cols-1 @2xl/content-description-list:grid-cols-2",
  three:
    "grid-cols-1 @xl/content-description-list:grid-cols-2 @5xl/content-description-list:grid-cols-3",
} as const satisfies Record<ContentDescriptionColumns, string>;

const CONTENT_LIST_DENSITY_CLASSES = {
  comfortable: "gap-3 data-[variant=divided]:gap-0",
  compact: "gap-2 data-[variant=divided]:gap-0",
} as const satisfies Record<ContentListDensity, string>;

const CONTENT_LIST_VARIANT_CLASSES = {
  separated: "",
  divided:
    "overflow-hidden rounded-2xl border border-border/70 bg-card divide-y divide-border/70",
} as const satisfies Record<ContentListVariant, string>;

const DEFAULT_SKELETON_ROWS = 4;
const MAX_SKELETON_ROWS = 12;

function resolveSkeletonRows(rows: number | undefined): number {
  if (rows === undefined || !Number.isFinite(rows)) {
    return DEFAULT_SKELETON_ROWS;
  }

  return Math.min(Math.max(Math.trunc(rows), 1), MAX_SKELETON_ROWS);
}

function hasHeader(
  title: React.ReactNode | undefined,
  description: React.ReactNode | undefined,
  actions: React.ReactNode | undefined,
): boolean {
  return (
    title !== undefined || description !== undefined || actions !== undefined
  );
}

type ContentHeadingProps = Readonly<{
  level: ContentHeadingLevel;
  className?: string;
  children: React.ReactNode;
}>;

function ContentHeading({
  level,
  className,
  children,
}: ContentHeadingProps): React.ReactElement {
  switch (level) {
    case 2:
      return <h2 className={className}>{children}</h2>;
    case 3:
      return <h3 className={className}>{children}</h3>;
    case 4:
      return <h4 className={className}>{children}</h4>;
  }
}

export function ContentRoot({
  width = "full",
  gutter = "none",
  density = "comfortable",
  className,
  ...props
}: ContentRootProps): React.ReactElement {
  return (
    <div
      data-slot="content-root"
      data-width={width}
      data-gutter={gutter}
      data-density={density}
      className={cn(
        "@container/content-root mx-auto flex w-full min-w-0 flex-col gap-[var(--content-gap)]",
        CONTENT_WIDTH_CLASSES[width],
        CONTENT_GUTTER_CLASSES[gutter],
        CONTENT_DENSITY_CLASSES[density],
        className,
      )}
      {...props}
    />
  );
}

export function ContentHeader({
  eyebrow,
  icon,
  iconTone = "primary",
  title,
  description,
  actions,
  meta,
  variant = "default",
  surface = "subtle",
  cardClassName,
  className,
  children,
  ...props
}: ContentHeaderProps): React.ReactElement {
  return (
    <header
      data-slot="content-header"
      data-variant={variant}
      data-surface={surface}
      className={cn("min-w-0", className)}
      {...props}
    >
      <Card
        data-translucent={surface === "glass" ? "true" : undefined}
        className={cn(
          "@container/content-header min-w-0",
          CONTENT_HEADER_SURFACE_CLASSES[surface],
          cardClassName,
        )}
      >
        <CardContent
          className={cn(
            "grid min-w-0 @3xl/content-header:grid-cols-[minmax(0,1fr)_auto] @3xl/content-header:items-center",
            CONTENT_HEADER_CONTENT_CLASSES[variant],
          )}
        >
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            {icon !== undefined ? (
              <div
                data-slot="content-header-icon"
                data-tone={iconTone}
                className={cn(
                  "flex shrink-0 items-center justify-center border shadow-xs ring-1 ring-foreground/5",
                  CONTENT_HEADER_ICON_CLASSES[variant],
                  CONTENT_TONE_ICON_CLASSES[iconTone],
                )}
                aria-hidden="true"
              >
                {icon}
              </div>
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col justify-center">
              {eyebrow !== undefined ? (
                <div className="mb-1 text-overline text-muted-readable">
                  {eyebrow}
                </div>
              ) : null}

              <h1
                className={cn(
                  CONTENT_HEADER_TITLE_CLASSES[variant],
                  "text-balance text-foreground",
                )}
              >
                {title}
              </h1>

              {description !== undefined ? (
                <div className="mt-1.5 max-w-3xl text-pretty text-body-sm text-muted-readable">
                  {description}
                </div>
              ) : null}

              {meta !== undefined ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-caption text-muted-readable">
                  {meta}
                </div>
              ) : null}
            </div>
          </div>

          {actions !== undefined ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 @3xl/content-header:justify-end">
              {actions}
            </div>
          ) : null}

          {children !== undefined ? (
            <div className="min-w-0 @3xl/content-header:col-span-2">
              {children}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </header>
  );
}

export function ContentGrid({
  variant = "single",
  className,
  children,
  ...props
}: ContentGridProps): React.ReactElement {
  return (
    <div
      data-slot="content-grid-container"
      className="@container/content-grid min-w-0"
    >
      <div
        data-slot="content-grid"
        data-variant={variant}
        className={cn(
          "grid min-w-0 gap-[var(--content-item-gap,1.25rem)]",
          CONTENT_GRID_CLASSES[variant],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function ContentSplit({
  variant = "master-detail",
  className,
  children,
  ...props
}: ContentSplitProps): React.ReactElement {
  return (
    <div
      data-slot="content-split-container"
      className="@container/content-split min-w-0"
    >
      <div
        data-slot="content-split"
        data-variant={variant}
        className={cn(
          "grid min-w-0 gap-[var(--content-item-gap,1.25rem)]",
          CONTENT_SPLIT_CLASSES[variant],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function ContentStack({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      data-slot="content-stack"
      className={cn(
        "flex min-w-0 flex-col gap-[var(--content-item-gap,1.25rem)]",
        className,
      )}
      {...props}
    />
  );
}

export function ContentToolbar({
  sticky = false,
  variant = "default",
  align = "between",
  className,
  children,
  ...props
}: ContentToolbarProps): React.ReactElement {
  return (
    <div
      data-slot="content-toolbar"
      data-variant={variant}
      data-sticky={sticky ? "true" : "false"}
      className={cn(
        "@container/content-toolbar min-w-0 rounded-xl",
        CONTENT_TOOLBAR_VARIANT_CLASSES[variant],
        sticky &&
          "sticky top-[var(--content-sticky-top,0.75rem)] z-30 isolate border-border/80 bg-card shadow-sm",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col gap-[var(--content-control-gap,0.75rem)] @sm/content-toolbar:flex-row",
          CONTENT_TOOLBAR_ALIGN_CLASSES[align],
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ContentMetrics(
  props: React.ComponentProps<"div">,
): React.ReactElement {
  return <ContentGrid variant="metrics" {...props} />;
}

export function ContentSection({
  title,
  description,
  actions,
  footer,
  headingLevel = 2,
  padded = true,
  contentClassName,
  className,
  children,
  ...props
}: ContentSectionProps): React.ReactElement {
  const renderHeader = hasHeader(title, description, actions);
  return (
    <Card
      data-slot="content-section"
      className={cn(
        "@container/content-section min-w-0 shadow-none",
        className,
      )}
      {...props}
    >
      {renderHeader ? (
        <CardHeader className="gap-3 @md/content-section:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            {title !== undefined ? (
              <ContentHeading
                level={headingLevel}
                className="text-card-title text-balance"
              >
                {title}
              </ContentHeading>
            ) : null}
            {description !== undefined ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>

          {actions !== undefined ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 @md/content-section:col-start-2 @md/content-section:row-span-2 @md/content-section:row-start-1 @md/content-section:justify-self-end">
              {actions}
            </div>
          ) : null}
        </CardHeader>
      ) : null}

      {padded ? (
        <CardContent className={contentClassName}>{children}</CardContent>
      ) : (
        <div
          data-slot="content-section-content"
          className={cn("min-w-0", contentClassName)}
        >
          {children}
        </div>
      )}

      {footer !== undefined ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}

export function ContentDataSurface({
  title,
  description,
  actions,
  toolbar,
  footer,
  headingLevel = 2,
  padded = false,
  scrollable = false,
  scrollAreaLabel,
  contentClassName,
  className,
  children,
  ...props
}: ContentDataSurfaceProps): React.ReactElement {
  const renderHeader = hasHeader(title, description, actions);
  return (
    <Card
      data-slot="content-data-surface"
      className={cn(
        "@container/content-data-surface min-w-0 gap-0 py-0 shadow-none",
        className,
      )}
      {...props}
    >
      {renderHeader ? (
        <CardHeader className="gap-3 py-[var(--card-spacing)] @md/content-data-surface:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            {title !== undefined ? (
              <ContentHeading
                level={headingLevel}
                className="text-card-title text-balance"
              >
                {title}
              </ContentHeading>
            ) : null}
            {description !== undefined ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>

          {actions !== undefined ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 @md/content-data-surface:col-start-2 @md/content-data-surface:row-span-2 @md/content-data-surface:row-start-1 @md/content-data-surface:justify-self-end">
              {actions}
            </div>
          ) : null}
        </CardHeader>
      ) : null}

      {toolbar !== undefined ? (
        <div
          data-slot="content-data-surface-toolbar"
          className={cn(
            "bg-muted/35 px-[var(--card-spacing)] py-3",
            renderHeader
              ? "border-y border-border/70"
              : "border-b border-border/70",
          )}
        >
          {toolbar}
        </div>
      ) : null}

      <div
        data-slot="content-data-surface-content"
        data-scrollable={scrollable ? "true" : "false"}
        role={scrollable ? "region" : undefined}
        aria-label={scrollable ? scrollAreaLabel : undefined}
        tabIndex={scrollable ? 0 : undefined}
        className={cn(
          "min-w-0",
          padded ? "p-[var(--card-spacing)]" : undefined,
          scrollable
            ? "scrollbar-compact max-w-full overflow-auto overscroll-contain outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/45"
            : undefined,
          contentClassName,
        )}
      >
        {children}
      </div>

      {footer !== undefined ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}

export function ContentMetricCard({
  label,
  value,
  description,
  icon,
  trend,
  tone = "default",
  href,
  linkProps,
  active = false,
  ariaLabel,
  ariaCurrent,
  presentation = "default",
  size = "sm",
  className,
  ...props
}: ContentMetricCardProps): React.ReactElement {
  const hasSupportingContent = description !== undefined || trend !== undefined;
  const dashboardPresentation = presentation === "dashboard";
  const card = (
    <Card
      data-slot="content-metric-card"
      data-tone={tone}
      data-active={active ? "true" : "false"}
      data-presentation={presentation}
      size={size}
      className={cn(
        "group/metric relative isolate h-full min-w-0 overflow-hidden py-0 shadow-none ring-0 transition-[border-color,background-color,box-shadow,color,filter] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] motion-reduce:transition-none",
        dashboardPresentation
          ? [
              "min-h-[6.75rem]",
              active
                ? CONTENT_TONE_DASHBOARD_ACTIVE_CLASSES[tone]
                : CONTENT_TONE_DASHBOARD_SURFACE_CLASSES[tone],
            ]
          : [
              "border-border/75 bg-card",
              hasSupportingContent ? "min-h-[7.25rem]" : "min-h-[6.25rem]",
            ],
        href !== undefined &&
          (dashboardPresentation
            ? active
              ? "cursor-pointer hover:brightness-[0.98] hover:shadow-sm"
              : "cursor-pointer hover:border-foreground/25 hover:bg-muted/35 hover:shadow-xs hover:shadow-foreground/5"
            : "cursor-pointer hover:border-foreground/25 hover:bg-card hover:shadow-xs hover:shadow-foreground/5"),
        !dashboardPresentation &&
          active &&
          "border-primary/50 bg-primary/[0.035] shadow-xs shadow-primary/5 ring-1 ring-inset ring-primary/15",
        dashboardPresentation &&
          active &&
          "shadow-sm shadow-foreground/10 ring-1 ring-inset ring-background/10",
        className,
      )}
      {...props}
    >
      {dashboardPresentation ? null : (
        <span
          data-slot="content-metric-card-accent"
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 top-0 h-0.5 opacity-80",
            CONTENT_TONE_ACCENT_CLASSES[tone],
            active && "h-[3px] opacity-100",
          )}
        />
      )}

      {dashboardPresentation ? (
        <CardContent className="flex h-full min-w-0 flex-col justify-between gap-2.5 p-3.5 sm:p-4">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div
              data-slot="content-metric-card-label"
              className={cn(
                "min-w-0 truncate text-caption font-medium",
                active ? "text-inherit opacity-90" : "text-foreground/80",
              )}
            >
              {label}
            </div>

            {icon !== undefined ? (
              <div
                data-slot="content-metric-card-icon"
                aria-hidden="true"
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg border shadow-none [&_svg]:size-3.5",
                  active
                    ? "border-current/20 bg-background/15 text-inherit"
                    : CONTENT_TONE_ICON_CLASSES[tone],
                )}
              >
                {icon}
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 items-end justify-between gap-3">
            <div
              data-slot="content-metric-card-value"
              className={cn(
                "min-w-0 text-[clamp(1.875rem,2.25vw,2.5rem)] font-semibold leading-[0.96] tracking-[-0.04em] text-tabular",
                active ? "text-inherit" : "text-foreground",
              )}
            >
              {value}
            </div>

            {hasSupportingContent ? (
              <div
                data-slot="content-metric-card-support"
                className="flex min-w-0 max-w-[62%] shrink-0 items-stretch justify-end gap-1.5"
              >
                {description !== undefined ? (
                  <span
                    data-slot="content-metric-card-description"
                    className={cn(
                      "inline-flex h-6 min-w-0 items-center truncate rounded-md px-2 text-[0.6875rem] leading-none",
                      active
                        ? "bg-background/15 text-inherit opacity-90"
                        : "bg-muted/55 text-muted-readable",
                    )}
                  >
                    {description}
                  </span>
                ) : null}
                {trend !== undefined ? (
                  <span
                    data-slot="content-metric-card-trend"
                    className="inline-flex h-6 shrink-0 items-stretch"
                  >
                    {trend}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardContent>
      ) : (
        <CardContent className="grid min-w-0 gap-2.5 p-3.5 sm:p-4">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div
              data-slot="content-metric-card-label"
              className="min-w-0 truncate text-overline text-muted-readable"
            >
              {label}
            </div>

            {icon !== undefined ? (
              <div
                data-slot="content-metric-card-icon"
                aria-hidden="true"
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-none [&_svg]:size-4",
                  CONTENT_TONE_ICON_CLASSES[tone],
                  active && "shadow-xs",
                )}
              >
                {icon}
              </div>
            ) : null}
          </div>

          <div
            data-slot="content-metric-card-value"
            className="text-metric text-tabular leading-none text-foreground"
          >
            {value}
          </div>

          {hasSupportingContent ? (
            <div
              data-slot="content-metric-card-support"
              className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/55 pt-2 text-caption text-muted-readable"
            >
              {description !== undefined ? (
                <span
                  data-slot="content-metric-card-description"
                  className="min-w-0 flex-1 text-pretty"
                >
                  {description}
                </span>
              ) : null}
              {trend !== undefined ? (
                <span
                  data-slot="content-metric-card-trend"
                  className="shrink-0 text-tabular font-medium text-foreground/75"
                >
                  {trend}
                </span>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      )}
    </Card>
  );

  if (href === undefined) {
    return card;
  }

  return (
    <Link
      {...linkProps}
      href={href}
      aria-current={ariaCurrent ?? (active ? "page" : undefined)}
      aria-label={ariaLabel}
      className={cn(
        "block h-full min-w-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        size === "sm" ? "rounded-xl" : "rounded-2xl",
      )}
    >
      {card}
    </Link>
  );
}

export function ContentStatus({
  variant = "default",
  title,
  description,
  icon,
  actions,
  announce = "off",
  role,
  className,
  ...props
}: ContentStatusProps): React.ReactElement {
  const resolvedRole = role ?? CONTENT_ANNOUNCEMENT_ROLES[announce];
  const hasIcon = icon !== undefined;

  return (
    <Alert
      data-slot="content-status"
      data-announcement={announce}
      variant={variant}
      role={resolvedRole}
      aria-atomic={announce === "off" ? undefined : true}
      className={cn(
        hasIcon &&
          "grid-cols-[auto_minmax(0,1fr)] gap-x-3 [&>[data-slot=content-status-icon]]:row-span-3",
        variant !== "default" &&
          "text-foreground! [&_[data-slot=alert-description]]:text-[var(--typography-muted-color)]!",
        className,
      )}
      {...props}
    >
      {hasIcon ? (
        <span
          data-slot="content-status-icon"
          aria-hidden="true"
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center [&_svg]:size-4",
            CONTENT_STATUS_ICON_CLASSES[variant],
          )}
        >
          {icon}
        </span>
      ) : null}

      {title !== undefined ? (
        <AlertTitle className={cn(hasIcon && "col-start-2")}>
          {title}
        </AlertTitle>
      ) : null}

      {description !== undefined ? (
        <AlertDescription className={cn(hasIcon && "col-start-2")}>
          {description}
        </AlertDescription>
      ) : null}

      {actions !== undefined ? (
        <div
          data-slot="content-status-actions"
          className={cn(
            "mt-2 flex min-w-0 flex-wrap items-center gap-2",
            hasIcon && "col-start-2",
          )}
        >
          {actions}
        </div>
      ) : null}
    </Alert>
  );
}

export function ContentEmptyState({
  icon,
  title,
  description,
  actions,
  headingLevel = 2,
  className,
  ...props
}: ContentEmptyStateProps): React.ReactElement {
  return (
    <Empty
      data-slot="content-empty-state"
      className={cn("min-h-56 py-10", className)}
      {...props}
    >
      <EmptyHeader>
        {icon !== undefined ? (
          <EmptyMedia aria-hidden="true" variant="icon">
            {icon}
          </EmptyMedia>
        ) : null}

        <ContentHeading
          level={headingLevel}
          className="text-card-title text-balance"
        >
          {title}
        </ContentHeading>

        {description !== undefined ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>

      {actions !== undefined ? <EmptyContent>{actions}</EmptyContent> : null}
    </Empty>
  );
}

export function ContentSkeleton({
  rows,
  label = "Loading content",
  variant = "section",
  className,
  ...props
}: ContentSkeletonProps): React.ReactElement {
  const rowCount = resolveSkeletonRows(rows);
  const statusProps = {
    "aria-atomic": true,
    "aria-busy": true,
    "aria-live": "polite",
    role: "status",
  } as const;

  if (variant === "page") {
    return (
      <div
        data-slot="content-skeleton"
        data-variant={variant}
        className={cn(
          "grid min-w-0 gap-[var(--content-gap,1.5rem)]",
          className,
        )}
        {...statusProps}
        {...props}
      >
        <span className="sr-only">{label}</span>
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid min-w-0 grid-cols-1 gap-4 @xl/content-root:grid-cols-2 @5xl/content-root:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div
        data-slot="content-skeleton"
        data-variant={variant}
        className={cn("grid min-w-0 gap-3", className)}
        {...statusProps}
        {...props}
      >
        <span className="sr-only">{label}</span>
        <Skeleton className="h-12 w-full rounded-xl" />
        {Array.from({ length: rowCount }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div
        data-slot="content-skeleton"
        data-variant={variant}
        className={cn("grid min-w-0 gap-4", className)}
        {...statusProps}
        {...props}
      >
        <span className="sr-only">{label}</span>
        {Array.from({ length: rowCount }, (_, index) => (
          <div key={index} className="grid gap-2">
            <Skeleton className="h-4 w-36 rounded-lg" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div
      data-slot="content-skeleton"
      data-variant={variant}
      className={cn("grid min-w-0 gap-4", className)}
      {...statusProps}
      {...props}
    >
      <span className="sr-only">{label}</span>
      <Skeleton className="h-28 w-full rounded-2xl" />

      <div className="grid min-w-0 gap-3">
        {Array.from({ length: rowCount }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ContentForm({
  className,
  ...props
}: ContentFormProps): React.ReactElement {
  return (
    <form
      data-slot="content-form"
      className={cn("grid min-w-0 gap-[var(--content-gap,1.5rem)]", className)}
      {...props}
    />
  );
}

export function ContentFormActions({
  sticky = false,
  className,
  children,
  ...props
}: ContentFormActionsProps): React.ReactElement {
  return (
    <div
      data-slot="content-form-actions"
      data-sticky={sticky ? "true" : "false"}
      className={cn(
        "@container/content-form-actions min-w-0 rounded-xl border border-border/70 bg-card p-3 shadow-xs shadow-foreground/5",
        sticky &&
          "sticky bottom-[calc(var(--content-sticky-bottom,0.75rem)+env(safe-area-inset-bottom))] z-30 isolate bg-card shadow-sm",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-2 [&>[data-slot=button]]:w-full @sm/content-form-actions:flex-row @sm/content-form-actions:items-center @sm/content-form-actions:justify-end @sm/content-form-actions:[&>[data-slot=button]]:w-auto">
        {children}
      </div>
    </div>
  );
}

export function ContentDescriptionList({
  columns = "two",
  className,
  children,
  ...props
}: ContentDescriptionListProps): React.ReactElement {
  return (
    <div
      data-slot="content-description-list-container"
      className="@container/content-description-list min-w-0"
    >
      <dl
        data-slot="content-description-list"
        data-columns={columns}
        className={cn(
          "grid min-w-0 gap-3",
          CONTENT_DESCRIPTION_COLUMNS_CLASSES[columns],
          className,
        )}
        {...props}
      >
        {children}
      </dl>
    </div>
  );
}

export function ContentDescriptionItem({
  term,
  children,
  numeric = false,
  termClassName,
  valueClassName,
  className,
  ...props
}: ContentDescriptionItemProps): React.ReactElement {
  return (
    <div
      data-slot="content-description-item"
      className={cn(
        "grid min-w-0 gap-1 rounded-xl border border-border/70 bg-muted/35 p-3",
        className,
      )}
      {...props}
    >
      <dt className={cn("text-overline text-muted-readable", termClassName)}>
        {term}
      </dt>
      <dd
        className={cn(
          "min-w-0 text-body-sm text-foreground",
          numeric && "text-tabular",
          valueClassName,
        )}
      >
        {children}
      </dd>
    </div>
  );
}

export function ContentList({
  density = "comfortable",
  variant = "separated",
  className,
  ...props
}: ContentListProps): React.ReactElement {
  return (
    <ul
      data-slot="content-list"
      data-density={density}
      data-variant={variant}
      className={cn(
        "group/content-list grid min-w-0",
        CONTENT_LIST_DENSITY_CLASSES[density],
        CONTENT_LIST_VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}

export function ContentListItem({
  media,
  title,
  description,
  meta,
  actions,
  headingLevel = 3,
  className,
  children,
  ...props
}: ContentListItemProps): React.ReactElement {
  return (
    <li
      data-slot="content-list-item"
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-none sm:flex-row sm:items-start",
        "group-data-[variant=divided]/content-list:rounded-none group-data-[variant=divided]/content-list:border-0 group-data-[variant=divided]/content-list:bg-transparent",
        className,
      )}
      {...props}
    >
      {media !== undefined ? (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/60 text-muted-readable">
          {media}
        </div>
      ) : null}

      <div className="grid min-w-0 flex-1 gap-1">
        {meta !== undefined ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-caption text-muted-readable">
            {meta}
          </div>
        ) : null}

        {title !== undefined ? (
          <ContentHeading
            level={headingLevel}
            className="text-card-title text-pretty text-foreground"
          >
            {title}
          </ContentHeading>
        ) : null}

        {description !== undefined ? (
          <div className="text-pretty text-body-sm text-muted-readable">
            {description}
          </div>
        ) : null}

        {children !== undefined ? (
          <div className="min-w-0 text-body-sm">{children}</div>
        ) : null}
      </div>

      {actions !== undefined ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </li>
  );
}

export function ContentProse({
  className,
  ...props
}: ContentProseProps): React.ReactElement {
  return (
    <article
      data-slot="content-prose"
      className={cn("prose-enterprise min-w-0", className)}
      {...props}
    />
  );
}

export function ContentScrollArea({
  label,
  role,
  tabIndex = 0,
  className,
  ...props
}: ContentScrollAreaProps): React.ReactElement {
  return (
    <div
      data-slot="content-scroll-area"
      role={role ?? (label !== undefined ? "region" : undefined)}
      aria-label={label}
      tabIndex={tabIndex}
      className={cn(
        "scrollbar-compact min-w-0 overflow-auto overscroll-contain outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/45",
        className,
      )}
      {...props}
    />
  );
}

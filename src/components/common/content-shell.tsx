// oz-next-app/src/components/common/content-shell.tsx
import type * as React from "react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  type AlertProps,
} from "@/components/ui/alert";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type ContentWidth = "narrow" | "default" | "wide" | "full";
export type ContentDensity = "comfortable" | "compact";
export type ContentHeaderVariant = "default" | "hero" | "compact";
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
export type ContentStatusVariant = NonNullable<AlertProps["variant"]>;
export type ContentSkeletonVariant = "page" | "section" | "table" | "form";
export type ContentDescriptionColumns = "one" | "two" | "three";
export type ContentListDensity = "comfortable" | "compact";

export type ContentRootProps = React.ComponentProps<"div"> &
  Readonly<{
    width?: ContentWidth;
    density?: ContentDensity;
  }>;

export type ContentHeaderProps = Omit<React.ComponentProps<"header">, "title"> &
  Readonly<{
    eyebrow?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    meta?: React.ReactNode;
    variant?: ContentHeaderVariant;
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

export type ContentToolbarProps = React.ComponentProps<"section"> &
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
    padded?: boolean;
    contentClassName?: string;
  }>;

export type ContentDataSurfaceProps = Omit<
  React.ComponentProps<typeof Card>,
  "title"
> &
  Readonly<{
    title?: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    toolbar?: React.ReactNode;
    footer?: React.ReactNode;
    padded?: boolean;
    scrollable?: boolean;
    contentClassName?: string;
  }>;

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
    href?: string;
    active?: boolean;
    ariaLabel?: string;
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
  }>;

export type ContentListItemProps = Omit<React.ComponentProps<"li">, "title"> &
  Readonly<{
    media?: React.ReactNode;
    title?: React.ReactNode;
    description?: React.ReactNode;
    meta?: React.ReactNode;
    actions?: React.ReactNode;
  }>;

export type ContentProseProps = React.ComponentProps<"article">;

export type ContentScrollAreaProps = React.ComponentProps<"div">;

const CONTENT_WIDTH_CLASSES = {
  narrow: "max-w-4xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
} as const satisfies Record<ContentWidth, string>;

const CONTENT_DENSITY_CLASSES = {
  comfortable: "gap-5 sm:gap-6",
  compact: "gap-4",
} as const satisfies Record<ContentDensity, string>;

const CONTENT_HEADER_CARD_CLASSES = {
  default:
    "bg-card/80 supports-[backdrop-filter]:bg-card/70 supports-[backdrop-filter]:backdrop-blur-xl",
  hero: "bg-card/80 supports-[backdrop-filter]:bg-card/70 supports-[backdrop-filter]:backdrop-blur-xl",
  compact:
    "bg-card/90 supports-[backdrop-filter]:bg-card/80 supports-[backdrop-filter]:backdrop-blur-xl",
} as const satisfies Record<ContentHeaderVariant, string>;

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

const CONTENT_GRID_CLASSES = {
  single: "grid-cols-1",
  two: "grid-cols-1 xl:grid-cols-2",
  three: "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3",
  four: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
  metrics: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
  "main-aside": "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]",
  "aside-main": "grid-cols-1 xl:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]",
  workbench:
    "grid-cols-1 2xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)_minmax(18rem,24rem)]",
} as const satisfies Record<ContentGridVariant, string>;

const CONTENT_SPLIT_CLASSES = {
  equal: "grid-cols-1 xl:grid-cols-2",
  "master-detail":
    "grid-cols-1 xl:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)]",
  "detail-master":
    "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)]",
  "main-context":
    "grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(24rem,34rem)]",
} as const satisfies Record<ContentSplitVariant, string>;

const CONTENT_TOOLBAR_VARIANT_CLASSES = {
  default:
    "border border-border/70 bg-card/85 shadow-xs shadow-foreground/5 supports-[backdrop-filter]:bg-card/75 supports-[backdrop-filter]:backdrop-blur-xl",
  subtle:
    "border border-border/70 bg-muted/45 shadow-xs shadow-foreground/5 supports-[backdrop-filter]:bg-muted/35 supports-[backdrop-filter]:backdrop-blur-xl",
  ghost: "border border-transparent bg-transparent",
} as const satisfies Record<ContentToolbarVariant, string>;

const CONTENT_TOOLBAR_ALIGN_CLASSES = {
  between: "sm:items-center sm:justify-between",
  start: "sm:items-center sm:justify-start",
  end: "sm:items-center sm:justify-end",
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

const CONTENT_DESCRIPTION_COLUMNS_CLASSES = {
  one: "grid-cols-1",
  two: "grid-cols-1 md:grid-cols-2",
  three: "grid-cols-1 md:grid-cols-2 2xl:grid-cols-3",
} as const satisfies Record<ContentDescriptionColumns, string>;

const CONTENT_LIST_DENSITY_CLASSES = {
  comfortable: "gap-3",
  compact: "gap-2",
} as const satisfies Record<ContentListDensity, string>;

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

export function ContentRoot({
  width = "wide",
  density = "comfortable",
  className,
  ...props
}: ContentRootProps): React.ReactElement {
  return (
    <div
      data-slot="content-root"
      data-width={width}
      data-density={density}
      className={cn(
        "@container/content-root mx-auto flex w-full min-w-0 flex-col",
        CONTENT_WIDTH_CLASSES[width],
        CONTENT_DENSITY_CLASSES[density],
        className,
      )}
      {...props}
    />
  );
}

export function ContentHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  variant = "default",
  cardClassName,
  className,
  children,
  ...props
}: ContentHeaderProps): React.ReactElement {
  return (
    <header
      data-slot="content-header"
      className={cn("min-w-0", className)}
      {...props}
    >
      <Card
        className={cn(
          "shadow-xs shadow-foreground/5",
          CONTENT_HEADER_CARD_CLASSES[variant],
          cardClassName,
        )}
      >
        <CardContent
          className={cn(
            "grid min-w-0 lg:grid-cols-[minmax(0,1fr)_auto]",
            CONTENT_HEADER_CONTENT_CLASSES[variant],
          )}
        >
          <div className="min-w-0">
            {eyebrow !== undefined ? (
              <div className="mb-2 text-overline text-muted-readable">
                {eyebrow}
              </div>
            ) : null}

            <h1
              className={cn(
                CONTENT_HEADER_TITLE_CLASSES[variant],
                "text-foreground",
              )}
            >
              {title}
            </h1>

            {description !== undefined ? (
              <p className="mt-3 max-w-3xl text-body-sm text-muted-readable text-pretty">
                {description}
              </p>
            ) : null}

            {meta !== undefined ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-caption text-muted-readable">
                {meta}
              </div>
            ) : null}
          </div>

          {actions !== undefined ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
              {actions}
            </div>
          ) : null}

          {children !== undefined ? (
            <div className="min-w-0 lg:col-span-2">{children}</div>
          ) : null}
        </CardContent>
      </Card>
    </header>
  );
}

export function ContentGrid({
  variant = "single",
  className,
  ...props
}: ContentGridProps): React.ReactElement {
  return (
    <div
      data-slot="content-grid"
      data-variant={variant}
      className={cn(
        "grid min-w-0 gap-4 sm:gap-5",
        CONTENT_GRID_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}

export function ContentSplit({
  variant = "master-detail",
  className,
  ...props
}: ContentSplitProps): React.ReactElement {
  return (
    <div
      data-slot="content-split"
      data-variant={variant}
      className={cn(
        "grid min-w-0 gap-4 sm:gap-5",
        CONTENT_SPLIT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}

export function ContentStack({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      data-slot="content-stack"
      className={cn("flex min-w-0 flex-col gap-4 sm:gap-5", className)}
      {...props}
    />
  );
}

export function ContentToolbar({
  sticky = false,
  variant = "default",
  align = "between",
  className,
  ...props
}: ContentToolbarProps): React.ReactElement {
  return (
    <section
      data-slot="content-toolbar"
      data-variant={variant}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-2xl p-3",
        CONTENT_TOOLBAR_VARIANT_CLASSES[variant],
        CONTENT_TOOLBAR_ALIGN_CLASSES[align],
        sticky ? "sticky top-3 z-20" : undefined,
        className,
      )}
      {...props}
    />
  );
}

export function ContentMetrics({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      data-slot="content-metrics"
      className={cn(
        "grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
      {...props}
    />
  );
}

export function ContentSection({
  title,
  description,
  actions,
  footer,
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
      className={cn("min-w-0", className)}
      {...props}
    >
      {renderHeader ? (
        <CardHeader>
          <div className="min-w-0">
            {title !== undefined ? <CardTitle>{title}</CardTitle> : null}
            {description !== undefined ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>

          {actions !== undefined ? <CardAction>{actions}</CardAction> : null}
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
  padded = false,
  scrollable = false,
  contentClassName,
  className,
  children,
  ...props
}: ContentDataSurfaceProps): React.ReactElement {
  const renderHeader = hasHeader(title, description, actions);

  return (
    <Card
      data-slot="content-data-surface"
      className={cn("min-w-0", className)}
      {...props}
    >
      {renderHeader ? (
        <CardHeader>
          <div className="min-w-0">
            {title !== undefined ? <CardTitle>{title}</CardTitle> : null}
            {description !== undefined ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>

          {actions !== undefined ? <CardAction>{actions}</CardAction> : null}
        </CardHeader>
      ) : null}

      {toolbar !== undefined ? (
        <div
          data-slot="content-data-surface-toolbar"
          className="border-y border-border/70 bg-muted/35 px-[var(--card-spacing)] py-3"
        >
          {toolbar}
        </div>
      ) : null}

      <div
        data-slot="content-data-surface-content"
        className={cn(
          "min-w-0",
          padded ? "px-[var(--card-spacing)]" : undefined,
          scrollable ? "overflow-auto scrollbar-stable" : "overflow-hidden",
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
  active = false,
  ariaLabel,
  size = "sm",
  className,
  ...props
}: ContentMetricCardProps): React.ReactElement {
  const card = (
    <Card
      data-slot="content-metric-card"
      data-tone={tone}
      data-active={active ? "true" : "false"}
      size={size}
      className={cn(
        "group/metric relative h-full min-w-0 overflow-hidden border-border/75 bg-card/90 py-0 shadow-sm shadow-foreground/5 transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none",
        href !== undefined &&
          "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
        active && "border-primary/45 bg-primary/[0.055] shadow-primary/10",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-0.5 bg-transparent transition-colors motion-reduce:transition-none",
          active && "bg-primary",
        )}
      />
      <CardContent className="grid min-w-0 gap-3 p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 truncate text-overline text-muted-readable">
            {label}
          </div>
          {icon !== undefined ? (
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-2xl border transition-[background-color,border-color,color] duration-200 motion-reduce:transition-none [&_svg]:size-4",
                CONTENT_TONE_ICON_CLASSES[tone],
                href !== undefined &&
                  "group-hover/metric:border-primary/25 group-hover/metric:bg-primary/10 group-hover/metric:text-primary",
                active && "border-primary/25 bg-primary/12 text-primary",
              )}
            >
              {icon}
            </div>
          ) : null}
        </div>

        <div className="text-metric text-foreground text-tabular">{value}</div>

        {description !== undefined || trend !== undefined ? (
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-readable">
            {description !== undefined ? (
              <span className="min-w-0 truncate">{description}</span>
            ) : null}
            {trend !== undefined ? (
              <span className="text-tabular">{trend}</span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  if (href === undefined) {
    return card;
  }

  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={ariaLabel}
      className="min-w-0 rounded-3xl outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
    >
      {card}
    </a>
  );
}

export function ContentStatus({
  variant = "default",
  title,
  description,
  icon,
  actions,
  className,
  ...props
}: ContentStatusProps): React.ReactElement {
  return (
    <Alert
      data-slot="content-status"
      variant={variant}
      className={className}
      {...props}
    >
      {icon}
      {title !== undefined ? <AlertTitle>{title}</AlertTitle> : null}
      {description !== undefined ? (
        <AlertDescription>{description}</AlertDescription>
      ) : null}
      {actions !== undefined ? <AlertAction>{actions}</AlertAction> : null}
    </Alert>
  );
}

export function ContentEmptyState({
  icon,
  title,
  description,
  actions,
  className,
  ...props
}: ContentEmptyStateProps): React.ReactElement {
  return (
    <Empty data-slot="content-empty-state" className={className} {...props}>
      <EmptyHeader>
        {icon !== undefined ? (
          <EmptyMedia variant="icon">{icon}</EmptyMedia>
        ) : null}
        <EmptyTitle>{title}</EmptyTitle>
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

  if (variant === "page") {
    return (
      <div
        data-slot="content-skeleton"
        data-variant={variant}
        role="status"
        aria-live="polite"
        className={cn("grid min-w-0 gap-5 sm:gap-6", className)}
        {...props}
      >
        <span className="sr-only">{label}</span>
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div
        data-slot="content-skeleton"
        data-variant={variant}
        role="status"
        aria-live="polite"
        className={cn("grid min-w-0 gap-3", className)}
        {...props}
      >
        <span className="sr-only">{label}</span>
        <Skeleton className="h-12 w-full rounded-2xl" />
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
        role="status"
        aria-live="polite"
        className={cn("grid min-w-0 gap-4", className)}
        {...props}
      >
        <span className="sr-only">{label}</span>
        {Array.from({ length: rowCount }, (_, index) => (
          <div key={index} className="grid gap-2">
            <Skeleton className="h-4 w-36 rounded-xl" />
            <Skeleton className="h-10 w-full rounded-2xl" />
          </div>
        ))}
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div
      data-slot="content-skeleton"
      data-variant={variant}
      role="status"
      aria-live="polite"
      className={cn("grid min-w-0 gap-4", className)}
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
      className={cn("grid min-w-0 gap-5 sm:gap-6", className)}
      {...props}
    />
  );
}

export function ContentFormActions({
  sticky = false,
  className,
  ...props
}: ContentFormActionsProps): React.ReactElement {
  return (
    <div
      data-slot="content-form-actions"
      className={cn(
        "flex min-w-0 flex-col-reverse gap-2 rounded-2xl border border-border/70 bg-card/90 p-3 shadow-xs shadow-foreground/5 sm:flex-row sm:items-center sm:justify-end",
        "supports-[backdrop-filter]:bg-card/80 supports-[backdrop-filter]:backdrop-blur-xl",
        sticky ? "sticky bottom-3 z-20" : undefined,
        className,
      )}
      {...props}
    />
  );
}

export function ContentDescriptionList({
  columns = "two",
  className,
  ...props
}: ContentDescriptionListProps): React.ReactElement {
  return (
    <dl
      data-slot="content-description-list"
      data-columns={columns}
      className={cn(
        "grid min-w-0 gap-3",
        CONTENT_DESCRIPTION_COLUMNS_CLASSES[columns],
        className,
      )}
      {...props}
    />
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
        "grid min-w-0 gap-1 rounded-2xl border border-border/70 bg-muted/35 p-3",
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
          numeric ? "text-tabular" : undefined,
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
  className,
  ...props
}: ContentListProps): React.ReactElement {
  return (
    <ul
      data-slot="content-list"
      data-density={density}
      className={cn(
        "grid min-w-0",
        CONTENT_LIST_DENSITY_CLASSES[density],
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
  className,
  children,
  ...props
}: ContentListItemProps): React.ReactElement {
  return (
    <li
      data-slot="content-list-item"
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-2xl border border-border/70 bg-card/75 p-4 shadow-xs shadow-foreground/5 sm:flex-row sm:items-start",
        className,
      )}
      {...props}
    >
      {media !== undefined ? (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/60 text-muted-readable">
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
          <div className="text-card-title text-foreground text-pretty">
            {title}
          </div>
        ) : null}

        {description !== undefined ? (
          <div className="text-body-sm text-muted-readable text-pretty">
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
  className,
  ...props
}: ContentScrollAreaProps): React.ReactElement {
  return (
    <div
      data-slot="content-scroll-area"
      className={cn("min-w-0 overflow-auto scrollbar-stable", className)}
      {...props}
    />
  );
}

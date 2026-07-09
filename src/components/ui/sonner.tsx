// oz-next-app/src/components/ui/sonner.tsx
"use client";

import type { CSSProperties, ReactElement } from "react";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { cn } from "@/lib/utils";

type SonnerTheme = NonNullable<ToasterProps["theme"]>;
type SonnerStyle = CSSProperties &
  Readonly<{
    "--normal-bg": string;
    "--normal-text": string;
    "--normal-border": string;
    "--border-radius": string;
  }>;

const DEFAULT_THEME = "system" as const satisfies SonnerTheme;

const TOASTER_STYLE = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius-2xl)",
} satisfies SonnerStyle;

const DEFAULT_ICONS = {
  success: (
    <CircleCheckIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
  ),
  info: <InfoIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />,
  warning: (
    <TriangleAlertIcon
      className="size-4"
      strokeWidth={1.75}
      aria-hidden="true"
    />
  ),
  error: (
    <OctagonXIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
  ),
  loading: (
    <Loader2Icon
      className="size-4 animate-spin motion-reduce:animate-none"
      strokeWidth={1.75}
      aria-hidden="true"
    />
  ),
} satisfies NonNullable<ToasterProps["icons"]>;

const DEFAULT_TOAST_CLASSNAMES = {
  toast:
    "cn-toast rounded-2xl border border-border/70 bg-popover/95 text-popover-foreground shadow-lg shadow-foreground/5 backdrop-blur-xl",
  title: "text-card-title text-foreground",
  description: "text-body-sm text-muted-readable",
  actionButton:
    "rounded-xl bg-primary px-3 py-1.5 text-body-sm text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
  cancelButton:
    "rounded-xl border border-border/70 bg-background px-3 py-1.5 text-body-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
  closeButton:
    "rounded-full border border-border/70 bg-background text-muted-readable transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
  icon: "text-current",
  loader: "text-current",
} satisfies NonNullable<
  NonNullable<ToasterProps["toastOptions"]>["classNames"]
>;

function isSonnerTheme(value: string | undefined): value is SonnerTheme {
  return value === "light" || value === "dark" || value === "system";
}

function Toaster({
  className,
  icons,
  style,
  toastOptions,
  theme: themeOverride,
  ...props
}: ToasterProps): ReactElement {
  const { theme } = useTheme();
  const resolvedTheme =
    themeOverride ?? (isSonnerTheme(theme) ? theme : DEFAULT_THEME);
  const mergedStyle: CSSProperties = {
    ...TOASTER_STYLE,
    ...style,
  };
  const mergedToastOptions: ToasterProps["toastOptions"] = {
    ...toastOptions,
    classNames: {
      ...DEFAULT_TOAST_CLASSNAMES,
      ...toastOptions?.classNames,
    },
  };

  return (
    <Sonner
      theme={resolvedTheme}
      className={cn("toaster group", className)}
      icons={{
        ...DEFAULT_ICONS,
        ...icons,
      }}
      style={mergedStyle}
      toastOptions={mergedToastOptions}
      {...props}
    />
  );
}

export { Toaster };

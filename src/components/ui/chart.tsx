// oz-next-app/src/components/ui/chart.tsx
"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import type { TooltipValueType } from "recharts";

import { cn } from "@/lib/utils";

const INITIAL_DIMENSION = { width: 320, height: 200 } as const;
const THEME_ATTRIBUTE_FILTER = ["class", "data-theme"] as const;
const CHART_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/u;
const SAFE_COLOR_PATTERN =
  /^(?:#[0-9A-Fa-f]{3,8}|(?:rgb|rgba|hsl|hsla|oklch|oklab|color-mix)\([^;{}]{1,160}\)|var\(--[A-Za-z0-9_-]{1,80}\)|[A-Za-z]{1,32})$/u;
const CONTROL_CHARACTER_DELETE = 127;
const CONTROL_CHARACTER_MAX_CODE_POINT = 31;

type ThemeName = "light" | "dark";
type TooltipNameType = number | string;
type ChartCSSVariables = React.CSSProperties &
  Readonly<Record<`--color-${string}`, string>>;
type ThemeSubscriber = () => void;

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<ThemeName, string> }
  )
>;

type ChartContextProps = Readonly<{
  config: ChartConfig;
}>;

type ChartContainerProps = React.ComponentProps<"div"> &
  Readonly<{
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"];
    initialDimension?: Readonly<{
      width: number;
      height: number;
    }>;
  }>;

type ChartStyleProps = Readonly<{
  id: string;
  config: ChartConfig;
}>;

const ChartContext = React.createContext<ChartContextProps | null>(null);
const themeSubscribers = new Set<ThemeSubscriber>();
let themeObserver: MutationObserver | null = null;

function useChart(): ChartContextProps {
  const context = React.useContext(ChartContext);

  if (context === null) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getDocumentTheme(): ThemeName {
  if (typeof document === "undefined") {
    return "light";
  }

  const root = document.documentElement;
  return root.classList.contains("dark") || root.dataset["theme"] === "dark"
    ? "dark"
    : "light";
}

function notifyThemeSubscribers(): void {
  for (const subscriber of themeSubscribers) {
    subscriber();
  }
}

function ensureThemeObserver(): void {
  if (
    themeObserver !== null ||
    typeof document === "undefined" ||
    typeof MutationObserver === "undefined"
  ) {
    return;
  }

  themeObserver = new MutationObserver(notifyThemeSubscribers);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [...THEME_ATTRIBUTE_FILTER],
  });
}

function subscribeDocumentTheme(onStoreChange: ThemeSubscriber): () => void {
  if (
    typeof document === "undefined" ||
    typeof MutationObserver === "undefined"
  ) {
    return () => undefined;
  }

  themeSubscribers.add(onStoreChange);
  ensureThemeObserver();

  return () => {
    themeSubscribers.delete(onStoreChange);

    if (themeSubscribers.size === 0) {
      themeObserver?.disconnect();
      themeObserver = null;
    }
  };
}

function useDocumentTheme(): ThemeName {
  return React.useSyncExternalStore(
    subscribeDocumentTheme,
    getDocumentTheme,
    () => "light",
  );
}

function normalizeChartKey(key: string): string | null {
  const normalized = key.trim();

  return CHART_KEY_PATTERN.test(normalized) ? normalized : null;
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);

    if (
      codePoint <= CONTROL_CHARACTER_MAX_CODE_POINT ||
      codePoint === CONTROL_CHARACTER_DELETE
    ) {
      return true;
    }
  }

  return false;
}

function normalizeColorValue(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";

  if (
    normalized.length === 0 ||
    normalized.length > 180 ||
    hasControlCharacter(normalized)
  ) {
    return null;
  }

  return SAFE_COLOR_PATTERN.test(normalized) ? normalized : null;
}

function chartCssVariables(
  config: ChartConfig,
  theme: ThemeName,
): ChartCSSVariables {
  const variables: Record<`--color-${string}`, string> = {};

  for (const [rawKey, itemConfig] of Object.entries(config)) {
    const key = normalizeChartKey(rawKey);
    if (key === null) {
      continue;
    }

    const color = normalizeColorValue(
      itemConfig.theme?.[theme] ?? itemConfig.color,
    );
    if (color === null) {
      continue;
    }

    variables[`--color-${key}`] = color;
  }

  return variables;
}

function mergeChartContainerStyle(
  style: React.CSSProperties | undefined,
  config: ChartConfig,
  theme: ThemeName,
): React.CSSProperties {
  return {
    ...chartCssVariables(config, theme),
    ...style,
  };
}

function readStringField(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const field = value[key];
  return typeof field === "string" && field.trim().length > 0
    ? field
    : undefined;
}

function tooltipIndicatorStyle(color: string | undefined): React.CSSProperties {
  if (color === undefined || color.trim().length === 0) {
    return {};
  }

  return {
    "--color-bg": color,
    "--color-border": color,
  } as React.CSSProperties;
}

const EMPTY_TOOLTIP_VALUE_LABEL = "—";

function formatTooltipValue(value: TooltipValueType | undefined): string {
  if (value === undefined) {
    return EMPTY_TOOLTIP_VALUE_LABEL;
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "number" ? item.toLocaleString() : String(item),
      )
      .join(" – ");
  }

  return String(value);
}

function toChartKey(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function resolveChartKey(...candidates: readonly unknown[]): string {
  for (const candidate of candidates) {
    const key = toChartKey(candidate);

    if (key !== null) {
      return key;
    }
  }

  return "value";
}

function normalizeTooltipName(
  value: unknown,
  fallback: string,
): TooltipNameType {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return fallback;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  style,
  ...props
}: ChartContainerProps): React.ReactElement {
  const uniqueId = React.useId();
  const theme = useDocumentTheme();
  const chartId = `chart-${id ?? uniqueId.replaceAll(":", "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-caption text-tabular [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        style={mergeChartContainerStyle(style, config, theme)}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer
          initialDimension={initialDimension}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle(props: ChartStyleProps): null {
  void props;
  return null;
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> &
  Readonly<{
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  }> &
  Omit<
    RechartsPrimitive.DefaultTooltipContentProps<
      TooltipValueType,
      TooltipNameType
    >,
    "accessibilityLayer"
  >): React.ReactElement | null {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = resolveChartKey(labelKey, item?.dataKey, item?.name);
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === "string"
        ? (config[label]?.label ?? label)
        : itemConfig?.label;

    if (labelFormatter !== undefined) {
      return (
        <div className={cn("text-card-title", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      );
    }

    if (value === undefined || value === null || value === false) {
      return null;
    }

    return <div className={cn("text-card-title", labelClassName)}>{value}</div>;
  }, [
    config,
    hideLabel,
    label,
    labelFormatter,
    labelClassName,
    labelKey,
    payload,
  ]);

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-2xl border border-border/70 bg-background/95 px-2.5 py-1.5 text-caption text-foreground shadow-lg backdrop-blur-xl",
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = resolveChartKey(nameKey, item.name, item.dataKey);
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor =
              color ?? readStringField(item.payload, "fill") ?? item.color;
            const itemName = normalizeTooltipName(item.name, key);

            return (
              <div
                key={[key, String(index)].join("-")}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-readable",
                  indicator === "dot" && "items-center",
                )}
              >
                {formatter !== undefined ? (
                  formatter(item.value, itemName, item, index, payload)
                ) : (
                  <>
                    {itemConfig?.icon !== undefined ? (
                      <itemConfig.icon />
                    ) : !hideIndicator ? (
                      <div
                        className={cn(
                          "shrink-0 rounded-[2px] border-[var(--color-border)] bg-[var(--color-bg)]",
                          indicator === "dot" && "h-2.5 w-2.5",
                          indicator === "line" && "w-1",
                          indicator === "dashed" &&
                            "w-0 border-[1.5px] border-dashed bg-transparent",
                          nestLabel && indicator === "dashed" && "my-0.5",
                        )}
                        style={tooltipIndicatorStyle(indicatorColor)}
                      />
                    ) : null}
                    <div
                      className={cn(
                        "flex flex-1 justify-between",
                        nestLabel ? "items-end" : "items-center",
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-readable">
                          {itemConfig?.label ??
                            normalizeTooltipName(item.name, key)}
                        </span>
                      </div>
                      <span className="text-tabular text-foreground [font-weight:var(--typography-emphasis-weight)]">
                        {formatTooltipValue(item.value)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> &
  Readonly<{
    hideIcon?: boolean;
    nameKey?: string;
  }> &
  RechartsPrimitive.DefaultLegendContentProps): React.ReactElement | null {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4 text-caption",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item, index) => {
          const key = resolveChartKey(nameKey, item.dataKey);
          const itemConfig = getPayloadConfigFromPayload(config, item, key);

          return (
            <div
              key={[key, String(index)].join("-")}
              className="flex items-center gap-1.5 text-muted-readable [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-readable"
            >
              {itemConfig?.icon !== undefined && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: item.color }}
                />
              )}
              {itemConfig?.label}
            </div>
          );
        })}
    </div>
  );
}

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
): ChartConfig[string] | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  const payloadPayload = isRecord(payload["payload"])
    ? payload["payload"]
    : undefined;
  const payloadKey = readStringField(payload, key);
  const nestedPayloadKey =
    payloadPayload !== undefined
      ? readStringField(payloadPayload, key)
      : undefined;
  const configLabelKey = payloadKey ?? nestedPayloadKey ?? key;

  return config[configLabelKey] ?? config[key];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};

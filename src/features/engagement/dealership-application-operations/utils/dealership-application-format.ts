// oz-next-app/src/features/engagement/dealership-application-operations/utils/dealership-application-format.ts
const DASHBOARD_LOCALE = "en-IN" as const;
const DASHBOARD_TIMEZONE = "Asia/Kolkata" as const;

const integerFormatter = new Intl.NumberFormat(DASHBOARD_LOCALE, {
  maximumFractionDigits: 0,
});
const percentageFormatter = new Intl.NumberFormat(DASHBOARD_LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const compactFormatter = new Intl.NumberFormat(DASHBOARD_LOCALE, {
  notation: "compact",
  maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat(DASHBOARD_LOCALE, {
  timeZone: DASHBOARD_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const dateTimeFormatter = new Intl.DateTimeFormat(DASHBOARD_LOCALE, {
  timeZone: DASHBOARD_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function validDate(value: string | null | undefined): Date | null {
  if (value === null || value === undefined || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDealershipInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatDealershipCompactInteger(value: number): string {
  return compactFormatter.format(value);
}

export function formatDealershipPercentage(value: number): string {
  return `${percentageFormatter.format(value)}%`;
}

export function formatDealershipSignedPercentage(value: number | null): string {
  if (value === null || !Number.isFinite(value))
    return "Comparison unavailable";
  if (value === 0) return "No change";
  return `${value > 0 ? "+" : ""}${percentageFormatter.format(value)}% vs previous`;
}

export function formatDealershipHours(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value < 24) return `${percentageFormatter.format(value)} h`;
  return `${percentageFormatter.format(value / 24)} d`;
}

export function formatDealershipDate(
  value: string | null | undefined,
  fallback = "Not set",
): string {
  const parsed = validDate(value);
  return parsed === null ? fallback : dateFormatter.format(parsed);
}

export function formatDealershipDateTime(
  value: string | null | undefined,
  fallback = "Not set",
): string {
  const parsed = validDate(value);
  return parsed === null ? fallback : dateTimeFormatter.format(parsed);
}

export function formatDealershipFileSize(
  value: number | null | undefined,
): string {
  if (value === null || value === undefined || value < 0) return "Unknown size";
  if (value < 1_024) return `${integerFormatter.format(value)} B`;
  if (value < 1_048_576)
    return `${percentageFormatter.format(value / 1_024)} KB`;
  return `${percentageFormatter.format(value / 1_048_576)} MB`;
}

export function titleCaseDealershipToken(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase(DASHBOARD_LOCALE)
    .replace(/[_-]+/gu, " ")
    .replace(/\b\p{L}/gu, (character) =>
      character.toLocaleUpperCase(DASHBOARD_LOCALE),
    );
}

export function sourceBucketLabel(value: string, grain: string): string {
  const parsed = validDate(value);
  if (parsed === null) return "Unknown";

  if (grain === "MONTH") {
    return new Intl.DateTimeFormat(DASHBOARD_LOCALE, {
      timeZone: DASHBOARD_TIMEZONE,
      month: "short",
      year: "numeric",
    }).format(parsed);
  }

  return new Intl.DateTimeFormat(DASHBOARD_LOCALE, {
    timeZone: DASHBOARD_TIMEZONE,
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

export function isoDateInKolkata(value: string): string | null {
  const parsed = validDate(value);
  if (parsed === null) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parsed);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");
  return year === undefined || month === undefined || day === undefined
    ? null
    : `${year}-${month}-${day}`;
}

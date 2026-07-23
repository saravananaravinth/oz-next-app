// oz-next-app/src/features/engagement/operations-dashboard/utils/engagement-dashboard-format.ts
const DASHBOARD_TIMEZONE = "Asia/Kolkata";

const integerFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});
const decimalFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: DASHBOARD_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: DASHBOARD_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function formatDashboardInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatDashboardDecimal(value: number): string {
  return decimalFormatter.format(value);
}

export function formatDashboardPercentage(value: number): string {
  return `${decimalFormatter.format(value)}%`;
}

export function formatDashboardDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`));
}

export function formatDashboardDateTime(value: string | null): string {
  return value === null
    ? "Not available"
    : dateTimeFormatter.format(new Date(value));
}

export function formatDashboardDuration(minutes: number | null): string {
  if (minutes === null) {
    return "Not available";
  }

  const rounded = Math.max(0, Math.round(minutes));
  if (rounded < 60) {
    return `${String(rounded)}m`;
  }

  const hours = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  if (hours < 24) {
    return remaining === 0
      ? `${String(hours)}h`
      : `${String(hours)}h ${String(remaining)}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours === 0
    ? `${String(days)}d`
    : `${String(days)}d ${String(remainingHours)}h`;
}

export function formatDashboardAge(minutes: number): string {
  return formatDashboardDuration(minutes);
}

export function formatDashboardSignedPercent(value: number | null): string {
  if (value === null) {
    return "No comparable baseline";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${decimalFormatter.format(value)}%`;
}

export function formatDashboardSignedPoints(value: number | null): string {
  if (value === null) {
    return "No comparable baseline";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${decimalFormatter.format(value)} pp`;
}

export function titleCaseDashboardToken(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/_/gu, " ")
    .replace(/\b\p{L}/gu, (match) => match.toLocaleUpperCase("en-US"));
}

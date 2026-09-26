// oz-next-app/src/features/payments/utils/payment-format.ts
export function formatPaymentMoney(currency: string, minor: string): string {
  const value = Number(minor);
  if (!Number.isSafeInteger(value)) return `${currency} ${minor}`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function formatPaymentDateTime(value: string | null): string {
  if (value === null) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}

export function formatPaymentLabel(value: string | null): string {
  if (value === null || value.length === 0) return "—";
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function maskPaymentKey(value: string | null): string {
  if (value === null || value.length === 0) return "Not configured";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 8)}••••${value.slice(-4)}`;
}

// oz-next-app/src/features/wallet/utils/wallet-money.ts
const MONEY_PATTERN = /^-?(?:0|[1-9][0-9]{0,15})(?:\.[0-9]{1,2})?$/u;
const MINOR_UNIT_SCALE = 100n;

function groupIndianDigits(value: string): string {
  if (value.length <= 3) {
    return value;
  }

  const lastThree = value.slice(-3);
  const leading = value.slice(0, -3);
  const groups: string[] = [];

  for (let end = leading.length; end > 0; end -= 2) {
    groups.unshift(leading.slice(Math.max(0, end - 2), end));
  }

  return `${groups.join(",")},${lastThree}`;
}

function currencySymbol(currency: string): string {
  try {
    const part = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .formatToParts(0)
      .find((candidate) => candidate.type === "currency");

    return part?.value ?? currency;
  } catch {
    return currency;
  }
}

export function parseMoneyToMinorUnits(amount: string): bigint | null {
  const normalized = amount.trim();

  if (!MONEY_PATTERN.test(normalized)) {
    return null;
  }

  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const minor =
    BigInt(whole) * MINOR_UNIT_SCALE + BigInt(fraction.padEnd(2, "0"));

  return negative ? -minor : minor;
}

export function formatMinorUnits(amount: bigint, currency: string): string {
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const whole = (absolute / MINOR_UNIT_SCALE).toString();
  const fraction = (absolute % MINOR_UNIT_SCALE).toString().padStart(2, "0");
  const sign = negative ? "−" : "";

  return `${sign}${currencySymbol(currency)}${groupIndianDigits(whole)}.${fraction}`;
}

export function formatMoney(amount: string, currency: string): string {
  const minorUnits = parseMoneyToMinorUnits(amount);

  if (minorUnits === null) {
    return `${currency} ${amount.trim()}`;
  }

  return formatMinorUnits(minorUnits, currency);
}

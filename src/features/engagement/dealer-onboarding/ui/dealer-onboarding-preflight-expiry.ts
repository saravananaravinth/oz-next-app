// oz-next-app/src/features/engagement/dealer-onboarding/ui/dealer-onboarding-preflight-expiry.ts
type ExpiringPreflight = Readonly<{
  preflightToken: string | null;
  expiresAt: string | null;
}>;

export function preflightRemainingMs(
  preflight: ExpiringPreflight,
  nowMs = Date.now(),
): number | null {
  if (preflight.preflightToken === null || preflight.expiresAt === null)
    return null;
  const expiresAtMs = Date.parse(preflight.expiresAt);
  return Number.isFinite(expiresAtMs) ? expiresAtMs - nowMs : 0;
}

export function isPreflightExpired(
  preflight: ExpiringPreflight,
  nowMs = Date.now(),
): boolean {
  const remainingMs = preflightRemainingMs(preflight, nowMs);
  return remainingMs !== null && remainingMs <= 0;
}

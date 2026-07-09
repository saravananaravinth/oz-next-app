// oz-next-app/src/lib/auth/device-fingerprint.client.ts
"use client";

let deviceFingerprint: string | null = null;

function createFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");
  const bytes = new TextEncoder().encode(parts);
  let hash = 2166136261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }
  return `web-${Math.abs(hash).toString(36)}-${crypto.randomUUID()}`.slice(
    0,
    128,
  );
}

export function getDeviceFingerprint(): string {
  deviceFingerprint ??= createFingerprint();
  return deviceFingerprint;
}

export function resetDeviceFingerprintForTests(): void {
  deviceFingerprint = null;
}

// oz-next-app/src/lib/auth/session.client.ts
"use client";

export type ClientSessionSnapshot = Readonly<{
  authenticated: boolean;
  accessExpiresAtEpochMs: number | null;
}>;

type SessionState = {
  authenticated: boolean;
  accessExpiresAtEpochMs: number | null;
};
const state: SessionState = {
  authenticated: false,
  accessExpiresAtEpochMs: null,
};
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) listener();
}

function expiresAtFromSeconds(
  expiresInSeconds: number | undefined,
): number | null {
  return typeof expiresInSeconds === "number" &&
    Number.isFinite(expiresInSeconds)
    ? Date.now() + Math.max(0, Math.trunc(expiresInSeconds)) * 1_000
    : null;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSessionSnapshot(): ClientSessionSnapshot {
  return {
    authenticated: state.authenticated,
    accessExpiresAtEpochMs: state.accessExpiresAtEpochMs,
  };
}

export function markClientSession(
  input?: Readonly<{ expiresInSeconds?: number | undefined }>,
): void {
  state.authenticated = true;
  state.accessExpiresAtEpochMs = expiresAtFromSeconds(input?.expiresInSeconds);
  emitChange();
}

export function clearSessionTokens(): void {
  state.authenticated = false;
  state.accessExpiresAtEpochMs = null;
  emitChange();
}

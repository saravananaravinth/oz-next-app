// oz-next-app/src/features/wallet/policies/wallet.policy.ts
import type { ActorKind, MeResponse } from "@/lib/api/contracts";

const PERMISSION = {
  WALLET_READ: "wallet:read",
  WALLET_ENTRY_READ: "wallet:entry:read",
  WELFARE_ACCRUAL_READ: "welfare:accrual:read",
} as const;

export type WalletCapabilities = Readonly<{
  canViewWallets: boolean;
  canReadEntries: boolean;
  canReadWelfareAccruals: boolean;
}>;

export type WalletAccess = Readonly<{
  kind: "allowed" | "forbidden";
  actorKind: ActorKind;
  capabilities: WalletCapabilities;
}>;

const NO_CAPABILITIES = {
  canViewWallets: false,
  canReadEntries: false,
  canReadWelfareAccruals: false,
} as const satisfies WalletCapabilities;

function effectivePermissions(me: MeResponse): ReadonlySet<string> {
  const permissions =
    me.auth?.permissionResolution?.effectivePermissions ??
    me.auth?.effectivePermissions ??
    me.permissions;

  return new Set(
    permissions.map((permission) => permission.trim().toLowerCase()),
  );
}

function resolvedActorKind(me: MeResponse): ActorKind {
  return me.auth?.actor.actorKind ?? "SYSTEM";
}

export function resolveWalletAccess(me: MeResponse): WalletAccess {
  const actorKind = resolvedActorKind(me);

  // Phase 1 is intentionally a dealer/sub-dealer self-service workspace.
  // Administrative/staff wallet tooling remains a separate backend-authorized surface.
  if (actorKind !== "DEALER") {
    return {
      kind: "forbidden",
      actorKind,
      capabilities: NO_CAPABILITIES,
    };
  }

  const permissions = effectivePermissions(me);
  const capabilities = {
    canViewWallets: permissions.has(PERMISSION.WALLET_READ),
    canReadEntries: permissions.has(PERMISSION.WALLET_ENTRY_READ),
    canReadWelfareAccruals: permissions.has(PERMISSION.WELFARE_ACCRUAL_READ),
  } satisfies WalletCapabilities;

  return {
    kind: capabilities.canViewWallets ? "allowed" : "forbidden",
    actorKind,
    capabilities,
  };
}

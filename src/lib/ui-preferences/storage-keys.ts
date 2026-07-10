export const UI_STORAGE_KEYS = {
  /** UI theme preference only. Never store auth/session/tenant state here. */
  THEME: "oz_theme",
  /** Optional UI accent preference only. Never store tenant/user/permission data here. */
  UI_ACCENT: "ui_accent",
  /** Browser-scoped acknowledgement only. Stores no actor, tenant, or PII value. */
  DEALER_DASHBOARD_GUIDE_ACKNOWLEDGED:
    "oz_dealer_dashboard_guide_v1_acknowledged",
} as const;

export const LEGACY_UI_STORAGE_KEYS = {
  /** Legacy next-themes key retained only for one-time preference migration. */
  THEME: "ozo-theme",
} as const;

export type UiStorageKey =
  (typeof UI_STORAGE_KEYS)[keyof typeof UI_STORAGE_KEYS];

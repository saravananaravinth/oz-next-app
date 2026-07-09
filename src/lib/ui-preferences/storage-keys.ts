// oz-next-app/src/lib/ui-preferences/storage-keys.ts
export const UI_STORAGE_KEYS = {
  THEME: "oz_theme",
  UI_ACCENT: "ui_accent",
} as const;

export const LEGACY_UI_STORAGE_KEYS = {
  THEME: "ozo-theme",
} as const;

export type UiStorageKey =
  (typeof UI_STORAGE_KEYS)[keyof typeof UI_STORAGE_KEYS];

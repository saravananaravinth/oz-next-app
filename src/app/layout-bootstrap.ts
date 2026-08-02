// oz-next-app/src/app/layout-bootstrap.ts
import {
  LEGACY_UI_STORAGE_KEYS,
  UI_STORAGE_KEYS,
} from "@/lib/ui-preferences/storage-keys";

const ALLOWED_ACCENTS = [
  "default",
  "red",
  "orange",
  "green",
  "blue",
  "yellow",
  "violet",
  "corporate",
] as const;

const DEFAULT_ACCENT = "default" as const;

const INLINE_JSON_ESCAPE_LOOKUP: Readonly<Record<string, string>> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

const INLINE_JSON_ESCAPE_REGEX = /[<>&\u2028\u2029]/gu;
const STORAGE_KEY_REGEX = /^[A-Za-z0-9:._-]+$/u;

const MAX_STORAGE_KEY_LENGTH = 128;
const MAX_ALLOWED_ACCENTS = 32;

type UiAccent = (typeof ALLOWED_ACCENTS)[number];

type LayoutBootstrapStorageConfig = Readonly<{
  themeKey: string;
  legacyThemeKey: string;
  accentKey: string;
  allowedAccents: readonly UiAccent[];
  defaultAccent: UiAccent;
}>;

function isAllowedAccent(value: string): value is UiAccent {
  return ALLOWED_ACCENTS.some((accent) => accent === value);
}

function assertStorageKey(name: string, value: string): string {
  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_STORAGE_KEY_LENGTH ||
    !STORAGE_KEY_REGEX.test(normalized)
  ) {
    throw new Error(`${name}_storage_key_invalid`);
  }

  return normalized;
}

function normalizeAllowedAccents(
  values: readonly UiAccent[],
): readonly UiAccent[] {
  const unique: UiAccent[] = [];

  for (const value of values) {
    if (unique.length >= MAX_ALLOWED_ACCENTS) {
      break;
    }

    if (isAllowedAccent(value) && !unique.includes(value)) {
      unique.push(value);
    }
  }

  return unique.length > 0 ? unique : [DEFAULT_ACCENT];
}

function createBootstrapStorageConfig(): LayoutBootstrapStorageConfig {
  const allowedAccents = normalizeAllowedAccents(ALLOWED_ACCENTS);

  return {
    themeKey: assertStorageKey("theme", UI_STORAGE_KEYS.THEME),
    legacyThemeKey: assertStorageKey(
      "legacy_theme",
      LEGACY_UI_STORAGE_KEYS.THEME,
    ),
    accentKey: assertStorageKey("accent", UI_STORAGE_KEYS.UI_ACCENT),
    allowedAccents,
    defaultAccent: allowedAccents.includes(DEFAULT_ACCENT)
      ? DEFAULT_ACCENT
      : (allowedAccents[0] ?? DEFAULT_ACCENT),
  };
}

const BOOTSTRAP_STORAGE_CONFIG = createBootstrapStorageConfig();

function serializeInlineJson(value: LayoutBootstrapStorageConfig): string {
  return JSON.stringify(value).replace(
    INLINE_JSON_ESCAPE_REGEX,
    (character) => {
      return INLINE_JSON_ESCAPE_LOOKUP[character] ?? character;
    },
  );
}

export function createThemeBootstrapScript(
  config: LayoutBootstrapStorageConfig = BOOTSTRAP_STORAGE_CONFIG,
): string {
  const serializedConfig = serializeInlineJson(config);

  return `(function () {
  "use strict";

  try {
    var config = ${serializedConfig};
    var root = document.documentElement;
    var validThemes = { light: true, dark: true, system: true };
    var validAccents = Object.create(null);

    for (var i = 0; i < config.allowedAccents.length; i += 1) {
      validAccents[config.allowedAccents[i]] = true;
    }

    function readStorage(key) {
      try {
        var value = window.localStorage.getItem(key);
        return typeof value === "string" ? value : null;
      } catch (_error) {
        return null;
      }
    }

    function writeStorage(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (_error) {}
    }

    function normalizeTheme(value) {
      return value && validThemes[value] === true ? value : null;
    }

    function normalizeAccent(value) {
      return value && validAccents[value] === true ? value : config.defaultAccent;
    }

    var theme = normalizeTheme(readStorage(config.themeKey));
    var legacyTheme = normalizeTheme(readStorage(config.legacyThemeKey));

    if (theme === null && legacyTheme !== null) {
      theme = legacyTheme;
      writeStorage(config.themeKey, legacyTheme);
    }

    var prefersDark = false;

    try {
      prefersDark = !!(
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    } catch (_error) {}

    var effectiveTheme = theme === null ? "system" : theme;
    var isDark = effectiveTheme === "dark" || (effectiveTheme === "system" && prefersDark);

    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
    root.setAttribute("data-accent", normalizeAccent(readStorage(config.accentKey)));
  } catch (_error) {
    try {
      document.documentElement.style.colorScheme = "light dark";
    } catch (_nestedError) {}
  }
})();`;
}

export const THEME_BOOTSTRAP_SCRIPT = createThemeBootstrapScript();

/**
 * @deprecated Display scaling is intentionally delegated to the browser.
 * Kept as an empty compatibility export for older imports.
 */
export const DISPLAY_SCALE_ZOOM_BOOTSTRAP_SCRIPT = "";
